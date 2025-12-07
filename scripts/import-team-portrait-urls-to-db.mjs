#!/usr/bin/env node

/**
 * Importiert Team-Portrait-URLs aus der JSON-Datei in die Datenbank
 * Matcht Teams anhand von Namen und Gruppe
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (key && !process.env[key]) {
        process.env[key] = rest.join('=').trim();
      }
    });
  } catch (error) {}
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const INPUT_FILE = resolve(__dirname, '../tmp/team-portrait-urls.json');
const SEASON = 'Winter 2025/26';

/**
 * Normalisiert Team-Namen für Matching
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matcht einen nuLiga Team-Namen mit einem DB-Team
 */
async function matchTeam(nuLigaTeamName, groupNumber) {
  // Extrahiere Vereinsname und Team-Nummer
  // z.B. "VKC Köln 1" -> Verein: "VKC Köln", Team: "1"
  const parts = nuLigaTeamName.split(/\s+/);
  const teamNumber = parts[parts.length - 1];
  const clubName = parts.slice(0, -1).join(' ');
  
  // Suche nach Teams in der gleichen Gruppe
  const groupName = `Gr. ${groupNumber.padStart(3, '0')}`;
  
  // Versuche verschiedene Saison-Varianten
  const seasonVariants = [
    SEASON,
    'Winter 2025/26',
    'Winter 2025/2026'
  ];
  
  for (const seasonVariant of seasonVariants) {
    const { data: teams, error } = await supabase
      .from('team_seasons')
      .select(`
        id,
        team_id,
        season,
        group_name,
        league,
        team_info:team_id(id, club_name, team_name, category)
      `)
      .ilike('season', `%${seasonVariant}%`)
      .ilike('group_name', `%${groupName}%`)
      .eq('is_active', true);
    
    if (error) {
      console.warn(`   ⚠️  Fehler beim Laden:`, error.message);
      continue;
    }
    
    if (!teams || teams.length === 0) {
      continue;
    }
    
    // Versuche exaktes Match
    for (const teamSeason of teams) {
      const team = teamSeason.team_info;
      if (!team) continue;
      
      const dbTeamName = `${team.club_name} ${team.team_name || ''}`.trim();
      const normalizedDb = normalizeTeamName(dbTeamName);
      const normalizedNuLiga = normalizeTeamName(nuLigaTeamName);
      
      // Exaktes Match
      if (normalizedDb === normalizedNuLiga) {
        return teamSeason.team_id;
      }
      
      // Teilstring-Match
      if (normalizedDb.includes(normalizedNuLiga) || 
          normalizedNuLiga.includes(normalizedDb)) {
        return teamSeason.team_id;
      }
      
      // Match nach Vereinsname + Team-Nummer
      const normalizedClub = normalizeTeamName(clubName);
      const dbClub = normalizeTeamName(team.club_name);
      const dbTeamNum = normalizeTeamName(team.team_name || '');
      
      if (normalizedClub === dbClub && teamNumber === dbTeamNum) {
        return teamSeason.team_id;
      }
    }
  }
  
  return null;
}

/**
 * Hauptfunktion
 */
async function importUrls() {
  console.log('🚀 Importiere Team-Portrait-URLs in die Datenbank');
  console.log('='.repeat(80));
  
  // Lade JSON-Datei
  let data;
  try {
    const content = readFileSync(INPUT_FILE, 'utf8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${INPUT_FILE}:`, error.message);
    return;
  }
  
  console.log(`📄 ${data.teams.length} Teams in JSON-Datei gefunden\n`);
  
  // Entferne Duplikate (gleiche nuLigaTeamId)
  const uniqueTeams = new Map();
  data.teams.forEach(team => {
    if (!uniqueTeams.has(team.nuLigaTeamId)) {
      uniqueTeams.set(team.nuLigaTeamId, team);
    }
  });
  
  console.log(`📊 ${uniqueTeams.size} eindeutige Teams nach Duplikat-Entfernung\n`);
  
  let matched = 0;
  let updated = 0;
  let notFound = 0;
  
  // Für jedes Team: Match mit DB und Update
  for (const [teamId, team] of uniqueTeams.entries()) {
    console.log(`\n🔍 "${team.teamName}" (nuLiga ID: ${teamId})`);
    
    const dbTeamId = await matchTeam(team.teamName, team.group);
    
    if (!dbTeamId) {
      console.log(`   ❌ Nicht gefunden in DB`);
      notFound++;
      continue;
    }
    
    console.log(`   ✅ Gematcht mit DB Team ID: ${dbTeamId}`);
    matched++;
    
    // Update team_seasons
    const { error: updateError } = await supabase
      .from('team_seasons')
      .update({
        source_url: team.teamPortraitUrl,
        source_type: 'nuliga'
      })
      .eq('team_id', dbTeamId)
      .ilike('season', `%${SEASON}%`)
      .eq('is_active', true);
    
    if (updateError) {
      console.error(`   ❌ Fehler beim Update:`, updateError.message);
    } else {
      console.log(`   ✅ URL aktualisiert`);
      updated++;
    }
  }
  
  console.log(`\n\n✅ Fertig!`);
  console.log(`📊 Zusammenfassung:`);
  console.log(`   - ${matched} Teams gematcht`);
  console.log(`   - ${updated} URLs aktualisiert`);
  console.log(`   - ${notFound} Teams nicht gefunden`);
}

importUrls().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

