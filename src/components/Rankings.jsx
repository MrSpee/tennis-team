import { useState, useEffect } from 'react';
import { Users, List } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import './Rankings.css';

function Rankings() {
  const { players, matches } = useData();
  const [sortBy, setSortBy] = useState('registered'); // 'tvm' or 'registered'
  
  // Berechne Match-Statistiken pro Spieler (Einsätze, Siege, Niederlagen)
  const [playerStats, setPlayerStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

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
                .select('home_player_id, home_player1_id, home_player2_id, winner')
                .eq('match_id', match.id);

              if (!error && resultsData) {
                resultsData.forEach(result => {
                  // Prüfe ob Spieler beteiligt war (Einzel oder Doppel)
                  const isPlayerInvolved = 
                    result.home_player_id === player.id ||
                    result.home_player1_id === player.id ||
                    result.home_player2_id === player.id;

                  if (isPlayerInvolved && result.winner) {
                    if (result.winner === 'home') {
                      wins++;
                    } else if (result.winner === 'guest') {
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
      
      for (const match of seasonMatches) {
        const { data: resultsData, error } = await supabase
          .from('match_results')
          .select('*, opponent_players!guest_player_id(lk), opponent_players!guest_player1_id(lk)')
          .eq('match_id', match.id)
          .or(`home_player_id.eq.${player.id},home_player1_id.eq.${player.id},home_player2_id.eq.${player.id}`);
        
        if (!error && resultsData) {
          for (const result of resultsData) {
            if (result.winner === 'home') {
              // Spieler hat gewonnen!
              matchesPlayed++;
              
              // Hole Gegner-LK
              let oppLK = 25; // Fallback
              if (result.match_type === 'Einzel') {
                const oppData = await supabase
                  .from('opponent_players')
                  .select('lk')
                  .eq('id', result.guest_player_id)
                  .single();
                if (oppData.data?.lk) {
                  oppLK = parseFloat(oppData.data.lk.replace('LK', '').trim());
                }
              } else {
                // Doppel: Durchschnitt der beiden Gegner
                const opp1Data = await supabase
                  .from('opponent_players')
                  .select('lk')
                  .eq('id', result.guest_player1_id)
                  .single();
                const opp2Data = await supabase
                  .from('opponent_players')
                  .select('lk')
                  .eq('id', result.guest_player2_id)
                  .single();
                
                const lk1 = parseFloat(opp1Data.data?.lk?.replace('LK', '').trim() || '25');
                const lk2 = parseFloat(opp2Data.data?.lk?.replace('LK', '').trim() || '25');
                oppLK = (lk1 + lk2) / 2;
              }
              
              const improvement = calcMatchImprovement(begleitLK, oppLK, true);
              begleitLK -= improvement;
              totalImprovements += improvement;
              
              console.log(`  ✅ Sieg gegen LK ${oppLK.toFixed(1)} → -${improvement.toFixed(3)}`);
            }
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
      
      // In Datenbank speichern
      const { error: updateError } = await supabase
        .from('players')
        .update({ current_lk: `LK ${newLK.toFixed(1)}` })
        .eq('id', player.id);
      
      if (updateError) {
        console.error('❌ Error updating LK:', updateError);
        alert('Fehler beim Speichern der LK!');
        return;
      }
      
      alert(`🎾 Neue LK für ${player.name}: LK ${newLK.toFixed(1)}\n\n` +
            `📊 Details:\n` +
            `Start: LK ${startLK}\n` +
            `Matches: ${matchesPlayed}\n` +
            `Verbesserung: -${totalImprovements.toFixed(3)}\n` +
            `Abbau: +${decay.toFixed(3)}\n` +
            `Begleit-LK: ${begleitLK.toFixed(3)}`);
      
      // Lade Spieler neu
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error calculating LK:', error);
      alert('Fehler bei der LK-Berechnung!');
    }
  };

  return (
    <div className="rankings-page container">
      <header className="page-header fade-in">
        <div>
          <h1>Spieler-Rangliste</h1>
          <p>Offizielle Tennisverband Rankings</p>
        </div>
      </header>

      <div className="rankings-controls fade-in">
        <div className="sort-buttons">
          <button
            className={`btn ${sortBy === 'tvm' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSortBy('tvm')}
          >
            <List size={18} />
            TVM Meldeliste
          </button>
          <button
            className={`btn ${sortBy === 'registered' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSortBy('registered')}
          >
            <Users size={18} />
            Team intim 😉 ({registeredPlayers.length})
          </button>
        </div>
      </div>

      {sortBy === 'registered' && (
        <div className="live-lk-info card fade-in" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)', border: 'none', padding: '1rem', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e', fontSize: '1rem' }}>⚡ Live-LK Berechnung</h3>
          <p style={{ margin: 0, color: '#78350f', fontSize: '0.85rem', lineHeight: '1.6' }}>
            Anhand eurer Medenspiel-Ergebnisse berechnet. Wer grad on fire ist, sieht man hier! 🔥
          </p>
      </div>
      )}

      <div className="rankings-list fade-in">
        {sortBy === 'tvm' ? (
          // TVM Meldeliste - Hardcoded
          tvmMeldeliste.map((player) => (
            <div key={player.position} className="ranking-card card">
              <div className="ranking-card-header">
                <div className="position-badge">{player.position}</div>
                <h3 className="player-name-large">
                  {player.name}
                  {player.mf && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#f59e0b' }}>⭐ MF</span>}
                </h3>
                <div className="player-stats">
                  <span 
                    className="ranking-badge"
                    style={{ backgroundColor: getRankingColor(`LK ${player.lk}`) }}
                  >
                    LK {player.lk}
                  </span>
                </div>
              </div>

              <div className="form-indicator">
                <span className="form-label">Formkurve:</span>
                <span className="form-trend neutral">-</span>
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
                        <span className="wins-losses-badge wins-only">
                          ✅ {matchStats.wins} {matchStats.wins === 1 ? 'Sieg' : 'Siege'}
                        </span>
                      )}
                      {matchStats.losses > 0 && (
                        <span className="wins-losses-badge losses-only">
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
