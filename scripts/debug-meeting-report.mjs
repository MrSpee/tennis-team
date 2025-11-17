#!/usr/bin/env node
/**
 * Debug-Script: Analysiert einen Meeting Report und zeigt alle extrahierbaren Daten
 * 
 * Usage: node scripts/debug-meeting-report.mjs <meetingId|meetingUrl>
 * 
 * Beispiel:
 *   node scripts/debug-meeting-report.mjs 12500213
 *   node scripts/debug-meeting-report.mjs "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?meeting=12500213"
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade cheerio (falls verfügbar) oder verwende fetch + einfaches Parsing
let cheerio;
try {
  const cheerioModule = await import('cheerio');
  cheerio = cheerioModule.default || cheerioModule;
} catch (err) {
  console.error('❌ cheerio nicht gefunden. Installiere es mit: npm install cheerio');
  process.exit(1);
}

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (err) {
    // Ignore
  }
}

loadEnvFile(join(__dirname, '..', '.env.local'));
loadEnvFile(join(__dirname, '..', '.env'));

function normaliseText(text) {
  return text ? text.replace(/\s+/g, ' ').trim() : '';
}

function extractLkValue(...sources) {
  for (const source of sources) {
    if (!source) continue;
    const text = String(source);
    // Pattern 1: "LK6,1" oder "LK 6,1" → "6.1"
    let match = text.match(/LK\s*(\d+)[,.](\d+)/i);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
    // Pattern 2: "LK6" oder "LK 6" → "6.0"
    match = text.match(/LK\s*(\d+)(?![,.]\d)/i);
    if (match) {
      return `${match[1]}.0`;
    }
    // Pattern 3: "LK6.1" → "6.1"
    match = text.match(/LK\s*(\d+\.\d+)/i);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractPositionFromMeta(meta) {
  if (!meta) return null;
  const positionMatch = meta.match(/^(\d+)\s*,/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    return Number.isNaN(position) ? null : position;
  }
  return null;
}

function extractPlayersFromCell($, cell, baseUrl = 'https://tvm.liga.nu') {
  const players = [];
  const $cell = $(cell);
  const cellText = normaliseText($cell.text());
  
  const foundLinks = [];
  $cell.find('a').each((_, anchor) => {
    const $anchor = $(anchor);
    const rawLabel = normaliseText($anchor.text());
    if (!rawLabel) return;
    foundLinks.push({ $anchor, rawLabel });
  });
  
  if (foundLinks.length > 0) {
    foundLinks.forEach(({ $anchor, rawLabel }) => {
      const nameMatch = rawLabel.match(/^(.+?)(?:\s*\((.+)\))?$/);
      let name = nameMatch ? nameMatch[1].trim() : rawLabel;
      
      // Konvertiere "Nachname, Vorname" zu "Vorname Nachname"
      const commaMatch = name.match(/^(.+?),\s*(.+)$/);
      if (commaMatch) {
        name = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
      }
      
      const meta = nameMatch && nameMatch[2] ? nameMatch[2].trim() : null;
      const href = $anchor.attr('href') || '';
      const position = extractPositionFromMeta(meta);
      const lk = extractLkValue(meta, rawLabel);
      
      players.push({
        name,
        raw: rawLabel,
        meta,
        lk,
        position,
        profileUrl: href ? (href.startsWith('http') ? href : `${baseUrl}${href}`) : null
      });
    });
  }
  
  return players;
}

async function analyzeMeetingReport(meetingIdOrUrl) {
  console.log('🔍 Analysiere Meeting Report...\n');
  
  // Bestimme URL
  let url;
  if (meetingIdOrUrl.startsWith('http')) {
    url = meetingIdOrUrl;
  } else {
    url = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?meeting=${encodeURIComponent(meetingIdOrUrl)}&federation=TVM`;
  }
  
  console.log(`📥 Lade: ${url}\n`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extrahiere Header-Informationen
    const headerLines = [];
    const $heading = $('h1').first();
    if ($heading.length) {
      const parts = [];
      $heading.contents().each((_, node) => {
        if (node.type === 'text') {
          parts.push(normaliseText($(node).text()));
        } else if (node.type === 'tag' && node.name === 'br') {
          parts.push('\n');
        } else {
          parts.push(normaliseText($(node).text()));
        }
      });
      headerLines.push(
        ...parts
          .join('')
          .split('\n')
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
    }
    
    const metadata = {
      leagueLabel: headerLines[0] || null,
      homeTeam: null,
      awayTeam: null,
      finalScore: null,
      matchDateLabel: null,
      completedOn: normaliseText($('h2').first().text()) || null,
      referee: null
    };
    
    if (headerLines.length >= 2) {
      const line = headerLines[1].replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
      const scoreMatch = line.match(/-\s*([0-9]+:[0-9]+)[,]?/);
      if (scoreMatch) {
        metadata.finalScore = scoreMatch[1];
      }
      const [teamsPart] = line.split('-');
      if (teamsPart && teamsPart.includes(':')) {
        const [home, away] = teamsPart.split(':').map((entry) => entry.trim());
        metadata.homeTeam = home || null;
        metadata.awayTeam = away || null;
      }
    }
    
    if (headerLines.length >= 3) {
      metadata.matchDateLabel = headerLines[2] || null;
    }
    
    const refereeMatch = normaliseText($('p:contains("Oberschiedsrichter")').first().text());
    if (refereeMatch) {
      metadata.referee = refereeMatch.replace(/^Oberschiedsrichter:\s*/i, '').trim() || null;
    }
    
    console.log('📋 METADATA:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('');
    
    // Extrahiere Matches
    const $table = $('table.result-set').first();
    if (!$table.length) {
      console.error('❌ Keine Ergebnis-Tabelle gefunden!');
      return;
    }
    
    const singles = [];
    const doubles = [];
    let currentSection = null;
    
    $table.find('tr').each((_, row) => {
      const $row = $(row);
      if ($row.find('td').length === 1) {
        const label = normaliseText($row.text());
        if (/einzel/i.test(label)) {
          currentSection = 'singles';
          console.log(`\n🎾 EINZEL-Sektion gefunden\n`);
        } else if (/doppel/i.test(label)) {
          currentSection = 'doubles';
          console.log(`\n🎾 DOPPEL-Sektion gefunden\n`);
        }
        return;
      }
      
      if ($row.find('th').length) {
        return; // Header-Zeile
      }
      
      const cells = $row.find('td').toArray();
      if (!cells.length) return;
      
      // Einzel
      if (currentSection === 'singles' && cells.length === 10) {
        const numbers = {
          home: normaliseText($(cells[0]).text()),
          away: normaliseText($(cells[2]).text())
        };
        
        const homePlayers = extractPlayersFromCell($, cells[1]);
        const awayPlayers = extractPlayersFromCell($, cells[3]);
        
        const set1 = normaliseText($(cells[4]).text());
        const set2 = normaliseText($(cells[5]).text());
        const set3 = normaliseText($(cells[6]).text());
        const matchPoints = normaliseText($(cells[7]).text());
        const sets = normaliseText($(cells[8]).text());
        const games = normaliseText($(cells[9]).text());
        
        const match = {
          matchNumber: numbers.home || numbers.away,
          homePlayers,
          awayPlayers,
          scores: {
            set1,
            set2,
            set3,
            matchPoints,
            sets,
            games
          }
        };
        
        singles.push(match);
        
        console.log(`📊 EINZEL Match #${match.matchNumber}:`);
        console.log(`   Home: ${homePlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'}, Pos: ${p.position || 'keine'})`).join(', ')}`);
        console.log(`   Away: ${awayPlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'}, Pos: ${p.position || 'keine'})`).join(', ')}`);
        console.log(`   Scores: ${set1} / ${set2} / ${set3} | MP: ${matchPoints} | Sets: ${sets} | Games: ${games}`);
        console.log('');
      }
      
      // Doppel
      if (currentSection === 'doubles' && cells.length === 12) {
        const homeSlotRaw = normaliseText($(cells[0]).text());
        const awaySlotRaw = normaliseText($(cells[3]).text());
        
        const homePlayers = extractPlayersFromCell($, cells[2]);
        const awayPlayers = extractPlayersFromCell($, cells[5]);
        
        const set1 = normaliseText($(cells[6]).text());
        const set2 = normaliseText($(cells[7]).text());
        const set3 = normaliseText($(cells[8]).text());
        const matchPoints = normaliseText($(cells[9]).text());
        const sets = normaliseText($(cells[10]).text());
        const games = normaliseText($(cells[11]).text());
        
        const match = {
          matchNumber: homeSlotRaw || awaySlotRaw,
          homePlayers,
          awayPlayers,
          scores: {
            set1,
            set2,
            set3,
            matchPoints,
            sets,
            games
          }
        };
        
        doubles.push(match);
        
        console.log(`📊 DOPPEL Match #${match.matchNumber}:`);
        console.log(`   Home: ${homePlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'}, Pos: ${p.position || 'keine'})`).join(', ')}`);
        console.log(`   Away: ${awayPlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'}, Pos: ${p.position || 'keine'})`).join(', ')}`);
        console.log(`   Scores: ${set1} / ${set2} / ${set3} | MP: ${matchPoints} | Sets: ${sets} | Games: ${games}`);
        console.log('');
      }
    });
    
    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log('='.repeat(80));
    console.log(`\n✅ Metadata:`);
    console.log(`   Liga: ${metadata.leagueLabel}`);
    console.log(`   Teams: ${metadata.homeTeam} vs ${metadata.awayTeam}`);
    console.log(`   Ergebnis: ${metadata.finalScore || 'keine'}`);
    console.log(`   Datum: ${metadata.matchDateLabel || 'keine'}`);
    console.log(`   Abgeschlossen: ${metadata.completedOn || 'keine'}`);
    console.log(`   Schiedsrichter: ${metadata.referee || 'keine'}`);
    
    console.log(`\n✅ Einzel-Matches: ${singles.length}`);
    singles.forEach((match, idx) => {
      console.log(`   ${idx + 1}. Match #${match.matchNumber}:`);
      console.log(`      Home: ${match.homePlayers[0]?.name || 'unbekannt'} (LK: ${match.homePlayers[0]?.lk || 'keine'}, Pos: ${match.homePlayers[0]?.position || 'keine'})`);
      console.log(`      Away: ${match.awayPlayers[0]?.name || 'unbekannt'} (LK: ${match.awayPlayers[0]?.lk || 'keine'}, Pos: ${match.awayPlayers[0]?.position || 'keine'})`);
    });
    
    console.log(`\n✅ Doppel-Matches: ${doubles.length}`);
    doubles.forEach((match, idx) => {
      console.log(`   ${idx + 1}. Match #${match.matchNumber}:`);
      console.log(`      Home: ${match.homePlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'})`).join(', ')}`);
      console.log(`      Away: ${match.awayPlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'})`).join(', ')}`);
    });
    
    console.log(`\n✅ Gesamt: ${singles.length} Einzel + ${doubles.length} Doppel = ${singles.length + doubles.length} Matches`);
    
    // JSON-Export
    console.log('\n' + '='.repeat(80));
    console.log('📄 JSON-Export:');
    console.log('='.repeat(80));
    console.log(JSON.stringify({
      metadata,
      singles,
      doubles,
      totals: {
        singles: singles.length,
        doubles: doubles.length,
        total: singles.length + doubles.length
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

// Main
const meetingIdOrUrl = process.argv[2];
if (!meetingIdOrUrl) {
  console.error('❌ Fehler: Meeting-ID oder URL erforderlich!');
  console.error('Usage: node scripts/debug-meeting-report.mjs <meetingId|meetingUrl>');
  console.error('Beispiel: node scripts/debug-meeting-report.mjs 12500213');
  process.exit(1);
}

analyzeMeetingReport(meetingIdOrUrl).then(() => {
  console.log('\n✅ Analyse abgeschlossen');
  process.exit(0);
});

