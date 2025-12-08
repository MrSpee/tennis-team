/**
 * Analysiere die HTML-Struktur der Club-Suche
 */

const clubName = 'TC Köln Worringen';

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

// Suche nach Tabellen oder Listen mit Club-Ergebnissen
console.log('🔍 Suche nach Tabellen...');
const tableMatches = html.match(/<table[^>]*>[\s\S]{0,5000}?<\/table>/gi);
if (tableMatches) {
  console.log(`✅ ${tableMatches.length} Tabellen gefunden`);
  tableMatches.forEach((table, idx) => {
    if (table.includes('club') || table.includes('Worringen') || table.includes('Köln')) {
      console.log(`\n📋 Tabelle ${idx + 1} (enthält relevante Begriffe):`);
      console.log(table.substring(0, 2000));
    }
  });
}

// Suche nach Links mit "club" oder "Worringen"
console.log('\n🔍 Suche nach Links...');
const linkMatches = html.match(/<a[^>]+href=["'][^"']*["'][^>]*>[\s\S]{0,200}?<\/a>/gi);
if (linkMatches) {
  const relevantLinks = linkMatches.filter(link => 
    link.includes('club') || link.includes('Worringen') || link.includes('Köln')
  );
  console.log(`✅ ${relevantLinks.length} relevante Links gefunden`);
  relevantLinks.slice(0, 10).forEach((link, idx) => {
    console.log(`\n🔗 Link ${idx + 1}:`);
    console.log(link);
  });
}

// Suche nach "Worringen" im Kontext
console.log('\n🔍 Suche nach "Worringen" im Kontext...');
const worringenIndex = html.indexOf('Worringen');
if (worringenIndex !== -1) {
  const context = html.substring(Math.max(0, worringenIndex - 500), Math.min(html.length, worringenIndex + 500));
  console.log('📋 Kontext um "Worringen":');
  console.log(context);
}

// Suche nach Zahlen die Club-Nummern sein könnten
console.log('\n🔍 Suche nach möglichen Club-Nummern...');
const numberPattern = /\b\d{4,6}\b/g;
const numbers = [...html.matchAll(numberPattern)];
const uniqueNumbers = [...new Set(numbers.map(m => m[0]))];
console.log(`✅ ${uniqueNumbers.length} verschiedene Zahlen gefunden`);
uniqueNumbers.slice(0, 20).forEach(num => {
  const numIndex = html.indexOf(num);
  if (numIndex !== -1) {
    const context = html.substring(Math.max(0, numIndex - 100), Math.min(html.length, numIndex + 100));
    if (context.includes('club') || context.includes('Worringen')) {
      console.log(`\n🔢 Mögliche Club-Nummer: ${num}`);
      console.log(`   Kontext: ${context.substring(0, 200)}`);
    }
  }
});


