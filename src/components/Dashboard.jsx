import { format } from 'date-fns';
import { Calendar, Users, Trophy, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { matches, players, leagueStandings } = useData();
  const navigate = useNavigate();

  const upcomingMatches = matches
    .filter(m => m.date > new Date())
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const yourTeam = leagueStandings.find(team => team.team === 'Your Team');

  return (
    <div className="dashboard container">
      <header className="dashboard-header fade-in">
        <div>
          <h1>Willkommen zurück!</h1>
          <p className="user-role">{currentUser?.name}</p>
        </div>
        <button onClick={handleLogout} className="btn-icon" title="Abmelden">
          <LogOut size={20} />
        </button>
      </header>

      <div className="stats-grid fade-in">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Calendar size={24} color="#1e40af" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{upcomingMatches.length}</div>
            <div className="stat-label">Kommende Spiele</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Users size={24} color="#065f46" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{players.length}</div>
            <div className="stat-label">Spieler</div>
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
        <h2>Nächste Spiele</h2>
        {upcomingMatches.length > 0 ? (
          <div className="matches-preview">
            {upcomingMatches.map(match => {
              const availableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'available').length;
              const notAvailableCount = Object.values(match.availability || {})
                .filter(a => a.status === 'not-available').length;

              return (
                <div key={match.id} className="match-preview-card card">
                  <div className="match-preview-header">
                    <div className="match-date">
                      <div className="date-day">
                        {format(match.date, 'dd')}
                      </div>
                      <div className="date-month">
                        {format(match.date, 'MMM')}
                      </div>
                    </div>
                    <div className="match-info">
                      <h3>{match.opponent}</h3>
                      <p className="match-details">
                        {format(match.date, 'HH:mm')} Uhr • {match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}
                      </p>
                    </div>
                  </div>
                  <div className="match-preview-stats">
                    <span className="badge badge-success">{availableCount} verfügbar</span>
                    <span className="badge badge-danger">{notAvailableCount} nicht verfügbar</span>
                    <span className="badge badge-info">{match.playersNeeded} Spieler benötigt</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <Calendar size={48} color="var(--gray-400)" />
            <p>Keine kommenden Spiele</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
