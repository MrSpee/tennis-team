#!/usr/bin/env node

/**
 * Generiert automatisch SQL-Statements für ALLE Gruppen
 * Scraped alle nuLiga-Gruppenseiten und erstellt SQL-Update-Statements
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHAMPIONSHIP = 'Köln-Leverkusen Winter 2025/2026';
const OUTPUT_SQL = resolve(__dirname, '../sql/update_all_team_portrait_urls_auto.sql');

// Bekannte Gruppen (kann erweitert werden)
// Du kannst hier weitere Gruppen hinzufügen, z.B. alle Gruppen von 1-100
// Starte mit den ersten 50 Gruppen (kann später erweitert werden)
const GROUPS = Array.from({ length: 50 }, (_, i) => String(i + 1).padStart(3, '0'));

/**
 * Extrahiert Team-Portrait-URLs aus groupPage HTML
 */
function extractTeamPortraitUrls(html, groupNumber) {
  const teams = new Map(); // Map<teamId, {name, url}>
  const teamLinkPattern = /<a[^>]*href="([^"]*teamPortrait[^"]*team=(\d+)[^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = teamLinkPattern.exec(html)) !== null) {
    let url = match[1].replace(/&amp;/g, '&');
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
    
    // Speichere nur einmal pro Team-ID (entferne Duplikate)
    if (!teams.has(teamId)) {
      teams.set(teamId, { teamName, url });
    }
  }
  
  return Array.from(teams.entries()).map(([teamId, data]) => ({
    nuLigaTeamId: teamId,
    ...data
  }));
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
    
    if (!response.ok) {
      return { success: false, teams: [] };
    }
    
    const html = await response.text();
    
    // Prüfe ob Seite Teams enthält (nicht 404 oder leer)
    if (html.includes('Keine Mannschaften') || html.includes('404') || html.length < 1000) {
      return { success: false, teams: [] };
    }
    
    const teams = extractTeamPortraitUrls(html, groupNumber);
    return { success: true, teams };
  } catch (error) {
    return { success: false, teams: [], error: error.message };
  }
}

/**
 * Generiert SQL-Statement für ein Team
 */
function generateSQLForTeam(team, groupNumber) {
  const { nuLigaTeamId, teamName, url } = team;
  
  // Erstelle WHERE-Klausel basierend auf Team-Namen
  // Versuche Vereinsname und Team-Nummer zu extrahieren
  const parts = teamName.split(/\s+/);
  const teamNum = parts[parts.length - 1];
  const clubName = parts.slice(0, -1).join(' ');
  
  // Escape für SQL
  const escapedUrl = url.replace(/'/g, "''");
  const escapedClubName = clubName.replace(/'/g, "''");
  
  return `-- ${teamName} (nuLiga ID: ${nuLigaTeamId})
UPDATE team_seasons
SET source_url = '${escapedUrl}',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%${escapedClubName.split(' ')[0]}%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%${groupNumber.padStart(3, '0')}%'
AND is_active = true
AND source_url IS NULL;

`;
}

/**
 * Hauptfunktion
 */
async function generateSQL() {
  console.log('🚀 Generiere SQL-Statements für alle Gruppen');
  console.log('='.repeat(80));
  console.log(`Championship: ${CHAMPIONSHIP}`);
  console.log(`Prüfe ${GROUPS.length} Gruppen...\n`);
  
  let sql = `-- Automatisch generiertes SQL-Script
-- Aktualisiert Team-Portrait-URLs für Winter 2025/26
-- Generiert am: ${new Date().toISOString()}
-- Championship: ${CHAMPIONSHIP}

`;
  
  let totalTeams = 0;
  let groupsWithTeams = 0;
  
  for (let i = 0; i < GROUPS.length; i++) {
    const groupNumber = GROUPS[i];
    process.stdout.write(`\r🔍 Prüfe Gruppe ${groupNumber}... (${i + 1}/${GROUPS.length})`);
    
    const result = await scrapeGroupPage(groupNumber);
    
    if (result.success && result.teams.length > 0) {
      groupsWithTeams++;
      totalTeams += result.teams.length;
      
      sql += `\n-- ========================================\n`;
      sql += `-- Gruppe ${groupNumber} (${result.teams.length} Teams)\n`;
      sql += `-- ========================================\n\n`;
      
      result.teams.forEach(team => {
        sql += generateSQLForTeam(team, groupNumber);
      });
      
      console.log(`\n   ✅ Gruppe ${groupNumber}: ${result.teams.length} Teams gefunden`);
    }
    
    // Pause zwischen Requests (1 Sekunde)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  sql += `\n-- Zeige alle aktualisierten Einträge
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
ORDER BY ts.group_name, ti.club_name, ti.team_name;
`;
  
  writeFileSync(OUTPUT_SQL, sql, 'utf8');
  
  console.log(`\n\n✅ Fertig!`);
  console.log(`📄 SQL-Script erstellt: ${OUTPUT_SQL}`);
  console.log(`📊 Zusammenfassung:`);
  console.log(`   - ${groupsWithTeams} Gruppen mit Teams gefunden`);
  console.log(`   - ${totalTeams} Teams insgesamt`);
  console.log(`\n📋 Nächster Schritt: Führe das SQL-Script im Supabase Dashboard aus`);
  console.log(`   Oder über MCP-Tools, falls verfügbar`);
}

generateSQL().catch(error => {
  console.error('\n❌ Fehler:', error);
  process.exit(1);
});

