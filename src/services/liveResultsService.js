import { supabase } from '../lib/supabaseClient';

// ========================================
// OPPONENT PLAYERS SERVICE
// ========================================

/**
 * Lädt alle Gegner-Spieler für eine bestimmte Mannschaft
 * @param {string} teamName - Name der gegnerischen Mannschaft
 * @param {string} season - Saison (z.B. "2024/25")
 * @returns {Promise<Array>} Array der Gegner-Spieler
 */
export const getOpponentPlayers = async (teamName, season = '2024/25') => {
  try {
    console.log('🔍 Loading opponent players for team:', teamName);
    
    // Erst das Team finden
    const { data: teamData, error: teamError } = await supabase
      .from('opponent_teams')
      .select('id, name')
      .ilike('name', `%${teamName}%`)
      .single();

    if (teamError || !teamData) {
      console.error('❌ Team not found:', teamError);
      console.log('🔍 Available teams:');
      const { data: allTeams } = await supabase.from('opponent_teams').select('name');
      console.log(allTeams);
      throw new Error(`Team "${teamName}" nicht gefunden`);
    }

    console.log('✅ Found team:', teamData);

    // Dann die Spieler laden
    const { data: playersData, error: playersError } = await supabase
      .from('opponent_players')
      .select('*')
      .eq('team_id', teamData.id)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (playersError) {
      console.error('❌ Error loading players:', playersError);
      throw playersError;
    }

    console.log('✅ Loaded players:', playersData?.length || 0);
    return playersData || [];
  } catch (error) {
    console.error('❌ Error in getOpponentPlayers:', error);
    throw error;
  }
};

/**
 * Lädt alle verfügbaren Gegner-Teams
 * @param {string} season - Saison (z.B. "2024/25")
 * @returns {Promise<Array>} Array der Team-Namen
 */
export const getOpponentTeams = async (season = '2024/25') => {
  try {
    const { data, error } = await supabase
      .from('opponent_teams')
      .select('id, name, tvm_id')
      .eq('season', season)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading opponent teams:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOpponentTeams:', error);
    throw error;
  }
};

/**
 * Lädt Gegner-Spieler nach LK-Bereich gefiltert
 * @param {string} teamName - Name der gegnerischen Mannschaft
 * @param {number} minLK - Minimale LK
 * @param {number} maxLK - Maximale LK
 * @param {string} season - Saison
 * @returns {Promise<Array>} Array der gefilterten Gegner-Spieler
 */
export const getOpponentPlayersByLK = async (teamName, minLK, maxLK, season = '2024/25') => {
  try {
    const { data, error } = await supabase
      .from('opponent_players')
      .select(`
        *,
        opponent_teams!inner(name, tvm_id)
      `)
      .eq('opponent_teams.name', teamName)
      .eq('opponent_teams.season', season)
      .gte('lk', minLK.toString())
      .lte('lk', maxLK.toString())
      .order('lk', { ascending: true });

    if (error) {
      console.error('Error loading opponent players by LK:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOpponentPlayersByLK:', error);
    throw error;
  }
};

/**
 * Fügt neue Gegner-Spieler hinzu
 * @param {Array} players - Array der Spieler-Daten
 * @returns {Promise<Object>} Ergebnis des Inserts
 */
export const insertOpponentPlayers = async (players) => {
  try {
    const { data, error } = await supabase
      .from('opponent_players')
      .insert(players)
      .select();

    if (error) {
      console.error('Error inserting opponent players:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in insertOpponentPlayers:', error);
    throw error;
  }
};

// ========================================
// MATCH RESULTS SERVICE
// ========================================

/**
 * Lädt alle Match-Ergebnisse für ein bestimmtes Match
 * @param {string} matchId - ID des Matches
 * @returns {Promise<Array>} Array der Match-Ergebnisse
 */
export const getMatchResults = async (matchId) => {
  try {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        *,
        home_player:players_unified!match_results_home_player_id_fkey(name, current_lk),
        home_player1:players_unified!match_results_home_player1_id_fkey(name, current_lk),
        home_player2:players_unified!match_results_home_player2_id_fkey(name, current_lk)
      `)
      .eq('match_id', matchId)
      .order('match_number', { ascending: true });

    if (error) {
      console.error('Error loading match results:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMatchResults:', error);
    throw error;
  }
};

/**
 * Speichert oder aktualisiert ein Match-Ergebnis
 * @param {Object} resultData - Match-Ergebnis-Daten
 * @returns {Promise<Object>} Ergebnis des Upserts
 */
export const saveMatchResult = async (resultData) => {
  try {
    // Hole aktuellen Benutzer
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Füge entered_by hinzu
    const dataWithUser = {
      ...resultData,
      entered_by: user.id,
      entered_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('match_results')
      .upsert(dataWithUser, {
        onConflict: 'match_id,match_number'
      })
      .select();

    if (error) {
      console.error('Error saving match result:', error);
      throw error;
    }

    // 🎾 Automatische LK-Berechnung für betroffene Spieler
    if (data && data.length > 0) {
      const savedResult = data[0];
      
      // Prüfe ob Match abgeschlossen ist
      if (savedResult.status === 'completed' && savedResult.winner) {
        console.log('✅ Match-Ergebnis gespeichert, starte automatische LK-Berechnung...');
        
        // Importiere dynamisch, um Circular Dependencies zu vermeiden
        import('../services/lkCalculationService').then(({ recalculateLKForMatchResult }) => {
          recalculateLKForMatchResult(savedResult);
        }).catch(err => {
          console.error('Error importing LK calculation service:', err);
        });
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in saveMatchResult:', error);
    throw error;
  }
};

/**
 * Löscht ein Match-Ergebnis
 * @param {string} resultId - ID des Match-Ergebnisses
 * @returns {Promise<Object>} Ergebnis des Deletes
 */
export const deleteMatchResult = async (resultId) => {
  try {
    const { error } = await supabase
      .from('match_results')
      .delete()
      .eq('id', resultId);

    if (error) {
      console.error('Error deleting match result:', error);
      throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deleteMatchResult:', error);
    throw error;
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Validiert ein Match-Ergebnis
 * @param {Object} result - Match-Ergebnis
 * @returns {Object} Validation-Ergebnis
 */
export const validateMatchResult = (result) => {
  const errors = [];

  // Prüfe Match-Typ
  if (!result.match_type || !['Einzel', 'Doppel'].includes(result.match_type)) {
    errors.push('Match-Typ muss "Einzel" oder "Doppel" sein');
  }

  // Prüfe Einzel-Match
  if (result.match_type === 'Einzel') {
    if (!result.home_player_id || !result.guest_player_id) {
      errors.push('Einzel-Match benötigt beide Spieler');
    }
  }

  // Prüfe Doppel-Match
  if (result.match_type === 'Doppel') {
    if (!result.home_player1_id || !result.home_player2_id || 
        !result.guest_player1_id || !result.guest_player2_id) {
      errors.push('Doppel-Match benötigt alle 4 Spieler');
    }
  }

  // Prüfe Sätze (optional - können leer sein)
  if (result.set1_home !== null && result.set1_guest !== null) {
    if (result.set1_home < 0 || result.set1_guest < 0) {
      errors.push('Satz-Ergebnisse dürfen nicht negativ sein');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Berechnet den Gewinner eines Matches
 * @param {Object} result - Match-Ergebnis mit Sätzen
 * @returns {string|null} 'home', 'guest' oder null
 */
export const calculateWinner = (result) => {
  if (!result.set1_home || !result.set1_guest || 
      !result.set2_home || !result.set2_guest || 
      !result.set3_home || !result.set3_guest) {
    return null;
  }

  let homeSets = 0;
  let guestSets = 0;

  // Satz 1
  if (result.set1_home > result.set1_guest) homeSets++;
  else guestSets++;

  // Satz 2
  if (result.set2_home > result.set2_guest) homeSets++;
  else guestSets++;

  // Satz 3 (Match-Tiebreak)
  if (result.set3_home > result.set3_guest) homeSets++;
  else guestSets++;

  if (homeSets >= 2) return 'home';
  if (guestSets >= 2) return 'guest';
  return null;
};

/**
 * Formatiert ein Match-Ergebnis für die Anzeige
 * @param {Object} result - Match-Ergebnis
 * @returns {Object} Formatiertes Ergebnis
 */
export const formatMatchResult = (result) => {
  return {
    ...result,
    displayScore: result.set1_home && result.set1_guest ? 
      `${result.set1_home}:${result.set1_guest} ${result.set2_home}:${result.set2_guest} ${result.set3_home}:${result.set3_guest}` :
      'Noch kein Ergebnis',
    winner: calculateWinner(result),
    isCompleted: !!result.winner
  };
};
