#!/usr/bin/env node

/**
 * Führt die source_url Migration aus
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY fehlt!');
  console.log('\n📋 Migration muss manuell im Supabase Dashboard ausgeführt werden:');
  console.log('   1. Öffne: https://supabase.com/dashboard/project/fyvmyyfuxuconhdbiwoa/sql/new');
  console.log('   2. Kopiere Inhalt von: sql/add_source_url_to_team_seasons.sql');
  console.log('   3. Führe aus');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  console.log('🚀 Führe source_url Migration aus...\n');
  console.log('='.repeat(80));
  
  try {
    // Lese SQL-Datei
    const sqlFile = join(projectRoot, 'sql/add_source_url_to_team_seasons.sql');
    const sql = await readFile(sqlFile, 'utf-8');
    
    console.log('📄 SQL-Datei geladen\n');
    
    // Führe Migration aus
    // Supabase Client unterstützt keine direkten SQL-Statements
    // Wir müssen die RPC-Funktion verwenden oder über REST API
    console.log('⚠️  Direkte SQL-Ausführung über Supabase Client nicht möglich');
    console.log('   → Migration muss im Supabase Dashboard ausgeführt werden\n');
    
    console.log('📋 SQL-Inhalt:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    console.log('\n✅ Migration bereit zur Ausführung');
    console.log('\n📋 Nächster Schritt:');
    console.log('   1. Öffne: https://supabase.com/dashboard/project/fyvmyyfuxuconhdbiwoa/sql/new');
    console.log('   2. Kopiere den obigen SQL-Inhalt');
    console.log('   3. Führe aus');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

executeMigration();

