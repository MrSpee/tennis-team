import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, List } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import './Rankings.css';
import './Dashboard.css';

function Rankings() {
  const navigate = useNavigate();
  const { players, matches } = useData();
  const [sortBy, setSortBy] = useState('registered'); // 'tvm', 'registered', or 'aufsteiger'
  
  // Berechne Match-Statistiken pro Spieler (Einsätze, Siege, Niederlagen)
  const [playerStats, setPlayerStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  
  // LK-Berechnung Akkordeon (mehrere Spieler gleichzeitig möglich)
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());
  const [lkCalculations, setLkCalculations] = useState({});

  useEffect(() => {
    const loadPlayerStats = async () => {
      if (!matches || matches.length === 0 || !players || players.length === 0) {
        return;
      }
      
      if (statsLoading) return; // Verhindere doppeltes Laden
      
      setStatsLoading(true);
      
      try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentSeason = (currentMonth >= 4 && currentMonth <= 7) ? 'summer' : 'winter';
        
        const seasonMatches = matches.filter(m => m.season === currentSeason);
        const stats = {};

        // Für jeden Spieler Statistiken berechnen
        for (const player of players) {
          if (player.name === 'Adrian') {
            console.log('🔵 Adrian ID:', player.id);
          }
          
          const total = seasonMatches.length;
          const available = seasonMatches.filter(m => 
            m.availability && m.availability[player.id]?.status === 'available'
          ).length;

          // Lade match_results für alle Spiele und zähle Siege/Niederlagen
          let wins = 0;
          let losses = 0;

          for (const match of seasonMatches) {
            try {
              const { data: resultsData, error } = await supabase
                .from('match_results')
                .select('*')
                .eq('match_id', match.id);

              if (!error && resultsData) {
                if (player.name === 'Adrian') {
                  console.log(`🔍 Adrian - Match ${match.opponent}:`, resultsData);
                }
                
                resultsData.forEach(result => {
                  // Prüfe ob Spieler beteiligt war (Einzel oder Doppel)
                  const isPlayerInvolved = 
                    result.home_player_id === player.id ||
                    result.home_player1_id === player.id ||
                    result.home_player2_id === player.id;

                  if (player.name === 'Adrian') {
                    console.log(`  🔍 Match ${result.match_number}:`, {
                      isPlayerInvolved,
                      winner: result.winner,
                      hasWinner: !!result.winner,
                      willCount: isPlayerInvolved && !!result.winner
                    });
                  }

                  if (isPlayerInvolved) {
                    // Nutze winner aus DB, oder berechne aus Sätzen
                    let winner = result.winner;
                    
                    if (!winner) {
                      // Fallback: Berechne Winner aus Sätzen
                      winner = calculateMatchWinner(result);
                    }
                    
                    if (player.name === 'Adrian') {
                      console.log(`  ✅ Adrian beteiligt in Match ${result.match_number} (${result.match_type}), winner: ${winner} (DB: ${result.winner})`);
                    }
                    
                    if (winner === 'home') {
                      wins++;
                    } else if (winner === 'guest') {
                      losses++;
                    }
                  }
                });
              }
            } catch (err) {
              console.error('Error loading match results:', err);
            }
          }

          stats[player.id] = { available, total, wins, losses };
          
          if (player.name === 'Adrian') {
            console.log(`✅ Adrian Stats final:`, stats[player.id]);
          }
        }

        setPlayerStats(stats);
      } catch (error) {
        console.error('Error loading player stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadPlayerStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, matches]);

  const getPlayerMatchStats = (playerId) => {
    return playerStats[playerId] || { available: 0, total: 0, wins: 0, losses: 0 };
  };

  // Berechne Match-Winner aus Sätzen (falls winner-Feld nicht gesetzt ist)
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
      
      // Satz-Gewinner ermitteln
      if (i === 2) {
        // Champions Tiebreak
        if (set.home >= 10 && set.home >= set.guest + 2) homeSetsWon++;
        else if (set.guest >= 10 && set.guest >= set.home + 2) guestSetsWon++;
      } else {
        // Normaler Satz oder Tiebreak
        if ((set.home === 7 && set.guest === 6) || (set.home >= 6 && set.home >= set.guest + 2)) {
          homeSetsWon++;
        } else if ((set.guest === 7 && set.home === 6) || (set.guest >= 6 && set.guest >= set.home + 2)) {
          guestSetsWon++;
        }
      }
    });
    
    if (homeSetsWon >= 2) return 'home';
    if (guestSetsWon >= 2) return 'guest';
    return null;
  };

  // Berechne Formkurve basierend auf Siegen und Niederlagen
  const getPlayerForm = (wins, losses) => {
    const total = wins + losses;
    
    if (total === 0) {
      return { 
        trend: 'neutral', 
        icon: '➡️', 
        text: 'Noch keine Spiele',
        emoji: '😶'
      };
    }
    
    const winRate = wins / total;
    
    // 100% Siege
    if (winRate === 1) {
      return { 
        trend: 'fire', 
        icon: '🚀', 
        text: 'Ungeschlagen!',
        emoji: '🔥'
      };
    }
    
    // >75% Siege
    if (winRate > 0.75) {
      return { 
        trend: 'excellent', 
        icon: '📈', 
        text: 'Top Form',
        emoji: '💪'
      };
    }
    
    // 50-75% Siege
    if (winRate >= 0.5) {
      return { 
        trend: 'good', 
        icon: '↗️', 
        text: 'Aufwärtstrend',
        emoji: '😎'
      };
    }
    
    // 25-50% Siege
    if (winRate >= 0.25) {
      return { 
        trend: 'down', 
        icon: '↘️', 
        text: 'Ausbaufähig',
        emoji: '😅'
      };
    }
    
    // <25% Siege
    return { 
      trend: 'bad', 
      icon: '📉', 
      text: 'Formtief',
      emoji: '😬'
    };
  };

  // TVM Meldeliste - Offizielle Namhafte Meldung (Herren 40, 1. Kreisliga Gr. 046)
  // Quelle: https://tvm-tennis.de/spielbetrieb/mannschaft/3472127-sv-rg-suerth-1
  const tvmMeldeliste = [
    { position: 1, name: 'Marco Coltro', lk: '8.4', nation: 'GER' },
    { position: 2, name: 'Thomas Mengelkamp', lk: '11.5', nation: 'GER' },
    { position: 3, name: 'Christian Spee', lk: '12.3', nation: 'GER' },
    { position: 4, name: 'Olivier Pol Michel', lk: '12.9', nation: 'FRA' },
    { position: 5, name: 'Robert Ellrich', lk: '14.3', nation: 'GER' },
    { position: 6, name: 'Daniel Becher', lk: '14.8', nation: 'GER', mf: true },
    { position: 7, name: 'Alexander Grebe', lk: '16.3', nation: 'GER' },
    { position: 8, name: 'Frank Ritter', lk: '16.9', nation: 'GER' },
    { position: 9, name: 'Adrian Tugui', lk: '17.1', nation: 'ROU' },
    { position: 10, name: 'Daniel Peters', lk: '19.9', nation: 'GER' },
    { position: 11, name: 'Michael Borgers', lk: '23.3', nation: 'GER' },
    { position: 12, name: 'Manuel Straub', lk: '25', nation: 'GER' }
  ];

  // Registrierte Spieler aus Datenbank (aktive Spieler sortiert nach current_lk)
  const registeredPlayers = players
    .filter(p => {
      if (!p || !p.name || !p.is_active) return false;
      if (p.name === 'Theo Tester') return false; // Theo Tester ausschließen
      return true;
    })
    .sort((a, b) => {
      // Priorisiere current_lk, dann season_start_lk, dann ranking
      const lkA = a.current_lk || a.season_start_lk || a.ranking;
      const lkB = b.current_lk || b.season_start_lk || b.ranking;
      
      if (!lkA && !lkB) return 0;
      if (!lkA) return 1; // a nach unten
      if (!lkB) return -1; // b nach unten
      
      const rankA = parseFloat(lkA.replace('LK ', '').trim()) || 99;
      const rankB = parseFloat(lkB.replace('LK ', '').trim()) || 99;
      return rankA - rankB; // Kleinere LK = besser = weiter oben
    });
  
  // Aufsteiger der Saison (sortiert nach season_improvement)
  const aufsteigerPlayers = players
    .filter(p => {
      if (!p || !p.name || !p.is_active) return false;
      if (p.name === 'Theo Tester') return false;
      return p.season_improvement !== null && p.season_improvement !== undefined;
    })
    .sort((a, b) => {
      // Sortiere nach Verbesserung (negativ = besser)
      const impA = a.season_improvement || 0;
      const impB = b.season_improvement || 0;
      return impA - impB; // Kleinster Wert (= größte Verbesserung) zuerst
    });

  const getRankingColor = (ranking) => {
    if (!ranking) return '#gray'; // Kein Ranking
    const lk = parseInt(ranking.replace('LK ', '').trim()) || 99;
    if (lk <= 9) return '#10b981'; // Green
    if (lk <= 11) return '#3b82f6'; // Blue
    return '#f59e0b'; // Orange
  };

  // ==========================================
  // LK-BERECHNUNGS-FUNKTIONEN (M40/H40)
  // ==========================================
  
  const SEASON_START = new Date('2025-09-29'); // Saison-Start
  const AGE_CLASS_FACTOR = 0.8; // M40/H40
  
  // Punktewert P (quadratische Approximation)
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
  
  // Hürdenwert H
  const hurdleH = (ownLK) => {
    return 50 + 12.5 * (25 - ownLK);
  };
  
  // Match-Verbesserung berechnen
  const calcMatchImprovement = (ownLK, oppLK, isTeamMatch = true) => {
    const diff = ownLK - oppLK;
    const P = pointsP(diff);
    const A = AGE_CLASS_FACTOR;
    const H = hurdleH(ownLK);
    
    let improvement = (P * A) / H;
    
    if (isTeamMatch) improvement *= 1.1; // +10% Mannschaftsspiel-Bonus
    
    return Math.max(0, Number(improvement.toFixed(3)));
  };
  
  // Wöchentlicher Abbau seit Saison-Start
  const getWeeklyDecay = () => {
    const now = new Date();
    const diffTime = now - SEASON_START;
    const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return 0.025 * weeks;
  };
  
  // Sichtbare LK (1 Nachkommastelle, abgeschnitten)
  const visibleLK = (begleitLK) => {
    return Math.floor(begleitLK * 10) / 10;
  };
  
  // LK für einen Spieler neu berechnen
  const calculatePlayerLK = async (player) => {
    try {
      console.log('🔮 Berechne LK für:', player.name);
      
      // Start-LK
      const startLK = parseFloat(player.season_start_lk?.replace('LK ', '') || '25');
      let begleitLK = startLK;
      
      console.log('📊 Start-LK:', startLK);
      
      // Lade alle Matches der aktuellen Saison
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentSeason = (currentMonth >= 4 && currentMonth <= 7) ? 'summer' : 'winter';
      
      const seasonMatches = matches.filter(m => m.season === currentSeason);
      
      // Lade alle match_results wo der Spieler beteiligt war
      let totalImprovements = 0;
      let matchesPlayed = 0;
      const matchDetails = []; // Für detaillierte Anzeige
      
      for (const match of seasonMatches) {
        // Lade match_results für dieses Match (ohne Foreign-Key-Join)
        const { data: resultsData, error } = await supabase
          .from('match_results')
          .select('*')
          .eq('match_id', match.id);
        
        if (error) {
          console.error('Error loading match results:', error);
          continue;
        }
        
        if (resultsData && resultsData.length > 0) {
          for (const result of resultsData) {
            // Prüfe ob dieser Spieler beteiligt war
            const isPlayerInvolved = 
              result.home_player_id === player.id ||
              result.home_player1_id === player.id ||
              result.home_player2_id === player.id;
            
            if (!isPlayerInvolved) {
              continue; // Spieler nicht beteiligt
            }
            
            // Prüfe Gewinner (entweder aus DB oder berechnet aus Sätzen)
            let matchWinner = result.winner;
            
            // Falls winner null, berechne aus Sätzen
            if (!matchWinner) {
              const homeSets = [
                result.set1_home > result.set1_guest ? 1 : 0,
                result.set2_home > result.set2_guest ? 1 : 0,
                result.set3_home > result.set3_guest ? 1 : 0
              ].filter(s => s === 1).length;
              
              const guestSets = [
                result.set1_guest > result.set1_home ? 1 : 0,
                result.set2_guest > result.set2_home ? 1 : 0,
                result.set3_guest > result.set3_home ? 1 : 0
              ].filter(s => s === 1).length;
              
              if (homeSets >= 2) matchWinner = 'home';
              else if (guestSets >= 2) matchWinner = 'guest';
            }
            
            if (matchWinner !== 'home') {
              continue; // Verloren oder kein Ergebnis
            }
            
            // Spieler hat gewonnen!
            matchesPlayed++;
            
            // Hole Gegner-LK und Namen
            let oppLK = 25; // Fallback
            let oppName = 'Unbekannt';
            let ownLK = begleitLK; // Für Einzel
            
            if (result.match_type === 'Einzel') {
              const { data: oppData } = await supabase
                .from('opponent_players')
                .select('name, lk')
                .eq('id', result.guest_player_id)
                .single();
              
              if (oppData) {
                oppLK = parseFloat(oppData.lk || '25');
                oppName = oppData.name || 'Unbekannt';
                console.log(`  🎾 Einzel-Gegner: ${oppName} (LK ${oppLK})`);
              }
            } else {
              // Doppel: Durchschnitt BEIDER Heimspieler gegen Durchschnitt BEIDER Gegner
              
              // Hole Partner-LK (der andere Heimspieler im Doppel)
              const partnerId = result.home_player1_id === player.id 
                ? result.home_player2_id 
                : result.home_player1_id;
              
              const { data: partnerData } = await supabase
                .from('players')
                .select('name, current_lk, season_start_lk, ranking')
                .eq('id', partnerId)
                .single();
              
              let partnerLK = 25; // Fallback
              let partnerName = 'Partner';
              if (partnerData) {
                const partnerLKStr = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
                partnerLK = parseFloat(partnerLKStr?.replace('LK ', '') || '25');
                partnerName = partnerData.name || 'Partner';
              }
              
              // Eigene Doppel-LK = Durchschnitt von beiden Heimspielern
              ownLK = (begleitLK + partnerLK) / 2;
              
              // Hole Gegner-LKs
              const { data: opp1Data } = await supabase
                .from('opponent_players')
                .select('name, lk')
                .eq('id', result.guest_player1_id)
                .single();
              
              const { data: opp2Data } = await supabase
                .from('opponent_players')
                .select('name, lk')
                .eq('id', result.guest_player2_id)
                .single();
              
              const oppLK1 = parseFloat(opp1Data?.lk || '25');
              const oppLK2 = parseFloat(opp2Data?.lk || '25');
              oppLK = (oppLK1 + oppLK2) / 2;
              const opp1Name = opp1Data?.name || '?';
              const opp2Name = opp2Data?.name || '?';
              oppName = `${opp1Name} & ${opp2Name}`;
              
              console.log(`  🎾 Doppel: ${player.name} (LK ${begleitLK.toFixed(1)}) + ${partnerName} (LK ${partnerLK.toFixed(1)}) → Ø ${ownLK.toFixed(1)}`);
              console.log(`  🎾 Doppel-Gegner: ${oppName} (LK ${oppLK1.toFixed(1)} & ${oppLK2.toFixed(1)}) → Ø ${oppLK.toFixed(1)}`);
            }
            
            const lkBefore = begleitLK;
            const improvement = calcMatchImprovement(ownLK, oppLK, true); // ownLK statt begleitLK!
            begleitLK -= improvement;
            totalImprovements += improvement;
            
            // Speichere Match-Details für Anzeige
            const matchDetail = {
              matchType: result.match_type,
              opponent: match.opponent,
              opponentName: oppName,
              opponentLK: oppLK,
              lkBefore: lkBefore,
              improvement: improvement,
              lkAfter: begleitLK
            };
            
            // Bei Doppel: Partner-Info und detaillierte Gegner-Info hinzufügen
            if (result.match_type === 'Doppel') {
              const partnerId = result.home_player1_id === player.id 
                ? result.home_player2_id 
                : result.home_player1_id;
              
              const partnerData = await supabase
                .from('players')
                .select('name, current_lk, season_start_lk, ranking')
                .eq('id', partnerId)
                .single();
              
              if (partnerData.data) {
                const partnerLKStr = partnerData.data.current_lk || partnerData.data.season_start_lk || partnerData.data.ranking;
                matchDetail.partnerName = partnerData.data.name;
                matchDetail.partnerLK = parseFloat(partnerLKStr?.replace('LK ', '') || '25');
                matchDetail.ownDoppelLK = ownLK; // Durchschnitt
              }
              
              // Einzelne Gegner mit ihren LKs speichern
              const opp1Data = await supabase
                .from('opponent_players')
                .select('name, lk')
                .eq('id', result.guest_player1_id)
                .single();
              
              const opp2Data = await supabase
                .from('opponent_players')
                .select('name, lk')
                .eq('id', result.guest_player2_id)
                .single();
              
              matchDetail.opponent1Name = opp1Data.data?.name || '?';
              matchDetail.opponent1LK = parseFloat(opp1Data.data?.lk || '25');
              matchDetail.opponent2Name = opp2Data.data?.name || '?';
              matchDetail.opponent2LK = parseFloat(opp2Data.data?.lk || '25');
            }
            
            matchDetails.push(matchDetail);
            
            console.log(`  ✅ Sieg gegen LK ${oppLK.toFixed(1)} → -${improvement.toFixed(3)} (neue Begleit-LK: ${begleitLK.toFixed(3)})`);
          }
        }
      }
      
      // Wöchentlicher Abbau
      const decay = getWeeklyDecay();
      begleitLK = Math.min(25, begleitLK + decay);
      
      console.log('📈 Gesamt-Verbesserung:', totalImprovements.toFixed(3));
      console.log('📉 Wöchentlicher Abbau:', decay.toFixed(3));
      console.log('🎯 Neue Begleit-LK:', begleitLK.toFixed(3));
      
      // Sichtbare LK (1 Nachkommastelle)
      const newLK = visibleLK(begleitLK);
      console.log('✨ Neue sichtbare LK:', newLK.toFixed(1));
      
      // Berechne season_improvement (current_lk - start_lk)
      // Negativ = Verbesserung (z.B. 16.8 - 17.1 = -0.3), Positiv = Verschlechterung
      const seasonImprovement = newLK - startLK;
      console.log('📊 Season Improvement:', seasonImprovement.toFixed(2));
      
      // In Datenbank speichern (inkl. Timestamp)
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          current_lk: `LK ${newLK.toFixed(1)}`,
          season_improvement: seasonImprovement,
          last_lk_update: new Date().toISOString()
        })
        .eq('id', player.id);
      
      if (updateError) {
        console.error('❌ Error updating LK:', updateError);
        alert('Fehler beim Speichern der LK!');
        return;
      }
      
      // Form-Statement basierend auf Verbesserung UND Zeit seit letztem Update
      // Negativ = Verbesserung (LK gesunken), Positiv = Verschlechterung (LK gestiegen)
      const getImprovementStatement = (improvement, lastUpdate) => {
        const now = new Date();
        const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : now;
        const daysSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60 * 24);
        const weeksSinceUpdate = daysSinceUpdate / 7;
        
        // Frische Verbesserung (< 7 Tage)
        if (daysSinceUpdate < 7 && improvement < 0) {
          if (improvement <= -1.0) return { icon: '🔥', text: 'Gerade verbessert! On Fire!', emoji: '💥', trend: 'fire' };
          if (improvement <= -0.3) return { icon: '⚡', text: 'Frische Verbesserung!', emoji: '🎉', trend: 'excellent' };
          return { icon: '📈', text: 'Gerade verbessert!', emoji: '👍', trend: 'good' };
        }
        
        // Mittelfristig (1-4 Wochen) mit Verbesserung
        if (weeksSinceUpdate < 4 && improvement < -0.5) {
          return { icon: '💪', text: 'Stark unterwegs!', emoji: '🌟', trend: 'excellent' };
        }
        
        // Langfristig (> 6 Wochen) - Zeit für Update
        if (weeksSinceUpdate >= 6) {
          if (improvement < -1.0) return { icon: '🏆', text: 'Top-Form gehalten!', emoji: '💎', trend: 'excellent' };
          if (improvement > 0.5) return { icon: '📉', text: 'Zeit für Comeback!', emoji: '💪', trend: 'down' };
          return { icon: '🎾', text: 'Zeit für neue Matches!', emoji: '🚀', trend: 'neutral' };
        }
        
        // Gesamtverbesserung (unabhängig von Zeit)
        if (improvement <= -2.0) return { icon: '🚀', text: 'Raketen-Start!', emoji: '💥', trend: 'fire' };
        if (improvement <= -1.5) return { icon: '🔥', text: 'Heißgelaufen!', emoji: '🌟', trend: 'excellent' };
        if (improvement <= -1.0) return { icon: '⚡', text: 'Auf dem Vormarsch', emoji: '💪', trend: 'excellent' };
        if (improvement <= -0.5) return { icon: '📈', text: 'Steady Progress', emoji: '👍', trend: 'good' };
        if (improvement <= -0.2) return { icon: '➡️', text: 'Stabil', emoji: '😊', trend: 'neutral' };
        if (improvement <= 0.2) return { icon: '😴', text: 'Konstant', emoji: '😌', trend: 'neutral' };
        return { icon: '📉', text: 'Ausbaufähig', emoji: '😬', trend: 'down' };
      };
      
      const improvementStatement = getImprovementStatement(seasonImprovement, player.last_lk_update);
      
      // Sortiere matchDetails: Einzel zuerst, dann Doppel
      matchDetails.sort((a, b) => {
        if (a.matchType !== b.matchType) {
          return a.matchType === 'Einzel' ? -1 : 1; // Einzel vor Doppel
        }
        return 0; // Behalte ursprüngliche Reihenfolge bei gleichem Typ
      });
      
      // Zeige Berechnung im Akkordeon
      setLkCalculations(prev => ({
        ...prev,
        [player.id]: {
          playerName: player.name,
          startLK: startLK,
          matchesPlayed: matchesPlayed,
          totalImprovements: totalImprovements,
          decay: decay,
          begleitLK: begleitLK,
          newLK: newLK,
          seasonImprovement: seasonImprovement,
          improvementStatement: improvementStatement,
          matchDetails: matchDetails // Detaillierte Match-Infos (sortiert: Einzel vor Doppel)
        }
      }));
      
      // Toggle Akkordeon
      setExpandedPlayers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(player.id)) {
          newSet.delete(player.id); // Schließen wenn bereits offen
        } else {
          newSet.add(player.id); // Öffnen
        }
        return newSet;
      });
      
      // Trigger DataContext Reload durch Custom Event
      window.dispatchEvent(new CustomEvent('reloadPlayers'));
      
    } catch (error) {
      console.error('❌ Error calculating LK:', error);
      alert('Fehler bei der LK-Berechnung!');
    }
  };

  return (
    <div className="dashboard container">
      {/* Kopfbereich im Dashboard-Stil */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">Spieler-Rangliste 🏆</h1>
      </div>

      <div className="rankings-controls fade-in">
        <div className="sort-buttons-modern">
          <button
            className={`btn-modern ${sortBy === 'registered' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSortBy('registered')}
          >
            <Users size={18} />
            Team intim 😉 ({registeredPlayers.length})
          </button>
          <button
            className={`btn-modern ${sortBy === 'aufsteiger' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSortBy('aufsteiger')}
            title="Aufsteiger der Saison"
          >
            🚀 Hot Player
          </button>
          <button
            className={`btn-modern ${sortBy === 'tvm' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSortBy('tvm')}
          >
            <List size={18} />
            TVM Meldeliste
          </button>
        </div>
      </div>

      {sortBy === 'registered' && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">⚡ Live-LK Berechnung</div>
            <div className="match-count-badge">🔮</div>
          </div>
          <div className="season-content">
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Anhand eurer Medenspiel-Ergebnisse berechnet. Wer grad on fire ist, sieht man hier! 🔥
            </p>
          </div>
      </div>
      )}
      
      {sortBy === 'aufsteiger' && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">🚀 Aufsteiger der Saison</div>
            <div className="match-count-badge">💪</div>
          </div>
          <div className="season-content">
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Wer hat sich am meisten verbessert? Die größten Fortschritte der Saison! 💪
            </p>
          </div>
        </div>
      )}

      <div className="rankings-list fade-in">
        {sortBy === 'aufsteiger' ? (
          // Aufsteiger der Saison
          aufsteigerPlayers.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p>🚀 Noch keine Aufsteiger-Daten verfügbar.</p>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Drücke ‘🔮 LK’ bei einem Spieler, um die Verbesserung zu berechnen!
              </p>
            </div>
          ) : (
            aufsteigerPlayers.map((player, index) => {
              const position = index + 1;
              const improvement = player.season_improvement || 0;
              
              // Bestimme Aufsteiger-Kategorie
              // Negativ = Verbesserung (LK gesunken), Positiv = Verschlechterung (LK gestiegen)
              let category = { icon: '📉', text: 'Formkrise', color: '#ef4444' };
              if (improvement <= -2.0) category = { icon: '🚀', text: 'Raketen-Start', color: '#8b5cf6' };
              else if (improvement <= -1.5) category = { icon: '🔥', text: 'Heißgelaufen', color: '#f59e0b' };
              else if (improvement <= -1.0) category = { icon: '⚡', text: 'Auf dem Vormarsch', color: '#10b981' };
              else if (improvement <= -0.5) category = { icon: '📈', text: 'Steady Progress', color: '#3b82f6' };
              else if (improvement <= -0.2) category = { icon: '➡️', text: 'Stabil', color: '#6b7280' };
              else if (improvement <= 0.2) category = { icon: '😴', text: 'Winterschlaf', color: '#9ca3af' };
              
              return (
                <div key={player.id} className="fade-in lk-card-full">
                  <div className="formkurve-header">
                    <div className="formkurve-title">
                      <span className="position-number">{position}</span> - {player.name}
                    </div>
                    <div className="match-count-badge" style={{ backgroundColor: category.color }}>
                      {category.icon} {category.text}
                    </div>
                  </div>
                  
                  <div className="season-content">
                    <div className="ranking-hero-modern">
                      <div className="ranking-lk-display">
                        <span className="lk-chip">
                          {player.season_start_lk || 'LK ?'} → {player.current_lk || 'LK ?'}
                        </span>
                        <span className="improvement-badge-top positive">
                          <span className="badge-icon">▼</span>
                          <span className="badge-value">{Math.abs(improvement).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : sortBy === 'tvm' ? (
          // TVM Meldeliste - Hardcoded
          tvmMeldeliste.map((player) => (
            <div key={player.position} className="fade-in lk-card-full">
              <div className="formkurve-header">
                <div className="formkurve-title">
                  <span className="position-number">{player.position}</span> - {player.name}
                  {player.mf && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#f59e0b' }}>⭐ MF</span>}
                </div>
                <div className="match-count-badge" style={{ backgroundColor: getRankingColor(`LK ${player.lk}`) }}>
                  LK {player.lk}
                </div>
              </div>
              
              <div className="season-content">
                <div className="ranking-hero-modern">
                  <div className="ranking-lk-display">
                    <span className="lk-chip">
                      LK {player.lk}
                    </span>
                    <span className="form-trend neutral">-</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Angemeldete Spieler aus Datenbank
          registeredPlayers.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p>🎾 Noch keine Spieler in der App angemeldet.</p>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Spieler erscheinen hier nach der Registrierung in der App.
              </p>
            </div>
          ) : (
            registeredPlayers.map((player, index) => {
              const position = index + 1;
              const matchStats = getPlayerMatchStats(player.id);
              
              return (
              <div key={player.id} className="ranking-card card">
                  <div className="ranking-card-header">
                    <h3 className="player-name-large">
                      <span className="position-number">{position}</span> - {player.name}
                    {player.role === 'captain' && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#f59e0b' }}>⭐ Captain</span>}
                  </h3>
                  <div className="player-stats">
                      {player.current_lk || player.ranking ? (
                        <>
                      <span 
                        className="ranking-badge"
                            style={{ backgroundColor: getRankingColor(player.current_lk || player.ranking) }}
                            title="Aktuelle Live-LK"
                          >
                            {player.current_lk || player.ranking}
                          </span>
                          
                          {/* Verbesserungs-Badge (nur wenn LK berechnet wurde) */}
                          {player.season_improvement !== null && player.season_improvement !== undefined && player.season_improvement !== 0 && (
                            <span 
                              className="improvement-badge"
                              style={{ 
                                backgroundColor: player.season_improvement < 0 ? '#10b981' : '#ef4444',
                                color: 'white'
                              }}
                              title={`Verbesserung seit Saisonstart: ${player.season_improvement > 0 ? '+' : ''}${player.season_improvement.toFixed(2)} LK`}
                            >
                              {player.season_improvement < 0 ? '↓' : '↑'} {Math.abs(player.season_improvement).toFixed(1)}
                            </span>
                          )}
                          
                          {player.season_start_lk && player.current_lk && player.season_start_lk !== player.current_lk && (
                            <span 
                              className="ranking-badge-secondary"
                              title="Saison-Start LK"
                            >
                              Start: {player.season_start_lk}
                      </span>
                          )}
                        </>
                    ) : (
                      <span className="ranking-badge" style={{ backgroundColor: '#ccc' }}>
                        Kein LK
                      </span>
                    )}
                    <span className="points-badge">
                        <span>🎾 {matchStats.available}/{matchStats.total}</span>
                      </span>
                      {matchStats.wins > 0 && (
                        <span 
                          className="wins-losses-badge wins-only clickable"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/results?view=spieler&player=${player.id}`);
                          }}
                          title="Zur Spieler-Übersicht springen"
                        >
                          ✅ {matchStats.wins} {matchStats.wins === 1 ? 'Sieg' : 'Siege'}
                        </span>
                      )}
                      {matchStats.losses > 0 && (
                        <span 
                          className="wins-losses-badge losses-only clickable"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/results?view=spieler&player=${player.id}`);
                          }}
                          title="Zur Spieler-Übersicht springen"
                        >
                          ❌ {matchStats.losses} {matchStats.losses === 1 ? 'Niederlage' : 'Niederlagen'}
                    </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-indicator">
                    <div className="form-content">
                      <span className="form-label">Form:</span>
                      <div className="form-display">
                        {(() => {
                          const form = getPlayerForm(matchStats.wins, matchStats.losses);
                          return (
                            <>
                              <span className={`form-trend ${form.trend}`}>
                                {form.icon}
                              </span>
                              <span className="form-text">{form.text}</span>
                              <span className="form-emoji">{form.emoji}</span>
                            </>
                          );
                        })()}
                  </div>
                </div>
                    <button 
                      className="magic-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        calculatePlayerLK(player);
                      }}
                      title="LK neu berechnen"
                    >
                      🔮 LK
                    </button>
                  </div>
                  
                  {/* LK-Berechnung Akkordeon */}
                  {expandedPlayers.has(player.id) && lkCalculations[player.id] && (
                    <div className="lk-calculation-accordion">
                      <div className="accordion-header">
                        <div className="accordion-title">
                          <span className="accordion-icon">📊</span>
                          <h4>LK-Berechnung für {lkCalculations[player.id].playerName}</h4>
                        </div>
                        <button 
                          className="close-accordion"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPlayers(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(player.id);
                              return newSet;
                            });
                          }}
                          title="Schließen"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="accordion-body">
                        <div className="calc-result-box">
                          <div className="calc-result-icon">🎯</div>
                          <div className="calc-result-content">
                            <div className="result-label">Neue Live-LK</div>
                            <div className="result-value">LK {lkCalculations[player.id].newLK.toFixed(1)}</div>
                            {lkCalculations[player.id].improvementStatement && (
                              <div className="improvement-statement">
                                <span className="statement-icon">{lkCalculations[player.id].improvementStatement.icon}</span>
                                <span className="statement-text">{lkCalculations[player.id].improvementStatement.text}</span>
                                <span className="statement-emoji">{lkCalculations[player.id].improvementStatement.emoji}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="calc-details">
                          <div className="calc-section-title">Berechnungsdetails</div>
                          
                          <div className="calc-row">
                            <span className="calc-label">🎾 Start-LK (Saison):</span>
                            <span className="calc-value">LK {lkCalculations[player.id].startLK.toFixed(1)}</span>
                          </div>
                          
                          <div className="calc-row">
                            <span className="calc-label">🏆 Gespielte Matches:</span>
                            <span className="calc-value">{lkCalculations[player.id].matchesPlayed} Siege</span>
                          </div>
                          
                          <div className="calc-row highlight success-row">
                            <span className="calc-label">📈 Verbesserung durch Siege:</span>
                            <span className="calc-value success">−{lkCalculations[player.id].totalImprovements.toFixed(3)}</span>
                          </div>
                          
                          <div className="calc-row">
                            <span className="calc-label">📉 Wöchentlicher Abbau:</span>
                            <span className="calc-value decay">+{lkCalculations[player.id].decay.toFixed(3)}</span>
                          </div>
                          
                          <div className="calc-divider"></div>
                          
                          <div className="calc-row">
                            <span className="calc-label">⚙️ Begleit-LK (3 Nachkommastellen):</span>
                            <span className="calc-value technical">{lkCalculations[player.id].begleitLK.toFixed(3)}</span>
                          </div>
                        </div>
                        
                        {/* Match-Details */}
                        {lkCalculations[player.id].matchDetails && lkCalculations[player.id].matchDetails.length > 0 && (
                          <div className="match-details-section">
                            <div className="calc-section-title">🎾 Einzelne Matches</div>
                            
                            {lkCalculations[player.id].matchDetails.map((matchDetail, idx) => (
                              <div key={idx} className="match-detail-card">
                                <div className="match-detail-header">
                                  <span className="match-detail-type">
                                    {matchDetail.matchType === 'Einzel' ? '👤' : '👥'} {matchDetail.matchType}
                                  </span>
                                  <span className="match-detail-opponent">
                                    vs. {matchDetail.opponent}
                                  </span>
                                </div>
                                
                                <div className="match-detail-body">
                                  {/* Bei Doppel: Zeige Partner-Info */}
                                  {matchDetail.matchType === 'Doppel' && matchDetail.partnerName && (
                                    <div className="match-detail-row doppel-info">
                                      <span className="detail-label">🤝 Partner:</span>
                                      <span className="detail-value">{matchDetail.partnerName} (LK {matchDetail.partnerLK.toFixed(1)})</span>
                                    </div>
                                  )}
                                  
                                  {matchDetail.matchType === 'Doppel' && matchDetail.ownDoppelLK && (
                                    <div className="match-detail-row doppel-info">
                                      <span className="detail-label">📊 Doppel-LK (Ø):</span>
                                      <span className="detail-value bold">LK {matchDetail.ownDoppelLK.toFixed(1)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Gegner-Anzeige: Bei Doppel einzeln auflisten */}
                                  {matchDetail.matchType === 'Doppel' && matchDetail.opponent1Name ? (
                                    <div className="opponent-details">
                                      <div className="opponent-header">
                                        <span className="detail-label">🎾 Gegner:</span>
                                      </div>
                                      <div className="opponent-list">
                                        <div className="opponent-item">
                                          <span className="opponent-number">1.</span>
                                          <span className="opponent-name">{matchDetail.opponent1Name}</span>
                                          <span className="opponent-lk">LK {matchDetail.opponent1LK.toFixed(1)}</span>
                                        </div>
                                        <div className="opponent-item">
                                          <span className="opponent-number">2.</span>
                                          <span className="opponent-name">{matchDetail.opponent2Name}</span>
                                          <span className="opponent-lk">LK {matchDetail.opponent2LK.toFixed(1)}</span>
                                        </div>
                                        <div className="opponent-average">
                                          <span className="average-label">Ø Gegner-LK:</span>
                                          <span className="average-value">LK {matchDetail.opponentLK.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="opponent-details">
                                      <div className="opponent-header">
                                        <span className="detail-label">🎾 Gegner:</span>
                                      </div>
                                      <div className="opponent-list">
                                        <div className="opponent-item">
                                          <span className="opponent-number">1.</span>
                                          <span className="opponent-name">{matchDetail.opponentName}</span>
                                          <span className="opponent-lk">LK {matchDetail.opponentLK.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="match-detail-row">
                                    <span className="detail-label">LK vorher:</span>
                                    <span className="detail-value">LK {matchDetail.lkBefore.toFixed(3)}</span>
                                  </div>
                                  
                                  <div className="match-detail-row highlight-green">
                                    <span className="detail-label">Verbesserung:</span>
                                    <span className="detail-value success">−{matchDetail.improvement.toFixed(3)}</span>
                                  </div>
                                  
                                  <div className="match-detail-row">
                                    <span className="detail-label">LK nachher:</span>
                                    <span className="detail-value bold">LK {matchDetail.lkAfter.toFixed(3)}</span>
                  </div>
                </div>
              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      <div className="rankings-legend fade-in card">
        <h3>🎨 Farbcodierung</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            <span>LK 8-9: Sehr stark</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
            <span>LK 10-11: Stark</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>LK 12+: Gut</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rankings;
