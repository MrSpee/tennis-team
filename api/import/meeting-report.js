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

async function determineMeetingId({
  leagueUrl,
  groupId,
  matchNumber,
  homeTeam,
  awayTeam,
  matchDate = null,
  meetingId: preferredMeetingId = null
}) {
  const imports = await DEFAULT_IMPORTS.get();
  const {
    scrapeNuLiga: scrape,
    findMatchInGroup,
    normalizeMatchNumber,
    normalizeTeamLabel
  } = imports;
  const normalizedGroupId = groupId ? String(parseInt(groupId, 10)) : null;
  
  // VERBESSERT: Versuche beide Tab-Seiten, wenn leagueUrl keine source_url ist
  let results = null;
  let lastError = null;
  let triedUrls = [];
  
  const urlsToTry = [];
  if (leagueUrl) {
    urlsToTry.push(leagueUrl);
  }
  
  // Wenn leagueUrl eine Fallback-URL ist (enthält tab=), versuche auch die andere Tab-Seite
  if (leagueUrl && leagueUrl.includes('tab=')) {
    const otherTab = leagueUrl.includes('tab=2') ? 'tab=3' : 'tab=2';
    const alternativeUrl = leagueUrl.replace(/tab=\d+/, otherTab);
    urlsToTry.push(alternativeUrl);
  }
  
  // Versuche jede URL
  for (const urlToTry of urlsToTry) {
    triedUrls.push(urlToTry);
    try {
      console.log(`[meeting-report] 🔍 Versuche Meeting-ID zu bestimmen mit URL: ${urlToTry}`);
      const scrapeResult = await scrape({
        leagueUrl: urlToTry,
        groupFilter: normalizedGroupId,
        requestDelayMs: 120,
        applyChanges: false,
        supabaseClient: null,
        outputDir: null,
        onLog: () => {}
      });
      
      if (scrapeResult.results && scrapeResult.results.length > 0) {
        results = scrapeResult.results;
        console.log(`[meeting-report] ✅ Gruppeninformationen gefunden mit URL: ${urlToTry}`);
        // Speichere erfolgreiche URL für später
        results._successfulUrl = urlToTry;
        break; // Erfolgreich, breche ab
      }
    } catch (error) {
      console.warn(`[meeting-report] ⚠️ Fehler beim Scrapen mit URL ${urlToTry}:`, error.message);
      lastError = error;
      // Wenn es ein "Keine Gruppenlinks gefunden" Fehler ist, versuche nächste URL
      if (error.message && error.message.includes('Keine Gruppenlinks')) {
        continue;
      }
      // Bei anderen Fehlern, breche ab
      throw error;
    }
  }

  if (!results || !results.length) {
    const error = new Error(
      `Keine Gruppeninformationen gefunden, um Meeting-ID zu bestimmen. ` +
      `Versuchte URLs: ${triedUrls.join(', ')}`
    );
    if (lastError) {
      error.originalError = lastError.message;
    }
    throw error;
  }

  const targetGroup = results.find((entry) => {
    const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
    return !normalizedGroupId || entryGroupId === normalizedGroupId;
  });

  if (!targetGroup) {
    throw new Error(`Keine passende Gruppe für ID ${groupId} gefunden.`);
  }

  const normalizedMatchNumber = matchNumber ? String(matchNumber).trim() : null;
  const searchHome = homeTeam || null;
  const searchAway = awayTeam || null;

  let matchedResult = { match: null, score: 0 };

  if (preferredMeetingId) {
    matchedResult = findMatchInGroup(targetGroup.matches || [], {
      meetingId: preferredMeetingId,
      matchNumber: normalizedMatchNumber,
      homeTeam: searchHome,
      awayTeam: searchAway,
      matchDate
    });
  }

  if (!matchedResult.match) {
    matchedResult = findMatchInGroup(targetGroup.matches || [], {
      matchNumber: normalizedMatchNumber,
      homeTeam: searchHome,
      awayTeam: searchAway,
      matchDate
    });
  }

  if (!matchedResult.match && normalizedMatchNumber) {
    matchedResult.match =
      targetGroup.matches?.find(
        (entry) => normalizeMatchNumber(entry.matchNumber || entry.match_number) === normalizeMatchNumber(normalizedMatchNumber)
      ) || null;
    matchedResult.score = matchedResult.match ? 1 : 0;
  }

  const matched = matchedResult.match;

  if (!matched) {
    const availableMatches =
      targetGroup.matches?.map((entry) => ({
        matchNumber: entry.matchNumber || entry.match_number || null,
        meetingId: entry.meetingId || entry.meeting_id || null,
        homeTeam: entry.homeTeam || entry.home_team || null,
        awayTeam: entry.awayTeam || entry.away_team || null
      })) || [];

    const error = new Error(
      `Match konnte in der Gruppenübersicht nicht gefunden werden (Gruppe ${groupId}). ` +
        `Gesucht: Match "${normalizedMatchNumber}", Heim "${normalizeTeamLabel(searchHome)}", ` +
        `Gast "${normalizeTeamLabel(searchAway)}". Matches: ${JSON.stringify(availableMatches)}`
    );
    error.code = 'MATCH_NOT_FOUND';
    error.meta = { groupId, normalizedMatchNumber, searchHome, searchAway };
    throw error;
  }

  // Match gefunden, aber keine Meeting-ID verfügbar
  if (!matched.meetingId && !matched.meeting_id) {
    const error = new Error(
      `Match "${matched.matchNumber || matched.match_number || normalizedMatchNumber}" (${matched.homeTeam || matched.home_team} vs ${matched.awayTeam || matched.away_team}) wurde gefunden, ` +
        `aber es ist noch keine Meeting-ID verfügbar. Das Spiel wurde möglicherweise noch nicht gespielt oder die Ergebnisse sind noch nicht in nuLiga eingetragen.`
    );
    error.code = 'MEETING_ID_NOT_AVAILABLE';
    error.meta = { 
      groupId, 
      matchNumber: matched.matchNumber || matched.match_number || normalizedMatchNumber,
      homeTeam: matched.homeTeam || matched.home_team,
      awayTeam: matched.awayTeam || matched.away_team,
      matchFound: true
    };
    throw error;
  }

  const similarityThreshold = normalizedMatchNumber ? 8 : 10;
  if (matchedResult.score < similarityThreshold) {
    const error = new Error(
      `Meeting-ID Zuordnung unsicher (Score ${matchedResult.score.toFixed?.(2) || matchedResult.score}). ` +
        `Gefundenes Spiel: "${matched.homeTeam}" vs. "${matched.awayTeam}" (#${matched.matchNumber || 'n/a'}).`
    );
    error.code = 'MATCH_ID_UNCERTAIN';
    error.meta = { candidate: matched, score: matchedResult.score };
    throw error;
  }

  return {
    meetingId: matched.meetingId || matched.meeting_id,
    meetingReportUrl: matched.meetingReportUrl || matched.meeting_report_url || null,
    groupMeta: targetGroup.group,
    matchMeta: {
      ...matched,
      _matching: {
        score: matchedResult.score,
        matchNumber: normalizeMatchNumber(matched.matchNumber || matched.match_number),
        normalizedHome: normalizeTeamLabel(matched.homeTeam || matched.home_team),
        normalizedAway: normalizeTeamLabel(matched.awayTeam || matched.away_team)
      }
    },
    // VERBESSERT: Speichere erfolgreiche URL für später
    successfulUrl: results._successfulUrl || null
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
  if (match.walkover?.reason) {
    lines.push(`Walkover: ${match.walkover.reason}`);
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

/**
 * Normalisiert Kategorien: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
 * Altersklassen (30+) bleiben unverändert: "Damen 30" → "Damen 30", "Herren 40" → "Herren 40"
 */
function normalizeCategory(category) {
  if (!category || typeof category !== 'string') {
    return category;
  }
  
  const trimmed = category.trim();
  
  // Prüfe ob es eine Mannschaftsnummer ist (1, 2, 3) oder eine Altersklasse (30+)
  // Pattern: "Damen 1", "Damen 2", "Damen 3" → "Damen"
  // Pattern: "Herren 1", "Herren 2", "Herren 3" → "Herren"
  // Pattern: "Damen 30", "Herren 40" etc. → unverändert (Altersklassen)
  const match = trimmed.match(/^(Damen|Herren)\s+(\d+)$/i);
  
  if (match) {
    const gender = match[1]; // "Damen" oder "Herren"
    const number = parseInt(match[2], 10);
    
    // Wenn die Zahl 1, 2 oder 3 ist → Mannschaftsnummer, normalisiere zu "Damen" oder "Herren"
    if (number >= 1 && number <= 3) {
      return gender;
    }
    // Wenn die Zahl >= 30 ist → Altersklasse, behalte unverändert
    // (z.B. "Damen 30", "Herren 40", "Herren 50")
  }
  
  // Keine Normalisierung nötig oder Pattern nicht erkannt
  return trimmed;
}

function normalizeLk(value) {
  if (!value) return null;
  const text = String(value).trim().replace(',', '.');
  const match = text.match(/^\d{1,2}(?:\.\d)?$/);
  return match ? match[0] : null;
}

async function applyMeetingResults({ supabase, matchdayId, singles, doubles, metadata }) {
  // DEBUG: Log Eingabe
  console.log(`[meeting-report] 📥 applyMeetingResults aufgerufen:`, {
    matchdayId,
    singlesCount: singles?.length || 0,
    doublesCount: doubles?.length || 0,
    metadata: metadata ? { homeTeam: metadata.homeTeam, awayTeam: metadata.awayTeam } : null
  });
  
  if (singles && singles.length > 0) {
    console.log(`[meeting-report] 📋 Erstes Einzel-Match:`, {
      matchNumber: singles[0].matchNumber,
      hasHomePlayers: !!singles[0].homePlayers,
      hasAwayPlayers: !!singles[0].awayPlayers,
      homePlayersCount: singles[0].homePlayers?.length || 0,
      awayPlayersCount: singles[0].awayPlayers?.length || 0,
      homePlayers: singles[0].homePlayers?.map(p => ({ name: p?.name, lk: p?.lk })) || [],
      awayPlayers: singles[0].awayPlayers?.map(p => ({ name: p?.name, lk: p?.lk })) || []
    });
  }
  
  // WICHTIG: Lade Team-IDs aus dem Matchday für primary_team_id Zuweisung
  let homeTeamId = null;
  let awayTeamId = null;
  try {
    const { data: matchdayData, error: matchdayError } = await supabase
      .from('matchdays')
      .select('home_team_id, away_team_id')
      .eq('id', matchdayId)
      .maybeSingle();
    
    if (!matchdayError && matchdayData) {
      homeTeamId = matchdayData.home_team_id;
      awayTeamId = matchdayData.away_team_id;
      console.log(`[meeting-report] ✅ Team-IDs geladen: home=${homeTeamId}, away=${awayTeamId}`);
    } else if (matchdayError) {
      console.warn(`[meeting-report] ⚠️ Fehler beim Laden der Team-IDs:`, matchdayError.message);
    }
  } catch (teamIdError) {
    console.warn(`[meeting-report] ⚠️ Fehler beim Laden der Team-IDs:`, teamIdError.message);
  }
  
  const rows = [];
  let counter = 0;
  const playerCache = new Map();
  const pendingPlayers = new Map();
  const positionUpdates = []; // Sammle Position-Updates für team_memberships

  /**
   * Prüft, ob ein Spieler-Name ein "nicht angetreten"-Marker ist
   * (z.B. "unbekannt / wird nachgenannt k.A.*", "w/o", "walkover", etc.)
   */
  const isPlayerNotPlayed = (playerName) => {
    if (!playerName) return false;
    const normalized = playerName.toLowerCase().trim();
    
    // Liste von Mustern, die "nicht angetreten" bedeuten
    const notPlayedPatterns = [
      /^unbekannt/i,
      /wird nachgenannt/i,
      /k\.a\./i,
      /^w\/o\b/i,
      /^walkover/i,
      /nicht angetreten/i,
      /nicht gespielt/i,
      /abgesagt/i,
      /verletzt/i,
      /krank/i,
      /^–$/,
      /^---$/,
      /^n\.a\./i,
      /^n\/a$/i
    ];
    
    return notPlayedPatterns.some(pattern => pattern.test(normalized));
  };

  const registerMissingPlayer = (player, context) => {
    if (!player || !player.name) {
      console.warn(`[meeting-report] ⚠️ registerMissingPlayer: Kein Spieler oder Name vorhanden`, { player, context });
      return;
    }
    const normalizedName = player.name.trim();
    if (!normalizedName) {
      console.warn(`[meeting-report] ⚠️ registerMissingPlayer: Name ist leer`, { player, context });
      return;
    }
    
    // Prüfe ob es ein "nicht angetreten"-Marker ist
    if (isPlayerNotPlayed(normalizedName) || isPlayerNotPlayed(player.raw)) {
      console.log(`[meeting-report] ⏭️  Spieler nicht angetreten, überspringe: "${normalizedName}"`);
      return; // Ignoriere - kein Spieler angetreten
    }
    
    // DEBUG: Log fehlenden Spieler
    console.warn(`[meeting-report] ⚠️ Fehlender Spieler registriert: "${normalizedName}"`, {
      context,
      lk: player.lk,
      raw: player.raw
    });
    
    const primaryKey = `${normalizedName.toLowerCase()}|${player.lk || ''}`;
    const entry =
      pendingPlayers.get(primaryKey) || {
        key: primaryKey,
        name: normalizedName,
        lk: normalizeLk(player.lk) || normalizeLk(player.meta) || normalizeLk(player.raw),
        meta: player.meta || null,
        occurrences: 0,
        contexts: []
      };
    entry.occurrences += 1;
    entry.contexts.push({
      matchNumber: context.matchNumber,
      matchType: context.matchType,
      side: context.side,
      teamName: context.teamName,
      slot: context.slot,
      raw: player.raw || null,
      meta: player.meta || null,
      lk: entry.lk
    });
    pendingPlayers.set(primaryKey, entry);
  };

  const normalizePlayerName = (name) => {
    if (!name) return '';
    return name
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  };

  const reverseNameOrder = (name) => {
    if (!name) return name;
    const trimmed = name.trim();
    // Prüfe ob Format "Nachname, Vorname" ist
    const commaMatch = trimmed.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      return `${commaMatch[2].trim()} ${commaMatch[1].trim()}`;
    }
    // Prüfe ob Format "Vorname Nachname" ist und konvertiere zu "Nachname, Vorname"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts.slice(1).join(' ')}, ${parts[0]}`;
    }
    return trimmed;
  };

  const diceCoefficient = (a, b) => {
    const aNorm = normalizePlayerName(a);
    const bNorm = normalizePlayerName(b);
    if (!aNorm || !bNorm) return 0;
    if (aNorm === bNorm) return 1;

    const bigrams = (str) => {
      const grams = new Set();
      for (let i = 0; i < str.length - 1; i += 1) {
        grams.add(str.slice(i, i + 2));
      }
      return grams;
    };

    const aBigrams = bigrams(aNorm);
    const bBigrams = bigrams(bNorm);

    let intersection = 0;
    aBigrams.forEach((gram) => {
      if (bBigrams.has(gram)) {
        intersection += 1;
      }
    });

    return (2 * intersection) / (aBigrams.size + bBigrams.size || 1);
  };

  const ensurePlayer = async (player, context) => {
    // DEBUG: Log Eingabe
    console.log(`[meeting-report] 🔍 ensurePlayer aufgerufen:`, {
      player: player ? { name: player.name, lk: player.lk, raw: player.raw } : null,
      context
    });
    
    const name = player?.name?.trim();
    if (!name) {
      console.warn(`[meeting-report] ⚠️ ensurePlayer: Kein Name vorhanden!`, { player, context });
      return null;
    }
    
    // Prüfe ob es ein "nicht angetreten"-Marker ist
    if (isPlayerNotPlayed(name) || isPlayerNotPlayed(player?.raw)) {
      console.log(`[meeting-report] ⏭️  Spieler nicht angetreten, überspringe: "${name}"`);
      return null; // Kein Spieler angetreten - kein Fehler
    }
    
    // Bestimme primary_team_id aus context
    let primaryTeamId = null;
    if (context?.side === 'home' && homeTeamId) {
      primaryTeamId = homeTeamId;
    } else if (context?.side === 'away' && awayTeamId) {
      primaryTeamId = awayTeamId;
    }
    
    const cacheKey = name.toLowerCase();
    if (playerCache.has(cacheKey)) return playerCache.get(cacheKey);

    // Lade alle Spieler für erweiterte Suche
    const { data: allPlayers, error: selectError } = await supabase
      .from('players_unified')
      .select('id, name, current_lk')
      .limit(5000); // Lade alle Spieler für Matching

    if (selectError) {
      console.warn('[meeting-report] Spieler-Suche fehlgeschlagen:', selectError.message);
      playerCache.set(cacheKey, null);
      registerMissingPlayer(player, context);
      return null;
    }

    if (!allPlayers || allPlayers.length === 0) {
      playerCache.set(cacheKey, null);
      registerMissingPlayer(player, context);
      return null;
    }

    const normalizedSearchName = normalizePlayerName(name);
    const reversedSearchName = reverseNameOrder(name);
    const normalizedReversedSearchName = normalizePlayerName(reversedSearchName);
    const playerLk = normalizeLk(player.lk) || normalizeLk(player.meta) || normalizeLk(player.raw);

    let bestMatch = null;
    let bestScore = 0;
    let matchType = null;

    // PRIORITÄT 1: Exakter Match (normalisiert)
    for (const existing of allPlayers) {
      const normalizedExisting = normalizePlayerName(existing.name);
      if (normalizedSearchName === normalizedExisting) {
        bestMatch = existing;
        bestScore = 1.0;
        matchType = 'exact_normalized';
        break;
      }
    }

    // PRIORITÄT 2: Exakter Match mit umgekehrter Namensreihenfolge
    if (!bestMatch) {
      for (const existing of allPlayers) {
        const normalizedExisting = normalizePlayerName(existing.name);
        if (normalizedReversedSearchName === normalizedExisting) {
          bestMatch = existing;
          bestScore = 0.95;
          matchType = 'exact_reversed';
          break;
        }
      }
    }

    // PRIORITÄT 3: Exakter Match mit umgekehrter Namensreihenfolge (auch umgekehrt prüfen)
    if (!bestMatch) {
      for (const existing of allPlayers) {
        const reversedExisting = reverseNameOrder(existing.name);
        const normalizedReversedExisting = normalizePlayerName(reversedExisting);
        if (normalizedSearchName === normalizedReversedExisting) {
          bestMatch = existing;
          bestScore = 0.95;
          matchType = 'exact_reversed_existing';
          break;
        }
      }
    }

    // PRIORITÄT 4: Fuzzy-Match mit Dice-Coefficient (Schwellenwert: 0.85)
    if (!bestMatch) {
      for (const existing of allPlayers) {
        const similarity = diceCoefficient(name, existing.name);
        const reversedSimilarity = diceCoefficient(reversedSearchName, existing.name);
        const maxSimilarity = Math.max(similarity, reversedSimilarity);

        if (maxSimilarity >= 0.85 && maxSimilarity > bestScore) {
          bestMatch = existing;
          bestScore = maxSimilarity;
          matchType = maxSimilarity === reversedSimilarity ? 'fuzzy_reversed' : 'fuzzy';
        }
      }
    }

    // PRIORITÄT 5: Fuzzy-Match mit LK-Filter (wenn LK vorhanden)
    if (!bestMatch && playerLk) {
      for (const existing of allPlayers) {
        if (existing.current_lk === playerLk) {
          const similarity = diceCoefficient(name, existing.name);
          const reversedSimilarity = diceCoefficient(reversedSearchName, existing.name);
          const maxSimilarity = Math.max(similarity, reversedSimilarity);

          if (maxSimilarity >= 0.75 && maxSimilarity > bestScore) {
            bestMatch = existing;
            bestScore = maxSimilarity;
            matchType = maxSimilarity === reversedSimilarity ? 'fuzzy_lk_reversed' : 'fuzzy_lk';
          }
        }
      }
    }

    if (bestMatch && bestScore >= 0.75) {
      console.log(
        `[meeting-report] ✅ Spieler gefunden: "${name}" → "${bestMatch.name}" (${matchType}, Score: ${(bestScore * 100).toFixed(1)}%)`
      );
      
      // Aktualisiere LK, falls vorhanden und unterschiedlich
      // Aktualisiere auch primary_team_id, falls noch nicht gesetzt
      const updateData = {};
      if (playerLk && bestMatch.current_lk !== playerLk) {
        updateData.current_lk = playerLk;
      }
      
      // Setze primary_team_id, falls noch nicht gesetzt
      let primaryTeamId = null;
      if (context?.side === 'home' && homeTeamId) {
        primaryTeamId = homeTeamId;
      } else if (context?.side === 'away' && awayTeamId) {
        primaryTeamId = awayTeamId;
      }
      
      if (primaryTeamId && !bestMatch.primary_team_id) {
        updateData.primary_team_id = primaryTeamId;
      }
      
      if (Object.keys(updateData).length > 0) {
        try {
          await supabase
            .from('players_unified')
            .update(updateData)
            .eq('id', bestMatch.id);
          
          if (updateData.current_lk) {
            console.log(`[meeting-report] ✅ LK aktualisiert für "${bestMatch.name}": ${bestMatch.current_lk} → ${playerLk}`);
          }
          if (updateData.primary_team_id) {
            console.log(`[meeting-report] ✅ primary_team_id gesetzt für "${bestMatch.name}": ${primaryTeamId}`);
            
            // Erstelle auch team_membership, falls noch nicht vorhanden
            try {
              const { data: matchdayData } = await supabase
                .from('matchdays')
                .select('season')
                .eq('id', matchdayId)
                .maybeSingle();
              
              const season = matchdayData?.season || null;
              
              const { data: existingMembership } = await supabase
                .from('team_memberships')
                .select('id')
                .eq('player_id', bestMatch.id)
                .eq('team_id', primaryTeamId)
                .eq('season', season || '')
                .maybeSingle();
              
              if (!existingMembership) {
                const { error: membershipError } = await supabase
                  .from('team_memberships')
                  .insert({
                    player_id: bestMatch.id,
                    team_id: primaryTeamId,
                    season: season || null,
                    role: 'player',
                    is_active: true,
                    is_primary: true
                  });
                
                if (membershipError) {
                  console.warn(`[meeting-report] ⚠️ Fehler beim Erstellen der team_membership:`, membershipError.message);
                } else {
                  console.log(`[meeting-report] ✅ Team-Membership erstellt für bestehenden Spieler ${bestMatch.id}`);
                }
              }
            } catch (membershipError) {
              console.warn(`[meeting-report] ⚠️ Fehler beim Erstellen der team_membership:`, membershipError.message);
            }
          }
        } catch (updateError) {
          console.warn(`[meeting-report] ⚠️ Fehler beim Update für "${bestMatch.name}":`, updateError.message);
        }
      }
      
      playerCache.set(cacheKey, bestMatch.id);
      return bestMatch.id;
    }

    // WICHTIG: Spieler nicht gefunden → automatisch anlegen!
    console.log(
      `[meeting-report] ⚠️ Spieler nicht gefunden: "${name}" (bester Score: ${(bestScore * 100).toFixed(1)}%) - erstelle neuen Spieler`
    );
    console.log(`[meeting-report] 🔍 Spieler-Details:`, {
      name,
      lk: playerLk,
      raw: player.raw,
      context
    });
    
    try {
      // Erstelle neuen Spieler in players_unified
      // WICHTIG: import_source muss einer der erlaubten Werte sein: 'tvm_import', 'manual', 'ai_import'
      const { data: newPlayer, error: insertError } = await supabase
        .from('players_unified')
        .insert({
          name: name,
          current_lk: playerLk || null,
          import_source: 'ai_import', // WICHTIG: 'nuliga_scraper' ist nicht erlaubt, verwende 'ai_import'
          import_lk: playerLk || null,
          is_active: false, // Spieler aus nuLiga sind zunächst nicht aktiv (kein User-Account)
          primary_team_id: primaryTeamId || null // WICHTIG: Setze primary_team_id basierend auf context.side
        })
        .select()
        .single();
      
      if (insertError) {
        // Prüfe ob Spieler bereits existiert (Unique Constraint)
        if (insertError.code === '23505') {
          // Versuche es nochmal zu finden (Race Condition)
          const { data: found } = await supabase
            .from('players_unified')
            .select('id, name, current_lk')
            .ilike('name', name)
            .limit(1)
            .maybeSingle();
          
          if (found) {
            console.log(`[meeting-report] ✅ Spieler gefunden nach Race Condition: "${name}" (ID: ${found.id})`);
            playerCache.set(cacheKey, found.id);
            return found.id;
          }
        }
        
        console.error(`[meeting-report] ❌ Fehler beim Erstellen von Spieler "${name}":`, insertError.message);
        playerCache.set(cacheKey, null);
        registerMissingPlayer(player, context);
        return null;
      }
      
      if (!newPlayer || !newPlayer.id) {
        console.error(`[meeting-report] ❌ Spieler erstellt, aber keine ID zurückgegeben!`, { newPlayer, name, playerLk });
        playerCache.set(cacheKey, null);
        registerMissingPlayer(player, context);
        return null;
      }
      
      console.log(`[meeting-report] ✅ Neuer Spieler erstellt: "${name}" (ID: ${newPlayer.id}, LK: ${playerLk || 'keine'}, primary_team_id: ${primaryTeamId || 'keine'})`);
      
      // Wenn primary_team_id gesetzt wurde, erstelle auch eine team_membership
      if (primaryTeamId && newPlayer.id) {
        try {
          // Lade season aus matchday
          const { data: matchdayData } = await supabase
            .from('matchdays')
            .select('season')
            .eq('id', matchdayId)
            .maybeSingle();
          
          const season = matchdayData?.season || null;
          
          // Prüfe ob team_membership bereits existiert
          const { data: existingMembership } = await supabase
            .from('team_memberships')
            .select('id')
            .eq('player_id', newPlayer.id)
            .eq('team_id', primaryTeamId)
            .eq('season', season || '')
            .maybeSingle();
          
          if (!existingMembership) {
            // Erstelle team_membership
            const { error: membershipError } = await supabase
              .from('team_memberships')
              .insert({
                player_id: newPlayer.id,
                team_id: primaryTeamId,
                season: season || null,
                role: 'player',
                is_active: true,
                is_primary: true // Markiere als primäres Team
              });
            
            if (membershipError) {
              console.warn(`[meeting-report] ⚠️ Fehler beim Erstellen der team_membership für Spieler ${newPlayer.id}:`, membershipError.message);
            } else {
              console.log(`[meeting-report] ✅ Team-Membership erstellt für Spieler ${newPlayer.id} (Team: ${primaryTeamId}, Season: ${season || 'keine'})`);
            }
          }
        } catch (membershipError) {
          console.warn(`[meeting-report] ⚠️ Fehler beim Erstellen der team_membership:`, membershipError.message);
        }
      }
      
      playerCache.set(cacheKey, newPlayer.id);
      return newPlayer.id;
    } catch (createError) {
      console.error(`[meeting-report] ❌ Unerwarteter Fehler beim Erstellen von Spieler "${name}":`, createError);
      playerCache.set(cacheKey, null);
      registerMissingPlayer(player, context);
      return null;
    }
  };

  const resolvePlayersForMatch = async (match, type, matchNumber, teamsMeta) => {
    const result = {};
    const homePlayers = match.homePlayers || [];
    const awayPlayers = match.awayPlayers || [];
    const homeTeamName = teamsMeta?.homeTeam || 'Heim';
    const awayTeamName = teamsMeta?.awayTeam || 'Gast';

    // DEBUG: Log Spieler-Daten
    console.log(`[meeting-report] 🔍 Resolve Players für Match #${matchNumber} (${type}):`);
    console.log(`  Home Players (${homePlayers.length}):`, homePlayers.map(p => ({ name: p?.name, lk: p?.lk, position: p?.position, raw: p?.raw })));
    console.log(`  Away Players (${awayPlayers.length}):`, awayPlayers.map(p => ({ name: p?.name, lk: p?.lk, position: p?.position, raw: p?.raw })));
    console.log(`  Match-Objekt:`, { 
      hasHomePlayers: !!match.homePlayers, 
      hasAwayPlayers: !!match.awayPlayers,
      matchKeys: Object.keys(match)
    });

    if (type === 'Einzel') {
      if (!homePlayers[0]) {
        console.warn(`[meeting-report] ⚠️ Kein Home-Player für Match #${matchNumber} (${type})`);
      }
      if (!awayPlayers[0]) {
        console.warn(`[meeting-report] ⚠️ Kein Away-Player für Match #${matchNumber} (${type})`);
      }

      result.home_player_id = homePlayers[0] ? await ensurePlayer(homePlayers[0], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler'
      }) : null;
      
      result.guest_player_id = awayPlayers[0] ? await ensurePlayer(awayPlayers[0], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler'
      }) : null;
      
      // Speichere Positionen für später (werden in team_memberships gespeichert)
      result._home_player_position = homePlayers[0]?.position || null;
      result._guest_player_position = awayPlayers[0]?.position || null;
    } else {
      if (!homePlayers[0] || !homePlayers[1]) {
        console.warn(`[meeting-report] ⚠️ Fehlende Home-Players für Match #${matchNumber} (${type}):`, {
          player1: !!homePlayers[0],
          player2: !!homePlayers[1]
        });
      }
      if (!awayPlayers[0] || !awayPlayers[1]) {
        console.warn(`[meeting-report] ⚠️ Fehlende Away-Players für Match #${matchNumber} (${type}):`, {
          player1: !!awayPlayers[0],
          player2: !!awayPlayers[1]
        });
      }

      result.home_player1_id = homePlayers[0] ? await ensurePlayer(homePlayers[0], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler1'
      }) : null;
      
      result.home_player2_id = homePlayers[1] ? await ensurePlayer(homePlayers[1], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler2'
      }) : null;
      
      result.guest_player1_id = awayPlayers[0] ? await ensurePlayer(awayPlayers[0], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler1'
      }) : null;
      
      result.guest_player2_id = awayPlayers[1] ? await ensurePlayer(awayPlayers[1], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler2'
      }) : null;
      
      // Speichere Positionen für später (werden in team_memberships gespeichert)
      result._home_player1_position = homePlayers[0]?.position || null;
      result._home_player2_position = homePlayers[1]?.position || null;
      result._guest_player1_position = awayPlayers[0]?.position || null;
      result._guest_player2_position = awayPlayers[1]?.position || null;
    }

    // DEBUG: Log Ergebnis
    console.log(`[meeting-report] ✅ Resolved Player IDs für Match #${matchNumber}:`, {
      home_player_id: result.home_player_id,
      guest_player_id: result.guest_player_id,
      home_player1_id: result.home_player1_id,
      home_player2_id: result.home_player2_id,
      guest_player1_id: result.guest_player1_id,
      guest_player2_id: result.guest_player2_id
    });

    return result;
  };

  const appendRow = async (match, type) => {
    counter += 1;
    const setScores = match.setScores || [];
    const matchPoints = match.matchPoints || null;
    const hasScore = matchPoints && matchPoints.home != null && matchPoints.away != null;
    let status = hasScore ? 'completed' : 'pending';
    let winner = hasScore ? determineMatchWinner(setScores, matchPoints) : null;
    if (match.walkover?.winner) {
      status = 'walkover';
      winner = match.walkover.winner === 'guest' ? 'guest' : 'home';
    }
    const matchNumberLabel = match.matchNumber || counter;
    const playerAssignments = await resolvePlayersForMatch(match, type, matchNumberLabel, metadata);

    // Entferne temporäre Position-Felder (werden später in team_memberships gespeichert)
    const {
      _home_player_position,
      _guest_player_position,
      _home_player1_position,
      _home_player2_position,
      _guest_player1_position,
      _guest_player2_position,
      ...cleanAssignments
    } = playerAssignments;

    // Speichere Positionen für später (werden nach dem DB-Insert in team_memberships gespeichert)
    if (type === 'Einzel') {
      if (playerAssignments.home_player_id && _home_player_position) {
        positionUpdates.push({
          playerId: playerAssignments.home_player_id,
          position: _home_player_position,
          side: 'home'
        });
      }
      if (playerAssignments.guest_player_id && _guest_player_position) {
        positionUpdates.push({
          playerId: playerAssignments.guest_player_id,
          position: _guest_player_position,
          side: 'away'
        });
      }
    } else {
      if (playerAssignments.home_player1_id && _home_player1_position) {
        positionUpdates.push({
          playerId: playerAssignments.home_player1_id,
          position: _home_player1_position,
          side: 'home'
        });
      }
      if (playerAssignments.home_player2_id && _home_player2_position) {
        positionUpdates.push({
          playerId: playerAssignments.home_player2_id,
          position: _home_player2_position,
          side: 'home'
        });
      }
      if (playerAssignments.guest_player1_id && _guest_player1_position) {
        positionUpdates.push({
          playerId: playerAssignments.guest_player1_id,
          position: _guest_player1_position,
          side: 'away'
        });
      }
      if (playerAssignments.guest_player2_id && _guest_player2_position) {
        positionUpdates.push({
          playerId: playerAssignments.guest_player2_id,
          position: _guest_player2_position,
          side: 'away'
        });
      }
    }

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
      completed_at: status !== 'pending' ? new Date().toISOString() : null,
      entered_at: new Date().toISOString(),
      ...cleanAssignments
    });
  };

  // VERBESSERT: Erstelle Ergebnisse auch wenn Spieler fehlen
  const skippedMatches = [];
  const errorDetails = [];
  
  for (const match of singles) {
    try {
      await appendRow(match, 'Einzel');
    } catch (error) {
      console.error(`[meeting-report] ❌ Fehler beim Erstellen von Einzel-Match #${match.matchNumber}:`, error.message);
      skippedMatches.push({ type: 'Einzel', matchNumber: match.matchNumber, error: error.message });
      errorDetails.push(`Einzel #${match.matchNumber}: ${error.message}`);
    }
  }
  for (const match of doubles) {
    try {
      await appendRow(match, 'Doppel');
    } catch (error) {
      console.error(`[meeting-report] ❌ Fehler beim Erstellen von Doppel-Match #${match.matchNumber}:`, error.message);
      skippedMatches.push({ type: 'Doppel', matchNumber: match.matchNumber, error: error.message });
      errorDetails.push(`Doppel #${match.matchNumber}: ${error.message}`);
    }
  }

  // VERBESSERT: Detaillierte Fehlermeldung wenn keine Ergebnisse erstellt wurden
  if (!rows.length) {
    const reason = [];
    if (!singles || singles.length === 0) {
      reason.push('Keine Einzel-Matches im Meeting-Report');
    }
    if (!doubles || doubles.length === 0) {
      reason.push('Keine Doppel-Matches im Meeting-Report');
    }
    if (singles && singles.length > 0 && doubles && doubles.length > 0) {
      reason.push('Alle Matches konnten nicht verarbeitet werden (siehe errorDetails)');
    }
    if (skippedMatches.length > 0) {
      reason.push(`${skippedMatches.length} Matches übersprungen`);
    }
    
    console.warn(`[meeting-report] ⚠️ Keine Ergebnisse erstellt:`, {
      singlesCount: singles?.length || 0,
      doublesCount: doubles?.length || 0,
      rowsCreated: rows.length,
      skippedMatches: skippedMatches.length,
      reasons: reason,
      errorDetails
    });
    
    return { 
      inserted: [], 
      deleted: 0, 
      missingPlayers: Array.from(pendingPlayers.values()),
      error: `Keine Ergebnisse erstellt: ${reason.join('; ')}`,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      skippedMatches: skippedMatches.length > 0 ? skippedMatches : undefined
    };
  }

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

  // Speichere Positionen in team_memberships (nur für Spieler unseres Teams)
  if (positionUpdates.length > 0) {
    try {
      // Lade matchday Daten, um home_team_id, away_team_id und season zu bekommen
      const { data: matchdayData, error: matchdayError } = await supabase
        .from('matchdays')
        .select('home_team_id, away_team_id, season')
        .eq('id', matchdayId)
        .maybeSingle();

      if (!matchdayError && matchdayData) {
        const { home_team_id, away_team_id, season } = matchdayData;

        // Gruppiere Position-Updates nach Spieler-ID (um Duplikate zu vermeiden)
        const positionMap = new Map();
        positionUpdates.forEach((update) => {
          const teamId = update.side === 'home' ? home_team_id : away_team_id;
          if (teamId && update.playerId) {
            const key = `${update.playerId}:${teamId}:${season || ''}`;
            // Behalte die erste Position (könnte auch die letzte sein, je nach Anforderung)
            if (!positionMap.has(key)) {
              positionMap.set(key, {
                playerId: update.playerId,
                teamId,
                season: season || null,
                position: update.position
              });
            }
          }
        });

        // Aktualisiere team_memberships mit Positionen
        for (const { playerId, teamId, season: playerSeason, position } of positionMap.values()) {
          if (!playerId || !teamId || !position) continue;

          // Prüfe ob team_membership existiert
          const { data: existingMembership, error: membershipError } = await supabase
            .from('team_memberships')
            .select('id')
            .eq('player_id', playerId)
            .eq('team_id', teamId)
            .eq('season', playerSeason || '')
            .maybeSingle();

          if (membershipError && membershipError.code !== 'PGRST116') {
            console.warn(`[meeting-report] Fehler beim Laden der team_membership für Spieler ${playerId}:`, membershipError.message);
            continue;
          }

          if (existingMembership) {
            // Update bestehende Membership
            const { error: updateError } = await supabase
              .from('team_memberships')
              .update({ meldeliste_position: position })
              .eq('id', existingMembership.id);

            if (updateError) {
              console.warn(`[meeting-report] Fehler beim Update der Position für Spieler ${playerId}:`, updateError.message);
            } else {
              console.log(`[meeting-report] ✅ Position ${position} für Spieler ${playerId} in team_memberships gespeichert`);
            }
          } else {
            // Erstelle neue Membership (falls nicht vorhanden)
            const { error: insertError } = await supabase
              .from('team_memberships')
              .insert({
                player_id: playerId,
                team_id: teamId,
                season: playerSeason || null,
                meldeliste_position: position,
                role: 'player',
                is_active: true
              });

            if (insertError) {
              console.warn(`[meeting-report] Fehler beim Erstellen der team_membership für Spieler ${playerId}:`, insertError.message);
            } else {
              console.log(`[meeting-report] ✅ Team-Membership mit Position ${position} für Spieler ${playerId} erstellt`);
            }
          }
        }
      } else if (matchdayError) {
        console.warn('[meeting-report] Fehler beim Laden der matchday-Daten für Position-Updates:', matchdayError.message);
      }
    } catch (positionError) {
      // Nicht kritisch - Position-Updates sind optional
      console.warn('[meeting-report] Fehler beim Speichern der Positionen in team_memberships:', positionError.message);
    }
  }

  // VERBESSERT: Füge Statistiken hinzu
  const stats = {
    inserted: data || [],
    deleted: rows.length,
    missingPlayers: Array.from(pendingPlayers.values()),
    totalProcessed: (singles?.length || 0) + (doubles?.length || 0),
    successful: rows.length,
    failed: skippedMatches.length
  };
  
  console.log(`[meeting-report] 📊 Import-Statistik:`, {
    totalProcessed: stats.totalProcessed,
    successful: stats.successful,
    failed: stats.failed,
    missingPlayers: stats.missingPlayers.length
  });
  
  return stats;
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

async function cleanupMatchdayData(matchdayId) {
  if (!matchdayId) return;
  try {
    const supabase = createSupabaseClient(true);
    const { error: resultsError } = await supabase.from('match_results').delete().eq('matchday_id', matchdayId);
    if (resultsError) {
      console.warn('[meeting-report] Cleanup match_results fehlgeschlagen:', resultsError.message);
    }
    const { error: matchdayError } = await supabase.from('matchdays').delete().eq('id', matchdayId);
    if (matchdayError) {
      console.warn('[meeting-report] Cleanup matchdays fehlgeschlagen:', matchdayError.message);
    }
  } catch (cleanupError) {
    console.error('[meeting-report] Unerwarteter Fehler beim Cleanup:', cleanupError);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  let requestContext = {};
  try {
    const {
      meetingId,
      meetingUrl,
      groupId,
      matchNumber,
      matchDate,
      matchdayId,
      homeTeam,
      awayTeam,
      apply: applyParam,
      cleanupOnly = false
    } = req.body || {};
    
    // VERBESSERT: Wenn matchdayId vorhanden ist, setze apply standardmäßig auf true
    const apply = applyParam !== undefined ? applyParam : (matchdayId ? true : false);
    requestContext = { matchdayId, apply, cleanupOnly };

    if (cleanupOnly) {
      await cleanupMatchdayData(matchdayId);
      return withCors(res, 200, {
        success: true,
        applied: false,
        cleanedUp: true
      });
    }

    const imports = await DEFAULT_IMPORTS.get();

    let resolvedMeetingId = meetingId || null;
    let groupMeta = null;
    let matchMeta = null;
    let resolvedMeetingUrl = meetingUrl || null;
    let effectiveLeagueUrl = null;

    // ✅ NEU: Lade leagueUrl aus team_seasons, wenn matchdayId vorhanden ist
    if (matchdayId && groupId) {
      try {
        const supabase = createSupabaseClient(true);
        // Lade matchday, um group_name, season, league zu bekommen
        const { data: matchdayData } = await supabase
          .from('matchdays')
          .select('group_name, season, league')
          .eq('id', matchdayId)
          .maybeSingle();
        
        if (matchdayData) {
          // Versuche, source_url aus team_seasons zu laden
          const { data: teamSeason } = await supabase
            .from('team_seasons')
            .select('source_url')
            .eq('group_name', matchdayData.group_name)
            .eq('season', matchdayData.season)
            .eq('league', matchdayData.league)
            .not('source_url', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (teamSeason?.source_url) {
            effectiveLeagueUrl = teamSeason.source_url;
            console.log(`[meeting-report] ✅ source_url aus team_seasons geladen: ${effectiveLeagueUrl}`);
          } else {
            // ✅ FALLBACK: Basierend auf Liga-Name die richtige URL bestimmen
            // WICHTIG: "Köln-Leverkusen" Ligen brauchen einen anderen championship-Parameter!
            const league = matchdayData.league || '';
            let baseUrl;
            let tab = 2; // Default: Damen/Herren
            
            // Prüfe Liga-Name für championship-Parameter
            if (league.includes('Köln-Leverkusen')) {
              // Köln-Leverkusen Ligen verwenden championship=Köln-Leverkusen+Winter+2025%2F2026
              baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
              
              // ✅ Normalisiere Liga-Name: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
              // Extrahiere Kategorie aus Liga-Name für Tab-Bestimmung
              const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
              let categoryForTab = categoryMatch ? categoryMatch[1] : '';
              if (categoryMatch && categoryMatch[2]) {
                const number = parseInt(categoryMatch[2], 10);
                // Wenn Zahl >= 30 → Altersklasse, sonst Mannschaftsnummer (1-3)
                if (number >= 30) {
                  categoryForTab = `${categoryMatch[1]} ${number}`;
                }
              }
              
              // Bestimme Tab basierend auf Altersklasse:
              // - "Herren 30/40/50/55/60/65/70" = Senioren (tab=3)
              // - "Herren" (ohne Altersklasse) = Offene Herren (tab=2)
              // - "Herren 1/2/3" = Mannschaftsnummern, KEINE Altersklassen! → "Herren" (tab=2)
              // - "Damen 30/40/50/55/60" = Senioren (tab=3)
              // - "Damen" (ohne Altersklasse) = Offene Damen (tab=2)
              if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
                tab = 3; // Senioren
              } else {
                tab = 2; // Offene Herren/Damen
              }
              
              effectiveLeagueUrl = `${baseUrl}&tab=${tab}`;
              console.log(`[meeting-report] ⚠️ Keine source_url gefunden, verwende Fallback (Köln-Leverkusen, tab=${tab}) für Liga "${league}": ${effectiveLeagueUrl}`);
            } else {
              // Andere Ligen (z.B. Verbandsliga, Mittelrheinliga) verwenden championship=TVM+Winter+2025%2F2026
              baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=TVM+Winter+2025%2F2026';
              
              // Versuche Kategorie aus einem Team dieser Gruppe zu holen, um Tab-Seite zu bestimmen
              try {
                const { data: teamSeason } = await supabase
                  .from('team_seasons')
                  .select('team_id')
                  .eq('group_name', matchdayData.group_name)
                  .eq('season', matchdayData.season)
                  .eq('league', matchdayData.league)
                  .limit(1)
                  .maybeSingle();
                
                if (teamSeason?.team_id) {
                  const { data: teamInfo } = await supabase
                    .from('team_info')
                    .select('category')
                    .eq('id', teamSeason.team_id)
                    .maybeSingle();
                  
                  if (teamInfo?.category) {
                    // ✅ Normalisiere Kategorie: "Damen 1/2/3" → "Damen", "Herren 1/2/3" → "Herren"
                    const normalizedCategory = normalizeCategory(teamInfo.category);
                    
                    // Bestimme Tab basierend auf Kategorie: "Herren 30/40/50/etc." = Senioren (tab=3)
                    if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
                      tab = 3; // Senioren
                    } else {
                      tab = 2; // Offene Herren/Damen
                    }
                  }
                }
              } catch (error) {
                console.warn(`[meeting-report] ⚠️ Fehler beim Laden der Kategorie:`, error);
                // Fallback zu tab=2
                tab = 2;
              }
              
              effectiveLeagueUrl = `${baseUrl}&tab=${tab}`;
              console.log(`[meeting-report] ⚠️ Keine source_url gefunden, verwende Fallback (TVM, tab=${tab}) für Liga "${league}": ${effectiveLeagueUrl}`);
            }
          }
        }
      } catch (urlError) {
        console.warn('[meeting-report] ⚠️ Fehler beim Laden der source_url:', urlError);
        // Weiter mit DEFAULT_LEAGUE_URL
      }
    }

    // Verwende effectiveLeagueUrl, falls vorhanden, sonst DEFAULT_LEAGUE_URL
    const leagueUrlToUse = effectiveLeagueUrl || imports.DEFAULT_LEAGUE_URL;

    if (!resolvedMeetingId) {
      if (!groupId) {
        throw new Error('groupId erforderlich, wenn keine meetingId übergeben wird.');
      }
      const result = await determineMeetingId({
        leagueUrl: leagueUrlToUse,
        groupId,
        matchNumber,
        homeTeam,
        awayTeam,
        matchDate,
        meetingId: meetingId || null
      });
      resolvedMeetingId = result.meetingId;
      resolvedMeetingUrl = result.meetingReportUrl || resolvedMeetingUrl;
      groupMeta = result.groupMeta;
      matchMeta = result.matchMeta;
      
      // VERBESSERT: Speichere erfolgreiche URL zurück in team_seasons, wenn sie eine Fallback-URL war
      if (result.successfulUrl && matchdayId && matchdayData) {
        try {
          const supabase = createSupabaseClient(true);
          // Finde team_seasons Eintrag für diese Gruppe
          const { data: teamSeasons } = await supabase
            .from('team_seasons')
            .select('id')
            .eq('group_name', matchdayData.group_name)
            .eq('season', matchdayData.season)
            .eq('league', matchdayData.league)
            .limit(1);
          
          if (teamSeasons && teamSeasons.length > 0) {
            // Update source_url für alle Einträge dieser Gruppe
            const { error: updateError } = await supabase
              .from('team_seasons')
              .update({ source_url: result.successfulUrl })
              .eq('group_name', matchdayData.group_name)
              .eq('season', matchdayData.season)
              .eq('league', matchdayData.league);
            
            if (!updateError) {
              console.log(`[meeting-report] ✅ source_url gespeichert für Gruppe ${matchdayData.group_name}: ${result.successfulUrl}`);
            } else {
              console.warn(`[meeting-report] ⚠️ Fehler beim Speichern der source_url:`, updateError.message);
            }
          }
        } catch (saveError) {
          console.warn(`[meeting-report] ⚠️ Fehler beim Speichern der erfolgreichen URL:`, saveError.message);
        }
      }
    }

    if (groupId && !groupMeta) {
      try {
        const metaResult = await determineMeetingId({
          leagueUrl: leagueUrlToUse,
          groupId,
          matchNumber,
          homeTeam,
          awayTeam,
          matchDate,
          meetingId: resolvedMeetingId
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
    
    // VERBESSERT: Validierung des Meeting-Reports
    if (!meetingData) {
      throw new Error('Meeting-Report konnte nicht geladen werden (keine Daten zurückgegeben)');
    }
    
    const singlesCount = meetingData.singles?.length || 0;
    const doublesCount = meetingData.doubles?.length || 0;
    const totalMatches = singlesCount + doublesCount;
    
    // DEBUG: Log extrahierte Daten
    console.log(`[meeting-report] 📥 Meeting-Report extrahiert:`, {
      singlesCount,
      doublesCount,
      totalMatches,
      hasMetadata: !!meetingData.metadata,
      metadata: meetingData.metadata ? {
        homeTeam: meetingData.metadata.homeTeam,
        awayTeam: meetingData.metadata.awayTeam
      } : null,
      firstSingle: meetingData.singles?.[0] ? {
        matchNumber: meetingData.singles[0].matchNumber,
        homePlayers: meetingData.singles[0].homePlayers?.map(p => ({ name: p.name, lk: p.lk })) || [],
        awayPlayers: meetingData.singles[0].awayPlayers?.map(p => ({ name: p.name, lk: p.lk })) || [],
        hasSetScores: !!meetingData.singles[0].setScores,
        setScoresCount: meetingData.singles[0].setScores?.length || 0
      } : null
    });
    
    // WARNUNG: Wenn keine Matches gefunden wurden
    if (totalMatches === 0) {
      console.warn(`[meeting-report] ⚠️ Meeting-Report enthält keine Matches (singles: ${singlesCount}, doubles: ${doublesCount})`);
      console.warn(`[meeting-report] ⚠️ Meeting-ID: ${resolvedMeetingId}, Meeting-URL: ${resolvedMeetingUrl}`);
    }

    const normalizeTeam = imports.normalizeTeamLabel || ((value) => (value ? value.toString().toLowerCase().trim() : ''));
    const diceCoefficient = imports.diceCoefficient || (() => 0);
    const TEAM_SIMILARITY_THRESHOLD = 0.85;

    // Hilfsfunktion für Präfix-Matching (für abgekürzte Namen wie "SV Blau" vs "SV Blau-Weiß-Rot")
    const isPrefixMatch = (shortStr, longStr) => {
      if (!shortStr || !longStr) return false;
      const shortNorm = normalizeTeam(shortStr);
      const longNorm = normalizeTeam(longStr);
      
      if (longNorm.startsWith(shortNorm)) {
        const remainder = longNorm.substring(shortNorm.length).trim();
        // Wenn der Rest leer ist oder nur aus Bindestrichen/Leerzeichen besteht, ist es ein gutes Match
        if (remainder.length === 0 || /^[\s-]+$/.test(remainder)) {
          return true;
        }
        // Wenn der Rest mit Bindestrich beginnt und weitere Wörter enthält, ist es auch ein Match
        if (remainder.startsWith('-') && remainder.length > 1) {
          return true;
        }
      }
      return false;
    };

    // Verbesserte Similarity-Berechnung mit Präfix-Matching
    const calculateTeamSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      const norm1 = normalizeTeam(str1);
      const norm2 = normalizeTeam(str2);
      if (norm1 === norm2) return 1.0;
      
      // Prüfe Präfix-Matching (für abgekürzte Namen)
      if (Math.abs(norm1.length - norm2.length) > 3) {
        const shorter = norm1.length < norm2.length ? norm1 : norm2;
        const longer = norm1.length < norm2.length ? norm2 : norm1;
        
        if (isPrefixMatch(shorter, longer)) {
          // Präfix-Match: Score basierend auf Länge des kürzeren Strings
          const prefixScore = shorter.length / longer.length;
          // Mindestens 0.75 für Präfix-Matches, aber nicht mehr als 0.95
          return Math.max(0.75, Math.min(0.95, prefixScore * 1.1));
        }
      }
      
      // Fallback zu diceCoefficient
      return diceCoefficient(str1, str2);
    };

    const metaHome = meetingData.metadata?.homeTeam ? normalizeTeam(meetingData.metadata.homeTeam) : null;
    const metaAway = meetingData.metadata?.awayTeam ? normalizeTeam(meetingData.metadata.awayTeam) : null;
    const localHome = homeTeam ? normalizeTeam(homeTeam) : null;
    const localAway = awayTeam ? normalizeTeam(awayTeam) : null;

    // Prüfe Heimteam - nur Fehler werfen wenn nicht ähnlich genug
    if (metaHome && localHome && metaHome !== localHome) {
      const similarity = calculateTeamSimilarity(meetingData.metadata?.homeTeam || '', homeTeam || '');
      if (similarity < TEAM_SIMILARITY_THRESHOLD) {
        const error = new Error(
          `Spielbericht gehört zu "${meetingData.metadata?.homeTeam || 'unbekannt'}" (Heim), nicht zu "${homeTeam}". Ähnlichkeit: ${(similarity * 100).toFixed(1)}%`
        );
        error.code = 'MEETING_TEAM_MISMATCH';
        error.meta = { type: 'home', expected: homeTeam, actual: meetingData.metadata?.homeTeam, similarity };
        throw error;
      }
      // Wenn ähnlich genug, akzeptieren wir es (z.B. "SV RG Sürth 1" vs "SV Rot-Gelb Sürth 1" oder "SV Blau" vs "SV Blau-Weiß-Rot 1")
    }

    // Prüfe Gastteam - nur Fehler werfen wenn nicht ähnlich genug
    if (metaAway && localAway && metaAway !== localAway) {
      const similarity = calculateTeamSimilarity(meetingData.metadata?.awayTeam || '', awayTeam || '');
      if (similarity < TEAM_SIMILARITY_THRESHOLD) {
        const error = new Error(
          `Spielbericht gehört zu "${meetingData.metadata?.awayTeam || 'unbekannt'}" (Gast), nicht zu "${awayTeam}". Ähnlichkeit: ${(similarity * 100).toFixed(1)}%`
        );
        error.code = 'MEETING_TEAM_MISMATCH';
        error.meta = { type: 'away', expected: awayTeam, actual: meetingData.metadata?.awayTeam, similarity };
        throw error;
      }
      // Wenn ähnlich genug, akzeptieren wir es (z.B. "SV RG Sürth 1" vs "SV Rot-Gelb Sürth 1" oder "SV Blau" vs "SV Blau-Weiß-Rot 1")
    }

    let applyResult = null;
    if (apply) {
      if (!matchdayId) {
        throw new Error('matchdayId ist erforderlich, um Daten zu speichern.');
      }
      const supabase = createSupabaseClient(true);
      applyResult = await applyMeetingResults({
        supabase,
        matchdayId,
        singles: meetingData.singles,
        doubles: meetingData.doubles,
        metadata: meetingData.metadata
      });
    }

    // VERBESSERT: Prüfe applyResult auf Fehler
    if (applyResult && applyResult.error) {
      console.warn(`[meeting-report] ⚠️ Fehler beim Anwenden der Ergebnisse:`, applyResult.error);
      if (applyResult.errorDetails) {
        console.warn(`[meeting-report] ⚠️ Fehler-Details:`, applyResult.errorDetails);
      }
    }
    
    // DEBUG: Log Rückgabe-Daten
    console.log(`[meeting-report] 📤 Rückgabe-Daten:`, {
      success: true,
      singlesCount: meetingData.singles?.length || 0,
      doublesCount: meetingData.doubles?.length || 0,
      applyResult: applyResult ? {
        inserted: applyResult.inserted?.length || 0,
        missingPlayers: applyResult.missingPlayers?.length || 0,
        hasError: !!applyResult.error,
        error: applyResult.error
      } : null
    });
    
    // VERBESSERT: Wenn applyResult einen Fehler hat, aber trotzdem Daten vorhanden sind, geben wir eine Warnung zurück
    const response = {
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
    };
    
    // Wenn applyResult einen Fehler hat, setze success auf false für bessere Fehlerbehandlung
    if (applyResult && applyResult.error && applyResult.inserted?.length === 0) {
      response.success = false;
      response.error = applyResult.error;
      response.errorDetails = applyResult.errorDetails;
      response.warning = 'Meeting-Report wurde geladen, aber keine Ergebnisse konnten importiert werden';
    }
    
    return withCors(res, response.success ? 200 : 400, response);
  } catch (error) {
    console.error('[api/import/meeting-report] Fehler:', error);
    if (
      requestContext.matchdayId &&
      ['MATCH_ID_UNCERTAIN', 'MEETING_TEAM_MISMATCH'].includes(error.code)
    ) {
      await cleanupMatchdayData(requestContext.matchdayId);
    }

    // WICHTIG: Für bestimmte Error-Codes einen anderen HTTP-Status zurückgeben
    // MEETING_ID_NOT_AVAILABLE und MEETING_NOT_FOUND sind keine Server-Fehler, sondern erwartete Situationen
    const statusCode = ['MEETING_ID_NOT_AVAILABLE', 'MEETING_NOT_FOUND'].includes(error.code) ? 200 : 500;

    return withCors(res, statusCode, {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Meeting-Report-Parser.',
      errorCode: error.code || null,
      errorMeta: error.meta || null
    });
  }
};

