function OverviewTab({ stats, buildInfo, matchdaysWithoutResults = [], onNavigateToTab }) {
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
        {/* ✅ NEU: Info-Card Bereich für wichtige Hinweise */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            fontWeight: '700', 
            color: '#1f2937' 
          }}>
            📋 Wichtige Informationen
          </h3>
          
          {/* ✅ Info-Card: Warnung für Matches ohne Ergebnisse nach 4 Tagen */}
          {matchdaysWithoutResults.length > 0 && (
          <div style={{
            padding: '1.25rem',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '1.75rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: 'rgb(185, 28, 28)',
                      marginBottom: '0.25rem'
                    }}>
                      {matchdaysWithoutResults.length} Match{matchdaysWithoutResults.length > 1 ? 'es' : ''} ohne Ergebnisse
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'rgb(107, 114, 128)',
                      lineHeight: 1.5
                    }}>
                      Diese Matches wurden bereits 4+ Tage lang täglich geprüft, aber noch keine Ergebnisse gefunden. Bitte manuell überprüfen.
                    </div>
                  </div>
                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('matchdays')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgb(239, 68, 68)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgb(220, 38, 38)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgb(239, 68, 68)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      → Zu Matchdays
                    </button>
                  )}
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
          
          {/* ✅ Erfolgsmeldung wenn keine fehlenden Ergebnisse */}
          {matchdaysWithoutResults.length === 0 && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'rgb(5, 150, 105)',
                    marginBottom: '0.25rem'
                  }}>
                    Alle Match-Ergebnisse aktuell
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgb(107, 114, 128)'
                  }}>
                    Keine Matches ohne Ergebnisse nach 4+ Tagen. Der automatische Import funktioniert einwandfrei.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ✅ NEU: Quick-Navigation Cards zu anderen Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {onNavigateToTab && (
              <>
                <button
                  onClick={() => onNavigateToTab('clubs')}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏢</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                    Vereine verwalten
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    {stats.totalClubs ?? '–'} Vereine im System
                  </div>
                </button>
                
                <button
                  onClick={() => onNavigateToTab('players')}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👤</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                    Spieler verwalten
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    {stats.totalUsers ?? '–'} aktive Nutzer
                  </div>
                </button>
                
                <button
                  onClick={() => onNavigateToTab('matchdays')}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                    Matchdays verwalten
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    {stats.pendingMatches ?? '–'} offene Matches
                  </div>
                </button>
                
                <button
                  onClick={() => onNavigateToTab('groups')}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                    Gruppen verwalten
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    nuLiga Gruppen & Import
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

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

