import { useNavigate } from 'react-router-dom';

/**
 * Performance-Statistiken Komponente
 * Zeigt persönliche (Einzel/Doppel) und Mannschafts-Performance
 */
export default function PerformanceStats({ player, performanceStats, recentMatches }) {
  const navigate = useNavigate();
  
  if (!performanceStats) return null;
  
  return (
    <div>
      {/* 1. PERSÖNLICHE PERFORMANCE */}
      <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
        <div className="lk-card-full">
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '1.5rem',
            borderRadius: '12px 12px 0 0',
            color: 'white'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
              👤 Persönliche Performance
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
              Deine Einzel- und Doppel-Ergebnisse
            </p>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
            {/* LK */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '3px solid #3b82f6',
                borderRadius: '16px'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2563eb' }}>
                  {player.current_lk || 'LK ?'}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginTop: '0.5rem' }}>
                  AKTUELLE LEISTUNGSKLASSE
                </div>
                
                {/* LK-Veränderung */}
                {player.season_start_lk && player.current_lk && (() => {
                  const startLK = parseFloat((player.season_start_lk || '').replace('LK ', '').replace(',', '.'));
                  const currentLK = parseFloat((player.current_lk || '').replace('LK ', '').replace(',', '.'));
                  const diff = currentLK - startLK;
                  
                  if (Math.abs(diff) < 0.1) return null;
                  
                  return (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      background: diff < 0 ? '#ecfdf5' : '#fee2e2',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: diff < 0 ? '#047857' : '#991b1b'
                    }}>
                      {diff < 0 ? '📈 Verbessert:' : '📉 Verschlechtert:'} {diff > 0 ? '+' : ''}{diff.toFixed(1)} seit Saison-Start
                    </div>
                  );
                })()}
              </div>
              
              {player.season_start_lk && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.75rem' }}>
                  📅 Saison-Start: {player.season_start_lk}
                </div>
              )}
            </div>
            
            {/* Einzel Stats */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                👤 Einzel
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '2px solid #10b981', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                    {performanceStats.personal.einzel.wins}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #ef4444', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                    {performanceStats.personal.einzel.losses}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                    {performanceStats.personal.einzel.winRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
                </div>
              </div>
            </div>
            
            {/* Doppel Stats */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                👥 Doppel
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '2px solid #10b981', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                    {performanceStats.personal.doppel.wins}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #ef4444', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                    {performanceStats.personal.doppel.losses}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                    {performanceStats.personal.doppel.winRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
                </div>
              </div>
            </div>
            
            {/* Gesamt Persönlich */}
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: '8px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>{performanceStats.personal.gesamt.total}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280' }}>GESAMT</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>{performanceStats.personal.gesamt.wins}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857' }}>SIEGE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>{performanceStats.personal.gesamt.losses}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b' }}>NIEDERLAGEN</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>{performanceStats.personal.gesamt.winRate}%</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e' }}>QUOTE</div>
              </div>
            </div>
            
            {performanceStats.personal.gesamt.total === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', background: '#f9fafb', borderRadius: '8px', marginTop: '1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎾</div>
                Noch keine persönlichen Spiele in dieser Saison
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 2. MANNSCHAFTS-PERFORMANCE */}
      {performanceStats.team.total > 0 && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', padding: '1.5rem', borderRadius: '12px 12px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
                👥 Mannschafts-Bilanz
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                Team-Ergebnisse der letzten Medenspiele
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
              {/* Team Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '2px solid #10b981', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#059669' }}>{performanceStats.team.wins}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#047857', marginTop: '0.25rem' }}>TEAM-SIEGE</div>
                </div>
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #ef4444', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc2626' }}>{performanceStats.team.losses}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#991b1b', marginTop: '0.25rem' }}>TEAM-NIEDERLAGEN</div>
                </div>
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#d97706' }}>{performanceStats.team.winRate}%</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', marginTop: '0.25rem' }}>TEAM-QUOTE</div>
                </div>
              </div>
              
              {/* Letzte Medenspiele */}
              {recentMatches && recentMatches.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                    🏆 Letzte {recentMatches.length} Medenspiele
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentMatches.map(match => {
                      const outcome = match.ourScore > match.oppScore ? 'win' : match.ourScore < match.oppScore ? 'loss' : 'draw';
                      
                      return (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/results?match=${match.id}`)}
                          style={{
                            padding: '0.75rem 1rem',
                            background: outcome === 'win' ? '#ecfdf5' : outcome === 'loss' ? '#fee2e2' : '#fef3c7',
                            border: `2px solid ${outcome === 'win' ? '#10b981' : outcome === 'loss' ? '#ef4444' : '#f59e0b'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                              {match.opponent}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {match.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {match.location === 'Home' ? '🏠 Heim' : '✈️ Auswärts'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              padding: '0.25rem 0.75rem',
                              background: 'white',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: outcome === 'win' ? '#059669' : outcome === 'loss' ? '#dc2626' : '#d97706'
                            }}>
                              {match.ourScore}:{match.oppScore}
                            </div>
                            <div style={{ fontSize: '1.25rem' }}>
                              {outcome === 'win' ? '🎉' : outcome === 'loss' ? '😞' : '🤝'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

