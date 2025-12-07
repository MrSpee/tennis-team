#!/usr/bin/env node

/**
 * Extrahiert Team-Portrait-URLs direkt aus nuLiga-Gruppenseiten
 * Erstellt eine JSON-Datei mit allen gefundenen URLs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHAMPIONSHIP = 'Köln-Leverkusen Winter 2025/2026';
const OUTPUT_FILE = resolve(__dirname, '../tmp/team-portrait-urls.json');

// Bekannte Gruppen (kann erweitert werden)
const GROUPS = [
  '43', // Gr. 043 - Herren 40 1. Bezirksliga
  // Weitere Gruppen können hier hinzugefügt werden
];

/**
 * Extrahiert Team-Portrait-URLs aus einer groupPage HTML
 */
function extractTeamPortraitUrls(html, groupNumber) {
  const teams = [];
  
  // Pattern 1: <a href="...teamPortrait?team=1234567...">Team Name</a>
  const teamLinkPattern = /<a[^>]*href="([^"]*teamPortrait[^"]*team=(\d+)[^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = teamLinkPattern.exec(html)) !== null) {
    let url = match[1];
    const teamId = match[2];
    const teamName = match[3].trim();
    
    // Konvertiere relative URLs zu absoluten URLs
    if (!url.startsWith('http')) {
      url = `https://tvm.liga.nu${url}`;
    }
    
    // Stelle sicher, dass championship und group in der URL sind
    const championshipParam = encodeURIComponent(CHAMPIONSHIP);
    if (!url.includes('championship=')) {
      url += url.includes('?') ? '&' : '?';
      url += `championship=${championshipParam}`;
    }
    
    if (!url.includes('group=') && groupNumber) {
      url += url.includes('?') ? '&' : '?';
      url += `group=${groupNumber}`;
    }
    
    teams.push({
      nuLigaTeamId: teamId,
      teamName: teamName,
      teamPortraitUrl: url,
      group: groupNumber
    });
  }
  
  return teams;
}

/**
 * Scraped eine groupPage
 */
async function scrapeGroupPage(groupNumber) {
  const championshipParam = encodeURIComponent(CHAMPIONSHIP);
  const url = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/groupPage?championship=${championshipParam}&group=${groupNumber}`;
  
  console.log(`\n🔍 Scrape Group ${groupNumber}...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`   ⚠️  HTTP ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const teams = extractTeamPortraitUrls(html, groupNumber);
    
    console.log(`   ✅ ${teams.length} Teams gefunden`);
    teams.forEach(team => {
      console.log(`      - ${team.teamName} (ID: ${team.nuLigaTeamId})`);
    });
    
    return teams;
    
  } catch (error) {
    console.error(`   ❌ Fehler:`, error.message);
    return [];
  }
}

/**
 * Hauptfunktion
 */
async function extractAllUrls() {
  console.log('🚀 Extrahiere Team-Portrait-URLs aus nuLiga');
  console.log('='.repeat(80));
  console.log(`Championship: ${CHAMPIONSHIP}`);
  console.log(`Gruppen: ${GROUPS.join(', ')}`);
  
  const allTeams = [];
  
  for (const groupNumber of GROUPS) {
    const teams = await scrapeGroupPage(groupNumber);
    allTeams.push(...teams);
    
    // Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Speichere Ergebnisse
  const output = {
    championship: CHAMPIONSHIP,
    extractedAt: new Date().toISOString(),
    groups: GROUPS,
    teams: allTeams
  };
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`\n\n✅ Fertig!`);
  console.log(`📄 Ergebnisse gespeichert in: ${OUTPUT_FILE}`);
  console.log(`📊 ${allTeams.length} Teams gefunden`);
  
  // Zeige Zusammenfassung
  console.log(`\n📋 Zusammenfassung:`);
  const byGroup = {};
  allTeams.forEach(team => {
    if (!byGroup[team.group]) {
      byGroup[team.group] = [];
    }
    byGroup[team.group].push(team);
  });
  
  Object.keys(byGroup).forEach(group => {
    console.log(`   Gruppe ${group}: ${byGroup[group].length} Teams`);
  });
}

extractAllUrls().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

