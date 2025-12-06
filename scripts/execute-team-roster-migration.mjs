import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lese SQL Script
const sqlScript = readFileSync(join(__dirname, '../sql/create_team_roster_table.sql'), 'utf-8');

console.log('📋 SQL-Migration für team_roster Tabelle:\n');
console.log('=' .repeat(80));
console.log(sqlScript);
console.log('=' .repeat(80));
console.log('\n⚠️  Diese Migration muss manuell im Supabase Dashboard ausgeführt werden:');
console.log('   1. Öffne: https://supabase.com/dashboard/project/fyvmyyfuxuconhdbiwoa/sql/new');
console.log('   2. Kopiere den obigen SQL-Code');
console.log('   3. Füge ihn in den SQL Editor ein');
console.log('   4. Klicke auf "Run" (oder drücke Cmd/Ctrl + Enter)');
console.log('\n✅ Nach der Migration prüfen:');
console.log('   SELECT COUNT(*) FROM team_roster;');

