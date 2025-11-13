#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

// Nutze SERVICE_ROLE_KEY für Admin-Zugriff
const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function verifyGruppe044() {
  console.log('🔍 Prüfe Gruppe 044 Import (mit Admin-Rechten)...\n');

  // 1. VEREINE aus Gruppe 044
  const expectedClubs = [
    'TC Bayer Dormagen',
    'Rodenkirchener TC',
    'TC RS Neubrück',
    'Kölner TG BG',
    'TC Colonius',
    'TC Stammheim'
  ];

  const { data: allClubs, error: allClubsError } = await supabase
    .from('club_info')
    .select('name, normalized_name, city, data_source');

  if (allClubsError) {
    console.error('❌ Fehler beim Laden aller Vereine:', allClubsError);
  } else {
    console.log(`📋 Gesamt Vereine in DB: ${allClubs.length}`);
    
    // Suche nach Gruppe 044 Vereinen
    console.log('\n🔍 Suche nach Gruppe 044 Vereinen:\n');
    expectedClubs.forEach(clubName => {
      const normalized = clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = allClubs.find(c => 
        c.name === clubName || 
        c.normalized_name === normalized ||
        c.normalized_name.includes(normalized.substring(0, 10))
      );
      
      if (found) {
        console.log(`✅ "${clubName}" → gefunden als "${found.name}" (${found.city || 'keine Stadt'})`);
      } else {
        console.log(`❌ "${clubName}" → NICHT GEFUNDEN`);
        // Zeige ähnliche Namen
        const similar = allClubs.filter(c => {
          const parts = clubName.toLowerCase().split(' ');
          return parts.some(part => part.length > 3 && c.name.toLowerCase().includes(part));
        });
        if (similar.length > 0) {
          console.log(`   💡 Ähnlich: ${similar.map(c => c.name).join(', ')}`);
        }
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. TEAMS aus Gruppe 044
  const { data: teams, error: teamsError } = await supabase
    .from('team_info')
    .select('*, team_seasons(group_name, season, league)')
    .or('team_seasons.group_name.eq.Gr. 044,team_seasons.group_name.eq.Gr. 042');

  if (teamsError) {
    console.error('❌ Fehler beim Laden der Teams:', teamsError);
  } else {
    const gruppe044Teams = teams.filter(t => 
      t.team_seasons?.some(ts => ts.group_name === 'Gr. 044')
    );
    
    console.log(`🎾 Teams in Gr. 044: ${gruppe044Teams.length}`);
    if (gruppe044Teams.length > 0) {
      gruppe044Teams.forEach(team => {
        const season = team.team_seasons?.find(ts => ts.group_name === 'Gr. 044');
        console.log(`   - ${team.club_name} ${team.team_name} (${team.category || 'keine Kategorie'}) - ${season?.league || 'keine Liga'}`);
      });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. MATCHES aus Gruppe 044
  const { data: matches, error: matchesError } = await supabase
    .from('matchdays')
    .select('match_date, home_team_id, away_team_id, final_score, status, venue, season, group_name')
    .eq('group_name', 'Gr. 044')
    .eq('season', 'Winter 2025/26')
    .order('match_date', { ascending: true, nullsFirst: false });

  if (matchesError) {
    console.error('❌ Fehler beim Laden der Matches:', matchesError);
  } else {
    console.log(`🏆 Matches in Gr. 044: ${matches.length}`);
    
    const completed = matches.filter(m => m.status === 'completed');
    const scheduled = matches.filter(m => m.status === 'scheduled');
    const withoutDate = matches.filter(m => !m.match_date);
    
    console.log(`   ✅ Beendet: ${completed.length}`);
    console.log(`   📅 Geplant: ${scheduled.length}`);
    if (withoutDate.length > 0) {
      console.log(`   ⚠️  Ohne Datum: ${withoutDate.length}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. ZUSAMMENFASSUNG
  const clubsFound = expectedClubs.filter(clubName => {
    const normalized = clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return allClubs?.some(c => 
      c.name === clubName || 
      c.normalized_name === normalized ||
      c.normalized_name.includes(normalized.substring(0, 10))
    );
  }).length;

  console.log('📊 ZUSAMMENFASSUNG GRUPPE 044:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Vereine gefunden:  ${clubsFound} / 6`);
  console.log(`🎾 Teams:             ${teams?.filter(t => t.team_seasons?.some(ts => ts.group_name === 'Gr. 044')).length || 0}`);
  console.log(`🏆 Matches:           ${matches?.length || 0} (erwartet: 14-15)`);
  console.log(`📋 Gesamt Vereine DB: ${allClubs?.length || 0}`);
  console.log('═══════════════════════════════════════');

  console.log('\n✨ Prüfung abgeschlossen!\n');
}

verifyGruppe044().catch(console.error);

