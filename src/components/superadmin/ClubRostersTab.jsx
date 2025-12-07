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
  
  // Club-Nummern finden
  const [showFindClubNumbers, setShowFindClubNumbers] = useState(false);
  const [isFindingClubNumbers, setIsFindingClubNumbers] = useState(false);
  const [findClubNumbersProgress, setFindClubNumbersProgress] = useState(null);
  const [findClubNumbersResult, setFindClubNumbersResult] = useState(null);
  const [maxClubsToFind, setMaxClubsToFind] = useState('');
  const [dryRunFind, setDryRunFind] = useState(true);
  const [selectedClubsForSearch, setSelectedClubsForSearch] = useState(new Set()); // Club-IDs für Suche
  
  // Vereins-Übersicht mit Meldelisten-Status
  const [clubsWithRosters, setClubsWithRosters] = useState([]);
  const [loadingClubsOverview, setLoadingClubsOverview] = useState(false);
  
  // Lade Vereine und Teams beim Mount
  useEffect(() => {
    loadClubsAndTeams();
    loadClubsOverview();
  }, []);
  
  // Lade Übersicht der Vereine mit Meldelisten-Status
  const loadClubsOverview = async () => {
    setLoadingClubsOverview(true);
    try {
      // Lade alle Vereine
      const { data: clubs, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name, city')
        .order('name', { ascending: true });
      
      if (clubsError) throw clubsError;
      
      // Lade Teams mit club_number
      const { data: teams, error: teamsError } = await supabase
        .from('team_info')
        .select('id, club_id, club_number')
        .not('club_number', 'is', null);
      
      if (teamsError) throw teamsError;
      
      // Gruppiere Teams nach club_id und extrahiere club_number
      const clubNumbersMap = new Map();
      teams?.forEach(team => {
        if (team.club_id && team.club_number) {
          clubNumbersMap.set(team.club_id, team.club_number);
        }
      });
      
      // Lade Meldelisten-Status für jeden Verein
      // WICHTIG: Zähle Teams und Spieler pro Saison, um Vollständigkeit zu prüfen
      const { data: rosterData, error: rosterError } = await supabase
        .from('team_roster')
        .select(`
          team_id,
          season,
          player_name,
          team_info!inner(club_id, club_name, category, team_name)
        `);
      
      if (rosterError) throw rosterError;
      
      // Gruppiere Meldelisten nach club_id und season
      const rostersByClub = new Map();
      rosterData?.forEach(roster => {
        const clubId = roster.team_info?.club_id;
        const season = roster.season;
        if (clubId && season) {
          if (!rostersByClub.has(clubId)) {
            rostersByClub.set(clubId, {
              clubId,
              seasons: new Map() // Map<season, {teams: Set, playerCount: number}>
            });
          }
          const clubData = rostersByClub.get(clubId);
          if (!clubData.seasons.has(season)) {
            clubData.seasons.set(season, {
              teams: new Set(),
              playerCount: 0
            });
          }
          const seasonData = clubData.seasons.get(season);
          // Zähle eindeutige Teams (team_id)
          if (roster.team_id) {
            seasonData.teams.add(roster.team_id);
          }
          // Zähle Spieler (jeder Eintrag = ein Spieler)
          if (roster.player_name) {
            seasonData.playerCount++;
          }
        }
      });
      
      // Erstelle Übersicht
      const overview = (clubs || []).map(club => {
        const hasRoster = rostersByClub.has(club.id);
        const rosterInfo = rostersByClub.get(club.id);
        const clubNumber = clubNumbersMap.get(club.id);
        
        // Berechne Gesamtstatistiken über alle Saisons
        let totalTeams = 0;
        let totalPlayers = 0;
        const seasons = [];
        
        if (hasRoster && rosterInfo.seasons.size > 0) {
          rosterInfo.seasons.forEach((seasonData, season) => {
            seasons.push({
              season,
              teamCount: seasonData.teams.size,
              playerCount: seasonData.playerCount
            });
            totalTeams += seasonData.teams.size;
            totalPlayers += seasonData.playerCount;
          });
        }
        
        // Prüfe Vollständigkeit: Ein Verein hat vollständige Meldelisten, wenn:
        // 1. Es gibt Meldelisten-Daten (hasRoster)
        // 2. Es gibt mindestens eine Saison mit Teams und Spielern
        // 3. Die Daten sind plausibel (mehr als 0 Teams und Spieler)
        const isComplete = hasRoster && seasons.length > 0 && 
          seasons.some(s => s.teamCount > 0 && s.playerCount > 0);
        
        return {
          id: club.id,
          name: club.name,
          city: club.city,
          clubNumber: clubNumber || null,
          hasRoster: isComplete,
          seasons: seasons.sort((a, b) => b.season.localeCompare(a.season)), // Neueste zuerst
          totalTeams,
          totalPlayers
        };
      });
      
      setClubsWithRosters(overview);
      
    } catch (err) {
      console.error('Error loading clubs overview:', err);
    } finally {
      setLoadingClubsOverview(false);
    }
  };
  
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
      
      // Auto-Match Verein basierend auf erkanntem Vereinsnamen
      if (result.clubName) {
        console.log(`[ClubRostersTab] 🔍 Suche Verein: "${result.clubName}"`);
        
        // Versuche exakten Match
        let matchingClub = allClubs.find(c => 
          c.name.toLowerCase().trim() === result.clubName.toLowerCase().trim()
        );
        
        // Fallback: Teilstring-Match
        if (!matchingClub) {
          matchingClub = allClubs.find(c => 
            c.name.toLowerCase().includes(result.clubName.toLowerCase()) ||
            result.clubName.toLowerCase().includes(c.name.toLowerCase())
          );
        }
        
        if (matchingClub) {
          console.log(`[ClubRostersTab] ✅ Verein gefunden: "${matchingClub.name}" (${matchingClub.id})`);
          setSelectedClubId(matchingClub.id);
        } else {
          console.warn(`[ClubRostersTab] ⚠️ Kein Verein gefunden für: "${result.clubName}"`);
        }
      }
      
      // Auto-Match Teams basierend auf Contest Type und Category
      // Warte kurz, damit selectedClubId gesetzt werden kann
      setTimeout(() => {
        const autoMapping = {};
        const clubIdToUse = selectedClubId || (result.clubName ? allClubs.find(c => 
          c.name.toLowerCase().trim() === result.clubName?.toLowerCase().trim()
        )?.id : null);
        
        result.teams?.forEach(team => {
          // Versuche Team zu finden basierend auf Contest Type (z.B. "Herren 40")
          // Filtere nach Club-ID oder Club-Nummer
          const matchingTeam = allTeams.find(t => {
            const categoryMatch = t.category === team.contestType;
            
            // Wenn Club-ID verfügbar, filtere danach
            if (clubIdToUse) {
              return categoryMatch && t.club_id === clubIdToUse;
            }
            
            // Sonst nach club_number matchen, falls vorhanden
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
      }, 200);
      
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
      // Lade auch Übersicht neu
      await loadClubsOverview();
      
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
  
  const handleFindClubNumbers = async () => {
    setIsFindingClubNumbers(true);
    setError(null);
    setFindClubNumbersResult(null);
    setFindClubNumbersProgress({ current: 0, total: 0, message: 'Starte Suche nach Club-Nummern...' });
    
    try {
      // Wenn Clubs ausgewählt wurden, verwende diese, sonst alle
      const clubIds = selectedClubsForSearch.size > 0 
        ? Array.from(selectedClubsForSearch)
        : null;
      
      const response = await fetch('/api/import/find-club-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubIds: clubIds,
          maxClubs: maxClubsToFind || null,
          dryRun: dryRunFind
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
      
      setFindClubNumbersResult(result);
      
      // Lade Teams neu, um aktualisierte club_number zu haben
      await loadClubsAndTeams();
      // Lade auch Übersicht neu
      await loadClubsOverview();
      
    } catch (err) {
      console.error('Error finding club numbers:', err);
      setError(err.message || 'Fehler beim Finden der Club-Nummern');
    } finally {
      setIsFindingClubNumbers(false);
      setFindClubNumbersProgress(null);
    }
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
      // Lade auch Übersicht neu
      await loadClubsOverview();
      
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setShowFindClubNumbers(!showFindClubNumbers);
                setShowBulkImport(false);
              }}
              className="bulk-import-toggle"
              style={{ 
                background: showFindClubNumbers ? '#3b82f6' : '#6b7280',
                color: 'white'
              }}
            >
              {showFindClubNumbers ? 'Zurück' : '🔍 Club-Nummern finden'}
            </button>
            <button
              onClick={() => {
                setShowBulkImport(!showBulkImport);
                setShowFindClubNumbers(false);
              }}
              className="bulk-import-toggle"
            >
              {showBulkImport ? 'Einzel-Import' : 'Bulk-Import'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Club-Nummern finden Bereich */}
      {showFindClubNumbers && (
        <div className="bulk-import-section">
          <h3 className="bulk-import-title">
            🔍 Club-Nummern automatisch finden
          </h3>
          <p className="bulk-import-description">
            Diese Funktion durchsucht die nuLiga Vereinssuche-Seite, um automatisch Club-Nummern für alle Vereine in der Datenbank zu finden. 
            <strong> Wichtig:</strong> Die Suche kann einige Zeit dauern, da zwischen den Requests Pausen eingelegt werden, um nicht als Bot erkannt zu werden (10-15 Sekunden pro Verein).
          </p>
          
          {/* Vereins-Übersicht mit Meldelisten-Status */}
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                📊 Vereins-Übersicht (Meldelisten-Status)
              </h4>
              <span style={{
                background: '#3b82f6',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {clubsWithRosters.filter(c => c.hasRoster).length} / {clubsWithRosters.length} integriert
              </span>
            </div>
            
            {loadingClubsOverview ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader className="spinner" size={20} />
                <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Lade Übersicht...</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f3f4f6' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', width: '40px' }}>#</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={selectedClubsForSearch.size === clubsWithRosters.length && clubsWithRosters.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClubsForSearch(new Set(clubsWithRosters.map(c => c.id)));
                            } else {
                              setSelectedClubsForSearch(new Set());
                            }
                          }}
                          style={{ marginRight: '0.5rem' }}
                        />
                        Verein
                      </th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>Club-Nummer</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>Meldelisten<br/><span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#6b7280' }}>(Teams / Spieler)</span></th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>Saisons</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubsWithRosters.map((club, index) => (
                      <tr 
                        key={club.id}
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          background: club.hasRoster ? '#f0fdf4' : '#fef2f2'
                        }}
                      >
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedClubsForSearch.has(club.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedClubsForSearch);
                              if (e.target.checked) {
                                newSet.add(club.id);
                              } else {
                                newSet.delete(club.id);
                              }
                              setSelectedClubsForSearch(newSet);
                            }}
                            style={{ marginRight: '0.5rem' }}
                          />
                          <strong>{club.name}</strong>
                          {club.city && (
                            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                              ({club.city})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {club.clubNumber ? (
                            <code style={{ 
                              background: '#e0e7ff', 
                              padding: '0.125rem 0.375rem', 
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}>
                              {club.clubNumber}
                            </code>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Nicht vorhanden</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {club.hasRoster && club.totalTeams > 0 && club.totalPlayers > 0 ? (
                            <span style={{ 
                              color: '#16a34a', 
                              fontWeight: '600',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.125rem'
                            }}>
                              <CheckCircle size={16} />
                              <span style={{ fontSize: '0.875rem' }}>
                                {club.totalTeams} Teams
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {club.totalPlayers} Spieler
                              </span>
                            </span>
                          ) : (
                            <span style={{ 
                              color: '#dc2626', 
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}>
                              <AlertCircle size={16} />
                              Keine
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {club.hasRoster && club.seasons.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {club.seasons.map((seasonInfo, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                  <span 
                                    style={{ 
                                      background: '#dbeafe', 
                                      padding: '0.125rem 0.375rem', 
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {seasonInfo.season}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                    {seasonInfo.teamCount} Teams, {seasonInfo.playerCount} Spieler
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {club.hasRoster && club.clubNumber ? (
                            <span style={{ 
                              background: '#dcfce7', 
                              color: '#16a34a',
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              ✅ Vollständig
                            </span>
                          ) : club.hasRoster ? (
                            <span style={{ 
                              background: '#fef3c7', 
                              color: '#d97706',
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              ⚠️ Fehlt Club-Nr.
                            </span>
                          ) : (
                            <span style={{ 
                              background: '#fee2e2', 
                              color: '#dc2626',
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              ❌ Fehlt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#eff6ff', 
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}>
                  <strong>Legende:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                    <li><strong>✅ Vollständig:</strong> Verein hat vollständige Meldelisten (Teams und Spieler pro Saison) und Club-Nummer</li>
                    <li><strong>⚠️ Fehlt Club-Nr.:</strong> Verein hat vollständige Meldelisten, aber keine Club-Nummer</li>
                    <li><strong>❌ Fehlt:</strong> Verein hat keine vollständigen Meldelisten (keine Teams/Spieler-Daten pro Saison)</li>
                  </ul>
                  <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                    <strong>Hinweis:</strong> Ein Verein gilt als "vollständig integriert", wenn für mindestens eine Saison sowohl die Anzahl der Teams als auch die Anzahl der Spieler bekannt sind. 
                    Markiere Vereine per Checkbox, um nur diese für die Club-Nummer-Suche zu verwenden. 
                    Wenn keine ausgewählt sind, werden alle Vereine durchsucht.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="bulk-import-controls">
            <div className="input-group">
              <label htmlFor="maxClubsToFind">
                Max. Anzahl Vereine (leer = alle)
              </label>
              <input
                id="maxClubsToFind"
                type="number"
                placeholder="z.B. 10"
                value={maxClubsToFind}
                onChange={(e) => setMaxClubsToFind(e.target.value)}
                className="number-input"
              />
            </div>
            
            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="dryRunFind"
                type="checkbox"
                checked={dryRunFind}
                onChange={(e) => setDryRunFind(e.target.checked)}
              />
              <label htmlFor="dryRunFind" style={{ margin: 0, cursor: 'pointer' }}>
                Dry Run (nur testen, keine Änderungen speichern)
              </label>
            </div>
            
            <button
              onClick={handleFindClubNumbers}
              disabled={isFindingClubNumbers}
              className="bulk-import-button"
            >
              {isFindingClubNumbers ? (
                <>
                  <Loader className="spinner" size={18} />
                  Suche läuft...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Club-Nummern finden
                  {selectedClubsForSearch.size > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                      ({selectedClubsForSearch.size} ausgewählt)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
          
          {findClubNumbersProgress && (
            <div className="bulk-import-progress">
              <p>{findClubNumbersProgress.message}</p>
              {findClubNumbersProgress.total > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(findClubNumbersProgress.current / findClubNumbersProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
          
          {findClubNumbersResult && (
            <div className="bulk-import-results">
              <h4>Ergebnisse:</h4>
              <div className="results-summary">
                <span>
                  <strong>{findClubNumbersResult.summary?.success || 0}</strong> erfolgreich
                </span>
                <span>
                  <strong>{findClubNumbersResult.summary?.errors || 0}</strong> Fehler
                </span>
                <span>
                  <strong>{findClubNumbersResult.summary?.total || 0}</strong> insgesamt
                </span>
                {findClubNumbersResult.summary?.dryRun && (
                  <span style={{ color: '#f59e0b' }}>
                    ⚠️ Dry Run (keine Änderungen gespeichert)
                  </span>
                )}
              </div>
              
              {findClubNumbersResult.results && findClubNumbersResult.results.length > 0 && (
                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Verein</th>
                        <th>Status</th>
                        <th>Club-Nummer</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findClubNumbersResult.results.map((result, idx) => (
                        <tr key={idx}>
                          <td>{result.clubName}</td>
                          <td>
                            <span className={`status-badge status-${result.status}`}>
                              {result.status === 'success' && '✅ Erfolg'}
                              {result.status === 'not_found' && '❌ Nicht gefunden'}
                              {result.status === 'low_confidence' && '⚠️ Niedrige Übereinstimmung'}
                              {result.status === 'error' && '❌ Fehler'}
                            </span>
                          </td>
                          <td>
                            {result.clubNumber ? (
                              <code>{result.clubNumber}</code>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {result.message}
                              {result.matchedClubName && result.matchedClubName !== result.clubName && (
                                <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                                  Gefundener Name: {result.matchedClubName} ({Math.round((result.matchScore || 0) * 100)}% Übereinstimmung)
                                </div>
                              )}
                              {result.alternatives && result.alternatives.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <strong>Alternativen:</strong>
                                  <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                                    {result.alternatives.map((alt, altIdx) => (
                                      <li key={altIdx}>
                                        {alt.clubName} (Club-Nr: {alt.clubNumber}, {Math.round(alt.score * 100)}%)
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
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
                    {roster.membershipsCreated > 0 && (
                      <span style={{ marginLeft: '0.5rem', color: '#10b981', fontSize: '0.875rem' }}>
                        · {roster.membershipsCreated} Mannschaftszugehörigkeiten erstellt
                      </span>
                    )}
                    {roster.membershipsUpdated > 0 && (
                      <span style={{ marginLeft: '0.5rem', color: '#3b82f6', fontSize: '0.875rem' }}>
                        · {roster.membershipsUpdated} aktualisiert
                      </span>
                    )}
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
                {parsedData.clubName && (
                  <p className="club-name" style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>
                    🏢 {parsedData.clubName}
                  </p>
                )}
                {parsedData.clubNumber && (
                  <p className="club-number">Club-Nummer: {parsedData.clubNumber}</p>
                )}
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
              Mannschaften
            </h3>
            
            {parsedData.teams?.map((team, idx) => {
              // Gruppiere Spieler nach team_number (Mannschaftsnummer)
              const playersByTeamNumber = {};
              if (team.roster && team.roster.length > 0) {
                team.roster.forEach(player => {
                  const teamNum = player.teamNumber || 1; // Fallback: 1 wenn nicht vorhanden
                  if (!playersByTeamNumber[teamNum]) {
                    playersByTeamNumber[teamNum] = [];
                  }
                  playersByTeamNumber[teamNum].push(player);
                });
              }
              
              // Sortiere team_number (1, 2, 3, etc.)
              const sortedTeamNumbers = Object.keys(playersByTeamNumber)
                .map(n => parseInt(n, 10))
                .sort((a, b) => a - b);
              
              // Wenn nur eine Mannschaft vorhanden ist, zeige wie bisher
              if (sortedTeamNumbers.length === 1) {
                const teamNumber = sortedTeamNumbers[0];
                const roster = playersByTeamNumber[teamNumber];
                const teamKey = `${team.contestType}-${teamNumber}`;
                const isExpanded = expandedTeams.has(teamKey);
                const teamOptions = getTeamOptions(team.contestType);
                const selectedTeamId = teamMapping[teamKey] || teamMapping[team.contestType];
                
                return (
                  <div key={idx} className="team-card">
                    <div 
                      className="team-card-header"
                      onClick={() => toggleTeamExpansion(teamKey)}
                    >
                      <div className="team-header-left">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        <div>
                          <h4 className="team-name">{team.teamName}</h4>
                          <p className="team-meta">
                            {roster.length} Spieler
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
                              [teamKey]: e.target.value || null
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
                    
                    {isExpanded && roster && roster.length > 0 && (
                      <div className="team-roster-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Rang</th>
                              <th>Mannschaft</th>
                              <th>Name</th>
                              <th>LK</th>
                              <th>TVM-ID</th>
                              <th>Geburtsjahr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roster.map((player, pIdx) => (
                              <tr key={pIdx}>
                                <td className="rank-cell">{player.rank}</td>
                                <td className="team-number-cell">{player.teamNumber || '-'}</td>
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
              }
              
              // Wenn mehrere Mannschaften vorhanden sind, zeige jede separat
              return sortedTeamNumbers.map(teamNumber => {
                const roster = playersByTeamNumber[teamNumber];
                const teamKey = `${team.contestType}-${teamNumber}`;
                const isExpanded = expandedTeams.has(teamKey);
                const teamOptions = getTeamOptions(team.contestType);
                // Filtere Teams nach team_name, wenn möglich
                const filteredTeamOptions = teamOptions.filter(opt => {
                  // Versuche team_name zu matchen (z.B. "1" === "1")
                  if (opt.team_name) {
                    const optTeamNum = parseInt(opt.team_name, 10);
                    if (!isNaN(optTeamNum) && optTeamNum === teamNumber) {
                      return true;
                    }
                  }
                  // Wenn nur ein Team in dieser Kategorie, zeige es auch
                  if (teamOptions.length === 1) {
                    return true;
                  }
                  return false;
                });
                const selectedTeamId = teamMapping[teamKey];
                
                return (
                  <div key={`${idx}-${teamNumber}`} className="team-card">
                    <div 
                      className="team-card-header"
                      onClick={() => toggleTeamExpansion(teamKey)}
                    >
                      <div className="team-header-left">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        <div>
                          <h4 className="team-name">
                            {team.contestType} {teamNumber}
                            {teamNumber === 1 && <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '0.5rem' }}>⭐</span>}
                          </h4>
                          <p className="team-meta">
                            {roster.length} Spieler · Mannschaft {teamNumber}
                          </p>
                        </div>
                      </div>
                      <div className="team-header-right">
                        <select
                          value={selectedTeamId || ''}
                          onChange={(e) => {
                            setTeamMapping({
                              ...teamMapping,
                              [teamKey]: e.target.value || null
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="team-select"
                        >
                          <option value="">Team zuordnen...</option>
                          {(filteredTeamOptions.length > 0 ? filteredTeamOptions : teamOptions).map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.club_name} {opt.team_name || ''} ({opt.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {isExpanded && roster && roster.length > 0 && (
                      <div className="team-roster-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Rang</th>
                              <th>Mannschaft</th>
                              <th>Name</th>
                              <th>LK</th>
                              <th>TVM-ID</th>
                              <th>Geburtsjahr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roster.map((player, pIdx) => (
                              <tr key={pIdx}>
                                <td className="rank-cell">{player.rank}</td>
                                <td className="team-number-cell">{player.teamNumber || '-'}</td>
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
              });
            })}
          </div>
          
          {/* Import-Button */}
          <div className="import-actions">
            <div className="import-info">
              <p>
                {Object.values(teamMapping).filter(id => id).length} Mannschaften zugeordnet
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

