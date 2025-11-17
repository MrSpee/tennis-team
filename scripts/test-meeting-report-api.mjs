#!/usr/bin/env node

/**
 * Test-Script für den Meeting-Report API-Endpoint
 * Testet ob Spieler-Daten korrekt extrahiert und gespeichert werden
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Environment-Variablen
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  } catch (error) {
    console.error('⚠️ Fehler beim Laden von .env.local:', error.message);
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

// Teste den API-Endpoint lokal
async function testMeetingReportAPI() {
  console.log('🧪 Teste Meeting-Report API-Endpoint...\n');
  
  // Hole Matchday-ID für Match #414
  const matchdayId = 'c092932a-4954-4114-b898-a3b9f8430b2a'; // Match #414
  const meetingId = '12500213';
  
  console.log(`📋 Teste mit:`);
  console.log(`   Matchday ID: ${matchdayId}`);
  console.log(`   Meeting ID: ${meetingId}\n`);
  
  // Simuliere den API-Aufruf
  const payload = {
    matchdayId: matchdayId,
    meetingId: meetingId,
    groupId: '34',
    matchNumber: '414',
    homeTeam: 'TG Leverkusen 1',
    awayTeam: 'Kölner KHT SW 2',
    apply: true
  };
  
  console.log('📤 Sende Request an API...');
  console.log('   Payload:', JSON.stringify(payload, null, 2));
  console.log('');
  
  try {
    // Teste lokal (wenn der Server läuft)
    const response = await fetch('http://localhost:3000/api/import/meeting-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('❌ Antwort ist kein JSON:', text);
      return;
    }
    
    console.log('📥 Antwort vom Server:');
    console.log('   Status:', response.status);
    console.log('   Success:', result.success);
    console.log('');
    
    if (result.success) {
      console.log('✅ API-Aufruf erfolgreich!');
      console.log('');
      console.log('📊 Extrahierte Daten:');
      console.log('   Singles:', result.singles?.length || 0);
      console.log('   Doubles:', result.doubles?.length || 0);
      console.log('');
      
      if (result.singles && result.singles.length > 0) {
        console.log('🎾 Erstes Einzel-Match:');
        const firstSingle = result.singles[0];
        console.log('   Home Players:', firstSingle.homePlayers?.map(p => ({ name: p.name, lk: p.lk })));
        console.log('   Away Players:', firstSingle.awayPlayers?.map(p => ({ name: p.name, lk: p.lk })));
        console.log('');
      }
      
      if (result.applyResult) {
        console.log('💾 Apply Result:');
        console.log('   Inserted:', result.applyResult.inserted?.length || 0);
        console.log('   Missing Players:', result.applyResult.missingPlayers?.length || 0);
        console.log('');
        
        if (result.applyResult.missingPlayers && result.applyResult.missingPlayers.length > 0) {
          console.log('⚠️ Fehlende Spieler:');
          result.applyResult.missingPlayers.forEach(p => {
            console.log(`   - ${p.name} (${p.context?.side || 'unknown'})`);
          });
        }
      }
    } else {
      console.error('❌ API-Aufruf fehlgeschlagen:');
      console.error('   Error:', result.error);
      console.error('   Error Code:', result.errorCode);
    }
  } catch (error) {
    console.error('❌ Fehler beim API-Aufruf:', error.message);
    console.error('');
    console.error('💡 Tipp: Stelle sicher, dass der Development-Server läuft (npm run dev)');
  }
}

testMeetingReportAPI().catch(console.error);

