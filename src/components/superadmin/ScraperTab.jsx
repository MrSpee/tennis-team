import { useState, useMemo } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, X, Search, Plus, Loader } from 'lucide-react';
import { calculateSimilarity, normalizeString } from '../../services/matchdayImportService';

const SCRAPER_STATUS = {
  existing: { icon: '✅', color: '#166534', background: '#bbf7d0', label: 'Im System' },
  new: { icon: '🆕', color: '#1d4ed8', background: '#bfdbfe', label: 'Neu anlegen' },
  missing: { icon: '⚠️', color: '#b91c1c', background: '#fecaca', label: 'Keine Zuordnung' },
  skipped: { icon: '🚫', color: '#92400e', background: '#fde68a', label: 'Import deaktiviert' },
  fuzzy: { icon: '🔍', color: '#a16207', background: '#fef3c7', label: 'Manuelle Prüfung' }
};

const FUZZY_MATCH_THRESHOLD = 0.90; // 90% für automatische Bestätigung

function ScraperTab({
  scraperApiLoading,
  scraperApiGroups,
  setScraperApiGroups,
  scraperApiApplyMode,
  setScraperApiApplyMode,
  scraperError,
  scraperSuccess,
  scraperData,
  scraperClubSummaries,
  scraperStats,
  scraperClubMappings,
  updateClubMapping,
  updateTeamMapping,
  clubSearchQueries,
  clubSearchResults,
  handleClubSearch,
  handleScraperApiFetch,
  handleScraperImport,
  handleAdoptExistingClub,
  handleCreateClub,
  handleCreateTeam,
  handleEnsureTeamSeason,
  scraperImporting,
  scraperImportResult,
  matchImportResult,
  scraperMatchSelections,
  setScraperMatchSelections,
  scraperSelectedGroupId,
  setScraperSelectedGroupId,
  scraperSelectedMatch,
  setScraperSelectedMatch,
  scraperMatchStatus,
  resetScraper
}) {
  const [importMode, setImportMode] = useState('selected'); // 'selected' | 'all'
  const [expandedClubs, setExpandedClubs] = useState(new Set());
  const [expandedTeams, setExpandedTeams] = useState(new Map()); // clubName -> Set of team normalized names

  const toggleClubExpanded = (clubName) => {
    setExpandedClubs((prev) => {
      const next = new Set(prev);
      if (next.has(clubName)) {
        next.delete(clubName);
      } else {
        next.add(clubName);
      }
      return next;
    });
  };

  const toggleTeamExpanded = (clubName, teamNormalized) => {
    setExpandedTeams((prev) => {
      const next = new Map(prev);
      const clubSet = next.get(clubName) || new Set();
      const newSet = new Set(clubSet);
      if (newSet.has(teamNormalized)) {
        newSet.delete(teamNormalized);
      } else {
        newSet.add(teamNormalized);
      }
      next.set(clubName, newSet);
      return next;
    });
  };

  const clubsNeedingConfirmation = useMemo(() => {
    return scraperClubSummaries.filter((summary) => {
      const mapping = scraperClubMappings[summary.clubName];
      if (!mapping) return summary.matchScore < FUZZY_MATCH_THRESHOLD && summary.matchScore > 0;
      return false;
    });
  }, [scraperClubSummaries, scraperClubMappings]);

  const handleFetchClick = () => {
    if (importMode === 'all') {
      setScraperApiGroups(''); // Leer = alle Gruppen
    }
    handleScraperApiFetch();
  };

  return (
    <div className="lk-card-full scraper-desktop-container">
      <div className="scraper-compact-header">
        <div>
          <div className="formkurve-title">nuLiga Scraper-Import</div>
          <div className="formkurve-subtitle">
            Importiere Gruppen und Matchdays automatisch aus nuLiga
          </div>
        </div>
      </div>

      {/* Vereinfachte Konfiguration */}
      <div className="scraper-config-section" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>
              Gruppen auswählen:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={scraperApiGroups}
                onChange={(e) => setScraperApiGroups(e.target.value)}
                placeholder="z.B. 43,44,46 oder leer für alle"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              />
              <button
                onClick={handleFetchClick}
                disabled={scraperApiLoading}
                className="btn-modern"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {scraperApiLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Lade...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Laden
                  </>
                )}
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Leer lassen = alle Gruppen der Saison
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>
              Import-Modus:
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: scraperApiApplyMode ? '#dcfce7' : 'white', border: `1px solid ${scraperApiApplyMode ? '#86efac' : '#cbd5e1'}` }}>
                <input
                  type="checkbox"
                  checked={scraperApiApplyMode}
                  onChange={(e) => setScraperApiApplyMode(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: scraperApiApplyMode ? 600 : 400 }}>
                  {scraperApiApplyMode ? '✅ Direktimport aktiv' : 'Vorschau-Modus'}
                </span>
              </label>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {scraperApiApplyMode ? 'Daten werden direkt in die Datenbank geschrieben' : 'Nur Vorschau, keine Änderungen'}
            </div>
          </div>
        </div>

        {scraperData && (
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={handleScraperImport}
              disabled={scraperImporting}
              className="btn-modern"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: scraperImporting ? '#94a3b8' : '#10b981',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              {scraperImporting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Import läuft...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Import starten
                </>
              )}
            </button>

            <button
              onClick={resetScraper}
              className="btn-modern btn-modern-inactive"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
            >
              <X size={16} />
              Zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {scraperError && (
        <div
          style={{
            padding: '1rem',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={20} />
          <span>{scraperError}</span>
        </div>
      )}

      {scraperSuccess && (
        <div
          style={{
            padding: '1rem',
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle size={20} />
          <span>{scraperSuccess}</span>
        </div>
      )}

      {/* Stats */}
      {scraperStats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
              {scraperStats.totalClubs}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Vereine</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
              {scraperStats.totalTeams}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Teams</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
              {scraperStats.existingClubs}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Bekannte Vereine</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>
              {scraperStats.newClubs}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Neue Vereine</div>
          </div>
        </div>
      )}

      {/* Clubs needing confirmation */}
      {clubsNeedingConfirmation.length > 0 && (
        <div
          style={{
            padding: '1rem',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#92400e' }}>
            ⚠️ {clubsNeedingConfirmation.length} Verein(e) benötigen manuelle Bestätigung (&lt; 90% Match-Score)
          </div>
          <div style={{ fontSize: '0.9rem', color: '#78350f' }}>
            Bitte prüfe die folgenden Vereine und bestätige oder korrigiere die Zuordnung:
          </div>
        </div>
      )}

      {/* Club Summaries - Vereinfacht */}
      {scraperClubSummaries && scraperClubSummaries.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Vereine & Teams</h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {scraperClubSummaries.filter(s => {
                const needsConfirmation = s.matchScore < FUZZY_MATCH_THRESHOLD && s.matchScore > 0;
                return needsConfirmation || s.matchStatus === 'missing';
              }).length} benötigen Aufmerksamkeit
            </div>
          </div>
          
          {/* Zeige zuerst Clubs, die Aufmerksamkeit benötigen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {scraperClubSummaries
              .sort((a, b) => {
                const aNeedsAttention = (a.matchScore < FUZZY_MATCH_THRESHOLD && a.matchScore > 0) || a.matchStatus === 'missing';
                const bNeedsAttention = (b.matchScore < FUZZY_MATCH_THRESHOLD && b.matchScore > 0) || b.matchStatus === 'missing';
                if (aNeedsAttention && !bNeedsAttention) return -1;
                if (!aNeedsAttention && bNeedsAttention) return 1;
                return a.clubName.localeCompare(b.clubName);
              })
              .map((summary) => {
              const mapping = scraperClubMappings[summary.clubName] || {};
              const needsConfirmation = summary.matchScore < FUZZY_MATCH_THRESHOLD && summary.matchScore > 0;
              const status = needsConfirmation
                ? 'fuzzy'
                : summary.matchStatus === 'existing'
                  ? 'existing'
                  : summary.matchStatus === 'new'
                    ? 'new'
                    : 'missing';
              
              const needsAttention = needsConfirmation || status === 'missing';

              return (
                <div
                  key={summary.clubName}
                  style={{
                    border: needsAttention ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: needsAttention ? '1rem' : '0.75rem',
                    background: needsConfirmation ? '#fef3c7' : status === 'missing' ? '#fee2e2' : status === 'existing' ? '#f0fdf4' : '#ffffff',
                    opacity: !needsAttention && !expandedClubs.has(summary.clubName) ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleClubExpanded(summary.clubName)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <span style={{ fontSize: '1.2rem' }}>{SCRAPER_STATUS[status]?.icon || '❓'}</span>
                      <div>
                        <div style={{ fontWeight: needsAttention ? 700 : 600, fontSize: needsAttention ? '1.05rem' : '0.95rem' }}>
                          {summary.clubName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {summary.teams.length} Team(s)
                          {summary.leagues.length > 0 && ` · ${summary.leagues[0]}${summary.leagues.length > 1 ? '...' : ''}`}
                          {status === 'existing' && ' · ✅ Automatisch zugeordnet'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {needsConfirmation && (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#fde68a',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#92400e'
                          }}
                        >
                          {(summary.matchScore * 100).toFixed(0)}%
                        </span>
                      )}
                      {status === 'missing' && (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#fecaca',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#991b1b'
                          }}
                        >
                          ⚠️ Aktion nötig
                        </span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {expandedClubs.has(summary.clubName) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedClubs.has(summary.clubName) && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      {/* Club Matching */}
                      {needsConfirmation && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            Manuelle Bestätigung erforderlich:
                          </div>
                          {summary.matchedClub && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                                Vorgeschlagen: <strong>{summary.matchedClub.name}</strong> (
                                {(summary.matchScore * 100).toFixed(1)}% Ähnlichkeit)
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {summary.matchedClub && (
                              <button
                                onClick={() => handleAdoptExistingClub(summary, summary.matchedClub.id)}
                                className="btn-modern"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                              >
                                ✅ Übernehmen
                              </button>
                            )}
                            <button
                              onClick={() => handleCreateClub(summary)}
                              className="btn-modern"
                              style={{
                                fontSize: '0.85rem',
                                padding: '0.4rem 0.8rem',
                                background: '#1d4ed8'
                              }}
                            >
                              ➕ Neu anlegen
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Teams - Vereinfacht */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {summary.teams.map((team) => {
                          const teamMapping = mapping.teams?.[team.normalized] || {};
                          const isExpanded = expandedTeams.get(summary.clubName)?.has(team.normalized);
                          const teamNeedsAction = team.teamMatchStatus !== 'existing' || !team.existingTeamSeasonId;

                          return (
                            <div
                              key={team.normalized}
                              style={{
                                padding: teamNeedsAction ? '0.75rem' : '0.5rem',
                                background: team.teamMatchStatus === 'existing' ? '#f0fdf4' : '#f8fafc',
                                borderRadius: '6px',
                                border: teamNeedsAction ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                                opacity: !teamNeedsAction && !isExpanded ? 0.6 : 1
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: teamNeedsAction ? 'pointer' : 'default'
                                }}
                                onClick={() => teamNeedsAction && toggleTeamExpanded(summary.clubName, team.normalized)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                  <span style={{ fontSize: teamNeedsAction ? '1rem' : '0.9rem' }}>
                                    {team.teamMatchStatus === 'existing' ? '✅' : '🆕'}
                                  </span>
                                  <span style={{ fontWeight: teamNeedsAction ? 500 : 400, fontSize: teamNeedsAction ? '0.95rem' : '0.85rem' }}>
                                    {team.original}
                                  </span>
                                  {teamNeedsAction && (
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      ({team.category})
                                    </span>
                                  )}
                                  {!teamNeedsAction && (
                                    <span style={{ fontSize: '0.75rem', color: '#86efac', marginLeft: '0.25rem' }}>
                                      · Automatisch zugeordnet
                                    </span>
                                  )}
                                </div>
                                {teamNeedsAction && (
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {isExpanded ? '▼' : '▶'}
                                  </span>
                                )}
                              </div>

                              {isExpanded && teamNeedsAction && (
                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  {team.teamMatchStatus !== 'existing' && (
                                    <button
                                      onClick={() => handleCreateTeam(summary, team)}
                                      className="btn-modern"
                                      style={{
                                        fontSize: '0.85rem',
                                        padding: '0.5rem 1rem',
                                        background: '#1d4ed8'
                                      }}
                                    >
                                      ➕ Team anlegen
                                    </button>
                                  )}
                                  {team.existingTeamId && !team.existingTeamSeasonId && (
                                    <button
                                      onClick={() => handleEnsureTeamSeason(team.existingTeamId, summary, team)}
                                      className="btn-modern"
                                      style={{
                                        fontSize: '0.85rem',
                                        padding: '0.5rem 1rem',
                                        background: '#10b981'
                                      }}
                                    >
                                      📅 Team-Season anlegen
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import Results */}
      {scraperImportResult && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: scraperImportResult.type === 'error' ? '#fee2e2' : '#dcfce7',
            border: `1px solid ${scraperImportResult.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '8px'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            {scraperImportResult.type === 'error' ? '❌ Fehler' : '✅ Erfolg'}
          </div>
          <div>{scraperImportResult.message}</div>
        </div>
      )}

      {matchImportResult && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: matchImportResult.type === 'error' ? '#fee2e2' : matchImportResult.type === 'warning' ? '#fef3c7' : '#dcfce7',
            border: `1px solid ${matchImportResult.type === 'error' ? '#fecaca' : matchImportResult.type === 'warning' ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: '8px',
            color: matchImportResult.type === 'error' ? '#991b1b' : matchImportResult.type === 'warning' ? '#92400e' : '#166534'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            {matchImportResult.type === 'error' ? '❌ Fehler' : matchImportResult.type === 'warning' ? '⚠️ Warnung' : '✅ Match-Import'}
          </div>
          <div>{matchImportResult.message}</div>
          
          {/* Zeige Matches mit fehlenden Teams */}
          {matchImportResult.meta?.matchIssues && matchImportResult.meta.matchIssues.filter(issue => issue.type === 'missing-team').length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                ⚠️ Matches mit fehlenden Teams ({matchImportResult.meta.matchIssues.filter(issue => issue.type === 'missing-team').length}):
              </div>
              <div style={{ fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto' }}>
                {matchImportResult.meta.matchIssues
                  .filter(issue => issue.type === 'missing-team')
                  .map((issue, idx) => (
                    <div key={idx} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px' }}>
                      <div><strong>{issue.homeTeam}</strong> vs <strong>{issue.awayTeam}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {!issue.homeTeamFound && <span>❌ Heimteam fehlt</span>}
                        {!issue.awayTeamFound && <span style={{ marginLeft: '0.5rem' }}>❌ Gastteam fehlt</span>}
                        {issue.matchNumber && <span style={{ marginLeft: '0.5rem' }}>Match-Nr: {issue.matchNumber}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        💡 Diese Matches wurden als "Placeholder" gespeichert und können in der Matchdays-Ansicht manuell korrigiert werden.
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScraperTab;
