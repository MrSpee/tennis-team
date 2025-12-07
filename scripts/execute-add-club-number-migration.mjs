#!/usr/bin/env node

/**
 * Führt die Migration für club_number Spalte aus
 * Verwendet Supabase Management API (service_role key)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQL_FILE = resolve(__dirname, '../sql/add_club_number_to_team_info.sql');
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
  
  console.log('📊 Führe Migration aus...\n');
  
  try {
    // Führe das komplette SQL-Script aus
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Versuche alternativen Endpoint
      const response2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: sql
      });

      if (!response2.ok) {
        const errorText = await response2.text();
        throw new Error(`HTTP ${response2.status}: ${errorText}`);
      }
    }

    console.log('✅ Migration erfolgreich ausgeführt!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Prüfe die Spalte in Supabase Dashboard');
    console.log('   2. Teste die parse-club-rosters API');
    
  } catch (error) {
    console.error('❌ Fehler beim Ausführen der Migration:', error.message);
    console.error('\n💡 Alternative: Führe das SQL-Script manuell im Supabase Dashboard aus:');
    console.error(`   ${SQL_FILE}`);
    process.exit(1);
  }
}

executeSQL();

