/**
 * Konsolidierte nuLiga Matches-Import API
 * 
 * Ersetzt: scrape-nuliga.js
 * 
 * Endpoints:
 * - POST /league-groups  → Extrahiert Gruppen aus leaguePage
 * - POST /group-details  → Lädt Matchdays und Details einer Gruppe
 * - POST /match-results  → Aktualisiert Match-Ergebnisse
 */

const { createSupabaseClient } = require('../_lib/supabaseAdmin');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const DEFAULT_DELAY_MS = 350;

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

/**
 * Haupt-Handler für die API
 */
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, { ok: true });
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed. Use POST.' });
  }
  
  try {
    const { action, ...params } = req.body;
    
    // Endpoint-Routing basierend auf action-Parameter
    switch (action) {
      case 'league-groups':
        return handleLeagueGroups(req, res, params);
      case 'group-details':
        return handleGroupDetails(req, res, params);
      case 'match-results':
        return handleMatchResults(req, res, params);
      default:
        return withCors(res, 400, { 
          error: 'Invalid action. Use: "league-groups", "group-details", or "match-results"' 
        });
    }
    
  } catch (error) {
    console.error('[nuliga-matches-import] ❌ Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler'
    });
  }
}

/**
 * Endpoint: league-groups
 * Extrahiert Gruppen aus leaguePage
 */
async function handleLeagueGroups(req, res, params) {
  try {
    const {
      leagueUrl,
      season,
      groups // Optional: Filter für spezifische Gruppen (z.B. "43,46" oder ["43", "46"])
    } = params;

    // Importiere scrapeNuLiga aus lib/nuligaScraper.mjs
    const {
      scrapeNuLiga,
      DEFAULT_LEAGUE_URL,
      DEFAULT_SEASON_LABEL
    } = await import('../../lib/nuligaScraper.mjs');

    const effectiveLeagueUrl = leagueUrl || DEFAULT_LEAGUE_URL;
    const effectiveSeason = season || DEFAULT_SEASON_LABEL;
    const groupFilter = resolveGroupFilter(groups);

    // Dry-run: Nur Gruppen-Info extrahieren, keine DB-Writes
    const { results } = await scrapeNuLiga({
      leagueUrl: effectiveLeagueUrl,
      seasonLabel: effectiveSeason,
      groupFilter: groupFilter,
      requestDelayMs: DEFAULT_DELAY_MS,
      teamIdMap: {},
      supabaseClient: null, // Kein DB-Client für dry-run
      applyChanges: false,
      outputDir: null,
      onLog: (...messages) => console.log('[nuliga-matches-import]', ...messages)
    });

    // Formatiere Gruppen-Liste für Response
    const groupsList = results.map(entry => ({
      groupId: entry.group?.groupId || null,
      groupName: entry.group?.groupName || null,
      league: entry.group?.league || null,
      category: entry.group?.category || null,
      matchCount: entry.matches?.length || 0,
      standingsCount: entry.standings?.length || 0
    }));

    return withCors(res, 200, {
      success: true,
      leagueUrl: effectiveLeagueUrl,
      season: effectiveSeason,
      groups: groupsList,
      totalGroups: groupsList.length
    });
    
  } catch (error) {
    console.error('[nuliga-matches-import] ❌ Fehler in league-groups:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Fehler beim Laden der Gruppen'
    });
  }
}

/**
 * Endpoint: group-details
 * Lädt Matchdays und Details einer spezifischen Gruppe
 */
async function handleGroupDetails(req, res, params) {
  try {
    const {
      leagueUrl,
      season,
      groupId, // z.B. "43" oder "Gr. 043"
      apply = false
    } = params;

    if (!groupId) {
      return withCors(res, 400, { 
        error: 'groupId ist erforderlich (z.B. "43" oder "Gr. 043")' 
      });
    }

    // Importiere scrapeNuLiga
    const {
      scrapeNuLiga,
      DEFAULT_LEAGUE_URL,
      DEFAULT_SEASON_LABEL
    } = await import('../../lib/nuligaScraper.mjs');

    const effectiveLeagueUrl = leagueUrl || DEFAULT_LEAGUE_URL;
    const effectiveSeason = season || DEFAULT_SEASON_LABEL;
    const groupFilter = resolveGroupFilter(groupId);

    // Erstelle Supabase-Client wenn apply=true
    const supabaseClient = apply ? createSupabaseClient(true) : null;

    const { results } = await scrapeNuLiga({
      leagueUrl: effectiveLeagueUrl,
      seasonLabel: effectiveSeason,
      groupFilter: groupFilter,
      requestDelayMs: DEFAULT_DELAY_MS,
      teamIdMap: {},
      supabaseClient: supabaseClient,
      applyChanges: Boolean(apply),
      outputDir: null,
      onLog: (...messages) => console.log('[nuliga-matches-import]', ...messages)
    });

    if (results.length === 0) {
      return withCors(res, 404, {
        success: false,
        error: `Gruppe "${groupId}" nicht gefunden`
      });
    }

    const groupData = results[0];
    
    return withCors(res, 200, {
      success: true,
      mode: apply ? 'apply' : 'dry-run',
      group: {
        groupId: groupData.group?.groupId || null,
        groupName: groupData.group?.groupName || null,
        league: groupData.group?.league || null,
        category: groupData.group?.category || null
      },
      matches: groupData.matches?.length || 0,
      standings: groupData.standings?.length || 0,
      unmappedTeams: groupData.unmappedTeams || []
    });
    
  } catch (error) {
    console.error('[nuliga-matches-import] ❌ Fehler in group-details:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Fehler beim Laden der Gruppen-Details'
    });
  }
}

/**
 * Endpoint: match-results
 * Aktualisiert Match-Ergebnisse für eine oder mehrere Gruppen
 */
async function handleMatchResults(req, res, params) {
  try {
    const {
      leagueUrl,
      season,
      groups, // Optional: Filter für spezifische Gruppen
      apply = false
    } = params;

    // Importiere scrapeNuLiga
    const {
      scrapeNuLiga,
      DEFAULT_LEAGUE_URL,
      DEFAULT_SEASON_LABEL
    } = await import('../../lib/nuligaScraper.mjs');

    const effectiveLeagueUrl = leagueUrl || DEFAULT_LEAGUE_URL;
    const effectiveSeason = season || DEFAULT_SEASON_LABEL;
    const groupFilter = resolveGroupFilter(groups);

    // Erstelle Supabase-Client wenn apply=true
    const supabaseClient = apply ? createSupabaseClient(true) : null;

    const { results, unmappedTeams } = await scrapeNuLiga({
      leagueUrl: effectiveLeagueUrl,
      seasonLabel: effectiveSeason,
      groupFilter: groupFilter,
      requestDelayMs: DEFAULT_DELAY_MS,
      teamIdMap: {},
      supabaseClient: supabaseClient,
      applyChanges: Boolean(apply),
      outputDir: null,
      onLog: (...messages) => console.log('[nuliga-matches-import]', ...messages)
    });

    // Berechne Statistiken
    const totals = results.reduce(
      (acc, entry) => {
        acc.matches += entry.matches?.length || 0;
        acc.standings += entry.standings?.length || 0;
        return acc;
      },
      { matches: 0, standings: 0 }
    );

    // Formatiere Gruppen-Übersicht
    const groupsSummary = results.map(entry => ({
      groupId: entry.group?.groupId || null,
      groupName: entry.group?.groupName || null,
      matches: entry.matches?.length || 0,
      standings: entry.standings?.length || 0,
      unmappedTeams: entry.unmappedTeams || []
    }));

    return withCors(res, 200, {
      success: true,
      mode: apply ? 'apply' : 'dry-run',
      leagueUrl: effectiveLeagueUrl,
      season: effectiveSeason,
      groupsProcessed: results.length,
      totals,
      unmappedTeams: unmappedTeams || [],
      groups: groupsSummary
    });
    
  } catch (error) {
    console.error('[nuliga-matches-import] ❌ Fehler in match-results:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Fehler beim Aktualisieren der Match-Ergebnisse'
    });
  }
}

module.exports = handler;

