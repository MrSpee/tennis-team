import { useState } from 'react';
import { Table, TrendingUp, TrendingDown, Edit2, Save, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './LeagueTable.css';

function LeagueTable() {
  const { isCaptain } = useAuth();
  const { leagueStandings, teamInfo, matches } = useData();
  const [editingMatch, setEditingMatch] = useState(null);
  
  // Initialisiere Spielergebnisse (4 Einzel + 2 Doppel für Winter)
  const getInitialResults = (match) => {
    const numGames = match.season === 'winter' ? 6 : 8; // Winter: 4 Einzel + 2 Doppel, Sommer: 6 Einzel + 2 Doppel
    return {
      games: Array(numGames).fill(null).map((_, i) => ({
        id: i + 1,
        type: i < (match.season === 'winter' ? 4 : 6) ? 'Einzel' : 'Doppel',
        set1_us: '',
        set1_them: '',
        set2_us: '',
        set2_them: '',
        set3_us: '', // Champions Tiebreak
        set3_them: '',
        result: null // 'win', 'loss'
      })),
      totalWins: 0,
      totalLosses: 0,
      notes: ''
    };
  };
  
  const [matchResults, setMatchResults] = useState({});

  const getPositionTrend = (position) => {
    // Mock trend data - in real app this would compare with previous standings
    if (position <= 2) return 'up';
    if (position >= 5) return 'down';
    return 'same';
  };

  const getRowClass = (team) => {
    if (team === 'Your Team') return 'your-team';
    return '';
  };

  return (
    <div className="league-page container">
      <header className="page-header fade-in">
        <div>
          <h1>Aktuelle Saison</h1>
          <p>
            {teamInfo ? (
              `${teamInfo.league} ${teamInfo.group} - ${teamInfo.region}`
            ) : (
              'Winterrunde 2025/26'
            )}
          </p>
        </div>
        <Table size={32} color="var(--primary)" />
      </header>

      {/* Spielplan-Übersicht */}
      <section className="season-overview fade-in" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>📅 Spielplan</h2>
          {teamInfo?.tvmLink && (
            <a
              href={teamInfo.tvmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              <ExternalLink size={16} />
              TVM Spielbetrieb
            </a>
          )}
        </div>

        {matches.length > 0 ? (
          <div className="schedule-table card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600' }}>Datum</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '600' }}>Gegner</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600' }}>Ort</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600' }}>Ergebnis</th>
                </tr>
              </thead>
              <tbody>
                {matches
                  .sort((a, b) => a.date - b.date)
                  .map((match) => {
                    const isPast = match.date < new Date();
                    const availableCount = Object.values(match.availability || {})
                      .filter(a => a.status === 'available').length;
                    
                    return (
                      <tr 
                        key={match.id} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          background: isPast ? '#f9fafb' : 'white'
                        }}
                      >
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                            {match.date.toLocaleDateString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {match.date.toLocaleDateString('de-DE', { weekday: 'short' })}, {match.date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{match.opponent}</div>
                          {match.venue && (
                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                              📍 {match.venue}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: match.location === 'Home' ? '#dbeafe' : '#fef3c7',
                            color: match.location === 'Home' ? '#1e40af' : '#92400e'
                          }}>
                            {match.location === 'Home' ? '🏠 Heim' : '✈️ Auswärts'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {isPast ? (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              background: '#d1fae5',
                              color: '#065f46',
                              fontWeight: '500'
                            }}>
                              ✓ Gespielt
                            </span>
                          ) : (
                            <div style={{ fontSize: '0.75rem' }}>
                              <div style={{ fontWeight: '500', color: '#10b981' }}>
                                {availableCount} verfügbar
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {isPast ? (
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                              - : -
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#999' }}>
                              Ausstehend
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>Noch keine Spiele für diese Saison angelegt.</p>
          </div>
        )}
      </section>

      {/* Alle Matches mit Ergebnis-Eintragung - für Captain */}
      {isCaptain && matches.length > 0 && (
        <section className="played-matches fade-in" style={{ marginBottom: '2rem' }}>
          <h2>🎾 Medenspiele - Ergebnisse</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Tragen Sie die Einzelergebnisse aller Spiele ein (4 Einzel + 2 Doppel im Winter)
          </p>
          <div className="matches-results-list">
            {matches
              .sort((a, b) => b.date - a.date)
              .map(match => {
                const currentResults = matchResults[match.id] || getInitialResults(match);
                
                return (
                  <div key={match.id} className="match-result-card card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{match.opponent}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.25rem 0' }}>
                          {new Date(match.date).toLocaleDateString('de-DE', { 
                            weekday: 'short',
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })} • {match.location === 'Home' ? 'Heim' : 'Auswärts'} • {match.season === 'winter' ? 'Winter (4+2)' : 'Sommer (6+2)'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (editingMatch === match.id) {
                            setEditingMatch(null);
                          } else {
                            setEditingMatch(match.id);
                            if (!matchResults[match.id]) {
                              setMatchResults({ ...matchResults, [match.id]: getInitialResults(match) });
                            }
                          }
                        }}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        {editingMatch === match.id ? <X size={18} /> : <Edit2 size={18} />}
                        {editingMatch === match.id ? ' Schließen' : ' Ergebnisse'}
                      </button>
                    </div>

                    {editingMatch === match.id && (
                      <div className="result-form" style={{ 
                        marginTop: '1.5rem', 
                        padding: '1.5rem', 
                        background: '#f9fafb', 
                        borderRadius: '8px' 
                      }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                          📝 Einzelergebnisse eintragen
                        </h4>
                        
                        {/* Einzel-Spiele */}
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h5 style={{ marginBottom: '0.75rem', color: '#3b82f6' }}>
                            🎾 Einzel ({match.season === 'winter' ? '4' : '6'} Spiele)
                          </h5>
                          {currentResults.games
                            .filter(g => g.type === 'Einzel')
                            .map((game, idx) => (
                              <div key={game.id} style={{
                                padding: '0.75rem',
                                background: 'white',
                                borderRadius: '6px',
                                marginBottom: '0.75rem',
                                border: '1px solid #e5e7eb'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                  Einzel {idx + 1}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                  {/* Satz 1 */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Satz 1
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Satz 2 */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Satz 2
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Champions Tiebreak (Satz 3) */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Ch-TB (opt.)
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Doppel-Spiele */}
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h5 style={{ marginBottom: '0.75rem', color: '#10b981' }}>
                            👥 Doppel (2 Spiele)
                          </h5>
                          {currentResults.games
                            .filter(g => g.type === 'Doppel')
                            .map((game, idx) => (
                              <div key={game.id} style={{
                                padding: '0.75rem',
                                background: 'white',
                                borderRadius: '6px',
                                marginBottom: '0.75rem',
                                border: '1px solid #e5e7eb'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                  Doppel {idx + 1}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                  {/* Satz 1 */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Satz 1
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Satz 2 */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Satz 2
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="7"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Champions Tiebreak */}
                                  <div>
                                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                                      Ch-TB (opt.)
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        placeholder="Wir"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                      <span>:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        placeholder="Sie"
                                        style={{ width: '50%', padding: '0.25rem', textAlign: 'center' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Zusammenfassung */}
                        <div style={{
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '8px',
                          border: '2px solid #3b82f6',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr auto 1fr', 
                            alignItems: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              {currentResults.totalWins}
                            </div>
                            <div style={{ padding: '0 1rem', color: '#666' }}>:</div>
                            <div style={{ textAlign: 'center' }}>
                              {currentResults.totalLosses}
                            </div>
                          </div>
                          <div style={{ 
                            textAlign: 'center', 
                            fontSize: '0.85rem', 
                            color: '#666',
                            marginTop: '0.5rem'
                          }}>
                            Gesamtergebnis
                          </div>
                        </div>

                        {/* Notizen */}
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                            📝 Notizen zum Medentag (optional)
                          </label>
                          <textarea
                            value={currentResults.notes}
                            onChange={(e) => {
                              setMatchResults({
                                ...matchResults,
                                [match.id]: { ...currentResults, notes: e.target.value }
                              });
                            }}
                            placeholder="z.B. Wetter, Platzqualität, besondere Vorkommnisse..."
                            rows="2"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            alert('✅ Ergebnis gespeichert! (Speicherung in Supabase wird noch implementiert)');
                            setEditingMatch(null);
                          }}
                          className="btn btn-success"
                          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                        >
                          <Save size={18} />
                          Alle Ergebnisse speichern
                        </button>
                        
                        <p style={{ 
                          fontSize: '0.75rem', 
                          color: '#666', 
                          marginTop: '0.5rem',
                          textAlign: 'center'
                        }}>
                          💡 Tipp: Champions Tiebreak nur ausfüllen wenn 1:1 nach 2 Sätzen
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Liga-Tabelle */}
      <section className="league-table-section fade-in">
        <h2>📊 Tabelle</h2>

      <div className="league-info fade-in card">
        <h3>ℹ️ Über die Liga</h3>
        <p>Winterrunde 2025/26 - Bezirksliga Gruppe A</p>
        <div className="info-stats">
          <div className="info-stat">
            <span className="stat-label">Spieltag:</span>
            <span className="stat-value">8 von 10</span>
          </div>
          <div className="info-stat">
            <span className="stat-label">Teams:</span>
            <span className="stat-value">{leagueStandings.length}</span>
          </div>
        </div>
      </div>

      <div className="table-container fade-in">
        <table className="league-table">
          <thead>
            <tr>
              <th className="position-col">Pos</th>
              <th className="team-col">Team</th>
              <th className="stat-col">Sp</th>
              <th className="stat-col">S</th>
              <th className="stat-col">N</th>
              <th className="stat-col">Pkt</th>
            </tr>
          </thead>
          <tbody>
            {leagueStandings.map((team) => {
              const trend = getPositionTrend(team.position);
              return (
                <tr key={team.position} className={getRowClass(team.team)}>
                  <td className="position-col">
                    <div className="position-cell">
                      <span className="position">{team.position}</span>
                      {trend === 'up' && <TrendingUp size={14} className="trend-up" />}
                      {trend === 'down' && <TrendingDown size={14} className="trend-down" />}
                    </div>
                  </td>
                  <td className="team-col">
                    <div className="team-name">
                      {team.team}
                      {team.team === 'Your Team' && (
                        <span className="team-badge">Dein Team</span>
                      )}
                    </div>
                  </td>
                  <td className="stat-col">{team.matches}</td>
                  <td className="stat-col stat-wins">{team.wins}</td>
                  <td className="stat-col stat-losses">{team.losses}</td>
                  <td className="stat-col stat-points">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-legend fade-in card">
        <h3>📖 Legende</h3>
        <div className="legend-grid">
          <div className="legend-item">
            <strong>Pos</strong>
            <span>Position</span>
          </div>
          <div className="legend-item">
            <strong>Sp</strong>
            <span>Spiele</span>
          </div>
          <div className="legend-item">
            <strong>S</strong>
            <span>Siege</span>
          </div>
          <div className="legend-item">
            <strong>N</strong>
            <span>Niederlagen</span>
          </div>
          <div className="legend-item">
            <strong>Pkt</strong>
            <span>Punkte</span>
          </div>
        </div>
      </div>

      <div className="standings-note fade-in card">
        <p><strong>Hinweis:</strong> Die Tabelle zeigt den aktuellen Stand der Saison. 
        Bei einem Sieg gibt es 2 Punkte, bei einer Niederlage 0 Punkte. Ein Unentschieden gibt es im Tennis nicht.</p>
      </div>
      </section>
    </div>
  );
}

export default LeagueTable;
