#!/usr/bin/env node
/**
 * Scrapes nuLiga (TVM) league pages and optionally upserts the data into Supabase.
 *
 * Usage examples:
 *   node scripts/scrape_tvm_league.mjs                      # dry-run (no Supabase writes)
 *   node scripts/scrape_tvm_league.mjs --groups=43,46       # limit to specific groups
 *   node scripts/scrape_tvm_league.mjs --apply              # write data to Supabase
 *   node scripts/scrape_tvm_league.mjs --apply --season="Winter 2025/26"
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import {
  scrapeNuLiga,
  DEFAULT_LEAGUE_URL,
  DEFAULT_SEASON_LABEL
} from '../lib/nuligaScraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REQUEST_DELAY_MS = 350;

const log = (...messages) => {
  console.log('[tvm-scraper]', ...messages);
};

const TEAM_ID_MAP = {
  'SV Rot-Gelb Sürth 1': 'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  'TG Leverkusen 2': '06ee529a-18cf-4a30-bbe0-f7096314721e',
  'TC Colonius 3': 'd9660a5e-c08a-4586-97c5-14f9f0780457',
  'TV Ensen Westhoven 1': '19095c7a-4af4-45ab-b75c-6b82be78975a',
  'TC Ford Köln 2': '5f301d5a-2e19-42b4-b6be-b65b0def59cc',
  'TV Dellbrück 1': '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b',
  'VKC Köln 1': '235fade5-0974-4f5b-a758-536f771a5e80',
  'KölnerTHC Stadion RW 2': '6a3d2af0-19ca-4e89-88e1-4b5ef2401563',
  'TC Ford Köln 1': 'ca3eb684-f211-4c21-999e-693c1f090515',
  'TG GW im DJK Bocklemünd 1': '24a50fa0-2476-4118-a107-4098ffcdd934'
};

const args = process.argv.slice(2);
const APPLY_CHANGES = args.includes('--apply');
const GROUP_FILTER = getArgValue('--groups');
const LEAGUE_URL = getArgValue('--league') || DEFAULT_LEAGUE_URL;
const SEASON_LABEL = getArgValue('--season') || DEFAULT_SEASON_LABEL;
const OUTPUT_DIR = resolve(__dirname, '../tmp');

function getArgValue(flag) {
  const argWithEquals = args.find((value) => value.startsWith(`${flag}=`));
  if (argWithEquals) {
    return argWithEquals.split('=').slice(1).join('=');
  }
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    const next = args[index + 1];
    if (!next.startsWith('--')) {
      return next;
    }
  }
  return null;
}

async function loadEnvFromFile() {
  const envPath = resolve(__dirname, '../.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (!key) return;
      if (process.env[key] !== undefined) return;
      process.env[key] = rest.join('=').trim();
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log('⚠️  Konnte .env nicht laden:', error.message);
    }
  }
}

function createSupabaseClient() {
      const url = process.env.VITE_SUPABASE_URL;
      const key = process.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) {
        if (APPLY_CHANGES) {
          throw new Error('Supabase-Umgebungsvariablen fehlen. Bitte .env konfigurieren oder ohne --apply ausführen.');
        }
        log('ℹ️  Supabase-Client nicht initialisiert (fehlende ENV). Verwende nur lokale Team-Zuordnung.');
        return null;
      }
      if (APPLY_CHANGES) {
        log('🔄  Supabase-Client initialisiert (apply mode).');
      }
      return createClient(url, key);
}

async function main() {
  try {
    await loadEnvFromFile();
    const supabase = createSupabaseClient();

    const { results, unmappedTeams, snapshotPath } = await scrapeNuLiga({
        leagueUrl: LEAGUE_URL,
      seasonLabel: SEASON_LABEL,
      groupFilter: GROUP_FILTER,
      requestDelayMs: REQUEST_DELAY_MS,
      teamIdMap: TEAM_ID_MAP,
      supabaseClient: supabase,
      applyChanges: APPLY_CHANGES,
      outputDir: APPLY_CHANGES ? null : OUTPUT_DIR,
      onLog: log
    });

    if (!APPLY_CHANGES && snapshotPath) {
      log('Snapshot gespeichert unter:', snapshotPath);
    }

    if (unmappedTeams.length > 0) {
      log('⚠️  Unbekannte Teams gefunden. Bitte TEAM_ID_MAP erweitern:', unmappedTeams.join(', '));
    }

    log(
      'Zusammenfassung:',
      `${results.length} Gruppen verarbeitet · ${results.reduce((sum, g) => sum + (g.matches?.length || 0), 0)} Matches`
    );
    log(
      'Fertig. Modus:',
      APPLY_CHANGES ? 'APPLY (Supabase aktualisiert)' : 'DRY-RUN (keine Datenbankänderungen)'
    );
  } catch (error) {
    console.error('[tvm-scraper] ❌ Fehler:', error);
    process.exit(1);
  }
}

await main();
