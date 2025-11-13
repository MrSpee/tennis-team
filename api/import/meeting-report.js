const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function withCors(res, status, payload) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.status(status).json(payload);
}

function normalizeString(value) {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function createSupabase(applyMode) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Supabase URL fehlt in den Umgebungsvariablen.');
  }

  if (applyMode) {
    if (!serviceRoleKey) {
      throw new Error('Für apply-Modus wird SUPABASE_SERVICE_ROLE_KEY benötigt.');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY fehlt in den Umgebungsvariablen.');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
}

async function determineMeetingId({
  leagueUrl,
  groupId,
  matchNumber,
  homeTeam,
  awayTeam
}) {
  const imports = await DEFAULT_IMPORTS.get();
  const { scrapeNuLiga: scrape } = imports;
  const normalizedGroupId = groupId ? String(parseInt(groupId, 10)) : null;
  const { results } = await scrape({
    leagueUrl: leagueUrl || imports.DEFAULT_LEAGUE_URL,
    groupFilter: normalizedGroupId,
    requestDelayMs: 120,
    applyChanges: false,
    supabaseClient: null,
    outputDir: null,
    onLog: () => {}
  });

  if (!results || !results.length) {
    throw new Error('Keine Gruppeninformationen gefunden, um Meeting-ID zu bestimmen.');
  }

  const targetGroup = results.find((entry) => {
    const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
    return !normalizedGroupId || entryGroupId === normalizedGroupId;
  });

  if (!targetGroup) {
    throw new Error(`Keine passende Gruppe für ID ${groupId} gefunden.`);
  }

  const normalizedMatchNumber = matchNumber ? String(matchNumber).trim() : null;
  const normalizedHome = normalizeString(homeTeam);
  const normalizedAway = normalizeString(awayTeam);

  const matched = targetGroup.matches?.find((match) => {
    if (match.meetingId) {
      if (normalizedMatchNumber && match.matchNumber && normalizeString(match.matchNumber) === normalizedMatchNumber) {
        return true;
      }
      const matchHome = normalizeString(match.homeTeam);
      const matchAway = normalizeString(match.awayTeam);
      return matchHome === normalizedHome && matchAway === normalizedAway;
    }
    return false;
  });

  if (!matched || !matched.meetingId) {
    throw new Error('Meeting-ID konnte aus der Gruppenübersicht nicht ermittelt werden.');
  }

  return {
    meetingId: matched.meetingId,
    meetingReportUrl: matched.meetingReportUrl || null,
    groupMeta: targetGroup.group,
    matchMeta: matched
  };
}

function toInt(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildNotes(match) {
  const homeNames = (match.homePlayers || []).map((player) => player.name).join(', ');
  const awayNames = (match.awayPlayers || []).map((player) => player.name).join(', ');
  const lines = [];
  if (homeNames || awayNames) {
    lines.push(`Heim: ${homeNames || 'n/a'}`);
    lines.push(`Gast: ${awayNames || 'n/a'}`);
  }
  if (match.matchPoints?.raw) {
    lines.push(`Matchpunkte: ${match.matchPoints.raw}`);
  }
  if (match.sets?.raw) {
    lines.push(`Sätze: ${match.sets.raw}`);
  }
  if (match.games?.raw) {
    lines.push(`Spiele: ${match.games.raw}`);
  }
  return lines.join(' | ');
}

function determineMatchWinner(setScores = [], matchPoints = null) {
  let homeSets = 0;
  let guestSets = 0;
  setScores.slice(0, 3).forEach((set) => {
    if (!set || set.home == null || set.away == null) return;
    if (set.home > set.away) homeSets += 1;
    else if (set.away > set.home) guestSets += 1;
  });
  if (homeSets > guestSets) return 'home';
  if (guestSets > homeSets) return 'guest';
  if (matchPoints && matchPoints.home != null && matchPoints.away != null) {
    if (matchPoints.home > matchPoints.away) return 'home';
    if (matchPoints.away > matchPoints.home) return 'guest';
  }
  return null;
}

async function applyMeetingResults({ supabase, matchdayId, singles, doubles }) {
  const rows = [];
  let counter = 0;
  const playerCache = new Map();
  const pendingPlayers = new Map();

  const ensurePlayer = async (rawName) => {
    const name = (rawName || '').trim();
    if (!name) return null;
    const cacheKey = name.toLowerCase();
    if (playerCache.has(cacheKey)) return playerCache.get(cacheKey);

    const { data: existing, error: selectError } = await supabase
      .from('players_unified')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (selectError) {
      console.warn('[meeting-report] Spieler-Suche fehlgeschlagen:', selectError.message);
    }
    if (existing?.id) {
      playerCache.set(cacheKey, existing.id);
      return existing.id;
    }

    playerCache.set(cacheKey, null);
    const pending = pendingPlayers.get(name) || { name, occurrences: 0 };
    pending.occurrences += 1;
    pendingPlayers.set(name, pending);
    return null;
  };

  const resolvePlayersForMatch = async (match, type) => {
    const result = {};
    const homePlayers = (match.homePlayers || []).map((player) => player.name?.trim()).filter(Boolean);
    const awayPlayers = (match.awayPlayers || []).map((player) => player.name?.trim()).filter(Boolean);

    if (type === 'Einzel') {
      result.home_player_id = homePlayers[0] ? await ensurePlayer(homePlayers[0]) : null;
      result.guest_player_id = awayPlayers[0] ? await ensurePlayer(awayPlayers[0]) : null;
    } else {
      result.home_player1_id = homePlayers[0] ? await ensurePlayer(homePlayers[0]) : null;
      result.home_player2_id = homePlayers[1] ? await ensurePlayer(homePlayers[1]) : null;
      result.guest_player1_id = awayPlayers[0] ? await ensurePlayer(awayPlayers[0]) : null;
      result.guest_player2_id = awayPlayers[1] ? await ensurePlayer(awayPlayers[1]) : null;
    }

    return result;
  };

  const appendRow = async (match, type) => {
    counter += 1;
    const setScores = match.setScores || [];
    const matchPoints = match.matchPoints || null;
    const status = matchPoints && matchPoints.home != null && matchPoints.away != null ? 'completed' : 'pending';
    const winner = status === 'completed' ? determineMatchWinner(setScores, matchPoints) : null;
    const playerAssignments = await resolvePlayersForMatch(match, type);

    rows.push({
      matchday_id: matchdayId,
      match_number: counter,
      match_type: type,
      home_score: matchPoints?.home ?? null,
      away_score: matchPoints?.away ?? null,
      set1_home: toInt(setScores[0]?.home),
      set1_guest: toInt(setScores[0]?.away),
      set2_home: toInt(setScores[1]?.home),
      set2_guest: toInt(setScores[1]?.away),
      set3_home: toInt(setScores[2]?.home),
      set3_guest: toInt(setScores[2]?.away),
      notes: buildNotes(match),
      status,
      winner,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      entered_at: new Date().toISOString(),
      ...playerAssignments
    });
  };

  for (const match of singles) {
    await appendRow(match, 'Einzel');
  }
  for (const match of doubles) {
    await appendRow(match, 'Doppel');
  }

  if (!rows.length) {
    return { inserted: [], deleted: 0 };
  }

  // Lösche vorhandene Ergebnisse für diesen Matchday, um doppelte Einträge zu vermeiden
  const { error: deleteError } = await supabase.from('match_results').delete().eq('matchday_id', matchdayId);
  if (deleteError) {
    throw deleteError;
  }

  const { data, error } = await supabase
    .from('match_results')
    .insert(rows, {
      defaultToNull: true
    })
    .select();
  if (error) {
    throw error;
  }

  return {
    inserted: data || [],
    deleted: rows.length,
    missingPlayers: Array.from(pendingPlayers.values())
  };
}

const DEFAULT_IMPORTS = {
  cached: null,
  async get() {
    if (!this.cached) {
      this.cached = await import('../../lib/nuligaScraper.mjs');
    }
    return this.cached;
  }
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      meetingId,
      meetingUrl,
      groupId,
      matchNumber,
      matchdayId,
      homeTeam,
      awayTeam,
      apply = false
    } = req.body || {};

  const imports = await DEFAULT_IMPORTS.get();

    let resolvedMeetingId = meetingId || null;
    let groupMeta = null;
    let matchMeta = null;
    let resolvedMeetingUrl = meetingUrl || null;

    if (!resolvedMeetingId) {
      if (!groupId) {
        throw new Error('groupId erforderlich, wenn keine meetingId übergeben wird.');
      }
      const result = await determineMeetingId({
        leagueUrl: imports.DEFAULT_LEAGUE_URL,
        groupId,
        matchNumber,
        homeTeam,
        awayTeam
      });
      resolvedMeetingId = result.meetingId;
      resolvedMeetingUrl = result.meetingReportUrl || resolvedMeetingUrl;
      groupMeta = result.groupMeta;
      matchMeta = result.matchMeta;
    }

    if (groupId && !groupMeta) {
      try {
        const metaResult = await determineMeetingId({
          leagueUrl: imports.DEFAULT_LEAGUE_URL,
          groupId,
          matchNumber,
          homeTeam,
          awayTeam
        });
        groupMeta = metaResult.groupMeta || groupMeta;
        matchMeta = metaResult.matchMeta || matchMeta;
        if (!resolvedMeetingId) {
          resolvedMeetingId = metaResult.meetingId;
        }
        if (!resolvedMeetingUrl) {
          resolvedMeetingUrl = metaResult.meetingReportUrl || resolvedMeetingUrl;
        }
      } catch (metaError) {
        console.warn('[meeting-report] Hinweis: Match-Meta konnte nicht bestimmt werden:', metaError.message);
      }
    }

    if (!resolvedMeetingId && !resolvedMeetingUrl) {
      throw new Error('Meeting-Report konnte nicht aufgelöst werden.');
    }

    const meetingData = await imports.scrapeMeetingReport({
      meetingId: resolvedMeetingId,
      meetingUrl: resolvedMeetingUrl
    });

    let applyResult = null;
    if (apply) {
      if (!matchdayId) {
        throw new Error('matchdayId ist erforderlich, um Daten zu speichern.');
      }
      const supabase = createSupabase(true);
      applyResult = await applyMeetingResults({
        supabase,
        matchdayId,
        singles: meetingData.singles,
        doubles: meetingData.doubles
      });
    }

    return withCors(res, 200, {
      success: true,
      applied: Boolean(apply),
      meetingId: meetingData.meetingId || resolvedMeetingId || null,
      meetingUrl: meetingData.url || resolvedMeetingUrl || null,
      metadata: meetingData.metadata,
      singles: meetingData.singles,
      doubles: meetingData.doubles,
      totals: meetingData.totals,
      groupMeta,
      matchMeta,
      applyResult
    });
  } catch (error) {
    console.error('[api/import/meeting-report] Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Meeting-Report-Parser.'
    });
  }
};

console.log('[meeting-report] service key present:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));
