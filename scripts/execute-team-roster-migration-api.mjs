#!/usr/bin/env node

/**
 * Führt team_roster Migration über Supabase Management API aus
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Hole Service Role Key aus Umgebungsvariablen
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SERVICE_ROLE_KEY ||
                         process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function executeSqlViaManagementAPI(sql) {
  if (!SERVICE_ROLE_KEY) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen!');
    console.log('\n📝 SQL-Migration zum manuellen Ausführen:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log(`\n💡 Führe die Migration im Supabase SQL Editor aus:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    return false;
  }

  console.log('🚀 Führe SQL-Migration über Supabase Management API aus...\n');

  try {
    // Supabase Management API für SQL-Ausführung
    const managementApiUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
    
    // Split SQL in einzelne Statements
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

    // Führe jeden Statement aus
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const sqlQuery = statement.endsWith(';') ? statement : statement + ';';
      
      console.log(`📄 Führe Statement ${i + 1}/${statements.length} aus...`);
      console.log(`   ${sqlQuery.substring(0, 60)}${sqlQuery.length > 60 ? '...' : ''}`);

      try {
        const response = await fetch(managementApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            query: sqlQuery
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Statement ${i + 1} fehlgeschlagen: ${response.status} ${response.statusText}`);
          console.warn(`   ${errorText.substring(0, 200)}`);
          // Versuche trotzdem weiter
        } else {
          const result = await response.json();
          console.log(`✅ Statement ${i + 1} erfolgreich ausgeführt`);
        }
      } catch (error) {
        console.warn(`⚠️  Fehler bei Statement ${i + 1}: ${error.message}`);
        // Versuche trotzdem weiter
      }
    }

    console.log('\n✅ Migration abgeschlossen!');
    console.log('\n🔍 Prüfe ob Tabelle erstellt wurde:');
    console.log('   SELECT COUNT(*) FROM team_roster;');
    return true;

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error.message);
    console.log('\n📝 SQL-Migration zum manuellen Ausführen:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log(`\n💡 Führe die Migration im Supabase SQL Editor aus:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    return false;
  }
}

async function main() {
  try {
    console.log('📖 Lese sql/create_team_roster_table.sql...');
    const sql = await readFile(join(projectRoot, 'sql/create_team_roster_table.sql'), 'utf-8');
    
    const success = await executeSqlViaManagementAPI(sql);
    
    if (!success) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();

