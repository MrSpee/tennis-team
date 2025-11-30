import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import './Leaderboard.css';

/**
 * Leaderboard-Komponente für Gamification-Punkte
 */
export const Leaderboard = ({ period: initialPeriod = 'week', limit = 10 }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [period, limit]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
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

      // Lade Achievements für den Zeitraum
      const { data: achievements, error: achievementsError } = await supabase
        .from('player_achievements')
        .select('player_id, points, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Aggregiere Punkte pro Spieler
      const playerPoints = {};
      (achievements || []).forEach(achievement => {
        if (!playerPoints[achievement.player_id]) {
          playerPoints[achievement.player_id] = 0;
        }
        playerPoints[achievement.player_id] += achievement.points;
      });

      // Lade Spieler-Daten
      const playerIds = Object.keys(playerPoints);
      
      // 🎮 DEMO: Wenn keine Daten vorhanden, zeige Beispieldaten
      if (playerIds.length === 0) {
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 7, periodPoints: 320 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 5, periodPoints: 280 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 3, periodPoints: 240 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150 }
        ];
        setPlayers(demoPlayers);
        setLoading(false);
        return;
      }

      const { data: playersData, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, profile_image, gamification_points, current_streak')
        .in('id', playerIds)
        .order('gamification_points', { ascending: false })
        .limit(limit);

      if (playersError) throw playersError;

      // Kombiniere Daten
      const leaderboard = (playersData || []).map(player => ({
        ...player,
        periodPoints: playerPoints[player.id] || 0
      })).sort((a, b) => b.periodPoints - a.periodPoints);

      // 🎮 DEMO: Falls weniger als 5 Spieler, fülle mit Beispieldaten auf
      if (leaderboard.length < 5) {
        const demoPlayers = [
          { id: 'demo-1', name: 'Max Mustermann', profile_image: null, gamification_points: 450, current_streak: 7, periodPoints: 320 },
          { id: 'demo-2', name: 'Anna Schmidt', profile_image: null, gamification_points: 380, current_streak: 5, periodPoints: 280 },
          { id: 'demo-3', name: 'Tom Weber', profile_image: null, gamification_points: 320, current_streak: 3, periodPoints: 240 },
          { id: 'demo-4', name: 'Lisa Müller', profile_image: null, gamification_points: 290, current_streak: 2, periodPoints: 190 },
          { id: 'demo-5', name: 'Jan Becker', profile_image: null, gamification_points: 250, current_streak: 1, periodPoints: 150 }
        ];
        // Kombiniere echte Daten mit Demo-Daten
        const combined = [...leaderboard, ...demoPlayers.slice(leaderboard.length)];
        setPlayers(combined.slice(0, limit));
      } else {
        setPlayers(leaderboard);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Fehler beim Laden des Leaderboards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="leaderboard-loading">Lade Leaderboard...</div>;
  }

  if (error) {
    return <div className="leaderboard-error">{error}</div>;
  }

  if (players.length === 0) {
    return <div className="leaderboard-empty">Noch keine Einträge im Leaderboard</div>;
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h3>⚡ Schnell-Eingabe-Ranking</h3>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="leaderboard-info-button"
              title="Wie funktioniert das System?"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="leaderboard-description">
            Wer trägt Ergebnisse am schnellsten ein? Sammle Punkte für zeitnahe Eingaben und gewinne Preise! 🎁
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
              <p><strong>🔥 Streaks:</strong> Tägliche Eingaben bringen Bonus-Punkte!</p>
              <p><strong>🏆 Team-Bonus:</strong> Wenn alle 6 Ergebnisse schnell eingegeben werden, bekommt jeder +25 Punkte!</p>
              <p><strong>💾 Zwischenstände:</strong> 50% der Punkte, Rest beim Abschluss!</p>
            </div>
          )}
        </div>
        <div className="leaderboard-period">
          <button 
            className={period === 'week' ? 'active' : ''}
            onClick={() => setPeriod('week')}
          >
            Woche
          </button>
          <button 
            className={period === 'month' ? 'active' : ''}
            onClick={() => setPeriod('month')}
          >
            Monat
          </button>
          <button 
            className={period === 'all' ? 'active' : ''}
            onClick={() => setPeriod('all')}
          >
            Gesamt
          </button>
        </div>
      </div>
      <div className="leaderboard-list">
        {players.map((player, index) => (
          <div key={player.id} className="leaderboard-item">
            <div className="leaderboard-rank">{getRankIcon(index + 1)}</div>
            <div className="leaderboard-player">
              {player.profile_image && (
                <img 
                  src={player.profile_image} 
                  alt={player.name}
                  className="leaderboard-avatar"
                />
              )}
              <span className="leaderboard-name">{player.name}</span>
            </div>
            <div className="leaderboard-stats">
              {player.current_streak > 0 && (
                <span className="leaderboard-streak">🔥 {player.current_streak}</span>
              )}
              <span className="leaderboard-points">{player.periodPoints} Punkte</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

