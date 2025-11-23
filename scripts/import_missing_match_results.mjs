/**
 * Script: Import Missing Match Results
 * 
 * Empfehlung 1: Importiert Ergebnisse für Spieltage mit meeting_id aber ohne Ergebnisse
 * 
 * Dieses Script:
 * 1. Findet alle vergangenen Spieltage mit meeting_id aber ohne Ergebnisse
 * 2. Ruft für jeden Spieltag den /api/import/meeting-report Endpoint auf
 * 3. Importiert die Ergebnisse in die Datenbank
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Node.js 18+ hat fetch nativ verfügbar
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env Datei
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  .env nicht gefunden, verwende Umgebungsvariablen');
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API Base URL (lokal oder Production)
// WICHTIG: Für lokale Entwicklung muss der Vercel Dev-Server laufen
// Oder verwende die Production-URL: https://tennis-team-gamma.vercel.app
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://tennis-team-gamma.vercel.app';

console.log(`🌐 Verwende API Base URL: ${API_BASE_URL}`);

async function findMatchdaysWithMeetingIdButNoResults() {
  console.log('🔍 Suche Spieltage mit meeting_id aber ohne Ergebnisse...\n');
  
  const { data, error } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      meeting_id,
      status,
      home_team_id,
      away_team_id,
      home_team:home_team_id(id, club_name, team_name),
      away_team:away_team_id(id, club_name, team_name)
    `)
    .not('meeting_id', 'is', null)
    .lt('match_date', new Date().toISOString())
    .order('match_date', { ascending: false });
  
  if (error) {
    console.error('❌ Fehler beim Laden der Spieltage:', error);
    return [];
  }
  
  // Filtere nur die ohne Ergebnisse
  const matchdaysWithoutResults = [];
  for (const matchday of data || []) {
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('id')
      .eq('matchday_id', matchday.id)
      .limit(1);
    
    if (resultsError) {
      console.warn(`⚠️  Fehler beim Prüfen der Ergebnisse für ${matchday.id}:`, resultsError.message);
      continue;
    }
    
    if (!results || results.length === 0) {
      matchdaysWithoutResults.push(matchday);
    }
  }
  
  console.log(`✅ ${matchdaysWithoutResults.length} Spieltage mit meeting_id aber ohne Ergebnisse gefunden\n`);
  return matchdaysWithoutResults;
}

async function importMatchResultsForMatchday(matchday) {
  const homeTeamName = `${matchday.home_team?.club_name || ''} ${matchday.home_team?.team_name || ''}`.trim();
  const awayTeamName = `${matchday.away_team?.club_name || ''} ${matchday.away_team?.team_name || ''}`.trim();
  
  console.log(`📥 Importiere Ergebnisse für: ${homeTeamName} vs. ${awayTeamName}`);
  console.log(`   Datum: ${new Date(matchday.match_date).toLocaleDateString('de-DE')}`);
  console.log(`   Meeting ID: ${matchday.meeting_id}`);
  console.log(`   Matchday ID: ${matchday.id}`);
  
  try {
    // Rufe API-Endpoint auf
    const apiUrl = `${API_BASE_URL}/api/import/meeting-report`;
    
    // Prüfe ob API erreichbar ist
    console.log(`   🔗 API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: matchday.meeting_id,
        matchdayId: matchday.id,
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        apply: true // WICHTIG: Daten tatsächlich speichern
      }),
      // Timeout für fetch (30 Sekunden)
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok && response.status === 404) {
      // API-Route existiert nicht - möglicherweise läuft der Server nicht
      throw new Error(`API-Route nicht gefunden (404). Ist der Server unter ${API_BASE_URL} erreichbar?`);
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      if (result.errorCode === 'MEETING_NOT_FOUND' || result.errorCode === 'MEETING_ID_NOT_AVAILABLE') {
        console.log(`   ⚠️  Meeting-Report nicht verfügbar (${result.errorCode})`);
        return { success: false, reason: result.errorCode, error: result.error };
      }
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    
    if (!result.success) {
      console.log(`   ⚠️  Import fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`);
      return { success: false, error: result.error };
    }
    
    if (result.applyResult) {
      const inserted = result.applyResult.inserted?.length || 0;
      const missingPlayers = result.applyResult.missingPlayers?.length || 0;
      console.log(`   ✅ ${inserted} Ergebnisse importiert`);
      if (missingPlayers > 0) {
        console.log(`   ⚠️  ${missingPlayers} Spieler konnten nicht zugeordnet werden`);
      }
      return { success: true, inserted, missingPlayers };
    } else {
      console.log(`   ⚠️  Keine Ergebnisse zum Importieren gefunden`);
      return { success: false, error: 'Keine Ergebnisse gefunden' };
    }
  } catch (error) {
    // Detaillierte Fehlerbehandlung
    if (error.name === 'AbortError') {
      console.error(`   ❌ Timeout: API hat nicht innerhalb von 30 Sekunden geantwortet`);
      return { success: false, error: 'Timeout: API nicht erreichbar' };
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`   ❌ Verbindungsfehler: API unter ${API_BASE_URL} ist nicht erreichbar`);
      console.error(`   💡 Tipp: Stelle sicher, dass der Vercel-Server läuft oder verwende die Production-URL`);
      return { success: false, error: `API nicht erreichbar: ${error.message}` };
    } else if (error.message.includes('fetch failed')) {
      console.error(`   ❌ Netzwerkfehler: ${error.message}`);
      console.error(`   💡 Tipp: Prüfe deine Internetverbindung oder ob die API erreichbar ist`);
      return { success: false, error: `Netzwerkfehler: ${error.message}` };
    } else {
      console.error(`   ❌ Fehler beim Import:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  console.log('🚀 Starte Import fehlender Match-Ergebnisse...\n');
  console.log('='.repeat(80));
  console.log(`🌐 API Base URL: ${API_BASE_URL}\n`);
  
  // Prüfe ob API erreichbar ist
  try {
    console.log('🔍 Prüfe API-Verfügbarkeit...');
    const healthCheck = await fetch(`${API_BASE_URL}/api/import/meeting-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
      signal: AbortSignal.timeout(5000)
    }).catch(() => null);
    
    if (!healthCheck) {
      console.error(`\n❌ FEHLER: API unter ${API_BASE_URL} ist nicht erreichbar!`);
      console.error(`\n💡 Mögliche Lösungen:`);
      console.error(`   1. Für lokale Entwicklung: Starte 'vercel dev' im Projekt-Root`);
      console.error(`   2. Oder setze API_BASE_URL auf die Production-URL:`);
      console.error(`      export API_BASE_URL=https://tennis-team-gamma.vercel.app`);
      console.error(`   3. Oder verwende die Production-URL direkt im Script\n`);
      process.exit(1);
    }
    console.log('✅ API ist erreichbar\n');
  } catch (error) {
    console.error(`\n❌ FEHLER: API-Verfügbarkeitsprüfung fehlgeschlagen: ${error.message}\n`);
    process.exit(1);
  }
  
  const matchdays = await findMatchdaysWithMeetingIdButNoResults();
  
  if (matchdays.length === 0) {
    console.log('\n✅ Keine Spieltage zum Importieren gefunden!');
    return;
  }
  
  console.log(`\n📋 Gefundene Spieltage:\n`);
  matchdays.forEach((md, index) => {
    const homeTeam = `${md.home_team?.club_name || ''} ${md.home_team?.team_name || ''}`.trim();
    const awayTeam = `${md.away_team?.club_name || ''} ${md.away_team?.team_name || ''}`.trim();
    console.log(`  ${index + 1}. ${homeTeam} vs. ${awayTeam} (${new Date(md.match_date).toLocaleDateString('de-DE')}) - Meeting ID: ${md.meeting_id}`);
  });
  
  console.log(`\n${'='.repeat(80)}\n`);
  console.log(`⚠️  Möchtest du wirklich ${matchdays.length} Spieltage importieren?`);
  console.log(`   Drücke Ctrl+C zum Abbrechen, oder Enter zum Fortfahren...\n`);
  
  // Warte auf User-Input (optional - kann auch automatisch laufen)
  // await new Promise(resolve => {
  //   process.stdin.once('data', () => resolve());
  // });
  
  const results = {
    total: matchdays.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  for (let i = 0; i < matchdays.length; i++) {
    const matchday = matchdays[i];
    console.log(`\n[${i + 1}/${matchdays.length}]`);
    
    const result = await importMatchResultsForMatchday(matchday);
    
    if (result.success) {
      results.success++;
    } else if (result.reason === 'MEETING_NOT_FOUND' || result.reason === 'MEETING_ID_NOT_AVAILABLE') {
      results.skipped++;
    } else {
      results.failed++;
      results.errors.push({
        matchdayId: matchday.id,
        meetingId: matchday.meeting_id,
        error: result.error
      });
    }
    
    // Kurze Pause zwischen Imports (um API nicht zu überlasten)
    if (i < matchdays.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 ZUSAMMENFASSUNG:\n');
  console.log(`   Gesamt: ${results.total}`);
  console.log(`   ✅ Erfolgreich: ${results.success}`);
  console.log(`   ⚠️  Übersprungen (nicht verfügbar): ${results.skipped}`);
  console.log(`   ❌ Fehlgeschlagen: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Fehler-Details:\n`);
    results.errors.forEach(err => {
      console.log(`   - Matchday ${err.matchdayId} (Meeting ID: ${err.meetingId}): ${err.error}`);
    });
  }
  
  console.log('\n✅ Import abgeschlossen!\n');
}

main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

