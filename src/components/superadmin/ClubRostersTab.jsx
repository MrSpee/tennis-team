import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader, CheckCircle, AlertCircle, Users, Building2, Search, Download, ExternalLink, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import './ClubRostersTab.css';

const ClubRostersTab = () => {
  // State Management
  const [clubPoolsUrl, setClubPoolsUrl] = useState('');
  const [targetSeason, setTargetSeason] = useState('Winter 2025/2026');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  
  // Team-Zuordnung
  const [allClubs, setAllClubs] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [teamMapping, setTeamMapping] = useState({}); // { "Herren 40": "team-uuid", ... }
  const [expandedTeams, setExpandedTeams] = useState(new Set()); // Welche Teams sind ausgeklappt
  
  // Import-Status
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  
  // Bulk-Import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState(null);
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [maxClubs, setMaxClubs] = useState('');
  const [dryRun, setDryRun] = useState(true);
  
  // Lade Vereine und Teams beim Mount
  useEffect(() => {
    loadClubsAndTeams();
  }, []);
  
  const loadClubsAndTeams = async () => {
    try {
      // Lade Vereine
      const { data: clubs } = await supabase
        .from('club_info')
        .select('id, name, city')
        .order('name', { ascending: true });
      setAllClubs(clubs || []);
      
      // Lade Teams (inkl. club_number)
      const { data: teams } = await supabase
        .from('team_info')
        .select('id, club_id, club_name, team_name, category, club_number, club_info!inner(id, name)')
        .order('club_name', { ascending: true });
      setAllTeams(teams || []);
    } catch (err) {
      console.error('Error loading clubs/teams:', err);
    }
  };
  
  // Auto-Match Club basierend auf Club-Nummer
  useEffect(() => {
    if (parsedData?.clubNumber && allTeams.length > 0 && !selectedClubId) {
      // Finde Club über club_number in team_info
      const teamWithClubNumber = allTeams.find(t => t.club_number === parsedData.clubNumber);
      if (teamWithClubNumber && teamWithClubNumber.club_id) {
        setSelectedClubId(teamWithClubNumber.club_id);
      }
    }
  }, [parsedData?.clubNumber, allTeams, selectedClubId]);
  
  // Auto-Match Teams wenn Club geändert wird
  useEffect(() => {
    if (parsedData && selectedClubId && allTeams.length > 0) {
      const autoMapping = {};
      parsedData.teams?.forEach(team => {
        const matchingTeam = allTeams.find(t => 
          t.category === team.contestType && t.club_id === selectedClubId
        );
        if (matchingTeam) {
          autoMapping[team.contestType] = matchingTeam.id;
        }
      });
      setTeamMapping(autoMapping);
    }
  }, [selectedClubId, parsedData, allTeams]);
  
  const handleParse = async () => {
    if (!clubPoolsUrl) {
      setError('Bitte gib eine clubPools-URL ein');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setParsedData(null);
    
    try {
      const response = await fetch('/api/import/parse-club-rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubPoolsUrl,
          targetSeason,
          apply: false
        })
      });
      
      // Lese Response-Text einmalig
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        const errorMsg = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        const fullError = errorData.details ? `${errorMsg}\n\nDetails: ${errorData.details}` : errorMsg;
        if (errorData.stack) {
          console.error('[Bulk Import] Server Stack Trace:', errorData.stack);
        }
        throw new Error(fullError);
      }
      
      // Parse JSON aus dem bereits gelesenen Text
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ungültige JSON-Response: ${responseText.substring(0, 200)}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
      
      setParsedData(result);
      
      // Auto-Match Teams basierend auf Contest Type und Category
      // Warte kurz, damit selectedClubId gesetzt werden kann
      setTimeout(() => {
        const autoMapping = {};
        result.teams?.forEach(team => {
          // Versuche Team zu finden basierend auf Contest Type (z.B. "Herren 40")
          // Filtere nach Club-Nummer, falls Club bereits zugeordnet
          const matchingTeam = allTeams.find(t => {
            const categoryMatch = t.category === team.contestType;
            // Wenn Club bereits zugeordnet, filtere auch nach club_id
            if (selectedClubId) {
              return categoryMatch && t.club_id === selectedClubId;
            }
            // Sonst auch nach club_number matchen, falls vorhanden
            if (result.clubNumber && t.club_number) {
              return categoryMatch && t.club_number === result.clubNumber;
            }
            return categoryMatch;
          });
          
          if (matchingTeam) {
            autoMapping[team.contestType] = matchingTeam.id;
          }
        });
        
        setTeamMapping(autoMapping);
      }, 100);
      
    } catch (err) {
      console.error('Error parsing club rosters:', err);
      setError(err.message || 'Fehler beim Parsen der clubPools-Seite');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImport = async () => {
    if (!parsedData || !parsedData.clubNumber) {
      setError('Bitte parse zuerst die clubPools-Seite');
      return;
    }
    
    if (!selectedClubId) {
      setError('Bitte wähle zuerst einen Verein aus');
      return;
    }
    
    // Prüfe ob mindestens ein Team zugeordnet ist
    const hasMappedTeams = Object.values(teamMapping).some(id => id !== null && id !== '');
    if (!hasMappedTeams) {
      setError('Bitte ordne mindestens ein Team zu');
      return;
    }
    
    setIsImporting(true);
    setError(null);
    setImportResult(null);
    
    try {
      const response = await fetch('/api/import/parse-club-rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubPoolsUrl,
          targetSeason,
          clubId: selectedClubId,
          teamMapping,
          apply: true
        })
      });
      
      // Lese Response-Text einmalig
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        const errorMsg = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        const fullError = errorData.details ? `${errorMsg}\n\nDetails: ${errorData.details}` : errorMsg;
        if (errorData.stack) {
          console.error('[Bulk Import] Server Stack Trace:', errorData.stack);
        }
        throw new Error(fullError);
      }
      
      // Parse JSON aus dem bereits gelesenen Text
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ungültige JSON-Response: ${responseText.substring(0, 200)}`);
      }
      setImportResult(result);
      
      // Lade Teams neu, um aktualisierte Daten zu haben
      await loadClubsAndTeams();
      
    } catch (err) {
      console.error('Error importing club rosters:', err);
      setError(err.message || 'Fehler beim Importieren der Meldelisten');
    } finally {
      setIsImporting(false);
    }
  };
  
  const toggleTeamExpansion = (teamName) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };
  
  const getTeamOptions = (contestType) => {
    // Filtere Teams nach Contest Type (z.B. "Herren 40" -> category "Herren 40")
    // Wenn Club ausgewählt, filtere auch nach club_id
    let filtered = allTeams.filter(t => t.category === contestType);
    
    if (selectedClubId) {
      filtered = filtered.filter(t => t.club_id === selectedClubId);
    }
    
    return filtered;
  };
  
  const handleBulkImport = async () => {
    setIsBulkImporting(true);
    setError(null);
    setBulkImportResult(null);
    setBulkImportProgress({ current: 0, total: 0, message: 'Starte Bulk-Import...' });
    
    try {
      const response = await fetch('/api/import/bulk-import-club-rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSeason,
          maxClubs: maxClubs ? parseInt(maxClubs, 10) : null,
          delayBetweenClubs: 2000,
          delayBetweenTeams: 500,
          dryRun
        })
      });
      
      // Lese Response-Text einmalig
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        const errorMsg = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        const fullError = errorData.details ? `${errorMsg}\n\nDetails: ${errorData.details}` : errorMsg;
        if (errorData.stack) {
          console.error('[Bulk Import] Server Stack Trace:', errorData.stack);
        }
        throw new Error(fullError);
      }
      
      // Parse JSON aus dem bereits gelesenen Text
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ungültige JSON-Response: ${responseText.substring(0, 200)}`);
      }
      setBulkImportResult(result);
      
      // Lade Teams neu
      await loadClubsAndTeams();
      
    } catch (err) {
      console.error('Error bulk importing club rosters:', err);
      setError(err.message || 'Fehler beim Bulk-Import der Meldelisten');
    } finally {
      setIsBulkImporting(false);
      setBulkImportProgress(null);
    }
  };
  
  return (
    <div className="club-rosters-tab">
      {/* Header */}
      <div className="club-rosters-header">
        <div className="header-content">
          <div>
            <h2 className="tab-title">
              <Users size={28} />
              Meldelisten-Import
            </h2>
            <p className="tab-subtitle">
              Importiere Meldelisten direkt von nuLiga clubPools-Seiten
            </p>
          </div>
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="bulk-import-toggle"
          >
            {showBulkImport ? 'Einzel-Import' : 'Bulk-Import'}
          </button>
        </div>
      </div>
      
      {/* Bulk-Import Bereich */}
      {showBulkImport && (
        <div className="bulk-import-section">
          <h3 className="bulk-import-title">
            <Download size={20} />
            Automatischer Bulk-Import
          </h3>
          <p className="bulk-import-description">
            Importiert automatisch Meldelisten für alle Vereine. 
            <strong> Wichtig:</strong> Der Bulk-Import funktioniert nur, wenn die Teams bereits eine `club_number` haben oder eine `clubPools`-URL in `team_seasons.source_url` vorhanden ist.
            Die Teams werden automatisch zugeordnet basierend auf Category.
          </p>
          
          <div className="bulk-import-controls">
            <div className="input-group">
              <label htmlFor="maxClubs">
                Max. Vereine (leer = alle)
              </label>
              <input
                id="maxClubs"
                type="number"
                placeholder="z.B. 10 für Test"
                value={maxClubs}
                onChange={(e) => setMaxClubs(e.target.value)}
                className="max-clubs-input"
              />
            </div>
            
            <div className="input-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Dry-Run (nur testen, nichts speichern)
              </label>
            </div>
            
            <button
              onClick={handleBulkImport}
              disabled={isBulkImporting}
              className="bulk-import-button"
            >
              {isBulkImporting ? (
                <>
                  <Loader className="spinner" size={18} />
                  Importiere...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Bulk-Import starten
                </>
              )}
            </button>
          </div>
          
          {bulkImportProgress && (
            <div className="bulk-import-progress">
              <p>{bulkImportProgress.message}</p>
              {bulkImportProgress.total > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
          
          {bulkImportResult && (
            <div className="bulk-import-results">
              <h4>Ergebnisse:</h4>
              <div className="results-stats">
                <div className="stat-item success">
                  <strong>{bulkImportResult.success || 0}</strong> erfolgreich
                </div>
                <div className="stat-item failed">
                  <strong>{bulkImportResult.failed || 0}</strong> fehlgeschlagen
                </div>
                <div className="stat-item skipped">
                  <strong>{bulkImportResult.skipped || 0}</strong> übersprungen
                </div>
                <div className="stat-item total">
                  <strong>{bulkImportResult.total || 0}</strong> insgesamt
                </div>
              </div>
              
              {bulkImportResult.clubs && bulkImportResult.clubs.length > 0 && (
                <div className="clubs-list">
                  <h5>Details:</h5>
                  <div className="clubs-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Verein</th>
                          <th>Club-Nr.</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkImportResult.clubs.map((club, idx) => (
                          <tr key={idx} className={`status-${club.status}`}>
                            <td>{club.clubName}</td>
                            <td>{club.clubNumber}</td>
                            <td>
                              <span className={`status-badge status-${club.status}`}>
                                {club.status}
                              </span>
                            </td>
                            <td>
                              {club.status === 'success' && (
                                <span>
                                  {club.teamsImported} Teams, {club.totalPlayers} Spieler ({club.matchedPlayers} gematcht)
                                </span>
                              )}
                              {club.status === 'failed' && (
                                <span className="error-text">{club.error}</span>
                              )}
                              {club.status === 'skipped' && (
                                <span>{club.reason}</span>
                              )}
                              {club.status === 'dry-run' && (
                                <span>
                                  {club.teamsFound} Teams gefunden, {club.teamsMapped} zugeordnet
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Eingabe-Bereich (Einzel-Import) */}
      {!showBulkImport && (
      <div className="club-rosters-input-section">
        <div className="input-group">
          <label htmlFor="clubPoolsUrl">
            <Building2 size={18} />
            clubPools-URL
          </label>
          <input
            id="clubPoolsUrl"
            type="text"
            placeholder="https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
            value={clubPoolsUrl}
            onChange={(e) => setClubPoolsUrl(e.target.value)}
            className="url-input"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="targetSeason">
            <CalendarDays size={18} />
            Saison
          </label>
          <input
            id="targetSeason"
            type="text"
            placeholder="Winter 2025/2026"
            value={targetSeason}
            onChange={(e) => setTargetSeason(e.target.value)}
            className="season-input"
          />
        </div>
        
        <button
          onClick={handleParse}
          disabled={isLoading || !clubPoolsUrl}
          className="parse-button"
        >
          {isLoading ? (
            <>
              <Loader className="spinner" size={18} />
              Lade...
            </>
          ) : (
            <>
              <Search size={18} />
              Meldelisten laden
            </>
          )}
        </button>
      </div>
      )}
      
      {/* Fehler-Anzeige */}
      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {/* Erfolgs-Anzeige */}
      {importResult && (
        <div className="success-message">
          <CheckCircle size={20} />
          <div>
            <strong>Import erfolgreich!</strong>
            <p>{importResult.message}</p>
            {importResult.savedRosters && importResult.savedRosters.length > 0 && (
              <ul>
                {importResult.savedRosters.map((roster, idx) => (
                  <li key={idx}>
                    {roster.teamName}: {roster.matched || 0}/{roster.total || 0} Spieler gematcht
                  </li>
                ))}
              </ul>
            )}
            {importResult.failedTeams && importResult.failedTeams.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px' }}>
                <strong style={{ color: '#dc2626' }}>⚠️ Probleme beim Import:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {importResult.failedTeams.map((failed, idx) => (
                    <li key={idx} style={{ color: '#991b1b', marginBottom: '0.25rem' }}>
                      <strong>{failed.contestType || failed.teamName}</strong>: {failed.reason}
                      {failed.teamUrl && (
                        <div style={{ fontSize: '0.875rem', color: '#7f1d1d', marginTop: '0.25rem' }}>
                          URL: <a href={failed.teamUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>{failed.teamUrl}</a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Ergebnisse */}
      {parsedData && (
        <div className="club-rosters-results">
          {/* Club-Info */}
          <div className="club-info-card">
            <div className="club-info-header">
              <Building2 size={24} />
              <div style={{ flex: 1 }}>
                <h3>Verein</h3>
                <p className="club-number">Club-Nummer: {parsedData.clubNumber}</p>
              </div>
              <div className="club-select-wrapper">
                <label htmlFor="clubSelect" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                  Verein zuordnen:
                </label>
                <select
                  id="clubSelect"
                  value={selectedClubId || ''}
                  onChange={(e) => setSelectedClubId(e.target.value || null)}
                  className="club-select"
                >
                  <option value="">Verein auswählen...</option>
                  {allClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} {club.city ? `(${club.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Teams-Liste */}
          <div className="teams-list">
            <h3 className="teams-list-title">
              <Users size={20} />
              Teams ({parsedData.teams?.length || 0})
            </h3>
            
            {parsedData.teams?.map((team, idx) => {
              const isExpanded = expandedTeams.has(team.contestType);
              const teamOptions = getTeamOptions(team.contestType);
              const selectedTeamId = teamMapping[team.contestType];
              
              return (
                <div key={idx} className="team-card">
                  <div 
                    className="team-card-header"
                    onClick={() => toggleTeamExpansion(team.contestType)}
                  >
                    <div className="team-header-left">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      <div>
                        <h4 className="team-name">{team.teamName}</h4>
                        <p className="team-meta">
                          {team.playerCount || 0} Spieler
                          {team.contestType && ` · ${team.contestType}`}
                        </p>
                      </div>
                    </div>
                    <div className="team-header-right">
                      <select
                        value={selectedTeamId || ''}
                        onChange={(e) => {
                          setTeamMapping({
                            ...teamMapping,
                            [team.contestType]: e.target.value || null
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="team-select"
                      >
                        <option value="">Team zuordnen...</option>
                        {teamOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.club_name} {opt.team_name || ''} ({opt.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {isExpanded && team.roster && team.roster.length > 0 && (
                    <div className="team-roster-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Rang</th>
                            <th>Name</th>
                            <th>LK</th>
                            <th>TVM-ID</th>
                            <th>Geburtsjahr</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.roster.map((player, pIdx) => (
                            <tr key={pIdx}>
                              <td className="rank-cell">{player.rank}</td>
                              <td className="name-cell">{player.name}</td>
                              <td className="lk-cell">{player.lk || '-'}</td>
                              <td className="tvm-id-cell">{player.tvmId || '-'}</td>
                              <td className="birth-year-cell">{player.birthYear || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Import-Button */}
          <div className="import-actions">
            <div className="import-info">
              <p>
                {Object.values(teamMapping).filter(id => id).length} von {parsedData.teams?.length || 0} Teams zugeordnet
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={isImporting || !parsedData.clubNumber || !selectedClubId || Object.values(teamMapping).filter(id => id).length === 0}
              className="import-button"
            >
              {isImporting ? (
                <>
                  <Loader className="spinner" size={18} />
                  Importiere...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Meldelisten importieren
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubRostersTab;

