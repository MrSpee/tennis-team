import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LoggingService } from '../../services/activityLogger';
import { Loader, CheckCircle, AlertCircle, X, ExternalLink, Users, Calendar, MapPin } from 'lucide-react';
import './TeamPortraitImportTab.css';

const TeamPortraitImportTab = () => {
  const { player } = useAuth();
  
  // State Management
  const [teamPortraitUrl, setTeamPortraitUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Verein/Team-Zuordnung
  const [allClubs, setAllClubs] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newClubData, setNewClubData] = useState({ name: '', city: '', federation: 'TVM', website: '' });
  const [newTeamData, setNewTeamData] = useState({ team_name: '', category: '', club_id: null });
  
  // Import-Status
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importResult, setImportResult] = useState(null);
  
  // Lade Vereine und Teams beim Mount
  useEffect(() => {
    loadClubsAndTeams();
  }, []);
  
  // Auto-Zuordnung wenn Daten gescraped wurden
  useEffect(() => {
    if (scrapedData?.club_info?.club_name) {
      autoMatchClub();
    }
  }, [scrapedData, allClubs]);
  
  useEffect(() => {
    if (scrapedData?.team_info?.team_name && selectedClubId) {
      autoMatchTeam();
    }
  }, [scrapedData, selectedClubId, allTeams]);
  
  const loadClubsAndTeams = async () => {
    try {
      // Lade Vereine
      const { data: clubs, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name, city')
        .order('name', { ascending: true });
      
      if (clubsError) throw clubsError;
      setAllClubs(clubs || []);
      
      // Lade Teams
      const { data: teams, error: teamsError } = await supabase
        .from('team_info')
        .select('id, club_id, club_name, team_name, category')
        .order('club_name', { ascending: true });
      
      if (teamsError) throw teamsError;
      setAllTeams(teams || []);
    } catch (err) {
      console.error('Error loading clubs/teams:', err);
      setError(`Fehler beim Laden der Vereine/Teams: ${err.message}`);
    }
  };
  
  const autoMatchClub = () => {
    if (!scrapedData?.club_info?.club_name || allClubs.length === 0) return;
    
    const clubName = scrapedData.club_info.club_name;
    
    // Exakte Übereinstimmung
    const exactMatch = allClubs.find(c => 
      c.name.toLowerCase().trim() === clubName.toLowerCase().trim()
    );
    
    if (exactMatch) {
      setSelectedClubId(exactMatch.id);
      return;
    }
    
    // Fuzzy Matching (einfache Substring-Suche)
    const fuzzyMatch = allClubs.find(c => 
      c.name.toLowerCase().includes(clubName.toLowerCase()) ||
      clubName.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (fuzzyMatch) {
      setSelectedClubId(fuzzyMatch.id);
    }
  };
  
  const autoMatchTeam = () => {
    if (!scrapedData?.team_info?.team_name || !selectedClubId || allTeams.length === 0) return;
    
    const teamName = scrapedData.team_info.team_name;
    const category = scrapedData.team_info.category;
    
    // Suche Team im ausgewählten Verein
    const clubTeams = allTeams.filter(t => t.club_id === selectedClubId);
    
    // Exakte Übereinstimmung
    const exactMatch = clubTeams.find(t => 
      t.team_name.toLowerCase().trim() === teamName.toLowerCase().trim() &&
      (!category || t.category === category)
    );
    
    if (exactMatch) {
      setSelectedTeamId(exactMatch.id);
      return;
    }
    
    // Fuzzy Matching
    const fuzzyMatch = clubTeams.find(t => 
      t.team_name.toLowerCase().includes(teamName.toLowerCase()) &&
      (!category || t.category === category)
    );
    
    if (fuzzyMatch) {
      setSelectedTeamId(fuzzyMatch.id);
    }
  };
  
  const handleScrape = async () => {
    if (!teamPortraitUrl) {
      setError('Bitte eine Team-Portrait-URL eingeben');
      return;
    }
    
    if (!teamPortraitUrl.includes('teamPortrait')) {
      setError('Ungültige URL. Bitte eine nuLiga Team-Portrait-URL verwenden.');
      return;
    }
    
    setIsScraping(true);
    setError(null);
    setScrapedData(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/import/team-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamPortraitUrl })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Scrapen');
      }
      
      if (!result.success || !result.data) {
        throw new Error('Ungültige Antwort vom Server');
      }
      
      setScrapedData(result.data);
      setSuccessMessage('✅ Team-Portrait erfolgreich gescraped!');
      
    } catch (err) {
      console.error('Error scraping team portrait:', err);
      setError(`Fehler beim Scrapen: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };
  
  const handleCreateClub = async () => {
    try {
      if (!newClubData.name || !newClubData.city) {
        setError('Bitte Name und Stadt eingeben');
        return;
      }
      
      const { data, error: createError } = await supabase
        .rpc('create_club_as_super_admin', {
          p_name: newClubData.name,
          p_city: newClubData.city,
          p_federation: newClubData.federation || 'TVM',
          p_website: newClubData.website || null
        });
      
      if (createError) throw createError;
      
      const club = Array.isArray(data) ? data[0] : data;
      
      // Aktualisiere Liste
      setAllClubs([...allClubs, club]);
      setSelectedClubId(club.id);
      
      // Update scrapedData
      if (scrapedData) {
        setScrapedData({
          ...scrapedData,
          club_info: { ...scrapedData.club_info, matched_club_id: club.id }
        });
      }
      
      setShowCreateClubModal(false);
      setNewClubData({ name: '', city: '', federation: 'TVM', website: '' });
      setSuccessMessage(`✅ Verein "${club.name}" wurde erstellt!`);
      
    } catch (err) {
      console.error('Error creating club:', err);
      setError(`Fehler beim Erstellen des Vereins: ${err.message}`);
    }
  };
  
  const handleCreateTeam = async () => {
    try {
      if (!newTeamData.team_name || !newTeamData.category || !newTeamData.club_id) {
        setError('Bitte Team-Name, Kategorie und Verein auswählen');
        return;
      }
      
      const { data, error: createError } = await supabase
        .from('team_info')
        .insert({
          club_id: newTeamData.club_id,
          team_name: newTeamData.team_name,
          category: newTeamData.category
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Aktualisiere Liste
      setAllTeams([...allTeams, data]);
      setSelectedTeamId(data.id);
      
      setShowCreateTeamModal(false);
      setNewTeamData({ team_name: '', category: '', club_id: selectedClubId });
      setSuccessMessage(`✅ Team "${data.team_name}" wurde erstellt!`);
      
    } catch (err) {
      console.error('Error creating team:', err);
      setError(`Fehler beim Erstellen des Teams: ${err.message}`);
    }
  };
  
  const handleImport = async () => {
    if (!scrapedData) {
      setError('Bitte zuerst Team-Portrait scrapen');
      return;
    }
    
    if (!selectedClubId) {
      setError('Bitte einen Verein auswählen oder erstellen');
      return;
    }
    
    if (!selectedTeamId) {
      setError('Bitte ein Team auswählen oder erstellen');
      return;
    }
    
    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);
    setImportProgress({ current: 0, total: 0, message: 'Import startet...' });
    
    try {
      const totalSteps = (scrapedData.players?.length || 0) + (scrapedData.matches?.length || 0);
      setImportProgress({ current: 0, total: totalSteps, message: 'Importiere Spieler...' });
      
      let importedPlayers = 0;
      let importedMatches = 0;
      const errors = [];
      
      // 1. Importiere Spieler
      if (scrapedData.players && scrapedData.players.length > 0) {
        for (let i = 0; i < scrapedData.players.length; i++) {
          const player = scrapedData.players[i];
          
          try {
            // Prüfe ob Spieler bereits existiert (via TVM ID)
            let playerId = null;
            if (player.id_number) {
              const { data: existing } = await supabase
                .from('players_unified')
                .select('id')
                .eq('tvm_id_number', player.id_number)
                .single();
              
              if (existing) {
                playerId = existing.id;
              }
            }
            
            // Erstelle Spieler falls nicht vorhanden
            if (!playerId) {
              const { data: newPlayer, error: playerError } = await supabase
                .from('players_unified')
                .insert({
                  name: player.name,
                  current_lk: player.lk,
                  tvm_id_number: player.id_number || null,
                  player_type: 'imported',
                  import_source: 'tvm_import',
                  primary_team_id: selectedTeamId
                })
                .select()
                .single();
              
              if (playerError) throw playerError;
              playerId = newPlayer.id;
              
              // Erstelle Privacy Settings
              await supabase
                .from('player_privacy_settings')
                .insert({ player_id: playerId });
            }
            
            // Erstelle/Update team_membership
            const season = scrapedData.team_info.season || 'Winter 2025/26';
            const { error: membershipError } = await supabase
              .from('team_memberships')
              .upsert({
                player_id: playerId,
                team_id: selectedTeamId,
                season: season,
                meldeliste_position: player.position,
                is_active: true
              }, { onConflict: 'player_id,team_id,season' });
            
            if (membershipError) throw membershipError;
            
            importedPlayers++;
            setImportProgress({ 
              current: importedPlayers, 
              total: totalSteps, 
              message: `Importiere Spieler... (${importedPlayers}/${scrapedData.players.length})` 
            });
            
          } catch (err) {
            console.error(`Error importing player ${player.name}:`, err);
            errors.push(`Spieler ${player.name}: ${err.message}`);
          }
        }
      }
      
      // 2. Importiere Matches
      setImportProgress({ current: importedPlayers, total: totalSteps, message: 'Importiere Spieltermine...' });
      
      if (scrapedData.matches && scrapedData.matches.length > 0) {
        for (let i = 0; i < scrapedData.matches.length; i++) {
          const match = scrapedData.matches[i];
          
          try {
            // Finde Home/Away Team IDs
            const homeTeam = allTeams.find(t => 
              t.team_name === match.home_team || 
              `${t.club_name} ${t.team_name}` === match.home_team
            );
            const awayTeam = allTeams.find(t => 
              t.team_name === match.away_team || 
              `${t.club_name} ${t.team_name}` === match.away_team
            );
            
            if (!homeTeam || !awayTeam) {
              errors.push(`Match ${match.match_number}: Teams nicht gefunden (${match.home_team} vs ${match.away_team})`);
              continue;
            }
            
            // Parse Datum
            const matchDate = new Date(match.match_date);
            if (isNaN(matchDate.getTime())) {
              errors.push(`Match ${match.match_number}: Ungültiges Datum`);
              continue;
            }
            
            // Erstelle Matchday
            const { error: matchError } = await supabase
              .from('matchdays')
              .upsert({
                match_date: matchDate.toISOString(),
                start_time: match.start_time || null,
                match_number: match.match_number,
                home_team_id: homeTeam.id,
                away_team_id: awayTeam.id,
                venue: match.venue || null,
                court_number: match.court_range || null,
                season: scrapedData.team_info.season || 'Winter 2025/26',
                league: scrapedData.team_info.league || null,
                group_name: scrapedData.team_info.group_name || null,
                status: match.status || 'scheduled',
                home_score: match.match_points ? parseInt(match.match_points.split(':')[0]) : null,
                away_score: match.match_points ? parseInt(match.match_points.split(':')[1]) : null
              }, { onConflict: 'match_number' });
            
            if (matchError) throw matchError;
            
            importedMatches++;
            setImportProgress({ 
              current: importedPlayers + importedMatches, 
              total: totalSteps, 
              message: `Importiere Spieltermine... (${importedMatches}/${scrapedData.matches.length})` 
            });
            
          } catch (err) {
            console.error(`Error importing match ${match.match_number}:`, err);
            errors.push(`Match ${match.match_number}: ${err.message}`);
          }
        }
      }
      
      // 3. Erstelle/Update team_season
      const season = scrapedData.team_info.season || 'Winter 2025/26';
      await supabase
        .from('team_seasons')
        .upsert({
          team_id: selectedTeamId,
          season: season,
          league: scrapedData.team_info.league || null,
          group_name: scrapedData.team_info.group_name || null,
          is_active: true
        }, { onConflict: 'team_id,season,league,group_name' });
      
      // Log Activity
      await LoggingService.logActivity({
        action: 'team_portrait_import',
        entity_type: 'team',
        entity_id: selectedTeamId,
        details: {
          url: teamPortraitUrl,
          players_imported: importedPlayers,
          matches_imported: importedMatches,
          errors: errors.length > 0 ? errors : null
        }
      });
      
      setImportResult({
        success: true,
        players: importedPlayers,
        matches: importedMatches,
        errors: errors
      });
      
      setSuccessMessage(
        `✅ Import erfolgreich! ${importedPlayers} Spieler, ${importedMatches} Spieltermine importiert.`
      );
      
    } catch (err) {
      console.error('Error during import:', err);
      setError(`Fehler beim Import: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, message: '' });
    }
  };
  
  const selectedClub = useMemo(() => 
    allClubs.find(c => c.id === selectedClubId),
    [allClubs, selectedClubId]
  );
  
  const selectedTeam = useMemo(() => 
    allTeams.find(t => t.id === selectedTeamId),
    [allTeams, selectedTeamId]
  );
  
  const availableTeams = useMemo(() => 
    allTeams.filter(t => t.club_id === selectedClubId),
    [allTeams, selectedClubId]
  );
  
  return (
    <div className="team-portrait-import-container">
      <div className="import-header">
        <h2>Team-Portrait Import</h2>
        <p className="import-subtitle">
          Importiere komplette Team-Daten direkt von der nuLiga Team-Portrait-Seite
        </p>
      </div>
      
      {/* URL-Eingabe */}
      <div className="import-section">
        <label className="import-label">
          <ExternalLink size={16} />
          nuLiga Team-Portrait URL
        </label>
        <div className="url-input-group">
          <input
            type="url"
            className="url-input"
            placeholder="https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=..."
            value={teamPortraitUrl}
            onChange={(e) => setTeamPortraitUrl(e.target.value)}
            disabled={isScraping}
          />
          <button
            className="btn-scrape"
            onClick={handleScrape}
            disabled={isScraping || !teamPortraitUrl}
          >
            {isScraping ? (
              <>
                <Loader className="spinner" size={16} />
                Scrapen...
              </>
            ) : (
              'Scrapen'
            )}
          </button>
        </div>
      </div>
      
      {/* Fehler/Success Messages */}
      {error && (
        <div className="message-error">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="message-close">
            <X size={14} />
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="message-success">
          <CheckCircle size={16} />
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="message-close">
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* Gescraped Daten */}
      {scrapedData && (
        <>
          {/* Verein-Zuordnung */}
          <div className="import-section">
            <h3 className="section-title">
              <MapPin size={18} />
              Verein-Zuordnung
            </h3>
            
            <div className="club-selection">
              <label>Verein auswählen:</label>
              <div className="selection-group">
                <select
                  className="select-input"
                  value={selectedClubId || ''}
                  onChange={(e) => {
                    setSelectedClubId(e.target.value || null);
                    setSelectedTeamId(null); // Reset Team wenn Verein wechselt
                  }}
                >
                  <option value="">-- Verein auswählen --</option>
                  {allClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} {club.city ? `(${club.city})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setNewClubData({
                      name: scrapedData.club_info.club_name || '',
                      city: scrapedData.club_info.city || '',
                      federation: 'TVM',
                      website: scrapedData.club_info.website || ''
                    });
                    setShowCreateClubModal(true);
                  }}
                >
                  Neuer Verein
                </button>
              </div>
              
              {selectedClub && (
                <div className="selected-info">
                  <CheckCircle size={16} className="icon-success" />
                  <span>Ausgewählt: <strong>{selectedClub.name}</strong></span>
                </div>
              )}
              
              {scrapedData.club_info && (
                <div className="scraped-info">
                  <div className="info-row">
                    <span className="info-label">Gescraped:</span>
                    <span className="info-value">{scrapedData.club_info.club_name}</span>
                  </div>
                  {scrapedData.club_info.address && (
                    <div className="info-row">
                      <span className="info-label">Adresse:</span>
                      <span className="info-value">{scrapedData.club_info.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Team-Zuordnung */}
          <div className="import-section">
            <h3 className="section-title">
              <Users size={18} />
              Team-Zuordnung
            </h3>
            
            <div className="team-selection">
              <label>Team auswählen:</label>
              <div className="selection-group">
                <select
                  className="select-input"
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(e.target.value || null)}
                  disabled={!selectedClubId}
                >
                  <option value="">-- Team auswählen --</option>
                  {availableTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.team_name} ({team.category})
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setNewTeamData({
                      team_name: scrapedData.team_info.team_name || '',
                      category: scrapedData.team_info.category || '',
                      club_id: selectedClubId
                    });
                    setShowCreateTeamModal(true);
                  }}
                  disabled={!selectedClubId}
                >
                  Neues Team
                </button>
              </div>
              
              {selectedTeam && (
                <div className="selected-info">
                  <CheckCircle size={16} className="icon-success" />
                  <span>Ausgewählt: <strong>{selectedTeam.team_name}</strong> ({selectedTeam.category})</span>
                </div>
              )}
              
              {scrapedData.team_info && (
                <div className="scraped-info">
                  <div className="info-row">
                    <span className="info-label">Gescraped:</span>
                    <span className="info-value">{scrapedData.team_info.team_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Liga:</span>
                    <span className="info-value">{scrapedData.team_info.league}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Kategorie:</span>
                    <span className="info-value">{scrapedData.team_info.category}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Vorschau */}
          <div className="import-section">
            <h3 className="section-title">
              <Calendar size={18} />
              Import-Vorschau
            </h3>
            
            <div className="preview-stats">
              <div className="stat-card">
                <div className="stat-value">{scrapedData.players?.length || 0}</div>
                <div className="stat-label">Spieler</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{scrapedData.matches?.length || 0}</div>
                <div className="stat-label">Spieltermine</div>
              </div>
            </div>
            
            {scrapedData.players && scrapedData.players.length > 0 && (
              <div className="preview-list">
                <h4>Spieler ({scrapedData.players.length}):</h4>
                <div className="player-list">
                  {scrapedData.players.slice(0, 10).map((p, i) => (
                    <div key={i} className="player-item">
                      <span className="player-position">{p.position}.</span>
                      <span className="player-name">{p.name}</span>
                      {p.lk && <span className="player-lk">LK {p.lk}</span>}
                    </div>
                  ))}
                  {scrapedData.players.length > 10 && (
                    <div className="player-item-more">
                      ... und {scrapedData.players.length - 10} weitere
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Import-Button */}
          <div className="import-actions">
            {isImporting && (
              <div className="import-progress">
                <Loader className="spinner" size={16} />
                <span>{importProgress.message}</span>
                {importProgress.total > 0 && (
                  <span className="progress-count">
                    {importProgress.current} / {importProgress.total}
                  </span>
                )}
              </div>
            )}
            
            <button
              className="btn-primary btn-import"
              onClick={handleImport}
              disabled={isImporting || !selectedClubId || !selectedTeamId}
            >
              {isImporting ? (
                <>
                  <Loader className="spinner" size={16} />
                  Importiere...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Import starten
                </>
              )}
            </button>
          </div>
          
          {/* Import-Ergebnis */}
          {importResult && (
            <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
              <h4>Import-Ergebnis:</h4>
              <ul>
                <li>✅ {importResult.players} Spieler importiert</li>
                <li>✅ {importResult.matches} Spieltermine importiert</li>
                {importResult.errors && importResult.errors.length > 0 && (
                  <li className="errors">
                    ⚠️ {importResult.errors.length} Fehler:
                    <ul>
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
      
      {/* Create Club Modal */}
      {showCreateClubModal && (
        <div className="modal-overlay" onClick={() => setShowCreateClubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neuen Verein erstellen</h3>
            <div className="modal-form">
              <label>
                Name: *
                <input
                  type="text"
                  value={newClubData.name}
                  onChange={(e) => setNewClubData({ ...newClubData, name: e.target.value })}
                />
              </label>
              <label>
                Stadt: *
                <input
                  type="text"
                  value={newClubData.city}
                  onChange={(e) => setNewClubData({ ...newClubData, city: e.target.value })}
                />
              </label>
              <label>
                Website:
                <input
                  type="url"
                  value={newClubData.website}
                  onChange={(e) => setNewClubData({ ...newClubData, website: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateClubModal(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleCreateClub}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neues Team erstellen</h3>
            <div className="modal-form">
              <label>
                Team-Name: *
                <input
                  type="text"
                  value={newTeamData.team_name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, team_name: e.target.value })}
                />
              </label>
              <label>
                Kategorie: *
                <input
                  type="text"
                  value={newTeamData.category}
                  onChange={(e) => setNewTeamData({ ...newTeamData, category: e.target.value })}
                  placeholder="z.B. Herren 40"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateTeamModal(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleCreateTeam}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPortraitImportTab;

