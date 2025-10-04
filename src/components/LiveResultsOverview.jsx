import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trophy, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import './LiveResults.css';

const LiveResultsOverview = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { teamInfo } = useData();

  // State für Daten
  const [match, setMatch] = useState(null);
  const [matchResults, setMatchResults] = useState([]);
  const [homePlayers, setHomePlayers] = useState({});
  const [opponentPlayers, setOpponentPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalScore, setTotalScore] = useState({ home: 0, guest: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [matchId]);

  // Timer für Live-Updates (alle 30 Sekunden)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Aktualisiert alle 30 Sekunden

    return () => clearInterval(interval);
  }, []);

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

      // Lade Match-Ergebnisse
      const { data: resultsData, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', matchId)
        .order('match_number', { ascending: true });

      if (resultsError) {
        console.error('Error loading results:', resultsError);
        setError('Ergebnisse konnten nicht geladen werden');
        return;
      }

      setMatchResults(resultsData || []);
      console.log('🎾 Match results loaded:', resultsData);

      // Lade Home-Spieler für Namen
      const { data: homePlayersData, error: homeError } = await supabase
        .from('players')
        .select('id, name')
        .eq('is_active', true);

      if (homeError) {
        console.error('Error loading home players:', homeError);
      } else {
        const playersMap = {};
        homePlayersData?.forEach(player => {
          playersMap[player.id] = player.name;
        });
        setHomePlayers(playersMap);
        console.log('🏠 Home players loaded:', playersMap);
      }

      // Lade Opponent-Spieler für Namen
      const { data: opponentPlayersData, error: opponentError } = await supabase
        .from('opponent_players')
        .select('id, name')
        .eq('is_active', true);

      if (opponentError) {
        console.error('Error loading opponent players:', opponentError);
      } else {
        const playersMap = {};
        opponentPlayersData?.forEach(player => {
          playersMap[player.id] = player.name;
        });
        setOpponentPlayers(playersMap);
        console.log('🌍 Opponent players loaded:', playersMap);
      }

      // Berechne Gesamtpunktzahl
      calculateTotalScore(resultsData || []);

    } catch (err) {
      console.error('Error in loadData:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Tennis Match Logic - Gleiche Logik wie in LiveResults.jsx
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

  const calculateMatchWinnerFromSets = (result) => {
    let homeSetsWon = 0;
    let guestSetsWon = 0;
    
    // Prüfe die drei Sätze
    const sets = [
      { home: result.set1_home, guest: result.set1_guest },
      { home: result.set2_home, guest: result.set2_guest },
      { home: result.set3_home, guest: result.set3_guest }
    ];
    
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

  const calculateTotalScore = (results) => {
    let homeScore = 0;
    let guestScore = 0;
    let completedMatches = 0;

    results.forEach(result => {
      // Prüfe zuerst, ob bereits ein winner in der DB gesetzt ist
      if (result.status === 'completed' && result.winner) {
        completedMatches++;
        if (result.winner === 'home') {
          homeScore++;
        } else if (result.winner === 'guest') {
          guestScore++;
        }
      } else {
        // Fallback: Berechne den Gewinner aus den Sätzen
        const matchWinner = calculateMatchWinnerFromSets(result);
        if (matchWinner === 'home') {
          completedMatches++;
          homeScore++;
        } else if (matchWinner === 'guest') {
          completedMatches++;
          guestScore++;
        }
      }
    });

    setTotalScore({ home: homeScore, guest: guestScore, completed: completedMatches });
  };

  const getMatchStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="status-icon completed" />;
      case 'in_progress':
        return <PlayCircle className="status-icon in-progress" />;
      case 'pending':
        return <Clock className="status-icon pending" />;
      default:
        return <Clock className="status-icon pending" />;
    }
  };

  const getMatchStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen';
      case 'in_progress':
        return 'Läuft';
      case 'pending':
        return 'Ausstehend';
      default:
        return 'Ausstehend';
    }
  };

  // formatScore function removed as it's not used

  const renderMatchCard = (result, index) => {
    const matchNumber = result.match_number;
    const matchType = result.match_type;
    
    // Berechne Match-Status und Gewinner
    const matchWinner = calculateMatchWinnerFromSets(result);
    const isCompleted = matchWinner !== null;
    const hasStarted = result.set1_home > 0 || result.set1_guest > 0;
    const matchStatus = isCompleted ? 'completed' : (hasStarted ? 'in_progress' : (result.status || 'pending'));
    
    // Debug: Logge Match-Winner für Entwicklung
    console.log(`Match ${matchNumber} - Winner: ${matchWinner}, Sets: ${result.set1_home}-${result.set1_guest}, ${result.set2_home}-${result.set2_guest}, ${result.set3_home}-${result.set3_guest}`);
    
    // Spielernamen extrahieren
    const homePlayerName = result.match_type === 'Einzel' 
      ? (homePlayers[result.home_player_id] || 'Spieler wählen')
      : `${homePlayers[result.home_player1_id] || 'Spieler 1'} & ${homePlayers[result.home_player2_id] || 'Spieler 2'}`;
    
    const guestPlayerName = result.match_type === 'Einzel' 
      ? (opponentPlayers[result.guest_player_id] || 'Gegner wählen')
      : `${opponentPlayers[result.guest_player1_id] || 'Gegner 1'} & ${opponentPlayers[result.guest_player2_id] || 'Gegner 2'}`;
    
    // Bestimme Bilder basierend auf Match-Nummer
    const homeImageSrc = matchNumber === 1 ? '/tennis-player-1.jpg' : 
                        matchNumber === 2 ? '/tennis-player-2.jpg' : 
                        matchNumber === 3 ? '/tennis-player-3.jpg' : 
                        '/player-placeholder-1.svg';
    
    const guestImageSrc = matchNumber === 1 ? '/player-placeholder-2.svg' : 
                         matchNumber === 2 ? '/player-placeholder-guest.svg' : 
                         matchNumber === 3 ? '/player-placeholder-home.svg' : 
                         '/player-placeholder-guest.svg';
    
    return (
      <div key={result.id || index} className="match-result-card">
        <div className="match-header">
          <div className="match-info">
            <span className="match-number">Match {matchNumber}</span>
            <span className="match-type">
              {matchType === 'Einzel' ? '👤' : '👥'} {matchType}
            </span>
          </div>
          <div className="match-status">
            {matchStatus === 'in_progress' && (
              <div className="live-indicator-small">
                <div className="live-dot-small"></div>
                <span>Spiel läuft</span>
              </div>
            )}
            {matchStatus !== 'in_progress' && (
              <>
                {getMatchStatusIcon(matchStatus)}
                <span>{getMatchStatusText(matchStatus)}</span>
              </>
            )}
          </div>
        </div>

        <div className="match-players-compact">
          {/* Home Player */}
          <div className={`player-row home ${
            matchWinner === 'home' ? 'winner' : 
            matchWinner === 'guest' ? 'loser' : ''
          }`}>
            <div className="player-avatar">
              <img 
                src={homeImageSrc}
                alt="Home Player"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="avatar-placeholder">
                <span>🏠</span>
              </div>
            </div>
            <div className="player-info">
              <div className="player-name">
                {homePlayerName}
                {(matchWinner === 'home' || matchNumber === 1) && (
                  <span className="trophy-icon" style={{ marginLeft: '8px', fontSize: '16px' }}>🏆</span>
                )}
              </div>
              <div className="player-status">
                {/* Grüner Haken entfernt */}
              </div>
            </div>
            {matchStatus !== 'pending' && (
              <div className="player-scores">
                <span className="score-number">{result.set1_home || '0'}</span>
                <span className="score-number">{result.set2_home || '0'}</span>
                {result.set3_home !== null && (
                  <span className="score-number tiebreak">{result.set3_home}</span>
                )}
              </div>
            )}
          </div>

          {/* Guest Player */}
          <div className={`player-row guest ${
            matchWinner === 'guest' ? 'winner' : 
            matchWinner === 'home' ? 'loser' : ''
          }`}>
            <div className="player-avatar">
              <img 
                src={guestImageSrc}
                alt="Guest Player"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="avatar-placeholder">
                <span>🤡</span>
              </div>
            </div>
            <div className="player-info">
              <div className="player-name">
                {guestPlayerName}
                {(matchWinner === 'guest' || matchNumber === 3) && (
                  <span className="trophy-icon" style={{ marginLeft: '8px', fontSize: '16px' }}>🏆</span>
                )}
              </div>
              <div className="player-status">
                {/* Grüner Haken entfernt */}
              </div>
            </div>
            {matchStatus !== 'pending' && (
              <div className="player-scores">
                <span className="score-number">{result.set1_guest || '0'}</span>
                <span className="score-number">{result.set2_guest || '0'}</span>
                {result.set3_guest !== null && (
                  <span className="score-number tiebreak">{result.set3_guest}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {result.notes && (
          <div className="match-comment">
            <span className="comment-label">💬</span>
            <span>{result.notes}</span>
          </div>
        )}

        <div className="match-actions">
          <button 
            className="btn-primary"
            onClick={() => navigate(`/live-results/${matchId}/edit`)}
          >
            <Edit size={16} />
            {result.status === 'pending' ? 'Ergebnisse eintragen' : 'Bearbeiten'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="live-results-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Live-Ergebnisse...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-results-page">
        <div className="error-container">
          <h2>❌ Fehler</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-back">
            <ArrowLeft size={16} />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  // Prüfe ob Medenspiel beendet ist (6 Spiele UND kein Spiel läuft mehr)
  const hasAnyInProgressMatch = matchResults.some(result => {
    const matchWinner = calculateMatchWinnerFromSets(result);
    const hasStarted = result.set1_home > 0 || result.set1_guest > 0;
    return hasStarted && matchWinner === null; // Spiel hat begonnen aber noch keinen Gewinner
  });
  
  const isMatchCompleted = totalScore.completed >= 6 && !hasAnyInProgressMatch;
  const matchWinner = totalScore.home > totalScore.guest ? 'home' : 
                     totalScore.guest > totalScore.home ? 'guest' : 'tie';
  
  // Debug: Logge den Status
  console.log('Medenspiel Status:', {
    completed: totalScore.completed,
    hasAnyInProgressMatch,
    isMatchCompleted,
    totalScore: `${totalScore.home}:${totalScore.guest}`
  });

  return (
    <div className="live-results-page">
      {/* Live Indicator oder Finales Ergebnis */}
      {!isMatchCompleted ? (
        <div className="live-indicator-full">
          <div className="live-dot"></div>
          <span>LIVE</span>
        </div>
      ) : (
        <div className="final-result-indicator">
          <div className="final-result-content">
            <span className="final-result-icon">🏆</span>
            <span className="final-result-text">
              {matchWinner === 'home' ? 'MEDENSPIEL GEWONNEN' : 
               matchWinner === 'guest' ? 'MEDENSPIEL VERLOREN' : 'MEDENSPIEL UNENTSCHIEDEN'}
            </span>
            <span className="final-result-score">
              {totalScore.home} : {totalScore.guest}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
          <div className="header-top">
            <button 
              className="back-button"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={20} />
              Zurück zur Übersicht
            </button>
            
            <div className="header-center">
              <div className="modern-time">
                <div className="date-display">
                  {currentTime.toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
                <div className="time-display">
                  {currentTime.toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
            
            <button
              className="btn-update"
              onClick={() => navigate(`/ergebnisse/${matchId}/edit`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
              </svg>
              Ergebnisse eintragen
            </button>
          </div>
      </div>

      {/* Gesamtpunktzahl */}
      <div className="total-score-card">
        <div className="score-title">
          <Trophy className="trophy-icon" />
          Aktueller Stand
        </div>
        <div className="score-display-large">
          <div className="team-score home">
            <span className="team-name">🏠 {teamInfo?.teamName || 'Unser Team'}</span>
            <span className="score-number">{totalScore.home}</span>
          </div>
          <div className="score-separator">:</div>
          <div className="team-score guest">
            <span className="team-name">🌍 {match?.opponent || 'Gegner'}</span>
            <span className="score-number">{totalScore.guest}</span>
          </div>
        </div>
        <div className="score-status">
          {totalScore.home > totalScore.guest ? `🏠 ${teamInfo?.teamName || 'Heim'} führt` :
           totalScore.guest > totalScore.home ? `🌍 ${match?.opponent || 'Gast'} führt` :
           '⚖️ Unentschieden'}
        </div>
      </div>

      {/* Match-Ergebnisse */}
      <div className="matches-container">
        <div className="matches-header">
          <h2>Match-Übersicht</h2>
        </div>

        <div className="matches-grid">
          {matchResults.length > 0 ? (
            matchResults.map((result, index) => renderMatchCard(result, index))
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🎾</div>
              <h3>Noch keine Ergebnisse</h3>
              <p>Klicke auf &quot;Ergebnisse eintragen&quot; um zu beginnen!</p>
              <button 
                className="btn-primary"
                onClick={() => navigate(`/live-results/${matchId}/edit`)}
              >
                <Edit size={16} />
                Erste Ergebnisse eintragen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveResultsOverview;