import { Table, TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import './LeagueTable.css';

function LeagueTable() {
  const { leagueStandings } = useData();

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
          <h1>Liga-Tabelle</h1>
          <p>Aktueller Stand der Saison 2025/26</p>
        </div>
        <Table size={32} color="var(--primary)" />
      </header>

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
        <p><strong>Hinweis:</strong> Die Tabelle wird automatisch von der offiziellen Liga-Website aktualisiert. 
        Bei einem Sieg gibt es 2 Punkte, bei einer Niederlage 0 Punkte. Ein Unentschieden gibt es im Tennis nicht.</p>
      </div>
    </div>
  );
}

export default LeagueTable;
