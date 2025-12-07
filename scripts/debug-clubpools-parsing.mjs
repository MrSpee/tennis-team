#!/usr/bin/env node
/**
 * Debug-Script: Analysiert die HTML-Struktur der clubPools-Seite
 */

const teamUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Herren+40';

async function debugParsing() {
  console.log('🔍 Lade HTML...');
  const response = await fetch(teamUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const html = await response.text();
  
  // Finde Tabelle
  const tableMatch = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log('❌ Keine Tabelle gefunden');
    return;
  }
  
  const tableHtml = tableMatch[0];
  console.log('✅ Tabelle gefunden, Länge:', tableHtml.length);
  
  // Finde alle <tr> Zeilen
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  console.log('📊 Zeilen gefunden:', rows?.length || 0);
  
  // Finde erste Datenzeile (nicht Header)
  for (let i = 0; i < Math.min(rows?.length || 0, 10); i++) {
    const row = rows[i];
    if (row.includes('<th>')) continue; // Skip Header
    
    if (row.includes('Meuser') || row.includes('17104633')) {
      console.log(`\n✅ Beispiel-Zeile ${i}:`);
      console.log(row.substring(0, 1000));
      
      // Extrahiere einzelne <td> Elemente
      const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
      console.log(`\n📋 Anzahl <td> Elemente: ${tds?.length || 0}`);
      if (tds) {
        tds.forEach((td, idx) => {
          const content = td.replace(/<[^>]+>/g, '').trim();
          if (content) {
            console.log(`  ${idx + 1}. ${content.substring(0, 50)}`);
          }
        });
      }
      break;
    }
  }
}

debugParsing().catch(console.error);

