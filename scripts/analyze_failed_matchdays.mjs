/**
 * Analyse-Script für fehlgeschlagene Matchdays
 * 
 * Scraped die nuLiga-Daten für die 4 fehlgeschlagenen Matchdays und analysiert,
 * warum sie nicht gefunden wurden.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Umgebungsvariablen
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
  } catch (e) {
    console.warn('⚠️ Konnte .env.local nicht laden, verwende process.env');
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Für dieses Script brauchen wir Supabase nicht direkt, nur für die API-Calls
// const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Die 4 fehlgeschlagenen Matchdays
const FAILED_MATCHDAYS = [
  {
    id: '5bcb8cb9-9a9f-4d70-95fe-26881927e413',
    date: '2025-11-23',
    group: '041',
    league: '3. Kreisliga 4-er',
    homeTeam: 'TC Colonius 3',
    awayTeam: 'TG GW im DJK Bocklemünd 2',
    sourceUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3'
  },
  {
    id: '510420f6-3606-47ae-a374-9b4224758ebd',
    date: '2025-11-22',
    group: '035',
    league: '2. Bezirksliga',
    homeTeam: 'VKC Köln 1',
    awayTeam: 'TC Viktoria 2',
    sourceUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3'
  },
  {
    id: '72faf889-cf2f-462e-ba00-90ee02caddb1',
    date: '2025-11-22',
    group: '043',
    league: '1. Bezirksliga',
    homeTeam: 'KölnerTHC Stadion RW 2',
    awayTeam: 'TC Ford Köln 1',
    sourceUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3'
  },
  {
    id: '21df6036-8dac-4163-be7f-ecb077a7daa7',
    date: '2025-11-15',
    group: '047',
    league: '1. Kreisliga',
    homeTeam: 'TC GW Grossrotter Hof 3',
    awayTeam: 'TC GW Königsforst 2',
    sourceUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3'
  }
];

// Helper: Normalisiere String für Vergleich
function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Berechne Similarity (Jaro-Winkler)
function calculateSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (prefix * 0.1 * (1 - jaro));
}

async function analyzeMatchday(matchday) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ANALYSE: ${matchday.homeTeam} vs. ${matchday.awayTeam}`);
  console.log(`   Datum: ${matchday.date}`);
  console.log(`   Gruppe: ${matchday.group}`);
  console.log(`   Liga: ${matchday.league}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Scrape nuLiga-Daten für diese Gruppe
    const apiUrl = process.env.API_BASE_URL || 'https://tennis-team-gamma.vercel.app';
    const response = await fetch(`${apiUrl}/api/import/scrape-nuliga`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groups: matchday.group,
        leagueUrl: matchday.sourceUrl,
        includeMatches: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API-Fehler (${response.status}):`, errorText);
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`❌ Scraping fehlgeschlagen:`, data.error);
      return;
    }
    
    // Finde die passende Gruppe
    const details = Array.isArray(data.details) ? data.details : [];
    const groupDetail = details.find(entry => {
      const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
      const normalizedEntryId = entryGroupId ? String(parseInt(entryGroupId, 10)) : null;
      const normalizedSearchId = String(parseInt(matchday.group, 10));
      return normalizedEntryId === normalizedSearchId;
    });
    
    if (!groupDetail) {
      console.error(`❌ Gruppe ${matchday.group} nicht in den Scraping-Ergebnissen gefunden!`);
      console.log(`   Verfügbare Gruppen:`, details.map(d => d.group?.groupId).filter(Boolean));
      return;
    }
    
    const matches = groupDetail.matches || [];
    console.log(`✅ Gruppe ${matchday.group} gefunden mit ${matches.length} Matches\n`);
    
    // Finde Matches am gesuchten Datum
    const targetDate = new Date(matchday.date).toISOString().split('T')[0];
    const matchesOnDate = matches.filter(m => {
      if (!m.matchDateIso) return false;
      const matchDate = new Date(m.matchDateIso).toISOString().split('T')[0];
      return matchDate === targetDate;
    });
    
    console.log(`📅 Matches am ${targetDate}: ${matchesOnDate.length}`);
    
    if (matchesOnDate.length === 0) {
      console.log(`   ⚠️ KEINE Matches an diesem Datum gefunden!`);
      console.log(`   Verfügbare Daten:`, [...new Set(matches.map(m => {
        if (!m.matchDateIso) return null;
        return new Date(m.matchDateIso).toISOString().split('T')[0];
      }).filter(Boolean))].sort());
    } else {
      console.log(`\n   Gefundene Matches:\n`);
      matchesOnDate.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.homeTeam || '?'} vs. ${m.awayTeam || '?'}`);
        console.log(`      Status: ${m.status || '?'}`);
        console.log(`      Meeting ID: ${m.meetingId || 'KEINE'}`);
        console.log(`      Match Number: ${m.matchNumber || '?'}`);
        console.log(`      Zeit: ${m.startTime || '?'}`);
        console.log(`      Venue: ${m.venue || '?'}`);
        console.log('');
      });
    }
    
    // Analysiere Teamnamen-Matching
    console.log(`\n🔍 TEAMNAMEN-ANALYSE:\n`);
    const normalizedHome = normalizeString(matchday.homeTeam);
    const normalizedAway = normalizeString(matchday.awayTeam);
    
    console.log(`   Gesucht (DB):`);
    console.log(`     Home: "${matchday.homeTeam}" → "${normalizedHome}"`);
    console.log(`     Away: "${matchday.awayTeam}" → "${normalizedAway}"`);
    
    // Prüfe alle Matches (nicht nur am Datum) für Teamnamen-Vergleich
    console.log(`\n   Verfügbare Teamnamen in nuLiga:\n`);
    const allHomeTeams = [...new Set(matches.map(m => m.homeTeam).filter(Boolean))];
    const allAwayTeams = [...new Set(matches.map(m => m.awayTeam).filter(Boolean))];
    const allTeams = [...new Set([...allHomeTeams, ...allAwayTeams])];
    
    // Finde beste Matches für Home-Team
    const homeMatches = allTeams.map(team => ({
      team,
      normalized: normalizeString(team),
      similarity: calculateSimilarity(normalizedHome, normalizeString(team))
    })).sort((a, b) => b.similarity - a.similarity);
    
    console.log(`   Home-Team "${matchday.homeTeam}" - Beste Matches:`);
    homeMatches.slice(0, 5).forEach(m => {
      console.log(`     "${m.team}" → Similarity: ${(m.similarity * 100).toFixed(1)}%`);
    });
    
    // Finde beste Matches für Away-Team
    const awayMatches = allTeams.map(team => ({
      team,
      normalized: normalizeString(team),
      similarity: calculateSimilarity(normalizedAway, normalizeString(team))
    })).sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n   Away-Team "${matchday.awayTeam}" - Beste Matches:`);
    awayMatches.slice(0, 5).forEach(m => {
      console.log(`     "${m.team}" → Similarity: ${(m.similarity * 100).toFixed(1)}%`);
    });
    
    // Prüfe ob es ein Match mit ähnlichen Teamnamen gibt
    console.log(`\n   🔎 Suche nach Matches mit ähnlichen Teamnamen:\n`);
    const candidateMatches = matches.map(m => {
      const mHomeNorm = normalizeString(m.homeTeam || '');
      const mAwayNorm = normalizeString(m.awayTeam || '');
      const mDate = m.matchDateIso ? new Date(m.matchDateIso).toISOString().split('T')[0] : null;
      
      const homeSim = calculateSimilarity(normalizedHome, mHomeNorm);
      const awaySim = calculateSimilarity(normalizedAway, mAwayNorm);
      const homeSimRev = calculateSimilarity(normalizedHome, mAwayNorm);
      const awaySimRev = calculateSimilarity(normalizedAway, mHomeNorm);
      
      const score = Math.max(
        (homeSim + awaySim) / 2,
        (homeSimRev + awaySimRev) / 2
      );
      
      return {
        match: m,
        date: mDate,
        homeSim,
        awaySim,
        homeSimRev,
        awaySimRev,
        score,
        dateMatch: mDate === targetDate
      };
    }).sort((a, b) => b.score - a.score);
    
    const bestCandidates = candidateMatches.slice(0, 5);
    bestCandidates.forEach((c, idx) => {
      console.log(`   ${idx + 1}. Score: ${(c.score * 100).toFixed(1)}% | Datum: ${c.date} ${c.dateMatch ? '✅' : '❌'}`);
      console.log(`      ${c.match.homeTeam || '?'} vs. ${c.match.awayTeam || '?'}`);
      console.log(`      Home Sim: ${(c.homeSim * 100).toFixed(1)}% | Away Sim: ${(c.awaySim * 100).toFixed(1)}%`);
      console.log(`      Meeting ID: ${c.match.meetingId || 'KEINE'}`);
      console.log('');
    });
    
    // Zusammenfassung
    console.log(`\n📊 ZUSAMMENFASSUNG:\n`);
    const exactDateMatch = candidateMatches.find(c => c.dateMatch && c.score > 0.7);
    if (exactDateMatch) {
      console.log(`   ✅ POTENTIELLES MATCH GEFUNDEN!`);
      console.log(`      Score: ${(exactDateMatch.score * 100).toFixed(1)}%`);
      console.log(`      ${exactDateMatch.match.homeTeam} vs. ${exactDateMatch.match.awayTeam}`);
      console.log(`      Meeting ID: ${exactDateMatch.match.meetingId || 'KEINE'}`);
      console.log(`      ⚠️ Warum wurde es nicht gefunden? Threshold zu hoch?`);
    } else {
      const bestScore = candidateMatches[0]?.score || 0;
      if (bestScore > 0.5) {
        console.log(`   ⚠️ Ähnliches Match gefunden, aber Score zu niedrig (${(bestScore * 100).toFixed(1)}% < 70%)`);
        console.log(`      Bestes Match: ${candidateMatches[0].match.homeTeam} vs. ${candidateMatches[0].match.awayTeam}`);
        console.log(`      Datum: ${candidateMatches[0].date} ${candidateMatches[0].dateMatch ? '(korrekt)' : '(falsch)'}`);
      } else {
        console.log(`   ❌ KEIN ähnliches Match gefunden (bester Score: ${(bestScore * 100).toFixed(1)}%)`);
        console.log(`   Mögliche Ursachen:`);
        console.log(`     - Match existiert nicht in nuLiga`);
        console.log(`     - Match wurde verschoben/abgesagt`);
        console.log(`     - Teamnamen stimmen nicht überein`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Fehler bei der Analyse:`, error);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Starte Analyse der fehlgeschlagenen Matchdays...\n');
  
  for (const matchday of FAILED_MATCHDAYS) {
    await analyzeMatchday(matchday);
    
    // Pause zwischen den Requests
    if (matchday !== FAILED_MATCHDAYS[FAILED_MATCHDAYS.length - 1]) {
      console.log('\n⏳ Warte 2 Sekunden...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Analyse abgeschlossen!');
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);

