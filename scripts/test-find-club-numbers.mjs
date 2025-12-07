/**
 * Test-Script für die find-club-numbers API-Route
 * Testet die Suche nach Club-Nummern auf der nuLiga Vereinssuche-Seite
 */

const testClubName = 'VKC Köln'; // Test-Verein

console.log(`🔍 Teste Club-Nummern-Suche für: "${testClubName}"\n`);

// Test 1: Direkte Suche auf nuLiga
async function testNuLigaSearch() {
  try {
    const searchUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch';
    
    // Form-Daten für POST-Request
    const formData = new URLSearchParams();
    formData.append('searchFor', testClubName);
    formData.append('federation', 'TVM');
    formData.append('region', 'DE.WE.TVM');
    formData.append('showSearchForm', '1');
    formData.append('clubSearch', 'Suchen');
    formData.append('WOSubmitAction', 'clubSearch');
    
    console.log(`📡 POST Request an: ${searchUrl}`);
    console.log(`📋 Suchbegriff: "${testClubName}"\n`);
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch?federation=TVM&showSearchForm=1'
      },
      body: formData.toString(),
      redirect: 'follow' // WICHTIG: Folge Redirects
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // ✅ WICHTIG: Extrahiere Club-Nummer aus der finalen URL (nach Redirect)
    const finalUrl = response.url;
    console.log(`✅ Response erhalten`);
    console.log(`📍 Finale URL nach Redirect: ${finalUrl}\n`);
    
    // Extrahiere Club-Nummer aus der URL
    const clubNumberMatch = finalUrl.match(/[?&]club=(\d+)/);
    const clubNumber = clubNumberMatch ? clubNumberMatch[1] : null;
    
    if (clubNumber) {
      console.log(`✅ Club-Nummer aus URL extrahiert: ${clubNumber}\n`);
    } else {
      console.log(`⚠️ Keine Club-Nummer in URL gefunden, suche in HTML...\n`);
    }
    
    const html = await response.text();
    console.log(`✅ HTML geladen (${html.length} Zeichen)\n`);
    
    // Extrahiere Vereinsnamen aus HTML
    let foundClubName = null;
    
    // Pattern 1: <h1>Vereinsname<br />Vereinsinfo</h1>
    const h1Match = html.match(/<h1[^>]*>([^<]+)(?:<br[^>]*>)?/i);
    if (h1Match) {
      foundClubName = h1Match[1].trim();
      console.log(`✅ Vereinsname gefunden (h1): "${foundClubName}"\n`);
    }
    
    // Pattern 2: <div id="title">Vereinsname</div>
    if (!foundClubName) {
      const titleMatch = html.match(/<div[^>]*id=["']title["'][^>]*>([^<]+)<\/div>/i);
      if (titleMatch) {
        foundClubName = titleMatch[1].trim();
        console.log(`✅ Vereinsname gefunden (div#title): "${foundClubName}"\n`);
      }
    }
    
    // Fallback: Suche in HTML nach Club-Nummern
    if (!clubNumber) {
      const clubLinkPattern = /club(?:Pools|Portrait|InfoDisplay|Meetings|Teams)\?club=(\d+)/gi;
      const clubLinks = [...html.matchAll(clubLinkPattern)];
      const directClubPattern = /[?&]club=(\d+)/gi;
      const directClubs = [...html.matchAll(directClubPattern)];
      
      const allClubNumbers = new Set();
      clubLinks.forEach(match => allClubNumbers.add(match[1]));
      directClubs.forEach(match => allClubNumbers.add(match[1]));
      
      if (allClubNumbers.size > 0) {
        const foundClubNumber = Array.from(allClubNumbers)[0];
        console.log(`✅ Club-Nummer in HTML gefunden: ${foundClubNumber}\n`);
      }
    }
    
    // Speichere HTML für manuelle Analyse
    const fs = await import('fs');
    fs.writeFileSync('test-club-search-output.html', html);
    console.log(`💾 HTML gespeichert in: test-club-search-output.html`);
    
    // Zusammenfassung
    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   Club-Nummer: ${clubNumber || 'Nicht gefunden'}`);
    console.log(`   Vereinsname: ${foundClubName || 'Nicht gefunden'}`);
    console.log(`   Suchbegriff: "${testClubName}"`);
    
  } catch (error) {
    console.error(`❌ Fehler:`, error);
  }
}

// Test 2: API-Route testen
async function testAPIRoute() {
  try {
    console.log(`\n🧪 Teste API-Route: /api/import/find-club-numbers\n`);
    
    const response = await fetch('http://localhost:3001/api/import/find-club-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubIds: null, // Alle Vereine
        maxClubs: 1, // Nur 1 Verein zum Testen
        dryRun: true // Dry Run
      })
    });
    
    const responseText = await response.text();
    console.log(`📡 Response Status: ${response.status}`);
    console.log(`📡 Response Text (erste 500 Zeichen):`);
    console.log(responseText.substring(0, 500));
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log(`\n✅ API-Route erfolgreich!`);
      console.log(`   Summary:`, result.summary);
      if (result.results && result.results.length > 0) {
        console.log(`\n   Ergebnisse:`);
        result.results.forEach((r, idx) => {
          console.log(`   ${idx + 1}. ${r.clubName}: ${r.status} - ${r.message}`);
          if (r.clubNumber) {
            console.log(`      Club-Nummer: ${r.clubNumber}`);
          }
        });
      }
    } else {
      console.log(`\n❌ API-Route Fehler`);
    }
    
  } catch (error) {
    console.error(`❌ Fehler beim Testen der API-Route:`, error);
  }
}

// Führe Tests aus
(async () => {
  console.log('='.repeat(60));
  console.log('TEST 1: Direkte nuLiga Suche');
  console.log('='.repeat(60));
  await testNuLigaSearch();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: API-Route');
  console.log('='.repeat(60));
  await testAPIRoute();
  
  console.log('\n✅ Tests abgeschlossen!');
})();

