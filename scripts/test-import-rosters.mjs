#!/usr/bin/env node

/**
 * Test: Importiert Meldelisten für beide Teams und testet die Anzeige
 */

const MATCHDAY_ID = '23a84b2c-ae7e-4214-928b-d74a9ea5e543';

// Bekannte URLs
const VKC_TEAM_PORTRAIT_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43';
// TG GW im DJK Bocklemünd 1: muss noch gefunden werden

async function testImport() {
  console.log('🧪 Test: Meldelisten-Import für Matchday:', MATCHDAY_ID);
  console.log('='.repeat(80));
  
  console.log('\n📋 Teams:');
  console.log('   1. VKC Köln 1 (Herren 40) - Team-ID: 1aac84b3-d911-471e-9b6f-1f60f0afdf62');
  console.log('      Team-Portrait URL: ✅ Vorhanden');
  console.log('   2. TG GW im DJK Bocklemünd 1 (Herren 40) - Team-ID: 501d0a38-73ec-48f3-aa5d-2723f8243f7e');
  console.log('      Team-Portrait URL: ❌ Muss noch gefunden werden');
  
  console.log('\n📋 Nächste Schritte:');
  console.log('   1. Finde Team-Portrait URL für TG GW im DJK Bocklemünd 1');
  console.log('   2. Speichere URL in team_seasons');
  console.log('   3. Importiere Meldelisten über API-Route');
  console.log('   4. Teste in LiveResultsWithDB');
}

testImport();

