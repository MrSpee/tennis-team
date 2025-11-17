#!/usr/bin/env node
/**
 * Prüft Matchdays und ob sie meetingId haben
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (err) {
    // Ignore
  }
}

loadEnvFile(join(__dirname, '..', '.env.local'));
loadEnvFile(join(__dirname, '..', '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatchdays() {
  console.log('🔍 Prüfe Matchdays...\n');

  const { data: matchdays, error } = await supabase
    .from('matchdays')
    .select('id, match_number, home_team_id, away_team_id, season, league, group_name, status, match_date')
    .order('match_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Fehler:', error);
    return;
  }

  if (!matchdays || matchdays.length === 0) {
    console.log('⚠️ Keine Matchdays gefunden');
    return;
  }

  console.log(`📊 Gefundene Matchdays: ${matchdays.length}\n`);

  let withResults = 0;
  let withoutResults = 0;
  let completed = 0;

  for (const matchday of matchdays) {
    const { data: results } = await supabase
      .from('match_results')
      .select('id')
      .eq('matchday_id', matchday.id)
      .limit(1);

    const hasResults = results && results.length > 0;
    if (hasResults) withResults++;
    else withoutResults++;

    if (matchday.status === 'completed') completed++;

    if (!hasResults && matchday.status === 'completed') {
      console.log(`⚠️ Matchday #${matchday.match_number} (${matchday.status}) - KEINE Match-Results`);
      console.log(`   ID: ${matchday.id}`);
      console.log(`   Datum: ${matchday.match_date}`);
      console.log(`   Liga: ${matchday.league}`);
      console.log('');
    }
  }

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Total Matchdays: ${matchdays.length}`);
  console.log(`   Mit Match-Results: ${withResults}`);
  console.log(`   Ohne Match-Results: ${withoutResults}`);
  console.log(`   Completed: ${completed}`);
}

checkMatchdays().then(() => {
  console.log('\n✅ Prüfung abgeschlossen');
  process.exit(0);
});

