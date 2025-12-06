#!/usr/bin/env node

/**
 * Findet Team-Portrait URLs und importiert Meldelisten für beide Teams
 */

const MATCHDAY_ID = '23a84b2c-ae7e-4214-928b-d74a9ea5e543';

// Bekannte Team-Portrait URL für VKC Köln 1 (Herren 40)
const VKC_TEAM_PORTRAIT_URL = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43';

async function findAndImportRosters() {
  console.log('🚀 Finde und importiere Meldelisten für Matchday:', MATCHDAY_ID);
  console.log('='.repeat(80));
  
  // 1. Hole Matchday-Daten
  console.log('\n1️⃣ Lade Matchday-Daten...');
  
  // 2. Für VKC Köln 1: URL ist bekannt
  console.log('\n2️⃣ VKC Köln 1 (Herren 40):');
  console.log(`   Team-Portrait URL: ${VKC_TEAM_PORTRAIT_URL}`);
  console.log('   → Diese URL kann direkt verwendet werden');
  
  // 3. Für TG GW im DJK Bocklemünd 1: URL muss gefunden werden
  console.log('\n3️⃣ TG GW im DJK Bocklemünd 1 (Herren 40):');
  console.log('   → Team-Portrait URL muss noch gefunden werden');
  console.log('   → Kann über nuLiga Gruppen-Seite gefunden werden');
  
  console.log('\n📋 Nächste Schritte:');
  console.log('   1. Finde Team-Portrait URL für TG GW im DJK Bocklemünd 1');
  console.log('   2. Speichere URLs in team_seasons.source_url');
  console.log('   3. Importiere Meldelisten über API-Route');
  console.log('   4. Teste in LiveResultsWithDB');
}

findAndImportRosters();

