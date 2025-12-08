/**
 * Test: Finde Club-Nummer für "TC GW Grossrotter Hof"
 */

const clubName = 'TC GW Grossrotter Hof';

const formData = new URLSearchParams();
formData.append('searchFor', clubName);
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
const finalUrl = response.url;

console.log(`📍 Finale URL: ${finalUrl}`);
console.log(`📄 HTML-Länge: ${html.length} Zeichen\n`);

// Prüfe ob "Keine Treffer"
if (html.includes('Keine Treffer')) {
  console.log('❌ "Keine Treffer" gefunden');
  
  // Teste alternative Suchbegriffe
  const alternatives = [
    'TC GW Grossrotter Hof',
    'GW Grossrotter Hof',
    'Grossrotter Hof',
    'Grossrotter',
    'GW Grossrotter'
  ];
  
  console.log('\n🔍 Teste alternative Suchbegriffe:\n');
  
  for (const alt of alternatives) {
    const altFormData = new URLSearchParams();
    altFormData.append('searchFor', alt);
    altFormData.append('federation', 'TVM');
    altFormData.append('region', 'DE.WE.TVM');
    altFormData.append('showSearchForm', '1');
    altFormData.append('clubSearch', 'Suchen');
    altFormData.append('WOSubmitAction', 'clubSearch');
    
    const altResponse = await fetch('https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubSearch?federation=TVM&showSearchForm=1'
      },
      body: altFormData.toString(),
      redirect: 'follow'
    });
    
    const altHtml = await altResponse.text();
    
    if (!altHtml.includes('Keine Treffer')) {
      console.log(`✅ "${alt}" - Treffer gefunden!`);
      
      // Suche nach Club-Nummern
      const clubLinkPattern = /club(?:InfoDisplay|Pools|Portrait|Meetings|Teams)\?club=(\d+)/gi;
      const matches = [...altHtml.matchAll(clubLinkPattern)];
      const clubNumbers = [...new Set(matches.map(m => m[1]))];
      
      if (clubNumbers.length > 0) {
        console.log(`   Club-Nummern: ${clubNumbers.join(', ')}`);
      }
      
      // Zeige Kontext
      const clubIndex = altHtml.indexOf('Grossrotter');
      if (clubIndex !== -1) {
        const context = altHtml.substring(Math.max(0, clubIndex - 300), Math.min(altHtml.length, clubIndex + 500));
        console.log(`   Kontext: ${context.substring(0, 200)}...`);
      }
    } else {
      console.log(`❌ "${alt}" - Keine Treffer`);
    }
    
    // Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
} else {
  console.log('✅ Treffer gefunden!');
  
  // Suche nach Club-Nummern
  const clubLinkPattern = /club(?:InfoDisplay|Pools|Portrait|Meetings|Teams)\?club=(\d+)/gi;
  const matches = [...html.matchAll(clubLinkPattern)];
  const clubNumbers = [...new Set(matches.map(m => m[1]))];
  
  if (clubNumbers.length > 0) {
    console.log(`\n✅ Club-Nummern gefunden: ${clubNumbers.join(', ')}`);
  } else {
    console.log('\n⚠️ Keine Club-Nummern in Links gefunden');
  }
  
  // Zeige Kontext um "Grossrotter"
  const grossrotterIndex = html.indexOf('Grossrotter');
  if (grossrotterIndex !== -1) {
    const context = html.substring(Math.max(0, grossrotterIndex - 500), Math.min(html.length, grossrotterIndex + 1000));
    console.log('\n📋 Kontext um "Grossrotter":');
    console.log(context);
  }
}


