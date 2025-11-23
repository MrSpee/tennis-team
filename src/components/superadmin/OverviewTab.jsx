function OverviewTab({ stats, buildInfo, matchdaysWithoutResults = [] }) {
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
        {/* Warnung für Matches ohne Ergebnisse nach 4 Tagen */}
        {matchdaysWithoutResults.length > 0 && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'rgb(185, 28, 28)',
                  marginBottom: '0.25rem'
                }}>
                  {matchdaysWithoutResults.length} Match{matchdaysWithoutResults.length > 1 ? 'es' : ''} ohne Ergebnisse nach 4 Tagen
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'rgb(107, 114, 128)',
                  lineHeight: 1.5
                }}>
                  Diese Matches wurden bereits 4+ Tage lang täglich geprüft, aber noch keine Ergebnisse gefunden. Bitte manuell überprüfen.
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '8px'
            }}>
              {matchdaysWithoutResults.slice(0, 10).map((match) => {
                const homeTeam = match.home_team ? `${match.home_team.club_name}${match.home_team.team_name ? ` ${match.home_team.team_name}` : ''}` : 'Unbekannt';
                const awayTeam = match.away_team ? `${match.away_team.club_name}${match.away_team.team_name ? ` ${match.away_team.team_name}` : ''}` : 'Unbekannt';
                const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('de-DE') : 'Unbekannt';
                return (
                  <div key={match.id} style={{
                    fontSize: '0.875rem',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{ fontWeight: 600, color: 'rgb(55, 65, 81)', marginBottom: '0.25rem' }}>
                      {homeTeam} vs. {awayTeam}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(107, 114, 128)' }}>
                      {matchDate} · {match.daysSinceMatch} Tage · {match.attemptCount} Versuche · Meeting ID: {match.meeting_id}
                    </div>
                  </div>
                );
              })}
              {matchdaysWithoutResults.length > 10 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgb(107, 114, 128)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '0.5rem'
                }}>
                  ... und {matchdaysWithoutResults.length - 10} weitere
                </div>
              )}
            </div>
          </div>
        )}

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

