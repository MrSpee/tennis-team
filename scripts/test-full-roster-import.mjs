#!/usr/bin/env node
/**
 * Vollständiger Test: clubPools → Team-Portrait-URLs → Meldelisten
 * 
 * Usage:
 *   node scripts/test-full-roster-import.mjs
 */

// Verwende native fetch (verfügbar in Node.js 18+)

const API_BASE = 'http://localhost:3001/api/import';

async function testFullRosterImport() {
  console.log('🧪 Vollständiger Test: Roster-Import\n');
  console.log('='.repeat(60));
  
  const clubPoolsUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154';
  const targetSeason = 'Winter 2025/2026';
  
  try {
    // SCHRITT 1: Parse clubPools-Seite
    console.log('\n📋 SCHRITT 1: Parse clubPools-Seite...');
    console.log(`   URL: ${clubPoolsUrl}`);
    console.log(`   Saison: ${targetSeason}\n`);
    
    const clubResponse = await fetch(`${API_BASE}/parse-club-rosters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubPoolsUrl,
        targetSeason,
        apply: false
      })
    });
    
    if (!clubResponse.ok) {
      const errorText = await clubResponse.text();
      throw new Error(`HTTP ${clubResponse.status}: ${errorText}`);
    }
    
    const clubResult = await clubResponse.json();
    
    if (!clubResult.success) {
      throw new Error(clubResult.error || 'Unbekannter Fehler');
    }
    
    console.log(`✅ Club-Nummer: ${clubResult.clubNumber || 'Nicht gefunden'}`);
    console.log(`✅ Teams gefunden: ${clubResult.teams?.length || 0}\n`);
    
    if (!clubResult.teams || clubResult.teams.length === 0) {
      console.log('⚠️  Keine Teams gefunden. Test beendet.');
      return;
    }
    
    // SCHRITT 2: Teste Meldelisten-Import für jedes Team
    console.log('📋 SCHRITT 2: Teste Meldelisten-Import für jedes Team...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (let i = 0; i < Math.min(clubResult.teams.length, 3); i++) { // Teste nur die ersten 3 Teams
      const team = clubResult.teams[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Team ${i + 1}/${Math.min(clubResult.teams.length, 3)}: ${team.teamName}`);
      console.log(`   Contest Type: ${team.contestType}`);
      
      if (!team.teamPortraitUrl) {
        console.log(`   ⚠️  Keine Team-Portrait-URL gefunden - überspringe`);
        errorCount++;
        results.push({ team: team.teamName, status: 'no_url', error: 'Keine Team-Portrait-URL' });
        continue;
      }
      
      console.log(`   ✅ Team-Portrait-URL: ${team.teamPortraitUrl}`);
      
      // Lade Meldeliste
      try {
        console.log(`   🔄 Lade Meldeliste...`);
        
        const rosterResponse = await fetch(`${API_BASE}/parse-team-roster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamPortraitUrl: team.teamPortraitUrl,
            teamId: null, // Nur Test, keine DB-Speicherung
            season: targetSeason,
            apply: false // Dry-run
          })
        });
        
        if (!rosterResponse.ok) {
          const errorText = await rosterResponse.text();
          throw new Error(`HTTP ${rosterResponse.status}: ${errorText}`);
        }
        
        const rosterResult = await rosterResponse.json();
        
        if (rosterResult.success && rosterResult.roster && rosterResult.roster.length > 0) {
          console.log(`   ✅ ${rosterResult.roster.length} Spieler gefunden`);
          
          // Zeige erste 3 Spieler als Beispiel
          console.log(`   📊 Beispiel-Spieler:`);
          rosterResult.roster.slice(0, 3).forEach((player, idx) => {
            console.log(`      ${idx + 1}. Rang ${player.rank}: ${player.name} (${player.lk || 'keine LK'})`);
          });
          
          successCount++;
          results.push({
            team: team.teamName,
            status: 'success',
            playerCount: rosterResult.roster.length,
            players: rosterResult.roster.slice(0, 5) // Erste 5 Spieler
          });
        } else {
          console.log(`   ⚠️  Keine Spieler gefunden`);
          errorCount++;
          results.push({ team: team.teamName, status: 'no_players', error: 'Keine Spieler in Meldeliste' });
        }
        
        // Kurze Pause zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Fehler: ${error.message}`);
        errorCount++;
        results.push({ team: team.teamName, status: 'error', error: error.message });
      }
    }
    
    // SCHRITT 3: Zusammenfassung
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 ZUSAMMENFASSUNG\n');
    console.log(`   ✅ Erfolgreich: ${successCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);
    console.log(`   📋 Teams getestet: ${Math.min(clubResult.teams.length, 3)}/${clubResult.teams.length}`);
    
    if (successCount > 0) {
      console.log(`\n✅ Test erfolgreich! Die Roster-Import-Funktionalität funktioniert.`);
      console.log(`\n💡 Nächste Schritte:`);
      console.log(`   1. Integration in SuperAdmin Dashboard`);
      console.log(`   2. Automatisches Speichern in Datenbank (apply=true)`);
      console.log(`   3. Matching mit players_unified`);
    } else {
      console.log(`\n⚠️  Test fehlgeschlagen. Bitte prüfe die Fehler oben.`);
    }
    
  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testFullRosterImport();

