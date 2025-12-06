#!/usr/bin/env node

/**
 * Importiert Meldelisten für beide Teams eines Matchdays
 */

const MATCHDAY_ID = '23a84b2c-ae7e-4214-928b-d74a9ea5e543';

// Beispiel-URLs (müssen noch gefunden werden)
// VKC Köln 1: https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43
// TG GW im DJK Bocklemünd 1: muss noch gefunden werden

async function importRosters() {
  console.log('🚀 Importiere Meldelisten für Matchday:', MATCHDAY_ID);
  console.log('='.repeat(80));
  
  // TODO: Hole Matchday-Daten und finde Team-Portrait URLs
  // Dann rufe die API-Route auf, um die Meldelisten zu importieren
  
  console.log('\n📋 Nächste Schritte:');
  console.log('   1. Finde Team-Portrait URLs für beide Teams');
  console.log('   2. Importiere Meldelisten über API-Route');
  console.log('   3. Prüfe ob Spieler in LiveResultsWithDB angezeigt werden');
}

importRosters();

