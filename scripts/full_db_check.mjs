#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

console.log('🔍 VOLLSTÄNDIGE DATENBANK ANALYSE\n');
console.log('═══════════════════════════════════════════════════════\n');

// 1. Vereine
console.log('1️⃣ VEREINE (club_info)');
console.log('─────────────────────────────────────────────────────\n');

const { data: allClubs, error: clubError } = await supabase
  .from('club_info')
  .select('*')
  .order('name');

if (clubError) {
  console.error('❌ Fehler:', clubError);
} else {
  console.log(`📊 Gesamt: ${allClubs.length} Vereine\n`);
  
  // Suche Gruppe 044 Vereine
  const searchTerms = [
    { term: 'Bayer Dormagen', search: ['bayer', 'dormagen'] },
    { term: 'Rodenkirchener', search: ['rodenkirch'] },
    { term: 'RS Neubrück', search: ['neubruck', 'neubrueck', 'neubrück'] },
    { term: 'Kölner TG BG', search: ['kolner', 'tg', 'bg'] },
    { term: 'Colonius', search: ['colonius'] },
    { term: 'Stammheim', search: ['stammheim'] }
  ];
  
  console.log('🔍 Suche nach Gruppe 044 Vereinen:\n');
  searchTerms.forEach(({ term, search }) => {
    const found = allClubs.filter(c => {
      const normalized = (c.normalized_name || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return search.some(s => normalized.includes(s) || name.includes(s));
    });
    
    if (found.length > 0) {
      console.log(`✅ ${term}:`);
      found.forEach(c => console.log(`   → ${c.name} (${c.city || 'keine Stadt'})`));
    } else {
      console.log(`❌ ${term}: Nicht gefunden`);
    }
  });
}

console.log('\n═══════════════════════════════════════════════════════\n');

// 2. Matches Gruppe 044
console.log('2️⃣ MATCHES GRUPPE 044');
console.log('─────────────────────────────────────────────────────\n');

const { data: matches, error: matchError } = await supabase
  .from('matchdays')
  .select('*')
  .eq('group_name', 'Gr. 044')
  .eq('season', 'Winter 2025/26')
  .order('match_date', { ascending: true, nullsFirst: false });

if (matchError) {
  console.error('❌ Fehler:', matchError);
} else {
  console.log(`📊 Gesamt: ${matches.length} Matches\n`);
  
  const completed = matches.filter(m => m.status === 'completed');
  const scheduled = matches.filter(m => m.status === 'scheduled');
  const noDate = matches.filter(m => !m.match_date);
  
  console.log(`   ✅ Beendet:    ${completed.length}`);
  console.log(`   📅 Geplant:    ${scheduled.length}`);
  console.log(`   ⚠️  Ohne Datum: ${noDate.length}\n`);
  
  // Duplikate finden
  const grouped = new Map();
  matches.forEach(m => {
    const key = `${m.match_date}_${m.home_team_id}_${m.away_team_id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(m);
  });
  
  const duplicates = Array.from(grouped.values()).filter(g => g.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`🔁 DUPLIKATE GEFUNDEN: ${duplicates.length} Match-Kombinationen\n`);
    duplicates.slice(0, 5).forEach((dups, i) => {
      const m = dups[0];
      const date = m.match_date ? new Date(m.match_date).toLocaleDateString('de-DE') : 'Kein Datum';
      console.log(`   ${i + 1}. ${date} - Score: ${m.final_score || 'n/a'} (${dups.length}x vorhanden)`);
    });
    if (duplicates.length > 5) {
      console.log(`   ... und ${duplicates.length - 5} weitere\n`);
    }
    
    // Berechne wie viele gelöscht würden
    const toDelete = duplicates.reduce((sum, dups) => sum + (dups.length - 1), 0);
    console.log(`\n🧹 CLEANUP würde ${toDelete} Duplikate löschen`);
    console.log(`   Verbleiben: ${matches.length - toDelete} Matches\n`);
  } else {
    console.log('✅ Keine Duplikate gefunden!\n');
  }
}

console.log('═══════════════════════════════════════════════════════\n');

// 3. Teams
console.log('3️⃣ TEAMS');
console.log('─────────────────────────────────────────────────────\n');

const { data: teams, error: teamError } = await supabase
  .from('team_info')
  .select('*')
  .order('club_name');

if (teamError) {
  console.error('❌ Fehler:', teamError);
} else {
  console.log(`📊 Gesamt: ${teams.length} Teams\n`);
  
  // Suche Gruppe 044 Teams (via club_name)
  const gr044TeamNames = [
    'Bayer Dormagen',
    'Rodenkirchener',
    'Neubrück',
    'Kölner TG',
    'Colonius',
    'Stammheim'
  ];
  
  const gr044Teams = teams.filter(t => 
    gr044TeamNames.some(name => (t.club_name || '').includes(name))
  );
  
  if (gr044Teams.length > 0) {
    console.log(`🎾 Teams für Gruppe 044 (geschätzt): ${gr044Teams.length}\n`);
    gr044Teams.forEach(t => {
      console.log(`   - ${t.club_name} ${t.team_name || ''} (${t.category || 'keine Kategorie'})`);
    });
  }
}

console.log('\n═══════════════════════════════════════════════════════\n');

// ZUSAMMENFASSUNG
console.log('📋 ZUSAMMENFASSUNG');
console.log('═══════════════════════════════════════════════════════');
console.log(`Vereine gesamt:        ${allClubs?.length || 0}`);
console.log(`Teams gesamt:          ${teams?.length || 0}`);
console.log(`Matches Gr. 044:       ${matches?.length || 0}`);
if (duplicates && duplicates.length > 0) {
  const toDelete = duplicates.reduce((sum, dups) => sum + (dups.length - 1), 0);
  console.log(`⚠️  Duplikate:          ${toDelete} zu löschen`);
}
console.log('═══════════════════════════════════════════════════════\n');

console.log('✨ Analyse abgeschlossen!\n');





