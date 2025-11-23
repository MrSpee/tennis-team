/**
 * Script: Fix Missing Meeting IDs
 * 
 * Dieses Script:
 * 1. Findet alle Matchdays ohne meeting_id
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

// Lade .env Datei manuell
function loadEnv() {
  let envPath = join(__dirname, '..', '.env.local');
  try {
    readFileSync(envPath); // Check if .env.local exists
  } catch (e) {
    envPath = join(__dirname, '..', '.env'); // Fallback to .env
  }
  
  try {
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
    console.warn('⚠️  .env Datei nicht gefunden, verwende Umgebungsvariablen');
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
  console.log('🔍 Suche Matchdays ohne meeting_id (nur vergangene Spiele)...');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // ✅ WICHTIG: Nur vergangene Spiele (match_date < heute)
  // ✅ NEU: Lade auch source_url, damit wir die richtige nuLiga-URL verwenden können
  const { data, error } = await supabase
    .from('matchdays')
    .select('id, match_date, home_team_id, away_team_id, season, league, group_name, status, source_url, source_type')
    .is('meeting_id', null)
    .lt('match_date', today.toISOString()) // Nur vergangene Spiele
    .order('match_date', { ascending: true });
  
  if (error) {
    console.error('❌ Fehler beim Laden der Matchdays:', error);
    return [];
  }
  
  console.log(`✅ ${data.length} vergangene Matchdays ohne meeting_id gefunden`);
  return data || [];
}

async function findMatchdaysWithInvalidMeetingId() {
  console.log('🔍 Suche Matchdays mit möglicherweise ungültigen meeting_id...');
  
  // Lade alle Matchdays mit meeting_id, die als "completed" markiert sind
  const { data, error } = await supabase
    .from('matchdays')
    .select('id, match_date, meeting_id, home_team_id, away_team_id, season, league, group_name, status')
    .not('meeting_id', 'is', null)
    .eq('status', 'completed')
    .order('match_date', { ascending: true });
  
  if (error) {
    console.error('❌ Fehler beim Laden der Matchdays:', error);
    return [];
  }
  
  console.log(`✅ ${data.length} Matchdays mit meeting_id gefunden (zum Validieren)`);
  return data || [];
}

async function getTeamInfo(teamId) {
  const { data, error } = await supabase
    .from('team_info')
    .select('club_name, team_name, category')
    .eq('id', teamId)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return {
    name: `${data.club_name} ${data.team_name}`.trim(),
    category: data.category
  };
}

async function updateMeetingId(matchdayId, meetingId) {
  const { error } = await supabase
    .from('matchdays')
    .update({ meeting_id: meetingId })
    .eq('id', matchdayId);
  
  if (error) {
    console.error(`❌ Fehler beim Update von Matchday ${matchdayId}:`, error);
    return false;
  }
  
  return true;
}

async function clearInvalidMeetingId(matchdayId) {
  const { error } = await supabase
    .from('matchdays')
    .update({ meeting_id: null })
    .eq('id', matchdayId);
  
  if (error) {
    console.error(`❌ Fehler beim Löschen von meeting_id für Matchday ${matchdayId}:`, error);
    return false;
  }
  
  return true;
}

async function findMeetingIdFromNuLiga(matchday) {
  try {
    // Lade Team-Informationen
    const homeTeam = await getTeamInfo(matchday.home_team_id);
    const awayTeam = await getTeamInfo(matchday.away_team_id);
    
    if (!homeTeam || !awayTeam) {
      console.warn(`⚠️  Team-Info nicht gefunden für Matchday ${matchday.id}`);
      return null;
    }
    
    // Extrahiere groupId aus group_name (z.B. "Gr. 046" → "046")
    const groupIdMatch = matchday.group_name?.match(/(\d+)/);
    const groupId = groupIdMatch ? groupIdMatch[1] : null;
    
    if (!groupId) {
      console.warn(`⚠️  Keine groupId gefunden für Matchday ${matchday.id} (group_name: ${matchday.group_name})`);
      return null;
    }
    
    // ✅ NEU: Verwende source_url, falls vorhanden (für flexible URL-Unterstützung)
    const leagueUrl = matchday.source_url || null;
    
    // Scrape nuLiga für diese Gruppe
    console.log(`🔍 Scrape nuLiga für Gruppe ${groupId}${leagueUrl ? ` (URL: ${leagueUrl})` : ''}...`);
    const scrapeResult = await scrapeNuLiga({
      leagueUrl: leagueUrl, // ✅ NEU: Verwende source_url, falls vorhanden
      groupFilter: groupId,
      requestDelayMs: 200,
      applyChanges: false,
      supabaseClient: null,
      outputDir: null,
      onLog: (msg) => console.log(`  ${msg}`)
    });
    
    // scrapeNuLiga gibt { results, unmappedTeams } zurück
    const results = scrapeResult?.results || scrapeResult || [];
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      console.warn(`⚠️  Keine Ergebnisse für Gruppe ${groupId}`);
      return null;
    }
    
    // Finde das passende Match
    const targetGroup = results.find(r => {
      const rGroupId = r.group?.groupId ? String(r.group.groupId) : null;
      return rGroupId === groupId;
    });
    
    if (!targetGroup || !targetGroup.matches) {
      console.warn(`⚠️  Keine Matches gefunden für Gruppe ${groupId}`);
      return null;
    }
    
    // Finde Match anhand von Teams und Datum
    const matchDate = new Date(matchday.match_date);
    const matchDateKey = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const matchedMatch = targetGroup.matches.find(m => {
      const mDate = m.matchDateIso ? new Date(m.matchDateIso).toISOString().split('T')[0] : null;
      const homeMatch = m.homeTeam === homeTeam.name || m.homeTeam?.includes(homeTeam.name.split(' ')[0]);
      const awayMatch = m.awayTeam === awayTeam.name || m.awayTeam?.includes(awayTeam.name.split(' ')[0]);
      
      return mDate === matchDateKey && (homeMatch || awayMatch) && m.meetingId;
    });
    
    if (matchedMatch && matchedMatch.meetingId) {
      console.log(`✅ Meeting-ID gefunden: ${matchedMatch.meetingId} für Matchday ${matchday.id}`);
      return matchedMatch.meetingId;
    }
    
    console.warn(`⚠️  Keine meeting_id gefunden für Matchday ${matchday.id}`);
    return null;
  } catch (error) {
    console.error(`❌ Fehler beim Finden der meeting_id für Matchday ${matchday.id}:`, error.message);
    return null;
  }
}

async function validateMeetingId(meetingId) {
  try {
    const url = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?meeting=${encodeURIComponent(meetingId)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'tvm-scraper/1.0 (+https://github.com/jorzig/tennis-team)'
      }
    });
    
    return response.ok; // true wenn 200, false wenn 404
  } catch (error) {
    console.error(`❌ Fehler beim Validieren von meeting_id ${meetingId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starte Fix für fehlende meeting_id-Werte...\n');
  
  // 1. Finde Matchdays ohne meeting_id
  const matchdaysWithoutId = await findMatchdaysWithoutMeetingId();
  
  if (matchdaysWithoutId.length === 0) {
    console.log('✅ Keine Matchdays ohne meeting_id gefunden!');
  } else {
    console.log(`\n📋 Verarbeite ${matchdaysWithoutId.length} Matchdays ohne meeting_id...\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const matchday of matchdaysWithoutId) {
      console.log(`\n🔍 Verarbeite Matchday ${matchday.id} (${matchday.match_date})...`);
      
      const meetingId = await findMeetingIdFromNuLiga(matchday);
      
      if (meetingId) {
        const success = await updateMeetingId(matchday.id, meetingId);
        if (success) {
          updated++;
          console.log(`✅ meeting_id ${meetingId} gespeichert`);
        } else {
          failed++;
        }
      } else {
        failed++;
        console.log(`⚠️  Keine meeting_id gefunden`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Fertig! ${updated} Matchdays aktualisiert, ${failed} fehlgeschlagen`);
  }
  
  // 2. Validiere bestehende meeting_id-Werte
  console.log('\n\n🔍 Validiere bestehende meeting_id-Werte...\n');
  
  const matchdaysWithId = await findMatchdaysWithInvalidMeetingId();
  
  if (matchdaysWithId.length === 0) {
    console.log('✅ Keine Matchdays mit meeting_id zum Validieren gefunden!');
  } else {
    console.log(`\n📋 Validiere ${matchdaysWithId.length} Matchdays mit meeting_id...\n`);
    
    let valid = 0;
    let invalid = 0;
    let cleared = 0;
    
    for (const matchday of matchdaysWithId) {
      console.log(`🔍 Validiere Matchday ${matchday.id} (meeting_id: ${matchday.meeting_id})...`);
      
      const isValid = await validateMeetingId(matchday.meeting_id);
      
      if (isValid) {
        valid++;
        console.log(`✅ meeting_id ${matchday.meeting_id} ist gültig`);
      } else {
        invalid++;
        console.log(`❌ meeting_id ${matchday.meeting_id} ist ungültig (404)`);
        
        // Lösche ungültige meeting_id
        const success = await clearInvalidMeetingId(matchday.id);
        if (success) {
          cleared++;
          console.log(`✅ Ungültige meeting_id gelöscht`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n✅ Validierung abgeschlossen! ${valid} gültig, ${invalid} ungültig (${cleared} gelöscht)`);
  }
  
  console.log('\n✅ Script abgeschlossen!');
}

main().catch(console.error);

