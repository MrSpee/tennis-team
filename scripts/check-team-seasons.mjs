#!/usr/bin/env node

/**
 * Prüft welche team_seasons Einträge existieren
 */

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

async function checkTeamSeasons() {
  console.log('🔍 Prüfe team_seasons Einträge...\n');
  
  // Prüfe für VKC Köln 1
  const teamIds = [
    '1aac84b3-d911-471e-9b6f-1f60f0afdf62', // VKC Köln 1
    '501d0a38-73ec-48f3-aa5d-2723f8243f7e', // TG GW im DJK Bocklemünd 1
  ];
  
  for (const teamId of teamIds) {
    console.log(`\n📋 Team ID: ${teamId}`);
    
    const { data: seasons, error } = await supabase
      .from('team_seasons')
      .select('id, team_id, season, group_name, league, source_url, is_active')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
      continue;
    }
    
    if (!seasons || seasons.length === 0) {
      console.log(`   ⚠️  Keine team_seasons Einträge gefunden`);
    } else {
      console.log(`   ✅ ${seasons.length} Einträge gefunden:`);
      seasons.forEach(ts => {
        console.log(`      - Saison: "${ts.season}", Gruppe: "${ts.group_name}", League: "${ts.league}"`);
        console.log(`        Active: ${ts.is_active}, source_url: ${ts.source_url ? '✅' : '❌'}`);
      });
    }
  }
}

checkTeamSeasons();

