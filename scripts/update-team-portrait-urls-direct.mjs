#!/usr/bin/env node

/**
 * Aktualisiert Team-Portrait-URLs direkt über Supabase API
 * Führt die UPDATE-Statements für Gruppe 43 aus
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (key && !process.env[key]) {
        process.env[key] = rest.join('=').trim();
      }
    });
  } catch (error) {}
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Team-Portrait-URLs für Gruppe 43
const TEAM_URLS = [
  {
    clubName: 'VKC',
    teamName: '1',
    category: 'Herren 40',
    groupName: '043',
    url: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43'
  },
  {
    clubName: 'TG GW',
    teamName: '1',
    category: 'Herren 40',
    groupName: '043',
    url: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43'
  },
  {
    clubName: 'Rot-Weiss',
    teamName: '2',
    category: 'Herren 40',
    groupName: '043',
    url: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471569&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43'
  },
  {
    clubName: 'Ford',
    teamName: '1',
    category: 'Herren 40',
    groupName: '043',
    url: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471572&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43'
  },
  {
    clubName: 'Dellbrück',
    teamName: '1',
    category: 'Herren 40',
    groupName: '043',
    url: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472117&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43'
  }
];

async function updateUrls() {
  console.log('🚀 Aktualisiere Team-Portrait-URLs für Gruppe 43');
  console.log('='.repeat(80));
  
  let updated = 0;
  let notFound = 0;
  
  for (const teamUrl of TEAM_URLS) {
    console.log(`\n🔍 Suche: ${teamUrl.clubName} ${teamUrl.teamName} (${teamUrl.category})`);
    
    // 1. Finde Team-ID
    const { data: teams, error: teamError } = await supabase
      .from('team_info')
      .select('id, club_name, team_name, category')
      .ilike('club_name', `%${teamUrl.clubName}%`)
      .eq('team_name', teamUrl.teamName)
      .eq('category', teamUrl.category)
      .limit(1);
    
    if (teamError || !teams || teams.length === 0) {
      console.log(`   ❌ Team nicht gefunden`);
      notFound++;
      continue;
    }
    
    const teamId = teams[0].id;
    console.log(`   ✅ Team gefunden: ${teams[0].club_name} ${teams[0].team_name} (ID: ${teamId})`);
    
    // 2. Finde team_seasons Eintrag (flexibel suchen)
    let seasons = null;
    let seasonError = null;
    
    // Versuche verschiedene Saison-Varianten
    const seasonVariants = ['Winter 2025/26', 'Winter 2025/2026', 'Winter 25/26'];
    const groupVariants = [teamUrl.groupName, `Gr. ${teamUrl.groupName}`, `Gr. 0${teamUrl.groupName}`];
    
    for (const seasonVariant of seasonVariants) {
      for (const groupVariant of groupVariants) {
        const { data, error } = await supabase
          .from('team_seasons')
          .select('id, team_id, season, group_name, source_url')
          .eq('team_id', teamId)
          .ilike('season', `%${seasonVariant}%`)
          .ilike('group_name', `%${groupVariant}%`)
          .eq('is_active', true)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          seasons = data;
          break;
        }
        seasonError = error;
      }
      if (seasons) break;
    }
    
    // Falls nicht gefunden, versuche ohne group_name Filter
    if (!seasons) {
      for (const seasonVariant of seasonVariants) {
        const { data, error } = await supabase
          .from('team_seasons')
          .select('id, team_id, season, group_name, source_url')
          .eq('team_id', teamId)
          .ilike('season', `%${seasonVariant}%`)
          .eq('is_active', true)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          seasons = data;
          console.log(`   ⚠️  Gefunden ohne group_name Filter (Gruppe: ${data[0].group_name})`);
          break;
        }
      }
    }
    
    if (!seasons || seasons.length === 0) {
      console.log(`   ⚠️  team_seasons Eintrag nicht gefunden`);
      console.log(`      → Versuche team_seasons Eintrag zu erstellen...`);
      
      // Versuche team_seasons Eintrag zu erstellen
      const { data: newSeason, error: createError } = await supabase
        .from('team_seasons')
        .insert({
          team_id: teamId,
          season: 'Winter 2025/26',
          group_name: `Gr. ${teamUrl.groupName.padStart(3, '0')}`,
          league: '1. Bezirksliga',
          team_size: 6,
          is_active: true,
          source_url: teamUrl.url,
          source_type: 'nuliga'
        })
        .select('id')
        .single();
      
      if (createError) {
        console.log(`      ❌ Konnte nicht erstellen: ${createError.message}`);
        notFound++;
        continue;
      } else {
        console.log(`      ✅ team_seasons Eintrag erstellt (ID: ${newSeason.id})`);
        updated++;
        continue;
      }
    }
    
    const seasonId = seasons[0].id;
    console.log(`   ✅ team_seasons gefunden (ID: ${seasonId}, Gruppe: ${seasons[0].group_name})`);
    
    // 3. Update source_url
    const { error: updateError } = await supabase
      .from('team_seasons')
      .update({
        source_url: teamUrl.url,
        source_type: 'nuliga'
      })
      .eq('id', seasonId);
    
    if (updateError) {
      console.error(`   ❌ Fehler beim Update:`, updateError.message);
    } else {
      console.log(`   ✅ URL aktualisiert!`);
      updated++;
    }
  }
  
  console.log(`\n\n✅ Fertig!`);
  console.log(`📊 Zusammenfassung:`);
  console.log(`   - ${updated} URLs aktualisiert`);
  console.log(`   - ${notFound} Teams nicht gefunden`);
}

updateUrls().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

