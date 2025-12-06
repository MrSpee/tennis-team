#!/usr/bin/env node

/**
 * Findet Team-Portrait URL für TG GW im DJK Bocklemünd 1
 */

const LEAGUE_PAGE_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3';

async function findTeamPortraitUrl() {
  console.log('🔍 Suche Team-Portrait URL für TG GW im DJK Bocklemünd 1');
  console.log('='.repeat(80));
  console.log(`League Page URL: ${LEAGUE_PAGE_URL}\n`);
  
  try {
    // Lade HTML
    console.log('1️⃣ Lade HTML von nuLiga League Page...');
    const response = await fetch(LEAGUE_PAGE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`✅ HTML geladen: ${html.length} Zeichen\n`);
    
    // Suche nach Links zu Team-Portrait Seiten für "TG GW im DJK Bocklemünd"
    console.log('2️⃣ Suche nach Team-Portrait Links...');
    
    // Suche nach Links die "teamPortrait" enthalten und "Bocklemünd" oder "TG GW" im Text haben
    const teamPortraitLinks = html.match(/<a[^>]*href="([^"]*teamPortrait[^"]*)"[^>]*>[\s\S]*?(?:TG GW|Bocklemünd)[\s\S]*?<\/a>/gi);
    
    if (teamPortraitLinks) {
      console.log(`✅ ${teamPortraitLinks.length} mögliche Links gefunden\n`);
      teamPortraitLinks.forEach((link, i) => {
        const hrefMatch = link.match(/href="([^"]*)"/);
        if (hrefMatch) {
          const fullUrl = hrefMatch[1].startsWith('http') 
            ? hrefMatch[1] 
            : `https://tvm.liga.nu${hrefMatch[1]}`;
          console.log(`${i + 1}. ${fullUrl}`);
        }
      });
    } else {
      console.log('⚠️  Keine direkten Links gefunden, suche nach allen teamPortrait Links...\n');
      
      // Suche nach allen teamPortrait Links
      const allTeamPortraitLinks = html.match(/href="([^"]*teamPortrait[^"]*)"/gi);
      if (allTeamPortraitLinks) {
        console.log(`✅ ${allTeamPortraitLinks.length} teamPortrait Links gefunden\n`);
        
        // Extrahiere alle URLs
        const urls = [];
        allTeamPortraitLinks.forEach((link) => {
          const hrefMatch = link.match(/href="([^"]*)"/);
          if (hrefMatch) {
            const fullUrl = hrefMatch[1].startsWith('http') 
              ? hrefMatch[1] 
              : `https://tvm.liga.nu${hrefMatch[1]}`;
            urls.push(fullUrl);
          }
        });
        
        // Suche nach Links die "Bocklemünd" oder "TG GW" enthalten
        console.log('Suche nach Links mit "Bocklemünd" oder "TG GW"...\n');
        const relevantLinks = urls.filter(url => {
          // Lade die URL und prüfe ob sie zu TG GW gehört
          return url.includes('group=43'); // Gruppe 043
        });
        
        if (relevantLinks.length > 0) {
          console.log(`✅ ${relevantLinks.length} relevante Links gefunden (Gruppe 43):\n`);
          relevantLinks.forEach((url, i) => {
            console.log(`${i + 1}. ${url}`);
          });
        } else {
          console.log('⚠️  Keine Links mit Gruppe 43 gefunden\n');
          console.log('Alle teamPortrait Links (erste 20):');
          urls.slice(0, 20).forEach((url, i) => {
            console.log(`${i + 1}. ${url}`);
          });
        }
      } else {
        console.log('❌ Keine teamPortrait Links gefunden');
      }
    }
    
    console.log('\n📋 Nächster Schritt:');
    console.log('   → Prüfe die Links manuell oder scrape die Team-Portrait-Seite');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

findTeamPortraitUrl();

