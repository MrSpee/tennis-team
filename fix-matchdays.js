const { createClient } = require('@supabase/supabase-js');

// Supabase Verbindungsdaten
const supabaseUrl = 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dm15eWZ1eHVjb25oZGJpd293YSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzIwNjI0NDYyLCJleHAiOjE4NzgyMDA0NjJ9.j6KbqVYVcwZzY0BVoTXnm0D5d1HhW-o_frZf3IqJJ_8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMatchdays() {
  console.log('🚀 Starte Matchday-Fix...\n');

  try {
    // Zuerst: Finde die richtige Team-ID für "SV Rot-Gelb Sürth - Herren 40"
    const { data: targetTeam, error: teamError } = await supabase
      .from('team_info')
      .select('id, club_name, team_name')
      .eq('team_name', 'Herren 40')
      .eq('club_name', 'SV Rot-Gelb Sürth')
      .single();

    if (teamError || !targetTeam) {
      console.error('❌ Ziel-Team nicht gefunden:', teamError);
      return;
    }

    console.log('✅ Ziel-Team gefunden:', targetTeam);
    const correctTeamId = targetTeam.id;

    // Hole alle Matchdays die falsche Team-IDs haben
    const { data: matchdays, error: fetchError } = await supabase
      .from('matchdays')
      .select('id, home_team_id, away_team_id, home_team:home_team_id(id, club_name, team_name), away_team:away_team_id(id, club_name, team_name)')
      .or('home_team_id.eq.95220c8e-085a-41ff-8a2c-225df6df3f29,away_team_id.eq.95220c8e-085a-41ff-8a2c-225df6df3f29');

    if (fetchError) {
      console.error('❌ Fehler beim Laden:', fetchError);
      return;
    }

    console.log(`📋 Gefunden: ${matchdays.length} Matchdays mit falschen Team-IDs\n`);

    // Update jeden Matchday
    for (const matchday of matchdays) {
      console.log(`📝 Update Matchday ${matchday.id}...`);
      
      let updateData = {};
      
      // Prüfe home_team_id
      if (matchday.home_team_id === '95220c8e-085a-41ff-8a2c-225df6df3f29') {
        updateData.home_team_id = correctTeamId;
        console.log(`  → home_team_id: ${matchday.home_team_id} → ${correctTeamId}`);
      }
      
      // Prüfe away_team_id
      if (matchday.away_team_id === '95220c8e-085a-41ff-8a2c-225df6df3f29') {
        updateData.away_team_id = correctTeamId;
        console.log(`  → away_team_id: ${matchday.away_team_id} → ${correctTeamId}`);
      }

      // Update durchführen
      const { error: updateError } = await supabase
        .from('matchdays')
        .update(updateData)
        .eq('id', matchday.id);

      if (updateError) {
        console.error(`❌ Fehler bei ${matchday.id}:`, updateError);
      } else {
        console.log(`✅ Matchday ${matchday.id} aktualisiert\n`);
      }
    }

    console.log('\n✅ Alle Matchdays aktualisiert!');
    
    // Zeige finalen Status
    const { data: finalMatchdays } = await supabase
      .from('matchdays')
      .select('id, home_team_id, away_team_id, home_team:home_team_id(club_name, team_name), away_team:away_team_id(club_name, team_name)')
      .limit(5);

    console.log('\n📊 Erste 5 Matchdays nach Update:');
    console.table(finalMatchdays);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

fixMatchdays();

