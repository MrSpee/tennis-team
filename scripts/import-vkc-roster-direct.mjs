#!/usr/bin/env node

/**
 * Importiert Meldeliste für VKC Köln 1 direkt (ohne API-Route)
 */

const TEAM_PORTRAIT_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43';
const TEAM_ID = '1aac84b3-d911-471e-9b6f-1f60f0afdf62';
const SEASON = 'Winter 2025/26';

async function importRoster() {
  console.log('🚀 Importiere Meldeliste für VKC Köln 1');
  console.log('='.repeat(80));
  console.log(`URL: ${TEAM_PORTRAIT_URL}`);
  console.log(`Team-ID: ${TEAM_ID}`);
  console.log(`Saison: ${SEASON}\n`);
  
  try {
    // Lade HTML
    console.log('1️⃣ Lade HTML von nuLiga...');
    const response = await fetch(TEAM_PORTRAIT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`✅ HTML geladen: ${html.length} Zeichen\n`);
    
    // Parse HTML
    console.log('2️⃣ Parse HTML...');
    
    // Finde Spieler-Tabelle: Suche nach allen Tabellen und finde die mit Spielerdaten
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
    
    if (!allTables) {
      throw new Error('Keine Tabellen gefunden');
    }
    
    // Finde die Spieler-Tabelle (hat Spieler-Links, LK, lange Zahlen)
    let table = null;
    for (const t of allTables) {
      const hasPlayerLinks = t.match(/<a[^>]*>([A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+)/gi);
      const hasLK = t.match(/LK[\d,\.]+/gi);
      const hasLongNumbers = t.match(/\d{7,}/g);
      const hasRank = t.match(/<td[^>]*>\s*\d{1,2}\s*<\/td>/);
      
      if (hasPlayerLinks && hasLK && hasLongNumbers && hasRank) {
        table = t;
        break;
      }
    }
    
    if (!table) {
      throw new Error('Spieler-Tabelle nicht gefunden');
    }
    console.log('✅ Spieler-Tabelle gefunden\n');
    
    // Parse Spieler
    const roster = [];
    const pattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>(LK[\d,\.]+)<\/td>\s*<td[^>]*>(\d{7,})(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:<\/div>[\s\S]*?\((\d{4})\))?/gi;
    
    let match;
    while ((match = pattern.exec(table)) !== null) {
      const rank = parseInt(match[1], 10);
      const lk = match[3].trim();
      const tvmId = match[4].trim();
      const name = match[5].trim();
      
      // Geburtsjahr extrahieren
      let birthYear = match[6] ? parseInt(match[6], 10) : null;
      if (!birthYear) {
        const rowEnd = table.indexOf('</tr>', match.index);
        const rowContent = table.substring(match.index, rowEnd);
        const birthMatch = rowContent.match(/\((\d{4})\)/);
        if (birthMatch) {
          birthYear = parseInt(birthMatch[1], 10);
        }
      }
      
      roster.push({
        rank,
        name,
        lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
        tvmId,
        birthYear
      });
    }
    
    console.log(`✅ ${roster.length} Spieler geparst\n`);
    
    if (roster.length > 0) {
      console.log('📋 Erste 5 Spieler:');
      roster.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. Rang ${p.rank}: ${p.name} (${p.lk}, TVM-ID: ${p.tvmId}, Geburtsjahr: ${p.birthYear || 'N/A'})`);
      });
    }
    
    console.log('\n✅ Parsing erfolgreich!');
    console.log('\n📋 Nächster Schritt:');
    console.log('   → Importiere über API-Route oder direkt in DB');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

importRoster();

