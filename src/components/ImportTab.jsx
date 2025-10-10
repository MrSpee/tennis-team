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
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [importStats, setImportStats] = useState(null);
  
  // Team auswählen (später aus Context/Props)
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);

  // Lade Teams beim Mount
  useEffect(() => {
    loadUserTeams();
  }, [player]);

  const loadUserTeams = async () => {
    if (!player?.id) return;

    try {
      const { data, error } = await supabase
        .from('player_teams')
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
        .order('is_primary', { ascending: false });

      if (error) throw error;
      
      const formattedTeams = data.map(pt => ({
        id: pt.team_info.id,
        name: `${pt.team_info.club_name} ${pt.team_info.team_name || ''} (${pt.team_info.category})`,
        isPrimary: pt.is_primary
      }));

      setTeams(formattedTeams);
      
      // Setze Primary Team als Default
      const primaryTeam = formattedTeams.find(t => t.isPrimary);
      if (primaryTeam) {
        setSelectedTeamId(primaryTeam.id);
      }
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

    if (!selectedTeamId) {
      setError('Bitte wähle ein Team aus.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParsedData(null);
    setSuccessMessage(null);

    try {
      console.log('🔄 Calling parse API...');
      
      // API-Aufruf an Vercel Function
      const response = await fetch('/api/import/parse-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          teamId: selectedTeamId,
          userEmail: player?.email
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Parsen');
      }

      console.log('✅ Parsing successful:', result);

      // Setze geparste Daten
      setParsedData(result.data);
      
      // Alle Matches standardmäßig auswählen
      setSelectedMatches(result.data.matches.map((_, idx) => idx));
      
      setSuccessMessage(`${result.data.matches.length} Match(es) erfolgreich erkannt! Überprüfe die Daten und klicke auf "Importieren".`);

    } catch (err) {
      console.error('❌ Parse error:', err);
      setError(err.message || 'Fehler beim Parsen der Daten');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Matches in Supabase importieren
   */
  const handleImportMatches = async () => {
    if (!parsedData || selectedMatches.length === 0) {
      setError('Keine Matches zum Importieren ausgewählt.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const matchesToImport = selectedMatches.map(idx => parsedData.matches[idx]);
      
      console.log('💾 Importing matches to Supabase:', matchesToImport);

      // Prüfe auf Duplikate
      const duplicateCheck = await checkForDuplicates(matchesToImport);
      
      if (duplicateCheck.duplicates.length > 0) {
        const confirmImport = window.confirm(
          `⚠️ ${duplicateCheck.duplicates.length} Match(es) existieren bereits:\n\n` +
          duplicateCheck.duplicates.map(d => `${d.match_date} - ${d.opponent}`).join('\n') +
          '\n\nTrotzdem importieren? (Duplikate werden übersprungen)'
        );
        
        if (!confirmImport) {
          setIsProcessing(false);
          return;
        }
      }

      // Filtere Duplikate raus
      const uniqueMatches = matchesToImport.filter((match, idx) => {
        return !duplicateCheck.duplicates.some(d => 
          d.match_date === match.match_date && 
          d.opponent === match.opponent
        );
      });

      if (uniqueMatches.length === 0) {
        setError('Alle ausgewählten Matches existieren bereits.');
        setIsProcessing(false);
        return;
      }

      // Formatiere für Supabase
      const formattedMatches = uniqueMatches.map(match => ({
        team_id: selectedTeamId,
        match_date: match.match_date,
        start_time: match.start_time || null,
        opponent: match.opponent,
        is_home_match: match.is_home_match,
        venue: match.venue || null,
        address: match.address || null,
        league: match.league || parsedData.category || null,
        group_name: match.group_name || null,
        season: parsedData.season || '2025/26',
        status: 'scheduled',
        notes: match.notes || null
      }));

      // Insert in Supabase
      const { data, error: insertError } = await supabase
        .from('matches')
        .insert(formattedMatches)
        .select();

      if (insertError) throw insertError;

      console.log('✅ Import successful:', data);

      // Stats
      setImportStats({
        total: matchesToImport.length,
        imported: uniqueMatches.length,
        duplicates: duplicateCheck.duplicates.length,
        cost: parsedData.metadata.cost_estimate
      });

      setSuccessMessage(
        `🎉 Import erfolgreich!\n\n` +
        `✅ ${uniqueMatches.length} neue Match(es) importiert\n` +
        `⏭️ ${duplicateCheck.duplicates.length} Duplikat(e) übersprungen\n` +
        `💰 Kosten: ${parsedData.metadata.cost_estimate}`
      );

      // Reset
      setInputText('');
      setParsedData(null);
      setSelectedMatches([]);

    } catch (err) {
      console.error('❌ Import error:', err);
      setError(err.message || 'Fehler beim Importieren der Matches');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Prüfe auf Duplikate in der Datenbank
   */
  const checkForDuplicates = async (matches) => {
    try {
      const dates = matches.map(m => m.match_date);
      
      const { data, error } = await supabase
        .from('matches')
        .select('match_date, opponent')
        .eq('team_id', selectedTeamId)
        .in('match_date', dates);

      if (error) throw error;

      return {
        duplicates: data || [],
        unique: matches.filter(m => 
          !data.some(d => d.match_date === m.match_date && d.opponent === m.opponent)
        )
      };
    } catch (err) {
      console.error('Error checking duplicates:', err);
      return { duplicates: [], unique: matches };
    }
  };

  /**
   * Toggle Match-Auswahl
   */
  const toggleMatchSelection = (index) => {
    setSelectedMatches(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  /**
   * Beispiel-Text einfügen (für Testing)
   */
  const insertExampleText = () => {
    setInputText(`Medenspiele Winter 2025/26
Herren 40 - Kreisliga A

Spieltag 1
Sa, 15.11.2025, 14:00 Uhr
SV Rot-Gelb Sürth vs. TC Köln-Süd
Ort: Marienburger SC, Köln

Spieltag 2
Sa, 22.11.2025, 14:00 Uhr
Rodenkirchener TC vs. SV Rot-Gelb Sürth
Ort: Rodenkirchener TC, Köln-Rodenkirchen

Spieltag 3
Sa, 29.11.2025, 14:00 Uhr
SV Rot-Gelb Sürth vs. TC Grün-Weiß Rheidt
Ort: Marienburger SC, Köln`);
  };

  return (
    <div className="import-tab">
      <div className="import-header">
        <h2>🤖 KI-gestützter Match-Import</h2>
        <p>Kopiere TVM-Meldelisten hier rein und lass die KI die Matches automatisch extrahieren.</p>
      </div>

      {/* Team Auswahl */}
      <div className="import-section">
        <label htmlFor="team-select">🎾 Team auswählen:</label>
        <select 
          id="team-select"
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="team-select"
        >
          <option value="">-- Team wählen --</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} {team.isPrimary && '⭐'}
            </option>
          ))}
        </select>
      </div>

      {/* Text-Eingabe */}
      <div className="import-section">
        <div className="input-header">
          <label htmlFor="match-text">📋 TVM-Meldeliste:</label>
          <button 
            onClick={insertExampleText}
            className="btn-example"
            type="button"
          >
            📝 Beispiel einfügen
          </button>
        </div>
        
        <textarea
          id="match-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Kopiere hier die Meldeliste aus TVM (Text oder URL)...

Beispiel:
Spieltag 1
Sa, 15.11.2025, 14:00 Uhr
SV Sürth vs. TC Köln
Ort: Marienburger SC, Köln"
          rows={12}
          className="match-input"
        />

        <div className="input-actions">
          <button
            onClick={handleParseMatches}
            disabled={!inputText.trim() || !selectedTeamId || isProcessing}
            className="btn-parse"
          >
            {isProcessing ? '⏳ Verarbeite...' : '🔍 Matches erkennen'}
          </button>
          
          <button
            onClick={() => {
              setInputText('');
              setParsedData(null);
              setError(null);
              setSuccessMessage(null);
            }}
            className="btn-clear"
            type="button"
          >
            🗑️ Zurücksetzen
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="message error-message">
          <span className="message-icon">❌</span>
          <div>
            <strong>Fehler:</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && !parsedData && (
        <div className="message success-message">
          <span className="message-icon">✅</span>
          <div>
            <strong>Erfolgreich!</strong>
            <p style={{ whiteSpace: 'pre-line' }}>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Parsed Matches Vorschau */}
      {parsedData && (
        <div className="import-section">
          <div className="preview-header">
            <h3>🎯 Erkannte Matches ({parsedData.matches.length})</h3>
            <div className="preview-meta">
              {parsedData.season && <span className="meta-badge">📅 {parsedData.season}</span>}
              {parsedData.category && <span className="meta-badge">🎾 {parsedData.category}</span>}
              <span className="meta-badge">💰 {parsedData.metadata.cost_estimate}</span>
            </div>
          </div>

          <div className="matches-preview">
            {parsedData.matches.map((match, idx) => (
              <div 
                key={idx}
                className={`match-card ${selectedMatches.includes(idx) ? 'selected' : ''}`}
                onClick={() => toggleMatchSelection(idx)}
              >
                <div className="match-checkbox">
                  <input 
                    type="checkbox"
                    checked={selectedMatches.includes(idx)}
                    onChange={() => toggleMatchSelection(idx)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="match-details">
                  <div className="match-header">
                    <span className="match-date">
                      📅 {new Date(match.match_date).toLocaleDateString('de-DE', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </span>
                    {match.start_time && (
                      <span className="match-time">🕐 {match.start_time} Uhr</span>
                    )}
                    {match.matchday && (
                      <span className="match-day">🎯 Spieltag {match.matchday}</span>
                    )}
                  </div>
                  
                  <div className="match-opponent">
                    <span className={`home-away-badge ${match.is_home_match ? 'home' : 'away'}`}>
                      {match.is_home_match ? '🏠 Heim' : '✈️ Auswärts'}
                    </span>
                    <strong className="opponent-name">{match.opponent}</strong>
                  </div>
                  
                  {match.venue && (
                    <div className="match-venue">
                      📍 {match.venue}
                      {match.address && `, ${match.address}`}
                    </div>
                  )}
                  
                  {match.league && (
                    <div className="match-league">
                      🏆 {match.league}
                    </div>
                  )}
                  
                  {match.notes && (
                    <div className="match-notes">
                      💬 {match.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="import-actions">
            <button
              onClick={handleImportMatches}
              disabled={selectedMatches.length === 0 || isProcessing}
              className="btn-import"
            >
              {isProcessing 
                ? '⏳ Importiere...' 
                : `💾 ${selectedMatches.length} Match(es) importieren`
              }
            </button>
            
            <button
              onClick={() => {
                setParsedData(null);
                setSelectedMatches([]);
              }}
              className="btn-cancel"
              type="button"
            >
              ❌ Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Import Stats */}
      {importStats && (
        <div className="import-stats">
          <h4>📊 Import-Statistik</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Gesamt:</span>
              <span className="stat-value">{importStats.total}</span>
            </div>
            <div className="stat-item success">
              <span className="stat-label">Importiert:</span>
              <span className="stat-value">✅ {importStats.imported}</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-label">Duplikate:</span>
              <span className="stat-value">⏭️ {importStats.duplicates}</span>
            </div>
            <div className="stat-item info">
              <span className="stat-label">Kosten:</span>
              <span className="stat-value">💰 {importStats.cost}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="import-info">
        <h4>ℹ️ Hinweise</h4>
        <ul>
          <li>✅ Kopiere Meldelisten direkt aus TVM (Tennisverband Mittelrhein)</li>
          <li>🤖 Die KI erkennt automatisch Datum, Uhrzeit, Gegner und Spielort</li>
          <li>🔍 Duplikate werden automatisch erkannt und übersprungen</li>
          <li>💰 Durchschnittliche Kosten: ~$0.006 pro Import</li>
          <li>⚡ Parsing dauert ca. 2-5 Sekunden</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportTab;

