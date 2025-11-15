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
    }
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

function normalizeLk(value) {
  if (!value) return null;
  const text = String(value).trim().replace(',', '.');
  const match = text.match(/^\d{1,2}(?:\.\d)?$/);
  return match ? match[0] : null;
}

async function applyMeetingResults({ supabase, matchdayId, singles, doubles, metadata }) {
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
    if (!player || !player.name) return;
    const normalizedName = player.name.trim();
    if (!normalizedName) return;
    
    // Prüfe ob es ein "nicht angetreten"-Marker ist
    if (isPlayerNotPlayed(normalizedName) || isPlayerNotPlayed(player.raw)) {
      console.log(`[meeting-report] ⏭️  Spieler nicht angetreten, überspringe: "${normalizedName}"`);
      return; // Ignoriere - kein Spieler angetreten
    }
    
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
    const name = player?.name?.trim();
    if (!name) return null;
    
    // Prüfe ob es ein "nicht angetreten"-Marker ist
    if (isPlayerNotPlayed(name) || isPlayerNotPlayed(player?.raw)) {
      console.log(`[meeting-report] ⏭️  Spieler nicht angetreten, überspringe: "${name}"`);
      return null; // Kein Spieler angetreten - kein Fehler
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
      playerCache.set(cacheKey, bestMatch.id);
      return bestMatch.id;
    }

    console.log(
      `[meeting-report] ⚠️ Spieler nicht gefunden: "${name}" (bester Score: ${(bestScore * 100).toFixed(1)}%)`
    );
    playerCache.set(cacheKey, null);
    registerMissingPlayer(player, context);
    return null;
  };

  const resolvePlayersForMatch = async (match, type, matchNumber, teamsMeta) => {
    const result = {};
    const homePlayers = match.homePlayers || [];
    const awayPlayers = match.awayPlayers || [];
    const homeTeamName = teamsMeta?.homeTeam || 'Heim';
    const awayTeamName = teamsMeta?.awayTeam || 'Gast';

    if (type === 'Einzel') {
      result.home_player_id = await ensurePlayer(homePlayers[0], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler'
      });
      result.guest_player_id = await ensurePlayer(awayPlayers[0], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler'
      });
      // Speichere Positionen für später (werden in team_memberships gespeichert)
      result._home_player_position = homePlayers[0]?.position || null;
      result._guest_player_position = awayPlayers[0]?.position || null;
    } else {
      result.home_player1_id = await ensurePlayer(homePlayers[0], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler1'
      });
      result.home_player2_id = await ensurePlayer(homePlayers[1], {
        matchNumber,
        matchType: type,
        side: 'home',
        teamName: homeTeamName,
        slot: 'spieler2'
      });
      result.guest_player1_id = await ensurePlayer(awayPlayers[0], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler1'
      });
      result.guest_player2_id = await ensurePlayer(awayPlayers[1], {
        matchNumber,
        matchType: type,
        side: 'away',
        teamName: awayTeamName,
        slot: 'spieler2'
      });
      // Speichere Positionen für später (werden in team_memberships gespeichert)
      result._home_player1_position = homePlayers[0]?.position || null;
      result._home_player2_position = homePlayers[1]?.position || null;
      result._guest_player1_position = awayPlayers[0]?.position || null;
      result._guest_player2_position = awayPlayers[1]?.position || null;
    }

    return result;
  };

  const appendRow = async (match, type) => {
    counter += 1;
    const setScores = match.setScores || [];
    const matchPoints = match.matchPoints || null;
    const status = matchPoints && matchPoints.home != null && matchPoints.away != null ? 'completed' : 'pending';
    const winner = status === 'completed' ? determineMatchWinner(setScores, matchPoints) : null;
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
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      entered_at: new Date().toISOString(),
      ...cleanAssignments
    });
  };

  for (const match of singles) {
    await appendRow(match, 'Einzel');
  }
  for (const match of doubles) {
    await appendRow(match, 'Doppel');
  }

  if (!rows.length) {
    return { inserted: [], deleted: 0, missingPlayers: [] };
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
      apply = false,
      cleanupOnly = false
    } = req.body || {};
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

    if (!resolvedMeetingId) {
      if (!groupId) {
        throw new Error('groupId erforderlich, wenn keine meetingId übergeben wird.');
      }
      const result = await determineMeetingId({
        leagueUrl: imports.DEFAULT_LEAGUE_URL,
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
    }

    if (groupId && !groupMeta) {
      try {
        const metaResult = await determineMeetingId({
          leagueUrl: imports.DEFAULT_LEAGUE_URL,
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
    if (
      requestContext.matchdayId &&
      ['MATCH_ID_UNCERTAIN', 'MEETING_TEAM_MISMATCH'].includes(error.code)
    ) {
      await cleanupMatchdayData(requestContext.matchdayId);
    }

    return withCors(res, 500, {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Meeting-Report-Parser.'
    });
  }
};

