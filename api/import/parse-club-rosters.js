const { createSupabaseClient } = require('../_lib/supabaseAdmin');

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
 * @param {string} url - z.B. "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
 * @returns {string|null} Club-Nummer oder null
 */
function extractClubNumber(url) {
  try {
    const match = url.match(/[?&]club=(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('[parse-club-rosters] ⚠️ Fehler beim Extrahieren der Club-Nummer:', error);
    return null;
  }
}

/**
 * Parst die clubPools-Übersichtsseite und extrahiert alle Teams für eine Saison
 * @param {string} clubPoolsUrl - URL zur clubPools-Seite (z.B. https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154)
 * @param {string} targetSeason - Ziel-Saison (z.B. "Winter 2025/2026")
 * @returns {Promise<Array>} Array von Teams mit ihren Team-Portrait-URLs
 */
async function parseClubPoolsPage(clubPoolsUrl, targetSeason) {
  try {
    console.log(`[parse-club-rosters] 🔍 Lade clubPools-Seite: ${clubPoolsUrl}`);
    
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
    
    // Finde den Bereich für die Ziel-Saison
    // Die Saison wird als Überschrift angezeigt, z.B. "Winter 2025/2026"
    const seasonPattern = new RegExp(`<h2[^>]*>\\s*${targetSeason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'i');
    const seasonMatch = html.match(seasonPattern);
    
    if (!seasonMatch) {
      console.warn(`[parse-club-rosters] ⚠️ Saison "${targetSeason}" nicht gefunden auf der Seite`);
      return { clubNumber, teams: [] };
    }
    
    // Extrahiere den Bereich nach der Saison-Überschrift (bis zur nächsten h2 oder Ende)
    const seasonStartIndex = seasonMatch.index + seasonMatch[0].length;
    const nextSectionMatch = html.substring(seasonStartIndex).match(/<h2[^>]*>/);
    const seasonEndIndex = nextSectionMatch 
      ? seasonStartIndex + nextSectionMatch.index 
      : html.length;
    
    const seasonSection = html.substring(seasonStartIndex, seasonEndIndex);
    
    // Finde alle Team-Links in diesem Bereich
    // Format: <a href="/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Herren+40">Herren 40</a>
    // Oder: <a href="/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&amp;seasonName=Winter+2025%2F2026&amp;contestType=Herren+40">Herren 40</a>
    const teamLinkPattern = /<a\s+href="([^"]*clubPools[^"]*seasonName=[^"]*[&amp;]contestType=([^"]+))"[^>]*>([^<]+)<\/a>/gi;
    
    let match;
    const seenTeams = new Set(); // Vermeide Duplikate
    
    while ((match = teamLinkPattern.exec(seasonSection)) !== null) {
      let teamUrl = match[1].replace(/&amp;/g, '&'); // Konvertiere &amp; zu &
      teamUrl = teamUrl.startsWith('http') 
        ? teamUrl 
        : `https://tvm.liga.nu${teamUrl}`;
      const contestType = decodeURIComponent(match[2].replace(/\+/g, ' '));
      const teamName = match[3].trim();
      
      // Vermeide Duplikate
      const teamKey = `${contestType}-${targetSeason}`;
      if (seenTeams.has(teamKey)) {
        continue;
      }
      seenTeams.add(teamKey);
      
      // Parse die Meldeliste direkt von der Team-Detail-Seite
      const roster = await parseRosterFromClubPoolsPage(teamUrl);
      
      // Kurze Pause zwischen Requests (um nicht als Bot erkannt zu werden)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      teams.push({
        contestType, // z.B. "Herren 40"
        teamName,    // z.B. "Herren 40"
        teamUrl,     // clubPools-URL für dieses Team
        roster       // Meldeliste (Array von Spielern)
      });
    }
    
    console.log(`[parse-club-rosters] ✅ ${teams.length} Teams für Saison "${targetSeason}" gefunden`);
    return { clubNumber, teams };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Parsen der clubPools-Seite:', error);
    throw error;
  }
}

/**
 * Parst die Meldeliste direkt von einer clubPools Team-Detail-Seite
 * @param {string} teamUrl - URL zur Team-Detail-Seite (clubPools mit contestType)
 * @returns {Promise<Array>} Array von Spielern mit Rang, Name, LK, etc.
 */
async function parseRosterFromClubPoolsPage(teamUrl) {
  try {
    console.log(`[parse-club-rosters] 🔍 Parse Meldeliste von: ${teamUrl}`);
    
    const response = await fetch(teamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.warn(`[parse-club-rosters] ⚠️ HTTP ${response.status} beim Laden der Team-Detail-Seite`);
      return [];
    }
    
    const html = await response.text();
    const roster = [];
    
    // Finde die Spieler-Tabelle: Suche nach Tabelle mit "Rang" und "Mannschaft" Header
    let htmlToParse = html;
    
    // Suche nach Tabelle mit result-set class (die Spieler-Tabelle)
    const tableMatch = html.match(/<table[^>]*class\s*=\s*["']result-set["'][^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      console.log(`[parse-club-rosters] ✅ Spieler-Tabelle gefunden (result-set)`);
      htmlToParse = tableMatch[0];
    } else {
      // Fallback: Suche nach <h2>Spieler</h2>
      const spielerHeadingIndex = html.indexOf('<h2>Spieler');
      if (spielerHeadingIndex !== -1) {
        console.log(`[parse-club-rosters] ✅ "Spieler" Überschrift gefunden`);
        const sectionAfterHeading = html.substring(spielerHeadingIndex, spielerHeadingIndex + 50000);
        const tableMatch2 = sectionAfterHeading.match(/<table[^>]*>([\s\S]*?)<\/table>/);
        if (tableMatch2) {
          htmlToParse = tableMatch2[0];
        }
      }
    }
    
    // Pattern für clubPools-Seite: Rang | Mannschaft | LK | ID-Nummer | Name (Jahrgang) | Nation | ...
    // Die Struktur ist: <tr><td>Rang</td><td>Mannschaft</td><td>LK</td><td>ID-Nummer</td><td>Name (Jahrgang)</td>...
    // WICHTIG: <td> Elemente können Whitespace und Zeilenumbrüche enthalten
    // Pattern 1: Vollständige Zeile mit allen Feldern
    // Angepasst für clubPools-Struktur: Rang | Mannschaft | LK | ID-Nummer | Name (Jahrgang)
    const fullRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?(?:\((\d{4})\))?[\s\S]*?<\/td>/gi;
    
    let match;
    while ((match = fullRowPattern.exec(htmlToParse)) !== null) {
      const rank = parseInt(match[1], 10);
      const lk = match[3].trim();
      const tvmId = match[4].trim();
      const name = match[5].trim();
      let birthYear = match[6] ? parseInt(match[6], 10) : null;
      
      if (!birthYear) {
        const rowEnd = htmlToParse.indexOf('</tr>', match.index);
        const rowContent = htmlToParse.substring(match.index, rowEnd);
        const birthMatch = rowContent.match(/\((\d{4})\)/);
        if (birthMatch) {
          birthYear = parseInt(birthMatch[1], 10);
        }
      }
      
      // Auf clubPools-Seite gibt es keine Einzel/Doppel-Bilanzen
      roster.push({
        rank,
        name,
        lk: lk.startsWith('LK') ? lk : `LK ${lk}`,
        tvmId,
        birthYear,
        singles: null,
        doubles: null,
        total: null
      });
    }
    
      // Pattern 2: Fallback - Vereinfachtes Pattern (ohne Geburtsjahr)
      if (roster.length === 0) {
        console.log('[parse-club-rosters] ⚠️ Vollständiges Pattern hat keine Ergebnisse, versuche vereinfachtes Pattern...');
        const simpleRowPattern = /<tr[^>]*>(?![\s\S]*?<th)[\s\S]*?<td[^>]*>[\s\S]*?(\d{1,2})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(LK[\d,\.]+)[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?(\d{7,})[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
      let simpleMatch;
      
      while ((simpleMatch = simpleRowPattern.exec(htmlToParse)) !== null) {
        const rank = parseInt(simpleMatch[1], 10);
        const lk = simpleMatch[3].trim();
        const tvmId = simpleMatch[4].trim();
        const name = simpleMatch[5].trim();
        let birthYear = simpleMatch[6] ? parseInt(simpleMatch[6], 10) : null;
        
        if (!birthYear) {
          const rowEnd = htmlToParse.indexOf('</tr>', simpleMatch.index);
          const rowContent = htmlToParse.substring(simpleMatch.index, rowEnd);
          const birthMatch = rowContent.match(/\((\d{4})\)/);
          if (birthMatch) {
            birthYear = parseInt(birthMatch[1], 10);
          }
        }
        
        if (name && name.length > 2 && tvmId && tvmId.match(/^\d+$/)) {
          roster.push({
            rank,
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
    }
    
    console.log(`[parse-club-rosters] ✅ ${roster.length} Spieler aus Meldeliste extrahiert`);
    return roster;
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Parsen der Meldeliste:', error);
    return [];
  }
}

/**
 * Berechnet Ähnlichkeit zwischen zwei Strings (Dice Coefficient)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 100;
  
  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  
  let intersection = 0;
  bigrams1.forEach(bigram => {
    if (bigrams2.has(bigram)) intersection++;
  });
  
  const union = bigrams1.size + bigrams2.size;
  if (union === 0) return 0;
  
  return Math.round((2 * intersection / union) * 100);
}

/**
 * Führt Fuzzy-Matching mit players_unified durch
 */
async function matchPlayerToUnified(supabase, rosterPlayer) {
  try {
    // 1. Exakte Übereinstimmung (Name)
    const { data: exactMatches } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .ilike('name', rosterPlayer.name)
      .limit(5);
    
    if (exactMatches && exactMatches.length > 0) {
      const exactMatch = exactMatches.find(p => 
        p.name.toLowerCase() === rosterPlayer.name.toLowerCase()
      );
      if (exactMatch) {
        console.log(`[parse-club-rosters] ✅ Exaktes Match gefunden: ${exactMatch.name} (${exactMatch.id})`);
        return { playerId: exactMatch.id, confidence: 100, matchType: 'exact' };
      }
    }
    
    // 2. TVM-ID Match (falls vorhanden)
    if (rosterPlayer.tvmId) {
      const { data: tvmMatches } = await supabase
        .from('players_unified')
        .select('id, name, tvm_id')
        .eq('tvm_id', rosterPlayer.tvmId)
        .maybeSingle();
      
      if (tvmMatches) {
        console.log(`[parse-club-rosters] ✅ TVM-ID Match gefunden: ${tvmMatches.name} (${tvmMatches.id})`);
        return { playerId: tvmMatches.id, confidence: 95, matchType: 'tvm_id' };
      }
    }
    
    // 3. Fuzzy-Matching (Name-Ähnlichkeit)
    const { data: allPlayers } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, tvm_id')
      .limit(1000);
    
    if (!allPlayers || allPlayers.length === 0) {
      return { playerId: null, confidence: 0, matchType: 'none' };
    }
    
    const matches = allPlayers
      .map(player => ({
        ...player,
        similarity: calculateSimilarity(player.name, rosterPlayer.name)
      }))
      .filter(m => m.similarity >= 70)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      console.log(`[parse-club-rosters] 🎯 Fuzzy-Match gefunden: ${bestMatch.name} (${bestMatch.similarity}% Ähnlichkeit)`);
      return { 
        playerId: bestMatch.id, 
        confidence: bestMatch.similarity, 
        matchType: 'fuzzy'
      };
    }
    
    return { playerId: null, confidence: 0, matchType: 'none' };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Fuzzy-Matching:', error);
    return { playerId: null, confidence: 0, matchType: 'error', error: error.message };
  }
}

/**
 * Speichert die Meldeliste in der Datenbank mit Fuzzy-Matching zu players_unified
 */
async function saveTeamRoster(supabase, teamId, season, roster) {
  try {
    console.log(`[parse-club-rosters] 💾 Speichere Meldeliste für Team ${teamId}, Saison ${season}...`);
    
    // Lösche alte Einträge für dieses Team/Saison
    const { error: deleteError } = await supabase
      .from('team_roster')
      .delete()
      .eq('team_id', teamId)
      .eq('season', season);
    
    if (deleteError) {
      console.warn('[parse-club-rosters] ⚠️ Fehler beim Löschen alter Einträge:', deleteError);
    }
    
    // Führe Fuzzy-Matching für jeden Spieler durch
    console.log(`[parse-club-rosters] 🔍 Führe Fuzzy-Matching für ${roster.length} Spieler durch...`);
    const rosterEntries = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    for (const player of roster) {
      const matchResult = await matchPlayerToUnified(supabase, player);
      
      rosterEntries.push({
        team_id: teamId,
        season: season,
        rank: player.rank,
        player_name: player.name,
        lk: player.lk,
        tvm_id: player.tvmId || null,
        birth_year: player.birthYear || null,
        singles_record: player.singles || null,
        doubles_record: player.doubles || null,
        total_record: player.total || null,
        player_id: matchResult.playerId || null
      });
      
      if (matchResult.playerId) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
      
      // Kurze Pause zwischen Matches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`[parse-club-rosters] 📊 Matching-Ergebnisse: ${matchedCount} gematcht, ${unmatchedCount} nicht gematcht`);
    
    // Erstelle neue Einträge
    const { data, error } = await supabase
      .from('team_roster')
      .insert(rosterEntries)
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`[parse-club-rosters] ✅ ${data.length} Spieler in team_roster gespeichert (${matchedCount} mit player_id verknüpft)`);
    return {
      roster: data,
      stats: {
        total: roster.length,
        matched: matchedCount,
        unmatched: unmatchedCount
      }
    };
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Speichern der Meldeliste:', error);
    throw error;
  }
}

/**
 * Speichert die Club-Nummer in team_info
 */
async function saveClubNumber(supabase, clubId, clubNumber) {
  try {
    // Update alle Teams dieses Vereins
    const { error } = await supabase
      .from('team_info')
      .update({ club_number: clubNumber })
      .eq('club_id', clubId);
    
    if (error) {
      throw error;
    }
    
    console.log(`[parse-club-rosters] ✅ Club-Nummer ${clubNumber} für Club ${clubId} gespeichert`);
    return true;
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler beim Speichern der Club-Nummer:', error);
    throw error;
  }
}

// Exportiere Handler als default (für Vercel)
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { 
      clubPoolsUrl, 
      targetSeason = 'Winter 2025/2026', 
      clubId = null, 
      teamMapping = {}, // { "Herren 40": "team-uuid", ... }
      apply = false 
    } = req.body;
    
    if (!clubPoolsUrl) {
      return withCors(res, 400, { error: 'clubPoolsUrl ist erforderlich' });
    }
    
    // Parse clubPools-Seite
    const { clubNumber, teams } = await parseClubPoolsPage(clubPoolsUrl, targetSeason);
    
    const results = {
      clubNumber,
      teams: [],
      savedRosters: []
    };
    
    // Speichere Club-Nummer wenn apply=true und clubId vorhanden
    if (apply && clubId && clubNumber) {
      const supabase = createSupabaseClient();
      await saveClubNumber(supabase, clubId, clubNumber);
    }
    
    // Speichere Meldelisten wenn apply=true und teamMapping vorhanden
    if (apply && Object.keys(teamMapping).length > 0) {
      const supabase = createSupabaseClient();
      
      for (const team of teams) {
        const teamId = teamMapping[team.contestType] || teamMapping[team.teamName];
        
        if (teamId && team.roster && team.roster.length > 0) {
          try {
            const savedRoster = await saveTeamRoster(supabase, teamId, targetSeason, team.roster);
            results.savedRosters.push({
              teamName: team.teamName,
              contestType: team.contestType,
              ...savedRoster.stats
            });
          } catch (error) {
            console.error(`[parse-club-rosters] ❌ Fehler beim Speichern der Meldeliste für ${team.teamName}:`, error);
            results.savedRosters.push({
              teamName: team.teamName,
              contestType: team.contestType,
              error: error.message
            });
          }
        }
      }
    }
    
    // Bereite Response vor
    results.teams = teams.map(team => ({
      contestType: team.contestType,
      teamName: team.teamName,
      teamUrl: team.teamUrl,
      playerCount: team.roster ? team.roster.length : 0,
      roster: apply ? undefined : (team.roster || []) // Nur im Dry-Run die vollständigen Daten senden
    }));
    
    return withCors(res, 200, {
      success: true,
      ...results,
      message: `${teams.length} Teams für Saison "${targetSeason}" gefunden${clubNumber ? ` (Club-Nummer: ${clubNumber})` : ''}${apply && results.savedRosters.length > 0 ? ` - ${results.savedRosters.length} Meldelisten gespeichert` : ''}`
    });
    
  } catch (error) {
    console.error('[parse-club-rosters] ❌ Fehler:', error);
    return withCors(res, 500, {
      error: error.message || 'Fehler beim Parsen der clubPools-Seite'
    });
  }
}

// Exportiere Handler als default (für Vercel)
// UND exportiere Funktionen für Wiederverwendung
const handlerWithExports = handler;
handlerWithExports.parseClubPoolsPage = parseClubPoolsPage;
handlerWithExports.parseRosterFromClubPoolsPage = parseRosterFromClubPoolsPage;
handlerWithExports.saveTeamRoster = saveTeamRoster;
handlerWithExports.saveClubNumber = saveClubNumber;
handlerWithExports.extractClubNumber = extractClubNumber;
module.exports = handlerWithExports;

