import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Users, Trophy, LogOut, ExternalLink } from 'lucide-react';
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
      <header className="dashboard-header fade-in">
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{getGreeting()}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {player?.ranking && (
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                background: '#3498db',
                color: 'white',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {player.ranking}
              </span>
            )}
            {teamInfo && (
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {teamInfo.clubName} - {teamInfo.category} | {teamInfo.league} {teamInfo.group}
              </span>
            )}
          </div>
        </div>
        <button onClick={handleLogout} className="btn-icon" title="Abmelden">
          <LogOut size={20} />
        </button>
      </header>

      {/* Countdown Card */}
      <div className="countdown-card fade-in card" style={{
        background: nextMatchAnySeason 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white',
        padding: '1rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
          {getNextMatchCountdown()}
        </div>
        {nextMatchAnySeason && (
          <div style={{ fontSize: '0.95rem', opacity: 0.9 }}>
            Nächstes Spiel: {nextMatchAnySeason.opponent}
          </div>
        )}
      </div>

      <div className="stats-grid fade-in">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Calendar size={24} color="#1e40af" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{notPlayedThisSeason}</div>
            <div className="stat-label">Offene Spiele ({seasonDisplay})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Users size={24} color="#065f46" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{players.length}</div>
            <div className="stat-label">Angemeldete Spieler</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Trophy size={24} color="#92400e" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{yourTeam?.position || '-'}</div>
            <div className="stat-label">Tabellenplatz</div>
          </div>
        </div>
      </div>

      <section className="dashboard-section fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>
            Spiele {seasonDisplay}
            <span style={{ 
              marginLeft: '0.75rem', 
              fontSize: '0.9rem', 
              fontWeight: 'normal', 
              color: '#666',
              background: '#f3f4f6',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px'
            }}>
              {notPlayedThisSeason} {notPlayedThisSeason === 1 ? 'Spiel' : 'Spiele'}
            </span>
          </h2>
          {teamInfo?.tvmLink && (
            <a
              href={teamInfo.tvmLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              <ExternalLink size={16} />
              TVM Spielbetrieb
            </a>
          )}
        </div>
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
            <Calendar size={48} color="var(--gray-400)" />
            <p>Keine Spiele in der Saison {seasonDisplay}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
