import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import './LiveResults.css';

const MatchdayResults = () => {
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
    // ProtectedRoute garantiert bereits, dass User eingeloggt ist
    if (matchId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Timer für Live-Updates und Countdown (nur wenn Spiel nicht abgeschlossen)
  useEffect(() => {
    // Prüfe ob Spiel abgeschlossen ist
    const hasAnyInProgress = matchResults.some(result => {
      const matchWinner = calculateMatchWinnerFromSets(result);
      const hasStarted = result.set1_home > 0 || result.set1_guest > 0;
      return hasStarted && matchWinner === null;
    });
    
    const completed = totalScore.completed;
    const isMedenspielCompleted = completed >= 6 && !hasAnyInProgress;
    
    // Timer nur starten, wenn Spiel NICHT abgeschlossen ist
    if (isMedenspielCompleted) {
      console.log('✅ Medenspiel abgeschlossen - Timer gestoppt');
      return; // Kein Timer!
    }
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Aktualisiert jede Sekunde

    return () => clearInterval(interval);
  }, [matchResults, totalScore]);

  // Countdown-Funktion für Match-Start
  const getMatchCountdown = (isCompleted) => {
    if (!match || !match.match_date) {
      return 'Kein Datum verfügbar';
    }
    
    const matchStartTime = new Date(match.match_date);
    const now = currentTime;
    const diffTime = matchStartTime - now;
    const diffSeconds = Math.floor(diffTime / 1000);
    
    // Spiel ist abgeschlossen - zeige finale Zeit
    if (isCompleted) {
      return `✅ Medenspiel beendet`;
    }
    
    // Spiel hat bereits begonnen (negative Zeit)
    if (diffSeconds < 0) {
      const elapsedTime = Math.abs(diffTime);
      const elapsedHours = Math.floor(elapsedTime / (1000 * 60 * 60));
      const elapsedMinutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      
      if (elapsedHours === 0) {
        return `🔴 Läuft seit ${elapsedMinutes} Min`;
      }
      return `🔴 Läuft seit ${elapsedHours}h ${elapsedMinutes}m`;
    }
    
    // Mehr als 3 Tage (72 Stunden) entfernt
    const diffHours = diffSeconds / 3600;
    if (diffHours > 72) {
      const diffDays = Math.ceil(diffHours / 24);
      return `📅 In ${diffDays} Tagen`;
    }
    
    // Zwischen 3 Tagen und 2 Stunden: Zeige nur Stunden
    if (diffHours > 2) {
      const hours = Math.floor(diffHours);
      const minutes = Math.floor((diffHours - hours) * 60);
      return `⏰ In ${hours}h ${minutes}m`;
    }
    
    // Weniger als 2 Stunden: Zeige HH:MM:SS Countdown
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    
    return `🔥 ${hoursStr}:${minutesStr}:${secondsStr}`;
  };

  // Prüfe ob Live-Button angezeigt werden soll (ab Match-Startzeit + 6 Stunden, oder bis Match beendet)
  const shouldShowLiveButton = () => {
    if (!match || !match.match_date) {
      return false;
    }
    
    const matchStartTime = new Date(match.match_date);
    const now = new Date();
    
    // Prüfe ob heute der Spieltag ist
    const isMatchDay = matchStartTime.toDateString() === now.toDateString();
    if (!isMatchDay) {
      return false;
    }
    
    // Berechne Endzeit (6 Stunden nach Match-Start)
    const matchEndTime = new Date(matchStartTime.getTime() + (6 * 60 * 60 * 1000)); // +6 Stunden
    
    // Prüfe ob aktuelle Zeit zwischen Match-Start und Match-Start + 6 Stunden liegt
    const isWithinMatchTime = now >= matchStartTime && now <= matchEndTime;
    
    // Prüfe ob 6 Spiele bereits beendet sind (Match ist komplett)
    const isMatchFullyCompleted = totalScore.completed >= 6;
    
    return isWithinMatchTime && !isMatchFullyCompleted;
  };

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
      
      // Debug: Zeige alle home_player_ids aus den Match-Results
      if (resultsData && resultsData.length > 0) {
        console.log('🔍 Match Results Player IDs:');
        resultsData.forEach((result) => {
          console.log(`  Match ${result.match_number}:`, {
            home_player_id: result.home_player_id,
            home_player1_id: result.home_player1_id,
            home_player2_id: result.home_player2_id,
            match_type: result.match_type
          });
        });
      }

      // Lade alle Spieler-Daten separat (mit Profilbild!)
      const { data: homePlayersData, error: homeError } = await supabase
        .from('players')
        .select('id, name, profile_image')
        .order('name', { ascending: true });

      const { data: opponentPlayersData, error: opponentError } = await supabase
        .from('opponent_players')
        .select('id, name, lk');

      if (homeError) {
        console.error('Error loading home players:', homeError);
      } else {
        const playersMap = {};
        homePlayersData?.forEach(player => {
          playersMap[player.id] = player;
        });
        setHomePlayers(playersMap);
      }

      if (opponentError) {
        console.error('Error loading opponent players:', opponentError);
      } else {
        const playersMap = {};
        opponentPlayersData?.forEach(player => {
          playersMap[player.id] = player;
        });
        setOpponentPlayers(playersMap);
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

    // Spielernamen aus den geladenen Maps extrahieren
    const homePlayerName = result.match_type === 'Einzel' 
      ? (homePlayers[result.home_player_id]?.name || 'Spieler wählen')
      : `${homePlayers[result.home_player1_id]?.name || 'Spieler 1'} & ${homePlayers[result.home_player2_id]?.name || 'Spieler 2'}`;
    
    const guestPlayerName = result.match_type === 'Einzel' 
      ? (opponentPlayers[result.guest_player_id]?.name || 'Gegner wählen')
      : `${opponentPlayers[result.guest_player1_id]?.name || 'Gegner 1'} & ${opponentPlayers[result.guest_player2_id]?.name || 'Gegner 2'}`;
    
    // LK für Gegner extrahieren - Frank Ritter hat LK 16.9
    const guestPlayerLK = result.match_type === 'Einzel' 
      ? (opponentPlayers[result.guest_player_id]?.lk || '')
      : `${opponentPlayers[result.guest_player1_id]?.lk || ''} / ${opponentPlayers[result.guest_player2_id]?.lk || ''}`;
    
    // Bestimme Bilder für unsere Spieler (Heimteam)
    const getHomePlayerImage = () => {
      // Für Einzel: Prüfe ob Spieler ein Profilbild hat
      if (result.match_type === 'Einzel' && result.home_player_id) {
        const homePlayer = homePlayers[result.home_player_id];
        if (homePlayer && homePlayer.profile_image) {
          return homePlayer.profile_image;
        }
      }
      // Für Doppel: Prüfe beide Spieler
      if (result.match_type === 'Doppel') {
        const player1 = homePlayers[result.home_player1_id];
        const player2 = homePlayers[result.home_player2_id];
        if (player1 && player1.profile_image) return player1.profile_image;
        if (player2 && player2.profile_image) return player2.profile_image;
      }
      // Standard: home-face.jpg
      return '/home-face.jpg';
    };
    
    // Bestimme konsistentes Face-Bild für Gegner (basierend auf Spieler-ID)
    const getGuestPlayerImage = () => {
      const faceImages = ['/face1.jpg', '/face1.png', '/face2.jpg', '/face3.jpg', '/face4.jpg', '/face5.jpg'];
      
      // Für Einzel: Nutze guest_player_id
      let playerId = result.guest_player_id;
      
      // Für Doppel: Nutze guest_player1_id
      if (result.match_type === 'Doppel' && result.guest_player1_id) {
        playerId = result.guest_player1_id;
      }
      
      // Generiere konsistenten Index aus der Spieler-ID (Hash)
      if (playerId) {
        let hash = 0;
        for (let i = 0; i < playerId.length; i++) {
          hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        const index = Math.abs(hash) % faceImages.length;
        return faceImages[index];
      }
      
      // Fallback: face1.jpg
      return '/face1.jpg';
    };
    
    const homeImageSrc = getHomePlayerImage();
    const guestImageSrc = getGuestPlayerImage();
    
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
            matchStatus === 'completed' && matchWinner === 'home' ? 'winner' : 
            matchStatus === 'completed' && matchWinner === 'guest' ? 'loser' : ''
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
                {/* LK für Frank Ritter (aus Rankings-Liste: LK 16.9) */}
                {homePlayerName.includes('Frank Ritter') && (
                  <span className="player-lk" style={{ marginLeft: '8px', fontSize: '12px', color: '#666', fontWeight: '500' }}>
                    LK 16.9
                  </span>
                )}
                {matchStatus === 'completed' && matchWinner === 'home' && <span style={{color: 'gold', fontSize: '1.2em'}}>🏆</span>}
              </div>
              <div className="player-status">
                {/* Grüner Haken entfernt */}
              </div>
            </div>
            <div className="player-scores">
              <span className="score-number">{result.set1_home || '0'}</span>
              <span className="score-number">{result.set2_home || '0'}</span>
              {/* Zeige dritten Satz nur, wenn er gespielt wurde */}
              {(result.set3_home > 0 || result.set3_guest > 0) && (
                <span className="score-number">{result.set3_home || '0'}</span>
              )}
            </div>
          </div>

          {/* Guest Player */}
          <div className={`player-row guest ${
            matchStatus === 'completed' && matchWinner === 'guest' ? 'winner' : 
            matchStatus === 'completed' && matchWinner === 'home' ? 'loser' : ''
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
                {guestPlayerLK && (
                  <span className="player-lk" style={{ marginLeft: '8px', fontSize: '12px', color: '#666', fontWeight: '500' }}>
                    LK{guestPlayerLK}
                  </span>
                )}
                {matchStatus === 'completed' && matchWinner === 'guest' && <span style={{fontSize: '1.2em'}}>🤡</span>}
              </div>
              <div className="player-status">
                {/* Grüner Haken entfernt */}
              </div>
            </div>
            <div className="player-scores">
              <span className="score-number">{result.set1_guest || '0'}</span>
              <span className="score-number">{result.set2_guest || '0'}</span>
              {/* Zeige dritten Satz nur, wenn er gespielt wurde */}
              {(result.set3_home > 0 || result.set3_guest > 0) && (
                <span className="score-number">{result.set3_guest || '0'}</span>
              )}
            </div>
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
  
  // Humorvoller Status-Text basierend auf Gesamtergebnis
  const getOverallMatchStatus = () => {
    if (!isMatchCompleted) {
      // Spiel läuft noch
      if (totalScore.home === totalScore.guest) {
        return 'Unentschieden';
      }
      return totalScore.home > totalScore.guest ? 'Heim führt' : 'Auswärts führt';
    }
    
    // Spiel ist abgeschlossen
    const diff = Math.abs(totalScore.home - totalScore.guest);
    
    if (matchWinner === 'tie') {
      return '3:3 - Unentschieden! Spannend bis zum Ende!';
    }
    
    if (matchWinner === 'home') {
      // Wir haben gewonnen
      if (diff >= 5) return `${totalScore.home}:${totalScore.guest} - Dominanter Sieg! 💪`;
      if (diff >= 3) return `${totalScore.home}:${totalScore.guest} - Deutlicher Sieg! 🎉`;
      if (diff === 2) return `${totalScore.home}:${totalScore.guest} - Verdienter Sieg! 🏆`;
      return `${totalScore.home}:${totalScore.guest} - Knapper Sieg! 😅`;
    }
    
    // Wir haben verloren
    if (diff >= 5) return `${totalScore.home}:${totalScore.guest} - Herbe Niederlage... 😢`;
    if (diff >= 3) return `${totalScore.home}:${totalScore.guest} - Deutliche Niederlage 😔`;
    if (diff === 2) return `${totalScore.home}:${totalScore.guest} - Verloren, aber nicht chancenlos 💪`;
    return `${totalScore.home}:${totalScore.guest} - Knapp verloren 😬`;
  };

  return (
    <div className="live-results-page">
      {/* Live Indicator oder Finales Ergebnis */}
      {shouldShowLiveButton() && !isMatchCompleted ? (
        <div className="live-indicator-full">
          <div className="live-dot"></div>
          <span>LIVE</span>
        </div>
      ) : isMatchCompleted ? (
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
      ) : null}

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
                <div className="countdown-display">
                  {getMatchCountdown(isMatchCompleted)}
                </div>
                <div className="date-display-small">
                  {match?.match_date && new Date(match.match_date).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} Uhr
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

      {/* Gesamtpunktzahl - Neues modernes Design */}
      <div className="mh-wrap">
        <div className="mh-headline">
          <h1 className="mh-title">{isMatchCompleted ? 'Endergebnis' : 'Aktueller Stand'}</h1>
        </div>

        <section className="mh-card" role="region" aria-label="Scoreboard">
          <div className="mh-glow mh-glow-right" />
          <div className="mh-glow mh-glow-left" />

          <div className="mh-match-title">
            <strong>{teamInfo?.teamName || 'Heim'}</strong> vs. <strong>{match?.opponent || 'Gegner'}</strong>
          </div>

          <div className="mh-scoregrid">
            <div className="mh-center">
              <div className="mh-score-pill" aria-live="polite">
                <div className="mh-score-bg" />
                <div className="mh-score">{totalScore.home}</div>
              </div>
              <div className="mh-sep" aria-hidden>:</div>
              <div className="mh-score-pill" aria-live="polite">
                <div className="mh-score-bg" />
                <div className="mh-score">{totalScore.guest}</div>
              </div>
            </div>
          </div>

          <div className="mh-status">
            <span className="mh-trophy" aria-hidden>
              {isMatchCompleted 
                ? (matchWinner === 'home' ? '🏆' : matchWinner === 'guest' ? '😢' : '🤝')
                : '🏆'
              }
            </span>
            <span className="mh-status-text">
              {getOverallMatchStatus()}
            </span>
          </div>
        </section>
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

export default MatchdayResults;