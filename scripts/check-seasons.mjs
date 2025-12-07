#!/usr/bin/env node

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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSeasons() {
  const { data, error } = await supabase
    .from('team_seasons')
    .select('season, group_name, league, is_active, source_url')
    .order('season', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('❌ Fehler:', error);
    return;
  }
  
  console.log('📊 Gefundene Saisons:');
  const seasons = new Set();
  data.forEach(ts => {
    seasons.add(ts.season);
  });
  
  seasons.forEach(season => {
    const count = data.filter(ts => ts.season === season).length;
    console.log(`  - "${season}" (${count} Einträge)`);
  });
  
  console.log('\n📋 Aktive Teams für "Winter 2025/26":');
  const winter2025 = data.filter(ts => 
    ts.season && ts.season.includes('Winter 2025') && ts.is_active
  );
  console.log(`  ${winter2025.length} Teams gefunden`);
  
  if (winter2025.length > 0) {
    console.log('\n  Erste 5 Teams:');
    winter2025.slice(0, 5).forEach(ts => {
      console.log(`    - ${ts.group_name} / ${ts.league} (source_url: ${ts.source_url ? '✅' : '❌'})`);
    });
  }
}

checkSeasons();

