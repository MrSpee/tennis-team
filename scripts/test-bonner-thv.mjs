/**
 * Test für Bonner THV
 */

const testClubName = 'Bonner THV';

async function searchClubOnNuLiga(clubName) {
  try {
    console.log(`🔍 Suche nach Verein: "${clubName}"`);
    
    const searchUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch';
    
    const formData = new URLSearchParams();
    formData.append('searchFor', clubName);
    formData.append('federation', 'TVM');
    formData.append('region', 'DE.WE.TVM');
    formData.append('showSearchForm', '1');
    formData.append('clubSearch', 'Suchen');
    formData.append('WOSubmitAction', 'clubSearch');
    
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
    
    const finalUrl = response.url;
    console.log(`📍 Finale URL: ${finalUrl}`);
    
    let clubNumber = null;
    const clubNumberMatch = finalUrl.match(/[?&]club=(\d+)/);
    if (clubNumberMatch) {
      clubNumber = clubNumberMatch[1];
      console.log(`✅ Club-Nummer aus URL: ${clubNumber}`);
    }
    
    const html = await response.text();
    
    if (!clubNumber) {
      const clubLinkPattern = /club(?:Pools|Portrait|InfoDisplay|Meetings|Teams)\?club=(\d+)/gi;
      const clubLinks = [...html.matchAll(clubLinkPattern)];
      const directClubPattern = /[?&]club=(\d+)/gi;
      const directClubs = [...html.matchAll(directClubPattern)];
      
      const allClubNumbers = new Set();
      clubLinks.forEach(match => allClubNumbers.add(match[1]));
      directClubs.forEach(match => allClubNumbers.add(match[1]));
      
      if (allClubNumbers.size > 0) {
        clubNumber = Array.from(allClubNumbers)[0];
        console.log(`✅ Club-Nummer in HTML gefunden: ${clubNumber}`);
      }
    }
    
    if (!clubNumber) {
      console.log(`❌ Keine Club-Nummer gefunden`);
      return null;
    }
    
    let foundClubName = null;
    const h1Match = html.match(/<h1[^>]*>([^<]+)(?:<br[^>]*>)?/i);
    if (h1Match) {
      foundClubName = h1Match[1].trim();
    }
    
    if (!foundClubName) {
      const titleMatch = html.match(/<div[^>]*id=["']title["'][^>]*>([^<]+)<\/div>/i);
      if (titleMatch) {
        foundClubName = titleMatch[1].trim();
      }
    }
    
    console.log(`✅ Vereinsname gefunden: "${foundClubName || clubName}"`);
    
    return {
      clubNumber,
      clubName: foundClubName || clubName,
      matchScore: foundClubName ? 0.9 : 0.8
    };
    
  } catch (error) {
    console.error(`❌ Fehler:`, error);
    throw error;
  }
}

// Test
(async () => {
  try {
    const result = await searchClubOnNuLiga(testClubName);
    console.log(`\n✅ Ergebnis:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`❌ Test fehlgeschlagen:`, error);
  }
})();

