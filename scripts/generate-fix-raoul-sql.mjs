#!/usr/bin/env node

/**
 * Generiert SQL-Script zum Korrigieren von Raoul-Spieler-IDs
 * Führt die Analyse durch und generiert die UPDATE-Statements
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local
let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = value;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
    }
  });
} catch (e) {
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateFixSQL() {
  console.log('🔍 Generiere SQL-Script zum Korrigieren von Raoul-Spieler-IDs...\n');
  
  // 1. Finde alle Raoul-Spieler
  const { data: raoulPlayers } = await supabase
    .from('players_unified')
    .select('id, name, tvm_id, user_id, is_active, created_at')
    .or(`name.ilike.%Raoul%,name.ilike.%van Herwijnen%`);
  
  if (!raoulPlayers || raoulPlayers.length === 0) {
    console.log('❌ Kein Raoul gefunden!');
    return;
  }
  
  // Identifiziere richtige ID
  let correctRaoulId = null;
  const raoulWithUserId = raoulPlayers.find(p => p.user_id);
  if (raoulWithUserId) {
    correctRaoulId = raoulWithUserId.id;
  } else {
    const activeRaoul = raoulPlayers.find(p => p.is_active);
    if (activeRaoul) {
      correctRaoulId = activeRaoul.id;
    } else {
      correctRaoulId = raoulPlayers.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0].id;
    }
  }
  
  const wrongRaoulIds = raoulPlayers
    .filter(p => p.id !== correctRaoulId)
    .map(p => p.id);
  
  console.log(`✅ Richtige Raoul-ID: ${correctRaoulId}`);
  console.log(`⚠️ Falsche Raoul-IDs: ${wrongRaoulIds.join(', ')}\n`);
  
  if (wrongRaoulIds.length === 0) {
    console.log('✅ Keine falschen IDs gefunden!');
    return;
  }
  
  // 2. Finde alle match_results mit falschen IDs
  const wrongIdConditions = wrongRaoulIds.map(id => 
    `home_player_id.eq.${id},home_player1_id.eq.${id},home_player2_id.eq.${id},guest_player_id.eq.${id},guest_player1_id.eq.${id},guest_player2_id.eq.${id}`
  ).join(',');
  
  const { data: wrongResults } = await supabase
    .from('match_results')
    .select('*')
    .or(wrongIdConditions);
  
  if (!wrongResults || wrongResults.length === 0) {
    console.log('✅ Keine Ergebnisse mit falschen IDs gefunden!');
    return;
  }
  
  console.log(`✅ Gefunden: ${wrongResults.length} Ergebnisse mit falschen IDs\n`);
  
  // 3. Generiere SQL
  const sqlStatements = [];
  sqlStatements.push('-- Script: Korrigiert falsche Spieler-IDs für Raoul in match_results');
  sqlStatements.push(`-- Richtige Raoul-ID: ${correctRaoulId}`);
  sqlStatements.push(`-- Falsche Raoul-IDs: ${wrongRaoulIds.join(', ')}`);
  sqlStatements.push('');
  
  // Generiere UPDATE-Statements für jedes Feld
  const fields = ['home_player_id', 'home_player1_id', 'home_player2_id', 'guest_player_id', 'guest_player1_id', 'guest_player2_id'];
  
  fields.forEach(field => {
    const hasWrongIds = wrongResults.some(r => wrongRaoulIds.includes(r[field]));
    if (hasWrongIds) {
      sqlStatements.push(`-- Korrigiere ${field}`);
      sqlStatements.push(`UPDATE match_results`);
      sqlStatements.push(`SET ${field} = '${correctRaoulId}'`);
      sqlStatements.push(`WHERE ${field} IN ('${wrongRaoulIds.join("', '")}');`);
      sqlStatements.push('');
    }
  });
  
  // Optional: Lösche Duplikat-Spieler (nur wenn keine Referenzen)
  sqlStatements.push('-- Optional: Lösche Duplikat-Spieler (nur wenn keine anderen Referenzen)');
  wrongRaoulIds.forEach(wrongId => {
    sqlStatements.push(`-- Prüfe ob Spieler ${wrongId} gelöscht werden kann:`);
    sqlStatements.push(`-- DELETE FROM players_unified WHERE id = '${wrongId}';`);
    sqlStatements.push(`-- (Nur ausführen wenn keine Referenzen in match_results, team_memberships, team_roster)`);
    sqlStatements.push('');
  });
  
  const sql = sqlStatements.join('\n');
  
  // Speichere SQL
  const outputPath = resolve(__dirname, '../sql/fix_raoul_player_ids_generated.sql');
  writeFileSync(outputPath, sql);
  
  console.log(`✅ SQL-Script generiert: ${outputPath}`);
  console.log(`\n📋 SQL-Statements:\n`);
  console.log(sql);
}

generateFixSQL().catch(console.error);

