import { createClient } from '@supabase/supabase-js';
import { parseMeetingReport } from '../lib/nuligaScraper.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Lade .env.local oder .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');
const envPathFallback = join(__dirname, '..', '.env');

let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  try {
    envContent = readFileSync(envPathFallback, 'utf-8');
  } catch {
    console.warn('⚠️ Keine .env Datei gefunden');
  }
}

// Parse env variables
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Matchday 366: ESV Gremberghoven 1 vs. Rodenkirchener TC 2
const meetingId = '12500293';
const meetingUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&meeting=${meetingId}`;

console.log('🔍 Lade Meeting-Report für Matchday 366...');
console.log(`URL: ${meetingUrl}\n`);

try {
  const response = await fetch(meetingUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const html = await response.text();
  console.log(`✅ HTML geladen (${html.length} Zeichen)\n`);
  
  // Parse Meeting-Report
  const parsed = parseMeetingReport(html);
  
  console.log('📊 Parsed Meeting-Report:');
  console.log(`  Singles: ${parsed.singles?.length || 0}`);
  console.log(`  Doubles: ${parsed.doubles?.length || 0}\n`);
  
  // Zeige Details für alle Matches
  console.log('🎾 EINZEL-MATCHES:');
  parsed.singles?.forEach((match, idx) => {
    console.log(`\n  Match #${idx + 1} (Slot ${match.slotHome || '?'} vs. ${match.slotAway || '?'}):`);
    console.log(`    Walkover: ${match.walkover ? `Ja (Winner: ${match.walkover.winner}, Reason: ${match.walkover.reason})` : 'Nein'}`);
    console.log(`    Home Players (${match.homePlayers?.length || 0}):`);
    match.homePlayers?.forEach(p => {
      console.log(`      - ${p.name} (LK: ${p.lk || 'N/A'}, Position: ${p.position || 'N/A'})`);
    });
    console.log(`    Away Players (${match.awayPlayers?.length || 0}):`);
    match.awayPlayers?.forEach(p => {
      console.log(`      - ${p.name} (LK: ${p.lk || 'N/A'}, Position: ${p.position || 'N/A'})`);
    });
    if (match.setScores && match.setScores.length > 0) {
      console.log(`    Set Scores:`, match.setScores);
    }
  });
  
  console.log('\n🎾 DOPPEL-MATCHES:');
  parsed.doubles?.forEach((match, idx) => {
    console.log(`\n  Match #${idx + 1} (Slot ${match.slotHome || '?'} vs. ${match.slotAway || '?'}):`);
    console.log(`    Walkover: ${match.walkover ? `Ja (Winner: ${match.walkover.winner}, Reason: ${match.walkover.reason})` : 'Nein'}`);
    console.log(`    Home Players (${match.homePlayers?.length || 0}):`);
    match.homePlayers?.forEach(p => {
      console.log(`      - ${p.name} (LK: ${p.lk || 'N/A'}, Position: ${p.position || 'N/A'})`);
    });
    console.log(`    Away Players (${match.awayPlayers?.length || 0}):`);
    match.awayPlayers?.forEach(p => {
      console.log(`      - ${p.name} (LK: ${p.lk || 'N/A'}, Position: ${p.position || 'N/A'})`);
    });
    if (match.setScores && match.setScores.length > 0) {
      console.log(`    Set Scores:`, match.setScores);
    }
  });
  
  // Prüfe, ob Gast-Spieler in nuLiga vorhanden sind, aber nicht extrahiert wurden
  console.log('\n🔍 ANALYSE:');
  const allMatches = [...(parsed.singles || []), ...(parsed.doubles || [])];
  const walkoverMatches = allMatches.filter(m => m.walkover);
  const walkoverWithoutAwayPlayers = walkoverMatches.filter(m => 
    m.walkover?.winner === 'home' && (!m.awayPlayers || m.awayPlayers.length === 0)
  );
  
  console.log(`  Gesamt Matches: ${allMatches.length}`);
  console.log(`  Walkover-Matches: ${walkoverMatches.length}`);
  console.log(`  Walkover ohne Gast-Spieler: ${walkoverWithoutAwayPlayers.length}`);
  
  if (walkoverWithoutAwayPlayers.length > 0) {
    console.log('\n  ⚠️  PROBLEM: Walkover-Matches ohne Gast-Spieler gefunden!');
    console.log('     Diese Matches haben möglicherweise Gast-Spieler in nuLiga, die nicht extrahiert wurden.');
  }
  
} catch (error) {
  console.error('❌ Fehler:', error.message);
  console.error(error.stack);
  process.exit(1);
}

