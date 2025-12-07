#!/usr/bin/env node

/**
 * Findet und aktualisiert Team-Portrait-URLs für alle Teams in "Winter 2025/26"
 * Scraped die nuLiga groupPage und extrahiert die teamPortrait URLs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Umgebungsvariablen
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
  } catch (error) {
    // .env nicht vorhanden, verwende System-Umgebungsvariablen
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SEASON = 'Winter 2025/26';
const CHAMPIONSHIP = 'Köln-Leverkusen Winter 2025/2026';

/**
 * Extrahiert Team-Portrait-URLs aus einer groupPage HTML
 */
function extractTeamPortraitUrls(html, groupNumber) {
  const urls = [];
  
  // Suche nach allen Links mit team= Parameter
  // Pattern: href="...teamPortrait?team=1234567..."
  const teamPortraitPattern = /href="([^"]*teamPortrait[^"]*team=(\d+)[^"]*)"/gi;
  let match;
  
  while ((match = teamPortraitPattern.exec(html)) !== null) {
    let url = match[1];
    
    // Konvertiere relative URLs zu absoluten URLs
    if (!url.startsWith('http')) {
      url = `https://tvm.liga.nu${url}`;
    }
    
    const teamId = match[2];
    
    // Stelle sicher, dass championship und group in der URL sind
    if (!url.includes('championship=')) {
      const championshipParam = encodeURIComponent(CHAMPIONSHIP);
      url += url.includes('?') ? '&' : '?';
      url += `championship=${championshipParam}`;
    }
    
    if (!url.includes('group=') && groupNumber) {
      url += url.includes('?') ? '&' : '?';
      url += `group=${groupNumber}`;
    }
    
    urls.push({
      teamId: teamId,
      url: url
    });
  }
  
  return urls;
}

/**
 * Findet Team-Namen in der groupPage HTML
 */
function extractTeamNames(html) {
  const teams = [];
  
  // Suche nach Team-Namen in Tabellen oder Links
  // Pattern: <a href="...teamPortrait?team=1234567">Team Name</a>
  const teamLinkPattern = /<a[^>]*href="[^"]*teamPortrait[^"]*team=(\d+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = teamLinkPattern.exec(html)) !== null) {
    const teamId = match[1];
    const teamName = match[2].trim();
    
    teams.push({
      teamId: teamId,
      name: teamName
    });
  }
  
  return teams;
}

/**
 * Scraped eine groupPage und extrahiert Team-Informationen
 */
async function scrapeGroupPage(groupNumber) {
  const championshipParam = encodeURIComponent(CHAMPIONSHIP);
  const url = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=${championshipParam}&group=${groupNumber}`;
  
  console.log(`\n🔍 Scrape Group ${groupNumber}: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️  HTTP ${response.status} für Group ${groupNumber}`);
      return [];
    }
    
    const html = await response.text();
    
    // Extrahiere Team-Portrait-URLs
    const urls = extractTeamPortraitUrls(html, groupNumber);
    const teamNames = extractTeamNames(html);
    
    // Kombiniere URLs mit Team-Namen
    const teams = urls.map(urlInfo => {
      const teamName = teamNames.find(t => t.teamId === urlInfo.teamId);
      return {
        nuLigaTeamId: urlInfo.teamId,
        teamPortraitUrl: urlInfo.url,
        teamName: teamName?.name || null
      };
    });
    
    console.log(`   ✅ ${teams.length} Teams gefunden`);
    
    return teams;
    
  } catch (error) {
    console.error(`   ❌ Fehler beim Scrapen von Group ${groupNumber}:`, error.message);
    return [];
  }
}

/**
 * Matcht einen nuLiga Team-Namen mit einem Team in der DB
 */
async function matchTeamInDB(nuLigaTeamName, groupName, league) {
  if (!nuLigaTeamName) return null;
  
  // Normalisiere Team-Namen (entferne "1", "2", etc. am Ende, entferne Vereinsnamen)
  const normalized = nuLigaTeamName
    .replace(/\s+\d+$/, '') // Entferne " 1", " 2" am Ende
    .trim();
  
  // Suche nach Teams in der gleichen Gruppe/League
  const { data: teams, error } = await supabase
    .from('team_seasons')
    .select(`
      team_id,
      group_name,
      league,
      team_info:team_id(id, club_name, team_name, category)
    `)
    .eq('season', SEASON)
    .eq('is_active', true)
    .ilike('group_name', `%${groupName}%`)
    .ilike('league', `%${league}%`);
  
  if (error) {
    console.warn(`   ⚠️  Fehler beim Laden von Teams:`, error.message);
    return null;
  }
  
  if (!teams || teams.length === 0) {
    return null;
  }
  
  // Versuche exaktes Match
  for (const teamSeason of teams) {
    const team = teamSeason.team_info;
    if (!team) continue;
    
    const dbTeamName = `${team.club_name} ${team.team_name || ''}`.trim();
    
    // Exaktes Match
    if (dbTeamName.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(dbTeamName.toLowerCase())) {
      return teamSeason.team_id;
    }
  }
  
  // Fuzzy Match: Suche nach Teilstrings
  for (const teamSeason of teams) {
    const team = teamSeason.team_info;
    if (!team) continue;
    
    const dbTeamName = `${team.club_name} ${team.team_name || ''}`.trim();
    
    // Prüfe ob wichtige Wörter übereinstimmen
    const nuLigaWords = normalized.toLowerCase().split(/\s+/);
    const dbWords = dbTeamName.toLowerCase().split(/\s+/);
    
    const matchingWords = nuLigaWords.filter(word => 
      dbWords.some(dbWord => dbWord.includes(word) || word.includes(dbWord))
    );
    
    if (matchingWords.length >= 2) {
      return teamSeason.team_id;
    }
  }
  
  return null;
}

/**
 * Hauptfunktion: Findet und aktualisiert alle Team-Portrait-URLs
 */
async function findAndUpdateTeamPortraitUrls() {
  console.log('🚀 Starte Suche nach Team-Portrait-URLs für', SEASON);
  console.log('='.repeat(80));
  
  // 1. Lade alle aktiven Teams für die Saison (flexibel mit Saison-Bezeichnung)
  console.log(`\n🔍 Suche nach Teams mit Saison "${SEASON}"...`);
  
  // Versuche verschiedene Saison-Varianten
  const seasonVariants = [
    SEASON,
    'Winter 2025/26',
    'Winter 2025/2026',
    'Winter 25/26'
  ];
  
  let teamSeasons = [];
  let loadError = null;
  
  for (const seasonVariant of seasonVariants) {
    const { data, error } = await supabase
      .from('team_seasons')
      .select(`
        id,
        team_id,
        season,
        group_name,
        league,
        source_url,
        team_info:team_id(id, club_name, team_name, category)
      `)
      .ilike('season', `%${seasonVariant}%`)
      .eq('is_active', true)
      .order('group_name', { ascending: true });
    
    if (error) {
      console.warn(`⚠️  Fehler beim Laden mit "${seasonVariant}":`, error.message);
      loadError = error;
      continue;
    }
    
    if (data && data.length > 0) {
      teamSeasons = data;
      console.log(`✅ ${teamSeasons.length} Teams gefunden mit Saison-Variante "${seasonVariant}"`);
      break;
    }
  }
  
  if (teamSeasons.length === 0) {
    console.error('❌ Keine Teams gefunden! Prüfe:');
    console.error('   - Ist die Saison-Bezeichnung korrekt?');
    console.error('   - Gibt es aktive Teams in team_seasons?');
    console.error('   - Sind RLS-Policies korrekt konfiguriert?');
    
    // Versuche alle team_seasons zu laden (zum Debuggen)
    const { data: allSeasons, error: debugError } = await supabase
      .from('team_seasons')
      .select('season, is_active')
      .limit(10);
    
    if (!debugError && allSeasons && allSeasons.length > 0) {
      console.log('\n📋 Erste 10 Saison-Einträge in der DB:');
      allSeasons.forEach(ts => {
        console.log(`   - "${ts.season}" (active: ${ts.is_active})`);
      });
    }
    
    return;
  }
  
  console.log(`\n📊 ${teamSeasons.length} Teams in der Datenbank gefunden`);
  
  // Gruppiere nach group_name
  const groups = new Map();
  teamSeasons.forEach(ts => {
    const groupName = ts.group_name || 'Unbekannt';
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName).push(ts);
  });
  
  console.log(`📋 ${groups.size} verschiedene Gruppen gefunden\n`);
  
  // 2. Für jede Gruppe: Scrape die groupPage
  const allFoundUrls = new Map(); // Map<team_id, url>
  
  for (const [groupName, teams] of groups.entries()) {
    // Extrahiere Gruppen-Nummer aus group_name (z.B. "Gr. 043" -> "43")
    const groupMatch = groupName.match(/Gr\.\s*0*(\d+)/i);
    if (!groupMatch) {
      console.log(`⚠️  Kann Gruppen-Nummer nicht aus "${groupName}" extrahieren, überspringe...`);
      continue;
    }
    
    const groupNumber = groupMatch[1];
    console.log(`\n📋 Gruppe: ${groupName} (Group ${groupNumber})`);
    console.log(`   ${teams.length} Teams in dieser Gruppe`);
    
    // Scrape groupPage
    const scrapedTeams = await scrapeGroupPage(groupNumber);
    
    if (scrapedTeams.length === 0) {
      console.log(`   ⚠️  Keine Teams auf der nuLiga-Seite gefunden`);
      continue;
    }
    
    // 3. Match Teams mit DB-Teams
    for (const scrapedTeam of scrapedTeams) {
      const league = teams[0]?.league || '';
      
      // Versuche Team zu matchen
      const matchedTeamId = await matchTeamInDB(
        scrapedTeam.teamName,
        groupName,
        league
      );
      
      if (matchedTeamId) {
        console.log(`   ✅ "${scrapedTeam.teamName}" → Team ID: ${matchedTeamId}`);
        allFoundUrls.set(matchedTeamId, scrapedTeam.teamPortraitUrl);
      } else {
        console.log(`   ⚠️  "${scrapedTeam.teamName}" konnte nicht gematcht werden`);
        // Zeige mögliche Matches
        console.log(`      Mögliche DB-Teams:`);
        teams.slice(0, 3).forEach(ts => {
          const team = ts.team_info;
          if (team) {
            console.log(`        - ${team.club_name} ${team.team_name || ''}`);
          }
        });
      }
    }
    
    // Kleine Pause zwischen Gruppen
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 4. Update team_seasons mit den gefundenen URLs
  console.log(`\n\n💾 Aktualisiere ${allFoundUrls.size} Team-Portrait-URLs in der Datenbank...`);
  console.log('='.repeat(80));
  
  let updated = 0;
  let skipped = 0;
  
  for (const [teamId, url] of allFoundUrls.entries()) {
    // Prüfe ob URL bereits vorhanden ist
    const existing = teamSeasons.find(ts => ts.team_id === teamId);
    if (existing?.source_url === url) {
      console.log(`⏭️  Team ${teamId}: URL bereits vorhanden`);
      skipped++;
      continue;
    }
    
    // Update team_seasons
    const { error: updateError } = await supabase
      .from('team_seasons')
      .update({
        source_url: url,
        source_type: 'nuliga'
      })
      .eq('team_id', teamId)
      .eq('season', SEASON)
      .eq('is_active', true);
    
    if (updateError) {
      console.error(`❌ Fehler beim Update von Team ${teamId}:`, updateError.message);
    } else {
      const team = existing?.team_info;
      const teamName = team ? `${team.club_name} ${team.team_name || ''}` : teamId;
      console.log(`✅ Team ${teamName}: URL aktualisiert`);
      updated++;
    }
  }
  
  console.log(`\n✅ Fertig! ${updated} URLs aktualisiert, ${skipped} übersprungen`);
}

// Führe Script aus
findAndUpdateTeamPortraitUrls().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

