#!/usr/bin/env node

/**
 * Führt das UPSERT-Script für alle Team-Portrait-URLs aus
 * Verwendet Supabase Management API (service_role key)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQL_FILE = resolve(__dirname, '../sql/upsert_all_team_portrait_urls.sql');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY fehlt!');
    console.error('   Bitte setze die Umgebungsvariable SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Oder führe das Script manuell im Supabase Dashboard aus:');
    console.error(`   ${SQL_FILE}`);
    process.exit(1);
  }

  console.log('🔄 Lade SQL-Script...');
  const sql = readFileSync(SQL_FILE, 'utf8');
  
  // Teile in einzelne Statements (getrennt durch ;)
  // Aber behalte SELECT-Statements am Ende
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📊 ${statements.length} SQL-Statements gefunden\n`);
  
  // Führe Statements aus
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip leere oder Kommentar-Statements
    if (!statement || statement.startsWith('--')) {
      continue;
    }
    
    // Für SELECT-Statements: Führe aus und zeige Ergebnis
    if (statement.trim().toUpperCase().startsWith('SELECT')) {
      console.log(`\n📊 Führe SELECT aus (Statement ${i + 1}/${statements.length})...`);
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ SELECT erfolgreich: ${data.length || 0} Zeilen`);
          if (data.length > 0 && data.length <= 10) {
            console.table(data);
          } else if (data.length > 10) {
            console.table(data.slice(0, 10));
            console.log(`   ... und ${data.length - 10} weitere Zeilen`);
          }
        } else {
          const error = await response.text();
          console.warn(`⚠️  SELECT-Fehler: ${error.substring(0, 200)}`);
        }
      } catch (err) {
        console.warn(`⚠️  SELECT-Fehler: ${err.message}`);
      }
      continue;
    }
    
    // Für UPDATE/INSERT: Führe direkt aus
    if (statement.trim().toUpperCase().startsWith('UPDATE') || 
        statement.trim().toUpperCase().startsWith('INSERT')) {
      
      const progress = Math.floor((i / statements.length) * 100);
      if (i % 10 === 0 || i === statements.length - 1) {
        console.log(`🔄 Führe Statement ${i + 1}/${statements.length} aus (${progress}%)...`);
      }
      
      try {
        // Verwende PostgREST für UPDATE/INSERT
        // Für komplexe Statements müssen wir die Management API verwenden
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (response.ok) {
          successCount++;
        } else {
          const error = await response.text();
          console.error(`❌ Fehler bei Statement ${i + 1}: ${error.substring(0, 200)}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ Fehler bei Statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }
  }
  
  console.log(`\n✅ Ausführung abgeschlossen!`);
  console.log(`   ✅ Erfolgreich: ${successCount}`);
  console.log(`   ❌ Fehler: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log(`\n⚠️  Es gab Fehler. Bitte führe das Script manuell im Supabase Dashboard aus:`);
    console.log(`   ${SQL_FILE}`);
  }
}

executeSQL().catch(err => {
  console.error('❌ Fataler Fehler:', err);
  process.exit(1);
});

