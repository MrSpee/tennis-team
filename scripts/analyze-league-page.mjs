#!/usr/bin/env node

/**
 * Analysiert die leaguePage HTML-Struktur um Team-Portrait URLs zu finden
 */

const LEAGUE_PAGE_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3';

async function analyzeLeaguePage() {
  console.log('🔍 Analysiere League Page HTML-Struktur');
  console.log('='.repeat(80));
  
  try {
    const response = await fetch(LEAGUE_PAGE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Suche nach "TG GW" oder "Bocklemünd" im HTML
    console.log('1️⃣ Suche nach "TG GW" oder "Bocklemünd"...\n');
    
    const tgGwIndex = html.indexOf('TG GW');
    const bocklemundIndex = html.indexOf('Bocklemünd');
    
    if (tgGwIndex !== -1 || bocklemundIndex !== -1) {
      const startIndex = Math.min(
        tgGwIndex !== -1 ? tgGwIndex : Infinity,
        bocklemundIndex !== -1 ? bocklemundIndex : Infinity
      );
      
      const context = html.substring(Math.max(0, startIndex - 500), startIndex + 1000);
      console.log('Kontext um "TG GW" / "Bocklemünd":');
      console.log(context);
      console.log('\n');
      
      // Suche nach Links in diesem Kontext
      const linkMatches = context.match(/href="([^"]*)"/gi);
      if (linkMatches) {
        console.log('Links in diesem Kontext:');
        linkMatches.forEach((link, i) => {
          const hrefMatch = link.match(/href="([^"]*)"/);
          if (hrefMatch) {
            const fullUrl = hrefMatch[1].startsWith('http') 
              ? hrefMatch[1] 
              : `https://tvm.liga.nu${hrefMatch[1]}`;
            console.log(`${i + 1}. ${fullUrl}`);
          }
        });
      }
    } else {
      console.log('⚠️  "TG GW" oder "Bocklemünd" nicht im HTML gefunden');
    }
    
    // Suche nach allen Links die "team" Parameter enthalten
    console.log('\n2️⃣ Suche nach Links mit "team=" Parameter...\n');
    const teamLinks = html.match(/href="([^"]*team=\d+[^"]*)"/gi);
    if (teamLinks) {
      console.log(`✅ ${teamLinks.length} Links mit team= Parameter gefunden\n`);
      console.log('Erste 10 Links:');
      teamLinks.slice(0, 10).forEach((link, i) => {
        const hrefMatch = link.match(/href="([^"]*)"/);
        if (hrefMatch) {
          const fullUrl = hrefMatch[1].startsWith('http') 
            ? hrefMatch[1] 
            : `https://tvm.liga.nu${hrefMatch[1]}`;
          console.log(`${i + 1}. ${fullUrl}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

analyzeLeaguePage();

