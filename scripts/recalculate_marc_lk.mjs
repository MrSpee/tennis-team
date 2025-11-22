#!/usr/bin/env node
/**
 * Berechnet die LK für Marc Stoppenbach neu (mit korrekter Gegner-LK)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local
let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value;
        if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
      }
    }
  });
} catch (e) {
  console.error('⚠️ Konnte .env.local nicht laden:', e.message);
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehlende Supabase-Credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// LK-Berechnungs-Funktionen
const SEASON_START = new Date('2025-09-29');
const AGE_CLASS_FACTOR = 0.8;

const pointsP = (diff) => {
  if (diff <= -4) return 10;
  if (diff >= 4) return 110;
  if (diff < 0) {
    const t = (diff + 4) / 4;
    return 10 + 40 * (t * t);
  }
  const t = diff / 4;
  return 50 + 60 * (t * t);
};

const hurdleH = (ownLK) => 50 + 12.5 * (25 - ownLK);

const calcMatchImprovement = (ownLK, oppLK, isTeamMatch = true) => {
  const diff = ownLK - oppLK;
  const P = pointsP(diff);
  const A = AGE_CLASS_FACTOR;
  const H = hurdleH(ownLK);
  let improvement = (P * A) / H;
  if (isTeamMatch) improvement *= 1.1;
  return Math.max(0, Number(improvement.toFixed(3)));
};

const getWeeklyDecay = () => {
  const now = new Date();
  const diffTime = now - SEASON_START;
  const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return 0.025 * weeks;
};

const visibleLK = (begleitLK) => Math.floor(begleitLK * 10) / 10;

const calculateMatchWinner = (result) => {
  const sets = [
    { home: parseInt(result.set1_home) || 0, guest: parseInt(result.set1_guest) || 0 },
    { home: parseInt(result.set2_home) || 0, guest: parseInt(result.set2_guest) || 0 },
    { home: parseInt(result.set3_home) || 0, guest: parseInt(result.set3_guest) || 0 }
  ];
  
  let homeSetsWon = 0;
  let guestSetsWon = 0;
  
  sets.forEach((set, i) => {
    if (set.home === 0 && set.guest === 0) return;
    if (i === 2) {
      if (set.home >= 10 && set.home >= set.guest + 2) homeSetsWon++;
      else if (set.guest >= 10 && set.guest >= set.home + 2) guestSetsWon++;
    } else {
      if ((set.home === 7 && set.guest === 6) || (set.home >= 6 && set.home >= set.guest + 2)) homeSetsWon++;
      else if ((set.guest === 7 && set.home === 6) || (set.guest >= 6 && set.guest >= set.home + 2)) guestSetsWon++;
    }
  });
  
  if (homeSetsWon >= 2) return 'home';
  if (guestSetsWon >= 2) return 'guest';
  return null;
};

async function recalculateMarcLK() {
  console.log('🔮 Berechne LK für Marc Stoppenbach neu...\n');
  
  const marcId = 'a18c5c2a-2d6b-4e09-89f1-3802238c215e';
  
  // Lade Marc's Daten
  const { data: marc, error } = await supabase
    .from('players_unified')
    .select('*')
    .eq('id', marcId)
    .single();
  
  if (error || !marc) {
    console.error('❌ Fehler beim Laden von Marc:', error);
    return;
  }
  
  const startLK = parseFloat((marc.season_start_lk || '16.0').replace('LK ', '').replace(',', '.'));
  let begleitLK = startLK;
  
  console.log(`📊 Start-LK: ${startLK}`);
  
  // Lade alle Matches
  const { data: matchdaysData, error: matchdaysError } = await supabase
    .from('matchdays')
    .select('id, match_date, season, home_team_id, away_team_id')
    .order('match_date', { ascending: false });
  
  if (matchdaysError) {
    console.error('❌ Fehler beim Laden der Matches:', matchdaysError);
    return;
  }
  
  let totalImprovements = 0;
  let matchesPlayed = 0;
  
  for (const match of matchdaysData || []) {
    const { data: resultsData, error: resultsError } = await supabase
      .from('match_results')
      .select('*')
      .eq('matchday_id', match.id);
    
    if (resultsError) continue;
    
    for (const result of resultsData || []) {
      const isPlayerInHomeTeam = 
        result.home_player_id === marcId ||
        result.home_player1_id === marcId ||
        result.home_player2_id === marcId;
      
      const isPlayerInGuestTeam = 
        result.guest_player_id === marcId ||
        result.guest_player1_id === marcId ||
        result.guest_player2_id === marcId;
      
      if (!isPlayerInHomeTeam && !isPlayerInGuestTeam) continue;
      
      let winner = result.winner;
      if (!winner) {
        winner = calculateMatchWinner(result);
      }
      
      const didPlayerWin = 
        (isPlayerInHomeTeam && winner === 'home') ||
        (isPlayerInGuestTeam && winner === 'guest');
      
      if (!didPlayerWin) continue;
      
      matchesPlayed++;
      
      let oppLK = 25;
      let ownLK = begleitLK;
      
      if (result.match_type === 'Einzel') {
        const opponentId = isPlayerInHomeTeam ? result.guest_player_id : result.home_player_id;
        const { data: oppData } = await supabase
          .from('players_unified')
          .select('current_lk')
          .eq('id', opponentId)
          .single();
        
        if (oppData) {
          oppLK = parseFloat((oppData.current_lk || '25').replace(',', '.').replace('LK ', ''));
        }
      } else {
        // Doppel
        const partnerId = isPlayerInHomeTeam ?
          (result.home_player1_id === marcId ? result.home_player2_id : result.home_player1_id) :
          (result.guest_player1_id === marcId ? result.guest_player2_id : result.guest_player1_id);
        
        const { data: partnerData } = await supabase
          .from('players_unified')
          .select('current_lk, season_start_lk, ranking')
          .eq('id', partnerId)
          .single();
        
        let partnerLK = 25;
        if (partnerData) {
          const partnerLKStr = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
          partnerLK = parseFloat(partnerLKStr?.replace('LK ', '').replace(',', '.') || '25');
        }
        
        ownLK = (begleitLK + partnerLK) / 2;
        
        const opp1Id = isPlayerInHomeTeam ? result.guest_player1_id : result.home_player1_id;
        const opp2Id = isPlayerInHomeTeam ? result.guest_player2_id : result.home_player2_id;
        
        const { data: opp1Data } = await supabase
          .from('players_unified')
          .select('current_lk')
          .eq('id', opp1Id)
          .single();
        
        const { data: opp2Data } = await supabase
          .from('players_unified')
          .select('current_lk')
          .eq('id', opp2Id)
          .single();
        
        const oppLK1 = parseFloat((opp1Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
        const oppLK2 = parseFloat((opp2Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
        oppLK = (oppLK1 + oppLK2) / 2;
      }
      
      const improvement = calcMatchImprovement(ownLK, oppLK, true);
      begleitLK -= improvement;
      totalImprovements += improvement;
      
      console.log(`✅ Sieg: ${result.match_type} | Eigene LK: ${ownLK.toFixed(1)} | Gegner LK: ${oppLK.toFixed(1)} | Verbesserung: ${improvement.toFixed(3)}`);
    }
  }
  
  const decay = getWeeklyDecay();
  begleitLK = Math.min(25, begleitLK + decay);
  const newLK = visibleLK(begleitLK);
  
  console.log(`\n📈 Gesamt-Verbesserung: ${totalImprovements.toFixed(3)}`);
  console.log(`📅 Wochen-Decay: ${decay.toFixed(3)}`);
  console.log(`✨ Neue LK: ${newLK.toFixed(1)}`);
  
  // Speichere neue LK
  const { error: updateError } = await supabase
    .from('players_unified')
    .update({ 
      current_lk: `LK ${newLK.toFixed(1)}`
    })
    .eq('id', marcId);
  
  if (updateError) {
    console.error('❌ Fehler beim Speichern:', updateError);
    return;
  }
  
  console.log(`\n✅ LK erfolgreich aktualisiert: ${marc.season_start_lk} → LK ${newLK.toFixed(1)}`);
}

recalculateMarcLK().catch(console.error);

