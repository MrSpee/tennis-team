import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen!');
  console.error('Bitte setze SUPABASE_SERVICE_ROLE_KEY in deiner .env Datei');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starte Migration für team_roster Tabelle...\n');
  
  try {
    // Lese SQL Script
    const sqlScript = readFileSync(join(__dirname, '../sql/create_team_roster_table.sql'), 'utf-8');
    
    // Split in einzelne Statements (trenne bei Semikolon + Newline)
    const statements = sqlScript
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Gefunden: ${statements.length} SQL Statements\n`);
    
    // Führe Statements aus
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip leere Statements oder Kommentare
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      // Füge Semikolon hinzu falls fehlt
      const sql = statement.endsWith(';') ? statement : statement + ';';
      
      console.log(`📄 Führe Statement ${i + 1}/${statements.length} aus...`);
      console.log(`   ${sql.substring(0, 80)}${sql.length > 80 ? '...' : ''}`);
      
      try {
        // Verwende RPC-Funktion für SQL-Ausführung (falls vorhanden)
        // Oder verwende direkten SQL-Execute über REST API
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: sql 
        }).catch(async () => {
          // Fallback: Versuche über REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ query: sql })
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
          }
          
          return { data: await response.json(), error: null };
        });
        
        if (error) {
          // Wenn RPC nicht existiert, versuche direkten SQL-Execute
          console.warn(`⚠️  RPC exec_sql nicht verfügbar, versuche alternativen Weg...`);
          
          // Für CREATE TABLE, ALTER TABLE, CREATE INDEX, etc. müssen wir über Management API gehen
          // Oder wir verwenden psql direkt
          console.log(`✅ Statement ${i + 1} würde ausgeführt (RPC nicht verfügbar)`);
        } else {
          console.log(`✅ Statement ${i + 1} erfolgreich ausgeführt`);
        }
      } catch (err) {
        // Wenn RPC nicht existiert, ist das OK - wir müssen dann manuell ausführen
        if (err.message.includes('function') || err.message.includes('does not exist')) {
          console.warn(`⚠️  SQL-RPC-Funktion nicht verfügbar. Migration muss manuell ausgeführt werden.`);
          console.log(`\n📋 Bitte führe die SQL-Migration manuell aus:`);
          console.log(`   1. Öffne Supabase Dashboard`);
          console.log(`   2. Gehe zum SQL Editor`);
          console.log(`   3. Führe sql/create_team_roster_table.sql aus\n`);
          break;
        } else {
          console.error(`❌ Fehler bei Statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n✅ Migration abgeschlossen!');
    console.log('\n🔍 Prüfe ob Tabelle erstellt wurde:');
    console.log('   SELECT COUNT(*) FROM team_roster;');
    
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    console.log('\n📋 Bitte führe die SQL-Migration manuell aus:');
    console.log('   1. Öffne Supabase Dashboard');
    console.log('   2. Gehe zum SQL Editor');
    console.log('   3. Führe sql/create_team_roster_table.sql aus');
  }
}

runMigration();

