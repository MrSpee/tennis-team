/**
 * Script: Find Missing Meeting IDs
 * 
 * Empfehlung 2: Versucht, meeting_id für Spieltage ohne meeting_id zu finden
 * 
 * Dieses Script:
 * 1. Findet alle vergangenen Spieltage ohne meeting_id
 * 2. Versucht, die meeting_id aus nuLiga zu extrahieren
 * 3. Aktualisiert die matchdays in der Datenbank
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeNuLiga } from '../lib/nuligaScraper.mjs';

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

async function findMatchdaysWithoutMeetingId() {
  console.log('🔍 Suche Spieltage ohne meeting_id...\n');
  
  const { data, error } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      status,
      home_team_id,
      away_team_id,
      season,
      league,
      group_name,
      home_team:home_team_id(id, club_name, team_name, category),
      away_team:away_team_id(id, club_name, team_name, category)
    `)
    .is('meeting_id', null)
    .lt('match_date', new Date().toISOString())
    .order('match_date', { ascending: false });
  
  if (error) {
    console.error('❌ Fehler beim Laden der Spieltage:', error);
    return [];
  }
  
  console.log(`✅ ${data?.length || 0} Spieltage ohne meeting_id gefunden\n`);
  return data || [];
}

async function findMeetingIdForMatchday(matchday) {
  const homeTeamName = `${matchday.home_team?.club_name || ''} ${matchday.home_team?.team_name || ''}`.trim();
  const awayTeamName = `${matchday.away_team?.club_name || ''} ${matchday.away_team?.team_name || ''}`.trim();
  
  console.log(`🔍 Suche meeting_id für: ${homeTeamName} vs. ${awayTeamName}`);
  console.log(`   Datum: ${new Date(matchday.match_date).toLocaleDateString('de-DE')}`);
  console.log(`   Season: ${matchday.season || 'unbekannt'}`);
  console.log(`   League: ${matchday.league || 'unbekannt'}`);
  console.log(`   Group: ${matchday.group_name || 'unbekannt'}`);
  
  try {
    // Versuche, die Gruppe zu finden und zu scrapen
    // TODO: Hier müsste die leagueUrl aus der group_name oder season abgeleitet werden
    // Für jetzt: Versuche mit der Standard-URL
    
    // Extrahiere groupId aus group_name (z.B. "Gr. 046" -> "046")
    const groupIdMatch = matchday.group_name?.match(/Gr\.\s*(\d+)/i);
    const groupId = groupIdMatch ? groupIdMatch[1] : null;
    
    if (!groupId) {
      console.log(`   ⚠️  Keine Group-ID gefunden in "${matchday.group_name}"`);
      return { success: false, error: 'Keine Group-ID gefunden' };
    }
    
    console.log(`   🔍 Scrape nuLiga für Group ${groupId}...`);
    
    // Scrape nuLiga (vereinfacht - müsste mit der richtigen leagueUrl aufgerufen werden)
    // TODO: Die leagueUrl sollte aus der season/league abgeleitet werden
    // Für jetzt: Nutze die Standard-URL oder eine aus der DB gespeicherte URL
    
    // Versuche, die leagueUrl aus team_seasons oder scraper_snapshots zu finden
    const { data: teamSeason } = await supabase
      .from('team_seasons')
      .select('league, group_name, season')
      .eq('season', matchday.season || '')
      .eq('group_name', matchday.group_name || '')
      .limit(1)
      .maybeSingle();
    
    // TODO: Implementiere die tatsächliche Suche nach meeting_id
    // Dies erfordert:
    // 1. Die richtige leagueUrl zu finden
    // 2. Die Gruppe zu scrapen
    // 3. Das Match zu finden (basierend auf homeTeam, awayTeam, matchDate)
    // 4. Die meeting_id zu extrahieren
    
    console.log(`   ⚠️  Suche nach meeting_id noch nicht vollständig implementiert`);
    console.log(`   💡 Hinweis: Dies erfordert die leagueUrl und das Scrapen der Gruppe`);
    
    return { success: false, error: 'Noch nicht implementiert - erfordert leagueUrl' };
    
  } catch (error) {
    console.error(`   ❌ Fehler beim Suchen:`, error.message);
    return { success: false, error: error.message };
  }
}

async function updateMatchdayMeetingId(matchdayId, meetingId, meetingReportUrl) {
  const updateData = {
    meeting_id: meetingId
  };
  
  if (meetingReportUrl) {
    updateData.meeting_report_url = meetingReportUrl;
  }
  
  const { error } = await supabase
    .from('matchdays')
    .update(updateData)
    .eq('id', matchdayId);
  
  if (error) {
    console.error(`   ❌ Fehler beim Update:`, error.message);
    return false;
  }
  
  console.log(`   ✅ meeting_id aktualisiert: ${meetingId}`);
  return true;
}

async function main() {
  console.log('🚀 Starte Suche nach fehlenden meeting_ids...\n');
  console.log('='.repeat(80));
  
  const matchdays = await findMatchdaysWithoutMeetingId();
  
  if (matchdays.length === 0) {
    console.log('\n✅ Keine Spieltage ohne meeting_id gefunden!');
    return;
  }
  
  console.log(`\n📋 Gefundene Spieltage:\n`);
  matchdays.slice(0, 10).forEach((md, index) => {
    const homeTeam = `${md.home_team?.club_name || ''} ${md.home_team?.team_name || ''}`.trim();
    const awayTeam = `${md.away_team?.club_name || ''} ${md.away_team?.team_name || ''}`.trim();
    console.log(`  ${index + 1}. ${homeTeam} vs. ${awayTeam} (${new Date(md.match_date).toLocaleDateString('de-DE')})`);
  });
  
  if (matchdays.length > 10) {
    console.log(`  ... und ${matchdays.length - 10} weitere`);
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  console.log(`⚠️  HINWEIS: Die automatische Suche nach meeting_ids ist noch nicht vollständig implementiert.`);
  console.log(`   Sie erfordert:\n`);
  console.log(`   1. Die richtige leagueUrl für jede Season/League`);
  console.log(`   2. Das Scrapen der Gruppe aus nuLiga`);
  console.log(`   3. Das Finden des Matches basierend auf Teams und Datum`);
  console.log(`   4. Die Extraktion der meeting_id\n`);
  console.log(`   💡 Alternative: Nutze das Script fix_missing_meeting_ids.mjs, das bereits existiert.\n`);
  
  // TODO: Implementiere die tatsächliche Suche, wenn leagueUrl verfügbar ist
  // Für jetzt: Zeige nur die gefundenen Spieltage an
  
  const results = {
    total: matchdays.length,
    found: 0,
    notFound: 0,
    errors: []
  };
  
  // TODO: Implementiere die tatsächliche Suche
  // for (let i = 0; i < matchdays.length; i++) {
  //   const matchday = matchdays[i];
  //   console.log(`\n[${i + 1}/${matchdays.length}]`);
  //   
  //   const result = await findMeetingIdForMatchday(matchday);
  //   
  //   if (result.success && result.meetingId) {
  //     const updated = await updateMatchdayMeetingId(matchday.id, result.meetingId, result.meetingReportUrl);
  //     if (updated) {
  //       results.found++;
  //     } else {
  //       results.errors.push({ matchdayId: matchday.id, error: 'Update fehlgeschlagen' });
  //     }
  //   } else {
  //     results.notFound++;
  //     results.errors.push({ matchdayId: matchday.id, error: result.error });
  //   }
  // }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 ZUSAMMENFASSUNG:\n');
  console.log(`   Gesamt: ${results.total}`);
  console.log(`   ✅ Gefunden: ${results.found}`);
  console.log(`   ❌ Nicht gefunden: ${results.notFound}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Fehler-Details:\n`);
    results.errors.slice(0, 10).forEach(err => {
      console.log(`   - Matchday ${err.matchdayId}: ${err.error}`);
    });
  }
  
  console.log('\n✅ Analyse abgeschlossen!\n');
}

main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

