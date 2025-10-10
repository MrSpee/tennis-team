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

    setIsProcessing(true);
    setError(null);
    setParsedData(null);
    setSuccessMessage(null);

    try {
      console.log('🔄 Calling parse API...');
      
      // API-Aufruf an Vercel Function (kein teamId nötig - KI erkennt es!)
      const response = await fetch('/api/import/parse-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
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
      
      let successMsg = `${result.data.matches.length} Match(es) erfolgreich erkannt!`;
      if (result.data.team_info) {
        successMsg += `\n🎾 Team: ${result.data.team_info.club_name}`;
      }
      if (result.data.players && result.data.players.length > 0) {
        successMsg += `\n👥 ${result.data.players.length} Spieler erkannt`;
      }
      setSuccessMessage(successMsg);

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
      
      // SCHRITT 1: Finde oder erstelle das Team (inkl. Season)
      let teamId = await findOrCreateTeam(parsedData.team_info, parsedData.season);
      console.log('🎯 Using team_id:', teamId);

      // SCHRITT 2: Prüfe auf Duplikate
      const duplicateCheck = await checkForDuplicates(matchesToImport, teamId);
      
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

      // SCHRITT 3: Formatiere für Supabase
      const formattedMatches = uniqueMatches.map(match => ({
        team_id: teamId,
        match_date: match.match_date,
        start_time: match.start_time || null,
        opponent: match.opponent,
        is_home_match: match.is_home_match,
        venue: match.venue || null,
        address: match.address || null,
        league: parsedData.team_info?.league || null,
        group_name: null,
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
   * Finde oder erstelle Team in Supabase
   */
  const findOrCreateTeam = async (teamInfo, season) => {
    if (!teamInfo) {
      throw new Error('Team-Informationen fehlen. KI konnte kein Team erkennen.');
    }

    try {
      console.log('🔍 Searching for team:', teamInfo.club_name, teamInfo.team_name);
      
      // SCHRITT 1: Suche existierendes Team in team_info
      const { data: existingTeam, error: searchError } = await supabase
        .from('team_info')
        .select('id')
        .eq('club_name', teamInfo.club_name)
        .eq('team_name', teamInfo.team_name || null)
        .eq('category', teamInfo.category || 'Herren')
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      let teamId;

      if (existingTeam) {
        console.log('✅ Team found in team_info:', existingTeam.id);
        teamId = existingTeam.id;
      } else {
        // SCHRITT 2: Team existiert nicht → ERSTELLE es
        console.log('⚠️ Team not found, creating new team in team_info...');
        
        const { data: newTeam, error: insertError } = await supabase
          .from('team_info')
          .insert({
            club_name: teamInfo.club_name,
            team_name: teamInfo.team_name || null,
            category: teamInfo.category || 'Herren',
            region: 'Mittelrhein',
            tvm_link: teamInfo.website || null
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        console.log('✅ Team created in team_info:', newTeam.id);
        teamId = newTeam.id;
      }

      // SCHRITT 3: Prüfe/Erstelle team_seasons Eintrag
      const currentSeason = season || 'Winter 2025/26';
      
      const { data: existingSeason, error: seasonSearchError } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', teamId)
        .eq('season', currentSeason)
        .maybeSingle();

      if (seasonSearchError && seasonSearchError.code !== 'PGRST116') {
        console.warn('⚠️ Error checking season:', seasonSearchError);
      }

      if (!existingSeason) {
        console.log('📅 Creating team_seasons entry...');
        
        // Extrahiere Liga aus teamInfo.league (z.B. "Herren 50 2. Bezirksliga Gr. 054")
        const leagueMatch = teamInfo.league?.match(/(\d+\.\s*\w+)/);
        const league = leagueMatch ? leagueMatch[1] : null;
        
        // Extrahiere Gruppe (z.B. "Gr. 054")
        const groupMatch = teamInfo.league?.match(/Gr\.\s*(\d+)/);
        const groupName = groupMatch ? `Gr. ${groupMatch[1]}` : null;

        const { error: seasonInsertError } = await supabase
          .from('team_seasons')
          .insert({
            team_id: teamId,
            season: currentSeason,
            league: league || '2. Bezirksliga',
            group_name: groupName,
            team_size: 4, // Default für 4er-Teams
            is_active: true
          });

        if (seasonInsertError) {
          console.warn('⚠️ Could not create season:', seasonInsertError);
        } else {
          console.log('✅ team_seasons created');
        }
      }

      return teamId;

    } catch (err) {
      console.error('❌ Error finding/creating team:', err);
      throw new Error('Fehler beim Finden/Erstellen des Teams: ' + err.message);
    }
  };

  /**
   * Prüfe auf Duplikate in der Datenbank
   */
  const checkForDuplicates = async (matches, teamId) => {
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
    setInputText(`VKC Köln
Stadt Köln
Alfred Schütte Allee 51
51105 Köln
http://www.vkc-koeln.de

Mannschaftsführer
Kliemt Mathias (-)

Herren 50 2. Bezirksliga Gr. 054
Herren 50 1 (4er)

Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
11.10.2025, 18:00	Cologne Sportspark	VKC Köln 1	TG Leverkusen 2	0:0	0:0	0:0	offen
29.11.2025, 18:00	KölnerTHC Stadion RW	KölnerTHC Stadion RW 2	VKC Köln 1	0:0	0:0	0:0	offen
17.01.2026, 18:00	Cologne Sportspark	VKC Köln 1	TPSK 1925 Köln 1	0:0	0:0	0:0	offen`);
  };

  return (
    <div className="import-tab">
      <div className="import-header">
        <h2>🤖 KI-gestützter Match-Import</h2>
        <p>Kopiere TVM-Meldelisten hier rein und lass die KI die Matches automatisch extrahieren.</p>
      </div>

      {/* Team-Info wird automatisch erkannt */}
      {parsedData?.team_info && (
        <div className="import-section">
          <div className="team-info-banner">
            <h3>🎾 Erkanntes Team:</h3>
            <div className="team-details">
              <strong>{parsedData.team_info.club_name}</strong>
              {parsedData.team_info.team_name && ` - ${parsedData.team_info.team_name}`}
              {parsedData.team_info.category && ` (${parsedData.team_info.category})`}
              <br />
              {parsedData.team_info.league && <span className="meta-badge">{parsedData.team_info.league}</span>}
            </div>
          </div>
        </div>
      )}

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
          placeholder="Kopiere hier die komplette TVM-Seite (inkl. Team-Info und Spielplan)...

Die KI erkennt automatisch:
✅ Verein & Mannschaft
✅ Alle Spieltage
✅ Spieler (falls Meldeliste dabei)"
          rows={12}
          className="match-input"
        />

        <div className="input-actions">
          <button
            onClick={handleParseMatches}
            disabled={!inputText.trim() || isProcessing}
            className="btn-parse"
          >
            {isProcessing ? '⏳ Verarbeite...' : '🤖 KI analysieren'}
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

