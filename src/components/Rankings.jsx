import { useState } from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Rankings.css';

function Rankings() {
  const { players } = useData();
  const [sortBy, setSortBy] = useState('points'); // 'points' or 'ranking'

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === 'points') {
      return b.points - a.points;
    } else {
      // LK sorting: lower number = better ranking
      const rankA = parseInt(a.ranking.replace('LK ', ''));
      const rankB = parseInt(b.ranking.replace('LK ', ''));
      return rankA - rankB;
    }
  });

  const getRankingColor = (ranking) => {
    const lk = parseInt(ranking.replace('LK ', ''));
    if (lk <= 9) return '#10b981'; // Green
    if (lk <= 11) return '#3b82f6'; // Blue
    return '#f59e0b'; // Orange
  };

  return (
    <div className="rankings-page container">
      <header className="page-header fade-in">
        <div>
          <h1>Spieler-Rangliste</h1>
          <p>Offizielle Tennisverband Rankings</p>
        </div>
        <Trophy size={32} color="var(--primary)" />
      </header>

      <div className="rankings-controls fade-in">
        <div className="sort-buttons">
          <button
            className={`btn ${sortBy === 'points' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSortBy('points')}
          >
            <TrendingUp size={18} />
            Nach Punkten
          </button>
          <button
            className={`btn ${sortBy === 'ranking' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSortBy('ranking')}
          >
            <Award size={18} />
            Nach LK
          </button>
        </div>
      </div>

      <div className="rankings-info fade-in card">
        <h3>📊 Leistungsklassen (LK)</h3>
        <p>Die Leistungsklasse (LK) ist das offizielle Ranking-System des Deutschen Tennis Bundes (DTB). 
        Niedrigere Zahlen bedeuten ein höheres Spielniveau. LK 1-4 sind Profi-Niveau, 
        LK 5-25 Amateur-Niveau.</p>
      </div>

      <div className="rankings-list fade-in">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className="ranking-card card">
            <div className="ranking-position">
              {index === 0 && sortBy === 'points' && <div className="trophy-icon">🏆</div>}
              {index === 1 && sortBy === 'points' && <div className="trophy-icon">🥈</div>}
              {index === 2 && sortBy === 'points' && <div className="trophy-icon">🥉</div>}
              <div className="position-number">#{index + 1}</div>
            </div>

            <div className="player-info">
              <h3>{player.name}</h3>
              <div className="player-stats">
                <span 
                  className="ranking-badge"
                  style={{ backgroundColor: getRankingColor(player.ranking) }}
                >
                  {player.ranking}
                </span>
                <span className="points-badge">
                  {player.points} Punkte
                </span>
              </div>
            </div>

            <div className="ranking-details">
              <div className="detail-row">
                <span className="detail-label">Leistungsklasse:</span>
                <span className="detail-value">{player.ranking}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Punkte:</span>
                <span className="detail-value">{player.points}</span>
              </div>
            </div>
          </div>
        ))}
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
