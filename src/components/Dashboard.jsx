import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout, player } = useAuth();
  const { matches, players, leagueStandings, teamInfo } = useData();

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

  const yourTeam = leagueStandings.find(team => team.team === 'Your Team');

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
      {/* Kompakter Header */}
      <header className="dashboard-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
              {getGreeting()}
            </h1>
            
            {/* Vereins-Info kompakt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <img 
                src="/logo.png" 
                alt="Vereinslogo" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                  {teamInfo?.clubName || 'SV Rot-Gelb Sürth'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  Deine Mannschaft: {teamInfo?.category || 'Herren 40'}
                </div>
              </div>
            </div>

            {player?.ranking && (
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                background: '#3498db',
                color: 'white',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {player.ranking}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="btn-icon" title="Abmelden" style={{ flexShrink: 0 }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Nächstes Spiel - Kompakt */}
      {nextMatchAnySeason && (
        <div className="fade-in card" style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600', marginBottom: '0.25rem' }}>
            NÄCHSTES SPIEL
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e40af' }}>
              {nextMatchAnySeason.opponent}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
              {getNextMatchCountdown()}
            </div>
          </div>
        </div>
      )}

      {/* Aktuelle Saison Info */}
      <div className="fade-in card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            {currentSeason === 'winter' ? '❄️' : '☀️'} {seasonDisplay}
          </h2>
          {teamInfo?.tvmLink && (
            <a
              href={teamInfo.tvmLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.4rem 0.75rem',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              <ExternalLink size={14} />
              TVM
            </a>
          )}
        </div>
        
        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
          {teamInfo?.league} {teamInfo?.group} • {teamInfo?.region}
        </div>

        {/* Kompakte Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '0.5rem',
          marginTop: '0.75rem'
        }}>
          <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e40af' }}>
              {notPlayedThisSeason}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666' }}>Spiele</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#065f46' }}>
              {players.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666' }}>Spieler</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#92400e' }}>
              {yourTeam?.position || '-'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666' }}>Platz</div>
          </div>
        </div>
      </div>

      {/* Aktuelle Spiele */}
      <section className="dashboard-section fade-in">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          Aktuelle Spiele ({notPlayedThisSeason})
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
