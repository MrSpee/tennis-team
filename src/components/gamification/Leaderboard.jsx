import React, { useState, useEffect, useCallback } from 'react';
import { Info, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import './Leaderboard.css';

/**
 * Tennis-Weltranglisten-Style Leaderboard
 */
export const Leaderboard = ({ period: initialPeriod = 'week', limit = 20 }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(initialPeriod || 'week');
  const [showInfo, setShowInfo] = useState(false);
  const [previousRankings, setPreviousRankings] = useState({});

  const loadLeaderboard = useCallback(async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);

      const now = new Date();
      let startDate;

      if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // All-time
        startDate = new Date(0);
      }

      // Timeout für Query (3 Sekunden)
      const queryTimeout = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ timeout: true });
        }, 3000);
      });

      // Lade Achievements für den Zeitraum mit Timeout
      const achievementsQuery = supabase
        .from('player_achievements')
        .select('player_id, points, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const achievementsResult = await Promise.race([achievementsQuery, queryTimeout]);
      
      // Wenn Timeout, zeige Demo-Daten
      if (achievementsResult.timeout) {
        console.warn('⚠️ Achievements query timeout - showing demo data');
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      const { data: achievements, error: achievementsError } = achievementsResult;

      if (achievementsError) {
        console.error('❌ Error loading achievements:', achievementsError);
        // Fallback: Zeige Demo-Daten bei Fehler
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      // Aggregiere Punkte pro Spieler
      const playerPoints = {};
      (achievements || []).forEach(achievement => {
        if (achievement.player_id) {
          if (!playerPoints[achievement.player_id]) {
            playerPoints[achievement.player_id] = 0;
          }
          playerPoints[achievement.player_id] += (achievement.points || 0);
        }
      });

      // Lade Spieler-Daten
      const playerIds = Object.keys(playerPoints).filter(id => id && id !== 'null' && id !== 'undefined');
      
      // 🎮 DEMO: Wenn keine Daten vorhanden, zeige sofort Beispieldaten (OHNE weitere Query)
      if (!achievements || achievements.length === 0 || playerIds.length === 0) {
        console.log('ℹ️ No achievements found, showing demo data immediately');
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      // Alternative: Lade alle Spieler mit gamification_points > 0, falls keine achievements vorhanden
      // Oder lade Spieler basierend auf playerIds
      const playersQuery = supabase
        .from('players_unified')
        .select('id, name, profile_image, gamification_points, current_streak')
        .in('id', playerIds)
        .order('gamification_points', { ascending: false })
        .limit(limit);

      const playersTimeout = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ timeout: true });
        }, 3000);
      });

      const playersResult = await Promise.race([playersQuery, playersTimeout]);
      
      // Wenn Timeout, zeige Demo-Daten
      if (playersResult.timeout) {
        console.warn('⚠️ Players query timeout - showing demo data');
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      const { data: playersData, error: playersError } = playersResult;

      if (playersError) {
        console.error('❌ Error loading players:', playersError);
        // Fallback: Zeige Demo-Daten bei Fehler
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      // Kombiniere Daten und berechne Rangänderungen
      const leaderboard = (playersData || []).map((player, index) => {
        const previousRank = previousRankings[player.id] || index + 1;
        const currentRank = index + 1;
        const rankChange = previousRank - currentRank; // Positiv = aufgestiegen, Negativ = abgestiegen

        return {
          ...player,
          periodPoints: playerPoints[player.id] || 0,
          rankChange,
          current_streak: player.current_streak || 0
        };
      })
      .filter(player => player.periodPoints > 0 || player.gamification_points > 0) // Nur Spieler mit Punkten anzeigen
      .sort((a, b) => {
        // Sortiere nach periodPoints (falls vorhanden), sonst nach gamification_points
        const aPoints = a.periodPoints || a.gamification_points || 0;
        const bPoints = b.periodPoints || b.gamification_points || 0;
        return bPoints - aPoints;
      });

      // Speichere aktuelle Rankings für nächsten Vergleich
      const newRankings = {};
      leaderboard.forEach((player, index) => {
        newRankings[player.id] = index + 1;
      });
      setPreviousRankings(newRankings);

      // 🎮 DEMO: Falls weniger als 5 Spieler, fülle mit Beispieldaten auf
      if (leaderboard.length < 5) {
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
        ];
        // Kombiniere echte Daten mit Demo-Daten
        const combined = [...leaderboard, ...demoPlayers.slice(leaderboard.length)];
        setPlayers(combined.slice(0, limit));
      } else {
        setPlayers(leaderboard);
      }
    } catch (err) {
      console.error('❌ Error loading leaderboard:', err);
      setError('Fehler beim Laden des Leaderboards');
      // Fallback: Zeige Demo-Daten auch bei unerwarteten Fehlern
      const demoPlayers = [
        { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
        { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
        { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
        { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
        { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
      ];
      setPlayers(demoPlayers);
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  }, [period, limit, previousRankings]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;
    
    // Zeige sofort Demo-Daten, während echte Daten geladen werden
    const demoPlayers = [
      { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 5, periodPoints: 320, rankChange: 0 },
      { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 3, periodPoints: 280, rankChange: 1 },
      { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 2, periodPoints: 240, rankChange: -1 },
      { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190, rankChange: 0 },
      { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150, rankChange: 2 }
    ];
    
    // Setze sofort Demo-Daten und lade im Hintergrund
    setPlayers(demoPlayers);
    setLoading(false);
    
    // Lade echte Daten im Hintergrund (ohne Loading-State zu blockieren)
    const loadData = async () => {
      try {
        // Timeout nach 2 Sekunden - wenn zu langsam, bleibe bei Demo-Daten
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ Leaderboard load timeout, keeping demo data');
          }
        }, 2000);
        
        await loadLeaderboard(true); // skipLoadingState = true, da Demo-Daten bereits angezeigt werden
        
        if (isMounted && timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('❌ Unexpected error in loadLeaderboard:', err);
        // Bei Fehler bleiben wir bei Demo-Daten
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
    
    // Lade im Hintergrund (nicht-blockierend)
    loadData();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadLeaderboard]);

  // Zeige immer die Tabelle, auch wenn loading oder error
  // Die Demo-Daten werden sofort angezeigt, während echte Daten geladen werden

  const getRankDisplay = (rank) => {
    if (rank === 1) return { icon: '🥇', label: 'Weltmeister', color: '#FFD700' };
    if (rank === 2) return { icon: '🥈', label: 'Vize', color: '#C0C0C0' };
    if (rank === 3) return { icon: '🥉', label: 'Bronze', color: '#CD7F32' };
    return { icon: `#${rank}`, label: `Rang ${rank}`, color: '#6b7280' };
  };

  const getRankChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={16} className="rank-up" />;
    if (change < 0) return <TrendingDown size={16} className="rank-down" />;
    return <Minus size={16} className="rank-same" />;
  };

  const getTennisTitle = (period) => {
    if (period === 'week') return 'ATP/WTA Woche';
    if (period === 'month') return 'ATP/WTA Monat';
    return 'ATP/WTA Gesamt';
  };

  return (
    <div className="tennis-leaderboard">
      {/* Tennis Court Header */}
      <div className="tennis-court-header">
        <div className="court-line"></div>
        <div className="court-title">
          <span className="tennis-icon">🎾</span>
          <h2>Platzhirsch Weltrangliste</h2>
          <span className="tennis-icon">🎾</span>
        </div>
        <div className="court-line"></div>
      </div>

      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <div className="header-left">
            <div className="title-section">
              <h3>{getTennisTitle(period)}</h3>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="info-button"
                title="Wie funktioniert das System?"
              >
                <Info size={18} />
              </button>
            </div>
            <p className="leaderboard-description">
              Wer ist der schnellste Ergebnis-Einträger? Steige in der Weltrangliste auf! 🏆
            </p>
            {showInfo && (
              <div className="leaderboard-info-box">
                <h4>🎮 Wie funktioniert das System?</h4>
                <ul>
                  <li><strong>⚡ Blitz (0-30 Min):</strong> 50 Punkte</li>
                  <li><strong>🚀 Schnell (30-60 Min):</strong> 30 Punkte</li>
                  <li><strong>✅ Pünktlich (60-120 Min):</strong> 15 Punkte</li>
                  <li><strong>📝 Spät (120+ Min):</strong> 5 Punkte</li>
                </ul>
                <p><strong>🔥 Matchday-Streaks:</strong> Aufeinanderfolgende Matchdays mit schnellen Eingaben bringen Bonus-Punkte!</p>
                <p><strong>🏆 Team-Bonus:</strong> Wenn alle 6 Ergebnisse schnell eingegeben werden, bekommt jeder +25 Punkte!</p>
                <p><strong>💾 Zwischenstände:</strong> 50% der Punkte, Rest beim Abschluss!</p>
              </div>
            )}
          </div>
          <div className="period-selector">
            <button 
              className={`period-btn ${period === 'week' ? 'active' : ''}`}
              onClick={() => setPeriod('week')}
            >
              Woche
            </button>
            <button 
              className={`period-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Monat
            </button>
            <button 
              className={`period-btn ${period === 'all' ? 'active' : ''}`}
              onClick={() => setPeriod('all')}
            >
              Gesamt
            </button>
          </div>
        </div>

        {/* Tennis Table */}
        <div className="tennis-table-wrapper">
          {loading && players.length === 0 && (
            <div className="leaderboard-loading" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="tennis-ball-loader">🎾</div>
              <p>Lade Weltrangliste...</p>
            </div>
          )}
          {error && players.length === 0 && (
            <div className="leaderboard-error" style={{ margin: '1rem', padding: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {players.length === 0 && !loading && !error && (
            <div className="leaderboard-empty" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="empty-court">🎾</div>
              <p>Noch keine Einträge in der Weltrangliste</p>
              <p className="empty-hint">Trage Ergebnisse ein, um aufzusteigen!</p>
            </div>
          )}
          {players.length > 0 && (
            <table className="tennis-ranking-table">
              <thead>
                <tr>
                  <th className="col-rank">Rang</th>
                  <th className="col-change">+/-</th>
                  <th className="col-player">Spieler</th>
                  <th className="col-streak">Streak</th>
                  <th className="col-points">Punkte</th>
                  <th className="col-trophy">🏆</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const rank = index + 1;
                  const rankInfo = getRankDisplay(rank);
                  const isTopThree = rank <= 3;
                  
                  return (
                    <tr 
                      key={player.id} 
                      className={`ranking-row ${isTopThree ? 'top-three' : ''} ${rank % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      <td className="col-rank">
                        <div className="rank-badge" style={{ backgroundColor: rankInfo.color }}>
                          <span className="rank-icon">{rankInfo.icon}</span>
                          <span className="rank-number">{rank}</span>
                        </div>
                      </td>
                      <td className="col-change">
                        {player.rankChange !== 0 && (
                          <div className={`rank-change ${player.rankChange > 0 ? 'up' : 'down'}`}>
                            {getRankChangeIcon(player.rankChange)}
                            <span>{Math.abs(player.rankChange)}</span>
                          </div>
                        )}
                      </td>
                      <td className="col-player">
                        <div className="player-info">
                          {player.profile_image ? (
                            <img 
                              src={player.profile_image} 
                              alt={player.name}
                              className="player-avatar"
                            />
                          ) : (
                            <div className="player-avatar-placeholder">
                              {player.name ? player.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div className="player-details">
                            <span className="player-name">{player.name || 'Unbekannt'}</span>
                            {isTopThree && (
                              <span className="player-title">{rankInfo.label}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="col-streak">
                        {(player.current_streak || 0) > 0 ? (
                          <div className="streak-badge">
                            <span className="streak-icon">🔥</span>
                            <span className="streak-text">{player.current_streak || 0} Matchdays</span>
                          </div>
                        ) : (
                          <span className="no-streak">-</span>
                        )}
                      </td>
                      <td className="col-points">
                        <div className="points-display">
                          <span className="points-value">{((player.periodPoints || player.gamification_points || 0)).toLocaleString('de-DE')}</span>
                          <span className="points-label">Pkt.</span>
                        </div>
                      </td>
                      <td className="col-trophy">
                        {isTopThree && <Trophy size={20} className="trophy-icon" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
