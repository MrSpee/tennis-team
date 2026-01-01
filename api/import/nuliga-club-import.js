/**
 * Konsolidierte nuLiga Club-Import API
 * 
 * Ersetzt: parse-club-rosters.js und parse-team-roster.js
 * 
 * Endpoints:
 * - POST /club-info  → Extrahiert Club-Info aus clubPools-Seite
 * - POST /teams      → Extrahiert Teams aus clubPools-Seite
 * - POST /roster     → Lädt Meldelisten mit Player-Matching
 */

const { createSupabaseClient } = require('../_lib/supabaseAdmin');
const { matchPlayerToUnified, matchPlayersBatch } = require('./_lib/playerMatcher');

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

/**
 * Extrahiert die Club-Nummer aus einer clubPools-URL
 */
function extractClubNumber(url) {
  try {
    const match = url.match(/[?&]club=(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('[nuliga-club-import] ⚠️ Fehler beim Extrahieren der Club-Nummer:', error);
    return null;
  }
}

/**
 * Parst die clubPools-Übersichtsseite und extrahiert Club-Info und Teams
 * @param {string} clubPoolsUrl - URL zur clubPools-Seite
 * @param {string} targetSeason - Ziel-Saison (z.B. "Winter 2025/2026")
 * @returns {Promise<object>} { clubNumber, clubName, teams: [...] }
 */
async function parseClubPoolsPage(clubPoolsUrl, targetSeason) {
  try {
    console.log(`[nuliga-club-import] 🔍 Lade clubPools-Seite: ${clubPoolsUrl}`);
    
    const response = await fetch(clubPoolsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const teams = [];
    
    // Extrahiere Club-Nummer aus URL
    const clubNumber = extractClubNumber(clubPoolsUrl);
    if (!clubNumber) {
      throw new Error('Club-Nummer konnte nicht aus URL extrahiert werden');
    }
    
    // Extrahiere Vereinsnamen aus HTML (vor "Namentliche Mannschaftsmeldung")
    let clubName = null;
    const mannschaftsmeldungIndex = html.indexOf('Namentliche Mannschaftsmeldung');
    if (mannschaftsmeldungIndex !== -1) {
      const searchSection = html.substring(Math.max(0, mannschaftsmeldungIndex - 500), mannschaftsmeldungIndex);
      
      // Pattern 1: <h1> oder <h2>
      const hMatch = searchSection.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
      if (hMatch) {
        clubName = hMatch[1].trim();
      }
      
      // Pattern 2: <strong> oder <b>
      if (!clubName) {
        const strongMatch = searchSection.match(/<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>/i);
        if (strongMatch) {
          clubName = strongMatch[1].trim();
        }
      }
    }
    
    if (!clubName) {
      console.warn(`[nuliga-club-import] ⚠️ Vereinsname konnte nicht automatisch erkannt werden`);
    }
    
    // Finde Bereich für Ziel-Saison
    const normalizedSeason = targetSeason.replace(/\s+/g, ' ').trim();
    let seasonPattern = new RegExp(`<h2[^>]*>\\s*${normalizedSeason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
    let seasonMatch = html.match(seasonPattern);
    
    // Fallback: Versuche alternative Saison-Formate
    if (!seasonMatch) {
      const altSeason = normalizedSeason.replace(/(\d{4})\/(\d{4})/, (match, y1, y2) => {
        return `${y1}/${y2.substring(2)}`;
      });
      if (altSeason !== normalizedSeason) {
        seasonPattern = new RegExp(`<h2[^>]*>\\s*${altSeason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
        seasonMatch = html.match(seasonPattern);
      }
    }
    
    if (!seasonMatch) {
      console.warn(`[nuliga-club-import] ⚠️ Saison "${targetSeason}" nicht gefunden auf der Seite`);
      return { clubNumber, clubName, teams: [] };
    }
    
    // Extrahiere Bereich nach Saison-Überschrift
    const seasonStartIndex = seasonMatch.index + seasonMatch[0].length;
    const nextSectionMatch = html.substring(seasonStartIndex).match(/<h2[^>]*>/);
    const seasonEndIndex = nextSectionMatch 
      ? seasonStartIndex + nextSectionMatch.index 
      : html.length;
    
    const seasonSection = html.substring(seasonStartIndex, seasonEndIndex);
    
    // Finde alle Team-Links
    const teamLinkPattern = /<a\s+href="([^"]*clubPools[^"]*seasonName=[^"]*[&amp;]contestType=([^"]+))"[^>]*>([^<]+)<\/a>/gi;
    let match;
    const seenTeams = new Set();
    const teamPromises = [];
    
    while ((match = teamLinkPattern.exec(seasonSection)) !== null) {
      let teamUrl = match[1].replace(/&amp;/g, '&');
      teamUrl = teamUrl.startsWith('http') 
        ? teamUrl 
        : `https://tvm.liga.nu${teamUrl}`;
      const contestType = decodeURIComponent(match[2].replace(/\+/g, ' '));
      const teamName = match[3].trim();
      
      // Vermeide Duplikate
      const teamKey = `${contestType}-${targetSeason}`;
      if (seenTeams.has(teamKey)) continue;
      seenTeams.add(teamKey);
      
      // Sammle Promise für paralleles Parsen
      teamPromises.push(
        (async () => {
          const roster = await parseRosterFromClubPoolsPage(teamUrl);
          
          return {
            contestType,
            teamName,
            teamUrl,
            roster: roster || [],
            playerCount: roster?.length || 0
          };
        })()
      );
    }
    
    // Paralleles Parsen mit Batch-Größe 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < teamPromises.length; i += BATCH_SIZE) {
      const batch = teamPromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch);
      teams.push(...batchResults);
      
      if (i + BATCH_SIZE < teamPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[nuliga-club-import] ✅ ${teams.length} Teams für Saison "${targetSeason}" gefunden`);
    return { clubNumber, clubName, teams };
    
  } catch (error) {
    console.error('[nuliga-club-import] ❌ Fehler beim Parsen der clubPools-Seite:', error);
    throw error;
  }
}

/**
 * Parst die Meldeliste direkt von einer clubPools Team-Detail-Seite
 * @param {string} teamUrl - URL zur Team-Detail-Seite
 * @returns {Promise<Array>} Array von Spielern
 */
async function parseRosterFromClubPoolsPage(teamUrl) {
  try {
    console.log(`[nuliga-club-import] 🔍 Parse Meldeliste von: ${teamUrl}`);
    
    const response = await fetch(teamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`[nuliga-club-import] ⚠️ HTTP ${response.status} beim Laden der Team-Detail-Seite`);
      return [];
    }
    
    const html = await response.text();
    const roster = [];
    
    // Finde Spieler-Tabelle
    let htmlToParse = html;
    const tableMatch = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      htmlToParse = tableMatch[0];
    } else {
      const spielerHeadingIndex = html.indexOf('<h2>Spieler');
      if (spielerHeadingIndex !== -1) {
        const sectionAfterHeading = html.substring(spielerHeadingIndex, spielerHeadingIndex + 50000);
        const tableMatch2 = sectionAfterHeading.match(/<table[^>]*>([\s\S]*?)<\/table>/);
        if (tableMatch2) {
          htmlToParse = tableMatch2[0];
        }
      }
    }
    
    // Pattern für clubPools-Seite: Rang | Mannschaft | LK | ID-Nummer | Name (Jahrgang)
    const fullRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>([\s\S]*?)<\/td>/gi;
    
    let match;
    while ((match = fullRowPattern.exec(htmlToParse)) !== null) {
      const rank = parseInt(match[1], 10);
      const teamNumber = parseInt(match[2], 10);
      const lk = match[3].trim();
      const tvmId = match[4].trim();
      const name = match[5].trim();
      
      // Geburtsjahr extrahieren
      let birthYear = null;
      const nameCellContent = match[6] || '';
      const birthMatch = nameCellContent.match(/\((\d{4})\)/);
      if (birthMatch) {
        birthYear = parseInt(birthMatch[1], 10);
      }
      
      if (name && name.length > 2 && tvmId && tvmId.match(/^\d+$/) && teamNumber && teamNumber > 0) {
        roster.push({
          rank,
          teamNumber,
          name,
          lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
          tvmId,
          birthYear,
          singles: null,
          doubles: null,
          total: null
        });
      }
    }
    
    console.log(`[nuliga-club-import] ✅ ${roster.length} Spieler aus Meldeliste extrahiert`);
    return roster;
    
  } catch (error) {
    console.error('[nuliga-club-import] ❌ Fehler beim Parsen der Meldeliste:', error);
    return [];
  }
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
      case 'club-info':
        return handleClubInfo(req, res, params);
      case 'teams':
        return handleTeams(req, res, params);
      case 'roster':
        return handleRoster(req, res, params);
      default:
        return withCors(res, 400, { 
          error: 'Invalid action. Use: "club-info", "teams", or "roster"' 
        });
    }
    
  } catch (error) {
    console.error('[nuliga-club-import] ❌ Fehler:', error);
    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler'
    });
  }
}

/**
 * Endpoint: club-info
 * Extrahiert Club-Info aus clubPools-Seite
 */
async function handleClubInfo(req, res, params) {
  const { clubPoolsUrl } = params;
  
  if (!clubPoolsUrl) {
    return withCors(res, 400, { error: 'clubPoolsUrl ist erforderlich' });
  }
  
  const { clubNumber, clubName } = await parseClubPoolsPage(clubPoolsUrl, params.targetSeason || 'Winter 2025/2026');
  
  return withCors(res, 200, {
    success: true,
    clubNumber,
    clubName
  });
}

/**
 * Endpoint: teams
 * Extrahiert Teams aus clubPools-Seite
 */
async function handleTeams(req, res, params) {
  const { clubPoolsUrl, targetSeason = 'Winter 2025/2026' } = params;
  
  if (!clubPoolsUrl) {
    return withCors(res, 400, { error: 'clubPoolsUrl ist erforderlich' });
  }
  
  const { clubNumber, clubName, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);
  
  // Formatiere Teams für Response (ohne vollständige Roster-Daten)
  const teamsList = teams.map(team => ({
    contestType: team.contestType,
    teamName: team.teamName,
    teamUrl: team.teamUrl,
    playerCount: team.playerCount
  }));
  
  return withCors(res, 200, {
    success: true,
    clubNumber,
    clubName,
    season: targetSeason,
    teams: teamsList,
    totalTeams: teamsList.length
  });
}

/**
 * Endpoint: roster
 * Lädt Meldelisten mit Player-Matching
 */
async function handleRoster(req, res, params) {
  const { 
    clubPoolsUrl, 
    targetSeason = 'Winter 2025/2026',
    apply = false 
  } = params;
  
  if (!clubPoolsUrl) {
    return withCors(res, 400, { error: 'clubPoolsUrl ist erforderlich' });
  }
  
  // Parse clubPools-Seite (mit vollständigen Roster-Daten)
  const { clubNumber, clubName, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);
  
  if (teams.length === 0) {
    return withCors(res, 200, {
      success: true,
      clubNumber,
      clubName,
      teams: [],
      matchingResults: []
    });
  }
  
  // Wenn apply=false, führe Matching durch und gebe Ergebnisse zurück (für Review)
  if (!apply) {
    const supabase = createSupabaseClient(true);
    const allMatchingResults = [];
    
    // Lade Spieler-Cache einmal für alle Teams
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id, tvm_id_number, user_id, email')
      .limit(1000);
    const playerCache = allPlayers || [];
    
    for (const team of teams) {
      if (!team.roster || team.roster.length === 0) continue;
      
      const teamMatchingResults = [];
      for (const player of team.roster) {
        const matchResult = await matchPlayerToUnified(supabase, player, playerCache);
        teamMatchingResults.push({
          rosterPlayer: player,
          matchResult: matchResult
        });
      }
      
      allMatchingResults.push({
        contestType: team.contestType,
        teamName: team.teamName,
        matchingResults: teamMatchingResults
      });
    }
    
    return withCors(res, 200, {
      success: true,
      clubNumber,
      clubName,
      season: targetSeason,
      teams: teams.map(t => ({
        contestType: t.contestType,
        teamName: t.teamName,
        playerCount: t.playerCount
      })),
      matchingResults: allMatchingResults
    });
  }
  
  // apply=true: Import in DB (später implementieren)
  return withCors(res, 501, {
    success: false,
    error: 'DB-Import (apply=true) noch nicht implementiert. Verwende zunächst apply=false für Review.'
  });
}

module.exports = handler;

