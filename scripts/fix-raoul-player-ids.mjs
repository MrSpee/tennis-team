#!/usr/bin/env node

/**
 * Script: Korrigiert falsche Spieler-IDs für Raoul in match_results
 * 
 * Problem: Raoul wurde möglicherweise mit unterschiedlichen IDs gespeichert
 * Lösung: Finde alle Raoul-Spieler, identifiziere die richtige ID, und korrigiere match_results
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env.local manuell
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
  console.error('⚠️ Konnte .env.local nicht laden, verwende Umgebungsvariablen');
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Normalisiert Namen für Vergleich
function normalizeNameForComparison(name) {
  if (!name) return '';
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    return `${commaMatch[2]} ${commaMatch[1]}`.trim();
  }
  return normalized;
}

async function fixRaoulPlayerIds() {
  console.log('🔍 Fix: Raoul Spieler-IDs in match_results\n');
  
  // 1. Finde alle Raoul-Spieler in players_unified
  console.log('1️⃣ Suche alle Raoul-Spieler in players_unified...');
  const { data: raoulPlayers, error: raoulError } = await supabase
    .from('players_unified')
    .select('id, name, tvm_id, user_id, is_active, created_at')
    .or(`name.ilike.%Raoul%,name.ilike.%van Herwijnen%`);
  
  if (raoulError) {
    console.error('❌ Fehler beim Laden von Raoul-Spielern:', raoulError);
    return;
  }
  
  if (!raoulPlayers || raoulPlayers.length === 0) {
    console.log('❌ Kein Raoul gefunden!');
    return;
  }
  
  console.log(`✅ Gefunden: ${raoulPlayers.length} Spieler:`);
  raoulPlayers.forEach(p => {
    console.log(`   - ${p.name} (ID: ${p.id}, TVM-ID: ${p.tvm_id || 'keine'}, User-ID: ${p.user_id || 'keine'}, Aktiv: ${p.is_active})`);
  });
  
  // 2. Identifiziere die richtige Raoul-ID (Priorität: user_id > is_active > neueste)
  let correctRaoulId = null;
  let correctRaoul = null;
  
  // Priorität 1: Spieler mit user_id (ist App-User)
  const raoulWithUserId = raoulPlayers.find(p => p.user_id);
  if (raoulWithUserId) {
    correctRaoulId = raoulWithUserId.id;
    correctRaoul = raoulWithUserId;
    console.log(`\n✅ Richtige Raoul-ID (mit user_id): ${correctRaoulId} (${correctRaoul.name})`);
  } else {
    // Priorität 2: Aktiver Spieler
    const activeRaoul = raoulPlayers.find(p => p.is_active);
    if (activeRaoul) {
      correctRaoulId = activeRaoul.id;
      correctRaoul = activeRaoul;
      console.log(`\n✅ Richtige Raoul-ID (aktiv): ${correctRaoulId} (${correctRaoul.name})`);
    } else {
      // Priorität 3: Neuester Spieler
      const newestRaoul = raoulPlayers.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      correctRaoulId = newestRaoul.id;
      correctRaoul = newestRaoul;
      console.log(`\n✅ Richtige Raoul-ID (neuester): ${correctRaoulId} (${correctRaoul.name})`);
    }
  }
  
  // 3. Finde alle falschen Raoul-IDs
  const wrongRaoulIds = raoulPlayers
    .filter(p => p.id !== correctRaoulId)
    .map(p => p.id);
  
  if (wrongRaoulIds.length === 0) {
    console.log('\n✅ Keine falschen Raoul-IDs gefunden!');
    return;
  }
  
  console.log(`\n⚠️ Falsche Raoul-IDs: ${wrongRaoulIds.join(', ')}`);
  
  // 4. Finde alle match_results mit falschen Raoul-IDs
  console.log(`\n2️⃣ Suche match_results mit falschen Raoul-IDs...`);
  
  const wrongIdConditions = wrongRaoulIds.map(id => 
    `home_player_id.eq.${id},home_player1_id.eq.${id},home_player2_id.eq.${id},guest_player_id.eq.${id},guest_player1_id.eq.${id},guest_player2_id.eq.${id}`
  ).join(',');
  
  const { data: wrongResults, error: resultsError } = await supabase
    .from('match_results')
    .select('*')
    .or(wrongIdConditions);
  
  if (resultsError) {
    console.error('❌ Fehler beim Laden von match_results:', resultsError);
    return;
  }
  
  if (!wrongResults || wrongResults.length === 0) {
    console.log('✅ Keine match_results mit falschen Raoul-IDs gefunden!');
    return;
  }
  
  console.log(`✅ Gefunden: ${wrongResults.length} Ergebnisse mit falschen Raoul-IDs:`);
  wrongResults.forEach(r => {
    const wrongFields = [];
    if (wrongRaoulIds.includes(r.home_player_id)) wrongFields.push('home_player_id');
    if (wrongRaoulIds.includes(r.home_player1_id)) wrongFields.push('home_player1_id');
    if (wrongRaoulIds.includes(r.home_player2_id)) wrongFields.push('home_player2_id');
    if (wrongRaoulIds.includes(r.guest_player_id)) wrongFields.push('guest_player_id');
    if (wrongRaoulIds.includes(r.guest_player1_id)) wrongFields.push('guest_player1_id');
    if (wrongRaoulIds.includes(r.guest_player2_id)) wrongFields.push('guest_player2_id');
    console.log(`   - Match ${r.match_number} (${r.match_type}, Matchday: ${r.matchday_id}): ${wrongFields.join(', ')}`);
  });
  
  // 5. Korrigiere alle falschen IDs
  console.log(`\n3️⃣ Korrigiere ${wrongResults.length} Ergebnisse...`);
  
  let corrected = 0;
  let errors = 0;
  
  for (const result of wrongResults) {
    const updateData = {};
    let needsUpdate = false;
    
    // Prüfe jedes Feld
    if (wrongRaoulIds.includes(result.home_player_id)) {
      updateData.home_player_id = correctRaoulId;
      needsUpdate = true;
    }
    if (wrongRaoulIds.includes(result.home_player1_id)) {
      updateData.home_player1_id = correctRaoulId;
      needsUpdate = true;
    }
    if (wrongRaoulIds.includes(result.home_player2_id)) {
      updateData.home_player2_id = correctRaoulId;
      needsUpdate = true;
    }
    if (wrongRaoulIds.includes(result.guest_player_id)) {
      updateData.guest_player_id = correctRaoulId;
      needsUpdate = true;
    }
    if (wrongRaoulIds.includes(result.guest_player1_id)) {
      updateData.guest_player1_id = correctRaoulId;
      needsUpdate = true;
    }
    if (wrongRaoulIds.includes(result.guest_player2_id)) {
      updateData.guest_player2_id = correctRaoulId;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('match_results')
        .update(updateData)
        .eq('id', result.id);
      
      if (updateError) {
        console.error(`❌ Fehler beim Aktualisieren von Ergebnis ${result.id}:`, updateError);
        errors++;
      } else {
        corrected++;
        console.log(`✅ Korrigiert: Match ${result.match_number} (${result.match_type})`);
      }
    }
  }
  
  console.log(`\n✅ Fertig! ${corrected} Ergebnisse korrigiert, ${errors} Fehler`);
  
  // 6. Optional: Lösche Duplikat-Spieler (nur wenn keine anderen Referenzen)
  console.log(`\n4️⃣ Prüfe ob Duplikat-Spieler gelöscht werden können...`);
  
  for (const wrongId of wrongRaoulIds) {
    // Prüfe ob dieser Spieler noch in anderen Tabellen verwendet wird
    const { data: remainingResults } = await supabase
      .from('match_results')
      .select('id')
      .or(`home_player_id.eq.${wrongId},home_player1_id.eq.${wrongId},home_player2_id.eq.${wrongId},guest_player_id.eq.${wrongId},guest_player1_id.eq.${wrongId},guest_player2_id.eq.${wrongId}`)
      .limit(1);
    
    const { data: teamMemberships } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('player_id', wrongId)
      .limit(1);
    
    const { data: teamRoster } = await supabase
      .from('team_roster')
      .select('id')
      .eq('player_id', wrongId)
      .limit(1);
    
    if ((!remainingResults || remainingResults.length === 0) &&
        (!teamMemberships || teamMemberships.length === 0) &&
        (!teamRoster || teamRoster.length === 0)) {
      console.log(`🗑️ Lösche Duplikat-Spieler ${wrongId}...`);
      const { error: deleteError } = await supabase
        .from('players_unified')
        .delete()
        .eq('id', wrongId);
      
      if (deleteError) {
        console.error(`❌ Fehler beim Löschen:`, deleteError);
      } else {
        console.log(`✅ Duplikat-Spieler ${wrongId} gelöscht`);
      }
    } else {
      console.log(`⚠️ Duplikat-Spieler ${wrongId} wird noch verwendet, nicht gelöscht`);
    }
  }
}

fixRaoulPlayerIds().catch(console.error);

