const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_DELAY_MS = 350;

const TEAM_ID_MAP = {
  'SV Rot-Gelb Sürth 1': 'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  'TG Leverkusen 2': '06ee529a-18cf-4a30-bbe0-f7096314721e',
  'TC Colonius 3': 'd9660a5e-c08a-4586-97c5-14f9f0780457',
  'TV Ensen Westhoven 1': '19095c7a-4af4-45ab-b75c-6b82be78975a',
  'TC Ford Köln 2': '5f301d5a-2e19-42b4-b6be-b65b0def59cc',
  'TV Dellbrück 1': '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b',
  'VKC Köln 1': '235fade5-0974-4f5b-a758-536f771a5e80',
  'KölnerTHC Stadion RW 2': '6a3d2af0-19ca-4e89-88e1-4b5ef2401563',
  'TC Ford Köln 1': 'ca3eb684-f211-4c21-999e-693c1f090515',
  'TG GW im DJK Bocklemünd 1': '24a50fa0-2476-4118-a107-4098ffcdd934'
};

function withCors(res, status, payload) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.status(status).json(payload);
}

function resolveGroupFilter(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(',');
  }
  return String(value).trim() || null;
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

function summarizeGroups(results) {
  return results.map((entry) => ({
    groupId: entry.group?.groupId || null,
    groupName: entry.group?.groupName || null,
    league: entry.group?.league || null,
    category: entry.group?.category || null,
    matches: entry.matches?.length || 0,
    standingsRows: entry.standings?.length || 0,
    unmappedTeams: entry.unmappedTeams || []
  }));
}

function calculateTotals(results) {
  return results.reduce(
    (acc, entry) => {
      const matches = entry.matches?.length || 0;
      const standings = entry.standings?.length || 0;
      acc.matches += matches;
      acc.standings += standings;
      return acc;
    },
    { matches: 0, standings: 0 }
  );
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      groups,
      leagueUrl,
      season,
      apply = false,
      requestDelayMs,
      includeMatches = false
    } = req.body || {};

    const {
      scrapeNuLiga,
      DEFAULT_LEAGUE_URL,
      DEFAULT_SEASON_LABEL
    } = await import('../../lib/nuligaScraper.mjs');

    const groupFilter = resolveGroupFilter(groups);
    const effectiveLeagueUrl = leagueUrl || DEFAULT_LEAGUE_URL;
    const effectiveSeason = season || DEFAULT_SEASON_LABEL;
    const delay = Number.isFinite(requestDelayMs) ? requestDelayMs : DEFAULT_DELAY_MS;

    const supabaseClient = apply ? createSupabase(true) : null;

    const { results, unmappedTeams } = await scrapeNuLiga({
      leagueUrl: effectiveLeagueUrl,
      seasonLabel: effectiveSeason,
      groupFilter,
      requestDelayMs: delay,
      teamIdMap: TEAM_ID_MAP,
      supabaseClient,
      applyChanges: Boolean(apply),
      outputDir: null,
      onLog: (...messages) => console.log('[api/import/scrape-nuliga]', ...messages)
    });

    const totals = calculateTotals(results);
    const payload = {
      success: true,
      mode: apply ? 'apply' : 'dry-run',
      leagueUrl: effectiveLeagueUrl,
      season: effectiveSeason,
      groupsProcessed: results.length,
      totals,
      unmappedTeams,
      groups: summarizeGroups(results)
    };

    if (includeMatches) {
      payload.details = results;
    }

    return withCors(res, 200, payload);
  } catch (error) {
    console.error('[api/import/scrape-nuliga] Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Scraper-Aufruf.'
    });
  }
};
