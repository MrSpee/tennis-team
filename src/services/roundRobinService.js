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
 * Berechne Spieler-Priorität für Training (COMPACT RANKING SYSTEM)
 * 
 * Neue Formel (V6):
 * - Einfache Prioritäts-Punkte für Rangliste
 * - Round-Robin: Tage seit letzter Teilnahme
 * - Absagen-Bonus: Mehrfache/kürzliche Absagen
 * - Zufallsfaktor für faire Rotation
 * 
 * @param {string} playerId - Player UUID
 * @param {object} training - Training Session Objekt
 * @param {array} allPlayers - Array aller Spieler mit training_stats
 * @returns {object} - { priority: number, player: object }
 */
export const calculatePlayerPriority = (playerId, training, allPlayers) => {
  const player = allPlayers.find(p => p.id === playerId);
  
  if (!player) {
    // Nur debug-logs wenn notwendig (stumme Behandlung für fehlende Spieler)
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

  // 1. ROUND-ROBIN: Tage seit letzter Teilnahme (höher = bessere Priorität)
  if (stats.last_attended) {
    const lastAttended = new Date(stats.last_attended);
    const daysSinceLastTraining = (Date.now() - lastAttended.getTime()) / (1000 * 60 * 60 * 24);
    priority += daysSinceLastTraining; // Mehr Tage = höhere Priorität
    breakdown.daysSinceLastTraining = daysSinceLastTraining;
  } else {
    // Noch nie gespielt = maximale Priorität
    priority += 1000;
    breakdown.daysSinceLastTraining = 1000;
  }

  // 2. ABSAGEN-BONUS: Mehrfache/kürzliche Absagen
  let declineBonus = 0;
  if (stats.consecutive_declines >= 2) {
    declineBonus = 50; // +50 für mehrfache Absagen hintereinander
  } else if (stats.last_response === 'declined') {
    declineBonus = 25; // +25 für letzte Absage
  } else if (stats.total_declined > 0 && stats.total_declined / (stats.total_attended + stats.total_declined) > 0.5) {
    declineBonus = 15; // +15 für hohe Absagen-Quote
  }
  priority += declineBonus;
  breakdown.declineBonus = declineBonus;

  // 3. ZUFALLSFAKTOR für faire Rotation bei Gleichstand
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

  // Round-Robin aktiviert - COMPACT RANKING SYSTEM
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
  const sorted = confirmed.sort((a, b) => b.priority - a.priority);

  // Setze Positionen basierend auf sortierter Reihenfolge
  sorted.forEach((player, index) => {
    player.position = index + 1;
  });

  // Teile auf: Spieler vs. Warteliste
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
    // Hole aktuelle Statistiken
    const { data: player, error: fetchError } = await supabase
      .from('players_unified')
      .select('training_stats')
      .eq('id', playerId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching player stats:', fetchError);
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
  seededRandom,
  calculatePlayerPriority,
  calculateTrainingParticipants,
  updatePlayerStats,
  handleAutoPromotion,
  savePriorityScores,
  loadPlayersWithStats
};

export default RoundRobinService;

