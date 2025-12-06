#!/usr/bin/env node

/**
 * Test: Prüft ob die source_url Migration benötigt wird
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fyvmyyfuxuconhdbiwoa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigration() {
  console.log('🧪 Test: source_url Migration\n');
  console.log('='.repeat(80));
  
  try {
    // Test 1: Prüfe ob Spalten existieren
    console.log('\n1️⃣ Prüfe ob source_url und source_type Spalten existieren...');
    
    const { data: sample, error: sampleError } = await supabase
      .from('team_seasons')
      .select('id, team_id, season, source_url, source_type')
      .limit(1);
    
    if (sampleError) {
      if (sampleError.message.includes('column') && sampleError.message.includes('does not exist')) {
        console.log('❌ Spalten source_url oder source_type existieren NICHT');
        console.log('   → Migration wird benötigt');
        return { needsMigration: true };
      } else {
        throw sampleError;
      }
    }
    
    if (sample && sample.length > 0) {
      const firstRow = sample[0];
      const hasSourceUrl = 'source_url' in firstRow;
      const hasSourceType = 'source_type' in firstRow;
      
      if (hasSourceUrl && hasSourceType) {
        console.log('✅ Spalten source_url und source_type existieren bereits');
        
        // Test 2: Prüfe ob Index existiert
        console.log('\n2️⃣ Prüfe ob Index existiert...');
        // Index-Prüfung ist schwierig über Supabase Client, aber wir können versuchen eine Abfrage zu machen
        const { data: withUrl, error: indexError } = await supabase
          .from('team_seasons')
          .select('id')
          .not('source_url', 'is', null)
          .limit(1);
        
        if (indexError) {
          console.log('⚠️  Index-Prüfung fehlgeschlagen (kann normal sein)');
        } else {
          console.log('✅ Abfragen mit source_url funktionieren');
        }
        
        return { needsMigration: false };
      } else {
        console.log('❌ Spalten fehlen teilweise');
        console.log(`   source_url: ${hasSourceUrl ? '✅' : '❌'}`);
        console.log(`   source_type: ${hasSourceType ? '✅' : '❌'}`);
        console.log('   → Migration wird benötigt');
        return { needsMigration: true };
      }
    } else {
      console.log('⚠️  Keine Einträge in team_seasons gefunden');
      console.log('   → Migration sollte trotzdem ausgeführt werden');
      return { needsMigration: true };
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error.message);
    return { needsMigration: true, error: error.message };
  }
}

testMigration().then(result => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 Ergebnis:');
  console.log(`   Migration benötigt: ${result.needsMigration ? '✅ JA' : '❌ NEIN'}`);
  
  if (result.needsMigration) {
    console.log('\n📋 Nächster Schritt:');
    console.log('   Führe Migration aus: sql/add_source_url_to_team_seasons.sql');
  } else {
    console.log('\n✅ Migration bereits ausgeführt - keine Aktion erforderlich');
  }
  
  process.exit(result.needsMigration ? 0 : 0);
});

