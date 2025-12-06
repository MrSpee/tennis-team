#!/usr/bin/env node

/**
 * Test-Script: Prüft die automatische Meldelisten-Import-Funktionalität
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY fehlt!');
  console.log('\n📋 Test-Übersicht:');
  console.log('   1. Prüfe ob team_roster Tabelle existiert');
  console.log('   2. Prüfe ob team_seasons.source_url Spalte existiert');
  console.log('   3. Prüfe vorhandene Meldelisten');
  console.log('   4. Prüfe Teams mit Team-Portrait-URLs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoRosterImport() {
  console.log('🧪 Test: Automatische Meldelisten-Import-Funktionalität\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Prüfe ob team_roster Tabelle existiert
    console.log('\n1️⃣ Prüfe team_roster Tabelle...');
    try {
      const { data: rosterData, error: rosterError } = await supabase
        .from('team_roster')
        .select('id')
        .limit(1);
      
      if (rosterError) {
        if (rosterError.code === '42P01') {
          console.log('   ❌ Tabelle team_roster existiert nicht!');
          console.log('   💡 Führe Migration aus: sql/create_team_roster_table.sql');
        } else {
          console.log(`   ⚠️  Fehler: ${rosterError.message}`);
        }
      } else {
        console.log('   ✅ Tabelle team_roster existiert');
        
        // Zähle Einträge
        const { count } = await supabase
          .from('team_roster')
          .select('*', { count: 'exact', head: true });
        
        console.log(`   📊 ${count || 0} Einträge in team_roster`);
      }
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
    }
    
    // 2. Prüfe ob team_seasons.source_url existiert
    console.log('\n2️⃣ Prüfe team_seasons.source_url Spalte...');
    try {
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('team_seasons')
        .select('id, source_url, source_type')
        .limit(1);
      
      if (seasonsError) {
        console.log(`   ⚠️  Fehler: ${seasonsError.message}`);
      } else {
        if (seasonsData && seasonsData.length > 0) {
          const hasSourceUrl = 'source_url' in seasonsData[0];
          const hasSourceType = 'source_type' in seasonsData[0];
          
          console.log(`   source_url vorhanden: ${hasSourceUrl ? '✅' : '❌'}`);
          console.log(`   source_type vorhanden: ${hasSourceType ? '✅' : '❌'}`);
          
          if (!hasSourceUrl || !hasSourceType) {
            console.log('   💡 Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
          }
        } else {
          console.log('   ⚠️  Keine Einträge in team_seasons gefunden');
        }
      }
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
    }
    
    // 3. Prüfe vorhandene Meldelisten
    console.log('\n3️⃣ Prüfe vorhandene Meldelisten...');
    try {
      const { data: rosterEntries, error: rosterError } = await supabase
        .from('team_roster')
        .select('team_id, season, COUNT(*)')
        .limit(10);
      
      if (rosterError) {
        console.log(`   ⚠️  Fehler: ${rosterError.message}`);
      } else {
        // Gruppiere nach Team/Saison
        const { data: grouped } = await supabase
          .from('team_roster')
          .select('team_id, season')
          .limit(100);
        
        if (grouped) {
          const unique = new Set(grouped.map(r => `${r.team_id}:${r.season}`));
          console.log(`   ✅ ${unique.size} verschiedene Team/Saison-Kombinationen mit Meldelisten`);
          
          if (unique.size > 0) {
            console.log('\n   Beispiele:');
            Array.from(unique).slice(0, 3).forEach((key, i) => {
              const [teamId, season] = key.split(':');
              console.log(`   ${i + 1}. Team: ${teamId.substring(0, 8)}..., Saison: ${season}`);
            });
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
    }
    
    // 4. Prüfe Teams mit Team-Portrait-URLs
    console.log('\n4️⃣ Prüfe Teams mit Team-Portrait-URLs...');
    try {
      const { data: teamsWithUrl, error: urlError } = await supabase
        .from('team_seasons')
        .select('team_id, season, source_url')
        .not('source_url', 'is', null)
        .like('source_url', '%teamPortrait%')
        .limit(10);
      
      if (urlError) {
        console.log(`   ⚠️  Fehler: ${urlError.message}`);
      } else {
        console.log(`   ✅ ${teamsWithUrl?.length || 0} Teams mit Team-Portrait-URLs gefunden`);
        
        if (teamsWithUrl && teamsWithUrl.length > 0) {
          console.log('\n   Beispiele:');
          teamsWithUrl.slice(0, 3).forEach((ts, i) => {
            const urlPreview = ts.source_url?.substring(0, 80) || 'N/A';
            console.log(`   ${i + 1}. Team: ${ts.team_id.substring(0, 8)}..., Saison: ${ts.season}`);
            console.log(`      URL: ${urlPreview}...`);
          });
        } else {
          console.log('   ⚠️  Keine Teams mit Team-Portrait-URLs gefunden');
          console.log('   💡 Importiere Teams über Team-Portrait Import Tab');
        }
      }
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
    }
    
    // 5. Prüfe Matchdays für automatisches Laden
    console.log('\n5️⃣ Prüfe Matchdays für automatisches Laden...');
    try {
      const { data: matchdays, error: matchdaysError } = await supabase
        .from('matchdays')
        .select('id, home_team_id, away_team_id, season')
        .limit(10);
      
      if (matchdaysError) {
        console.log(`   ⚠️  Fehler: ${matchdaysError.message}`);
      } else {
        console.log(`   ✅ ${matchdays?.length || 0} Matchdays gefunden`);
        
        if (matchdays && matchdays.length > 0) {
          const uniqueTeams = new Set();
          matchdays.forEach(m => {
            if (m.home_team_id) uniqueTeams.add(m.home_team_id);
            if (m.away_team_id) uniqueTeams.add(m.away_team_id);
          });
          
          console.log(`   📊 ${uniqueTeams.size} verschiedene Teams in Matchdays`);
          console.log('   💡 Diese Teams sollten automatisch Meldelisten laden');
        }
      }
    } catch (error) {
      console.log(`   ❌ Fehler: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Test abgeschlossen!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
    console.log('   2. Importiere Teams über Team-Portrait Import Tab');
    console.log('   3. Meldelisten werden automatisch geladen, wenn Matchdays geöffnet werden');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  }
}

testAutoRosterImport();

