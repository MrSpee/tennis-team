import { useState } from 'react';
import { Trophy, Users, List } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Rankings.css';

function Rankings() {
  const { players } = useData();
  const [sortBy, setSortBy] = useState('tvm'); // 'tvm' or 'registered'

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

  // Registrierte Spieler aus Datenbank (aktive Spieler sortiert nach LK)
  const registeredPlayers = players
    .filter(p => p && p.name && p.is_active)
    .sort((a, b) => {
      if (!a.ranking || !b.ranking) return 0;
      const rankA = parseFloat(a.ranking.replace('LK ', '').trim()) || 99;
      const rankB = parseFloat(b.ranking.replace('LK ', '').trim()) || 99;
      return rankA - rankB;
    });

  const getRankingColor = (ranking) => {
    if (!ranking) return '#gray'; // Kein Ranking
    const lk = parseInt(ranking.replace('LK ', '').trim()) || 99;
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
            Angemeldete Spieler ({registeredPlayers.length})
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
        {sortBy === 'tvm' ? (
          // TVM Meldeliste - Hardcoded
          tvmMeldeliste.map((player) => (
            <div key={player.position} className="ranking-card card">
              <div className="ranking-position">
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#3b82f6', 
                  fontWeight: 'bold',
                  marginBottom: '0.25rem' 
                }}>
                  TVM
                </div>
                <div className="position-number">#{player.position}</div>
              </div>

              <div className="player-info">
                <h3>
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
                  <span className="points-badge" style={{ background: '#6b7280' }}>
                    {player.nation}
                  </span>
                </div>
              </div>

              <div className="ranking-details">
                <div className="detail-row">
                  <span className="detail-label">Position:</span>
                  <span className="detail-value">#{player.position} von 12</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Leistungsklasse:</span>
                  <span className="detail-value">LK {player.lk}</span>
                </div>
                {player.mf && (
                  <div className="detail-row">
                    <span className="detail-label">Rolle:</span>
                    <span className="detail-value">Mannschaftsführer</span>
                  </div>
                )}
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
            registeredPlayers.map((player, index) => (
              <div key={player.id} className="ranking-card card">
                <div className="ranking-position">
                  {index === 0 && <div className="trophy-icon">🏆</div>}
                  {index === 1 && <div className="trophy-icon">🥈</div>}
                  {index === 2 && <div className="trophy-icon">🥉</div>}
                  <div className="position-number">#{index + 1}</div>
                </div>

                <div className="player-info">
                  <h3>
                    {player.name}
                    {player.role === 'captain' && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#f59e0b' }}>⭐ Captain</span>}
                  </h3>
                  <div className="player-stats">
                    {player.ranking ? (
                      <span 
                        className="ranking-badge"
                        style={{ backgroundColor: getRankingColor(player.ranking) }}
                      >
                        {player.ranking}
                      </span>
                    ) : (
                      <span className="ranking-badge" style={{ backgroundColor: '#ccc' }}>
                        Kein LK
                      </span>
                    )}
                    <span className="points-badge" style={{ background: '#10b981' }}>
                      ✓ Angemeldet
                    </span>
                  </div>
                </div>

                <div className="ranking-details">
                  <div className="detail-row">
                    <span className="detail-label">Leistungsklasse:</span>
                    <span className="detail-value">{player.ranking || 'Nicht angegeben'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">In App registriert</span>
                  </div>
                </div>
              </div>
            ))
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
