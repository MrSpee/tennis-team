import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MessageCircle, Check, X, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LoggingService } from '../services/activityLogger';
import './Matches.css';
import './Dashboard.css';

function Matches() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { matches, updateMatchAvailability, playerTeams } = useData();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [comment, setComment] = useState('');
  const [searchParams] = useSearchParams();

  // Verarbeite URL-Parameter für spezifisches Match
  useEffect(() => {
    const matchId = searchParams.get('match');
    if (matchId && matches.length > 0) {
      const targetMatch = matches.find(m => m.id === matchId);
      if (targetMatch) {
        // Wähle das Match aus
        setSelectedMatch(targetMatch);
        
        // Scrolle zum Match nach einem kurzen Delay (damit die Seite geladen ist)
        setTimeout(() => {
          const element = document.getElementById(`match-${matchId}`);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            // Hervorhebung für bessere Sichtbarkeit
            element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 3000);
          }
        }, 500);
        
        // Entferne den Parameter aus der URL (optional)
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('match');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, matches]);


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

    console.log('🔵 Setting availability - matchId:', matchId, 'playerId:', player.id, 'status:', status, 'comment:', comment);
    
    try {
      const result = await updateMatchAvailability(matchId, player.id, status, comment);
      
      if (result.success) {
        console.log('✅ Availability set successfully');
        
        // Log Matchday-Zusage/Absage
        await LoggingService.logMatchdayResponse(matchId, status, player.id);
        
        // UI State zurücksetzen
        setComment('');
        setSelectedMatch(null);
        
        // Kurze Verzögerung für bessere UX
        setTimeout(() => {
          console.log('🔄 UI updated after availability change');
        }, 100);
        
      } else {
        console.error('❌ Error setting availability:', result.error);
        alert('❌ Fehler: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Exception in handleAvailability:', error);
      alert('❌ Unerwarteter Fehler beim Setzen der Verfügbarkeit. Bitte versuche es erneut.');
    }
  };

  const getAvailabilityStatus = (match) => {
    // Suche nach Verfügbarkeit für den aktuellen Spieler (nach playerId)
    if (!player?.id || !match.availability) return null;
    
    // availability ist jetzt ein Object mit playerIds als Keys
    return match.availability[player.id];
  };

  // Kalender-Download (iCal/ICS Format)
  const downloadCalendarEvent = (match) => {
    const startDate = new Date(match.date);
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000); // +4 Stunden
    
    // Format: YYYYMMDDTHHMMSS
    const formatICalDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Platzhirsch//Tennis Team App//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      `UID:${match.id}@platzhirsch.app`,
      `SUMMARY:Medenspiel gegen ${match.opponent}`,
      `DESCRIPTION:Medenspiel ${match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'} gegen ${match.opponent}\\n\\n${match.playersNeeded} Spieler benötigt\\n\\nDu hast zugesagt!`,
      match.venue ? `LOCATION:${match.venue}` : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'DESCRIPTION:Medenspiel morgen!',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n');

    // Download als .ics Datei
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Medenspiel_${match.opponent.replace(/\s/g, '_')}_${format(match.date, 'dd-MM-yyyy')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard container">
      {/* Header - Moderner Dashboard-Stil */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          Meine Verfügbarkeit 📅
        </h1>
      </div>

      {/* Kommende Spiele Card */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Kommende Spiele</div>
          <div className="match-count-badge">
            {upcomingMatches.length} {upcomingMatches.length === 1 ? 'Spiel' : 'Spiele'}
          </div>
        </div>
        
        <div className="season-content">
        {upcomingMatches.length > 0 ? (
          <div className="season-matches">
            {upcomingMatches.map(match => {
              const myStatus = getAvailabilityStatus(match);
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;

              const availablePlayers = Object.entries(match.availability || {})
                .filter(([, data]) => data.status === 'available')
                .map(([, data]) => data.playerName)
                .filter(name => name && name !== 'Unbekannt');

              return (
                <div 
                  key={match.id} 
                  id={`match-${match.id}`}
                  className="match-result-card"
                >
                  {/* Match Header mit Gegner */}
                  <div className="match-header">
                    <div className="match-info">
                      <span className="match-opponent-name">{match.opponent}</span>
                    </div>
                    <div className="match-status">
                      {/* Status Badge */}
                      <div className={`improvement-badge-top ${
                        availableCount >= match.playersNeeded ? 'positive' : 
                        availableCount > 0 ? 'neutral' : 
                        'negative'
                      }`}>
                        <span className="badge-icon">
                          {availableCount >= match.playersNeeded ? '✅' : 
                           availableCount > 0 ? '⚠️' : 
                           '❌'}
                        </span>
                        <span className="badge-value">
                          {availableCount}/{match.playersNeeded}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Team-Badge (wenn Multi-Team) */}
                  {match.teamInfo && playerTeams.length > 1 && (
                    <div className="match-team-badge" style={{ marginBottom: '1rem' }}>
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName}
                    </div>
                  )}

                  {/* Match Details Compact */}
                  <div className="match-info-grid" style={{ marginBottom: '1rem' }}>
                    <div className="match-info-row">
                      <span className="info-label">📅 Datum:</span>
                      <span className="info-value">{format(match.date, 'EEEE, dd. MMMM', { locale: de })}</span>
                    </div>
                    <div className="match-info-row">
                      <span className="info-label">⏰ Zeit:</span>
                      <span className="info-value">{format(match.date, 'HH:mm', { locale: de })} Uhr</span>
                    </div>
                    <div className="match-info-row">
                      <span className="info-label">
                        {match.location === 'Home' ? '🏠' : '✈️'}
                      </span>
                      <span className="info-value">
                        {match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}
                      </span>
                    </div>
                    {match.venue && (
                      <div className="match-info-row" style={{ gridColumn: '1 / -1' }}>
                        <span className="info-label">📍</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="info-value venue-link"
                        >
                          {match.venue}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ES SPIELEN MIT - Prominent anzeigen */}
                  {availablePlayers.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem' 
                      }}>
                        Es spielen mit ({availablePlayers.length}):
                      </div>
                      <div className="player-badges">
                        {availablePlayers.map((playerName, index) => (
                          <span 
                            key={index} 
                            className="player-badge-small"
                            onClick={() => navigate(`/player/${encodeURIComponent(playerName)}`)}
                            title={`Profil von ${playerName}`}
                          >
                            {playerName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DEINE VERFÜGBARKEIT - HERO ELEMENT */}
                  <div className="availability-hero">
                    {myStatus ? (
                      // Bereits geantwortet
                      <div className={`availability-status-card ${myStatus.status}`}>
                        <div className="status-card-header">
                          <div>
                            <div className="status-card-label">Deine Antwort:</div>
                            <div className="status-card-value">
                              {myStatus.status === 'available' ? '✅ Bin dabei!' : '❌ Kann nicht'}
                            </div>
                            {myStatus.comment && (
                              <div className="status-card-comment">
                                💬 {myStatus.comment}
                              </div>
                            )}
                          </div>
                          {myStatus.status === 'available' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Zum Kalender
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadCalendarEvent(match);
                                }}
                                className="btn-calendar"
                                title="In Kalender speichern"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Ändern Button */}
                        {selectedMatch !== match.id && (
                          <button
                            onClick={() => setSelectedMatch(match.id)}
                            className="btn-change-availability"
                          >
                            Antwort ändern
                          </button>
                        )}
                      </div>
                    ) : (
                      // Noch nicht geantwortet - Große auffällige Buttons
                      !selectedMatch || selectedMatch !== match.id ? (
                        <button
                          onClick={() => setSelectedMatch(match.id)}
                          className="btn-availability-main"
                        >
                          <span style={{ fontSize: '1.2rem' }}>📅</span>
                          <span>Verfügbarkeit angeben</span>
                        </button>
                      ) : null
                    )}

                    {/* Formular wenn geöffnet */}
                    {selectedMatch === match.id && (
                      <div className="availability-form-modern">
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151',
                          marginBottom: '0.75rem'
                        }}>
                          Kannst du am {format(match.date, 'dd. MMMM', { locale: de })} spielen?
                        </div>
                        
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Optional: Kommentar (z.B. 'Komme eventuell 10 Min später')"
                          rows="2"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            marginBottom: '0.75rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        
                        <div className="availability-buttons">
                          <button
                            onClick={() => handleAvailability(match.id, 'available')}
                            className="btn-available"
                          >
                            <Check size={20} />
                            <span>Bin dabei!</span>
                          </button>
                          <button
                            onClick={() => handleAvailability(match.id, 'unavailable')}
                            className="btn-unavailable"
                          >
                            <X size={20} />
                            <span>Kann nicht</span>
                          </button>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedMatch(null);
                            setComment('');
                          }}
                          className="btn-cancel"
                        >
                          Abbrechen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alle Rückmeldungen (aufklappbar) */}
                  {Object.keys(match.availability || {}).length > 0 && (
                    <details className="availability-details-modern">
                      <summary>
                        <MessageCircle size={16} />
                        <span>Alle Rückmeldungen ({Object.keys(match.availability).length})</span>
                      </summary>
                      <div className="availability-list-modern">
                        {Object.entries(match.availability).map(([playerId, data]) => (
                          <div key={playerId} className="availability-item-modern">
                            <div className="availability-player-info">
                              <span className={`status-indicator ${data.status}`}>
                                {data.status === 'available' ? '✅' : '❌'}
                              </span>
                              <span className="player-name-text">
                                {data.playerName || 'Unbekannter Spieler'}
                              </span>
                            </div>
                            {data.comment && (
                              <div className="player-comment">
                                💬 {data.comment}
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
          <div className="no-results">
            <div style={{ fontSize: '3rem' }}>📅</div>
            <h3>Keine kommenden Spiele</h3>
            <p>Sobald neue Spiele geplant sind, kannst du hier deine Verfügbarkeit angeben.</p>
          </div>
        )}
        </div>
      </div>

      {/* Vergangene Spiele Card */}
      {pastMatches.length > 0 && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Vergangene Spiele</div>
            <div className="match-count-badge">
              {pastMatches.length} {pastMatches.length === 1 ? 'Spiel' : 'Spiele'}
            </div>
          </div>
          
          <div className="season-content">
            <div className="season-matches">
              {pastMatches.map(match => (
                <div key={match.id} className="match-preview-card finished">
                  <div className="match-preview-header">
                    <div className="match-preview-date">
                      {format(match.date, 'EEE, dd. MMM', { locale: de })}
                    </div>
                    <div className="match-preview-badge">Beendet</div>
                  </div>
                  <div className="match-preview-opponent">{match.opponent}</div>
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Matches;

