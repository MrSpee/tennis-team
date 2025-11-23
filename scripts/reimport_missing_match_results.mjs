#!/usr/bin/env node
/**
 * Script zum Re-Import fehlender Match-Ergebnisse
 * 
 * Findet alle Matchdays mit meeting_id aber ohne match_results
 * und versucht, die Ergebnisse erneut zu importieren.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Environment Variables
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (error) {
    console.warn('⚠️ Konnte .env.local nicht laden, versuche .env...');
    try {
      const envPath2 = join(__dirname, '..', '.env');
      const envContent = readFileSync(envPath2, 'utf-8');
      const env = {};
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
      return env;
    } catch (error2) {
      console.error('❌ Konnte keine .env Datei laden');
      process.exit(1);
    }
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL oder SUPABASE_ANON_KEY nicht gefunden');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE_URL = process.env.API_BASE_URL || 'https://tennis-team-gamma.vercel.app';

async function checkApiAvailability() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/import/meeting-report`, {
      method: 'OPTIONS'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function reimportMatchResults(matchday) {
  const { id, meeting_id, home_team_id, away_team_id, match_date, group_name, league, season } = matchday;
  
  console.log(`\n🔍 Re-Import für Matchday ${id} (Match #${matchday.match_number}, meeting_id: ${meeting_id})...`);
  console.log(`   Teams: ${matchday.home_team} vs ${matchday.away_team}`);
  console.log(`   Datum: ${match_date}, Gruppe: ${group_name}, Liga: ${league}`);
  
  try {
    // Lade Team-Namen für Payload
    const { data: homeTeam } = await supabase
      .from('team_info')
      .select('club_name, team_name')
      .eq('id', home_team_id)
      .maybeSingle();
    
    const { data: awayTeam } = await supabase
      .from('team_info')
      .select('club_name, team_name')
      .eq('id', away_team_id)
      .maybeSingle();
    
    const homeTeamLabel = homeTeam ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim() : 'Unbekannt';
    const awayTeamLabel = awayTeam ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim() : 'Unbekannt';
    
    // Extrahiere groupId aus group_name
    const groupIdMatch = group_name?.match(/Gr\.\s*(\d+)/i) || group_name?.match(/(\d{3})/);
    const groupId = groupIdMatch ? groupIdMatch[1] : null;
    
    if (!groupId) {
      console.warn(`   ⚠️ Konnte groupId nicht aus group_name "${group_name}" extrahieren`);
      return { success: false, error: 'Keine groupId gefunden' };
    }
    
    // Lade source_url aus team_seasons
    let leagueUrl = null;
    const { data: teamSeason } = await supabase
      .from('team_seasons')
      .select('source_url')
      .eq('group_name', group_name)
      .eq('season', season)
      .eq('league', league)
      .not('source_url', 'is', null)
      .limit(1)
      .maybeSingle();
    
    if (teamSeason?.source_url) {
      leagueUrl = teamSeason.source_url;
      console.log(`   ✅ source_url gefunden: ${leagueUrl}`);
    } else {
      // Bestimme Fallback-URL
      let championship;
      if (league.includes('Köln-Leverkusen')) {
        championship = 'K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
      } else {
        championship = 'TVM+Winter+2025%2F2026';
      }
      
      const baseUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${championship}`;
      // Versuche beide Tab-Seiten
      leagueUrl = `${baseUrl}&tab=2`; // Starte mit tab=2
      console.log(`   ⚠️ Keine source_url, verwende Fallback: ${leagueUrl}`);
    }
    
    // Rufe API auf
    const payload = {
      matchdayId: id,
      meetingId: meeting_id,
      homeTeam: homeTeamLabel,
      awayTeam: awayTeamLabel,
      matchDate: match_date,
      groupId: groupId,
      leagueUrl: leagueUrl
    };
    
    console.log(`   📤 Sende Request an API...`);
    const response = await fetch(`${API_BASE_URL}/api/import/meeting-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const rawText = await response.text();
    let result;
    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      console.error(`   ❌ JSON Parse Error:`, parseError.message);
      console.error(`   Response:`, rawText.substring(0, 500));
      return { success: false, error: 'JSON Parse Error' };
    }
    
    if (!response.ok || !result?.success) {
      const errorMsg = result?.error || `HTTP ${response.status}`;
      const errorDetails = result?.errorDetails || result?.applyResult?.errorDetails;
      const errorCode = result?.errorCode;
      
      console.error(`   ❌ API Error:`, errorMsg);
      if (errorCode) {
        console.error(`   Error Code: ${errorCode}`);
      }
      if (errorDetails && errorDetails.length > 0) {
        console.error(`   Error Details:`, errorDetails.slice(0, 3).join('; '));
        if (errorDetails.length > 3) {
          console.error(`   ... und ${errorDetails.length - 3} weitere`);
        }
      }
      
      return { 
        success: false, 
        error: errorMsg,
        errorCode,
        errorDetails: errorDetails?.slice(0, 5) // Nur erste 5 Details
      };
    }
    
    const applyResult = result?.applyResult || result?.data;
    const insertedCount = applyResult?.inserted?.length || 0;
    const missingPlayersCount = applyResult?.missingPlayers?.length || 0;
    const hasError = applyResult?.error ? true : false;
    
    if (insertedCount > 0) {
      console.log(`   ✅ ${insertedCount} Ergebnisse importiert`);
      if (missingPlayersCount > 0) {
        console.log(`   ⚠️ ${missingPlayersCount} Spieler konnten nicht zugeordnet werden`);
      }
      if (hasError) {
        console.warn(`   ⚠️ Warnung: ${applyResult.error}`);
      }
      return { success: true, inserted: insertedCount, missingPlayers: missingPlayersCount };
    } else {
      const errorMsg = applyResult?.error || 'Keine Ergebnisse importiert';
      const errorDetails = applyResult?.errorDetails;
      const skippedMatches = applyResult?.skippedMatches;
      
      console.warn(`   ⚠️ Keine Ergebnisse importiert`);
      console.warn(`   Grund: ${errorMsg}`);
      if (errorDetails && errorDetails.length > 0) {
        console.warn(`   Details:`, errorDetails.slice(0, 3).join('; '));
      }
      if (skippedMatches && skippedMatches.length > 0) {
        console.warn(`   Übersprungene Matches: ${skippedMatches.length}`);
      }
      
      return { 
        success: false, 
        error: errorMsg, 
        missingPlayers: missingPlayersCount,
        errorDetails: errorDetails?.slice(0, 5),
        skippedMatches: skippedMatches?.length || 0
      };
    }
  } catch (error) {
    console.error(`   ❌ Fehler:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starte Re-Import fehlender Match-Ergebnisse...\n');
  
  // Prüfe API-Verfügbarkeit
  console.log('🔍 Prüfe API-Verfügbarkeit...');
  const apiAvailable = await checkApiAvailability();
  if (!apiAvailable) {
    console.error(`❌ API nicht verfügbar: ${API_BASE_URL}`);
    process.exit(1);
  }
  console.log(`✅ API verfügbar: ${API_BASE_URL}\n`);
  
  // Lade alle Matchdays mit meeting_id aber ohne Ergebnisse
  console.log('📊 Lade Matchdays mit meeting_id aber ohne Ergebnisse...');
  const { data: matchdays, error } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      match_number,
      meeting_id,
      group_name,
      league,
      season,
      home_team_id,
      away_team_id,
      home_team:team_info!matchdays_home_team_id_fkey(club_name, team_name),
      away_team:team_info!matchdays_away_team_id_fkey(club_name, team_name)
    `)
    .eq('status', 'completed')
    .not('meeting_id', 'is', null)
    .order('match_date', { ascending: false });
  
  if (error) {
    console.error('❌ Fehler beim Laden der Matchdays:', error);
    process.exit(1);
  }
  
  // Prüfe welche Matchdays keine Ergebnisse haben
  const matchdaysWithoutResults = [];
  for (const md of matchdays || []) {
    const { count } = await supabase
      .from('match_results')
      .select('*', { count: 'exact', head: true })
      .eq('matchday_id', md.id);
    
    if (count === 0) {
      matchdaysWithoutResults.push({
        ...md,
        home_team: md.home_team ? `${md.home_team.club_name} ${md.home_team.team_name || ''}`.trim() : 'Unbekannt',
        away_team: md.away_team ? `${md.away_team.club_name} ${md.away_team.team_name || ''}`.trim() : 'Unbekannt'
      });
    }
  }
  
  console.log(`✅ ${matchdaysWithoutResults.length} Matchdays ohne Ergebnisse gefunden\n`);
  
  if (matchdaysWithoutResults.length === 0) {
    console.log('✅ Alle Matchdays haben Ergebnisse!');
    return;
  }
  
  // Re-Import für jeden Matchday
  let successCount = 0;
  let failedCount = 0;
  const errors = [];
  
  for (let i = 0; i < matchdaysWithoutResults.length; i++) {
    const matchday = matchdaysWithoutResults[i];
    console.log(`\n[${i + 1}/${matchdaysWithoutResults.length}]`);
    
    const result = await reimportMatchResults(matchday);
    
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
      errors.push({
        matchdayId: matchday.id,
        matchNumber: matchday.match_number,
        meetingId: matchday.meeting_id,
        error: result.error
      });
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Zusammenfassung
  console.log('\n' + '='.repeat(60));
  console.log('📊 ZUSAMMENFASSUNG');
  console.log('='.repeat(60));
  console.log(`✅ Erfolgreich: ${successCount}`);
  console.log(`❌ Fehlgeschlagen: ${failedCount}`);
  console.log(`📋 Gesamt: ${matchdaysWithoutResults.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Fehler-Details:');
    errors.slice(0, 10).forEach(err => {
      console.log(`   - Match #${err.matchNumber} (meeting_id: ${err.meetingId}): ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... und ${errors.length - 10} weitere`);
    }
  }
}

main().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

