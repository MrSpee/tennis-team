/**
 * Analysiere Marc Stoppenbach's LK-Verbesserung
 * Zeigt welche Spiele die LK-Verbesserung verursacht haben
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

// LK-Berechnungs-Funktionen (aus Rankings.jsx)
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

async function analyzeMarcLK() {
  console.log('🔍 Analysiere Marc Stoppenbach\'s LK-Verbesserung...\n');
  
  // Hole Marc's Daten
  const { data: marc, error: marcError } = await supabase
    .from('players_unified')
    .select('*')
    .eq('name', 'Marc Stoppenbach')
    .single();
  
  if (marcError || !marc) {
    console.error('❌ Fehler beim Laden von Marc:', marcError);
    return;
  }
  
  const startLK = parseFloat((marc.season_start_lk || '16.0').replace('LK ', '').replace(',', '.'));
  const currentLK = parseFloat((marc.current_lk || '15.3').replace('LK ', '').replace(',', '.'));
  
  console.log(`📊 Marc Stoppenbach:`);
  console.log(`   Saison-Start LK: ${startLK}`);
  console.log(`   Aktuelle LK: ${currentLK}`);
  console.log(`   Verbesserung: ${(currentLK - startLK).toFixed(1)} (${((currentLK - startLK) / startLK * 100).toFixed(1)}%)\n`);
  
  // Hole alle Match-Ergebnisse
  const { data: results, error: resultsError } = await supabase
    .from('match_results')
    .select(`
      *,
      matchday:matchday_id (
        match_date,
        season
      )
    `)
    .or(`home_player_id.eq.${marc.id},guest_player_id.eq.${marc.id},home_player1_id.eq.${marc.id},home_player2_id.eq.${marc.id},guest_player1_id.eq.${marc.id},guest_player2_id.eq.${marc.id}`)
    .eq('status', 'completed')
    .not('winner', 'is', null);
  
  if (resultsError) {
    console.error('❌ Fehler beim Laden der Ergebnisse:', resultsError);
    return;
  }
  
  // Filtere nur Siege
  const wins = results.filter(r => {
    const isHome = r.home_player_id === marc.id || r.home_player1_id === marc.id || r.home_player2_id === marc.id;
    const isGuest = r.guest_player_id === marc.id || r.guest_player1_id === marc.id || r.guest_player2_id === marc.id;
    return (isHome && r.winner === 'home') || (isGuest && r.winner === 'guest');
  });
  
  console.log(`✅ ${wins.length} Siege gefunden:\n`);
  
  let begleitLK = startLK;
  let totalImprovement = 0;
  const matchDetails = [];
  
  for (const win of wins) {
    const matchDate = new Date(win.matchday.match_date);
    const isHome = win.home_player_id === marc.id || win.home_player1_id === marc.id || win.home_player2_id === marc.id;
    
    let ownLK = begleitLK;
    let oppLK = 25;
    let opponentInfo = '';
    
    if (win.match_type === 'Einzel') {
      const opponentId = isHome ? win.guest_player_id : win.home_player_id;
      const { data: opp } = await supabase
        .from('players_unified')
        .select('name, current_lk')
        .eq('id', opponentId)
        .single();
      
      if (opp) {
        oppLK = parseFloat((opp.current_lk || '25').replace('LK ', '').replace(',', '.'));
        opponentInfo = `${opp.name} (LK ${oppLK})`;
      }
    } else {
      // Doppel
      const partnerId = isHome 
        ? (win.home_player1_id === marc.id ? win.home_player2_id : win.home_player1_id)
        : (win.guest_player1_id === marc.id ? win.guest_player2_id : win.guest_player1_id);
      
      const { data: partner } = await supabase
        .from('players_unified')
        .select('name, current_lk, season_start_lk, ranking')
        .eq('id', partnerId)
        .single();
      
      let partnerLK = 25;
      if (partner) {
        const partnerLKStr = partner.current_lk || partner.season_start_lk || partner.ranking || '25';
        partnerLK = parseFloat(partnerLKStr.replace('LK ', '').replace(',', '.'));
      }
      
      ownLK = (begleitLK + partnerLK) / 2;
      
      const opp1Id = isHome ? win.guest_player1_id : win.home_player1_id;
      const opp2Id = isHome ? win.guest_player2_id : win.home_player2_id;
      
      const { data: opp1 } = await supabase
        .from('players_unified')
        .select('name, current_lk')
        .eq('id', opp1Id)
        .single();
      
      const { data: opp2 } = await supabase
        .from('players_unified')
        .select('name, current_lk')
        .eq('id', opp2Id)
        .single();
      
      const oppLK1 = parseFloat((opp1?.current_lk || '25').replace('LK ', '').replace(',', '.'));
      const oppLK2 = parseFloat((opp2?.current_lk || '25').replace('LK ', '').replace(',', '.'));
      oppLK = (oppLK1 + oppLK2) / 2;
      
      opponentInfo = `Partner: ${partner?.name || '?'} (LK ${partnerLK}) | Gegner: ${opp1?.name || '?'} (LK ${oppLK1}) & ${opp2?.name || '?'} (LK ${oppLK2})`;
    }
    
    const improvement = calcMatchImprovement(ownLK, oppLK, true);
    const lkBefore = begleitLK;
    begleitLK -= improvement;
    totalImprovement += improvement;
    
    matchDetails.push({
      date: matchDate,
      type: win.match_type,
      opponent: opponentInfo,
      ownLK: ownLK.toFixed(1),
      oppLK: oppLK.toFixed(1),
      diff: (ownLK - oppLK).toFixed(1),
      improvement: improvement.toFixed(3),
      lkBefore: lkBefore.toFixed(1),
      lkAfter: begleitLK.toFixed(1)
    });
  }
  
  // Sortiere nach Datum
  matchDetails.sort((a, b) => a.date - b.date);
  
  console.log('📋 Detaillierte Analyse:\n');
  matchDetails.forEach((match, i) => {
    console.log(`${i + 1}. ${match.type} - ${match.date.toLocaleDateString('de-DE')}`);
    console.log(`   Gegner: ${match.opponent}`);
    console.log(`   Eigene LK: ${match.ownLK} | Gegner LK: ${match.oppLK} | Differenz: ${match.diff}`);
    console.log(`   LK-Verbesserung: -${match.improvement}`);
    console.log(`   LK vorher: ${match.lkBefore} → LK nachher: ${match.lkAfter}`);
    console.log('');
  });
  
  const decay = getWeeklyDecay();
  const finalLK = Math.min(25, begleitLK + decay);
  
  console.log('📈 Zusammenfassung:');
  console.log(`   Gesamt-Verbesserung durch Siege: -${totalImprovement.toFixed(3)}`);
  console.log(`   Wochen-Decay: +${decay.toFixed(3)}`);
  console.log(`   Finale LK (mit Decay): ${finalLK.toFixed(1)}`);
  console.log(`   Tatsächliche LK in DB: ${currentLK}`);
  console.log(`   Differenz: ${(currentLK - finalLK).toFixed(1)}`);
}

analyzeMarcLK().catch(console.error);

