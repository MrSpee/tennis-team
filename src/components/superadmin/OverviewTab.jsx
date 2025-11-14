function OverviewTab({ stats, buildInfo }) {
  return (
    <div className="lk-card-full">
      <div className="formkurve-header">
        <div>
          <div className="formkurve-title">System-Übersicht</div>
          <div className="formkurve-subtitle">
            Build {buildInfo.shortCommit} · {buildInfo.buildTimeFormatted}
          </div>
        </div>
      </div>
      <div className="season-content">
        <div className="overview-grid">
          <div className="overview-card overview-card-blue">
            <div className="overview-card-title">Aktive Nutzer</div>
            <div className="overview-card-value">{stats.totalUsers ?? '–'}</div>
          </div>
          <div className="overview-card overview-card-green">
            <div className="overview-card-title">Vereine im System</div>
            <div className="overview-card-value">{stats.totalClubs ?? '–'}</div>
          </div>
          <div className="overview-card overview-card-orange">
            <div className="overview-card-title">Neue Spieler (7 Tage)</div>
            <div className="overview-card-value">{stats.newPlayersLast7Days ?? '–'}</div>
          </div>
          <div className="overview-card overview-card-purple">
            <div className="overview-card-title">Matches offen</div>
            <div className="overview-card-value">{stats.pendingMatches ?? '–'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;

