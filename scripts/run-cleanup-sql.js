#!/usr/bin/env node

/**
 * Script zum Ausführen der Cleanup-SQL-Scripts
 * 
 * Verwendung:
 *   node scripts/run-cleanup-sql.js analyze    # Führt ANALYZE_BEFORE_CLEANUP.sql aus
 *   node scripts/run-cleanup-sql.js cleanup    # Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus
 *   node scripts/run-cleanup-sql.js reassign   # Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus
 * 
 * Umgebungsvariablen benötigt:
 *   - SUPABASE_URL oder VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY oder SERVICE_ROLE_KEY
 *   - ODER: DATABASE_URL (PostgreSQL connection string)
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// SQL-Dateien
const SQL_FILES = {
  analyze: 'sql/ANALYZE_BEFORE_CLEANUP.sql',
  cleanup: 'sql/CLEANUP_FOR_NULIGA_IMPORT.sql',
  reassign: 'sql/REASSIGN_PLAYERS_TO_TEAMS.sql'
};

async function readSqlFile(filename) {
  const filePath = join(projectRoot, filename);
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Fehler beim Lesen von ${filename}: ${error.message}`);
  }
}

async function executeSqlViaSupabase(sql) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_ROLE || 
    process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase-Verbindungsdaten fehlen. Bitte setze:\n' +
      '  - VITE_SUPABASE_URL oder SUPABASE_URL\n' +
      '  - SUPABASE_SERVICE_ROLE_KEY oder SERVICE_ROLE_KEY'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // Supabase JS Client unterstützt keine direkte SQL-Ausführung
  // Wir müssen die REST API verwenden
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    // Fallback: Versuche über pg direkt
    throw new Error(`Supabase REST API nicht verfügbar. Bitte führe die SQL-Scripts manuell im Supabase SQL Editor aus.`);
  }

  return await response.json();
}

async function executeSqlDirect(sql) {
  // Versuche direkte PostgreSQL-Verbindung
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      'Keine Datenbankverbindung gefunden. Bitte setze:\n' +
      '  - DATABASE_URL (PostgreSQL connection string)\n' +
      '  ODER führe die Scripts manuell im Supabase SQL Editor aus.'
    );
  }

  // Dynamisch pg importieren (falls installiert)
  try {
    const { default: pg } = await import('pg');
    const { Client } = pg;
    
    const client = new Client({
      connectionString: databaseUrl
    });

    await client.connect();
    console.log('✅ Verbunden mit Datenbank');

    try {
      const result = await client.query(sql);
      await client.end();
      return result;
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (importError) {
    throw new Error(
      'pg-Bibliothek nicht gefunden. Installiere sie mit:\n' +
      '  npm install pg\n' +
      '  ODER führe die Scripts manuell im Supabase SQL Editor aus.'
    );
  }
}

async function executeSql(sql, scriptName) {
  console.log(`\n📋 Führe ${scriptName} aus...\n`);
  console.log('─'.repeat(60));

  // Teile SQL in einzelne Statements (getrennt durch ;)
  // Ignoriere Kommentare und leere Zeilen
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

  // Versuche zuerst Supabase, dann direkte Verbindung
  try {
    // Für SELECT-Statements: Verwende Supabase Client
    // Für andere: Zeige Anweisungen
    const hasSelect = /^\s*SELECT/i.test(sql);
    const hasDelete = /^\s*DELETE/i.test(sql);
    const hasUpdate = /^\s*UPDATE/i.test(sql);
    const hasInsert = /^\s*INSERT/i.test(sql);
    const hasCreate = /^\s*CREATE/i.test(sql);
    const hasBegin = /^\s*BEGIN/i.test(sql);

    if (hasBegin || hasDelete || hasUpdate || hasInsert || hasCreate) {
      console.log('⚠️  WICHTIG: Dieses Script enthält Änderungen an der Datenbank!');
      console.log('⚠️  Für Sicherheit führe es bitte manuell im Supabase SQL Editor aus.\n');
      console.log('📝 SQL-Content:');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      console.log('\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.');
      return;
    }

    // Für SELECT-Statements: Versuche Supabase
    if (hasSelect) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = 
        process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_SERVICE_ROLE || 
        process.env.SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false }
        });

        // Führe SELECT-Statements aus
        for (const statement of statements) {
          if (/^\s*SELECT/i.test(statement)) {
            // Für SELECT: Verwende Supabase .from() wenn möglich
            // Sonst: Zeige Statement
            console.log(`📊 Statement: ${statement.substring(0, 80)}...`);
            console.log('⚠️  SELECT-Statements müssen manuell ausgeführt werden.\n');
          }
        }
      }
    }

    // Fallback: Zeige SQL
    console.log('📝 SQL-Content:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.log('\n📝 SQL-Content (zum manuellen Ausführen):');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || !SQL_FILES[command]) {
    console.log('📋 Cleanup-SQL-Script Runner\n');
    console.log('Verwendung:');
    console.log('  node scripts/run-cleanup-sql.js <command>\n');
    console.log('Commands:');
    console.log('  analyze   - Führt ANALYZE_BEFORE_CLEANUP.sql aus');
    console.log('  cleanup   - Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus');
    console.log('  reassign  - Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus\n');
    console.log('⚠️  WICHTIG: Für Sicherheit werden Änderungs-Scripts nicht automatisch ausgeführt.');
    console.log('    Bitte führe sie manuell im Supabase SQL Editor aus.\n');
    process.exit(1);
  }

  const sqlFile = SQL_FILES[command];
  const scriptName = sqlFile.split('/').pop();

  try {
    console.log(`📖 Lese ${scriptName}...`);
    const sql = await readSqlFile(sqlFile);
    
    await executeSql(sql, scriptName);
    
    console.log('\n✅ Script verarbeitet!');
    console.log('💡 Tipp: Prüfe die Ausgabe oben und führe das SQL im Supabase SQL Editor aus.\n');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();


