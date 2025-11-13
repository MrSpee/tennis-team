#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Lese .env Datei manuell
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function verifyGruppe044() {
  console.log('🔍 Prüfe Gruppe 044 Import...\n');

  // 1. Vereine zählen
  const expectedClubs = [
    'TC Bayer Dormagen',
    'Rodenkirchener TC',
    'TC RS Neubrück',
    'Kölner TG BG',
    'TC Colonius',
    'TC Stammheim'
  ];

  const { data: clubs, error: clubsError } = await supabase
    .from('club_info')
    .select('name, city, data_source, created_at')
    .in('name', expectedClubs);

  if (clubsError) {
    console.error('❌ Fehler beim Laden der Vereine:', clubsError);
  } else {
    console.log(`✅ Vereine gefunden: ${clubs.length} / 6`);
    clubs.forEach(club => {
      console.log(`   - ${club.name} ${club.city ? `(${club.city})` : ''}`);
    });
    console.log('');
  }

  // 2. Teams zählen
  const { data: teams, error: teamsError } = await supabase
    .from('team_info')
    .select('*, club_info(name), team_seasons!inner(group_name, season, league)')
    .eq('team_seasons.group_name', 'Gr. 044')
    .eq('team_seasons.season', 'Winter 2025/26');

  if (teamsError) {
    console.error('❌ Fehler beim Laden der Teams:', teamsError);
  } else {
    console.log(`🎾 Teams gefunden: ${teams.length} / 6`);
    teams.forEach(team => {
      console.log(`   - ${team.club_info.name} ${team.team_name} (${team.category})`);
    });
    console.log('');
  }

  // 3. Matches zählen
  const { data: matches, error: matchesError } = await supabase
    .from('matchdays')
    .select('match_date, home_team_id, away_team_id, final_score, status, venue')
    .eq('group_name', 'Gr. 044')
    .eq('season', 'Winter 2025/26')
    .order('match_date', { ascending: true, nullsFirst: false });

  if (matchesError) {
    console.error('❌ Fehler beim Laden der Matches:', matchesError);
  } else {
    console.log(`🏆 Matches gefunden: ${matches.length} / 14 (erwartet)`);
    
    const completed = matches.filter(m => m.status === 'completed');
    const scheduled = matches.filter(m => m.status === 'scheduled');
    
    console.log(`   ✅ Beendet: ${completed.length}`);
    console.log(`   📅 Geplant: ${scheduled.length}`);
    console.log('');

    if (completed.length > 0) {
      console.log('   Beendete Matches:');
      completed.forEach(m => {
        const date = m.match_date ? new Date(m.match_date).toLocaleDateString('de-DE') : 'Kein Datum';
        console.log(`   - ${date}: Score ${m.final_score || 'fehlt'} @ ${m.venue}`);
      });
      console.log('');
    }
  }

  // 4. Zusammenfassung
  console.log('📊 ZUSAMMENFASSUNG:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Vereine:  ${clubs?.length || 0} / 6`);
  console.log(`🎾 Teams:    ${teams?.length || 0} / 6`);
  console.log(`🏆 Matches:  ${matches?.length || 0} / 14`);
  console.log('═══════════════════════════════════════');

  // Warnung wenn Daten fehlen
  if (clubs?.length < 6) {
    console.log('\n⚠️  WARNUNG: Nicht alle Vereine wurden importiert!');
    const missing = expectedClubs.filter(name => !clubs.some(c => c.name === name));
    console.log('   Fehlende Vereine:', missing.join(', '));
  }

  if (teams?.length < 6) {
    console.log('\n⚠️  WARNUNG: Nicht alle Teams wurden importiert!');
  }

  if (matches?.length < 14) {
    console.log('\n⚠️  WARNUNG: Nicht alle Matches wurden importiert!');
    console.log('   Erwartete: 14 (davon 1 ohne Datum im JSON, also 14 sollten in DB sein)');
    console.log('   Gefunden: ' + matches?.length);
  }

  console.log('\n✨ Prüfung abgeschlossen!\n');
}

verifyGruppe044().catch(console.error);

