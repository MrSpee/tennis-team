import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getOpponentPlayers } from '../services/liveResultsService';
import './LiveResults.css';

const LiveResults = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // Mock-Daten für Spieler
  const homePlayers = [
    { id: 'home_1', name: 'Max Mustermann' },
    { id: 'home_2', name: 'Anna Schmidt' },
    { id: 'home_3', name: 'Peter Müller' },
    { id: 'home_4', name: 'Lisa Weber' },
    { id: 'home_5', name: 'Tom Fischer' },
    { id: 'home_6', name: 'Sarah Wagner' }
  ];

  const opponentPlayers = [
    { id: 'opp_1', name: 'Tim Breitbarth', lk: 'LK 8' },
    { id: 'opp_2', name: 'Thomas Wagner', lk: 'LK 8.8' },
    { id: 'opp_3', name: 'Thomas Riegermann', lk: 'LK 9.8' },
    { id: 'opp_4', name: 'Clemens Klein', lk: 'LK 11.1' },
    { id: 'opp_5', name: 'Daniel Naves', lk: 'LK 12.4' },
    { id: 'opp_6', name: 'Michael Sikora', lk: 'LK 12.6' }
  ];

  // Mock-Match-Daten
  const mockMatch = {
    id: matchId,
    opponent: 'TG Leverkusen',
    date: '2024-01-15',
    time: '14:00'
  };

  // State für Match-Ergebnisse
  const [matchResults, setMatchResults] = useState(() => {
    const results = [];
    
    // 4 Einzel-Matches
    for (let i = 1; i <= 4; i++) {
      results.push({
        id: `single_${i}`,
        type: 'Einzel',
        number: i,
        homePlayer: '',
        guestPlayer: '',
        sets: [
          { home: '', guest: '' },
          { home: '', guest: '' },
          { home: '', guest: '' }
        ],
        comment: '',
        status: 'pending'
      });
    }
    
    // 2 Doppel-Matches
    for (let i = 1; i <= 2; i++) {
      results.push({
        id: `double_${i}`,
        type: 'Doppel',
        number: i,
        homePlayer1: '',
        homePlayer2: '',
        guestPlayer1: '',
        guestPlayer2: '',
        sets: [
          { home: '', guest: '' },
          { home: '', guest: '' },
          { home: '', guest: '' }
        ],
        comment: '',
        status: 'pending'
      });
    }
    
    return results;
  });

  // Event Handlers
  const handlePlayerChange = (matchId, field, value) => {
    setMatchResults(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, [field]: value }
        : match
    ));
  };

  const handleScoreChange = (matchId, setIndex, team, value) => {
    setMatchResults(prev => prev.map(match => 
      match.id === matchId 
        ? {
            ...match,
            sets: match.sets.map((set, index) => 
              index === setIndex 
                ? { ...set, [team]: value }
                : set
            )
          }
        : match
    ));
  };

  const handleCommentChange = (matchId, comment) => {
    setMatchResults(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, comment }
        : match
    ));
  };

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
      // Tiebreak bei 6-6: Einer muss 7 erreichen
      
      // Tiebreak-Sieg: 7:6 oder 6:7
      if ((home === 7 && guest === 6) || (guest === 7 && home === 6)) {
        return home > guest ? 'home' : 'guest';
      }
      
      // Normaler Satzgewinn ohne Tiebreak: 7:5 oder besser
      if ((home === 7 && guest <= 5) || (guest === 7 && home <= 5)) {
        return home > guest ? 'home' : 'guest';
      }
      
      // Normaler Satz gewonnen (6:0, 6:1, 6:2, 6:3, 6:4)
      if (home >= 6 && home >= guest + 2) return 'home';
      if (guest >= 6 && guest >= home + 2) return 'guest';
      
      // Tiebreak wird gerade gespielt (6:6)
      if (home === 6 && guest === 6) {
        return null;
      }
      
      return null; // Satz noch nicht beendet
    }
  };

  const handleSave = (matchResult) => {
    // Berechne Match-Gewinner basierend auf den eingegebenen Sätzen
    const winner = calculateMatchWinner(matchResult.sets);
    
    if (winner) {
      console.log(`Match gewonnen von: ${winner}`);
      console.log('Speichere Match:', { ...matchResult, winner });
      alert(`Ergebnisse erfolgreich gespeichert! 🎾 Gewinner: ${winner === 'home' ? 'Heim' : 'Gast'}`);
    } else {
      console.log('Match noch nicht beendet');
      alert('⚠️ Match ist noch nicht beendet. Bitte alle Sätze vollständig ausfüllen.');
      return;
    }
    
    // Zurück zur Übersicht
    navigate(`/ergebnisse/${matchId}`);
  };

  // Render-Funktionen
  const renderPlayerSelect = (matchId, field, label, players, isOpponent = false) => (
    <select
      value={matchResults.find(m => m.id === matchId)?.[field] || ''}
      onChange={(e) => handlePlayerChange(matchId, field, e.target.value)}
      className="player-select"
    >
      <option value="">{label}</option>
      {players.map(player => (
        <option key={player.id} value={player.id}>
          {isOpponent ? `${player.name} (${player.lk})` : player.name}
        </option>
      ))}
    </select>
  );

  const renderScoreInputs = (matchId) => {
    const match = matchResults.find(m => m.id === matchId);
    
    return (
      <div className="score-inputs">
        {[0, 1, 2].map(setIndex => {
          const set = match?.sets?.[setIndex];
          const homeScore = parseInt(set?.home) || 0;
          const guestScore = parseInt(set?.guest) || 0;
          
          // Bestimme Gewinner des Satzes
          const setWinner = calculateSetWinner(homeScore, guestScore, setIndex === 2);
          const homeIsWinner = setWinner === 'home';
          const guestIsWinner = setWinner === 'guest';
          const isCompleted = setWinner !== null;
          
          return (
            <div key={setIndex} className="set-input">
              <span className="set-label">
                {setIndex === 0 ? 'Satz 1' : setIndex === 1 ? 'Satz 2' : 'Champions Tiebreak'}
              </span>
              <div className="score-row">
                <input
                  type="number"
                  min="0"
                  max={setIndex === 2 ? "20" : "7"}
                  value={homeScore || ''}
                  onChange={(e) => handleScoreChange(matchId, setIndex, 'home', e.target.value)}
                  className={`score-input home-score ${
                    isCompleted 
                      ? (homeIsWinner ? 'winner' : 'loser') 
                      : ''
                  }`}
                  placeholder="-"
                />
                <span className="score-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max={setIndex === 2 ? "20" : "7"}
                  value={guestScore || ''}
                  onChange={(e) => handleScoreChange(matchId, setIndex, 'guest', e.target.value)}
                  className={`score-input guest-score ${
                    isCompleted 
                      ? (guestIsWinner ? 'winner' : 'loser') 
                      : ''
                  }`}
                  placeholder="-"
                />
              </div>
              <div className="set-help">
                {setIndex === 2 ? 'Bis 10 Punkte (min. 2 Vorsprung)' : 'Bis 6 Spiele (min. 2 Vorsprung)'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMatchCard = (match) => (
    <div key={match.id} className="match-card">
      <div className="match-header">
        <h3>{match.type} {match.number}</h3>
        <span className="status-badge">
          {match.status === 'pending' ? '⏳ Ausstehend' : '✅ Beendet'}
        </span>
      </div>

      {/* Spieler-Auswahl */}
      <div className="player-selection">
        {match.type === 'Einzel' ? (
          <>
            <div className="player-row">
              <span className="player-label">🏆 Heim:</span>
              {renderPlayerSelect(match.id, 'homePlayer', 'Heim-Spieler wählen', homePlayers)}
            </div>
            <div className="player-row">
              <span className="player-label">🤡 Gast:</span>
              {renderPlayerSelect(match.id, 'guestPlayer', 'Gast-Spieler wählen', opponentPlayers, true)}
            </div>
          </>
        ) : (
          <>
            <div className="player-row">
              <span className="player-label">🏆 Heim:</span>
              <div className="team-selection">
                {renderPlayerSelect(match.id, 'homePlayer1', 'Spieler 1', homePlayers)}
                <span className="team-plus">+</span>
                {renderPlayerSelect(match.id, 'homePlayer2', 'Spieler 2', homePlayers)}
              </div>
            </div>
            <div className="player-row">
              <span className="player-label">🤡 Gast:</span>
              <div className="team-selection">
                {renderPlayerSelect(match.id, 'guestPlayer1', 'Spieler 1', opponentPlayers, true)}
                <span className="team-plus">+</span>
                {renderPlayerSelect(match.id, 'guestPlayer2', 'Spieler 2', opponentPlayers, true)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Score-Eingabe */}
      <div className="score-section">
        <h4>Ergebnisse</h4>
        <div className="rules-info">
          <p>📋 <strong>Regeln:</strong></p>
          <ul>
            <li>Sätze bis 6 Spiele (mit 2 Spiele Vorsprung)</li>
            <li>Tiebreak bei 6-6 (bis 7 Punkte)</li>
            <li>3. Satz = Champions Tiebreak (bis 10 Punkte)</li>
            <li>Wer 2 Sätze gewinnt, gewinnt das Match</li>
          </ul>
        </div>
        {renderScoreInputs(match.id)}
      </div>

      {/* Kommentar */}
      <div className="comment-section">
        <MessageCircle size={16} />
        <input
          type="text"
          placeholder="Kommentar hinzufügen..."
          value={match.comment}
          onChange={(e) => handleCommentChange(match.id, e.target.value)}
          className="comment-input"
        />
      </div>

      {/* Speichern Button */}
      <button 
        onClick={() => handleSave(match)}
        className="save-button"
      >
        <Save size={16} />
        Speichern
      </button>
    </div>
  );

  return (
    <div className="live-results-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-top">
            <button 
              onClick={() => navigate(`/live-results/${matchId}`)}
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

      {/* Footer Navigation */}
      <div className="footer-navigation">
        <button 
          onClick={() => navigate(`/live-results/${matchId}`)}
          className="back-to-overview"
        >
          <ArrowLeft size={18} />
          Zurück zur Spielübersicht
        </button>
      </div>
    </div>
  );
};

export default LiveResults;