#!/usr/bin/env node

/**
 * Führt SQL-Scripts über Supabase Management API aus
 * Nutzt die MCP-Konfiguration für die Projekt-Referenz
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// SQL-Dateien
const SQL_FILES = {
  analyze: 'sql/ANALYZE_BEFORE_CLEANUP.sql',
  cleanup: 'sql/CLEANUP_FOR_NULIGA_IMPORT.sql',
  reassign: 'sql/REASSIGN_PLAYERS_TO_TEAMS.sql'
};

// Supabase Projekt-Referenz aus MCP-Konfiguration
const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Hole Service Role Key aus Umgebungsvariablen
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SERVICE_ROLE_KEY ||
                         process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function readSqlFile(filename) {
  const filePath = join(projectRoot, filename);
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Fehler beim Lesen von ${filename}: ${error.message}`);
  }
}

function splitSqlStatements(sql) {
  // Entferne Kommentare
  let cleaned = sql
    .replace(/--.*$/gm, '') // Einzeilige Kommentare
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Mehrzeilige Kommentare

  // Teile in Statements (getrennt durch ;)
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return statements;
}

async function executeSqlViaManagementApi(sql, scriptName) {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY fehlt!\n' +
      'Bitte setze die Umgebungsvariable:\n' +
      '  export SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key\n\n' +
      'Den Service Role Key findest du in:\n' +
      '  Supabase Dashboard → Settings → API → service_role (secret)'
    );
  }

  console.log(`\n📋 Führe ${scriptName} über Supabase Management API aus...\n`);
  console.log('═'.repeat(70));

  const statements = splitSqlStatements(sql);
  console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

  // Verwende Supabase Management API
  // Endpoint: POST /rest/v1/rpc/exec_sql (falls vorhanden)
  // Oder: Direkte PostgreSQL-Verbindung über Supabase Pooler

  // Versuche über Supabase REST API
  const managementApiUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  // Alternative: Verwende Supabase PostgREST für SELECT, aber für andere brauchen wir direkte DB-Verbindung
  console.log('⚠️  Supabase Management API unterstützt keine direkte SQL-Ausführung.');
  console.log('📝 Zeige SQL-Content zum manuellen Ausführen:\n');
  console.log('─'.repeat(70));
  console.log(sql);
  console.log('─'.repeat(70));
  console.log('\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.');
  console.log(`   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
}

async function executeSqlViaPostgREST(sql, scriptName) {
  // Für SELECT-Statements können wir PostgREST verwenden
  // Für andere brauchen wir direkte DB-Verbindung
  
  console.log(`\n📋 Führe ${scriptName} aus...\n`);
  console.log('═'.repeat(70));

  const statements = splitSqlStatements(sql);
  const selectStatements = statements.filter(s => /^\s*SELECT/i.test(s));
  const otherStatements = statements.filter(s => !/^\s*SELECT/i.test(s));

  if (otherStatements.length > 0) {
    console.log('⚠️  WICHTIG: Dieses Script enthält Änderungen an der Datenbank!');
    console.log('⚠️  Für Sicherheit führe es bitte manuell im Supabase SQL Editor aus.\n');
    console.log('📝 SQL-Content:');
    console.log('─'.repeat(70));
    console.log(sql);
    console.log('─'.repeat(70));
    console.log(`\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.`);
    console.log(`   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    return;
  }

  // Führe SELECT-Statements aus
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt für SELECT-Abfragen!');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  for (let i = 0; i < selectStatements.length; i++) {
    const statement = selectStatements[i];
    console.log(`📊 Statement ${i + 1}/${selectStatements.length}:`);
    console.log('─'.repeat(70));
    const preview = statement.substring(0, 100).replace(/\n/g, ' ');
    console.log(`${preview}${statement.length > 100 ? '...' : ''}\n`);

    // Versuche über RPC oder direkt
    try {
      // Für einfache SELECTs können wir versuchen, sie zu parsen und über Supabase Client auszuführen
      // Aber komplexe SELECTs müssen manuell ausgeführt werden
      console.log('⚠️  Komplexe SELECT-Statements müssen manuell ausgeführt werden.');
      console.log('   Kopiere das Statement oben und führe es im Supabase SQL Editor aus.\n');
    } catch (error) {
      console.error(`❌ Fehler:`, error.message);
    }
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || !SQL_FILES[command]) {
    console.log('📋 Supabase SQL-Script Executor\n');
    console.log('Verwendung:');
    console.log('  node scripts/execute-sql-via-supabase.mjs <command>\n');
    console.log('Commands:');
    console.log('  analyze   - Führt ANALYZE_BEFORE_CLEANUP.sql aus');
    console.log('  cleanup   - Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus (⚠️  LÖSCHT DATEN!)');
    console.log('  reassign  - Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus\n');
    console.log('Umgebungsvariablen:');
    console.log('  SUPABASE_SERVICE_ROLE_KEY (für SELECT-Abfragen)\n');
    console.log('⚠️  Hinweis: Änderungs-Scripts (DELETE, UPDATE, etc.) müssen');
    console.log('   manuell im Supabase SQL Editor ausgeführt werden.\n');
    process.exit(1);
  }

  const sqlFile = SQL_FILES[command];
  const scriptName = sqlFile.split('/').pop();

  // Warnung bei cleanup
  if (command === 'cleanup') {
    console.log('⚠️  ⚠️  ⚠️  WICHTIGE WARNUNG ⚠️  ⚠️  ⚠️');
    console.log('Dieses Script wird Daten aus der Datenbank LÖSCHEN!');
    console.log('Stelle sicher, dass du ein Backup erstellt hast!\n');
  }

  try {
    console.log(`📖 Lese ${scriptName}...`);
    const sql = await readSqlFile(sqlFile);
    
    await executeSqlViaPostgREST(sql, scriptName);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();


