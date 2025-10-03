import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Users, MessageCircle, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Matches.css';

function Matches() {
  const { player } = useAuth();
  const { matches, updateMatchAvailability } = useData();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [comment, setComment] = useState('');

  const upcomingMatches = matches
    .filter(m => m.date > new Date())
    .sort((a, b) => a.date - b.date);

  const pastMatches = matches
    .filter(m => m.date <= new Date())
    .sort((a, b) => b.date - a.date);

  const handleAvailability = async (matchId, status) => {
    if (!player?.id) {
      alert('❌ Kein Spieler-Profil gefunden. Bitte neu einloggen.');
      return;
    }

    console.log('🔵 Setting availability - matchId:', matchId, 'playerId:', player.id, 'status:', status);
    
    const result = await updateMatchAvailability(matchId, player.id, status, comment);
    
    if (result.success) {
      console.log('✅ Availability set successfully');
      setComment('');
      setSelectedMatch(null);
    } else {
      console.error('❌ Error setting availability:', result.error);
      alert('❌ Fehler: ' + result.error);
    }
  };

  const getAvailabilityStatus = (match) => {
    // Suche nach Verfügbarkeit für den aktuellen Spieler (nach playerId)
    if (!player?.id || !match.availability) return null;
    
    // availability ist jetzt ein Object mit playerIds als Keys
    return match.availability[player.id];
  };

  return (
    <div className="matches-page container">
      <header className="page-header fade-in">
        <h1>Meine Verfügbarkeit</h1>
        <p>Gib deine Verfügbarkeit für die kommenden Spiele an</p>
      </header>

      <section className="matches-section fade-in">
        <h2>Kommende Spiele ({upcomingMatches.length})</h2>
        
        {upcomingMatches.length > 0 ? (
          <div className="matches-list">
            {upcomingMatches.map(match => {
              const myStatus = getAvailabilityStatus(match);
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;

              const availablePlayers = Object.entries(match.availability || {})
                .filter(([, data]) => data.status === 'available')
                .map(([, data]) => data.playerName)
                .filter(name => name && name !== 'Unbekannt');
              
              const missingPlayers = match.playersNeeded - availableCount;

              return (
                <div key={match.id} className="match-card card" style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {/* Gegner */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                        {match.opponent}
                      </h3>
                      <span className={`season-badge ${match.season}`} style={{ fontSize: '0.7rem' }}>
                        {match.season === 'winter' ? 'Winter' : 'Sommer'}
                      </span>
                    </div>
                    
                    {/* Es spielen: */}
                    {availablePlayers.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#065f46', marginBottom: '0.5rem' }}>
                        Es spielen: {availablePlayers.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Status-Meldung */}
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    background: availableCount >= match.playersNeeded ? '#d1fae5' : availableCount > 0 ? '#fef3c7' : '#fee2e2',
                    borderRadius: '6px',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: availableCount >= match.playersNeeded ? '#065f46' : availableCount > 0 ? '#92400e' : '#991b1b'
                    }}>
                      {availableCount >= match.playersNeeded 
                        ? '✅ Wir sind ausreichend! Der MF darf sich seine Premium-Mannschaft zusammenstellen.'
                        : availableCount > 0
                        ? `⚠️ Es fehlen noch ${missingPlayers} Spieler!`
                        : '❌ Noch keine Rückmeldungen!'
                      }
                    </div>
                  </div>

                  {/* Dein Feedback */}
                  {myStatus && (
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: myStatus.status === 'available' ? '#d1fae5' : '#fee2e2',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      border: `2px solid ${myStatus.status === 'available' ? '#10b981' : '#ef4444'}`
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '600', marginBottom: '0.25rem' }}>
                        DEIN FEEDBACK:
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '600',
                        color: myStatus.status === 'available' ? '#065f46' : '#991b1b'
                      }}>
                        {myStatus.status === 'available' ? '✓ Verfügbar' : myStatus.status === 'maybe' ? '? Vielleicht' : '✗ Nicht verfügbar'}
                      </div>
                      {myStatus.comment && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          💬 {myStatus.comment}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spiel-Details */}
                  <div className="match-details-grid" style={{ marginBottom: '0.75rem' }}>
                    <div className="detail-item">
                      <Calendar size={18} />
                      <span>{format(match.date, 'EEEE, dd. MMMM yyyy', { locale: de })}</span>
                    </div>
                    <div className="detail-item">
                      <Users size={18} />
                      <span>{format(match.date, 'HH:mm', { locale: de })} Uhr</span>
                    </div>
                    <div className="detail-item">
                      <MapPin size={18} />
                      <span>{match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}</span>
                    </div>
                    {match.venue && (
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <MapPin size={18} />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none',
                            fontWeight: '500'
                          }}
                        >
                          📍 {match.venue}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="availability-actions">
                    {selectedMatch === match.id ? (
                      <div className="availability-form">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Optional: Kommentar hinzufügen (z.B. 'Bin unsicher wegen Arbeit')"
                          rows="2"
                        />
                        <div className="form-buttons">
                          <button
                            onClick={() => handleAvailability(match.id, 'available')}
                            className="btn btn-success"
                          >
                            <Check size={18} />
                            Verfügbar
                          </button>
                          <button
                            onClick={() => handleAvailability(match.id, 'unavailable')}
                            className="btn btn-danger"
                          >
                            <X size={18} />
                            Nicht verfügbar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMatch(null);
                              setComment('');
                            }}
                            className="btn btn-secondary"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedMatch(match.id)}
                        className="btn btn-primary btn-full"
                      >
                        {myStatus ? 'Verfügbarkeit ändern' : 'Verfügbarkeit angeben'}
                      </button>
                    )}
                  </div>

                  {Object.keys(match.availability || {}).length > 0 && (
                    <details className="availability-details">
                      <summary>Feedback Spieler ({Object.keys(match.availability).length})</summary>
                      <div className="availability-list">
                        {Object.entries(match.availability).map(([playerId, data]) => (
                          <div key={playerId} className="availability-item">
                            <div className="availability-name">
                              <span className={`status-dot ${data.status}`}></span>
                              {data.playerName || 'Unbekannter Spieler'}
                            </div>
                            <div className="availability-status-text">
                              {data.status === 'available' ? 'Verfügbar' : data.status === 'maybe' ? 'Vielleicht' : 'Nicht verfügbar'}
                            </div>
                            {data.comment && (
                              <div className="availability-comment">
                                <MessageCircle size={14} />
                                {data.comment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <Calendar size={48} color="var(--gray-400)" />
            <p>Keine kommenden Spiele geplant</p>
          </div>
        )}
      </section>

      {pastMatches.length > 0 && (
        <section className="matches-section fade-in">
          <h2>Vergangene Spiele ({pastMatches.length})</h2>
          <div className="matches-list">
            {pastMatches.map(match => (
              <div key={match.id} className="match-card card past-match">
                <div className="match-header">
                  <h3>{match.opponent}</h3>
                  <span className="past-badge">Beendet</span>
                </div>
                <div className="match-details-grid">
                  <div className="detail-item">
                    <Calendar size={18} />
                    <span>{format(match.date, 'dd.MM.yyyy', { locale: de })}</span>
                  </div>
                  <div className="detail-item">
                    <MapPin size={18} />
                    <span>{match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Matches;
