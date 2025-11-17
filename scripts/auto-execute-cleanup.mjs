#!/usr/bin/env node

/**
 * Führt die Cleanup-SQL-Scripts automatisch über Supabase aus
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Supabase Projekt-Referenz
const PROJECT_REF = 'fyvmyyfuxuconhdbiwoa';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

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

async function executeSql(sql, scriptName) {
  console.log(`\n📋 Führe ${scriptName} aus...\n`);
  console.log('═'.repeat(70));

  const statements = splitSqlStatements(sql);
  console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

  // Versuche verschiedene Verbindungsmethoden
  let client = null;
  let connectionString = null;

  // Methode 1: DATABASE_URL aus Umgebungsvariablen
  if (process.env.DATABASE_URL) {
    connectionString = process.env.DATABASE_URL;
    console.log('🔌 Verwende DATABASE_URL aus Umgebungsvariablen...');
  }
  // Methode 2: Supabase Connection String konstruieren
  else if (process.env.SUPABASE_DB_PASSWORD) {
    connectionString = `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
    console.log('🔌 Verwende Supabase Connection String...');
  }
  // Methode 3: Versuche über Supabase MCP (falls verfügbar)
  else {
    console.log('⚠️  Keine Datenbankverbindung gefunden!');
    console.log('📝 Zeige SQL-Content zum manuellen Ausführen:\n');
    console.log('─'.repeat(70));
    console.log(sql);
    console.log('─'.repeat(70));
    console.log(`\n💡 Tipp: Setze DATABASE_URL oder SUPABASE_DB_PASSWORD als Umgebungsvariable`);
    console.log(`   Oder führe das Script im Supabase SQL Editor aus:`);
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    return;
  }

  try {
    client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Verbunden mit Datenbank!\n');

    // Führe Statements aus
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const isSelect = /^\s*SELECT/i.test(statement);
      const isShow = /^\s*(SHOW|EXPLAIN)/i.test(statement);
      const isBegin = /^\s*BEGIN/i.test(statement);
      const isCommit = /^\s*COMMIT/i.test(statement);

      if (isBegin) {
        console.log(`🔄 Starte Transaction...`);
        await client.query('BEGIN');
        continue;
      }

      if (isCommit) {
        console.log(`✅ Committe Transaction...`);
        await client.query('COMMIT');
        continue;
      }

      if (isSelect || isShow) {
        // SELECT-Statements: Zeige Ergebnisse
        try {
          const preview = statement.substring(0, 80).replace(/\n/g, ' ');
          console.log(`📊 Statement ${i + 1}/${statements.length}: ${preview}...`);
          
          const result = await client.query(statement);
          
          if (result.rows && result.rows.length > 0) {
            console.log('📋 Ergebnisse:');
            // Zeige erste 10 Zeilen
            const displayRows = result.rows.slice(0, 10);
            console.table(displayRows);
            if (result.rows.length > 10) {
              console.log(`   ... und ${result.rows.length - 10} weitere Zeilen\n`);
            } else {
              console.log('');
            }
          } else {
            console.log('✅ Keine Ergebnisse\n');
          }
        } catch (error) {
          console.error(`❌ Fehler bei SELECT-Statement ${i + 1}:`, error.message);
          console.log('');
        }
      } else {
        // Andere Statements: Führe aus
        try {
          const preview = statement.substring(0, 60).replace(/\n/g, ' ');
          console.log(`⚙️  Statement ${i + 1}/${statements.length}: ${preview}...`);
          
          const result = await client.query(statement);
          
          if (result.rowCount !== undefined) {
            console.log(`   ✅ Ausgeführt (${result.rowCount} Zeilen betroffen)\n`);
          } else {
            console.log(`   ✅ Ausgeführt\n`);
          }
        } catch (error) {
          console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
          if (error.code) {
            console.error(`   Code: ${error.code}`);
          }
          console.log('');
          
          // Bei kritischen Fehlern: Frage ob fortgesetzt werden soll
          if (error.code === '23503' || error.code === '23505') {
            console.log('⚠️  Foreign Key Constraint oder Unique Constraint Verletzung');
          }
        }
      }
    }

    console.log('═'.repeat(70));
    console.log('✅ Script abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tipp: Das Datenbank-Passwort ist falsch oder fehlt.');
      console.log('   Setze SUPABASE_DB_PASSWORD als Umgebungsvariable.');
      console.log('   Das Passwort findest du in:');
      console.log('   Supabase Dashboard → Settings → Database → Connection string\n');
    }
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Verbindung geschlossen');
    }
  }
}

async function main() {
  const command = process.argv[2] || 'analyze';

  if (!SQL_FILES[command]) {
    console.log('📋 Cleanup-SQL-Script Auto-Executor\n');
    console.log('Verwendung:');
    console.log('  node scripts/auto-execute-cleanup.mjs [command]\n');
    console.log('Commands:');
    console.log('  analyze   - Führt ANALYZE_BEFORE_CLEANUP.sql aus (Standard)');
    console.log('  cleanup   - Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus (⚠️  LÖSCHT DATEN!)');
    console.log('  reassign  - Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus\n');
    console.log('Umgebungsvariablen:');
    console.log('  DATABASE_URL (PostgreSQL connection string)');
    console.log('  ODER: SUPABASE_DB_PASSWORD (Supabase DB Passwort)\n');
    process.exit(1);
  }

  const sqlFile = SQL_FILES[command];
  const scriptName = sqlFile.split('/').pop();

  // Warnung bei cleanup
  if (command === 'cleanup') {
    console.log('⚠️  ⚠️  ⚠️  WICHTIGE WARNUNG ⚠️  ⚠️  ⚠️');
    console.log('Dieses Script wird Daten aus der Datenbank LÖSCHEN!');
    console.log('Stelle sicher, dass du ein Backup erstellt hast!\n');
    
    // Frage nach Bestätigung
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Möchtest du wirklich fortfahren? (yes/no): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Abgebrochen.');
      process.exit(0);
    }
  }

  try {
    console.log(`📖 Lese ${scriptName}...`);
    const sql = await readSqlFile(sqlFile);
    
    await executeSql(sql, scriptName);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();


