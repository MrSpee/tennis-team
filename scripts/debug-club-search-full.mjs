/**
 * Debug: Speichere vollständige HTML-Antwort
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

// Speichere HTML in Datei
import fs from 'fs';
fs.writeFileSync('club-search-result.html', html);
console.log('✅ HTML gespeichert in club-search-result.html');

// Suche nach "Worringen" und zeige Kontext
const worringenIndex = html.indexOf('Worringen');
if (worringenIndex === -1) {
  console.log('❌ "Worringen" nicht in HTML gefunden');
  console.log('🔍 Suche nach "Köln"...');
  const koelnIndex = html.indexOf('Köln');
  if (koelnIndex !== -1) {
    const context = html.substring(Math.max(0, koelnIndex - 500), Math.min(html.length, koelnIndex + 2000));
    console.log('📋 Kontext um "Köln":');
    console.log(context);
  }
} else {
  const context = html.substring(Math.max(0, worringenIndex - 1000), Math.min(html.length, worringenIndex + 2000));
  console.log('📋 Kontext um "Worringen":');
  console.log(context);
}

// Suche nach allen Links die "club" enthalten
console.log('\n🔍 Alle Links mit "club":');
const allLinks = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || [];
const clubLinks = allLinks.filter(link => link.includes('club'));
console.log(`✅ ${clubLinks.length} Links mit "club" gefunden`);
clubLinks.slice(0, 20).forEach((link, idx) => {
  console.log(`${idx + 1}. ${link.substring(0, 200)}`);
});

