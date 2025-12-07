#!/usr/bin/env node
/**
 * Test-Script für parse-club-rosters API
 * 
 * Usage:
 *   node scripts/test-parse-club-rosters.mjs
 */

// Verwende native fetch (verfügbar in Node.js 18+)

const API_URL = 'http://localhost:3001/api/import/parse-club-rosters';

async function testParseClubRosters() {
  console.log('🧪 Teste parse-club-rosters API...\n');
  
  const testUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154';
  const targetSeason = 'Winter 2025/2026';
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clubPoolsUrl: testUrl,
        targetSeason: targetSeason,
        apply: false // Dry-run
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Ergebnis:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`\n📊 Zusammenfassung:`);
      console.log(`   Club-Nummer: ${result.clubNumber || 'Nicht gefunden'}`);
      console.log(`   Teams gefunden: ${result.teams?.length || 0}`);
      
      if (result.teams && result.teams.length > 0) {
        console.log(`\n📋 Teams:`);
        result.teams.forEach((team, index) => {
          console.log(`   ${index + 1}. ${team.teamName} (${team.contestType})`);
          if (team.teamPortraitUrl) {
            console.log(`      ✅ Team-Portrait-URL: ${team.teamPortraitUrl}`);
          } else {
            console.log(`      ⚠️  Keine Team-Portrait-URL gefunden`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

testParseClubRosters();

