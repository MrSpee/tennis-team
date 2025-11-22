/**
 * LK-Berechnungs-Service
 * Automatische LK-Berechnung für Spieler basierend auf Match-Ergebnissen
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Berechnet die LK für alle aktiven App-User neu
 * @returns {Promise<Object>} Ergebnis mit Anzahl berechneter Spieler
 */
export const recalculateLKForAllActivePlayers = async () => {
  try {
    console.log('🔄 Starte LK-Neuberechnung für alle aktiven Spieler...');
    
    // Lade alle aktiven App-User
    const { data: activePlayers, error: playersError } = await supabase
      .from('players_unified')
      .select('id, name, current_lk, season_start_lk, ranking')
      .eq('player_type', 'app_user')
      .eq('is_active', true);
    
    if (playersError) {
      console.error('❌ Error loading active players:', playersError);
      return { success: false, error: playersError, calculated: 0 };
    }
    
    if (!activePlayers || activePlayers.length === 0) {
      console.log('⚠️ Keine aktiven Spieler gefunden');
      return { success: true, calculated: 0, players: [] };
    }
    
    console.log(`✅ ${activePlayers.length} aktive Spieler gefunden, berechne LK...`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Berechne LK für jeden Spieler
    for (let i = 0; i < activePlayers.length; i++) {
      const player = activePlayers[i];
      console.log(`\n[${i + 1}/${activePlayers.length}] Berechne LK für: ${player.name}...`);
      
      try {
        const result = await calculatePlayerLK(player.id, player);
        
        if (result) {
          results.push({
            playerId: player.id,
            playerName: player.name,
            oldLK: player.current_lk || player.season_start_lk || 'N/A',
            newLK: `LK ${result.newLK.toFixed(1)}`,
            success: true
          });
          successCount++;
          console.log(`✅ ${player.name}: ${player.current_lk || 'N/A'} → LK ${result.newLK.toFixed(1)}`);
        } else {
          results.push({
            playerId: player.id,
            playerName: player.name,
            oldLK: player.current_lk || player.season_start_lk || 'N/A',
            newLK: 'Fehler',
            success: false
          });
          errorCount++;
          console.error(`❌ Fehler bei ${player.name}`);
        }
        
        // Kleine Verzögerung zwischen Berechnungen, um DB nicht zu überlasten
        if (i < activePlayers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Fehler bei LK-Berechnung für ${player.name}:`, error);
        results.push({
          playerId: player.id,
          playerName: player.name,
          oldLK: player.current_lk || player.season_start_lk || 'N/A',
          newLK: 'Fehler',
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }
    
    console.log(`\n✅ LK-Neuberechnung abgeschlossen:`);
    console.log(`   Erfolgreich: ${successCount}`);
    console.log(`   Fehler: ${errorCount}`);
    console.log(`   Gesamt: ${activePlayers.length}`);
    
    // Event auslösen, damit UI aktualisiert wird
    window.dispatchEvent(new CustomEvent('reloadPlayers'));
    
    return {
      success: true,
      calculated: successCount,
      errors: errorCount,
      total: activePlayers.length,
      results
    };
  } catch (error) {
    console.error('❌ Error in recalculateLKForAllActivePlayers:', error);
    return { success: false, error: error.message, calculated: 0 };
  }
};

// LK-Berechnung Konstanten
const SEASON_START = new Date('2025-09-29');
const AGE_CLASS_FACTOR = 0.8; // M40/H40

const pointsP = (diff) => {
  if (diff <= -4) return 10;
  if (diff >= 4) return 110;
  if (diff < 0) {
    const t = (diff + 4) / 4;
    return 10 + 40 * (t * t);
  }
  const t = diff / 4;
  return 50 + 60 * (t * t);
};

const hurdleH = (ownLK) => 50 + 12.5 * (25 - ownLK);

const calcMatchImprovement = (ownLK, oppLK, isTeamMatch = true) => {
  const diff = ownLK - oppLK;
  const P = pointsP(diff);
  const A = AGE_CLASS_FACTOR;
  const H = hurdleH(ownLK);
  let improvement = (P * A) / H;
  if (isTeamMatch) improvement *= 1.1;
  return Math.max(0, Number(improvement.toFixed(3)));
};

const getWeeklyDecay = () => {
  const now = new Date();
  const diffTime = now - SEASON_START;
  const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return 0.025 * weeks;
};

const visibleLK = (begleitLK) => Math.floor(begleitLK * 10) / 10;

const calculateMatchWinner = (result) => {
  const sets = [
    { home: parseInt(result.set1_home) || 0, guest: parseInt(result.set1_guest) || 0 },
    { home: parseInt(result.set2_home) || 0, guest: parseInt(result.set2_guest) || 0 },
    { home: parseInt(result.set3_home) || 0, guest: parseInt(result.set3_guest) || 0 }
  ];
  
  let homeSetsWon = 0;
  let guestSetsWon = 0;
  
  sets.forEach((set, i) => {
    if (set.home === 0 && set.guest === 0) return;
    if (i === 2) {
      if (set.home >= 10 && set.home >= set.guest + 2) homeSetsWon++;
      else if (set.guest >= 10 && set.guest >= set.home + 2) guestSetsWon++;
    } else {
      if ((set.home === 7 && set.guest === 6) || (set.home >= 6 && set.home >= set.guest + 2)) homeSetsWon++;
      else if ((set.guest === 7 && set.home === 6) || (set.guest >= 6 && set.guest >= set.home + 2)) guestSetsWon++;
    }
  });
  
  if (homeSetsWon >= 2) return 'home';
  if (guestSetsWon >= 2) return 'guest';
  return null;
};

/**
 * Berechnet die aktuelle LK für einen Spieler
 * @param {string} playerId - ID des Spielers
 * @param {Object} playerData - Optional: Spieler-Daten (wenn nicht vorhanden, wird aus DB geladen)
 * @returns {Promise<Object>} Berechnungsergebnis mit newLK
 */
export const calculatePlayerLK = async (playerId, playerData = null) => {
  try {
    // Lade Spieler-Daten, falls nicht vorhanden
    let player = playerData;
    if (!player) {
      const { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('id', playerId)
        .single();
      
      if (error || !data) {
        console.error('❌ Error loading player:', error);
        return null;
      }
      player = data;
    }
    
    console.log('🔮 Automatische LK-Berechnung für:', player.name);
    console.log('📊 Spieler LK-Daten:', {
      season_start_lk: player.season_start_lk,
      current_lk: player.current_lk,
      ranking: player.ranking
    });
    
    // WICHTIG: Verwende IMMER season_start_lk als Start-LK, wenn vorhanden!
    // Nur wenn season_start_lk nicht gesetzt ist, verwende current_lk oder ranking
    const lkSource = player.season_start_lk || player.current_lk || player.ranking || '25';
    const startLK = parseFloat(lkSource.replace('LK ', '').replace(',', '.').replace('LK', '').trim());
    let begleitLK = startLK;
    
    console.log('📊 Start-LK für Berechnung:', startLK, '(Quelle:', player.season_start_lk ? 'season_start_lk' : player.current_lk ? 'current_lk' : 'ranking/fallback', ')');
    
    // Lade alle Matches
    const { data: matchdaysData, error: matchdaysError } = await supabase
      .from('matchdays')
      .select(`
        id,
        match_date,
        season,
        home_team_id,
        away_team_id,
        home_team:home_team_id (club_name, team_name),
        away_team:away_team_id (club_name, team_name)
      `)
      .order('match_date', { ascending: false });
    
    if (matchdaysError) {
      console.error('❌ Error loading matchdays:', matchdaysError);
      return null;
    }
    
    const matchesToProcess = (matchdaysData || []).map(m => {
      const homeTeamName = m.home_team ? 
        `${m.home_team.club_name} ${m.home_team.team_name || ''}`.trim() : 
        'Unbekannt';
      const awayTeamName = m.away_team ? 
        `${m.away_team.club_name} ${m.away_team.team_name || ''}`.trim() : 
        'Unbekannt';
      
      return {
        id: m.id,
        date: new Date(m.match_date),
        season: m.season,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id
      };
    });
    
    let totalImprovements = 0;
    let matchesPlayed = 0;
    
    // Loop durch alle Matches
    for (const match of matchesToProcess) {
      const { data: resultsData, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('matchday_id', match.id);
      
      if (error) continue;
      
      for (const result of resultsData || []) {
        const isPlayerInHomeTeam = 
          result.home_player_id === playerId ||
          result.home_player1_id === playerId ||
          result.home_player2_id === playerId;
        
        const isPlayerInGuestTeam = 
          result.guest_player_id === playerId ||
          result.guest_player1_id === playerId ||
          result.guest_player2_id === playerId;
        
        if (!isPlayerInHomeTeam && !isPlayerInGuestTeam) continue;
        
        let winner = result.winner;
        if (!winner) {
          winner = calculateMatchWinner(result);
        }
        
        const didPlayerWin = 
          (isPlayerInHomeTeam && winner === 'home') ||
          (isPlayerInGuestTeam && winner === 'guest');
        
        if (!didPlayerWin) continue; // Nur Siege zählen
        
        matchesPlayed++;
        
        let oppLK = 25;
        let ownLK = begleitLK;
        
        if (result.match_type === 'Einzel') {
          const opponentId = isPlayerInHomeTeam ? result.guest_player_id : result.home_player_id;
          
          const { data: oppData } = await supabase
            .from('players_unified')
            .select('current_lk')
            .eq('id', opponentId)
            .single();
          
          if (oppData) {
            oppLK = parseFloat((oppData.current_lk || '25').replace(',', '.').replace('LK ', ''));
          }
        } else {
          // Doppel
          const partnerId = isPlayerInHomeTeam ?
            (result.home_player1_id === playerId ? result.home_player2_id : result.home_player1_id) :
            (result.guest_player1_id === playerId ? result.guest_player2_id : result.guest_player1_id);
          
          const { data: partnerData } = await supabase
            .from('players_unified')
            .select('current_lk, season_start_lk, ranking')
            .eq('id', partnerId)
            .single();
          
          let partnerLK = 25;
          if (partnerData) {
            const partnerLKStr = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
            partnerLK = parseFloat(partnerLKStr?.replace('LK ', '').replace(',', '.') || '25');
          }
          
          ownLK = (begleitLK + partnerLK) / 2;
          
          const opp1Id = isPlayerInHomeTeam ? result.guest_player1_id : result.home_player1_id;
          const opp2Id = isPlayerInHomeTeam ? result.guest_player2_id : result.home_player2_id;
          
          const { data: opp1Data } = await supabase
            .from('players_unified')
            .select('current_lk')
            .eq('id', opp1Id)
            .single();
          
          const { data: opp2Data } = await supabase
            .from('players_unified')
            .select('current_lk')
            .eq('id', opp2Id)
            .single();
          
          const oppLK1 = parseFloat((opp1Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
          const oppLK2 = parseFloat((opp2Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
          oppLK = (oppLK1 + oppLK2) / 2;
        }
        
        const improvement = calcMatchImprovement(ownLK, oppLK, true);
        begleitLK -= improvement;
        totalImprovements += improvement;
      }
    }
    
    const decay = getWeeklyDecay();
    begleitLK = Math.min(25, begleitLK + decay);
    const newLK = visibleLK(begleitLK);
    
    // Speichere neue LK in DB
    const { error: updateError } = await supabase
      .from('players_unified')
      .update({ 
        current_lk: `LK ${newLK.toFixed(1)}`
      })
      .eq('id', playerId);
    
    if (updateError) {
      console.error('❌ Error updating LK:', updateError);
      return null;
    }
    
    console.log('✅ LK automatisch aktualisiert für', player.name, '→ LK', newLK.toFixed(1));
    
    // Event auslösen, damit UI aktualisiert wird
    window.dispatchEvent(new CustomEvent('reloadPlayers'));
    
    return {
      playerId,
      playerName: player.name,
      newLK,
      startLK,
      matchesPlayed,
      totalImprovements,
      decay
    };
  } catch (error) {
    console.error('❌ Error calculating LK:', error);
    return null;
  }
};

/**
 * Berechnet die LK für alle betroffenen Spieler eines Match-Ergebnisses
 * @param {Object} matchResult - Match-Ergebnis mit player IDs
 */
export const recalculateLKForMatchResult = async (matchResult) => {
  const playerIds = new Set();
  
  // Sammle alle betroffenen Spieler-IDs
  if (matchResult.home_player_id) playerIds.add(matchResult.home_player_id);
  if (matchResult.guest_player_id) playerIds.add(matchResult.guest_player_id);
  if (matchResult.home_player1_id) playerIds.add(matchResult.home_player1_id);
  if (matchResult.home_player2_id) playerIds.add(matchResult.home_player2_id);
  if (matchResult.guest_player1_id) playerIds.add(matchResult.guest_player1_id);
  if (matchResult.guest_player2_id) playerIds.add(matchResult.guest_player2_id);
  
  console.log('🔄 Automatische LK-Berechnung für', playerIds.size, 'Spieler nach neuem Match-Ergebnis');
  
  // Berechne LK für alle betroffenen Spieler (mit Verzögerung, um mehrere Updates zu bündeln)
  const uniquePlayerIds = Array.from(playerIds);
  
  // Warte kurz, damit alle Updates abgeschlossen sind
  setTimeout(async () => {
    for (const playerId of uniquePlayerIds) {
      if (playerId) {
        await calculatePlayerLK(playerId);
        // Kleine Verzögerung zwischen Berechnungen, um DB nicht zu überlasten
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, 500);
};

