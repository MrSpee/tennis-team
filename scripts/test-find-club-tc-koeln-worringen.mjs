/**
 * Test-Script: Finde Club-Nummer für "TC Köln Worringen"
 */

const searchClubOnNuLiga = async (clubName) => {
  try {
    console.log(`🔍 Suche nach Verein: "${clubName}"`);
    
    // URL für die Vereinssuche (POST-Request)
    const searchUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch';
    
    // Form-Daten für POST-Request
    const formData = new URLSearchParams();
    formData.append('searchFor', clubName);
    formData.append('federation', 'TVM');
    formData.append('region', 'DE.WE.TVM');
    formData.append('showSearchForm', '1');
    formData.append('clubSearch', 'Suchen');
    formData.append('WOSubmitAction', 'clubSearch');
    
    console.log('📤 Sende POST-Request...');
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch?federation=TVM&showSearchForm=1'
      },
      body: formData.toString(),
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // ✅ WICHTIG: Extrahiere Club-Nummer aus der finalen URL (nach Redirect)
    const finalUrl = response.url;
    console.log(`\n📍 Finale URL nach Redirect: ${finalUrl}`);
    
    // Extrahiere Club-Nummer aus der URL
    let clubNumber = null;
    const clubNumberMatch = finalUrl.match(/[?&]club=(\d+)/);
    if (clubNumberMatch) {
      clubNumber = clubNumberMatch[1];
      console.log(`✅ Club-Nummer aus URL extrahiert: ${clubNumber}`);
    }
    
    // Lade HTML für weitere Analyse
    const html = await response.text();
    console.log(`\n📄 HTML-Länge: ${html.length} Zeichen`);
    
    // Wenn keine Club-Nummer in URL, suche in HTML
    if (!clubNumber) {
      console.log(`\n⚠️ Keine Club-Nummer in URL, suche in HTML...`);
      
      // Suche nach verschiedenen Patterns
      const patterns = [
        /club(?:Pools|Portrait|InfoDisplay|Meetings|Teams)\?club=(\d+)/gi,
        /[?&]club=(\d+)/gi,
        /href=["'][^"']*club=(\d+)[^"']*["']/gi
      ];
      
      const allClubNumbers = new Set();
      patterns.forEach((pattern, idx) => {
        const matches = [...html.matchAll(pattern)];
        console.log(`\n🔍 Pattern ${idx + 1} gefunden: ${matches.length} Treffer`);
        matches.forEach(match => {
          allClubNumbers.add(match[1]);
          console.log(`  - Club-Nummer: ${match[1]}`);
        });
      });
      
      if (allClubNumbers.size > 0) {
        clubNumber = Array.from(allClubNumbers)[0];
        console.log(`\n✅ Club-Nummer in HTML gefunden: ${clubNumber}`);
      } else {
        console.log(`\n❌ Keine Club-Nummer in HTML gefunden`);
        
        // Zeige einen Ausschnitt des HTML, um zu sehen, was zurückkommt
        console.log(`\n📋 HTML-Ausschnitt (erste 2000 Zeichen):`);
        console.log(html.substring(0, 2000));
        
        // Suche nach typischen nuLiga-Strukturen
        if (html.includes('clubSearch')) {
          console.log(`\n⚠️ Es scheint, dass wir auf einer Suchergebnis-Seite gelandet sind, nicht auf einer Club-Detail-Seite`);
        }
        
        // Suche nach Links in der HTML
        const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi);
        if (linkMatches) {
          console.log(`\n🔗 Gefundene Links (erste 10):`);
          linkMatches.slice(0, 10).forEach((link, idx) => {
            console.log(`  ${idx + 1}. ${link.substring(0, 150)}`);
          });
        }
      }
    }
    
    // Extrahiere Vereinsnamen aus HTML
    let foundClubName = null;
    
    const namePatterns = [
      /<h1[^>]*>([^<]+)(?:<br[^>]*>)?/i,
      /<div[^>]*id=["']title["'][^>]*>([^<]+)<\/div>/i,
      /<title[^>]*>.*?([A-ZÄÖÜ][^<&]+?)(?:\s*&ndash;|\s*–|<\/title>)/i
    ];
    
    namePatterns.forEach((pattern, idx) => {
      const match = html.match(pattern);
      if (match && !foundClubName) {
        foundClubName = match[1].trim();
        console.log(`\n✅ Vereinsname gefunden (Pattern ${idx + 1}): ${foundClubName}`);
      }
    });
    
    if (!foundClubName) {
      console.log(`\n⚠️ Kein Vereinsname gefunden`);
    }
    
    return {
      clubNumber,
      clubName: foundClubName || clubName,
      finalUrl,
      htmlLength: html.length
    };
    
  } catch (error) {
    console.error(`❌ Fehler beim Suchen nach "${clubName}":`, error);
    throw error;
  }
};

// Test
(async () => {
  try {
    console.log('🧪 Test: Suche nach "TC Köln Worringen"\n');
    const result = await searchClubOnNuLiga('TC Köln Worringen');
    console.log('\n📊 Ergebnis:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  }
})();


