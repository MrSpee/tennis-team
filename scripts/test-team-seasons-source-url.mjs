#!/usr/bin/env node

/**
 * Test-Script: Prüft ob source_url in team_seasons vorhanden ist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTeamSeasonsSourceUrl() {
  console.log('🔍 Prüfe team_seasons Tabelle...\n');
  
  try {
    // 1. Prüfe ob source_url Spalte existiert
    console.log('1️⃣ Prüfe ob source_url Spalte existiert...');
    const { data: columns, error: columnsError } = await supabase
      .from('team_seasons')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Fehler beim Abfragen von team_seasons:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      const firstRow = columns[0];
      const hasSourceUrl = 'source_url' in firstRow;
      const hasSourceType = 'source_type' in firstRow;
      
      console.log(`   source_url vorhanden: ${hasSourceUrl ? '✅' : '❌'}`);
      console.log(`   source_type vorhanden: ${hasSourceType ? '✅' : '❌'}`);
      
      if (!hasSourceUrl || !hasSourceType) {
        console.log('\n⚠️  Spalten fehlen! Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
        return;
      }
    }
    
    // 2. Prüfe wie viele Einträge source_url haben
    console.log('\n2️⃣ Prüfe vorhandene source_url Einträge...');
    const { data: withSourceUrl, error: countError } = await supabase
      .from('team_seasons')
      .select('id, team_id, season, source_url, source_type')
      .not('source_url', 'is', null)
      .limit(10);
    
    if (countError) {
      console.warn('⚠️  Fehler beim Zählen:', countError);
    } else {
      console.log(`   ✅ ${withSourceUrl?.length || 0} Einträge mit source_url gefunden`);
      if (withSourceUrl && withSourceUrl.length > 0) {
        console.log('\n   Beispiele:');
        withSourceUrl.slice(0, 3).forEach((ts, i) => {
          console.log(`   ${i + 1}. Season: ${ts.season}, URL: ${ts.source_url?.substring(0, 80)}...`);
        });
      }
    }
    
    // 3. Prüfe Teams ohne source_url
    console.log('\n3️⃣ Prüfe Teams ohne source_url...');
    const { data: withoutSourceUrl, error: withoutError } = await supabase
      .from('team_seasons')
      .select('id, team_id, season, league, group_name')
      .is('source_url', null)
      .eq('is_active', true)
      .limit(10);
    
    if (withoutError) {
      console.warn('⚠️  Fehler beim Abfragen:', withoutError);
    } else {
      console.log(`   ℹ️  ${withoutSourceUrl?.length || 0} aktive Einträge ohne source_url`);
      if (withoutSourceUrl && withoutSourceUrl.length > 0) {
        console.log('\n   Beispiele:');
        withoutSourceUrl.slice(0, 3).forEach((ts, i) => {
          console.log(`   ${i + 1}. Season: ${ts.season}, Liga: ${ts.league}, Gruppe: ${ts.group_name}`);
        });
      }
    }
    
    // 4. Test: Prüfe ob Team-Portrait-URLs erkannt werden
    console.log('\n4️⃣ Test: Prüfe Team-Portrait-URL Erkennung...');
    if (withSourceUrl && withSourceUrl.length > 0) {
      const testUrl = withSourceUrl[0].source_url;
      const isTeamPortrait = testUrl && testUrl.includes('teamPortrait');
      console.log(`   Test-URL: ${testUrl?.substring(0, 100)}...`);
      console.log(`   Ist Team-Portrait-URL: ${isTeamPortrait ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ Test abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  }
}

testTeamSeasonsSourceUrl();

