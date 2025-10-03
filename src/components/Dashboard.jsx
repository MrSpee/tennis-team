import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout, player } = useAuth();
  const { matches, players, teamInfo } = useData();

  const now = new Date();
  
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
    const firstName = (player?.name || currentUser?.name || 'Spieler').split(' ')[0];
    
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '🔥 HEUTE ist Spieltag!';
    if (diffDays === 1) return '⚡ MORGEN ist Spieltag!';
    if (diffDays <= 3) return `⏰ In ${diffDays} Tagen`;
    if (diffDays <= 7) return `📅 In ${diffDays} Tagen`;
    return `📆 In ${diffDays} Tagen`;
  };

  return (
    <div className="dashboard container">
      {/* Header mit Logout */}
      <header className="dashboard-header fade-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={handleLogout} className="btn-icon" title="Abmelden">
          <LogOut size={18} />
        </button>
      </header>

      {/* 1. Vereinslogo + Name */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
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

      {/* 2. Persönliche Begrüßung */}
      <div className="fade-in" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>
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

      {/* 4. Saison */}
      <div className="fade-in card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
          Saison
        </h2>
        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af' }}>
          {currentSeason === 'winter' ? '❄️' : '☀️'} {seasonDisplay}
        </div>
      </div>

      {/* 5. TVM Link - Rechts neben Label */}
      {teamInfo?.tvmLink && (
        <div className="fade-in" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1.5rem' 
        }}>
          <div style={{ fontSize: '0.8rem', color: '#999', fontWeight: '600' }}>
            LINK ZUR SEITE:
          </div>
          <a
            href={teamInfo.tvmLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: '8px',
              textDecoration: 'none',
              background: '#00843D',
              color: 'white',
              border: 'none'
            }}
          >
            <ExternalLink size={14} />
            TVM
          </a>
        </div>
      )}

      {/* Nächstes Spiel - Erweitert */}
      {nextMatchAnySeason && (() => {
        const availablePlayers = Object.entries(nextMatchAnySeason.availability || {})
          .filter(([, data]) => data.status === 'available')
          .map(([, data]) => data.playerName)
          .filter(name => name && name !== 'Unbekannt');

        return (
          <div className="fade-in card" style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.25rem' }}>
                NÄCHSTES SPIEL
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                {getNextMatchCountdown()}
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
                <div style={{ fontSize: '0.85rem', color: '#065f46' }}>
                  {availablePlayers.join(', ')}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Spiele der laufenden Saison */}
      <section className="dashboard-section fade-in">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
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
                <div key={match.id} className="match-preview-card card">
                  <div className="match-preview-header">
                    <div className="match-date">
                      <div className="date-day">
                        {format(match.date, 'dd')}
                      </div>
                      <div className="date-month">
                        {format(match.date, 'MMM', { locale: de })}
                      </div>
                      <div className="date-year" style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold', marginTop: '2px' }}>
                        {format(match.date, 'yyyy')}
                      </div>
                    </div>
                    <div className="match-info">
                      <h3>{match.opponent}</h3>
                      <p className="match-details">
                        {format(match.date, 'EEEE, dd. MMMM yyyy', { locale: de })} • {format(match.date, 'HH:mm')} Uhr
                      </p>
                      <p className="match-details" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                      </p>
                      {match.venue && (
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                          📍 {match.venue}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="match-preview-stats">
                    <span className="badge badge-success">{availableCount} verfügbar</span>
                    <span className="badge badge-danger">{notAvailableCount} nicht verfügbar</span>
                    <span className="badge badge-warning">{notRespondedPlayers.length} ausstehend</span>
                  </div>
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
