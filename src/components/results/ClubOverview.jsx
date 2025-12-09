const ClubOverview = ({ clubOverview }) => {
  if (!clubOverview) return null;

  return (
    <div className="fade-in lk-card-full" style={{ marginBottom: '1rem' }}>
      <div className="formkurve-header">
        <div className="formkurve-title">Mein(e) Verein(e)</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
          {clubOverview.totalTeams} {clubOverview.totalTeams === 1 ? 'Mannschaft' : 'Mannschaften'}
        </div>
      </div>
      
      <div className="season-content">
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
            {clubOverview.clubName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {clubOverview.totalMatches} {clubOverview.totalMatches === 1 ? 'Spiel' : 'Spiele'} in dieser Saison
          </div>
        </div>
        
        {/* Bilanz eingeklappt */}
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontSize: '0.75rem', 
            fontWeight: '600', 
            color: '#6b7280',
            padding: '0.5rem',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
            listStyle: 'none'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            📊 Bilanz anzeigen
          </summary>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
              <div style={{
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #10b981',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                  {clubOverview.totalWins}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857', marginTop: '0.25rem' }}>
                  SIEGE
                </div>
              </div>
              
              <div style={{
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                  {clubOverview.totalDraws}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e', marginTop: '0.25rem' }}>
                  REMIS
                </div>
              </div>
              
              <div style={{
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                border: '2px solid #ef4444',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                  {clubOverview.totalLosses}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b', marginTop: '0.25rem' }}>
                  NIEDERLAGEN
                </div>
              </div>
              
              <div style={{
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>
                  {clubOverview.totalPlayed > 0 ? Math.round((clubOverview.totalWins / clubOverview.totalPlayed) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1e40af', marginTop: '0.25rem' }}>
                  SIEGQUOTE
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ClubOverview;

