#!/usr/bin/env node

/**
 * Importiert Meldeliste für VKC Köln 1 über MCP-Tools
 */

const TEAM_PORTRAIT_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43';
const TEAM_ID = '1aac84b3-d911-471e-9b6f-1f60f0afdf62';
const SEASON = 'Winter 2025/26';

async function parseTeamPortrait(teamPortraitUrl) {
  const response = await fetch(teamPortraitUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  let html = await response.text();
  
  // Finde Spieler-Tabelle
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  let table = null;
  for (const t of allTables) {
    const hasPlayerLinks = t.match(/<a[^>]*>([A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+)/gi);
    const hasLK = t.match(/LK[\d,\.]+/gi);
    const hasLongNumbers = t.match(/\d{7,}/g);
    if (hasPlayerLinks && hasLK && hasLongNumbers) {
      table = t;
      break;
    }
  }
  
  if (!table) {
    throw new Error('Spieler-Tabelle nicht gefunden');
  }
  
  const roster = [];
  const pattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>(LK[\d,\.]+)<\/td>\s*<td[^>]*>(\d{7,})(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:<\/div>[\s\S]*?\((\d{4})\))?/gi;
  
  let match;
  while ((match = pattern.exec(table)) !== null) {
    const rank = parseInt(match[1], 10);
    const lk = match[3].trim();
    const tvmId = match[4].trim();
    const name = match[5].trim();
    
    let birthYear = match[6] ? parseInt(match[6], 10) : null;
    if (!birthYear) {
      const rowEnd = table.indexOf('</tr>', match.index);
      const rowContent = table.substring(match.index, rowEnd);
      const birthMatch = rowContent.match(/\((\d{4})\)/);
      if (birthMatch) {
        birthYear = parseInt(birthMatch[1], 10);
      }
    }
    
    roster.push({
      rank,
      name,
      lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
      tvmId,
      birthYear
    });
  }
  
  return roster;
}

async function main() {
  console.log('🚀 Parse Meldeliste für VKC Köln 1');
  console.log('='.repeat(80));
  
  try {
    const roster = await parseTeamPortrait(TEAM_PORTRAIT_URL);
    console.log(`✅ ${roster.length} Spieler geparst\n`);
    
    // Erstelle SQL INSERT Statements
    console.log('📋 Erstelle SQL INSERT Statements...\n');
    
    // Lösche alte Einträge
    const deleteSQL = `DELETE FROM team_roster WHERE team_id = '${TEAM_ID}' AND season = '${SEASON}';`;
    console.log('DELETE SQL:');
    console.log(deleteSQL);
    console.log();
    
    // INSERT Statements
    const inserts = roster.map((player, index) => {
      const nameEscaped = player.name.replace(/'/g, "''");
      const lkEscaped = player.lk.replace(/'/g, "''");
      return `INSERT INTO team_roster (team_id, season, rank, player_name, lk, tvm_id, birth_year) VALUES ('${TEAM_ID}', '${SEASON}', ${player.rank}, '${nameEscaped}', '${lkEscaped}', '${player.tvmId}', ${player.birthYear || 'NULL'}) ON CONFLICT (team_id, season, rank) DO UPDATE SET player_name = EXCLUDED.player_name, lk = EXCLUDED.lk, tvm_id = EXCLUDED.tvm_id, birth_year = EXCLUDED.birth_year;`;
    });
    
    console.log('INSERT SQL (erste 5):');
    inserts.slice(0, 5).forEach((sql, i) => {
      console.log(`${i + 1}. ${sql.substring(0, 150)}...`);
    });
    console.log(`\n... und ${inserts.length - 5} weitere\n`);
    
    // Speichere in Datei für MCP
    const fs = await import('fs/promises');
    const sqlContent = deleteSQL + '\n\n' + inserts.join('\n');
    await fs.writeFile('tmp/vkc-roster-import.sql', sqlContent);
    console.log('✅ SQL in tmp/vkc-roster-import.sql gespeichert');
    console.log('\n📋 Nächster Schritt:');
    console.log('   → Führe SQL über MCP-Tools aus');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();

