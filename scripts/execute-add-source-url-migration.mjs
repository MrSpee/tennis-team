#!/usr/bin/env node

/**
 * Führt die Migration für source_url in team_seasons aus
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';

async function main() {
  try {
    console.log('📖 Lese sql/add_source_url_to_team_seasons.sql...');
    const sql = await readFile(join(projectRoot, 'sql/add_source_url_to_team_seasons.sql'), 'utf-8');
    
    console.log('\n📋 SQL-Migration für team_seasons.source_url:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n⚠️  Diese Migration muss im Supabase Dashboard ausgeführt werden:');
    console.log(`   1. Öffne: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.log('   2. Kopiere den obigen SQL-Code');
    console.log('   3. Füge ihn in den SQL Editor ein');
    console.log('   4. Klicke auf "Run" (oder drücke Cmd/Ctrl + Enter)');
    console.log('\n✅ Nach der Migration prüfen:');
    console.log('   SELECT COUNT(*) FROM team_seasons WHERE source_url IS NOT NULL;');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();

