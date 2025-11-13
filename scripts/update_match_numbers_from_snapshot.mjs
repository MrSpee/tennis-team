import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SNAPSHOT_PATH = path.resolve('tmp/tvm_league_snapshot_groups_42_43_44.json');

function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    if (!line.includes('=')) return;
    const [key, ...rest] = line.split('=');
    const value = rest.join('=').trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase-Konfiguration fehlt. Bitte SERVICE_ROLE_KEY und VITE_SUPABASE_URL setzen.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const normalizeString = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const splitTeamLabel = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return { clubName: '', suffix: '' };
  const match = trimmed.match(/^(.*?)(?:\s+([IVXLCM]+|\d+))$/iu);
  if (!match) return { clubName: trimmed, suffix: '' };
  return {
    clubName: (match[1] || '').trim(),
    suffix: match[2] ? match[2].trim() : ''
  };
};

const buildTeamKeys = (teamLabel = '') => {
  const { clubName, suffix } = splitTeamLabel(teamLabel);
  const keys = new Set();
  if (clubName) keys.add(normalizeString(clubName));
  if (suffix) keys.add(normalizeString(`${clubName} ${suffix}`));
  keys.add(normalizeString(teamLabel));
  if (suffix) keys.add(normalizeString(suffix));
  return Array.from(keys).filter(Boolean);
};

async function buildTeamLookup() {
  const { data, error } = await supabase.from('team_info').select('id, club_name, team_name');
  if (error) throw error;

  const lookup = new Map();
  (data || []).forEach((team) => {
    const { club_name, team_name } = team;
    const label = `${club_name}${team_name ? ` ${team_name}` : ''}`;
    buildTeamKeys(label).forEach((key) => {
      if (!lookup.has(key)) {
        lookup.set(key, team.id);
      }
    });
  });
  return lookup;
}

function toMatchDateIso(match) {
  if (!match.matchDateIso) return null;
  try {
    return new Date(match.matchDateIso).toISOString();
  } catch {
    return null;
  }
}

const MATCH_TAG_REGEX = /match\s*#(\d+)/i;

function mergeNotes(existingNotes = '', matchNumber, originalNotes) {
  const cleanedExisting = existingNotes.replace(MATCH_TAG_REGEX, '').replace(/^ · /, '').trim();
  const cleanedOriginal = (originalNotes || '').replace(MATCH_TAG_REGEX, '').trim();

  const segments = [`Match #${matchNumber}`];
  if (cleanedOriginal) segments.push(cleanedOriginal);
  if (cleanedExisting) segments.push(cleanedExisting);

  const joined = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(' · ');

  return joined || `Match #${matchNumber}`;
}

async function updateMatchNumber(match, teamLookup) {
  const matchNumber = match.matchNumber || match.match_number;
  if (!matchNumber) return { skipped: true, reason: 'no-match-number' };

  const matchDateIso = toMatchDateIso(match);
  if (!matchDateIso) return { skipped: true, reason: 'no-date' };

  const homeKeys = buildTeamKeys(match.homeTeam || '');
  const awayKeys = buildTeamKeys(match.awayTeam || '');

  const homeId = homeKeys.map((key) => teamLookup.get(normalizeString(key))).find(Boolean);
  const awayId = awayKeys.map((key) => teamLookup.get(normalizeString(key))).find(Boolean);

  if (!homeId || !awayId) {
    return { skipped: true, reason: 'team-not-found', details: { homeId, awayId } };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('matchdays')
    .select('id, notes')
    .eq('match_date', matchDateIso)
    .eq('home_team_id', homeId)
    .eq('away_team_id', awayId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    return { skipped: true, reason: 'match-not-found' };
  }

  if (existing.notes && MATCH_TAG_REGEX.test(existing.notes)) {
    const [, existingNumber] = existing.notes.match(MATCH_TAG_REGEX) || [];
    if (existingNumber && String(existingNumber) === String(matchNumber)) {
      return { skipped: true, reason: 'already-set' };
    }
  }

  const mergedNotes = mergeNotes(existing.notes, matchNumber, match.notes);

  const { error: updateError } = await supabase
    .from('matchdays')
    .update({ notes: mergedNotes })
    .eq('id', existing.id);

  if (updateError) throw updateError;
  return { updated: true };
}

async function run() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌ Snapshot nicht gefunden: ${SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const teamLookup = await buildTeamLookup();

  let updated = 0;
  let alreadySet = 0;
  let missingTeams = 0;
  let missingMatches = 0;
  let missingNumbers = 0;
  let missingDates = 0;

  for (const group of snapshot.groups || []) {
    for (const match of group.matches || []) {
      const result = await updateMatchNumber(match, teamLookup);
      if (!result) continue;
      if (result.updated) updated += 1;
      else if (result.reason === 'already-set') alreadySet += 1;
      else if (result.reason === 'team-not-found') missingTeams += 1;
      else if (result.reason === 'match-not-found') missingMatches += 1;
      else if (result.reason === 'no-match-number') missingNumbers += 1;
      else if (result.reason === 'no-date') missingDates += 1;
    }
  }

  console.log('✅ Match-Number-Update abgeschlossen');
  console.log(`   Aktualisiert: ${updated}`);
  console.log(`   Bereits gesetzt: ${alreadySet}`);
  console.log(`   Ohne MatchNumber: ${missingNumbers}`);
  console.log(`   Ohne Datum: ${missingDates}`);
  console.log(`   Team nicht gefunden: ${missingTeams}`);
  console.log(`   Match nicht gefunden: ${missingMatches}`);
}

run().catch((error) => {
  console.error('❌ Fehler beim Aktualisieren der Match-Nummern:', error);
  process.exit(1);
});

