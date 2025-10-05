import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LogOut, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout, player } = useAuth();
  const { matches, players, teamInfo } = useData();

  // Motivierende Verfügbarkeits-Texte
  const getAvailabilityText = (status) => {
    const availableTexts = [
      '🎾 Ich bin dabei!',
      '🔥 Bin am Start!',
      '⚡ Count me in!',
      '🚀 Ich komme!',
      '💪 Bin bereit!',
      '🎯 Absolut dabei!',
      '🏆 Ich spiele mit!',
      '✨ Bin dabei!',
      '🎪 Ich mache mit!',
      '🌟 Bin am Ball!'
    ];
    
    
    const unavailableTexts = [
      '😔 Leider nicht dabei',
      '❌ Kann nicht',
      '🚫 Bin verhindert',
      '😢 Muss absagen',
      '⛔ Leider nicht möglich',
      '😞 Bin nicht verfügbar',
      '🙁 Kann nicht mitspielen',
      '😓 Muss passen',
      '😔 Leider nicht',
      '❌ Muss absagen'
    ];

    if (status === 'available') {
      return availableTexts[Math.floor(Math.random() * availableTexts.length)];
    } else {
      return unavailableTexts[Math.floor(Math.random() * unavailableTexts.length)];
    }
  };
  
  // State für Live-Timer
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer für Live-Updates (alle 30 Sekunden)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Aktualisiert alle 30 Sekunden

    return () => clearInterval(interval);
  }, []);

  const now = currentTime;
  
  // Aktuelle Saison bestimmen (Winter: Sep-Apr, Sommer: Mai-Aug)
  // Winter läuft von September bis April (überspannt Jahreswechsel)
  // Sommer läuft von Mai bis August
  const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
  const currentYear = now.getFullYear();
  
  let currentSeason = 'winter';
  let seasonDisplay = '';
  
  if (currentMonth >= 4 && currentMonth <= 7) {
    // Mai (4) bis August (7) = Sommer
    currentSeason = 'summer';
    seasonDisplay = `Sommer ${currentYear}`;
  } else {
    // September bis April = Winter (überspannt Jahreswechsel)
    currentSeason = 'winter';
    if (currentMonth >= 8) {
      // Sep-Dez: Winter 24/25 (aktuelles Jahr / nächstes Jahr)
      const nextYear = currentYear + 1;
      seasonDisplay = `Winter ${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}`;
    } else {
      // Jan-Apr: Winter 24/25 (vorheriges Jahr / aktuelles Jahr)
      const prevYear = currentYear - 1;
      seasonDisplay = `Winter ${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}`;
    }
  }
  
  // Debug: Zeige was geladen wurde
  console.log('🔵 Dashboard Debug:', {
    totalMatches: matches.length,
    currentSeason,
    seasonDisplay,
    currentMonth,
    allMatches: matches.map(m => ({ 
      opponent: m.opponent, 
      date: m.date.toISOString(), 
      season: m.season,
      isFuture: m.date > now
    }))
  });
  
  // Alle zukünftigen Spiele der aktuellen Saison
  const upcomingMatches = matches
    .filter(m => m.date > now && m.season === currentSeason)
    .sort((a, b) => a.date - b.date);

  console.log('🔵 Upcoming matches for', currentSeason, ':', upcomingMatches.length);

  // Für Countdown: Das allernächste Spiel (egal welche Saison)
  const nextMatchAnySeason = matches
    .filter(m => m.date > now)
    .sort((a, b) => a.date - b.date)[0];
  
  const notPlayedThisSeason = upcomingMatches.length;

  const handleLogout = async () => {
    console.log('🔵 Logout button clicked');
    await logout();
    // Navigation passiert automatisch durch ProtectedRoute wenn isAuthenticated=false
  };

  // Tageszeit-abhängige Begrüßung
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    // Korrekte Namens-Abfrage für Supabase
    let playerName = player?.name;
    if (!playerName && currentUser) {
      playerName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Spieler';
    }
    
    const firstName = (playerName || 'Spieler').split(' ')[0];
    
    console.log('🔵 Greeting debug:', { 
      playerName: player?.name, 
      userMetadata: currentUser?.user_metadata?.name,
      email: currentUser?.email,
      finalName: playerName,
      firstName 
    });
    
    if (hour < 6) return `Gute Nacht, ${firstName}! 🌙`;
    if (hour < 11) return `Guten Morgen, ${firstName}! ☀️`;
    if (hour < 14) return `Guten Tag, ${firstName}! 👋`;
    if (hour < 18) return `Moin, ${firstName}! 🎾`;
    if (hour < 22) return `Guten Abend, ${firstName}! 🌆`;
    return `Gute Nacht, ${firstName}! 🌙`;
  };

  // Countdown bis nächstes Spiel
  const getNextMatchCountdown = () => {
    if (!nextMatchAnySeason) {
      const funnyMessages = [
        '🏖️ Zeit für ein bisschen Urlaub!',
        '🎾 Perfekt für Trainingseinheiten!',
        '☕ Entspannt zurücklehnen...',
        '🌴 Keine Spiele = Mehr Freizeit!',
        '⏰ Wartet auf den nächsten Gegner...',
        '🎯 Bereit für neue Herausforderungen!',
        '🏃 Zeit zum Fitnesstraining!',
        '📅 Der Spielplan ist noch leer'
      ];
      return funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    }

    const now = new Date();
    const diffTime = nextMatchAnySeason.date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    // Heute: Weniger als 24 Stunden
    if (diffHours < 24) {
      if (diffHours === 0) {
        return `🔥 In ${diffMinutes}m ${diffSeconds}s - HEUTE!`;
      }
      return `🔥 In ${diffHours}h ${diffMinutes}m - HEUTE!`;
    }

    // Morgen: Zwischen 24 und 48 Stunden
    if (diffHours < 48) {
      return `⚡ In ${diffHours}h ${diffMinutes}m - MORGEN!`;
    }

    // Für mehr als 2 Tage: Zeige Tage
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return `⏰ In ${diffDays} Tagen`;
    if (diffDays <= 7) return `📅 In ${diffDays} Tagen`;
    return `📆 In ${diffDays} Tagen`;
  };
  
  // Motivationsspruch basierend auf Countdown
  const getMotivationQuote = () => {
    if (!nextMatchAnySeason) return '';
    
    const now = new Date();
    const diffTime = nextMatchAnySeason.date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 2) {
      return '💪 Gleich geht\'s los! Gebt alles!';
    } else if (diffHours < 12) {
      return '🎯 Heute zeigen wir, was wir drauf haben!';
    } else if (diffHours < 24) {
      return '🔥 Noch heute ist der große Tag!';
    } else if (diffHours < 48) {
      return '⚡ Morgen wird es ernst - bereite dich vor!';
    } else if (diffHours < 72) {
      return '🎾 Bald ist Spieltag - mentale Vorbereitung läuft!';
    } else {
      return '🌟 Wir freuen uns aufs nächste Match!';
    }
  };

  return (
    <div className="dashboard container">
      {/* 1. Vereinslogo + Name + Logout Button auf gleicher Höhe */}
      <div className="fade-in" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '1.5rem', 
        paddingTop: '1rem'
      }}>
        {/* Links: Vereinslogo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <img 
            src="/logo.png" 
            alt="Vereinslogo" 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e40af' }}>
              {teamInfo?.clubName || 'SV Rot-Gelb Sürth'}
            </div>
          </div>
        </div>
        
        {/* Rechts: Logout Button */}
        <button onClick={handleLogout} className="btn-icon" title="Abmelden">
          <LogOut size={18} />
        </button>
      </div>

      {/* 2. Persönliche Begrüßung */}
      <div className="fade-in" style={{ marginBottom: '1rem' }}>
        <h1 className="section-title" style={{ color: '#333', marginBottom: '0.25rem' }}>
          {getGreeting()}
        </h1>
        {player?.ranking && (
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.6rem',
            background: '#3498db',
            color: 'white',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            {player.ranking}
          </span>
        )}
      </div>

      {/* 3. Meine Mannschaft */}
      <div className="fade-in" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '1.2rem' }}>🎾</div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#999', fontWeight: '600' }}>
            MEINE MANNSCHAFT
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
            {teamInfo?.category || 'Herren 40'} • {teamInfo?.league || ''} {teamInfo?.group || ''}
          </div>
        </div>
      </div>

      {/* 4. Saison mit TVM Link */}
      <div className="fade-in card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 className="detail-title" style={{ margin: 0, fontWeight: '600' }}>
            Saison
          </h2>
          {teamInfo?.tvmLink && (
            <a
              href={teamInfo.tvmLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                borderRadius: '6px',
                textDecoration: 'none',
                background: '#00843D',
                color: 'white',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#006b32';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#00843D';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <ExternalLink size={12} />
              TVM
            </a>
          )}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af' }}>
          {currentSeason === 'winter' ? '❄️' : '☀️'} {seasonDisplay}
        </div>
      </div>

      {/* Nächstes Spiel - Erweitert */}
      {nextMatchAnySeason && (() => {
        const availablePlayers = Object.entries(nextMatchAnySeason.availability || {})
          .filter(([, data]) => data.status === 'available')
          .map(([, data]) => data.playerName)
          .filter(name => name && name !== 'Unbekannt');

        return (
          <div 
            className="fade-in card" 
            onClick={() => navigate(`/matches?match=${nextMatchAnySeason.id}`)}
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            title="Klicken für Verfügbarkeit setzen"
          >
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.25rem' }}>
                NÄCHSTES SPIEL
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.5rem' }}>
                {getNextMatchCountdown()}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#059669', 
                fontWeight: '600',
                fontStyle: 'italic',
                padding: '0.5rem',
                background: 'rgba(5, 150, 105, 0.1)',
                borderRadius: '6px',
                borderLeft: '3px solid #059669'
              }}>
                {getMotivationQuote()}
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                Gegner:
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af' }}>
                {nextMatchAnySeason.opponent}
              </div>
            </div>

            {availablePlayers.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  Es spielen aktuell:
                </div>
                <div className="player-badges">
                  {availablePlayers.map((playerName, index) => (
                    <span 
                      key={index} 
                      className="player-badge"
                              onClick={() => navigate(`/player/${encodeURIComponent(playerName)}`)}
                      style={{ cursor: 'pointer' }}
                      title={`Profil von ${playerName} anzeigen`}
                    >
                      {playerName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Live-Ticker Button für nächstes Spiel */}
            <div style={{ 
              marginTop: '1rem', 
              display: 'flex', 
              gap: '0.5rem' 
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/ergebnisse/${nextMatchAnySeason.id}`);
                }}
                style={{
                  flex: '0 0 auto',
                  padding: '0.5rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px'
                }}>
                  📡
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  lineHeight: '1.2'
                }}>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    letterSpacing: '0.3px'
                  }}>Ergebnisdienst</span>
                  <span style={{
                    fontWeight: '500',
                    fontSize: '0.7rem',
                    opacity: '0.9',
                    marginTop: '1px'
                  }}>Live-Ticker</span>
                </div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Spiele der laufenden Saison */}
      <section className="dashboard-section fade-in">
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>
          Spiele der laufenden Saison ({notPlayedThisSeason})
        </h2>
        {upcomingMatches.length > 0 ? (
          <div className="matches-preview">
            {upcomingMatches.map(match => {
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;
              const notAvailableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'unavailable').length;
              
              // Spieler die noch nicht abgestimmt haben
              const respondedPlayerIds = Object.keys(match.availability || {});
              const notRespondedPlayers = players.filter(p => 
                !respondedPlayerIds.includes(p.id)
              );

              return (
                <div 
                  key={match.id} 
                  className="match-preview-card"
                  onClick={() => navigate(`/matches?match=${match.id}`)}
                  title="Klicken für Verfügbarkeit setzen"
                >
                  <div className="match-preview-header">
                    <div className="match-date">
                      <div className="date-day">
                        {format(match.date, 'dd')}
                      </div>
                      <div className="date-month">
                        {format(match.date, 'MMM', { locale: de })}
                      </div>
                      <div className="date-year">
                        {format(match.date, 'yyyy')}
                      </div>
                    </div>
                    <div className="dashboard-match-info">
                      <h3 className="match-team">{match.opponent}</h3>
                      <p className="dashboard-match-detail">
                        {format(match.date, 'EEEE, dd. MMMM yyyy', { locale: de })}
                      </p>
                      <p className="dashboard-match-detail">
                        {format(match.date, 'HH:mm')} Uhr
                      </p>
                      <p className="dashboard-match-detail">
                        {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                      </p>
                      {match.venue && (
                        <p className="dashboard-match-detail">
                          📍 {match.venue}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="match-preview-stats">
                    <span className="badge success">{availableCount} verfügbar</span>
                    <span className="badge danger">{notAvailableCount} nicht verfügbar</span>
                    <span className="badge warning">{notRespondedPlayers.length} ausstehend</span>
                  </div>

                  <button
                    className="live-ticker-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ergebnisse/${match.id}`);
                    }}
                    title="Live-Ticker öffnen"
                  >
                    📡
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <div style={{ fontSize: '3rem' }}>📅</div>
            <p>Keine Spiele in der Saison {seasonDisplay}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
