/**
 * Teste alternative Suchbegriffe für TC Köln Worringen
 */

const searchTerms = [
  'TC Köln Worringen',
  'TC Worringen',
  'Worringen',
  'Köln Worringen',
  'Tennisclub Worringen'
];

async function testSearch(term) {
  const formData = new URLSearchParams();
  formData.append('searchFor', term);
  formData.append('federation', 'TVM');
  formData.append('region', 'DE.WE.TVM');
  formData.append('showSearchForm', '1');
  formData.append('clubSearch', 'Suchen');
  formData.append('WOSubmitAction', 'clubSearch');
  
  const response = await fetch('https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch?federation=TVM&showSearchForm=1'
    },
    body: formData.toString(),
    redirect: 'follow'
  });
  
  const html = await response.text();
  
  // Prüfe ob "Keine Treffer" vorhanden ist
  if (html.includes('Keine Treffer')) {
    return { term, found: false, message: 'Keine Treffer' };
  }
  
  // Suche nach Club-Links
  const clubLinkPattern = /club(?:InfoDisplay|Pools|Portrait|Meetings|Teams)\?club=(\d+)/gi;
  const matches = [...html.matchAll(clubLinkPattern)];
  const clubNumbers = [...new Set(matches.map(m => m[1]))];
  
  if (clubNumbers.length > 0) {
    return { term, found: true, clubNumbers, count: clubNumbers.length };
  }
  
  return { term, found: false, message: 'Keine Club-Nummern gefunden' };
}

console.log('🧪 Teste alternative Suchbegriffe...\n');

for (const term of searchTerms) {
  console.log(`🔍 Teste: "${term}"`);
  const result = await testSearch(term);
  if (result.found) {
    console.log(`  ✅ Gefunden: ${result.count} Club(s) - Nummern: ${result.clubNumbers.join(', ')}`);
  } else {
    console.log(`  ❌ ${result.message}`);
  }
  console.log('');
  
  // Pause zwischen Requests
  await new Promise(resolve => setTimeout(resolve, 2000));
}


