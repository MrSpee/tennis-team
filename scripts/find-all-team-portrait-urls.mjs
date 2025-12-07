#!/usr/bin/env node

/**
 * Findet automatisch Team-Portrait-URLs für ALLE Teams in der Datenbank
 * 
 * Vorgehen:
 * 1. Lade alle aktiven Teams für "Winter 2025/26" aus der DB
 * 2. Gruppiere nach group_name
 * 3. Für jede Gruppe: Scrape die nuLiga groupPage
 * 4. Match Teams aus DB mit Teams von nuLiga
 * 5. Erstelle SQL-Statements zum Update
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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

const CHAMPIONSHIP = 'Köln-Leverkusen Winter 2025/2026';
const SEASON_VARIANTS = ['Winter 2025/26', 'Winter 2025/2026', 'Winter 25/26'];
const OUTPUT_SQL = resolve(__dirname, '../sql/update_all_team_portrait_urls.sql');

/**
 * Extrahiert Team-Portrait-URLs aus groupPage HTML
 */
function extractTeamPortraitUrls(html, groupNumber) {
  const teams = [];
  const teamLinkPattern = /<a[^>]*href="([^"]*teamPortrait[^"]*team=(\d+)[^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = teamLinkPattern.exec(html)) !== null) {
    let url = match[1].replace(/&amp;/g, '&'); // Konvertiere &amp; zu &
    const teamId = match[2];
    const teamName = match[3].trim();
    
    if (!url.startsWith('http')) {
      url = `https://tvm.liga.nu${url}`;
    }
    
    const championshipParam = encodeURIComponent(CHAMPIONSHIP);
    if (!url.includes('championship=')) {
      url += url.includes('?') ? '&' : '?';
      url += `championship=${championshipParam}`;
    }
    
    if (!url.includes('group=') && groupNumber) {
      url += url.includes('?') ? '&' : '?';
      url += `group=${groupNumber}`;
    }
    
    teams.push({ nuLigaTeamId: teamId, teamName, url });
  }
  
  return teams;
}

/**
 * Scraped eine groupPage
 */
async function scrapeGroupPage(groupNumber) {
  const championshipParam = encodeURIComponent(CHAMPIONSHIP);
  const url = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=${championshipParam}&group=${groupNumber}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    return extractTeamPortraitUrls(html, groupNumber);
  } catch (error) {
    console.error(`   ❌ Fehler:`, error.message);
    return [];
  }
}

/**
 * Normalisiert Team-Namen für Matching
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Matcht nuLiga Team mit DB-Team
 */
function matchTeam(nuLigaTeam, dbTeam) {
  const nuLigaName = normalizeName(nuLigaTeam.teamName);
  const dbName = normalizeName(`${dbTeam.club_name} ${dbTeam.team_name || ''}`.trim());
  
  // Exaktes Match
  if (nuLigaName === dbName) return true;
  
  // Teilstring-Match
  if (nuLigaName.includes(dbName) || dbName.includes(nuLigaName)) return true;
  
  // Match nach Vereinsname
  const nuLigaClub = nuLigaName.split(/\s+\d+$/)[0]; // Entferne Team-Nummer
  const dbClub = normalizeName(dbTeam.club_name);
  
  if (nuLigaClub.includes(dbClub) || dbClub.includes(nuLigaClub)) {
    // Prüfe Team-Nummer
    const nuLigaNum = nuLigaTeam.teamName.match(/\s+(\d+)$/)?.[1];
    const dbNum = dbTeam.team_name || '';
    if (nuLigaNum === dbNum) return true;
  }
  
  return false;
}

/**
 * Hauptfunktion
 */
async function findAllUrls() {
  console.log('🚀 Finde Team-Portrait-URLs für ALLE Teams in der Datenbank');
  console.log('='.repeat(80));
  
  // 1. Lade alle aktiven Teams
  console.log('\n📊 Lade Teams aus der Datenbank...');
  let allTeams = [];
  
  for (const seasonVariant of SEASON_VARIANTS) {
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
      .eq('is_active', true);
    
    if (error) {
      console.warn(`⚠️  Fehler mit "${seasonVariant}":`, error.message);
      continue;
    }
    
    if (data && data.length > 0) {
      allTeams = data.filter(ts => ts.team_info); // Nur Teams mit team_info
      console.log(`✅ ${allTeams.length} Teams gefunden mit "${seasonVariant}"`);
      break;
    }
  }
  
  if (allTeams.length === 0) {
    console.error('❌ Keine Teams gefunden!');
    return;
  }
  
  // 2. Gruppiere nach group_name
  const groups = new Map();
  allTeams.forEach(ts => {
    const groupName = ts.group_name || 'Unbekannt';
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName).push(ts);
  });
  
  console.log(`\n📋 ${groups.size} verschiedene Gruppen gefunden\n`);
  
  // 3. Für jede Gruppe: Scrape nuLiga
  const matches = []; // Array von { dbTeam, nuLigaTeam, url }
  
  for (const [groupName, dbTeams] of groups.entries()) {
    const groupMatch = groupName.match(/Gr\.\s*0*(\d+)/i);
    if (!groupMatch) {
      console.log(`⚠️  Überspringe "${groupName}" (keine Gruppen-Nummer)`);
      continue;
    }
    
    const groupNumber = groupMatch[1];
    console.log(`\n📋 Gruppe: ${groupName} (Group ${groupNumber})`);
    console.log(`   ${dbTeams.length} Teams in DB`);
    
    const nuLigaTeams = await scrapeGroupPage(groupNumber);
    console.log(`   ${nuLigaTeams.length} Teams auf nuLiga`);
    
    if (nuLigaTeams.length === 0) {
      console.log(`   ⚠️  Keine Teams auf nuLiga gefunden`);
      continue;
    }
    
    // 4. Match Teams
    for (const dbTeamSeason of dbTeams) {
      const dbTeam = dbTeamSeason.team_info;
      if (!dbTeam) continue;
      
      // Prüfe ob bereits URL vorhanden
      if (dbTeamSeason.source_url) {
        console.log(`   ⏭️  ${dbTeam.club_name} ${dbTeam.team_name || ''}: URL bereits vorhanden`);
        continue;
      }
      
      // Suche Match
      const match = nuLigaTeams.find(nuLiga => matchTeam(nuLiga, dbTeam));
      
      if (match) {
        console.log(`   ✅ ${dbTeam.club_name} ${dbTeam.team_name || ''} → ${match.teamName}`);
        matches.push({
          dbTeamSeason,
          dbTeam,
          nuLigaTeam: match,
          url: match.url
        });
      } else {
        console.log(`   ❌ ${dbTeam.club_name} ${dbTeam.team_name || ''}: Kein Match gefunden`);
      }
    }
    
    // Pause zwischen Gruppen
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // 5. Erstelle SQL-Statements
  console.log(`\n\n💾 Erstelle SQL-Statements für ${matches.length} Matches...`);
  
  let sql = `-- Automatisch generiertes SQL-Script
-- Aktualisiert Team-Portrait-URLs für Winter 2025/26
-- Generiert am: ${new Date().toISOString()}
-- ${matches.length} Teams werden aktualisiert

`;
  
  matches.forEach((match, index) => {
    const { dbTeam, nuLigaTeam, url } = match;
    const clubName = dbTeam.club_name.replace(/'/g, "''"); // Escape für SQL
    const teamName = (dbTeam.team_name || '').replace(/'/g, "''");
    
    sql += `-- ${index + 1}. ${dbTeam.club_name} ${dbTeam.team_name || ''} (nuLiga: ${nuLigaTeam.teamName}, ID: ${nuLigaTeam.nuLigaTeamId})
UPDATE team_seasons
SET source_url = '${url}',
    source_type = 'nuliga'
WHERE team_id = '${dbTeam.id}'
  AND season ILIKE '%Winter 2025%'
  AND is_active = true;

`;
  });
  
  sql += `-- Zeige aktualisierte Einträge
SELECT 
  ts.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.group_name,
  ts.source_url,
  ts.source_type
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.source_url IS NOT NULL
  AND ts.season ILIKE '%Winter 2025%'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;
`;
  
  writeFileSync(OUTPUT_SQL, sql, 'utf8');
  
  console.log(`✅ SQL-Script erstellt: ${OUTPUT_SQL}`);
  console.log(`📊 ${matches.length} Teams werden aktualisiert`);
  console.log(`\n📋 Nächster Schritt: Führe das SQL-Script im Supabase Dashboard aus`);
}

findAllUrls().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

