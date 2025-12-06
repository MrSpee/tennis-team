#!/usr/bin/env node

/**
 * Importiert Meldelisten direkt in die Datenbank
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Importiere parseTeamPortrait Funktion
const parseTeamPortraitModule = await import('../api/import/parse-team-roster.js');
const parseTeamPortrait = parseTeamPortraitModule.parseTeamPortrait || parseTeamPortraitModule.default;

// Team-Daten
const TEAMS = [
  {
    teamId: '1aac84b3-d911-471e-9b6f-1f60f0afdf62',
    teamName: 'VKC Köln 1',
    teamPortraitUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    season: 'Winter 2025/26'
  }
];

async function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  if (s1 === s2) return 100;
  
  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  let intersection = 0;
  bigrams1.forEach(bigram => {
    if (bigrams2.has(bigram)) intersection++;
  });
  const union = bigrams1.size + bigrams2.size;
  if (union === 0) return 0;
  return Math.round((2 * intersection / union) * 100);
}

async function matchPlayerToUnified(rosterPlayer) {
  try {
    // 1. Exakte Übereinstimmung
    const { data: exactMatches } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .ilike('name', rosterPlayer.name)
      .limit(5);
    
    if (exactMatches && exactMatches.length > 0) {
      const exactMatch = exactMatches.find(p => 
        p.name.toLowerCase() === rosterPlayer.name.toLowerCase()
      );
      if (exactMatch) {
        return { playerId: exactMatch.id, confidence: 100 };
      }
    }
    
    // 2. TVM-ID Match
    if (rosterPlayer.tvmId) {
      const { data: tvmMatch } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id')
        .eq('tvm_id', rosterPlayer.tvmId)
        .maybeSingle();
      
      if (tvmMatch) {
        return { playerId: tvmMatch.id, confidence: 95 };
      }
    }
    
    // 3. Fuzzy-Matching
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .limit(1000);
    
    if (!allPlayers || allPlayers.length === 0) {
      return { playerId: null, confidence: 0 };
    }
    
    const matches = allPlayers
      .map(player => ({
        ...player,
        similarity: await calculateSimilarity(player.name, rosterPlayer.name)
      }))
      .filter(m => m.similarity >= 70)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length > 0) {
      return { playerId: matches[0].id, confidence: matches[0].similarity };
    }
    
    return { playerId: null, confidence: 0 };
  } catch (error) {
    console.error('Fehler beim Matching:', error);
    return { playerId: null, confidence: 0 };
  }
}

async function importRosters() {
  console.log('🚀 Importiere Meldelisten direkt in die Datenbank');
  console.log('='.repeat(80));
  
  for (const team of TEAMS) {
    console.log(`\n📋 Team: ${team.teamName}`);
    console.log(`   URL: ${team.teamPortraitUrl}`);
    
    try {
      // Parse Meldeliste
      console.log('   → Parse Meldeliste...');
      const roster = await parseTeamPortrait(team.teamPortraitUrl);
      
      if (roster.length === 0) {
        console.log('   ⚠️  Keine Spieler gefunden');
        continue;
      }
      
      console.log(`   ✅ ${roster.length} Spieler geparst`);
      
      // Lösche alte Einträge
      console.log('   → Lösche alte Einträge...');
      const { error: deleteError } = await supabase
        .from('team_roster')
        .delete()
        .eq('team_id', team.teamId)
        .eq('season', team.season);
      
      if (deleteError) {
        console.warn(`   ⚠️  Fehler beim Löschen: ${deleteError.message}`);
      }
      
      // Führe Fuzzy-Matching durch
      console.log('   → Führe Fuzzy-Matching durch...');
      const rosterEntries = [];
      let matchedCount = 0;
      
      for (const player of roster) {
        const matchResult = await matchPlayerToUnified(player);
        
        rosterEntries.push({
          team_id: team.teamId,
          season: team.season,
          rank: player.rank,
          player_name: player.name,
          lk: player.lk,
          tvm_id: player.tvmId || null,
          birth_year: player.birthYear || null,
          singles_record: player.singles || null,
          doubles_record: player.doubles || null,
          total_record: player.total || null,
          player_id: matchResult.playerId || null
        });
        
        if (matchResult.playerId) {
          matchedCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`   ✅ ${matchedCount}/${roster.length} Spieler gematcht`);
      
      // Speichere in DB
      console.log('   → Speichere in Datenbank...');
      const { data, error } = await supabase
        .from('team_roster')
        .insert(rosterEntries)
        .select();
      
      if (error) {
        throw error;
      }
      
      console.log(`   ✅ ${data.length} Spieler gespeichert`);
      
    } catch (error) {
      console.error(`   ❌ Fehler: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Import abgeschlossen!');
}

importRosters();

