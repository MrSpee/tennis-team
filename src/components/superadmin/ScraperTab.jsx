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

      {/* Konfiguration */}
      <div className="scraper-config-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Import-Modus:
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                value="selected"
                checked={importMode === 'selected'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              <span>Einzelne Gruppen (für Tests)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                value="all"
                checked={importMode === 'all'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              <span>Alle Gruppen (automatisch)</span>
            </label>
          </div>
        </div>

        {importMode === 'selected' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Gruppen (kommagetrennt, z.B. 43,44,46):
            </label>
            <input
              type="text"
              value={scraperApiGroups}
              onChange={(e) => setScraperApiGroups(e.target.value)}
              placeholder="43,44,46"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={scraperApiApplyMode}
              onChange={(e) => setScraperApiApplyMode(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>Direktimport aktiv (schreibt in Supabase)</span>
          </label>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
            Wenn aktiviert, werden Teams, Team-Seasons und Matchdays direkt in die Datenbank geschrieben.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleFetchClick}
            disabled={scraperApiLoading}
            className="btn-modern"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {scraperApiLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Lade Daten...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {importMode === 'all' ? 'Alle Gruppen laden' : 'Gruppen laden'}
              </>
            )}
          </button>

          {scraperData && (
            <button
              onClick={handleScraperImport}
              disabled={scraperImporting || clubsNeedingConfirmation.length > 0}
              className="btn-modern"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: scraperImporting ? '#94a3b8' : '#10b981'
              }}
            >
              {scraperImporting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Import starten
                </>
              )}
            </button>
          )}

          {scraperData && (
            <button
              onClick={resetScraper}
              className="btn-modern btn-modern-inactive"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <X size={16} />
              Zurücksetzen
            </button>
          )}
        </div>
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

      {/* Club Summaries */}
      {scraperClubSummaries && scraperClubSummaries.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Vereine & Teams</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {scraperClubSummaries.map((summary) => {
              const mapping = scraperClubMappings[summary.clubName] || {};
              const needsConfirmation = summary.matchScore < FUZZY_MATCH_THRESHOLD && summary.matchScore > 0;
              const status = needsConfirmation
                ? 'fuzzy'
                : summary.matchStatus === 'existing'
                  ? 'existing'
                  : summary.matchStatus === 'new'
                    ? 'new'
                    : 'missing';

              return (
                <div
                  key={summary.clubName}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: needsConfirmation ? '#fef3c7' : '#ffffff'
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
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{summary.clubName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {summary.teams.length} Team(s) · {summary.leagues.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                          {(summary.matchScore * 100).toFixed(1)}% Match
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

                      {/* Teams */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {summary.teams.map((team) => {
                          const teamMapping = mapping.teams?.[team.normalized] || {};
                          const isExpanded = expandedTeams.get(summary.clubName)?.has(team.normalized);

                          return (
                            <div
                              key={team.normalized}
                              style={{
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                                onClick={() => toggleTeamExpanded(summary.clubName, team.normalized)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>
                                    {team.teamMatchStatus === 'existing' ? '✅' : '🆕'}
                                  </span>
                                  <span style={{ fontWeight: 500 }}>{team.original}</span>
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    ({team.category})
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                                  {team.teamMatchStatus !== 'existing' && (
                                    <button
                                      onClick={() => handleCreateTeam(summary, team)}
                                      className="btn-modern"
                                      style={{
                                        fontSize: '0.85rem',
                                        padding: '0.4rem 0.8rem',
                                        background: '#1d4ed8'
                                      }}
                                    >
                                      ➕ Team anlegen
                                    </button>
                                  )}
                                  {team.existingTeamId && !team.existingTeamSeasonId && (
                                    <button
                                      onClick={() =>
                                        handleEnsureTeamSeason(team.existingTeamId, summary, team)
                                      }
                                      className="btn-modern"
                                      style={{
                                        fontSize: '0.85rem',
                                        padding: '0.4rem 0.8rem',
                                        background: '#10b981',
                                        marginLeft: '0.5rem'
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
