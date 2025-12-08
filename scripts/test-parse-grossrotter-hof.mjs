/**
 * Test: Parse Grossrotter Hof clubPools Seite
 */

const clubPoolsUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=35408';
const targetSeason = 'Winter 2025/2026';

const response = await fetch(clubPoolsUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const html = await response.text();

console.log('🔍 Suche nach Team-Links...\n');

// Pattern aus parse-club-rosters.js
const teamLinkPattern = /<a\s+href="([^"]*clubPools[^"]*seasonName=[^"]*[&amp;]contestType=([^"]+))"[^>]*>([^<]+)<\/a>/gi;

const matches = [...html.matchAll(teamLinkPattern)];

console.log(`✅ ${matches.length} Team-Links gefunden:\n`);

matches.forEach((match, idx) => {
  const url = match[1].replace(/&amp;/g, '&');
  const contestType = decodeURIComponent(match[2].replace(/\+/g, ' '));
  const linkText = match[3].trim();
  
  console.log(`${idx + 1}. "${linkText}"`);
  console.log(`   contestType: "${contestType}"`);
  console.log(`   URL: ${url.substring(0, 150)}...`);
  console.log('');
});

// Suche auch nach anderen möglichen Patterns
console.log('\n🔍 Suche nach alternativen Patterns...\n');

// Pattern für direkte Links ohne seasonName
const altPattern1 = /<a[^>]+href="([^"]*clubPools[^"]*contestType=([^"]+))"[^>]*>([^<]+)<\/a>/gi;
const altMatches1 = [...html.matchAll(altPattern1)];
console.log(`Pattern 1 (ohne seasonName): ${altMatches1.length} Treffer`);

// Suche nach "Winter 2025/2026" Sektion
const winterSectionIndex = html.indexOf('Winter 2025/2026');
if (winterSectionIndex !== -1) {
  const winterSection = html.substring(winterSectionIndex, Math.min(html.length, winterSectionIndex + 5000));
  console.log('\n📋 Winter 2025/2026 Sektion gefunden');
  
  // Suche nach Links in dieser Sektion
  const winterLinks = [...winterSection.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
  console.log(`\n🔗 ${winterLinks.length} Links in Winter-Sektion gefunden:`);
  
  winterLinks.slice(0, 20).forEach((link, idx) => {
    const href = link[1];
    const text = link[2].trim();
    if (href.includes('clubPools') || text.match(/^(U\d+|Damen|Herren)/i)) {
      console.log(`  ${idx + 1}. "${text}" → ${href.substring(0, 100)}...`);
    }
  });
}

