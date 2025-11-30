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

    // 🔥 STREAK: Aktualisiere Streak nach Achievement
    if (achievementType === 'speed_entry' && points > 0) {
      const streakResult = await updateStreak(playerId, expectedEndTime || new Date());
      
      // Berechne Wochen-Streak-Bonus
      const weeklyBonus = await calculateWeeklyStreakBonus(playerId, expectedEndTime || new Date());
      
      // Füge Streak-Bonus zu den Punkten hinzu (wird bereits in updateStreak gespeichert)
      if (streakResult.streakBonus > 0 || weeklyBonus > 0) {
        console.log(`🔥 Streak-Bonus: ${streakResult.streakBonus} (Tages-Streak: ${streakResult.currentStreak}), Wochen-Bonus: ${weeklyBonus}`);
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
 * Aktualisiert den Streak eines Spielers
 * @param {string} playerId - Player-ID
 * @param {Date} entryDate - Datum der Eingabe
 * @returns {Promise<Object>} { currentStreak, longestStreak, streakBonus }
 */
export async function updateStreak(playerId, entryDate) {
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

    const entryDateObj = new Date(entryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDateOnly = new Date(entryDateObj);
    entryDateOnly.setHours(0, 0, 0, 0);

    let currentStreak = player.current_streak || 0;
    let longestStreak = player.longest_streak || 0;
    let streakBonus = 0;

    // Prüfe ob letzter Eintrag vorhanden
    if (player.last_entry_date) {
      const lastEntryDate = new Date(player.last_entry_date);
      lastEntryDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((entryDateOnly - lastEntryDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Gleicher Tag: Streak bleibt gleich (keine Änderung)
        return { currentStreak, longestStreak, streakBonus: 0 };
      } else if (daysDiff === 1) {
        // Gestern: Streak wird fortgesetzt
        currentStreak = (currentStreak || 0) + 1;
      } else {
        // Mehr als 1 Tag Unterschied: Streak wird zurückgesetzt
        currentStreak = 1;
      }
    } else {
      // Erster Eintrag: Streak startet bei 1
      currentStreak = 1;
    }

    // Aktualisiere längsten Streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Berechne Streak-Bonus
    streakBonus = calculateStreakBonus(currentStreak);

    // Aktualisiere Spieler-Daten
    await supabase
      .from('players_unified')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_entry_date: entryDateOnly.toISOString().split('T')[0] // Nur Datum, keine Zeit
      })
      .eq('id', playerId);

    // Speichere Streak-Achievement wenn Bonus vorhanden
    if (streakBonus > 0) {
      try {
        await supabase
          .from('player_achievements')
          .insert({
            player_id: playerId,
            achievement_type: 'streak',
            points: streakBonus,
            badge_name: getStreakBadge(currentStreak),
            created_at: entryDateObj.toISOString()
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
    console.error('❌ Error in updateStreak:', error);
    return { currentStreak: 0, longestStreak: 0, streakBonus: 0 };
  }
}

/**
 * Berechnet Streak-Bonus-Punkte
 * @param {number} currentStreak - Aktueller Streak
 * @returns {number} Bonus-Punkte
 */
function calculateStreakBonus(currentStreak) {
  // Wochen-Streak (7 Tage)
  if (currentStreak === 7) return 100;
  // Monats-Streak (30 Tage)
  if (currentStreak === 30) return 500;
  // Tägliche Streak-Boni (jeden 5. Tag)
  if (currentStreak > 0 && currentStreak % 5 === 0) {
    return 20; // +20 Punkte alle 5 Tage
  }
  return 0;
}

/**
 * Gibt den Badge-Namen für einen Streak zurück
 * @param {number} streak - Streak-Länge
 * @returns {string}
 */
function getStreakBadge(streak) {
  if (streak >= 30) return '💪 Eisen-Wille';
  if (streak >= 7) return '🔥 Hot Streak';
  if (streak >= 5) return '⭐ Streak-King';
  return '🔥 Streak';
}

/**
 * Berechnet Wochen-Streak-Bonus (3+, 5+, 7+ schnelle Eingaben in einer Woche)
 * @param {string} playerId - Player-ID
 * @param {Date} entryDate - Datum der Eingabe
 * @returns {Promise<number>} Bonus-Punkte
 */
export async function calculateWeeklyStreakBonus(playerId, entryDate) {
  try {
    const entryDateObj = new Date(entryDate);
    const weekStart = new Date(entryDateObj);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sonntag
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Zähle schnelle Eingaben diese Woche (nur speed_entry, keine progress_entry)
    const { data: achievements, error } = await supabase
      .from('player_achievements')
      .select('id, points, created_at')
      .eq('player_id', playerId)
      .eq('achievement_type', 'speed_entry')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString());

    if (error) {
      console.error('❌ Error loading weekly achievements:', error);
      return 0;
    }

    const fastEntries = (achievements || []).filter(a => a.points >= 15); // Mindestens "Pünktlich"
    const count = fastEntries.length;

    // Prüfe ob Bonus bereits vergeben wurde
    const { data: existingBonus } = await supabase
      .from('player_achievements')
      .select('id')
      .eq('player_id', playerId)
      .eq('achievement_type', 'weekly_streak')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .maybeSingle();

    if (existingBonus) {
      return 0; // Bonus bereits vergeben
    }

    let bonus = 0;
    let badgeName = null;

    if (count >= 7) {
      bonus = 100;
      badgeName = '🏅 Wochen-Champion';
    } else if (count >= 5) {
      bonus = 50;
      badgeName = '⭐ Wochen-Star';
    } else if (count >= 3) {
      bonus = 20;
      badgeName = '🔥 Wochen-Streak';
    }

    if (bonus > 0) {
      // Speichere Wochen-Streak-Achievement
      await supabase
        .from('player_achievements')
        .insert({
          player_id: playerId,
          achievement_type: 'weekly_streak',
          points: bonus,
          badge_name: badgeName,
          created_at: entryDateObj.toISOString()
        });

      // Aktualisiere Gesamtpunkte
      await updatePlayerPoints(playerId, bonus);
    }

    return bonus;
  } catch (error) {
    console.error('❌ Error in calculateWeeklyStreakBonus:', error);
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

