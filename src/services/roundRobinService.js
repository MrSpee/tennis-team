/**
 * ============================================================================
 * ROUND-ROBIN SERVICE
 * ============================================================================
 * Intelligente Platzvergabe für Tennis-Trainings mit Prioritäts-Berechnung
 * 
 * Features:
 * - Prioritäts-Score Berechnung basierend auf Teilnahme-Quote
 * - Automatische Wartelisten-Verwaltung
 * - Prio-Training Bonus
 * - Seeded Random für faire Rotation
 * - VERBESSERUNG: Round-Robin mit faire Rotation pro Spieler
 * ============================================================================
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Seeded Random Generator
 * Generiert reproduzierbare Pseudo-Zufallszahlen basierend auf einem Seed
 * 
 * @param {string|number} seed - Seed für Zufallsgenerator
 * @returns {number} - Zufallszahl zwischen 0 und 1
 */
export const seededRandom = (seed) => {
  const numericSeed = typeof seed === 'string' 
    ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : seed;
  
  const x = Math.sin(numericSeed) * 10000;
  return x - Math.floor(x);
};

/**
 * Berechne Spieler-Priorität für Training (FAIR ROUND-ROBIN SYSTEM)
 * 
 * Formel (V8 - Mit Absagen-Berücksichtigung):
 * - ROUND-ROBIN CORE: Tage seit letzter Teilnahme (HÖCHSTE Priorität)
 * - ABSAGEN-BONUS: Höhere Priorität bei Absagen (verhindert mehrfaches Aussetzen)
 *   * Konsekutive Absagen: +10 bis +50 (je nach Anzahl)
 *   * Letzte Antwort war Absage: +15
 *   * Gesamt-Absagen: +5 bis +20 (geringeres Gewicht)
 *   * Wartelisten-Bonus: +20
 * - Zufallsfaktor für faire Rotation bei Gleichstand: +0 bis +5
 * 
 * WICHTIG: 
 * - Ein Spieler kann NICHT 2x hintereinander aussetzen wenn Round-Robin aktiv ist
 * - Bei 5 Spielern und 4 Plätzen rotiert automatisch wer aussetzen muss
 * - Spieler mit vielen Absagen bekommen automatisch höhere Priorität
 * 
 * @param {string} playerId - Player UUID
 * @param {object} training - Training Session Objekt
 * @param {array} allPlayers - Array aller Spieler mit training_stats
 * @returns {object} - { priority: number, player: object }
 */
export const calculatePlayerPriority = (playerId, training, allPlayers) => {
  const player = allPlayers.find(p => p.id === playerId);
  
  if (!player) {
    return {
      priority: 0,
      player: null,
      breakdown: {
        daysSinceLastTraining: 0,
        declineBonus: 0,
        randomFactor: 0
      }
    };
  }

  const stats = player.training_stats || {
    total_attended: 0,
    total_declined: 0,
    last_attended: null,
    last_response: null,
    consecutive_declines: 0
  };

  let priority = 0;
  const breakdown = { daysSinceLastTraining: 0, declineBonus: 0, randomFactor: 0 };

  // ============================================================================
  // 1. ROUND-ROBIN CORE: Tage seit letzter Teilnahme (HÖCHSTE Priorität)
  // ============================================================================
  // ANTI-AUSSETZ-BONUS: Wer gerade ausgesetzt hat, bekommt BONUS
  // Ein Spieler darf NICHT 2x hintereinander aussetzen
  let daysSinceLastTraining = 0;
  
  if (stats.last_attended) {
    const lastAttended = new Date(stats.last_attended);
    daysSinceLastTraining = (Date.now() - lastAttended.getTime()) / (1000 * 60 * 60 * 24);
  } else {
    // Fallback: Nie dabei → Sehr hohe Priorität
    daysSinceLastTraining = 1000;
  }
  
  // WICHTIG: Anti-Aussetz-Bonus
  // Wenn jemand beim letzten Training ausgesetzt hat (nicht dabei war), 
  // bekommt er einen BONUS damit er nicht wieder aussetzen muss
  
  // Berechne Grundpriorität basierend auf Tagen seit letzter Teilnahme
  // KEIN Bonu für "nie dabei" - nur Wartelisten-Bonus zählt!
  priority += daysSinceLastTraining;
  breakdown.daysSinceLastTraining = daysSinceLastTraining;
  
  // ============================================================================
  // 2. ABSAGEN-BONUS: Anti-Aussetz-Schutz + Bonus
  // ============================================================================
  // WICHTIG: ANTI-AUSSETZ-SCHUTZ
  // Spieler, die oft abgesagt haben, bekommen BONUS damit sie nicht immer aussetzen müssen
  let declineBonus = 0;
  
  // A) KONSEKUTIVE ABSAGEN: Höchster Bonus für Spieler die mehrfach hintereinander abgesagt haben
  // Je mehr hintereinander abgesagt, desto höher der Bonus (max. +50)
  if (stats.consecutive_declines > 0) {
    // Exponentieller Bonus: 1x abgesagt = +10, 2x = +25, 3x = +40, 4x+ = +50
    const consecutiveBonus = Math.min(10 + (stats.consecutive_declines - 1) * 15, 50);
    declineBonus += consecutiveBonus;
    console.log(`✅ Konsekutive Absagen-Bonus: ${stats.consecutive_declines}x hintereinander → Bonus +${consecutiveBonus}`);
  }
  
  // B) LETZTE ANTWORT WAR ABSAGE: Bonus wenn beim letzten Training abgesagt wurde
  // Verhindert, dass jemand 2x hintereinander aussetzen muss
  if (stats.last_response === 'declined') {
    declineBonus += 15; // +15 Bonus für letzte Absage
    console.log('✅ Letzte Absage-Bonus: letzte Antwort war "declined" → Bonus +15');
  }
  
  // C) GESAMT-ABSAGEN: Bonus basierend auf Gesamtzahl der Absagen (geringeres Gewicht)
  // Spieler mit vielen Absagen bekommen einen kleinen Bonus (max. +20)
  if (stats.total_declined > 0) {
    // Linearer Bonus: 1-2 Absagen = +5, 3-4 = +10, 5-6 = +15, 7+ = +20
    const totalDeclinedBonus = Math.min(5 + Math.floor(stats.total_declined / 2) * 5, 20);
    declineBonus += totalDeclinedBonus;
    console.log(`✅ Gesamt-Absagen-Bonus: ${stats.total_declined}x insgesamt → Bonus +${totalDeclinedBonus}`);
  }
  
  // D) WARTELISTEN-BONUS: Wer auf Warteliste gestanden hat, bekommt realistischen Bonus
  // Nur was_on_waitlist = true → Bonus (nicht declined!)
  if (stats.was_on_waitlist) {
    declineBonus += 20; // +20 = realistischer Bonus
    console.log('✅ Wartelisten-Bonus: war auf Warteliste → Bonus +20');
  }
  
  priority += declineBonus;
  breakdown.declineBonus = declineBonus;
  
  console.log('🔍 Final priority breakdown:', {
    playerId,
    playerName: player?.name,
    daysSinceLastTraining: daysSinceLastTraining.toFixed(2),
    consecutiveDeclines: stats.consecutive_declines,
    totalDeclined: stats.total_declined,
    lastResponse: stats.last_response,
    wasOnWaitlist: stats.was_on_waitlist,
    declineBonus,
    randomFactor: breakdown.randomFactor.toFixed(2),
    finalPriority: priority.toFixed(2)
  });

  // ============================================================================
  // 3. ZUFALLSFAKTOR für faire Rotation bei Gleichstand
  // ============================================================================
  const seed = training.round_robin_seed || Date.now();
  const randomFactor = seededRandom(playerId + seed.toString());
  priority += randomFactor * 5; // +0 bis +5 Zufallsfaktor
  breakdown.randomFactor = randomFactor * 5;

  return {
    priority: priority,
    player: player,
    breakdown: breakdown
  };
};

/**
 * Berechne wer spielen kann und wer auf Warteliste ist
 * 
 * WICHTIG: Bei Round-Robin bekommt automatisch der Spieler mit LÄNGSTER Pause
 * die höchste Priorität. Dadurch rotiert automatisch wer aussetzt.
 * 
 * @param {object} training - Training Session mit attendance Array
 * @param {array} allPlayers - Array aller Spieler mit training_stats
 * @returns {object} - { canPlay: array, waitlist: array, isOverbooked: boolean }
 */
export const calculateTrainingParticipants = (training, allPlayers) => {
  // Stelle sicher, dass attendance ein Array ist
  const attendance = training.attendance || [];
  
  // Wenn Round-Robin deaktiviert: Normal FCFS (First Come First Serve)
  if (!training.round_robin_enabled) {
    const confirmed = attendance.filter(a => a.status === 'confirmed');
    return {
      canPlay: confirmed.map(a => ({ ...a, stars: 0, position: 0 })),
      waitlist: [],
      isOverbooked: confirmed.length > training.max_players
    };
  }

  // Round-Robin aktiviert - FAIR ROTATION SYSTEM mit Anti-Aussetz-Schutz
  const confirmed = attendance
    .filter(a => a.status === 'confirmed')
    .map(a => {
      const priorityData = calculatePlayerPriority(a.player_id, training, allPlayers);
      return {
        ...a,
        priority: priorityData.priority,
        player: priorityData.player,
        priorityBreakdown: priorityData.breakdown
      };
    });

  const maxPlayers = training.max_players;

  // Sortiere nach Priorität (höchste zuerst)
  // HÖCHSTE Priorität = Wer am längsten nicht da war
  const sorted = confirmed.sort((a, b) => b.priority - a.priority);

  // Setze Positionen basierend auf sortierter Reihenfolge
  sorted.forEach((player, index) => {
    player.position = index + 1;
  });

  // Teile auf: Spieler vs. Warteliste
  // Die ersten N Spieler (mit HÖCHSTER Priorität = längste Pause) bekommen Platz
  // Die restlichen kommen auf Warteliste
  const canPlay = sorted.slice(0, maxPlayers);
  const waitlist = sorted.slice(maxPlayers);

  return {
    canPlay,
    waitlist,
    isOverbooked: confirmed.length > maxPlayers,
    ranking: sorted // Vollständige Rangliste für UI
  };
};

/**
 * Update Spieler-Statistiken nach Zu-/Absage
 * 
 * @param {string} playerId - Player UUID
 * @param {string} status - 'confirmed' oder 'declined'
 * @returns {Promise<void>}
 */
export const updatePlayerStats = async (playerId, status) => {
  try {
    // Hole aktuelle Statistiken (mit Fallback falls Spalte nicht existiert)
    const { data: player, error: fetchError } = await supabase
      .from('players_unified')
      .select('training_stats')
      .eq('id', playerId)
      .single();

    // Wenn Spalte nicht existiert, ignoriere den Fehler (wird vom Trigger gehandhabt)
    if (fetchError && fetchError.code !== '42703') { // 42703 = column does not exist
      console.error('❌ Error fetching player stats:', fetchError);
      return;
    }

    // Nur updaten, wenn Spalte existiert
    if (fetchError && fetchError.code === '42703') {
      console.warn('⚠️ training_stats column does not exist, skipping update');
      return;
    }

    let stats = player?.training_stats || {
      total_invites: 0,
      total_attended: 0,
      total_declined: 0,
      attendance_rate: 0.0,
      last_attended: null,
      consecutive_declines: 0
    };

    // Update Statistiken
    if (status === 'confirmed') {
      stats.total_attended += 1;
      stats.consecutive_declines = 0;
      stats.last_attended = new Date().toISOString();
    } else if (status === 'declined') {
      stats.total_declined += 1;
      stats.consecutive_declines = (stats.consecutive_declines || 0) + 1;
    }

    // Teilnahme-Quote neu berechnen
    const total = stats.total_attended + stats.total_declined;
    stats.attendance_rate = total > 0 ? stats.total_attended / total : 0.0;
    stats.total_invites = total;

    // Speichere in DB
    const { error: updateError } = await supabase
      .from('players_unified')
      .update({ training_stats: stats })
      .eq('id', playerId);

    if (updateError) {
      // Ignoriere Fehler wenn Spalte nicht existiert
      if (updateError.code === '42703') {
        console.warn('⚠️ training_stats column does not exist, skipping update');
        return;
      }
      console.error('❌ Error updating player stats:', updateError);
    } else {
      console.log(`✅ Stats updated for player ${playerId}:`, {
        attendance_rate: (stats.attendance_rate * 100).toFixed(1) + '%',
        total_attended: stats.total_attended,
        total_declined: stats.total_declined
      });
    }
  } catch (error) {
    console.error('❌ Fatal error updating player stats:', error);
  }
};

/**
 * Konsistente Berechnung von training_stats für einen Spieler
 * WIRD VON ALLEN KOMPONENTEN VERWENDET
 * 
 * @param {object} player - Spieler
 * @param {array} attendanceData - Array von {player_id, status, training_date}
 * @returns {object} - training_stats für diesen Spieler
 */
export const calculateTrainingStats = (player, attendanceData) => {
  // Filtere nur relevante Attendance für diesen Spieler
  const playerAttendance = attendanceData.filter(a => a.player_id === player.id);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // SAISONSTART: Nur Trainings ab 18.10.2025 berücksichtigen
  const seasonStart = new Date('2025-10-18');
  seasonStart.setHours(0, 0, 0, 0);
  
  // 1. Total attended: Nur confirmed Trainings in der Vergangenheit UND nach Saisonstart
  const pastConfirmed = playerAttendance.filter(a => {
    if (a.status !== 'confirmed') return false;
    if (!a.training_date) return false;
    const trainingDate = new Date(a.training_date);
    trainingDate.setHours(0, 0, 0, 0);
    return trainingDate < today && trainingDate >= seasonStart;
  });
  
  const total_attended = pastConfirmed.length;
  
  // 2. Total declined: Nur declined Trainings in der Vergangenheit UND nach Saisonstart
  const pastDeclined = playerAttendance.filter(a => {
    if (a.status !== 'declined') return false;
    if (!a.training_date) return false;
    const trainingDate = new Date(a.training_date);
    trainingDate.setHours(0, 0, 0, 0);
    return trainingDate < today && trainingDate >= seasonStart;
  });
  
  const total_declined = pastDeclined.length;
  
  // 3. LAST ATTENDED: Neuestes confirmed Training in der Vergangenheit
  const pastConfirmedSorted = pastConfirmed
    .filter(a => a.training_date)
    .sort((a, b) => {
      const dateA = new Date(a.training_date);
      const dateB = new Date(b.training_date);
      return dateB - dateA; // Neuestes zuerst
    });
  
  let last_attended = pastConfirmedSorted.length > 0 ? pastConfirmedSorted[0].training_date : null;
  
  // FALLBACK: Wenn nie dabei, nutze Saisonstart als Referenz
  if (!last_attended) {
    last_attended = seasonStart.toISOString();
  }
  
  // 4. Letzte Antwort (sortiert nach Training-Datum) - nur vergangene Trainings NACH Saisonstart!
  const pastAttendance = playerAttendance
    .filter(a => {
      if (!a.training_date) return false;
      const trainingDate = new Date(a.training_date);
      trainingDate.setHours(0, 0, 0, 0);
      return trainingDate < today && trainingDate >= seasonStart;
    })
    .sort((a, b) => {
      const dateA = new Date(a.training_date);
      const dateB = new Date(b.training_date);
      return dateB - dateA; // Neuestes zuerst
    });
  
  // 5. Berechne consecutive_declines - nur vergangene Trainings NACH Saisonstart!
  let consecutive_declines = 0;
  for (const response of pastAttendance) {
    if (response.status === 'declined') {
      consecutive_declines++;
    } else {
      break;
    }
  }
  
  // 6. ZUKÜNFTIGE Absagen: Zähle sie, aber mit geringerem Gewicht
  const futureAttendance = playerAttendance.filter(a => {
    if (!a.training_date) return false;
    const trainingDate = new Date(a.training_date);
    trainingDate.setHours(0, 0, 0, 0);
    return trainingDate >= today && trainingDate >= seasonStart;
  });
  
  const future_declined = futureAttendance.filter(a => a.status === 'declined').length;
  
  // 7. WICHTIG: ANTI-AUSSETZ-SCHUTZ - Berücksichtige auch zukünftige consecutive_declines
  // Wenn jemand für ein zukünftiges Training bereits abgesagt hat, 
  // zählt das als "ausgesetzt" für die Berechnung
  const futureDeclinedSorted = futureAttendance
    .filter(a => a.status === 'declined')
    .sort((a, b) => {
      const dateA = new Date(a.training_date);
      const dateB = new Date(b.training_date);
      return dateA - dateB; // Frühestes zuerst
    });
  
  // Wenn es zukünftige Absagen gibt, füge sie zu consecutive_declines hinzu
  // ABER: Nur wenn die letzten vergangenen Antworten auch Absagen waren
  if (futureDeclinedSorted.length > 0 && consecutive_declines > 0) {
    // Spieler hat vergangene UND zukünftige Absagen hintereinander
    consecutive_declines += futureDeclinedSorted.length;
  } else if (futureDeclinedSorted.length > 0) {
    // Spieler hat nur zukünftige Absagen (noch nie da gewesen oder gerade dabei gewesen)
    // Zähle nur die ersten zukünftigen Absagen
    consecutive_declines = futureDeclinedSorted.length;
  }
  
  // 8. Letzte Antwort: Berücksichtige AUCH zukünftige Antworten
  let last_response = pastAttendance.length > 0 ? pastAttendance[0].status : null;
  
  // WICHTIG: last_response soll NUR vergangene Antworten berücksichtigen
  // Zukünftige Antworten werden separat in future_declined behandelt
  // Das verhindert falsche Bonus-Punkte für Spieler die noch nie ausgesetzt haben
  
  // Gewichtung: Vergangene Absagen haben 5x mehr Gewicht als zukünftige
  // Wenn jemand in der Zukunft absagt, wird das mit +10/+5/+2 berücksichtigt statt +50/+25/+15
  const total_declined_weighted = total_declined + (future_declined * 0.2);
  
  // 9. WAR AUF WARTELISTE: Prüfe ob Spieler beim letzten Training auf Warteliste war
  let was_on_waitlist = false;
  if (pastAttendance.length > 0) {
    const lastResponse = pastAttendance[0];
    // Wenn Spieler confirmed war aber position > max_players, war er auf Warteliste
    // Wir müssen das aus training-attendance Daten herausbekommen
    // ZEITWEILIG: Nutze future_declined als Indikator
    was_on_waitlist = lastResponse.status === 'confirmed' && lastResponse.waitlist_position !== null;
  }
  
  return {
    total_attended,
    total_declined,
    future_declined, // NEU: Für Anzeige
    total_declined_weighted, // Für Berechnung mit Gewichtung
    last_attended,
    last_response,
    consecutive_declines,
    was_on_waitlist // NEU: War Spieler auf Warteliste?
  };
};

/**
 * Automatisches Nachrücken von Warteliste
 * 
 * @param {object} training - Training Session
 * @param {array} allPlayers - Array aller Spieler
 * @returns {Promise<object|null>} - Nachgerückter Spieler oder null
 */
export const handleAutoPromotion = async (training, allPlayers) => {
  try {
    // Berechne neue Teilnehmer-Liste
    const { waitlist } = calculateTrainingParticipants(training, allPlayers);

    if (waitlist.length === 0) {
      console.log('ℹ️ No one on waitlist to promote');
      return null;
    }

    // Erster auf Warteliste
    const nextPlayer = waitlist[0];
    const nextPlayerData = allPlayers.find(p => p.id === nextPlayer.player_id);

    console.log(`🔔 Auto-promoting ${nextPlayerData?.name} from waitlist (Position 1)`);

    // Markiere als "auto-promoted" in DB
    const { error } = await supabase
      .from('training_attendance')
      .update({
        auto_promoted_at: new Date().toISOString(),
        waitlist_position: null,
        priority_score: nextPlayer.priority
      })
      .eq('id', nextPlayer.id);

    if (error) {
      console.error('❌ Error auto-promoting player:', error);
      return null;
    }

    console.log(`✅ ${nextPlayerData?.name} successfully promoted from waitlist`);

    // TODO: Push-Benachrichtigung oder Email senden
    // await sendPromotionNotification(nextPlayer.player_id, training);

    return {
      playerId: nextPlayer.player_id,
      playerName: nextPlayerData?.name,
      previousPosition: 1
    };

  } catch (error) {
    console.error('❌ Fatal error in auto-promotion:', error);
    return null;
  }
};

/**
 * Speichere Prioritäts-Scores in DB (für Transparenz)
 * 
 * @param {string} sessionId - Training Session UUID
 * @param {array} participants - Array von { player_id, priority, breakdown }
 * @returns {Promise<void>}
 */
export const savePriorityScores = async (sessionId, participants) => {
  try {
    const updates = participants.map(p => ({
      session_id: sessionId,
      player_id: p.player_id,
      priority_score: p.priority,
      priority_reason: JSON.stringify(p.priorityBreakdown)
    }));

    // Bulk update
    for (const update of updates) {
      await supabase
        .from('training_attendance')
        .update({
          priority_score: update.priority_score,
          priority_reason: update.priority_reason
        })
        .eq('session_id', update.session_id)
        .eq('player_id', update.player_id);
    }

    console.log(`✅ Priority scores saved for ${updates.length} participants`);
  } catch (error) {
    console.error('❌ Error saving priority scores:', error);
  }
};

/**
 * Lade Spieler mit Statistiken
 * 
 * @returns {Promise<array>} - Array von Spielern mit training_stats
 */
export const loadPlayersWithStats = async () => {
  try {
    // Hole Spieler ohne training_stats (existiert nicht in players_unified)
    const { data, error } = await supabase
      .from('players_unified')
      .select('id, name, email, current_lk, status')
      .in('status', ['active', 'pending']);

    if (error) {
      console.error('❌ Error loading players with stats:', error);
      return [];
    }

    // Füge leeres training_stats Objekt hinzu (existiert nicht in players_unified)
    return (data || []).map(player => ({
      ...player,
      training_stats: {}
    }));
  } catch (error) {
    console.error('❌ Fatal error loading players:', error);
    return [];
  }
};

/**
 * Export als Service-Objekt
 */
export const RoundRobinService = {
  calculateTrainingStats,
  seededRandom,
  calculatePlayerPriority,
  calculateTrainingParticipants,
  updatePlayerStats,
  handleAutoPromotion,
  savePriorityScores,
  loadPlayersWithStats
};

export default RoundRobinService;

