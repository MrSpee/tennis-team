import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Trophy, Zap, Target, Gift } from 'lucide-react';
import { Leaderboard } from './gamification/Leaderboard';
import { PointsDisplay } from './gamification/PointsDisplay';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './LeaderboardPage.css';

/**
 * Leaderboard-Seite mit allen Details zum Gamification-System
 */
export const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [playerData, setPlayerData] = useState(null);

  useEffect(() => {
    if (player?.id) {
      const loadPlayerData = async () => {
        const { data, error } = await supabase
          .from('players_unified')
          .select('gamification_points, current_streak')
          .eq('id', player.id)
          .single();
        
        if (!error && data) {
          setPlayerData(data);
        }
      };
      loadPlayerData();
    }
  }, [player?.id]);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-page-header">
        <button 
          onClick={() => navigate('/')}
          className="back-button"
        >
          <ArrowLeft size={16} />
          Zurück
        </button>
        <h1>🎾 Schnell-Eingabe-Ranking</h1>
      </div>

      <div className="leaderboard-page-content">
        {/* Eigene Punkte-Anzeige */}
        {player && playerData && (
          <div className="leaderboard-page-section">
            <PointsDisplay 
              points={playerData.gamification_points || 0}
              streak={playerData.current_streak ? { currentStreak: playerData.current_streak } : null}
              showDetails={true}
            />
          </div>
        )}

        {/* Leaderboard */}
        <div className="leaderboard-page-section">
          <Leaderboard period="week" limit={20} />
        </div>

        {/* System-Erklärung */}
        <div className="leaderboard-page-section">
          <div className="info-card">
            <div className="info-card-header">
              <Info size={20} />
              <h2>Wie funktioniert das System?</h2>
            </div>
            
            <div className="info-content">
              <div className="info-section">
                <div className="info-icon">
                  <Zap size={24} />
                </div>
                <div>
                  <h3>⚡ Blitz-Eingabe (0-30 Min)</h3>
                  <p>50 Punkte für Eingaben innerhalb von 30 Minuten nach erwartetem Spielende</p>
                </div>
              </div>

              <div className="info-section">
                <div className="info-icon">
                  <Target size={24} />
                </div>
                <div>
                  <h3>🚀 Schnell-Eingabe (30-60 Min)</h3>
                  <p>30 Punkte für Eingaben zwischen 30 und 60 Minuten nach erwartetem Spielende</p>
                </div>
              </div>

              <div className="info-section">
                <div className="info-icon">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3>✅ Pünktlich (60-120 Min)</h3>
                  <p>15 Punkte für Eingaben zwischen 60 und 120 Minuten nach erwartetem Spielende</p>
                </div>
              </div>

              <div className="info-section">
                <div className="info-icon">
                  <Gift size={24} />
                </div>
                <div>
                  <h3>📝 Spät (120+ Min)</h3>
                  <p>5 Punkte für Eingaben nach 120 Minuten - besser spät als nie!</p>
                </div>
              </div>
            </div>

            <div className="info-highlight">
              <h4>🔥 Streaks</h4>
              <p>Tägliche Eingaben bringen Bonus-Punkte! Halte deinen Streak am Laufen!</p>
            </div>

            <div className="info-highlight">
              <h4>🏆 Team-Bonus</h4>
              <p>Wenn alle 6 Ergebnisse schnell eingegeben werden, bekommt jeder +25 Punkte!</p>
            </div>

            <div className="info-highlight">
              <h4>💾 Zwischenstände</h4>
              <p>Für Zwischenstände gibt es 50% der Punkte, der Rest wird beim Abschluss vergeben!</p>
            </div>

            <div className="info-highlight">
              <h4>🎁 Preise</h4>
              <p>Top-Performer erhalten echte Preise wie Tennisbälle, Griffbänder und mehr!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;

