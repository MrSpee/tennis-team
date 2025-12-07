#!/usr/bin/env node

/**
 * Debug-Script: Prüft warum Raouls Ergebnisse nicht angezeigt werden
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

async function debugRaoulResults() {
  console.log('🔍 Debug: Raouls Ergebnisse\n');
  
  // 1. Finde Raoul in players_unified
  console.log('1️⃣ Suche Raoul in players_unified...');
  const { data: raoulPlayers, error: raoulError } = await supabase
    .from('players_unified')
    .select('id, name, tvm_id, current_lk, is_active')
    .ilike('name', '%Raoul%');
  
  if (raoulError) {
    console.error('❌ Fehler beim Laden von Raoul:', raoulError);
    return;
  }
  
  console.log(`✅ Gefunden: ${raoulPlayers?.length || 0} Spieler mit "Raoul" im Namen:`);
  raoulPlayers?.forEach(p => {
    console.log(`   - ${p.name} (ID: ${p.id}, TVM-ID: ${p.tvm_id || 'keine'}, Aktiv: ${p.is_active})`);
  });
  
  if (!raoulPlayers || raoulPlayers.length === 0) {
    console.log('❌ Kein Raoul gefunden!');
    return;
  }
  
  const raoulId = raoulPlayers[0].id;
  console.log(`\n📌 Verwende Raoul-ID: ${raoulId}\n`);
  
  // 2. Suche nach Ergebnissen für diesen Spieltag
  console.log('2️⃣ Suche nach Matchday: VKC Köln 1 vs. TG GW im DJK Bocklemünd 1...');
  const { data: matchdays, error: matchdayError } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      home_team_id,
      away_team_id,
      home_team:home_team_id(club_name, team_name),
      away_team:away_team_id(club_name, team_name)
    `)
    .or(`home_team.club_name.ilike.%VKC%,away_team.club_name.ilike.%VKC%`)
    .or(`home_team.club_name.ilike.%TG GW%,away_team.club_name.ilike.%TG GW%`);
  
  if (matchdayError) {
    console.error('❌ Fehler beim Laden von Matchdays:', matchdayError);
    return;
  }
  
  console.log(`✅ Gefunden: ${matchdays?.length || 0} Matchdays:`);
  matchdays?.forEach(m => {
    const home = m.home_team ? `${m.home_team.club_name} ${m.home_team.team_name || ''}`.trim() : 'Unbekannt';
    const away = m.away_team ? `${m.away_team.club_name} ${m.away_team.team_name || ''}`.trim() : 'Unbekannt';
    console.log(`   - ${home} vs. ${away} (ID: ${m.id}, Datum: ${m.match_date})`);
  });
  
  // 3. Suche nach Ergebnissen für Raoul
  console.log(`\n3️⃣ Suche nach Ergebnissen für Raoul (ID: ${raoulId})...`);
  const { data: raoulResults, error: resultsError } = await supabase
    .from('match_results')
    .select(`
      *,
      matchday:matchdays(
        id,
        match_date,
        home_team:home_team_id(club_name, team_name),
        away_team:away_team_id(club_name, team_name)
      )
    `)
    .or(`home_player_id.eq.${raoulId},home_player1_id.eq.${raoulId},home_player2_id.eq.${raoulId},guest_player_id.eq.${raoulId},guest_player1_id.eq.${raoulId},guest_player2_id.eq.${raoulId}`)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (resultsError) {
    console.error('❌ Fehler beim Laden von Ergebnissen:', resultsError);
    return;
  }
  
  console.log(`✅ Gefunden: ${raoulResults?.length || 0} Ergebnisse für Raoul:`);
  raoulResults?.forEach(r => {
    const home = r.matchday?.home_team ? `${r.matchday.home_team.club_name} ${r.matchday.home_team.team_name || ''}`.trim() : 'Unbekannt';
    const away = r.matchday?.away_team ? `${r.matchday.away_team.club_name} ${r.matchday.away_team.team_name || ''}`.trim() : 'Unbekannt';
    const playerField = r.home_player_id === raoulId ? 'home_player_id' :
                        r.home_player1_id === raoulId ? 'home_player1_id' :
                        r.home_player2_id === raoulId ? 'home_player2_id' :
                        r.guest_player_id === raoulId ? 'guest_player_id' :
                        r.guest_player1_id === raoulId ? 'guest_player1_id' :
                        r.guest_player2_id === raoulId ? 'guest_player2_id' : 'unbekannt';
    console.log(`   - ${home} vs. ${away} (Match ${r.match_number}, ${r.match_type}, Feld: ${playerField}, Datum: ${r.matchday?.match_date})`);
  });
  
  // 4. Prüfe alle Ergebnisse des spezifischen Matchdays
  if (matchdays && matchdays.length > 0) {
    const matchdayId = matchdays[0].id;
    console.log(`\n4️⃣ Prüfe alle Ergebnisse für Matchday ${matchdayId}...`);
    
    const { data: allResults, error: allResultsError } = await supabase
      .from('match_results')
      .select(`
        *,
        home_player:home_player_id(id, name),
        guest_player:guest_player_id(id, name),
        home_player1:home_player1_id(id, name),
        home_player2:home_player2_id(id, name),
        guest_player1:guest_player1_id(id, name),
        guest_player2:guest_player2_id(id, name)
      `)
      .eq('matchday_id', matchdayId);
    
    if (allResultsError) {
      console.error('❌ Fehler beim Laden aller Ergebnisse:', allResultsError);
      return;
    }
    
    console.log(`✅ Gefunden: ${allResults?.length || 0} Ergebnisse für diesen Matchday:`);
    allResults?.forEach(r => {
      const players = [];
      if (r.home_player) players.push(`Home: ${r.home_player.name} (${r.home_player.id})`);
      if (r.guest_player) players.push(`Guest: ${r.guest_player.name} (${r.guest_player.id})`);
      if (r.home_player1) players.push(`Home1: ${r.home_player1.name} (${r.home_player1.id})`);
      if (r.home_player2) players.push(`Home2: ${r.home_player2.name} (${r.home_player2.id})`);
      if (r.guest_player1) players.push(`Guest1: ${r.guest_player1.name} (${r.guest_player1.id})`);
      if (r.guest_player2) players.push(`Guest2: ${r.guest_player2.name} (${r.guest_player2.id})`);
      
      console.log(`   - Match ${r.match_number} (${r.match_type}): ${players.join(', ')}`);
      
      // Prüfe ob Raoul dabei ist
      const hasRaoul = r.home_player_id === raoulId || 
                       r.home_player1_id === raoulId || 
                       r.home_player2_id === raoulId ||
                       r.guest_player_id === raoulId ||
                       r.guest_player1_id === raoulId ||
                       r.guest_player2_id === raoulId;
      
      if (hasRaoul) {
        console.log(`      ✅ Raoul ist in diesem Ergebnis!`);
      } else {
        console.log(`      ❌ Raoul ist NICHT in diesem Ergebnis!`);
      }
    });
  }
  
  // 5. Prüfe team_roster für Raoul
  console.log(`\n5️⃣ Prüfe team_roster für Raoul...`);
  const { data: rosterEntries, error: rosterError } = await supabase
    .from('team_roster')
    .select('*')
    .ilike('player_name', '%Raoul%');
  
  if (rosterError) {
    console.error('❌ Fehler beim Laden von team_roster:', rosterError);
    return;
  }
  
  console.log(`✅ Gefunden: ${rosterEntries?.length || 0} team_roster Einträge:`);
  rosterEntries?.forEach(r => {
    console.log(`   - ${r.player_name} (Team: ${r.team_id}, Saison: ${r.season}, Rang: ${r.rank}, player_id: ${r.player_id || 'KEINE'})`);
    if (r.player_id && r.player_id !== raoulId) {
      console.log(`      ⚠️ WARNUNG: player_id (${r.player_id}) stimmt nicht mit Raoul-ID (${raoulId}) überein!`);
    }
  });
}

debugRaoulResults().catch(console.error);

