#!/usr/bin/env node

/**
 * Manueller Test für Meldelisten-Import-Funktionalität
 * Prüft alle Komponenten und gibt detaillierte Test-Ergebnisse
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY fehlt in den Umgebungsvariablen!');
  console.log('\n📋 Test kann nicht vollständig durchgeführt werden ohne API-Key.');
  console.log('   Aber ich kann die SQL-Migrationen anzeigen:\n');
  
  // Zeige Migrationen
  try {
    const teamRosterSql = await readFile(join(projectRoot, 'sql/create_team_roster_table.sql'), 'utf-8');
    const sourceUrlSql = await readFile(join(projectRoot, 'sql/add_source_url_to_team_seasons.sql'), 'utf-8');
    
    console.log('='.repeat(80));
    console.log('1. TEAM_ROSTER TABELLE MIGRATION:');
    console.log('='.repeat(80));
    console.log(teamRosterSql);
    console.log('\n' + '='.repeat(80));
    console.log('2. SOURCE_URL SPALTE MIGRATION:');
    console.log('='.repeat(80));
    console.log(sourceUrlSql);
    console.log('\n' + '='.repeat(80));
    console.log('📋 Führe diese Migrationen im Supabase Dashboard aus:');
    console.log('   https://supabase.com/dashboard/project/fyvmyyfuxuconhdbiwoa/sql/new');
  } catch (error) {
    console.error('Fehler beim Lesen der Migrationen:', error);
  }
  
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function manualTest() {
  console.log('🧪 MANUELLER TEST: Meldelisten-Import-Funktionalität\n');
  console.log('='.repeat(80));
  
  const testResults = {
    teamRosterTable: false,
    sourceUrlColumn: false,
    existingRosters: 0,
    teamsWithUrls: 0,
    matchdaysFound: 0
  };
  
  try {
    // TEST 1: Prüfe team_roster Tabelle
    console.log('\n📋 TEST 1: team_roster Tabelle');
    console.log('-'.repeat(80));
    try {
      const { data, error } = await supabase
        .from('team_roster')
        .select('id, team_id, season, rank, player_name')
        .limit(5);
      
      if (error) {
        if (error.code === '42P01') {
          console.log('❌ Tabelle team_roster existiert NICHT');
          console.log('   → Führe Migration aus: sql/create_team_roster_table.sql');
        } else {
          console.log(`❌ Fehler: ${error.message}`);
        }
      } else {
        testResults.teamRosterTable = true;
        console.log('✅ Tabelle team_roster existiert');
        
        // Zähle Einträge
        const { count } = await supabase
          .from('team_roster')
          .select('*', { count: 'exact', head: true });
        
        testResults.existingRosters = count || 0;
        console.log(`   📊 ${count || 0} Einträge gefunden`);
        
        if (data && data.length > 0) {
          console.log('\n   Beispiele:');
          data.forEach((r, i) => {
            console.log(`   ${i + 1}. Team: ${r.team_id.substring(0, 8)}..., Saison: ${r.season}, Rang: ${r.rank}, Spieler: ${r.player_name}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // TEST 2: Prüfe team_seasons.source_url Spalte
    console.log('\n📋 TEST 2: team_seasons.source_url Spalte');
    console.log('-'.repeat(80));
    try {
      const { data, error } = await supabase
        .from('team_seasons')
        .select('id, team_id, season, source_url, source_type')
        .limit(5);
      
      if (error) {
        console.log(`❌ Fehler: ${error.message}`);
      } else {
        if (data && data.length > 0) {
          const firstRow = data[0];
          const hasSourceUrl = 'source_url' in firstRow;
          const hasSourceType = 'source_type' in firstRow;
          
          if (hasSourceUrl && hasSourceType) {
            testResults.sourceUrlColumn = true;
            console.log('✅ Spalten source_url und source_type existieren');
            
            // Zähle Einträge mit URLs
            const { data: withUrls } = await supabase
              .from('team_seasons')
              .select('id')
              .not('source_url', 'is', null)
              .like('source_url', '%teamPortrait%');
            
            testResults.teamsWithUrls = withUrls?.length || 0;
            console.log(`   📊 ${testResults.teamsWithUrls} Teams mit Team-Portrait-URLs`);
            
            if (data.some(r => r.source_url)) {
              console.log('\n   Beispiele mit URLs:');
              data.filter(r => r.source_url).slice(0, 3).forEach((ts, i) => {
                const urlPreview = ts.source_url.substring(0, 70);
                console.log(`   ${i + 1}. Team: ${ts.team_id.substring(0, 8)}..., Saison: ${ts.season}`);
                console.log(`      URL: ${urlPreview}...`);
              });
            }
          } else {
            console.log('❌ Spalten source_url oder source_type fehlen');
            console.log('   → Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
          }
        } else {
          console.log('⚠️  Keine Einträge in team_seasons gefunden');
        }
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // TEST 3: Prüfe Matchdays für automatisches Laden
    console.log('\n📋 TEST 3: Matchdays für automatisches Laden');
    console.log('-'.repeat(80));
    try {
      const { data: matchdays, error } = await supabase
        .from('matchdays')
        .select('id, home_team_id, away_team_id, season, match_date')
        .order('match_date', { ascending: false })
        .limit(10);
      
      if (error) {
        console.log(`❌ Fehler: ${error.message}`);
      } else {
        testResults.matchdaysFound = matchdays?.length || 0;
        console.log(`✅ ${matchdays?.length || 0} Matchdays gefunden`);
        
        if (matchdays && matchdays.length > 0) {
          const uniqueTeams = new Set();
          matchdays.forEach(m => {
            if (m.home_team_id) uniqueTeams.add(`${m.home_team_id}:${m.season}`);
            if (m.away_team_id) uniqueTeams.add(`${m.away_team_id}:${m.season}`);
          });
          
          console.log(`   📊 ${uniqueTeams.size} verschiedene Team/Saison-Kombinationen`);
          console.log('\n   Beispiele:');
          matchdays.slice(0, 3).forEach((m, i) => {
            const date = m.match_date ? new Date(m.match_date).toLocaleDateString('de-DE') : 'N/A';
            console.log(`   ${i + 1}. Datum: ${date}, Saison: ${m.season || 'N/A'}`);
            console.log(`      Home: ${m.home_team_id?.substring(0, 8) || 'N/A'}..., Away: ${m.away_team_id?.substring(0, 8) || 'N/A'}...`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // TEST 4: Prüfe ob Team-Portrait-URLs korrekt formatiert sind
    console.log('\n📋 TEST 4: Team-Portrait-URL Format');
    console.log('-'.repeat(80));
    try {
      const { data: teamsWithUrls } = await supabase
        .from('team_seasons')
        .select('team_id, season, source_url')
        .not('source_url', 'is', null)
        .like('source_url', '%teamPortrait%')
        .limit(5);
      
      if (teamsWithUrls && teamsWithUrls.length > 0) {
        console.log(`✅ ${teamsWithUrls.length} Teams mit Team-Portrait-URLs gefunden`);
        
        const testUrl = teamsWithUrls[0].source_url;
        const expectedPattern = /teamPortrait\?team=\d+/;
        const hasCorrectFormat = expectedPattern.test(testUrl);
        
        console.log(`   Format korrekt: ${hasCorrectFormat ? '✅' : '❌'}`);
        console.log(`   Beispiel-URL: ${testUrl.substring(0, 100)}...`);
        
        if (!hasCorrectFormat) {
          console.log('   ⚠️  URL-Format entspricht nicht dem erwarteten Muster');
        }
      } else {
        console.log('⚠️  Keine Teams mit Team-Portrait-URLs gefunden');
        console.log('   → Importiere Teams über Team-Portrait Import Tab');
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    // ZUSAMMENFASSUNG
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST-ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log(`✅ team_roster Tabelle: ${testResults.teamRosterTable ? 'Vorhanden' : '❌ Fehlt'}`);
    console.log(`✅ source_url Spalte: ${testResults.sourceUrlColumn ? 'Vorhanden' : '❌ Fehlt'}`);
    console.log(`📊 Vorhandene Meldelisten: ${testResults.existingRosters}`);
    console.log(`📊 Teams mit URLs: ${testResults.teamsWithUrls}`);
    console.log(`📊 Matchdays gefunden: ${testResults.matchdaysFound}`);
    
    console.log('\n📋 NÄCHSTE SCHRITTE:');
    if (!testResults.teamRosterTable) {
      console.log('   1. ❌ Führe Migration aus: sql/create_team_roster_table.sql');
    }
    if (!testResults.sourceUrlColumn) {
      console.log('   2. ❌ Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
    }
    if (testResults.teamsWithUrls === 0) {
      console.log('   3. ⚠️  Importiere Teams über Team-Portrait Import Tab');
    }
    if (testResults.existingRosters === 0 && testResults.teamsWithUrls > 0) {
      console.log('   4. ⚠️  Meldelisten werden automatisch geladen, wenn Matchdays geöffnet werden');
    }
    if (testResults.teamRosterTable && testResults.sourceUrlColumn && testResults.teamsWithUrls > 0) {
      console.log('   ✅ Alle Voraussetzungen erfüllt!');
      console.log('   → Teste die Funktionalität im Browser:');
      console.log('     1. Öffne einen Matchday');
      console.log('     2. Prüfe Browser-Konsole für [autoTeamRosterImport] Logs');
      console.log('     3. Prüfe ob Meldelisten-Spieler im Dropdown erscheinen');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  }
}

manualTest();

