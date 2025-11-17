#!/usr/bin/env node

/**
 * Testet den Meeting-Report Import direkt
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
const API_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

async function testMeetingReport() {
  console.log('🧪 Teste Meeting-Report Import direkt...\n');
  
  const matchdayId = 'c092932a-4954-4114-b898-a3b9f8430b2a'; // Match #414
  const meetingId = '12500213';
  
  const payload = {
    matchdayId: matchdayId,
    meetingId: meetingId,
    groupId: '34',
    matchNumber: '414',
    homeTeam: 'TG Leverkusen 1',
    awayTeam: 'Kölner KHT SW 2',
    apply: true
  };
  
  console.log('📤 Sende Request:', JSON.stringify(payload, null, 2));
  console.log('');
  
  try {
    const response = await fetch(`${API_URL}/api/import/meeting-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Text (erste 2000 Zeichen):', text.substring(0, 2000));
    console.log('');
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('❌ Antwort ist kein JSON');
      return;
    }
    
    if (result.success) {
      console.log('✅ API-Aufruf erfolgreich!');
      console.log('');
      
      if (result.singles && result.singles.length > 0) {
        console.log('📊 Erstes Einzel-Match:');
        const first = result.singles[0];
        console.log('  Home Players:', first.homePlayers?.map(p => ({ name: p.name, lk: p.lk })) || []);
        console.log('  Away Players:', first.awayPlayers?.map(p => ({ name: p.name, lk: p.lk })) || []);
        console.log('');
      }
      
      if (result.applyResult) {
        console.log('💾 Apply Result:');
        console.log('  Inserted:', result.applyResult.inserted?.length || 0);
        console.log('  Missing Players:', result.applyResult.missingPlayers?.length || 0);
        console.log('');
      }
    } else {
      console.error('❌ API-Aufruf fehlgeschlagen:', result.error);
    }
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

testMeetingReport().catch(console.error);

