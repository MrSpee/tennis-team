#!/usr/bin/env node
/**
 * Test-Script: Testet den nuLiga-Scraper mit einer einzelnen Gruppe
 * 
 * Usage:
 *   node scripts/test-single-group.mjs 43              # Teste Gruppe 43 (Dry-Run)
 *   node scripts/test-single-group.mjs 43 --apply      # Teste Gruppe 43 und schreibe in DB
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
  console.log('[test-group]', ...messages);
};

// Keine Team-ID-Map, da wir alles neu importieren
const TEAM_ID_MAP = {};

const args = process.argv.slice(2);
const GROUP_ID = args[0];
const APPLY_CHANGES = args.includes('--apply');
const LEAGUE_URL = DEFAULT_LEAGUE_URL;
const SEASON_LABEL = DEFAULT_SEASON_LABEL;
const OUTPUT_DIR = resolve(__dirname, '../tmp');

if (!GROUP_ID) {
  console.error('❌ Bitte eine Gruppen-ID angeben!');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/test-single-group.mjs <GROUP_ID> [--apply]');
  console.error('');
  console.error('Beispiele:');
  console.error('  node scripts/test-single-group.mjs 43              # Dry-Run für Gruppe 43');
  console.error('  node scripts/test-single-group.mjs 43 --apply      # Import für Gruppe 43');
  process.exit(1);
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  
  if (!url) {
    throw new Error('VITE_SUPABASE_URL fehlt in den Umgebungsvariablen.');
  }
  
  if (APPLY_CHANGES) {
    if (!serviceRoleKey) {
      throw new Error('Für --apply wird SUPABASE_SERVICE_ROLE_KEY benötigt.');
    }
    log('🔄  Supabase-Client initialisiert (apply mode mit Service Role).');
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }
  
  // Für Dry-Run brauchen wir keinen Client
  log('ℹ️  Dry-Run Modus: Keine Datenbankänderungen.');
  return null;
}

async function main() {
  try {
    await loadEnvFromFile();
    const supabase = APPLY_CHANGES ? createSupabaseClient() : null;

    log(`🚀 Starte Test für Gruppe ${GROUP_ID}...`);
    log(`   Modus: ${APPLY_CHANGES ? 'APPLY (Datenbankänderungen)' : 'DRY-RUN (nur Vorschau)'}`);
    log(`   League URL: ${LEAGUE_URL}`);
    log(`   Saison: ${SEASON_LABEL}`);
    log('');

    const { results, unmappedTeams, snapshotPath } = await scrapeNuLiga({
      leagueUrl: LEAGUE_URL,
      seasonLabel: SEASON_LABEL,
      groupFilter: GROUP_ID,
      requestDelayMs: REQUEST_DELAY_MS,
      teamIdMap: TEAM_ID_MAP,
      supabaseClient: supabase,
      applyChanges: APPLY_CHANGES,
      outputDir: APPLY_CHANGES ? null : OUTPUT_DIR,
      onLog: log
    });

    log('');
    log('═══════════════════════════════════════════════════════════');
    log('📊 ERGEBNISSE');
    log('═══════════════════════════════════════════════════════════');
    log('');

    if (results.length === 0) {
      log('⚠️  Keine Gruppen gefunden!');
      log('   Mögliche Ursachen:');
      log('   - Gruppen-ID existiert nicht');
      log('   - Falsche Saison oder League URL');
      process.exit(1);
    }

    results.forEach((result, idx) => {
      const group = result.group || {};
      log(`📁 Gruppe ${idx + 1}: ${group.groupName || 'Unbekannt'}`);
      log(`   ID: ${group.groupId || 'N/A'}`);
      log(`   Liga: ${group.league || 'N/A'}`);
      log(`   Kategorie: ${group.category || 'N/A'}`);
      log(`   Teams: ${result.teamCount || 0}`);
      log(`   Matches: ${result.matches?.length || 0}`);
      log(`   Tabellenzeilen: ${result.standings?.length || 0}`);
      
      if (result.unmappedTeams && result.unmappedTeams.length > 0) {
        log(`   ⚠️  Unbekannte Teams (${result.unmappedTeams.length}):`);
        result.unmappedTeams.forEach(team => {
          log(`      - ${team}`);
        });
      }
      
      if (result.matches && result.matches.length > 0) {
        log(`   📅 Beispiel-Matches:`);
        result.matches.slice(0, 3).forEach(match => {
          log(`      - ${match.homeTeam || 'N/A'} vs ${match.awayTeam || 'N/A'} (${match.date || 'N/A'})`);
        });
        if (result.matches.length > 3) {
          log(`      ... und ${result.matches.length - 3} weitere`);
        }
      }
      
      if (result.teamsDetailed && result.teamsDetailed.length > 0) {
        log(`   👥 Teams gefunden:`);
        result.teamsDetailed.slice(0, 5).forEach(team => {
          log(`      - ${team.clubName || 'N/A'} ${team.teamSuffix || ''} (${team.category || 'N/A'})`);
        });
        if (result.teamsDetailed.length > 5) {
          log(`      ... und ${result.teamsDetailed.length - 5} weitere`);
        }
      }
      
      log('');
    });

    if (unmappedTeams && unmappedTeams.length > 0) {
      log('⚠️  GLOBAL: Unbekannte Teams gefunden:');
      Array.from(unmappedTeams).forEach(team => {
        log(`   - ${team}`);
      });
      log('');
      log('💡 Diese Teams müssen manuell zugeordnet werden, bevor der Import durchgeführt wird.');
      log('');
    }

    if (!APPLY_CHANGES && snapshotPath) {
      log(`💾 Snapshot gespeichert: ${snapshotPath}`);
      log('');
    }

    if (APPLY_CHANGES) {
      log('✅ Daten wurden in die Datenbank geschrieben!');
      log('');
      log('Nächste Schritte:');
      log('1. Prüfe die importierten Teams in der Datenbank');
      log('2. Prüfe die importierten Matches');
      log('3. Teste weitere Gruppen falls nötig');
    } else {
      log('✅ Dry-Run erfolgreich abgeschlossen!');
      log('');
      log('Nächste Schritte:');
      log('1. Prüfe die obigen Ergebnisse');
      log('2. Falls alles korrekt aussieht, führe mit --apply aus:');
      log(`   node scripts/test-single-group.mjs ${GROUP_ID} --apply`);
    }

  } catch (error) {
    console.error('');
    console.error('❌ FEHLER:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack Trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

await main();

