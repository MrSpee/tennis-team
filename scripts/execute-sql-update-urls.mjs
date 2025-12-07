#!/usr/bin/env node

/**
 * Führt das SQL-Script aus, um Team-Portrait-URLs zu aktualisieren
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (key && !process.env[key]) {
        process.env[key] = rest.join('=').trim();
      }
    });
  } catch (error) {}
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  const sqlPath = resolve(__dirname, '../sql/update_team_portrait_urls_winter_2025_26.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  
  console.log('🚀 Führe SQL-Script aus...');
  console.log('='.repeat(80));
  
  // Teile SQL in einzelne Statements (getrennt durch ;)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);
  
  console.log(`📋 ${statements.length} SQL-Statements gefunden\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Überspringe SELECT-Statements (die zeigen nur Ergebnisse)
    if (statement.toUpperCase().startsWith('SELECT')) {
      console.log(`\n📊 Führe SELECT-Statement aus...`);
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Versuche direkt über Supabase
          console.log('   (SELECT wird übersprungen - zeigt nur Ergebnisse)');
        } else {
          console.log('   ✅ Ergebnisse:', data);
        }
      } catch (e) {
        console.log('   (SELECT wird übersprungen)');
      }
      continue;
    }
    
    console.log(`\n${i + 1}. Führe UPDATE aus...`);
    
    try {
      // Für UPDATE-Statements müssen wir sie manuell parsen oder über RPC ausführen
      // Da Supabase keine direkte SQL-Ausführung erlaubt, müssen wir die Updates manuell machen
      console.log('   ⚠️  Direkte SQL-Ausführung nicht möglich über Supabase Client');
      console.log('   → Bitte führe das SQL-Script manuell im Supabase Dashboard aus');
      console.log(`   → Oder verwende die MCP-Tools für SQL-Ausführung`);
    } catch (error) {
      console.error(`   ❌ Fehler:`, error.message);
    }
  }
  
  console.log('\n\n✅ Script abgeschlossen');
  console.log('⚠️  Hinweis: SQL-Statements müssen manuell im Supabase Dashboard ausgeführt werden');
  console.log('   oder über MCP-Tools, da der Supabase Client keine direkte SQL-Ausführung erlaubt');
}

executeSQL().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

