import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getOpponentPlayers } from '../services/liveResultsService';
import './LiveResults.css';

const LiveResultsWithDB = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // State für echte Daten
  const [match, setMatch] = useState(null);
  const [homePlayers, setHomePlayers] = useState({ available: [], others: [] });
  const [opponentPlayers, setOpponentPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State für Match-Ergebnisse
  const [matchResults, setMatchResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // Lade echte Daten aus der Datenbank
  useEffect(() => {
    // ProtectedRoute garantiert bereits, dass User eingeloggt ist
    if (matchId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade Match-Daten
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error('Error loading match:', matchError);
        setError('Match nicht gefunden');
        return;
      }

      setMatch(matchData);

      // Lade unsere Spieler
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, ranking')
        .eq('is_active', true)
        .order('name');

      if (playersError) {
        console.error('Error loading players:', playersError);
        setError('Spieler konnten nicht geladen werden');
        return;
      }

      // Lade Verfügbarkeits-Daten für das Match
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('match_availability')
        .select(`
          player_id,
          status,
          players!inner(id, name, ranking)
        `)
        .eq('match_id', matchId);

      if (availabilityError) {
        console.error('Error loading availability:', availabilityError);
        // Verfügbarkeit ist optional, fahre ohne fort
      }

      // Gruppiere Spieler: Zuerst angemeldete, dann alle anderen
      const allPlayers = playersData || [];
      const availablePlayerIds = (availabilityData || [])
        .filter(avail => avail.status === 'available')
        .map(avail => avail.player_id);

      const availablePlayers = allPlayers.filter(player => availablePlayerIds.includes(player.id));
      const otherPlayers = allPlayers.filter(player => !availablePlayerIds.includes(player.id));

      setHomePlayers({
        available: availablePlayers,
        others: otherPlayers
      });

      // Lade Gegner-Spieler (basierend auf Match-Opponent)
      if (matchData?.opponent) {
        const guestPlayers = await getOpponentPlayers(matchData.opponent, '2024/25');
        setOpponentPlayers(guestPlayers || []);
      }

      // Lade bereits gespeicherte Ergebnisse
      await loadExistingResults(matchId);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResults = async (matchId) => {
    try {
      console.log('🔍 Loading existing results for match:', matchId);
      
      // Lade bereits gespeicherte Ergebnisse aus der Datenbank
      const { data: existingResults, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.error('❌ Error loading existing results:', error);
        // Falls Fehler, initialisiere mit leeren Ergebnissen
        initializeMatchResults();
        return;
      }

      console.log('✅ Found existing results:', existingResults?.length || 0);

      // Erstelle Map der bestehenden Ergebnisse
      const existingResultsMap = {};
      if (existingResults) {
        existingResults.forEach(result => {
          existingResultsMap[result.match_number] = result;
        });
      }

      // Initialisiere Match-Ergebnisse mit bestehenden Daten
      const results = [];
      
      // Match 2 und 4 (Einzel-Matches zuerst)
      [2, 4].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Einzel',
          title: `Match ${matchNumber}`,
          homePlayer: existing?.home_player_id || '',
          guestPlayer: existing?.guest_player_id || '',
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || ''
        });
      });
      
      // Match 5 und 6 (Doppel-Matches)
      [5, 6].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Doppel',
          title: `Match ${matchNumber}`,
          homePlayers: [existing?.home_player1_id || '', existing?.home_player2_id || ''],
          guestPlayers: [existing?.guest_player1_id || '', existing?.guest_player2_id || ''],
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || ''
        });
      });
      
      // Match 1 und 3 (weitere Einzel-Matches)
      [1, 3].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Einzel',
          title: `Match ${matchNumber}`,
          homePlayer: existing?.home_player_id || '',
          guestPlayer: existing?.guest_player_id || '',
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || ''
        });
      });
      
      setMatchResults(results);
      console.log('✅ Match results initialized with existing data');
      
    } catch (err) {
      console.error('❌ Error in loadExistingResults:', err);
      // Fallback: Initialisiere mit leeren Ergebnissen
      initializeMatchResults();
    }
  };

  const initializeMatchResults = () => {
    const results = [];
    
    // Match 2 und 4 (Einzel-Matches zuerst)
    results.push({
      id: 2,
      type: 'Einzel',
      title: 'Match 2',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    results.push({
      id: 4,
      type: 'Einzel',
      title: 'Match 4',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    // Match 5 und 6 (Doppel-Matches)
    results.push({
      id: 5,
      type: 'Doppel',
      title: 'Match 5',
      homePlayers: ['', ''],
      guestPlayers: ['', ''],
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    results.push({
      id: 6,
      type: 'Doppel',
      title: 'Match 6',
      homePlayers: ['', ''],
      guestPlayers: ['', ''],
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    // Match 1 und 3 (weitere Einzel-Matches)
    results.push({
      id: 1,
      type: 'Einzel',
      title: 'Match 1',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    results.push({
      id: 3,
      type: 'Einzel',
      title: 'Match 3',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: ''
    });
    
    setMatchResults(results);
  };

  const handleScoreChange = (matchId, setIndex, player, value) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        const newScores = [...match.scores];
        newScores[setIndex] = {
          ...newScores[setIndex],
          [player]: value === '-' ? '' : value
        };
        return { ...match, scores: newScores };
      }
      return match;
    }));
  };

  const handlePlayerSelect = (matchId, playerType, playerId) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        if (match.type === 'Einzel') {
          return { ...match, [playerType]: playerId };
        } else {
          // Doppel - playerType ist z.B. 'homePlayer1'
          const playerIndex = playerType.includes('1') ? 0 : 1;
          const newPlayers = [...match[playerType.includes('home') ? 'homePlayers' : 'guestPlayers']];
          newPlayers[playerIndex] = playerId;
          return { ...match, [playerType.includes('home') ? 'homePlayers' : 'guestPlayers']: newPlayers };
        }
      }
      return match;
    }));
  };

  const handleCommentChange = (matchId, comment) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        return { ...match, comment };
      }
      return match;
    }));
  };

  const saveMatchResult = async (matchData) => {
    try {
      setSaving(true);
      
      // Hole aktuellen Benutzer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      // Prüfe, ob überhaupt Daten eingegeben wurden
      const hasPlayerData = matchData.type === 'Einzel' 
        ? (matchData.homePlayer && matchData.guestPlayer)
        : (matchData.homePlayers[0] && matchData.homePlayers[1] && matchData.guestPlayers[0] && matchData.guestPlayers[1]);

      const hasScoreData = matchData.scores.some(score => 
        (score.home && score.home !== '-') || (score.guest && score.guest !== '-')
      );

      if (!hasPlayerData && !hasScoreData) {
        alert('Bitte wähle mindestens einen Spieler oder gib ein Ergebnis ein!');
        return;
      }

      // Bereite Daten für Supabase vor
      const resultData = {
        match_id: matchId,
        match_number: parseInt(matchData.id), // Stelle sicher, dass es eine Zahl ist
        match_type: matchData.type,
        entered_by: user.id,
        notes: matchData.comment,
        status: hasScoreData ? 'in_progress' : 'pending'
      };

      // Füge Spieler-IDs hinzu (nur wenn nicht leer)
      if (matchData.type === 'Einzel') {
        resultData.home_player_id = matchData.homePlayer && matchData.homePlayer !== '' ? matchData.homePlayer : null;
        resultData.guest_player_id = matchData.guestPlayer && matchData.guestPlayer !== '' ? matchData.guestPlayer : null;
      } else {
        resultData.home_player1_id = matchData.homePlayers[0] && matchData.homePlayers[0] !== '' ? matchData.homePlayers[0] : null;
        resultData.home_player2_id = matchData.homePlayers[1] && matchData.homePlayers[1] !== '' ? matchData.homePlayers[1] : null;
        resultData.guest_player1_id = matchData.guestPlayers[0] && matchData.guestPlayers[0] !== '' ? matchData.guestPlayers[0] : null;
        resultData.guest_player2_id = matchData.guestPlayers[1] && matchData.guestPlayers[1] !== '' ? matchData.guestPlayers[1] : null;
      }

      // Füge Satz-Ergebnisse hinzu (nur wenn nicht leer)
      const scores = matchData.scores;
      resultData.set1_home = scores[0].home && scores[0].home !== '-' && scores[0].home !== '' ? parseInt(scores[0].home) : null;
      resultData.set1_guest = scores[0].guest && scores[0].guest !== '-' && scores[0].guest !== '' ? parseInt(scores[0].guest) : null;
      resultData.set2_home = scores[1].home && scores[1].home !== '-' && scores[1].home !== '' ? parseInt(scores[1].home) : null;
      resultData.set2_guest = scores[1].guest && scores[1].guest !== '-' && scores[1].guest !== '' ? parseInt(scores[1].guest) : null;
      resultData.set3_home = scores[2].home && scores[2].home !== '-' && scores[2].home !== '' ? parseInt(scores[2].home) : null;
      resultData.set3_guest = scores[2].guest && scores[2].guest !== '-' && scores[2].guest !== '' ? parseInt(scores[2].guest) : null;

      // Berechne Gesamtergebnis nur wenn alle Sätze gespielt sind
      let homeSets = 0;
      let guestSets = 0;
      let allSetsPlayed = true;
      
      if (scores[0].home && scores[0].guest && scores[0].home !== '-' && scores[0].guest !== '-') {
        if (parseInt(scores[0].home) > parseInt(scores[0].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }
      
      if (scores[1].home && scores[1].guest && scores[1].home !== '-' && scores[1].guest !== '-') {
        if (parseInt(scores[1].home) > parseInt(scores[1].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }
      
      if (scores[2].home && scores[2].guest && scores[2].home !== '-' && scores[2].guest !== '-') {
        if (parseInt(scores[2].home) > parseInt(scores[2].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }

      // Tennis Match Logic - Korrekte Implementierung der Regeln
      const calculateMatchWinner = (sets) => {
        let homeSetsWon = 0;
        let guestSetsWon = 0;

        // Prüfe jeden Satz
        for (let i = 0; i < sets.length; i++) {
          const set = sets[i];
          const home = parseInt(set.home) || 0;
          const guest = parseInt(set.guest) || 0;

          if (home === 0 && guest === 0) continue; // Leerer Satz

          const setWinner = calculateSetWinner(home, guest, i === 2); // 3. Satz ist Champions Tiebreak

          if (setWinner === 'home') homeSetsWon++;
          else if (setWinner === 'guest') guestSetsWon++;
        }

        // Best of 3: Wer 2 Sätze gewinnt, gewinnt das Match
        if (homeSetsWon >= 2) return 'home';
        if (guestSetsWon >= 2) return 'guest';
        return null; // Match noch nicht beendet
      };

      const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
        if (isChampionsTiebreak) {
          // Champions Tiebreak: Bis 10 Punkte, mindestens 2 Punkte Vorsprung
          if (home >= 10 && home >= guest + 2) return 'home';
          if (guest >= 10 && guest >= home + 2) return 'guest';
          return null;
        } else {
          // Normaler Satz: Bis 6 Spiele, mindestens 2 Spiele Vorsprung
          // Tiebreak bei 6-6: Bis 7 Punkte

          // Tiebreak erkannt
          if ((home === 7 && guest <= 5) || (guest === 7 && home <= 5)) {
            return home > guest ? 'home' : 'guest';
          }

          // Normaler Satz gewonnen
          if (home >= 6 && home >= guest + 2) return 'home';
          if (guest >= 6 && guest >= home + 2) return 'guest';

          // Tiebreak bei 6-6
          if (home === 6 && guest === 6) {
            // Tiebreak wird gespielt - noch kein Gewinner
            return null;
          }

          return null; // Satz noch nicht beendet
        }
      };

      // Berechne den Match-Gewinner mit korrekter Tennis-Logik
      const matchWinner = calculateMatchWinner(scores);
      const hasStarted = scores.some(set => set.home > 0 || set.guest > 0);

      // Setze Gesamtergebnis und Status basierend auf Tennis-Logik
      if (matchWinner !== null) {
        // Match ist beendet
        resultData.home_score = matchWinner === 'home' ? 1 : 0;
        resultData.away_score = matchWinner === 'guest' ? 1 : 0;
        resultData.winner = matchWinner;
        resultData.status = 'completed';
        resultData.completed_at = new Date().toISOString();
      } else if (hasStarted) {
        // Match läuft noch
        resultData.home_score = 0; // Wird später berechnet
        resultData.away_score = 0; // Wird später berechnet
        resultData.winner = null;
        resultData.status = 'in_progress';
        resultData.completed_at = null;
      } else {
        // Nur Spieler ausgewählt, noch nicht begonnen
        resultData.home_score = 0;
        resultData.away_score = 0;
        resultData.winner = null;
        resultData.status = 'pending';
        resultData.completed_at = null;
      }

      // Debug: Zeige was gesendet wird
      console.log('🔍 Sending data to Supabase:', resultData);

      // Speichere in Supabase mit ON CONFLICT für flexible Eingaben
      const { error } = await supabase
        .from('match_results')
        .upsert(resultData, {
          onConflict: 'match_id,match_number',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Supabase Error:', error);
        
        // Spezifische Fehlerbehandlung
        if (error.code === '23505') {
          throw new Error('Match-Ergebnis existiert bereits. Versuche es erneut oder lösche den bestehenden Eintrag.');
        } else if (error.code === '22P02') {
          throw new Error('Ungültige Daten. Bitte überprüfe die Eingaben.');
        } else {
          throw error;
        }
      }

      // Erfolgsmeldung basierend auf korrekter Tennis-Logik
      let statusMessage;
      
      if (matchWinner !== null) {
        // Match ist beendet
        const winnerText = matchWinner === 'home' ? 'Heim' : 'Gast';
        statusMessage = `🏆 Match abgeschlossen! ${winnerText} gewinnt!`;
      } else if (hasStarted) {
        // Match läuft noch - prüfe welche Sätze gespielt wurden
        const playedSets = scores.filter(set => set.home > 0 || set.guest > 0).length;
        const currentSet = playedSets + 1;
        statusMessage = `💾 Zwischenstand gespeichert! Aktuell: Satz ${currentSet}`;
      } else {
        // Nur Spieler ausgewählt
        statusMessage = '📝 Spieler-Auswahl gespeichert!';
      }
        
      alert(statusMessage);
      
      // Zurück zur Übersicht nach dem Speichern
      setTimeout(() => {
        navigate(`/ergebnisse/${matchId}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error saving match result:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderPlayerSelect = (matchData, playerType, playerId) => {
    if (playerType.includes('home')) {
      // Heim-Spieler: Gruppiert anzeigen
      return (
        <select
          value={playerId}
          onChange={(e) => handlePlayerSelect(matchData.id, playerType, e.target.value)}
          className="player-select"
        >
          <option value="">Spieler wählen...</option>
          
          {/* Angemeldete Spieler */}
          {homePlayers.available && homePlayers.available.length > 0 && (
            <optgroup label="✅ Angemeldete Spieler">
              {homePlayers.available.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.ranking && `(${player.ranking})`}
                </option>
              ))}
            </optgroup>
          )}
          
          {/* Alle anderen Spieler */}
          {homePlayers.others && homePlayers.others.length > 0 && (
            <optgroup label="👥 Alle Spieler">
              {homePlayers.others.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.ranking && `(${player.ranking})`}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      );
    } else {
      // Gast-Spieler: Normal anzeigen
      return (
        <select
          value={playerId}
          onChange={(e) => handlePlayerSelect(matchData.id, playerType, e.target.value)}
          className="player-select"
        >
          <option value="">Spieler wählen...</option>
          {opponentPlayers.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} {player.lk && `(LK ${player.lk})`}
            </option>
          ))}
        </select>
      );
    }
  };

  const renderScoreInputs = (matchData) => {
    return (
      <div className="score-inputs">
        {matchData.scores.map((score, index) => (
          <div key={index} className="set-input">
            <label className="set-label">
              {index === 0 ? 'Satz 1' : index === 1 ? 'Satz 2' : 'Champ.-TB'}
            </label>
            <div className="score-row">
              <input
                type="number"
                min="0"
                max={index === 2 ? "20" : "7"}
                value={score.home === '-' ? '' : score.home}
                onChange={(e) => handleScoreChange(matchData.id, index, 'home', e.target.value)}
                className="score-input home-score"
                placeholder="-"
              />
              <span className="score-separator">:</span>
              <input
                type="number"
                min="0"
                max={index === 2 ? "20" : "7"}
                value={score.guest === '-' ? '' : score.guest}
                onChange={(e) => handleScoreChange(matchData.id, index, 'guest', e.target.value)}
                className="score-input guest-score"
                placeholder="-"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMatchCard = (matchData) => {
    return (
      <div key={matchData.id} className="match-card">
        <div className="match-header">
          <h3>{matchData.title} - {matchData.type}</h3>
        </div>

        {matchData.type === 'Einzel' ? (
          <div className="player-selection">
            <div className="player-info">
              <div className="player-icon">🏆</div>
              {renderPlayerSelect(matchData, 'homePlayer', matchData.homePlayer)}
            </div>
            <div className="vs">vs</div>
            <div className="player-info">
              <div className="player-icon">🤡</div>
              {renderPlayerSelect(matchData, 'guestPlayer', matchData.guestPlayer)}
            </div>
          </div>
        ) : (
          <div className="player-selection">
            <div className="team-players">
              <div className="team-players-inline">
                <div className="player-icon">🏆</div>
                {renderPlayerSelect(matchData, 'homePlayer1', matchData.homePlayers[0])}
                <span className="and">und</span>
                {renderPlayerSelect(matchData, 'homePlayer2', matchData.homePlayers[1])}
              </div>
            </div>
            <div className="vs">vs</div>
            <div className="team-players">
              <div className="team-players-inline">
                <div className="player-icon">🤡</div>
                {renderPlayerSelect(matchData, 'guestPlayer1', matchData.guestPlayers[0])}
                <span className="and">und</span>
                {renderPlayerSelect(matchData, 'guestPlayer2', matchData.guestPlayers[1])}
              </div>
            </div>
          </div>
        )}

        {renderScoreInputs(matchData)}

        <div className="comment-section">
          <label>Kommentar:</label>
          <textarea
            value={matchData.comment}
            onChange={(e) => handleCommentChange(matchData.id, e.target.value)}
            placeholder="Zusätzliche Notizen..."
            rows="2"
          />
        </div>

        <button
          onClick={() => saveMatchResult(matchData)}
          disabled={saving}
          className="save-button"
        >
          <Save size={16} />
          {saving ? 'Speichere...' : 'Ergebnis speichern'}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="live-results-page">
        <div className="loading">Lade Daten...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-results-page">
        <div className="error">Fehler: {error}</div>
        <button onClick={() => navigate(`/ergebnisse/${matchId}`)}>Zurück zur Übersicht</button>
      </div>
    );
  }

  return (
    <div className="live-results-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-top">
            <button 
              onClick={() => navigate(`/ergebnisse/${matchId}`)}
              className="back-button"
            >
              <ArrowLeft size={16} />
              Zurück zur Übersicht
            </button>
            <h1>🎾 Live-Ergebnisse</h1>
          </div>
        </div>
      </div>

      {/* Einzel-Matches */}
      <section className="matches-section">
        <h2>👤 Einzel-Matches</h2>
        <div className="matches-grid">
          {matchResults
            .filter(m => m.type === 'Einzel')
            .map(renderMatchCard)}
        </div>
      </section>

      {/* Doppel-Matches */}
      <section className="matches-section">
        <h2>👥 Doppel-Matches</h2>
        <div className="matches-grid">
          {matchResults
            .filter(m => m.type === 'Doppel')
            .map(renderMatchCard)}
        </div>
      </section>

      {/* Navigation */}
      <div className="footer-navigation">
        <button 
          onClick={() => navigate(`/ergebnisse/${matchId}`)}
          className="back-to-overview"
        >
          <ArrowLeft size={16} />
          Zurück zur Spielübersicht
        </button>
      </div>
    </div>
  );
};

export default LiveResultsWithDB;
