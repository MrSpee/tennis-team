/**
 * Script: Find Duplicates in Database
 * 
 * Findet Dopplungen bei:
 * - Vereinen (club_info)
 * - Mannschaften (team_info)
 * - Spielern (players_unified)
 * 
 * Erstellt einen detaillierten Report mit Lösungsvorschlägen
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade .env Datei manuell
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  .env nicht gefunden, verwende Umgebungsvariablen');
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY nicht gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalisierungs-Funktion für Namen
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ähnlichkeits-Berechnung (Levenshtein-ähnlich, vereinfacht)
function calculateSimilarity(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Einfache Ähnlichkeit: gemeinsame Zeichen
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Gemeinsame Wörter
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) {
    return commonWords.length / Math.max(words1.length, words2.length);
  }
  
  return 0.0;
}

async function findClubDuplicates() {
  console.log('\n🔍 Prüfe Vereine (club_info) auf Dopplungen...\n');
  
  const { data: clubs, error } = await supabase
    .from('club_info')
    .select('id, name, normalized_name, address, city')
    .order('name');
  
  if (error) {
    console.error('❌ Fehler beim Laden der Vereine:', error);
    return [];
  }
  
  const duplicates = [];
  const normalizedMap = new Map();
  
  // Gruppiere nach normalized_name
  clubs.forEach(club => {
    const normalized = normalizeName(club.name);
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, []);
    }
    normalizedMap.get(normalized).push(club);
  });
  
  // Finde Dopplungen
  normalizedMap.forEach((clubList, normalized) => {
    if (clubList.length > 1) {
      duplicates.push({
        type: 'exact_duplicate',
        normalized,
        clubs: clubList,
        count: clubList.length
      });
    }
  });
  
  // Finde ähnliche Namen (Fuzzy-Matching)
  const similarPairs = [];
  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      const similarity = calculateSimilarity(clubs[i].name, clubs[j].name);
      if (similarity > 0.8 && similarity < 1.0) {
        similarPairs.push({
          club1: clubs[i],
          club2: clubs[j],
          similarity: similarity
        });
      }
    }
  }
  
  if (duplicates.length > 0) {
    console.log(`⚠️  ${duplicates.length} exakte Dopplungen gefunden:`);
    duplicates.forEach(dup => {
      console.log(`\n  "${dup.normalized}":`);
      dup.clubs.forEach(club => {
        console.log(`    - ID: ${club.id}, Name: "${club.name}", Adresse: ${club.address || 'keine'}`);
      });
    });
  } else {
    console.log('✅ Keine exakten Dopplungen gefunden');
  }
  
  if (similarPairs.length > 0) {
    console.log(`\n⚠️  ${similarPairs.length} ähnliche Vereinsnamen gefunden (potenzielle Dopplungen):`);
    similarPairs.slice(0, 10).forEach(pair => {
      console.log(`\n  "${pair.club1.name}" ↔ "${pair.club2.name}" (Ähnlichkeit: ${(pair.similarity * 100).toFixed(1)}%)`);
      console.log(`    IDs: ${pair.club1.id} ↔ ${pair.club2.id}`);
    });
  }
  
  return { exact: duplicates, similar: similarPairs };
}

async function findTeamDuplicates() {
  console.log('\n🔍 Prüfe Mannschaften (team_info) auf Dopplungen...\n');
  
  const { data: teams, error } = await supabase
    .from('team_info')
    .select('id, club_name, category, team_name, club_id')
    .order('club_name, category, team_name');
  
  if (error) {
    console.error('❌ Fehler beim Laden der Mannschaften:', error);
    return [];
  }
  
  const duplicates = [];
  const keyMap = new Map();
  
  // Gruppiere nach club_name + category + team_name
  teams.forEach(team => {
    const key = `${normalizeName(team.club_name)}::${team.category || ''}::${team.team_name || ''}`;
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key).push(team);
  });
  
  // Finde Dopplungen
  keyMap.forEach((teamList, key) => {
    if (teamList.length > 1) {
      duplicates.push({
        type: 'exact_duplicate',
        key,
        teams: teamList,
        count: teamList.length
      });
    }
  });
  
  // Prüfe auf unterschiedliche club_ids bei gleichem club_name
  const clubNameMap = new Map();
  teams.forEach(team => {
    const normalized = normalizeName(team.club_name);
    if (!clubNameMap.has(normalized)) {
      clubNameMap.set(normalized, new Map());
    }
    const clubIdMap = clubNameMap.get(normalized);
    const clubId = team.club_id || 'NULL';
    if (!clubIdMap.has(clubId)) {
      clubIdMap.set(clubId, []);
    }
    clubIdMap.get(clubId).push(team);
  });
  
  const inconsistentClubIds = [];
  clubNameMap.forEach((clubIdMap, normalizedClubName) => {
    if (clubIdMap.size > 1) {
      inconsistentClubIds.push({
        club_name: normalizedClubName,
        club_ids: Array.from(clubIdMap.keys()),
        teams: Array.from(clubIdMap.values()).flat()
      });
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`⚠️  ${duplicates.length} exakte Dopplungen gefunden:`);
    duplicates.forEach(dup => {
      console.log(`\n  ${dup.key}:`);
      dup.teams.forEach(team => {
        console.log(`    - ID: ${team.id}, Club: "${team.club_name}", Category: "${team.category}", Team: "${team.team_name || 'NULL'}"`);
      });
    });
  } else {
    console.log('✅ Keine exakten Dopplungen gefunden');
  }
  
  if (inconsistentClubIds.length > 0) {
    console.log(`\n⚠️  ${inconsistentClubIds.length} Mannschaften mit unterschiedlichen club_ids bei gleichem club_name:`);
    inconsistentClubIds.slice(0, 10).forEach(inc => {
      console.log(`\n  "${inc.club_name}":`);
      console.log(`    Club-IDs: ${inc.club_ids.join(', ')}`);
      console.log(`    Anzahl Teams: ${inc.teams.length}`);
    });
  }
  
  return { exact: duplicates, inconsistentClubIds };
}

async function findPlayerDuplicates() {
  console.log('\n🔍 Prüfe Spieler (players_unified) auf Dopplungen...\n');
  
  const { data: players, error } = await supabase
    .from('players_unified')
    .select('id, name, email, tvm_id_number, user_id')
    .order('name');
  
  if (error) {
    console.error('❌ Fehler beim Laden der Spieler:', error);
    return [];
  }
  
  const duplicates = {
    byName: [],
    byEmail: [],
    byTvmId: [],
    similar: []
  };
  
  // Dopplungen nach Name
  const nameMap = new Map();
  players.forEach(player => {
    const normalized = normalizeName(player.name);
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, []);
    }
    nameMap.get(normalized).push(player);
  });
  
  nameMap.forEach((playerList, normalized) => {
    if (playerList.length > 1) {
      duplicates.byName.push({
        normalized,
        players: playerList,
        count: playerList.length
      });
    }
  });
  
  // Dopplungen nach Email
  const emailMap = new Map();
  players.forEach(player => {
    if (player.email) {
      const normalizedEmail = player.email.toLowerCase().trim();
      if (!emailMap.has(normalizedEmail)) {
        emailMap.set(normalizedEmail, []);
      }
      emailMap.get(normalizedEmail).push(player);
    }
  });
  
  emailMap.forEach((playerList, email) => {
    if (playerList.length > 1) {
      duplicates.byEmail.push({
        email,
        players: playerList,
        count: playerList.length
      });
    }
  });
  
  // Dopplungen nach TVM ID
  const tvmIdMap = new Map();
  players.forEach(player => {
    if (player.tvm_id_number) {
      const tvmId = String(player.tvm_id_number).trim();
      if (!tvmIdMap.has(tvmId)) {
        tvmIdMap.set(tvmId, []);
      }
      tvmIdMap.get(tvmId).push(player);
    }
  });
  
  tvmIdMap.forEach((playerList, tvmId) => {
    if (playerList.length > 1) {
      duplicates.byTvmId.push({
        tvmId,
        players: playerList,
        count: playerList.length
      });
    }
  });
  
  // Ähnliche Namen (Fuzzy-Matching)
  const similarPairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const similarity = calculateSimilarity(players[i].name, players[j].name);
      if (similarity > 0.85 && similarity < 1.0) {
        // Prüfe ob sie nicht bereits durch Email oder TVM ID als Duplikat erkannt wurden
        const sameEmail = players[i].email && players[j].email && 
                         players[i].email.toLowerCase() === players[j].email.toLowerCase();
        const sameTvmId = players[i].tvm_id_number && players[j].tvm_id_number &&
                         String(players[i].tvm_id_number) === String(players[j].tvm_id_number);
        
        if (!sameEmail && !sameTvmId) {
          similarPairs.push({
            player1: players[i],
            player2: players[j],
            similarity: similarity
          });
        }
      }
    }
  }
  duplicates.similar = similarPairs;
  
  // Ausgabe
  if (duplicates.byName.length > 0) {
    console.log(`⚠️  ${duplicates.byName.length} Dopplungen nach Name gefunden:`);
    duplicates.byName.slice(0, 10).forEach(dup => {
      console.log(`\n  "${dup.normalized}":`);
      dup.players.forEach(player => {
        console.log(`    - ID: ${player.id}, Name: "${player.name}", Email: ${player.email || 'keine'}, TVM ID: ${player.tvm_id_number || 'keine'}`);
      });
    });
  } else {
    console.log('✅ Keine Dopplungen nach Name gefunden');
  }
  
  if (duplicates.byEmail.length > 0) {
    console.log(`\n⚠️  ${duplicates.byEmail.length} Dopplungen nach Email gefunden:`);
    duplicates.byEmail.slice(0, 10).forEach(dup => {
      console.log(`\n  Email: "${dup.email}":`);
      dup.players.forEach(player => {
        console.log(`    - ID: ${player.id}, Name: "${player.name}", TVM ID: ${player.tvm_id_number || 'keine'}`);
      });
    });
  } else {
    console.log('✅ Keine Dopplungen nach Email gefunden');
  }
  
  if (duplicates.byTvmId.length > 0) {
    console.log(`\n⚠️  ${duplicates.byTvmId.length} Dopplungen nach TVM ID gefunden:`);
    duplicates.byTvmId.slice(0, 10).forEach(dup => {
      console.log(`\n  TVM ID: "${dup.tvmId}":`);
      dup.players.forEach(player => {
        console.log(`    - ID: ${player.id}, Name: "${player.name}", Email: ${player.email || 'keine'}`);
      });
    });
  } else {
    console.log('✅ Keine Dopplungen nach TVM ID gefunden');
  }
  
  if (duplicates.similar.length > 0) {
    console.log(`\n⚠️  ${duplicates.similar.length} ähnliche Spielernamen gefunden (potenzielle Dopplungen):`);
    duplicates.similar.slice(0, 10).forEach(pair => {
      console.log(`\n  "${pair.player1.name}" ↔ "${pair.player2.name}" (Ähnlichkeit: ${(pair.similarity * 100).toFixed(1)}%)`);
      console.log(`    IDs: ${pair.player1.id} ↔ ${pair.player2.id}`);
      console.log(`    Email 1: ${pair.player1.email || 'keine'}, Email 2: ${pair.player2.email || 'keine'}`);
      console.log(`    TVM ID 1: ${pair.player1.tvm_id_number || 'keine'}, TVM ID 2: ${pair.player2.tvm_id_number || 'keine'}`);
    });
  }
  
  return duplicates;
}

async function generateReport() {
  console.log('📊 Generiere Dopplungs-Report...\n');
  console.log('='.repeat(80));
  
  const clubDuplicates = await findClubDuplicates();
  const teamDuplicates = await findTeamDuplicates();
  const playerDuplicates = await findPlayerDuplicates();
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 ZUSAMMENFASSUNG:\n');
  
  const totalClubDups = clubDuplicates.exact.length + clubDuplicates.similar.length;
  const totalTeamDups = teamDuplicates.exact.length + teamDuplicates.inconsistentClubIds.length;
  const totalPlayerDups = playerDuplicates.byName.length + 
                          playerDuplicates.byEmail.length + 
                          playerDuplicates.byTvmId.length + 
                          playerDuplicates.similar.length;
  
  console.log(`Vereine: ${totalClubDups} potenzielle Dopplungen`);
  console.log(`  - Exakte: ${clubDuplicates.exact.length}`);
  console.log(`  - Ähnliche: ${clubDuplicates.similar.length}`);
  
  console.log(`\nMannschaften: ${totalTeamDups} potenzielle Probleme`);
  console.log(`  - Exakte Dopplungen: ${teamDuplicates.exact.length}`);
  console.log(`  - Inkonsistente club_ids: ${teamDuplicates.inconsistentClubIds.length}`);
  
  console.log(`\nSpieler: ${totalPlayerDups} potenzielle Dopplungen`);
  console.log(`  - Nach Name: ${playerDuplicates.byName.length}`);
  console.log(`  - Nach Email: ${playerDuplicates.byEmail.length}`);
  console.log(`  - Nach TVM ID: ${playerDuplicates.byTvmId.length}`);
  console.log(`  - Ähnliche Namen: ${playerDuplicates.similar.length}`);
  
  if (totalClubDups === 0 && totalTeamDups === 0 && totalPlayerDups === 0) {
    console.log('\n✅ Keine Dopplungen gefunden! Die Datenbank ist sauber.');
  } else {
    console.log('\n⚠️  Es wurden Dopplungen gefunden. Bitte prüfe die Details oben.');
  }
  
  return {
    clubs: clubDuplicates,
    teams: teamDuplicates,
    players: playerDuplicates
  };
}

// Hauptfunktion
async function main() {
  try {
    await generateReport();
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

main();

