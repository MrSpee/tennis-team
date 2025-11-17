#!/usr/bin/env node

/**
 * Führt SQL-Scripts direkt über Supabase aus
 * Nutzt die Supabase-Verbindung aus der MCP-Konfiguration
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Supabase Projekt-Referenz
const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Hole Service Role Key
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SERVICE_ROLE_KEY ||
                         process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// SQL-Dateien
const SQL_FILES = {
  analyze: 'sql/ANALYZE_BEFORE_CLEANUP.sql',
  cleanup: 'sql/CLEANUP_FOR_NULIGA_IMPORT.sql',
  reassign: 'sql/REASSIGN_PLAYERS_TO_TEAMS.sql'
};

async function readSqlFile(filename) {
  const filePath = join(projectRoot, filename);
  return await readFile(filePath, 'utf-8');
}

function splitSqlStatements(sql) {
  // Entferne Kommentare
  let cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Teile in Statements
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return statements;
}

async function executeSqlViaSupabase(sql, scriptName) {
  if (!SERVICE_ROLE_KEY) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY fehlt!');
    console.log('📝 Zeige SQL-Content zum manuellen Ausführen:\n');
    console.log('─'.repeat(70));
    console.log(sql);
    console.log('─'.repeat(70));
    console.log(`\n💡 Tipp: Führe das Script im Supabase SQL Editor aus:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    return;
  }

  console.log(`\n📋 Führe ${scriptName} über Supabase aus...\n`);
  console.log('═'.repeat(70));

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const statements = splitSqlStatements(sql);
  console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

  // Supabase JS Client unterstützt keine direkte SQL-Ausführung
  // Wir müssen die SQL-Scripts manuell ausführen oder über die Management API
  
  console.log('⚠️  Supabase JS Client unterstützt keine direkte SQL-Ausführung.');
  console.log('📝 Zeige SQL-Content zum manuellen Ausführen:\n');
  console.log('─'.repeat(70));
  console.log(sql);
  console.log('─'.repeat(70));
  console.log(`\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.`);
  console.log(`   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
}

async function main() {
  const command = process.argv[2] || 'analyze';

  if (!SQL_FILES[command]) {
    console.log('📋 Supabase SQL-Script Executor\n');
    console.log('Verwendung:');
    console.log('  node scripts/execute-sql-direct.mjs [command]\n');
    console.log('Commands:');
    console.log('  analyze   - Führt ANALYZE_BEFORE_CLEANUP.sql aus (Standard)');
    console.log('  cleanup   - Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus (⚠️  LÖSCHT DATEN!)');
    console.log('  reassign  - Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus\n');
    process.exit(1);
  }

  const sqlFile = SQL_FILES[command];
  const scriptName = sqlFile.split('/').pop();

  try {
    console.log(`📖 Lese ${scriptName}...`);
    const sql = await readSqlFile(sqlFile);
    
    await executeSqlViaSupabase(sql, scriptName);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();


