import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, CheckCircle, AlertTriangle, XCircle, Clock, Trophy, Target } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Dashboard.css';

function MatchdayPlanner() {
  const navigate = useNavigate();
  const { matches, players } = useData();
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  // Filtere nur zukünftige Matches und sortiere nach Datum
  const upcomingMatches = useMemo(() => {
    const now = new Date();
    return matches
      .filter(match => new Date(match.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [matches]);

  // Berechne Verfügbarkeits-Status für ein Match
  const getMatchAvailability = (match) => {
    if (!match.availability) {
      return {
        available: [],
        unavailable: [],
        pending: players.filter(p => p.is_active),
        totalAvailable: 0,
        totalUnavailable: 0,
        totalPending: players.filter(p => p.is_active).length
      };
    }

    const available = [];
    const unavailable = [];
    const pending = [];

    players.filter(p => p.is_active).forEach(player => {
      const status = match.availability[player.id]?.status;
      if (status === 'available') {
        available.push(player);
      } else if (status === 'unavailable') {
        unavailable.push(player);
      } else {
        pending.push(player);
      }
    });

    return {
      available,
      unavailable,
      pending,
      totalAvailable: available.length,
      totalUnavailable: unavailable.length,
      totalPending: pending.length
    };
  };

  // Berechne Status-Badge
  const getStatusBadge = (match, availability) => {
    const playersNeeded = match.playersNeeded || 10;
    const { totalAvailable } = availability;
    const daysUntilMatch = Math.ceil((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24));

    if (totalAvailable >= playersNeeded) {
      return {
        icon: <CheckCircle size={20} />,
        text: 'Vollständig',
        className: 'status-complete',
        color: '#10b981'
      };
    } else if (totalAvailable >= playersNeeded - 2) {
      return {
        icon: <Clock size={20} />,
        text: 'Fast vollständig',
        className: 'status-almost',
        color: '#3b82f6'
      };
    } else if (totalAvailable < 6 && daysUntilMatch <= 7) {
      return {
        icon: <AlertTriangle size={20} />,
        text: 'Kritisch',
        className: 'status-critical',
        color: '#ef4444'
      };
    } else if (totalAvailable < 6) {
      return {
        icon: <XCircle size={20} />,
        text: 'Unzureichend',
        className: 'status-insufficient',
        color: '#f59e0b'
      };
    } else {
      return {
        icon: <Users size={20} />,
        text: 'Akzeptabel',
        className: 'status-ok',
        color: '#6b7280'
      };
    }
  };

  // Generiere Aufstellungs-Vorschläge
  const generateLineupSuggestions = (availablePlayers) => {
    // Sortiere verfügbare Spieler nach LK (niedrigere LK = besser)
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      const lkA = parseLK(a.current_lk || a.season_start_lk || a.ranking);
      const lkB = parseLK(b.current_lk || b.season_start_lk || b.ranking);
      
      // Debug: Log LK-Parsing für Spieler ohne gültige LK
      if (lkA === 99) {
        console.log(`⚠️ Keine gültige LK für ${a.name}:`, {
          current_lk: a.current_lk,
          season_start_lk: a.season_start_lk,
          ranking: a.ranking
        });
      }
      
      return lkA - lkB;
    });

    // Einzelspieler (4 beste)
    const singles = sortedPlayers.slice(0, 4).map((player, index) => ({
      position: index + 1,
      player,
      type: 'Einzel'
    }));

    // Doppel (beste Kombinationen)
    const doubles = [];
    if (sortedPlayers.length >= 4) {
      doubles.push({
        position: 1,
        player1: sortedPlayers[0],
        player2: sortedPlayers[1],
        type: 'Doppel',
        avgLK: (parseLK(sortedPlayers[0].current_lk || sortedPlayers[0].ranking) + 
                parseLK(sortedPlayers[1].current_lk || sortedPlayers[1].ranking)) / 2
      });
      
      doubles.push({
        position: 2,
        player1: sortedPlayers[2],
        player2: sortedPlayers[3],
        type: 'Doppel',
        avgLK: (parseLK(sortedPlayers[2].current_lk || sortedPlayers[2].ranking) + 
                parseLK(sortedPlayers[3].current_lk || sortedPlayers[3].ranking)) / 2
      });
    }

    return { singles, doubles };
  };

  // Parse LK-String zu Nummer (robuster)
  const parseLK = (lkString) => {
    if (!lkString) return 99;
    // Entferne alle nicht-numerischen Zeichen außer Punkt und Komma
    const cleanString = String(lkString).replace(/[^\d.,]/g, '');
    // Ersetze Komma durch Punkt
    const normalized = cleanString.replace(',', '.');
    const parsed = parseFloat(normalized);
    // Validiere Ergebnis (LK sollte zwischen 1 und 25 liegen)
    return (!isNaN(parsed) && parsed >= 1 && parsed <= 25) ? parsed : 99;
  };

  // Formatiere Datum
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Berechne Tage bis Match
  const getDaysUntilMatch = (dateString) => {
    const days = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Heute';
    if (days === 1) return 'Morgen';
    return `In ${days} Tagen`;
  };

  const selectedMatch = upcomingMatches.find(m => m.id === selectedMatchId);
  const selectedAvailability = selectedMatch ? getMatchAvailability(selectedMatch) : null;
  const selectedLineup = selectedAvailability ? generateLineupSuggestions(selectedAvailability.available) : null;

  return (
    <div className="dashboard container">
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">🎯 Aufstellungs-Assistent</h1>
      </div>

      {/* Übersicht kommende Matchdays */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Kommende Matchdays</div>
          <div className="match-count-badge">{upcomingMatches.length} Spiele</div>
        </div>

        <div className="season-content">
          {upcomingMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem' }} />
              <p>Keine kommenden Matchdays geplant.</p>
            </div>
          ) : (
            <div className="season-matches">
              {upcomingMatches.map(match => {
                const availability = getMatchAvailability(match);
                const status = getStatusBadge(match, availability);
                const playersNeeded = match.playersNeeded || 10;

                return (
                  <div 
                    key={match.id} 
                    className="match-result-card"
                    onClick={() => setSelectedMatchId(match.id)}
                    style={{ 
                      cursor: 'pointer',
                      borderLeft: selectedMatchId === match.id ? '4px solid #0ea5e9' : 'none'
                    }}
                  >
                    {/* Match Header */}
                    <div className="match-info-row" style={{ marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                          {match.opponent}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          <span>{formatDate(match.date)}</span>
                          <span style={{ margin: '0 0.5rem' }}>•</span>
                          <span>{getDaysUntilMatch(match.date)}</span>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div 
                        className="improvement-badge-top"
                        style={{ backgroundColor: status.color }}
                      >
                        <span className="badge-icon">{status.icon}</span>
                        <span className="badge-value">{status.text}</span>
                      </div>
                    </div>

                    {/* Verfügbarkeits-Übersicht */}
                    <div className="match-info-row">
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} color="#10b981" />
                          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            {availability.totalAvailable}/{playersNeeded} Zusagen
                          </span>
                        </div>
                        
                        {availability.totalPending > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} color="#f59e0b" />
                            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                              {availability.totalPending} Ausstehend
                            </span>
                          </div>
                        )}
                        
                        {availability.totalUnavailable > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <XCircle size={16} color="#ef4444" />
                            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                              {availability.totalUnavailable} Absagen
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail-Ansicht für ausgewähltes Match */}
      {selectedMatch && selectedAvailability && (
        <>
          {/* Verfügbare Spieler */}
          <div className="fade-in lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">Verfügbare Spieler</div>
              <div className="match-count-badge">
                {selectedAvailability.totalAvailable} Spieler
              </div>
            </div>

            <div className="season-content">
              {selectedAvailability.available.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <Users size={48} style={{ margin: '0 auto 1rem' }} />
                  <p>Noch keine Zusagen vorhanden.</p>
                </div>
              ) : (
                <div className="personality-grid">
                  {selectedAvailability.available
                    .sort((a, b) => {
                      const lkA = parseLK(a.current_lk || a.season_start_lk || a.ranking);
                      const lkB = parseLK(b.current_lk || b.season_start_lk || b.ranking);
                      return lkA - lkB;
                    })
                    .map((player, index) => (
                      <div 
                        key={player.id} 
                        className="personality-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
                      >
                        <div className="personality-icon">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎾'}
                        </div>
                        <div className="personality-content">
                          <h4>{player.name}</h4>
                          <p style={{ margin: 0 }}>
                            <strong>
                              {(() => {
                                const lk = player.current_lk || player.season_start_lk || player.ranking;
                                if (!lk) return 'LK ?';
                                // Stelle sicher, dass "LK" im String ist
                                return lk.includes('LK') ? lk : `LK ${lk}`;
                              })()}
                            </strong>
                            {player.role === 'captain' && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>⭐ MF</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Empfohlene Aufstellung */}
          {selectedLineup && selectedAvailability.available.length >= 4 && (
            <div className="fade-in lk-card-full">
              <div className="formkurve-header">
                <div className="formkurve-title">🤖 Empfohlene Aufstellung</div>
                <div className="match-count-badge">
                  <Trophy size={14} style={{ marginRight: '0.25rem' }} />
                  Auto-generiert
                </div>
              </div>

              <div className="season-content">
                {/* Einzel */}
                {selectedLineup.singles.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.9rem', 
                      fontWeight: '700',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Einzel
                    </h3>
                    <div className="moments-grid">
                      {selectedLineup.singles.map(lineup => (
                        <div key={lineup.position} className="moment-card positive">
                          <div className="moment-icon">
                            {lineup.position === 1 ? '1️⃣' : 
                             lineup.position === 2 ? '2️⃣' : 
                             lineup.position === 3 ? '3️⃣' : '4️⃣'}
                          </div>
                          <div className="moment-content">
                            <h4>Einzel {lineup.position}</h4>
                            <p style={{ margin: 0 }}>
                              <strong>{lineup.player.name}</strong><br />
                              <span style={{ fontSize: '0.9rem', color: '#059669' }}>
                                {lineup.player.current_lk || lineup.player.season_start_lk || lineup.player.ranking}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doppel */}
                {selectedLineup.doubles.length > 0 && (
                  <div>
                    <h3 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.9rem', 
                      fontWeight: '700',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Doppel
                    </h3>
                    <div className="moments-grid">
                      {selectedLineup.doubles.map(lineup => (
                        <div key={lineup.position} className="moment-card dream">
                          <div className="moment-icon">
                            {lineup.position === 1 ? '🥇' : '🥈'}
                          </div>
                          <div className="moment-content">
                            <h4>Doppel {lineup.position}</h4>
                            <p style={{ margin: 0 }}>
                              <strong>{lineup.player1.name}</strong><br />
                              <span style={{ fontSize: '0.85rem', color: '#7c3aed' }}>
                                {lineup.player1.current_lk || lineup.player1.season_start_lk || lineup.player1.ranking}
                              </span>
                              <br />
                              <strong>{lineup.player2.name}</strong><br />
                              <span style={{ fontSize: '0.85rem', color: '#7c3aed' }}>
                                {lineup.player2.current_lk || lineup.player2.season_start_lk || lineup.player2.ranking}
                              </span>
                              <br />
                              <span style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem', display: 'inline-block' }}>
                                Ø LK: {lineup.avgLK.toFixed(1)}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ausstehende & Absagen */}
          {(selectedAvailability.pending.length > 0 || selectedAvailability.unavailable.length > 0) && (
            <div className="fade-in lk-card-full">
              <div className="formkurve-header">
                <div className="formkurve-title">Weitere Spieler</div>
              </div>

              <div className="season-content">
                {/* Ausstehend */}
                {selectedAvailability.pending.length > 0 && (
                  <div style={{ marginBottom: selectedAvailability.unavailable.length > 0 ? '1.5rem' : 0 }}>
                    <h3 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.9rem', 
                      fontWeight: '700',
                      color: '#f59e0b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      ⏳ Ausstehende Rückmeldungen ({selectedAvailability.pending.length})
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedAvailability.pending.map(player => (
                        <span 
                          key={player.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#78350f',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Absagen */}
                {selectedAvailability.unavailable.length > 0 && (
                  <div>
                    <h3 style={{ 
                      margin: '0 0 0.75rem 0', 
                      fontSize: '0.9rem', 
                      fontWeight: '700',
                      color: '#ef4444',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      ❌ Absagen ({selectedAvailability.unavailable.length})
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedAvailability.unavailable.map(player => (
                        <span 
                          key={player.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#7f1d1d',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MatchdayPlanner;
