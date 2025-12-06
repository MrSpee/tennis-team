#!/usr/bin/env node

/**
 * Importiert Meldelisten für beide Teams über die API-Route
 */

const MATCHDAY_ID = '23a84b2c-ae7e-4214-928b-d74a9ea5e543';

// Team-Daten
const TEAMS = [
  {
    teamId: '1aac84b3-d911-471e-9b6f-1f60f0afdf62',
    teamName: 'VKC Köln 1',
    teamPortraitUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    season: 'Winter 2025/26'
  },
  {
    teamId: '501d0a38-73ec-48f3-aa5d-2723f8243f7e',
    teamName: 'TG GW im DJK Bocklemünd 1',
    teamPortraitUrl: null, // Muss noch gefunden werden
    season: 'Winter 2025/26'
  }
];

async function importRosters() {
  console.log('🚀 Importiere Meldelisten für Matchday:', MATCHDAY_ID);
  console.log('='.repeat(80));
  
  for (const team of TEAMS) {
    console.log(`\n📋 Team: ${team.teamName}`);
    
    if (!team.teamPortraitUrl) {
      console.log('   ⚠️  Team-Portrait URL fehlt - muss noch gefunden werden');
      continue;
    }
    
    console.log(`   URL: ${team.teamPortraitUrl}`);
    console.log(`   → Importiere Meldeliste...`);
    
    try {
      // Rufe API-Route auf
      const response = await fetch('http://localhost:3001/api/import/parse-team-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamPortraitUrl: team.teamPortraitUrl,
          teamId: team.teamId,
          season: team.season,
          apply: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Fehler: ${response.status} - ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const result = await response.json();
      
      if (result.success && result.saved) {
        console.log(`   ✅ Meldeliste importiert: ${result.saved.stats?.total || 0} Spieler`);
        console.log(`      - ${result.saved.stats?.matched || 0} mit players_unified gematcht`);
        console.log(`      - ${result.saved.stats?.unmatched || 0} neue Spieler erstellt`);
      } else {
        console.log(`   ❌ Import fehlgeschlagen: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Fehler beim API-Aufruf: ${error.message}`);
      console.log('   → Stelle sicher, dass der Dev-Server läuft (npm run dev)');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Import abgeschlossen!');
  console.log('\n📋 Nächste Schritte:');
  console.log('   1. Öffne: http://localhost:3001/live-results/23a84b2c-ae7e-4214-928b-d74a9ea5e543/edit');
  console.log('   2. Prüfe ob Meldelisten-Spieler im Dropdown angezeigt werden');
  console.log('   3. Prüfe Browser-Konsole für Logs');
}

importRosters();

