#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

console.log('🔍 Prüfe Matches in Gruppe 044...\n');

const { data: matches, error } = await supabase
  .from('matchdays')
  .select(`
    *,
    home:team_info!matchdays_home_team_id_fkey(id, club_name, team_name, category),
    away:team_info!matchdays_away_team_id_fkey(id, club_name, team_name, category)
  `)
  .eq('group_name', 'Gr. 044')
  .eq('season', 'Winter 2025/26')
  .order('match_date', { ascending: true, nullsFirst: false });

if (error) {
  console.error('❌ Fehler:', error);
  process.exit(1);
}

console.log(`📊 Gefundene Matches: ${matches.length}\n`);

// Gruppiere nach eindeutiger Kombination
const uniqueMatches = new Map();
matches.forEach(m => {
  const key = `${m.match_date}_${m.home_team_id}_${m.away_team_id}`;
  if (!uniqueMatches.has(key)) {
    uniqueMatches.set(key, []);
  }
  uniqueMatches.get(key).push(m);
});

console.log(`🎯 Einzigartige Match-Kombinationen: ${uniqueMatches.size}\n`);

// Zeige Duplikate
let duplicateCount = 0;
uniqueMatches.forEach((matchList, key) => {
  if (matchList.length > 1) {
    duplicateCount++;
    const m = matchList[0];
    const date = m.match_date ? new Date(m.match_date).toLocaleDateString('de-DE') : 'Kein Datum';
    console.log(`🔁 DUPLIKAT (${matchList.length}x): ${date} - ${m.home?.club_name || 'unknown'} ${m.home?.team_name || ''} vs ${m.away?.club_name || 'unknown'} ${m.away?.team_name || ''}`);
    console.log(`   IDs: ${matchList.map(x => x.id.substring(0, 8)).join(', ')}`);
  }
});

console.log(`\n⚠️  Gesamt Duplikate: ${duplicateCount} Match-Kombinationen existieren mehrfach\n`);

// Zeige alle Teams
const allTeams = new Set();
matches.forEach(m => {
  if (m.home) allTeams.add(`${m.home.club_name} ${m.home.team_name}`);
  if (m.away) allTeams.add(`${m.away.club_name} ${m.away.team_name}`);
});

console.log('📋 Beteiligte Teams:');
[...allTeams].sort().forEach((t, i) => {
  console.log(`${i + 1}. ${t}`);
});

console.log('\n✨ Analyse abgeschlossen!\n');








