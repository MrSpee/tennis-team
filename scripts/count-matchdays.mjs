#!/usr/bin/env node
/**
 * Zählt Matchdays in der Datenbank
 * 
 * Usage: node scripts/count-matchdays.mjs [group_name]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (err) {
    // Ignore
  }
}

loadEnvFile(join(__dirname, '..', '.env.local'));
loadEnvFile(join(__dirname, '..', '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countMatchdays() {
  console.log('🔍 Zähle Matchdays...\n');

  const groupName = process.argv[2] || null;

  try {
    let query = supabase
      .from('matchdays')
      .select('id, match_number, season, league, group_name, status, match_date', { count: 'exact' });

    if (groupName) {
      query = query.eq('group_name', groupName);
    }

    const { data: matchdays, error, count } = await query;

    if (error) {
      throw error;
    }

    // Gruppiere nach Gruppe
    const byGroup = {};
    matchdays?.forEach(matchday => {
      const key = `${matchday.season}::${matchday.league}::${matchday.group_name}`;
      if (!byGroup[key]) {
        byGroup[key] = {
          season: matchday.season,
          league: matchday.league,
          groupName: matchday.group_name,
          matches: [],
          withResults: 0,
          withoutResults: 0,
          completed: 0
        };
      }
      byGroup[key].matches.push(matchday);
      if (matchday.status === 'completed') {
        byGroup[key].completed++;
      }
    });

    // Prüfe Match-Results für jede Gruppe
    for (const [key, group] of Object.entries(byGroup)) {
      const matchdayIds = group.matches.map(m => m.id);
      
      const { data: results } = await supabase
        .from('match_results')
        .select('matchday_id')
        .in('matchday_id', matchdayIds);
      
      const matchdaysWithResults = new Set(results?.map(r => r.matchday_id) || []);
      
      group.matches.forEach(matchday => {
        if (matchdaysWithResults.has(matchday.id)) {
          group.withResults++;
        } else {
          group.withoutResults++;
        }
      });
    }

    console.log('='.repeat(80));
    console.log(`📊 GESAMT: ${count || matchdays?.length || 0} Matchdays`);
    console.log('='.repeat(80));
    console.log('');

    if (Object.keys(byGroup).length > 0) {
      console.log('📋 Aufgeschlüsselt nach Gruppen:\n');
      
      for (const [key, group] of Object.entries(byGroup)) {
        console.log(`📌 ${group.groupName} (${group.league})`);
        console.log(`   Saison: ${group.season}`);
        console.log(`   Total Matches: ${group.matches.length}`);
        console.log(`   ✅ Mit Match-Results: ${group.withResults}`);
        console.log(`   ⚠️  Ohne Match-Results: ${group.withoutResults}`);
        console.log(`   🏁 Completed: ${group.completed}`);
        console.log('');
      }
    } else {
      console.log('⚠️ Keine Matchdays gefunden');
    }

    // Zeige Match-Nummern für jede Gruppe
    if (Object.keys(byGroup).length > 0) {
      console.log('='.repeat(80));
      console.log('📋 Match-Nummern pro Gruppe:\n');
      
      for (const [key, group] of Object.entries(byGroup)) {
        const matchNumbers = group.matches
          .map(m => m.match_number)
          .filter(Boolean)
          .sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return String(a).localeCompare(String(b));
          });
        
        console.log(`📌 ${group.groupName}:`);
        console.log(`   Match-Nummern: ${matchNumbers.join(', ')}`);
        console.log(`   Anzahl: ${matchNumbers.length}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

countMatchdays().then(() => {
  console.log('✅ Zählung abgeschlossen');
  process.exit(0);
});

