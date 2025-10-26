// ImportTab_Simplified.jsx
// Vereinfachte Version - KI-Import direkt in players_unified

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './ImportTab.css';

const ImportTab = () => {
  const { player } = useAuth();
  
  // State Management
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerMatchResults, setPlayerMatchResults] = useState([]);
  const [clubSuggestions, setClubSuggestions] = useState(null);
  const [pendingTeamInfo, setPendingTeamInfo] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [importStats, setImportStats] = useState(null);
  
  // Team auswählen
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [manualTeamId, setManualTeamId] = useState(null);

  // Lade Teams beim Mount
  useEffect(() => {
    loadUserTeams();
  }, [player]);

  const loadUserTeams = async () => {
    if (!player?.id) return;

    try {
      // 🔧 NEU: Lade Teams aus team_memberships statt player_teams
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          team_id,
          is_primary,
          team_info (
            id,
            team_name,
            club_name,
            category
          )
        `)
        .eq('player_id', player.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      
      const formattedTeams = data.map(tm => ({
        id: tm.team_info.id,
        name: `${tm.team_info.club_name} ${tm.team_info.team_name || ''} (${tm.team_info.category})`,
        isPrimary: tm.is_primary
      }));

      setTeams(formattedTeams);
      
      // Setze Primary Team als Default
      const primaryTeam = formattedTeams.find(t => t.isPrimary);
      if (primaryTeam) {
        setSelectedTeamId(primaryTeam.id);
      }

      // Lade ALLE Teams (für manuelle Auswahl beim Spieler-Import)
      const { data: allTeamsData, error: allTeamsError } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .order('club_name', { ascending: true });

      if (allTeamsError) throw allTeamsError;

      const formattedAllTeams = allTeamsData.map(t => ({
        id: t.id,
        name: `${t.club_name} ${t.team_name || ''} (${t.category})`,
        club_name: t.club_name,
        team_name: t.team_name,
        category: t.category
      }));

      setAllTeams(formattedAllTeams);

    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  /**
   * OpenAI API aufrufen zum Parsen
   */
  const handleParseMatches = async () => {
    if (!inputText.trim()) {
      setError('Bitte gib Text ein oder füge eine URL ein.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParsedData(null);

    try {
      const response = await fetch('/api/parse-tennis-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          type: 'matches' // oder 'players'
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Parsed data:', data);
      setParsedData(data);

      // Auto-select alle Matches/Players
      if (data.matches) {
        setSelectedMatches(data.matches.map((_, index) => index));
      }
      if (data.players) {
        setSelectedPlayers(data.players.map((_, index) => index));
      }

    } catch (err) {
      console.error('❌ Parse error:', err);
      setError(`Fehler beim Parsen: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 🔧 NEU: Vereinfachte Spieler-Import-Logik
   * Importiert direkt in players_unified statt imported_players
   */
  const handleImportPlayers = async () => {
    if (!selectedPlayers.length || !parsedData?.players) {
      setError('Bitte wähle Spieler zum Importieren aus.');
      return;
    }

    const playersToImport = selectedPlayers.map(index => parsedData.players[index]);
    const teamId = manualTeamId || selectedTeamId;

    if (!teamId) {
      setError('Bitte wähle ein Team für den Import aus.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let created = 0;
      let updated = 0;
      let skipped = 0;

      console.log(`🚀 Starting simplified player import for ${playersToImport.length} players...`);

      for (const playerData of playersToImport) {
        console.log(`🔍 Processing player: ${playerData.name}`);

        // 🔧 NEU: Fuzzy-Matching in players_unified
        const { data: existingPlayers, error: searchError } = await supabase
          .from('players_unified')
          .select('id, name, current_lk, status, onboarding_status')
          .ilike('name', `%${playerData.name}%`)
          .limit(5);

        if (searchError) {
          console.error('❌ Error searching players:', searchError);
          skipped++;
          continue;
        }

        // Prüfe auf exakte Übereinstimmung
        const exactMatch = existingPlayers?.find(p => 
          p.name.toLowerCase() === playerData.name.toLowerCase()
        );

        if (exactMatch) {
          console.log(`🔄 Found exact match: ${exactMatch.name}`);
          
          // Update bestehenden Spieler
          const { error: updateError } = await supabase
            .from('players_unified')
            .update({
              current_lk: playerData.lk || exactMatch.current_lk,
              season_start_lk: playerData.lk || exactMatch.current_lk,
              ranking: playerData.lk || exactMatch.current_lk,
              tvm_id: playerData.id_number || null,
              primary_team_id: teamId,
              is_captain: playerData.is_captain || false,
              position: playerData.position || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', exactMatch.id);

          if (updateError) {
            console.error('❌ Error updating player:', updateError);
            skipped++;
          } else {
            updated++;
            console.log('✅ Player updated');
          }
          continue;
        }

        // 🔧 NEU: Neuer Spieler direkt in players_unified
        console.log('🆕 Creating new player in players_unified:', playerData.name);
        
        const { data: newPlayer, error: insertError } = await supabase
          .from('players_unified')
          .insert({
            name: playerData.name,
            email: null, // Kein Email (wird beim Onboarding hinzugefügt)
            phone: null, // Kein Telefon (wird beim Onboarding hinzugefügt)
            current_lk: playerData.lk || null,
            season_start_lk: playerData.lk || null,
            ranking: playerData.lk || null,
            points: 0,
            player_type: 'app_user', // Alle Spieler sind app_user
            status: 'pending', // Wartet auf Onboarding
            onboarding_status: 'not_started',
            import_source: 'ai_import', // Markierung als KI-Import
            tvm_id: playerData.id_number || null,
            primary_team_id: teamId,
            is_captain: playerData.is_captain || false,
            position: playerData.position || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('❌ Error creating player:', insertError);
          skipped++;
        } else {
          created++;
          console.log('✅ New player created in players_unified');

          // 🔧 NEU: Erstelle team_membership direkt
          const { error: membershipError } = await supabase
            .from('team_memberships')
            .insert({
              player_id: newPlayer.id,
              team_id: teamId,
              is_active: false, // Inactive bis Onboarding abgeschlossen
              is_primary: false,
              role: 'player',
              season: 'winter_25_26'
            });

          if (membershipError) {
            console.error('⚠️ Error creating team membership:', membershipError);
          } else {
            console.log('✅ Team membership created');
          }
        }
      }

      setImportStats({
        total: playersToImport.length,
        created,
        updated,
        skipped
      });

      setSuccessMessage(
        `🎉 KI-Import erfolgreich!\n\n` +
        `🆕 ${created} neue Spieler erstellt\n` +
        `🔄 ${updated} Spieler aktualisiert\n` +
        `⏭️ ${skipped} übersprungen\n\n` +
        `✅ Alle Spieler sind jetzt in players_unified und warten auf Onboarding!`
      );

      // Reset
      setInputText('');
      setParsedData(null);
      setSelectedPlayers([]);
      setPlayerMatchResults([]);

    } catch (err) {
      console.error('❌ Import error:', err);
      setError(`Fehler beim Import: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 🔧 NEU: Vereinfachte Spieler-Suche
   * Sucht nur noch in players_unified
   */
  const performPlayerMatching = async (players) => {
    if (!players || players.length === 0) return [];

    try {
      console.log('🔍 Performing simplified player matching...');

      // 🔧 NEU: Lade nur aus players_unified
      const { data: existingPlayers, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, season_start_lk, status, onboarding_status')
        .order('name', { ascending: true });

      if (playersError) throw playersError;

      console.log(`✅ Loaded ${existingPlayers?.length || 0} existing players from players_unified`);

      // Für jeden importierten Spieler: Fuzzy-Match
      const matchResults = players.map(importPlayer => {
        // Exakte Übereinstimmung (Name)
        const exactMatch = existingPlayers?.find(p => 
          p.name.toLowerCase() === importPlayer.name.toLowerCase()
        );

        if (exactMatch) {
          return {
            ...importPlayer,
            matchType: 'exact',
            matchedPlayer: exactMatch,
            confidence: 100
          };
        }

        // Fuzzy-Match (Name-Ähnlichkeit)
        const fuzzyMatches = existingPlayers?.filter(p => {
          const similarity = calculateSimilarity(p.name, importPlayer.name);
          return similarity > 70; // 70% Ähnlichkeit
        }) || [];

        if (fuzzyMatches.length > 0) {
          const bestMatch = fuzzyMatches.reduce((best, current) => {
            const currentSimilarity = calculateSimilarity(current.name, importPlayer.name);
            const bestSimilarity = calculateSimilarity(best.name, importPlayer.name);
            return currentSimilarity > bestSimilarity ? current : best;
          });

          return {
            ...importPlayer,
            matchType: 'fuzzy',
            matchedPlayer: bestMatch,
            confidence: calculateSimilarity(bestMatch.name, importPlayer.name),
            allMatches: fuzzyMatches
          };
        }

        // Kein Match gefunden
        return {
          ...importPlayer,
          matchType: 'none',
          matchedPlayer: null,
          confidence: 0
        };
      });

      console.log('✅ Player matching completed:', matchResults);
      return matchResults;

    } catch (err) {
      console.error('❌ Error in player matching:', err);
      return [];
    }
  };

  /**
   * Einfache Ähnlichkeits-Berechnung
   */
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const distance = levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Rest der Komponente bleibt größtenteils gleich...
  // (UI-Teile, Match-Import, etc.)

  return (
    <div className="import-tab">
      <div className="import-header">
        <h2>🤖 KI-Import (Vereinfacht)</h2>
        <p>Importiere Spieler direkt in players_unified - keine Zwischen-Tabellen mehr!</p>
      </div>

      {/* Input-Bereich */}
      <div className="import-section">
        <h3>📝 Daten eingeben</h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Füge hier TVM-Daten, Spielerlisten oder Match-Ergebnisse ein..."
          rows={8}
        />
        <button 
          onClick={handleParseMatches}
          disabled={isProcessing || !inputText.trim()}
          className="btn-primary"
        >
          {isProcessing ? '⏳ Verarbeite...' : '🔍 KI-Parsing starten'}
        </button>
      </div>

      {/* Parsed Data */}
      {parsedData && (
        <div className="import-section">
          <h3>✅ Parsed Data</h3>
          
          {/* Spieler */}
          {parsedData.players && (
            <div className="players-section">
              <h4>👥 Spieler ({parsedData.players.length})</h4>
              <div className="selection-controls">
                <button onClick={() => setSelectedPlayers(parsedData.players.map((_, i) => i))}>
                  Alle auswählen
                </button>
                <button onClick={() => setSelectedPlayers([])}>
                  Alle abwählen
                </button>
              </div>
              
              <div className="players-grid">
                {parsedData.players.map((player, index) => (
                  <div 
                    key={index}
                    className={`player-card ${selectedPlayers.includes(index) ? 'selected' : ''}`}
                    onClick={() => {
                      const newSelection = selectedPlayers.includes(index)
                        ? selectedPlayers.filter(i => i !== index)
                        : [...selectedPlayers, index];
                      setSelectedPlayers(newSelection);
                    }}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-details">
                      LK: {player.lk || 'N/A'} | 
                      Position: {player.position || 'N/A'} |
                      {player.is_captain && ' 👑'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Team-Auswahl */}
              <div className="team-selection">
                <h4>🏆 Team auswählen</h4>
                <select 
                  value={manualTeamId || selectedTeamId || ''} 
                  onChange={(e) => setManualTeamId(e.target.value)}
                >
                  <option value="">Team auswählen...</option>
                  {allTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import Button */}
              <button 
                onClick={handleImportPlayers}
                disabled={isProcessing || selectedPlayers.length === 0}
                className="btn-success"
              >
                {isProcessing ? '⏳ Importiere...' : `🚀 ${selectedPlayers.length} Spieler importieren`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Erfolgsmeldung */}
      {successMessage && (
        <div className="success-message">
          <pre>{successMessage}</pre>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Import-Statistiken */}
      {importStats && (
        <div className="import-stats">
          <h3>📊 Import-Statistiken</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{importStats.total}</div>
              <div className="stat-label">Gesamt</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{importStats.created}</div>
              <div className="stat-label">Erstellt</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{importStats.updated}</div>
              <div className="stat-label">Aktualisiert</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{importStats.skipped}</div>
              <div className="stat-label">Übersprungen</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTab;
