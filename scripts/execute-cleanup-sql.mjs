#!/usr/bin/env node

/**
 * Führt die Cleanup-SQL-Scripts direkt über PostgreSQL-Verbindung aus
 * 
 * Verwendung:
 *   node scripts/execute-cleanup-sql.mjs analyze    # Führt ANALYZE aus
 *   node scripts/execute-cleanup-sql.mjs cleanup    # Führt CLEANUP aus (VORSICHT!)
 *   node scripts/execute-cleanup-sql.mjs reassign   # Führt REASSIGN aus
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// SQL-Dateien
const SQL_FILES = {
  analyze: 'sql/ANALYZE_BEFORE_CLEANUP.sql',
  cleanup: 'sql/CLEANUP_FOR_NULIGA_IMPORT.sql',
  reassign: 'sql/REASSIGN_PLAYERS_TO_TEAMS.sql'
};

// Supabase Credentials (aus run-migration.js)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dm15eWZ1eHVjb25oZGJpd293YSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzIwNjI0NDYyLCJleHAiOjE4NzgyMDA0NjJ9.j6KbqVYVcwZzY0BVoTXnm0D5d1HhW-o_frZf3IqJJ_8';

// Extrahiere Datenbank-URL aus Supabase-URL
function getDatabaseUrl() {
  // Versuche DATABASE_URL aus Umgebungsvariablen
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Versuche Supabase Connection String zu konstruieren
  // Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    const projectRef = match[1];
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
    
    if (password) {
      return `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
    }
  }

  throw new Error(
    'Keine Datenbankverbindung gefunden!\n' +
    'Bitte setze eine der folgenden Umgebungsvariablen:\n' +
    '  - DATABASE_URL (PostgreSQL connection string)\n' +
    '  - SUPABASE_DB_PASSWORD (Supabase Datenbank-Passwort)\n\n' +
    'Oder führe die Scripts manuell im Supabase SQL Editor aus.'
  );
}

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
    .filter(s => s.length > 0 && !s.match(/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i));

  return statements;
}

async function executeSql(sql, scriptName) {
  console.log(`\n📋 Führe ${scriptName} aus...\n`);
  console.log('═'.repeat(70));

  const statements = splitSqlStatements(sql);
  console.log(`📊 Gefunden: ${statements.length} SQL-Statements\n`);

  let client;
  try {
    const databaseUrl = getDatabaseUrl();
    console.log('🔌 Verbinde mit Datenbank...');
    
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Verbunden!\n');

    // Führe Statements aus
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const isSelect = /^\s*SELECT/i.test(statement);
      const isShow = /^\s*(SHOW|EXPLAIN)/i.test(statement);

      if (isSelect || isShow) {
        // SELECT-Statements: Zeige Ergebnisse
        try {
          console.log(`📊 Statement ${i + 1}/${statements.length}:`);
          console.log('─'.repeat(70));
          const preview = statement.substring(0, 100).replace(/\n/g, ' ');
          console.log(`${preview}${statement.length > 100 ? '...' : ''}\n`);
          
          const result = await client.query(statement);
          
          if (result.rows && result.rows.length > 0) {
            console.log('📋 Ergebnisse:');
            console.table(result.rows);
          } else {
            console.log('✅ Keine Ergebnisse');
          }
          console.log('');
        } catch (error) {
          console.error(`❌ Fehler bei SELECT-Statement ${i + 1}:`, error.message);
        }
      } else {
        // Andere Statements: Führe aus
        try {
          const preview = statement.substring(0, 80).replace(/\n/g, ' ');
          console.log(`⚙️  Statement ${i + 1}/${statements.length}: ${preview}...`);
          
          const result = await client.query(statement);
          
          if (result.rowCount !== undefined) {
            console.log(`   ✅ Ausgeführt (${result.rowCount} Zeilen betroffen)\n`);
          } else {
            console.log(`   ✅ Ausgeführt\n`);
          }
        } catch (error) {
          console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 200)}...\n`);
          
          // Bei kritischen Fehlern: Frage ob fortgesetzt werden soll
          if (error.code === '23503' || error.code === '23505') {
            console.log('⚠️  Foreign Key Constraint oder Unique Constraint Verletzung');
            console.log('   Möglicherweise wurden bereits Daten gelöscht.\n');
          }
        }
      }
    }

    console.log('═'.repeat(70));
    console.log('✅ Script abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.message.includes('Keine Datenbankverbindung')) {
      console.log('\n💡 Alternative: Führe die Scripts manuell im Supabase SQL Editor aus.');
      console.log('   Die SQL-Dateien findest du im sql/ Verzeichnis.\n');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Verbindung geschlossen');
    }
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || !SQL_FILES[command]) {
    console.log('📋 Cleanup-SQL-Script Executor\n');
    console.log('Verwendung:');
    console.log('  node scripts/execute-cleanup-sql.mjs <command>\n');
    console.log('Commands:');
    console.log('  analyze   - Führt ANALYZE_BEFORE_CLEANUP.sql aus (nur SELECT)');
    console.log('  cleanup   - Führt CLEANUP_FOR_NULIGA_IMPORT.sql aus (⚠️  LÖSCHT DATEN!)');
    console.log('  reassign  - Führt REASSIGN_PLAYERS_TO_TEAMS.sql aus\n');
    console.log('Umgebungsvariablen:');
    console.log('  - DATABASE_URL (PostgreSQL connection string)');
    console.log('  - SUPABASE_DB_PASSWORD (Supabase DB Passwort)\n');
    process.exit(1);
  }

  const sqlFile = SQL_FILES[command];
  const scriptName = sqlFile.split('/').pop();

  // Warnung bei cleanup
  if (command === 'cleanup') {
    console.log('⚠️  ⚠️  ⚠️  WICHTIGE WARNUNG ⚠️  ⚠️  ⚠️');
    console.log('Dieses Script wird Daten aus der Datenbank LÖSCHEN!');
    console.log('Stelle sicher, dass du ein Backup erstellt hast!\n');
    
    // In Produktion: Frage nach Bestätigung
    if (process.stdin.isTTY) {
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


