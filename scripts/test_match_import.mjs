#!/usr/bin/env node
/**
 * Test-Script für manuelles Testen von Match-Import
 * 
 * Testet den Import eines spezifischen Matches und gibt detaillierte Informationen zurück.
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

async function testMatchImport(matchdayId) {
  console.log(`\n🔍 Teste Match-Import für Matchday ${matchdayId}...\n`);
  
  // Lade Matchday-Daten
  const { data: matchday, error: matchdayError } = await supabase
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
    .eq('id', matchdayId)
    .maybeSingle();
  
  if (matchdayError || !matchday) {
    console.error(`❌ Fehler beim Laden des Matchdays:`, matchdayError?.message || 'Matchday nicht gefunden');
    return;
  }
  
  console.log(`📋 Matchday-Daten:`);
  console.log(`   ID: ${matchday.id}`);
  console.log(`   Match #${matchday.match_number}`);
  console.log(`   Meeting-ID: ${matchday.meeting_id || 'NULL'}`);
  console.log(`   Datum: ${matchday.match_date}`);
  console.log(`   Gruppe: ${matchday.group_name}`);
  console.log(`   Liga: ${matchday.league}`);
  console.log(`   Teams: ${matchday.home_team ? `${matchday.home_team.club_name} ${matchday.home_team.team_name || ''}`.trim() : 'Unbekannt'} vs ${matchday.away_team ? `${matchday.away_team.club_name} ${matchday.away_team.team_name || ''}`.trim() : 'Unbekannt'}`);
  
  if (!matchday.meeting_id) {
    console.error(`\n❌ Keine meeting_id vorhanden!`);
    return;
  }
  
  // Extrahiere groupId
  const groupIdMatch = matchday.group_name?.match(/Gr\.\s*(\d+)/i) || matchday.group_name?.match(/(\d{3})/);
  const groupId = groupIdMatch ? groupIdMatch[1] : null;
  
  if (!groupId) {
    console.error(`\n❌ Konnte groupId nicht aus "${matchday.group_name}" extrahieren!`);
    return;
  }
  
  // Lade source_url
  let leagueUrl = null;
  const { data: teamSeason } = await supabase
    .from('team_seasons')
    .select('source_url')
    .eq('group_name', matchday.group_name)
    .eq('season', matchday.season)
    .eq('league', matchday.league)
    .not('source_url', 'is', null)
    .limit(1)
    .maybeSingle();
  
  if (teamSeason?.source_url) {
    leagueUrl = teamSeason.source_url;
    console.log(`\n✅ source_url gefunden: ${leagueUrl}`);
  } else {
    // Fallback-URL
    let championship;
    if (matchday.league.includes('Köln-Leverkusen')) {
      championship = 'K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
    } else {
      championship = 'TVM+Winter+2025%2F2026';
    }
    leagueUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=${championship}&tab=2`;
    console.log(`\n⚠️ Keine source_url, verwende Fallback: ${leagueUrl}`);
  }
  
  const homeTeamLabel = matchday.home_team ? `${matchday.home_team.club_name} ${matchday.home_team.team_name || ''}`.trim() : 'Unbekannt';
  const awayTeamLabel = matchday.away_team ? `${matchday.away_team.club_name} ${matchday.away_team.team_name || ''}`.trim() : 'Unbekannt';
  
  // Teste API-Call
  console.log(`\n📤 Sende Request an API...`);
  const payload = {
    matchdayId: matchday.id,
    meetingId: matchday.meeting_id,
    homeTeam: homeTeamLabel,
    awayTeam: awayTeamLabel,
    matchDate: matchday.match_date,
    groupId: groupId,
    leagueUrl: leagueUrl,
    apply: true
  };
  
  console.log(`   Payload:`, JSON.stringify(payload, null, 2));
  
  try {
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
      console.error(`\n❌ JSON Parse Error:`, parseError.message);
      console.error(`   Response (first 1000 chars):`, rawText.substring(0, 1000));
      return;
    }
    
    console.log(`\n📥 API Response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Success: ${result?.success}`);
    
    if (result?.error) {
      console.log(`   ❌ Error: ${result.error}`);
      if (result.errorDetails) {
        console.log(`   Error Details:`, result.errorDetails);
      }
      if (result.errorCode) {
        console.log(`   Error Code: ${result.errorCode}`);
      }
    }
    
    if (result?.applyResult) {
      const ar = result.applyResult;
      console.log(`\n📊 Apply Result:`);
      console.log(`   Inserted: ${ar.inserted?.length || 0}`);
      console.log(`   Missing Players: ${ar.missingPlayers?.length || 0}`);
      if (ar.error) {
        console.log(`   ❌ Error: ${ar.error}`);
      }
      if (ar.errorDetails) {
        console.log(`   Error Details:`, ar.errorDetails);
      }
      if (ar.skippedMatches) {
        console.log(`   Skipped Matches:`, ar.skippedMatches);
      }
    }
    
    if (result?.singles) {
      console.log(`\n📋 Singles (${result.singles.length}):`);
      result.singles.slice(0, 2).forEach((s, i) => {
        console.log(`   ${i + 1}. Match #${s.matchNumber}:`);
        console.log(`      Home: ${s.homePlayers?.map(p => p.name).join(', ') || 'Keine'}`);
        console.log(`      Away: ${s.awayPlayers?.map(p => p.name).join(', ') || 'Keine'}`);
        console.log(`      Sets: ${s.setScores?.map(ss => `${ss.home}:${ss.away}`).join(', ') || 'Keine'}`);
      });
    }
    
    if (result?.doubles) {
      console.log(`\n📋 Doubles (${result.doubles.length}):`);
      result.doubles.slice(0, 2).forEach((d, i) => {
        console.log(`   ${i + 1}. Match #${d.matchNumber}:`);
        console.log(`      Home: ${d.homePlayers?.map(p => p.name).join(' / ') || 'Keine'}`);
        console.log(`      Away: ${d.awayPlayers?.map(p => p.name).join(' / ') || 'Keine'}`);
        console.log(`      Sets: ${d.setScores?.map(ss => `${ss.home}:${ss.away}`).join(', ') || 'Keine'}`);
      });
    }
    
    // Prüfe Ergebnisse in DB
    const { count } = await supabase
      .from('match_results')
      .select('*', { count: 'exact', head: true })
      .eq('matchday_id', matchday.id);
    
    console.log(`\n📊 Ergebnisse in DB: ${count || 0}`);
    
    if (count > 0) {
      const { data: results } = await supabase
        .from('match_results')
        .select('match_type, match_number, home_player_id, guest_player_id, set1_home, set1_guest')
        .eq('matchday_id', matchday.id)
        .order('match_number');
      
      console.log(`\n📋 Match Results:`);
      results?.forEach(r => {
        console.log(`   ${r.match_type} #${r.match_number}:`);
        console.log(`      Home Player: ${r.home_player_id ? '✅' : '❌'}`);
        console.log(`      Guest Player: ${r.guest_player_id ? '✅' : '❌'}`);
        console.log(`      Set 1: ${r.set1_home !== null ? `${r.set1_home}:${r.set1_guest}` : 'Keine'}`);
      });
    }
    
  } catch (error) {
    console.error(`\n❌ Fehler:`, error.message);
    console.error(error.stack);
  }
}

// Main
const matchdayId = process.argv[2];

if (!matchdayId) {
  console.error('❌ Bitte Matchday-ID als Argument angeben');
  console.error('   Usage: node scripts/test_match_import.mjs <matchday_id>');
  process.exit(1);
}

testMatchImport(matchdayId).catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

