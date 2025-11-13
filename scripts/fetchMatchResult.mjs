#!/usr/bin/env node
/**
 * Hilfsscript: Lädt einen konkreten Matchday aus Supabase,
 * ermittelt die TVM-Gruppe und stößt den bestehenden Scraper
 * (`scripts/scrape_tvm_league.mjs`) gezielt für diese Gruppe an.
 *
 * Nutzung:
 *   node scripts/fetchMatchResult.mjs <matchday-id> [--dry-run]
 *
 * Voraussetzung: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY
 * sind (z.B. via `.env`) gesetzt, ebenso optionale Scraper-Env-Variablen.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [, , matchId, ...restArgs] = process.argv;

if (!matchId || matchId.startsWith('-')) {
  console.error('❌ Bitte eine Matchday-ID angeben.');
  console.error('   Beispiel: node scripts/fetchMatchResult.mjs 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

const DRY_RUN = restArgs.includes('--dry-run');

async function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!key) continue;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rest.join('=').trim();
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('⚠️  Konnte .env nicht laden:', error.message);
    }
  }
}

await loadEnv();

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Supabase-Umgebungsvariablen fehlen. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY setzen.');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

const { data: matchday, error } = await supabase
  .from('matchdays')
  .select('id, match_date, start_time, home_team_id, away_team_id, league, group_name, match_number, notes, home_team:team_info!matchdays_home_team_id_fkey(club_name, team_name), away_team:team_info!matchdays_away_team_id_fkey(club_name, team_name)')
  .eq('id', matchId)
  .maybeSingle();

if (error) {
  console.error('❌ Fehler beim Laden des Matchdays:', error.message);
  process.exit(1);
}

if (!matchday) {
  console.error('❌ Kein Matchday mit der ID gefunden:', matchId);
  process.exit(1);
}

const getTeamLabel = (team) => {
  if (!team) return 'Unbekanntes Team';
  return `${team.club_name || 'Unbekannter Verein'}${team.team_name ? ` ${team.team_name}` : ''}`;
};

const groupMatch = matchday.group_name?.match(/Gr\.\s*(\d+)/i);
const normalizedGroup = groupMatch ? String(parseInt(groupMatch[1], 10)) : null;

console.log('🎯 Starte Parser für Matchday:');
console.log('   ID:         ', matchday.id);
console.log('   Heimteam:   ', getTeamLabel(matchday.home_team));
console.log('   Gastteam:   ', getTeamLabel(matchday.away_team));
console.log('   Spieltag:   ', matchday.match_date || 'Unbekannt');
console.log('   Gruppe:     ', matchday.group_name || 'Unbekannt');

if (!normalizedGroup) {
  console.warn('⚠️  Keine Gruppen-Nummer aus group_name extrahiert. Der Scraper läuft ohne --groups Filter (alle Gruppen).');
}

if (DRY_RUN) {
  console.log('ℹ️  Dry-Run aktiviert – Scraper wird NICHT ausgeführt.');
  process.exit(0);
}

const scraperPath = resolve(__dirname, 'scrape_tvm_league.mjs');
const scraperArgs = [scraperPath, '--apply'];
if (normalizedGroup) {
  scraperArgs.push(`--groups=${normalizedGroup}`);
}

console.log('🚀 Rufe Scraper auf:', ['node', ...scraperArgs].join(' '));

const child = spawn('node', scraperArgs, {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Scraper erfolgreich abgeschlossen.');
  } else {
    console.error(`❌ Scraper endete mit Exit-Code ${code}.`);
  }
  process.exit(code ?? 1);
});



