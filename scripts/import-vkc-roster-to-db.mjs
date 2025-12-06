#!/usr/bin/env node

/**
 * Importiert Meldeliste für VKC Köln 1 direkt in die Datenbank
 */

import { createClient } from '@supabase/supabase-js';

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

const TEAM_PORTRAIT_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43';
const TEAM_ID = '1aac84b3-d911-471e-9b6f-1f60f0afdf62';
const SEASON = 'Winter 2025/26';

async function parseTeamPortrait(teamPortraitUrl) {
  const response = await fetch(teamPortraitUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  let html = await response.text();
  
  // Finde Spieler-Tabelle
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  let table = null;
  for (const t of allTables) {
    const hasPlayerLinks = t.match(/<a[^>]*>([A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+)/gi);
    const hasLK = t.match(/LK[\d,\.]+/gi);
    const hasLongNumbers = t.match(/\d{7,}/g);
    if (hasPlayerLinks && hasLK && hasLongNumbers) {
      table = t;
      break;
    }
  }
  
  if (!table) {
    throw new Error('Spieler-Tabelle nicht gefunden');
  }
  
  const roster = [];
  const pattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>(LK[\d,\.]+)<\/td>\s*<td[^>]*>(\d{7,})(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:<\/div>[\s\S]*?\((\d{4})\))?/gi;
  
  let match;
  while ((match = pattern.exec(table)) !== null) {
    const rank = parseInt(match[1], 10);
    const lk = match[3].trim();
    const tvmId = match[4].trim();
    const name = match[5].trim();
    
    let birthYear = match[6] ? parseInt(match[6], 10) : null;
    if (!birthYear) {
      const rowEnd = table.indexOf('</tr>', match.index);
      const rowContent = table.substring(match.index, rowEnd);
      const birthMatch = rowContent.match(/\((\d{4})\)/);
      if (birthMatch) {
        birthYear = parseInt(birthMatch[1], 10);
      }
    }
    
    roster.push({
      rank,
      name,
      lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
      tvmId,
      birthYear
    });
  }
  
  return roster;
}

function calculateSimilarity(str1, str2) {
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
        similarity: calculateSimilarity(player.name, rosterPlayer.name)
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

async function importRoster() {
  console.log('🚀 Importiere Meldeliste für VKC Köln 1');
  console.log('='.repeat(80));
  console.log(`URL: ${TEAM_PORTRAIT_URL}`);
  console.log(`Team-ID: ${TEAM_ID}`);
  console.log(`Saison: ${SEASON}\n`);
  
  try {
    // Parse Meldeliste
    console.log('1️⃣ Parse Meldeliste...');
    const roster = await parseTeamPortrait(TEAM_PORTRAIT_URL);
    console.log(`✅ ${roster.length} Spieler geparst\n`);
    
    if (roster.length === 0) {
      console.log('⚠️  Keine Spieler gefunden');
      return;
    }
    
    // Lösche alte Einträge
    console.log('2️⃣ Lösche alte Einträge...');
    const { error: deleteError } = await supabase
      .from('team_roster')
      .delete()
      .eq('team_id', TEAM_ID)
      .eq('season', SEASON);
    
    if (deleteError) {
      console.warn(`⚠️  Fehler beim Löschen: ${deleteError.message}`);
    } else {
      console.log('✅ Alte Einträge gelöscht\n');
    }
    
    // Führe Fuzzy-Matching durch
    console.log('3️⃣ Führe Fuzzy-Matching durch...');
    const rosterEntries = [];
    let matchedCount = 0;
    
    for (let i = 0; i < roster.length; i++) {
      const player = roster[i];
      const matchResult = await matchPlayerToUnified(player);
      
      rosterEntries.push({
        team_id: TEAM_ID,
        season: SEASON,
        rank: player.rank,
        player_name: player.name,
        lk: player.lk,
        tvm_id: player.tvmId || null,
        birth_year: player.birthYear || null,
        singles_record: null,
        doubles_record: null,
        total_record: null,
        player_id: matchResult.playerId || null
      });
      
      if (matchResult.playerId) {
        matchedCount++;
      }
      
      if ((i + 1) % 5 === 0) {
        console.log(`   ${i + 1}/${roster.length} Spieler verarbeitet...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ ${matchedCount}/${roster.length} Spieler gematcht\n`);
    
    // Speichere in DB
    console.log('4️⃣ Speichere in Datenbank...');
    const { data, error } = await supabase
      .from('team_roster')
      .insert(rosterEntries)
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ ${data.length} Spieler gespeichert\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Import erfolgreich abgeschlossen!');
    console.log(`   - ${roster.length} Spieler importiert`);
    console.log(`   - ${matchedCount} mit players_unified verknüpft`);
    console.log(`   - ${roster.length - matchedCount} neue Spieler`);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

importRoster();

