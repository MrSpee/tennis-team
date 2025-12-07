#!/usr/bin/env node
/**
 * Debug-Script: Analysiert die HTML-Struktur der clubPools-Seite für Meldelisten
 */

const teamUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Damen+30';

async function debugParsing() {
  console.log('🔍 Lade HTML für Damen 30...');
  const response = await fetch(teamUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}`);
    return;
  }
  
  const html = await response.text();
  console.log('✅ HTML geladen, Länge:', html.length);
  
  // Finde Tabelle mit result-set class
  const tableMatch = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log('❌ Keine Tabelle mit class="result-set" gefunden');
    
    // Versuche andere Tabellen
    const allTables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    console.log(`📊 Gefundene Tabellen: ${allTables?.length || 0}`);
    
    // Suche nach "Spieler" Überschrift
    const spielerIndex = html.indexOf('<h2>Spieler');
    if (spielerIndex !== -1) {
      console.log('✅ "Spieler" Überschrift gefunden bei Index:', spielerIndex);
      const section = html.substring(spielerIndex, spielerIndex + 10000);
      const sectionTable = section.match(/<table[^>]*>[\s\S]*?<\/table>/i);
      if (sectionTable) {
        console.log('✅ Tabelle nach "Spieler" gefunden, Länge:', sectionTable[0].length);
        analyzeTable(sectionTable[0]);
      }
    }
    return;
  }
  
  const tableHtml = tableMatch[0];
  console.log('✅ Tabelle gefunden, Länge:', tableHtml.length);
  analyzeTable(tableHtml);
}

function analyzeTable(tableHtml) {
  // Finde alle <tr> Zeilen
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  console.log('📊 Zeilen gefunden:', rows?.length || 0);
  
  if (!rows || rows.length === 0) {
    console.log('❌ Keine Zeilen gefunden');
    return;
  }
  
  // Finde Header-Zeile
  const headerRow = rows.find(r => r.includes('<th>'));
  if (headerRow) {
    console.log('\n📋 Header-Zeile:');
    const ths = headerRow.match(/<th[^>]*>[\s\S]*?<\/th>/gi);
    if (ths) {
      ths.forEach((th, idx) => {
        const content = th.replace(/<[^>]+>/g, '').trim();
        console.log(`  ${idx + 1}. "${content}"`);
      });
    }
  }
  
  // Finde erste Datenzeile (nicht Header)
  const dataRows = rows.filter(r => !r.includes('<th>'));
  console.log(`\n📊 Datenzeilen: ${dataRows.length}`);
  
  if (dataRows.length > 0) {
    console.log('\n✅ Erste Datenzeile:');
    const firstRow = dataRows[0];
    console.log(firstRow.substring(0, 2000));
    
    // Extrahiere einzelne <td> Elemente
    const tds = firstRow.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    console.log(`\n📋 Anzahl <td> Elemente: ${tds?.length || 0}`);
    if (tds) {
      tds.forEach((td, idx) => {
        // Entferne HTML-Tags, aber behalte Text
        const content = td.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`  ${idx + 1}. "${content.substring(0, 100)}"`);
      });
    }
    
    // Versuche Pattern-Matching
    console.log('\n🔍 Pattern-Tests:');
    
    // Pattern 1: Aktuelles Pattern
    const pattern1 = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:\((\d{4})\))?[\s\S]*?<\/td>/gi;
    const match1 = pattern1.exec(firstRow);
    if (match1) {
      console.log('  ✅ Pattern 1 gefunden:', {
        rank: match1[1],
        mannschaft: match1[2],
        lk: match1[3],
        tvmId: match1[4],
        name: match1[5],
        birthYear: match1[6]
      });
    } else {
      console.log('  ❌ Pattern 1 hat keine Matches');
    }
  }
}

debugParsing().catch(console.error);

