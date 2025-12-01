import { supabase } from '../lib/supabaseClient';

/**
 * Prüft ob ein Spieler berechtigt ist, Ergebnisse für einen Matchday einzutragen
 * @param {string} userId - User-ID
 * @param {string} matchdayId - Matchday-ID
 * @param {string} homeTeamId - Home-Team-ID
 * @param {string} awayTeamId - Away-Team-ID
 * @returns {Promise<boolean>}
 */
export async function checkEntryAuthorization(userId, matchdayId, homeTeamId, awayTeamId) {
  try {
    // 1. Hole Spieler-ID des Users
    const { data: player, error: playerError } = await supabase
      .from('players_unified')
      .select('id, is_super_admin')
      .eq('user_id', userId)
      .single();
    
    if (playerError || !player) {
      console.error('❌ Player not found:', playerError);
      return false;
    }
    
    // 2. Prüfe Super-Admin (kann alle Ergebnisse verändern)
    if (player.is_super_admin === true) {
      return true;
    }
    
    // 3. Prüfe Team-Membership (Home-Team)
    const { data: homeMembership } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('player_id', player.id)
      .eq('team_id', homeTeamId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (homeMembership) {
      return true;
    }
    
    // 4. Prüfe Team-Membership (Away-Team)
    const { data: awayMembership } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('player_id', player.id)
      .eq('team_id', awayTeamId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (awayMembership) {
      return true;
    }
    
    // 5. Prüfe Matchday-Teilnahme
    const { data: availability } = await supabase
      .from('match_availability')
      .select('id')
      .eq('matchday_id', matchdayId)
      .eq('player_id', player.id)
      .in('status', ['available', 'confirmed'])
      .maybeSingle();
    
    return availability !== null;
  } catch (error) {
    console.error('❌ Error checking entry authorization:', error);
    return false;
  }
}

/**
 * Berechnet die Punkte für eine Ergebnis-Eingabe
 * @param {Object} params - Parameter-Objekt
 * @param {Date} matchStart - Spielstart-Zeit
 * @param {string} matchType - 'Einzel' oder 'Doppel'
 * @param {Date} enteredAt - Eingabe-Zeit
 * @param {string} status - Match-Status ('completed', 'in_progress', 'pending', etc.)
 * @param {Object} existingResult - Existierendes Ergebnis (optional)
 * @param {boolean} isSuperAdmin - Ist der Spieler Super-Admin?
 * @returns {Object} { points, timeDiffMinutes, expectedEndTime, isProgressEntry }
 */
export function calculateGamificationPoints({
  matchStart,
  matchType,
  enteredAt,
  status,
  existingResult = null,
  isSuperAdmin = false
}) {
  // Super-Admin sammelt keine Punkte
  if (isSuperAdmin) {
    return {
      points: 0,
      timeDiffMinutes: 0,
      expectedEndTime: null,
      isProgressEntry: false
    };
  }

  // Berechne erwartetes Spielende basierend auf Match-Typ
  let expectedEndTime;
  if (matchType === 'Einzel') {
    // Einzel: Spielstart + 2 Stunden
    expectedEndTime = new Date(matchStart.getTime() + 2 * 60 * 60 * 1000);
  } else if (matchType === 'Doppel') {
    // Doppel: Spielstart + 3.5 Stunden (nach den Einzeln)
    expectedEndTime = new Date(matchStart.getTime() + 3.5 * 60 * 60 * 1000);
  } else {
    // Fallback: 2 Stunden
    expectedEndTime = new Date(matchStart.getTime() + 2 * 60 * 60 * 1000);
  }

  // Berechne Zeitdifferenz
  const timeDiffMinutes = (enteredAt - expectedEndTime) / (1000 * 60);

  // Prüfe ob Zwischenstand oder Abschluss
  const isInProgress = status === 'in_progress' || status === 'pending';
  const isCompleted = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'].includes(status);
  
  // Prüfe ob bereits ein Zwischenstand für dieses Match eingetragen wurde
  const wasProgressEntry = existingResult && 
    (existingResult.status === 'in_progress' || existingResult.status === 'pending') && 
    isCompleted;

  // Bestimme Basis-Punkte basierend auf Zeitfenster
  let basePoints = 0;
  if (timeDiffMinutes <= 30) basePoints = 50;      // Blitz
  else if (timeDiffMinutes <= 60) basePoints = 30;  // Schnell
  else if (timeDiffMinutes <= 120) basePoints = 15; // Pünktlich
  else basePoints = 5;                               // Spät

  let points = 0;

  if (isInProgress) {
    // Zwischenstand: 50% der Punkte
    points = Math.round(basePoints * 0.5);
  } else if (wasProgressEntry) {
    // Abschluss nach Zwischenstand: Volle Punkte abzüglich bereits erhaltener Zwischenstand-Punkte
    const previousProgressPoints = existingResult.gamification_points || 0;
    points = basePoints - previousProgressPoints; // Differenz zu vollen Punkten
    // Stelle sicher, dass Punkte nicht negativ werden
    if (points < 0) points = 0;
  } else if (isCompleted) {
    // Direkter Abschluss: Volle Punkte
    points = basePoints;
  } else {
    // Kein abgeschlossenes Spiel: Keine Punkte
    points = 0;
  }

  return {
    points,
    timeDiffMinutes: Math.round(timeDiffMinutes),
    expectedEndTime,
    isProgressEntry: isInProgress
  };
}

/**
 * Speichert ein Achievement für einen Spieler
 * @param {Object} params - Achievement-Daten
 * @returns {Promise<Object>}
 */
export async function saveAchievement({
  playerId,
  achievementType,
  points,
  badgeName,
  matchdayId,
  matchResultId,
  matchType,
  timeToEntryMinutes,
  expectedEndTime,
  isProgressEntry
}) {
  try {
    const { data, error } = await supabase
      .from('player_achievements')
      .insert({
        player_id: playerId,
        achievement_type: achievementType,
        points,
        badge_name: badgeName,
        matchday_id: matchdayId,
        match_result_id: matchResultId,
        match_type: matchType,
        time_to_entry_minutes: timeToEntryMinutes,
        expected_end_time: expectedEndTime?.toISOString(),
        is_progress_entry: isProgressEntry
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving achievement:', error);
      throw error;
    }

    // Aktualisiere Gesamtpunkte des Spielers
    await updatePlayerPoints(playerId, points);

    // 🔥 MATCHDAY-STREAK: Aktualisiere Matchday-Streak nach Achievement
    if (achievementType === 'speed_entry' && points > 0 && matchdayId) {
      const streakResult = await updateMatchdayStreak(playerId, matchdayId, expectedEndTime || new Date());
      
      // Berechne Matchday-Streak-Bonus (basierend auf Prozentsatz der Matchdays mit schnellen Eingaben)
      const matchdayStreakBonus = await calculateMatchdayStreakBonus(playerId, matchdayId);
      
      // Füge Streak-Bonus zu den Punkten hinzu (wird bereits in updateMatchdayStreak gespeichert)
      if (streakResult.streakBonus > 0 || matchdayStreakBonus > 0) {
        console.log(`🔥 Matchday-Streak-Bonus: ${streakResult.streakBonus} (Matchday-Streak: ${streakResult.currentStreak}), Saison-Bonus: ${matchdayStreakBonus}`);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error in saveAchievement:', error);
    throw error;
  }
}

/**
 * Aktualisiert die Gesamtpunkte eines Spielers
 * @param {string} playerId - Player-ID
 * @param {number} additionalPoints - Zusätzliche Punkte
 * @returns {Promise<void>}
 */
async function updatePlayerPoints(playerId, additionalPoints) {
  try {
    const { error } = await supabase.rpc('increment_player_points', {
      player_id_param: playerId,
      points_to_add: additionalPoints
    });

    // Falls RPC nicht existiert, verwende Update
    if (error && error.code === '42883') {
      const { data: player } = await supabase
        .from('players_unified')
        .select('gamification_points')
        .eq('id', playerId)
        .single();

      const newPoints = (player?.gamification_points || 0) + additionalPoints;

      await supabase
        .from('players_unified')
        .update({ gamification_points: newPoints })
        .eq('id', playerId);
    } else if (error) {
      console.error('❌ Error updating player points:', error);
    }
  } catch (error) {
    console.error('❌ Error in updatePlayerPoints:', error);
  }
}

/**
 * Speichert die Historie einer Änderung an einem abgeschlossenen Spiel
 * @param {Object} params - Historie-Daten
 * @returns {Promise<Object>}
 */
export async function saveMatchResultHistory({
  matchResultId,
  changedBy,
  previousValues,
  newValues,
  reason = null
}) {
  try {
    const { data, error } = await supabase
      .from('match_result_history')
      .insert({
        match_result_id: matchResultId,
        changed_by: changedBy,
        previous_values: previousValues,
        new_values: newValues,
        reason
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving match result history:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in saveMatchResultHistory:', error);
    throw error;
  }
}

/**
 * Prüft ob ein Spiel bereits abgeschlossen ist
 * @param {string} status - Match-Status
 * @returns {boolean}
 */
export function isMatchCompleted(status) {
  return ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'].includes(status);
}

/**
 * Gibt den Badge-Namen für eine Zeitdifferenz zurück
 * @param {number} timeDiffMinutes - Zeitdifferenz in Minuten
 * @returns {string}
 */
export function getBadgeForTime(timeDiffMinutes) {
  if (timeDiffMinutes <= 30) return '⚡ Blitz-Eingabe';
  if (timeDiffMinutes <= 60) return '🚀 Schnell-Eingabe';
  if (timeDiffMinutes <= 120) return '✅ Pünktlich';
  return '📝 Spät-Eingabe';
}

/**
 * Aktualisiert den Matchday-Streak eines Spielers (NEU: basierend auf Matchdays, nicht Tagen)
 * @param {string} playerId - Player-ID
 * @param {string} matchdayId - Matchday-ID der aktuellen Eingabe
 * @param {Date} entryDate - Datum der Eingabe
 * @returns {Promise<Object>} { currentStreak, longestStreak, streakBonus }
 */
export async function updateMatchdayStreak(playerId, matchdayId, entryDate) {
  try {
    // Hole aktuelle Spieler-Daten
    const { data: player, error: playerError } = await supabase
      .from('players_unified')
      .select('current_streak, longest_streak, last_entry_date')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      console.error('❌ Error loading player for streak update:', playerError);
      return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
    }

    // Lade alle Matchdays des Spielers (basierend auf seinen Teams)
    const playerTeams = await getPlayerTeams(playerId);
    if (!playerTeams || playerTeams.length === 0) {
      console.warn('⚠️ No teams found for player, cannot calculate matchday streak');
      return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
    }

    const teamIds = playerTeams.map(t => t.id);
    
    // Lade alle Matchdays für die Teams des Spielers, sortiert nach Datum
    const { data: allMatchdays, error: matchdaysError } = await supabase
      .from('matchdays')
      .select('id, match_date')
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .order('match_date', { ascending: true });

    if (matchdaysError || !allMatchdays) {
      console.error('❌ Error loading matchdays for streak:', matchdaysError);
      return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
    }

    // Lade alle schnellen Eingaben des Spielers (nur speed_entry, keine progress_entry)
    const { data: achievements, error: achievementsError } = await supabase
      .from('player_achievements')
      .select('matchday_id, created_at, points')
      .eq('player_id', playerId)
      .eq('achievement_type', 'speed_entry')
      .gte('points', 15) // Mindestens "Pünktlich" (15 Punkte)
      .not('matchday_id', 'is', null)
      .order('created_at', { ascending: true });

    if (achievementsError) {
      console.error('❌ Error loading achievements for streak:', achievementsError);
      return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
    }

    // Erstelle Map: matchdayId -> hat schnelle Eingabe
    const matchdaysWithFastEntry = new Set((achievements || []).map(a => a.matchday_id));

    // Finde den aktuellen Matchday in der Liste
    const currentMatchdayIndex = allMatchdays.findIndex(m => m.id === matchdayId);
    if (currentMatchdayIndex === -1) {
      console.warn('⚠️ Current matchday not found in player teams matchdays');
      return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
    }

    // Markiere aktuellen Matchday als "hat schnelle Eingabe"
    matchdaysWithFastEntry.add(matchdayId);

    // Berechne aktuellen Streak: Zähle aufeinanderfolgende Matchdays mit schnellen Eingaben
    // Starte beim aktuellen Matchday und gehe rückwärts
    let currentStreak = 0;
    for (let i = currentMatchdayIndex; i >= 0; i--) {
      if (matchdaysWithFastEntry.has(allMatchdays[i].id)) {
        currentStreak++;
      } else {
        break; // Streak unterbrochen
      }
    }

    // Berechne längsten Streak: Durchlaufe alle Matchdays
    let longestStreak = player.longest_streak || 0;
    let tempStreak = 0;
    for (const matchday of allMatchdays) {
      if (matchdaysWithFastEntry.has(matchday.id)) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0; // Streak unterbrochen
      }
    }

    // Berechne Streak-Bonus (basierend auf Matchday-Streak, nicht Tages-Streak)
    streakBonus = calculateMatchdayStreakBonusPoints(currentStreak);

    // Aktualisiere Spieler-Daten
    await supabase
      .from('players_unified')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_entry_date: new Date(entryDate).toISOString().split('T')[0] // Nur Datum, keine Zeit
      })
      .eq('id', playerId);

    // Speichere Streak-Achievement wenn Bonus vorhanden
    if (streakBonus > 0) {
      try {
        await supabase
          .from('player_achievements')
          .insert({
            player_id: playerId,
            achievement_type: 'matchday_streak',
            points: streakBonus,
            badge_name: getMatchdayStreakBadge(currentStreak),
            matchday_id: matchdayId,
            created_at: new Date(entryDate).toISOString()
          });

        // Aktualisiere Gesamtpunkte
        await updatePlayerPoints(playerId, streakBonus);
      } catch (achievementError) {
        console.error('⚠️ Error saving streak achievement:', achievementError);
        // Nicht kritisch, weiter machen
      }
    }

    return { currentStreak, longestStreak, streakBonus };
  } catch (error) {
    console.error('❌ Error in updateMatchdayStreak:', error);
    return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
  }
}

/**
 * Hilfsfunktion: Lade alle Teams eines Spielers
 * @param {string} playerId - Player-ID
 * @returns {Promise<Array>} Array von Team-Objekten
 */
async function getPlayerTeams(playerId) {
  try {
    const { data: memberships, error } = await supabase
      .from('team_memberships')
      .select('team_id, team:team_info(id, club_name, team_name, category)')
      .eq('player_id', playerId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error loading player teams:', error);
      return [];
    }

    return (memberships || []).map(m => m.team).filter(Boolean);
  } catch (error) {
    console.error('❌ Error in getPlayerTeams:', error);
    return [];
  }
}

/**
 * Berechnet Matchday-Streak-Bonus-Punkte (NEU: basierend auf Matchdays, nicht Tagen)
 * @param {number} currentStreak - Aktueller Matchday-Streak
 * @returns {number} Bonus-Punkte
 */
function calculateMatchdayStreakBonusPoints(currentStreak) {
  // Matchday-Streak-Boni (angepasst für Medenspiele, die alle paar Wochen stattfinden)
  if (currentStreak >= 5) return 100; // 5+ aufeinanderfolgende Matchdays
  if (currentStreak >= 3) return 50;  // 3+ aufeinanderfolgende Matchdays
  if (currentStreak >= 2) return 20;  // 2+ aufeinanderfolgende Matchdays
  return 0;
}

/**
 * Gibt den Badge-Namen für einen Matchday-Streak zurück
 * @param {number} streak - Matchday-Streak-Länge
 * @returns {string}
 */
function getMatchdayStreakBadge(streak) {
  if (streak >= 5) return '💪 Matchday-Meister';
  if (streak >= 3) return '🔥 Matchday-Streak';
  if (streak >= 2) return '⭐ Matchday-King';
  return '🔥 Matchday-Streak';
}

/**
 * Berechnet Saison-Streak-Bonus basierend auf Prozentsatz der Matchdays mit schnellen Eingaben
 * Berücksichtigt unterschiedliche Matchday-Anzahlen pro Team (FAIRNESS)
 * @param {string} playerId - Player-ID
 * @param {string} matchdayId - Matchday-ID der aktuellen Eingabe
 * @returns {Promise<number>} Bonus-Punkte
 */
export async function calculateMatchdayStreakBonus(playerId, matchdayId) {
  try {
    // Lade alle Teams des Spielers
    const playerTeams = await getPlayerTeams(playerId);
    if (!playerTeams || playerTeams.length === 0) {
      return 0;
    }

    const teamIds = playerTeams.map(t => t.id);
    
    // Lade alle Matchdays für die Teams des Spielers in der aktuellen Saison
    const { data: currentMatchday } = await supabase
      .from('matchdays')
      .select('season')
      .eq('id', matchdayId)
      .single();

    if (!currentMatchday) {
      return 0;
    }

    const { data: allMatchdays, error: matchdaysError } = await supabase
      .from('matchdays')
      .select('id, match_date')
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .eq('season', currentMatchday.season)
      .order('match_date', { ascending: true });

    if (matchdaysError || !allMatchdays || allMatchdays.length === 0) {
      return 0;
    }

    // Lade alle schnellen Eingaben des Spielers in dieser Saison
    const { data: achievements, error: achievementsError } = await supabase
      .from('player_achievements')
      .select('matchday_id, points')
      .eq('player_id', playerId)
      .eq('achievement_type', 'speed_entry')
      .gte('points', 15) // Mindestens "Pünktlich"
      .not('matchday_id', 'is', null)
      .in('matchday_id', allMatchdays.map(m => m.id));

    if (achievementsError) {
      console.error('❌ Error loading achievements for season bonus:', achievementsError);
      return 0;
    }

    // Zähle Matchdays mit schnellen Eingaben
    const matchdaysWithFastEntry = new Set((achievements || []).map(a => a.matchday_id));
    matchdaysWithFastEntry.add(matchdayId); // Aktueller Matchday

    const totalMatchdays = allMatchdays.length;
    const fastEntryMatchdays = matchdaysWithFastEntry.size;
    const percentage = (fastEntryMatchdays / totalMatchdays) * 100;

    // Prüfe ob Bonus bereits vergeben wurde (nur einmal pro Saison)
    const { data: existingBonus } = await supabase
      .from('player_achievements')
      .select('id')
      .eq('player_id', playerId)
      .eq('achievement_type', 'season_matchday_bonus')
      .eq('matchday_id', matchdayId) // Verwende aktuellen Matchday als Marker
      .maybeSingle();

    if (existingBonus) {
      return 0; // Bonus bereits vergeben
    }

    let bonus = 0;
    let badgeName = null;

    // Saison-Boni basierend auf Prozentsatz (fair für alle Teams, unabhängig von Matchday-Anzahl)
    if (percentage >= 90) {
      bonus = 200;
      badgeName = '🏆 Saison-Meister';
    } else if (percentage >= 75) {
      bonus = 100;
      badgeName = '🥇 Saison-Star';
    } else if (percentage >= 60) {
      bonus = 50;
      badgeName = '⭐ Saison-Champion';
    } else if (percentage >= 50) {
      bonus = 25;
      badgeName = '🔥 Saison-Engagement';
    }

    if (bonus > 0) {
      // Speichere Saison-Bonus-Achievement
      await supabase
        .from('player_achievements')
        .insert({
          player_id: playerId,
          achievement_type: 'season_matchday_bonus',
          points: bonus,
          badge_name: badgeName,
          matchday_id: matchdayId,
          created_at: new Date().toISOString()
        });

      // Aktualisiere Gesamtpunkte
      await updatePlayerPoints(playerId, bonus);
      
      console.log(`✅ Saison-Bonus vergeben: ${percentage.toFixed(1)}% (${fastEntryMatchdays}/${totalMatchdays} Matchdays) = ${bonus} Punkte`);
    }

    return bonus;
  } catch (error) {
    console.error('❌ Error in calculateMatchdayStreakBonus:', error);
    return 0;
  }
}

/**
 * Prüft ob alle Ergebnisse eines Matchdays schnell eingegeben wurden und vergibt Team-Bonus
 * @param {string} matchdayId - Matchday-ID
 * @param {Date} entryDate - Datum der letzten Eingabe
 * @returns {Promise<number>} Team-Bonus-Punkte (0 wenn nicht alle schnell eingegeben wurden)
 */
export async function checkTeamBonus(matchdayId, entryDate) {
  try {
    // Lade alle Match-Ergebnisse für diesen Matchday
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('id, status, entered_at, gamification_points')
      .eq('matchday_id', matchdayId);

    if (resultsError || !results) {
      console.error('❌ Error loading match results for team bonus:', resultsError);
      return 0;
    }

    // Prüfe ob alle 6 Ergebnisse vorhanden und abgeschlossen sind
    const completedResults = results.filter(r => 
      ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'].includes(r.status)
    );

    if (completedResults.length < 6) {
      return 0; // Nicht alle Ergebnisse vorhanden
    }

    // Lade Matchday-Daten für Spielstart
    const { data: matchday, error: matchdayError } = await supabase
      .from('matchdays')
      .select('match_date, start_time')
      .eq('id', matchdayId)
      .single();

    if (matchdayError || !matchday) {
      console.error('❌ Error loading matchday for team bonus:', matchdayError);
      return 0;
    }

    // Berechne erwartetes Ende (Doppel dauern am längsten: 3.5h)
    const matchStart = new Date(matchday.match_date);
    if (matchday.start_time) {
      const [hours, minutes] = matchday.start_time.split(':').map(Number);
      matchStart.setHours(hours, minutes, 0, 0);
    }
    const expectedEndTime = new Date(matchStart.getTime() + 3.5 * 60 * 60 * 1000); // Doppel: 3.5h

    // Prüfe ob alle Ergebnisse innerhalb von 2 Stunden nach erwartetem Ende eingegeben wurden
    const allQuickEntries = completedResults.every(result => {
      if (!result.entered_at) return false;
      const enteredAt = new Date(result.entered_at);
      const timeDiffMinutes = (enteredAt - expectedEndTime) / (1000 * 60);
      return timeDiffMinutes <= 120; // Innerhalb von 2 Stunden
    });

    if (!allQuickEntries) {
      return 0; // Nicht alle schnell eingegeben
    }

    // Prüfe ob Team-Bonus bereits vergeben wurde
    const { data: existingBonus } = await supabase
      .from('player_achievements')
      .select('id')
      .eq('matchday_id', matchdayId)
      .eq('achievement_type', 'team_bonus')
      .maybeSingle();

    if (existingBonus) {
      return 0; // Bonus bereits vergeben
    }

    // Lade alle Spieler, die Ergebnisse für diesen Matchday eingegeben haben
    const enteredByUserIds = [...new Set(completedResults.map(r => r.entered_by).filter(Boolean))];
    
    if (enteredByUserIds.length === 0) {
      return 0;
    }

    // Hole Player-IDs für alle User-IDs
    const { data: players, error: playersError } = await supabase
      .from('players_unified')
      .select('id, user_id')
      .in('user_id', enteredByUserIds);

    if (playersError || !players) {
      console.error('❌ Error loading players for team bonus:', playersError);
      return 0;
    }

    const playerIds = players.map(p => p.id);
    const teamBonus = 25; // 25 Punkte pro Spieler

    // Vergebe Team-Bonus an alle Spieler, die Ergebnisse eingegeben haben
    for (const playerId of playerIds) {
      try {
        await supabase
          .from('player_achievements')
          .insert({
            player_id: playerId,
            achievement_type: 'team_bonus',
            points: teamBonus,
            badge_name: '🏆 Team-Spirit',
            matchday_id: matchdayId,
            created_at: entryDate.toISOString()
          });

        // Aktualisiere Gesamtpunkte
        await updatePlayerPoints(playerId, teamBonus);
      } catch (bonusError) {
        console.error(`⚠️ Error giving team bonus to player ${playerId}:`, bonusError);
        // Nicht kritisch, weiter machen
      }
    }

    console.log(`✅ Team-Bonus vergeben: ${playerIds.length} Spieler erhalten je ${teamBonus} Punkte`);
    return teamBonus;
  } catch (error) {
    console.error('❌ Error in checkTeamBonus:', error);
    return 0;
  }
}

