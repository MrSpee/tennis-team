import { useState } from 'react';
import { Loader, CheckCircle, AlertCircle, Trophy, Search, Download, CalendarDays } from 'lucide-react';

const MatchErgebnisseSection = () => {
  const [leagueUrl, setLeagueUrl] = useState('');
  const [season, setSeason] = useState('Winter 2025/26');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // League Groups
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  // Match Results
  const [matchResults, setMatchResults] = useState(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  
  const handleLoadGroups = async () => {
    if (!leagueUrl) {
      setError('Bitte gib eine Liga-URL ein');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGroups([]);
    
    try {
      const response = await fetch('/api/import/nuliga-matches-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'league-groups',
          leagueUrl,
          season
        })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        const errorMsg = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ungültige JSON-Response: ${responseText.substring(0, 200)}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
      
      setGroups(result.groups || []);
      
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err.message || 'Fehler beim Laden der Liga-Gruppen');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLoadMatches = async () => {
    if (!leagueUrl) {
      setError('Bitte gib eine Liga-URL ein');
      return;
    }
    
    if (selectedGroups.length === 0) {
      setError('Bitte wähle mindestens eine Gruppe aus');
      return;
    }
    
    setIsLoadingMatches(true);
    setError(null);
    setMatchResults(null);
    
    try {
      const groupsParam = selectedGroups.join(',');
      
      const response = await fetch('/api/import/nuliga-matches-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match-results',
          leagueUrl,
          season,
          groups: groupsParam,
          apply: false
        })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        const errorMsg = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ungültige JSON-Response: ${responseText.substring(0, 200)}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
      
      setMatchResults(result);
      
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err.message || 'Fehler beim Laden der Match-Ergebnisse');
    } finally {
      setIsLoadingMatches(false);
    }
  };
  
  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };
  
  return (
    <div className="match-ergebnisse-section">
      {/* Input Section */}
      <div className="input-section">
        <div className="input-group">
          <label htmlFor="leagueUrl">
            <Trophy size={18} />
            Liga-URL (leaguePage)
          </label>
          <input
            id="leagueUrl"
            type="text"
            placeholder="https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=..."
            value={leagueUrl}
            onChange={(e) => setLeagueUrl(e.target.value)}
            className="url-input"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="season">
            <CalendarDays size={18} />
            Saison
          </label>
          <input
            id="season"
            type="text"
            placeholder="Winter 2025/26"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="season-input"
          />
        </div>
        
        <button
          onClick={handleLoadGroups}
          disabled={isLoading || !leagueUrl}
          className="load-button"
        >
          {isLoading ? (
            <>
              <Loader className="spinner" size={18} />
              Lade Gruppen...
            </>
          ) : (
            <>
              <Search size={18} />
              Gruppen auflisten
            </>
          )}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {/* Groups List */}
      {groups.length > 0 && (
        <div className="groups-section">
          <h3 className="section-title">
            <Trophy size={20} />
            Liga-Gruppen ({groups.length})
          </h3>
          
          <div className="groups-list">
            {groups.map((group, idx) => (
              <div
                key={idx}
                className={`group-card ${selectedGroups.includes(group.groupId) ? 'selected' : ''}`}
                onClick={() => toggleGroupSelection(group.groupId)}
              >
                <div className="group-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.groupId)}
                    onChange={() => toggleGroupSelection(group.groupId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="group-info">
                  <div className="group-name">{group.groupName || group.category}</div>
                  <div className="group-meta">
                    {group.category && <span>{group.category}</span>}
                    {group.matchCount > 0 && (
                      <span>{group.matchCount} Matches</span>
                    )}
                  </div>
                </div>
                <div className="group-id">{group.groupId}</div>
              </div>
            ))}
          </div>
          
          {selectedGroups.length > 0 && (
            <div className="groups-actions">
              <button
                onClick={handleLoadMatches}
                disabled={isLoadingMatches}
                className="load-matches-button"
              >
                {isLoadingMatches ? (
                  <>
                    <Loader className="spinner" size={18} />
                    Lade Match-Ergebnisse...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Match-Ergebnisse laden ({selectedGroups.length} Gruppen)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Match Results */}
      {matchResults && (
        <div className="match-results-section">
          <h3 className="section-title">
            <CheckCircle size={20} />
            Match-Ergebnisse
          </h3>
          
          <div className="results-info">
            <p>✅ Daten erfolgreich geladen</p>
            <p className="info-text">
              Die Match-Ergebnisse wurden geladen. Der Import in die Datenbank ist noch nicht implementiert.
            </p>
          </div>
          
          <pre className="results-json">
            {JSON.stringify(matchResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MatchErgebnisseSection;

