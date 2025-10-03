import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, MessageCircle, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Matches.css';

function Matches() {
  const { currentUser } = useAuth();
  const { matches, updateMatchAvailability } = useData();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [comment, setComment] = useState('');

  const upcomingMatches = matches
    .filter(m => m.date > new Date())
    .sort((a, b) => a.date - b.date);

  const pastMatches = matches
    .filter(m => m.date <= new Date())
    .sort((a, b) => b.date - a.date);

  const handleAvailability = (matchId, status) => {
    updateMatchAvailability(matchId, currentUser.name, status, comment);
    setComment('');
    setSelectedMatch(null);
  };

  const getAvailabilityStatus = (match) => {
    return match.availability?.[currentUser.name];
  };

  return (
    <div className="matches-page container">
      <header className="page-header fade-in">
        <h1>Spiele & Verfügbarkeit</h1>
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
              const notAvailableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'not-available').length;

              return (
                <div key={match.id} className="match-card card">
                  <div className="match-header">
                    <div className="match-title">
                      <h3>{match.opponent}</h3>
                      <span className={`season-badge ${match.season}`}>
                        {match.season === 'winter' ? 'Winter' : 'Sommer'}
                      </span>
                    </div>
                  </div>

                  <div className="match-details-grid">
                    <div className="detail-item">
                      <Calendar size={18} />
                      <span>{format(match.date, 'EEEE, dd. MMMM yyyy')}</span>
                    </div>
                    <div className="detail-item">
                      <Users size={18} />
                      <span>{format(match.date, 'HH:mm')} Uhr</span>
                    </div>
                    <div className="detail-item">
                      <MapPin size={18} />
                      <span>{match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}</span>
                    </div>
                    <div className="detail-item">
                      <Users size={18} />
                      <span>{match.playersNeeded} Spieler benötigt</span>
                    </div>
                  </div>

                  <div className="availability-stats">
                    <div className="stat-item">
                      <Check size={16} />
                      <span>{availableCount} verfügbar</span>
                    </div>
                    <div className="stat-item">
                      <X size={16} />
                      <span>{notAvailableCount} abgesagt</span>
                    </div>
                  </div>

                  {myStatus && (
                    <div className={`my-status ${myStatus.status}`}>
                      <strong>Deine Antwort:</strong> {myStatus.status === 'available' ? 'Verfügbar' : 'Nicht verfügbar'}
                      {myStatus.comment && (
                        <div className="status-comment">
                          <MessageCircle size={14} />
                          <span>{myStatus.comment}</span>
                        </div>
                      )}
                    </div>
                  )}

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
                            onClick={() => handleAvailability(match.id, 'not-available')}
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
                      <summary>Alle Antworten anzeigen ({Object.keys(match.availability).length})</summary>
                      <div className="availability-list">
                        {Object.entries(match.availability).map(([name, data]) => (
                          <div key={name} className="availability-item">
                            <div className="availability-name">
                              <span className={`status-dot ${data.status}`}></span>
                              {name}
                            </div>
                            <div className="availability-status-text">
                              {data.status === 'available' ? 'Verfügbar' : 'Nicht verfügbar'}
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
                    <span>{format(match.date, 'dd.MM.yyyy')}</span>
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
