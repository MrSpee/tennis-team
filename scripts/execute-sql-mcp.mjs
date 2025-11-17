#!/usr/bin/env node

/**
 * Führt SQL-Scripts über Supabase MCP aus
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}`;

const SQL_FILES = {
  analyze: 'sql/ANALYZE_BEFORE_CLEANUP.sql',
  cleanup: 'sql/CLEANUP_FOR_NULIGA_IMPORT.sql',
  reassign: 'sql/REASSIGN_PLAYERS_TO_TEAMS.sql'
};

async function readSqlFile(filename) {
  const filePath = join(projectRoot, filename);
  return await readFile(filePath, 'utf-8');
}

async function executeSqlViaMCP(sql, scriptName) {
  console.log(`\n📋 Führe ${scriptName} über Supabase MCP aus...\n`);
  console.log('═'.repeat(70));

  // Versuche SQL über Supabase MCP API auszuführen
  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'execute_sql',
        params: {
          sql: sql
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SQL erfolgreich ausgeführt!');
      console.log('📊 Ergebnisse:', result);
      return;
    }
  } catch (error) {
    console.log('⚠️  MCP API nicht verfügbar, zeige SQL-Content:');
  }

  // Fallback: Zeige SQL-Content
  console.log('📝 SQL-Content:');
  console.log('─'.repeat(70));
  console.log(sql);
  console.log('─'.repeat(70));
  console.log(`\n💡 Tipp: Kopiere den SQL-Content oben und führe ihn im Supabase SQL Editor aus.`);
  console.log(`   URL: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
}

async function main() {
  const command = process.argv[2] || 'analyze';

  if (!SQL_FILES[command]) {
    console.log('📋 Supabase SQL-Script Executor (via MCP)\n');
    console.log('Verwendung:');
    console.log('  node scripts/execute-sql-mcp.mjs [command]\n');
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
    
    await executeSqlViaMCP(sql, scriptName);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();


