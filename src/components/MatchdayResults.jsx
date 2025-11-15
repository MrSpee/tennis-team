import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import './LiveResults.css';
import './Dashboard.css';

const MatchdayResults = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { playerTeams } = useData();

  // State für Daten
  const [matchday, setMatchday] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());


  // Timer für Live-Updates
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (matchId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // State für Spieler-Daten
  const [playerData, setPlayerData] = useState({});
  
  // Lade Spieler-Daten für alle results (ohne FK-Joins, weil keine Spalte existiert)
  const loadPlayerDataForResults = async (resultsData) => {
    const allPlayerIds = new Set();
    
    resultsData.forEach(r => {
      // Singles
      if (r.home_player_id) allPlayerIds.add(r.home_player_id);
      if (r.guest_player_id) allPlayerIds.add(r.guest_player_id);
      // Doubles  
      if (r.home_player1_id) allPlayerIds.add(r.home_player1_id);
      if (r.home_player2_id) allPlayerIds.add(r.home_player2_id);
      if (r.guest_player1_id) allPlayerIds.add(r.guest_player1_id);
      if (r.guest_player2_id) allPlayerIds.add(r.guest_player2_id);
    });
    
    if (allPlayerIds.size === 0) return;
    
    console.log('🔍 Loading player data for IDs:', Array.from(allPlayerIds));
    
    const playerDataMap = {};
    await Promise.all(
      Array.from(allPlayerIds).map(async (id) => {
        try {
          const { data, error } = await supabase
            .from('players_unified')
            .select('name, current_lk, season_start_lk')
            .eq('id', id)
            .single();
          
          if (error) {
            console.error(`❌ Error loading player ${id}:`, error);
          } else if (data) {
            console.log(`✅ Loaded player data for ${id}:`, data.name);
            playerDataMap[id] = data;
          }
        } catch (err) {
          console.error('Error loading player data:', err);
        }
      })
    );
    
    console.log('✅ Player data loaded:', playerDataMap);
    setPlayerData(playerDataMap);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade Matchday mit allen Relations
      const { data: matchdayData, error: matchdayError } = await supabase
        .from('matchdays')
        .select(`
          *,
          home_team:home_team_id (
            id,
            club_name,
            team_name,
            category
          ),
          away_team:away_team_id (
            id,
            club_name,
            team_name,
            category
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchdayError) throw matchdayError;
      
      // Lade alle results für diesen matchday (OHNE FK-Join, Spieler laden wir separat)
      const { data: resultsData, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .eq('matchday_id', matchId)
        .order('match_number', { ascending: true });

      if (resultsError) throw resultsError;
      
      // Lade Spieler-Daten separiert (da FK-Joins nicht funktionieren)
      if (resultsData && resultsData.length > 0) {
        await loadPlayerDataForResults(resultsData);
      }

      // WICHTIG: Berechne location aus SPIELER-PERSPEKTIVE (wie in DataContext)
      if (matchdayData && playerTeams && playerTeams.length > 0) {
        const playerTeamIds = playerTeams.map(t => t.id);
        const isOurTeamHome = playerTeamIds.includes(matchdayData.home_team_id);
        const isOurTeamAway = playerTeamIds.includes(matchdayData.away_team_id);
        
        // Überschreibe location mit korrekter Perspektive
        matchdayData.location = isOurTeamHome ? 'Home' : (isOurTeamAway ? 'Away' : matchdayData.location);
        
        console.log('📍 Location corrected:', {
          home_team_id: matchdayData.home_team_id,
          away_team_id: matchdayData.away_team_id,
          playerTeamIds,
          isOurTeamHome,
          isOurTeamAway,
          correctedLocation: matchdayData.location
        });
      }

      setMatchday(matchdayData);
      setResults(resultsData || []);

    } catch (err) {
      console.error('Error loading matchday:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hilfsfunktionen zur Winner-Bestimmung (analog Results.jsx)
  const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
    if (isChampionsTiebreak) {
      if (home >= 10 && home >= guest + 2) return 'home';
      if (guest >= 10 && guest >= home + 2) return 'guest';
      return null;
    } else {
      if ((home === 7 && guest === 6) || (guest === 7 && home === 6)) {
        return home > guest ? 'home' : 'guest';
      }
      if ((home === 7 && guest <= 5) || (guest === 7 && home <= 5)) {
        return home > guest ? 'home' : 'guest';
      }
      if (home >= 6 && home >= guest + 2) return 'home';
      if (guest >= 6 && guest >= home + 2) return 'guest';
      if (home === 6 && guest === 6) return null;
        return null;
    }
  };

  const calculateMatchWinner = (result) => {
    let homeSetsWon = 0;
    let guestSetsWon = 0;
    const sets = [
      { home: result.set1_home, guest: result.set1_guest },
      { home: result.set2_home, guest: result.set2_guest },
      { home: result.set3_home, guest: result.set3_guest }
    ];
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const home = parseInt(set.home) || 0;
      const guest = parseInt(set.guest) || 0;
      if (home === 0 && guest === 0) continue;
      const setWinner = calculateSetWinner(home, guest, i === 2);
      if (setWinner === 'home') homeSetsWon++;
      else if (setWinner === 'guest') guestSetsWon++;
    }
    if (homeSetsWon >= 2) return 'home';
    if (guestSetsWon >= 2) return 'guest';
    return null;
  };

  // Berechne Gesamt-Score (aus User-Perspektive für Statistiken)
  const calculateScore = useCallback(() => {
    console.log('🚨🚨🚨 [MatchdayResults] calculateScore NEUE VERSION v2.0 - START 🚨🚨🚨');
    
    if (!matchday || !playerTeams || playerTeams.length === 0) {
      console.log('⚠️ Early return - no matchday or playerTeams');
      return { our: 0, opponent: 0, completed: 0 };
    }
    
    const playerTeamIds = playerTeams.map(t => t.id);
    const isHome = playerTeamIds.includes(matchday.home_team_id);
    const isAway = playerTeamIds.includes(matchday.away_team_id);
    const userSide = isHome ? 'home' : (isAway ? 'away' : null);
    
    console.log('🔍 [MatchdayResults] calculateScore - userSide:', userSide, { isHome, isAway, playerTeamIds });
    
    if (!userSide) {
      console.log('⚠️ Early return - no userSide');
      return { our: 0, opponent: 0, completed: 0 };
    }
    
    let ourScore = 0;
    let opponentScore = 0;
    let completed = 0;

    // Alle abgeschlossenen Match-Status
    const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
    
    // DEBUG: Zeige alle Results mit ihrem Status
    console.log('🔍 [MatchdayResults] calculateScore - Results:', results.length, results);
    results.forEach((result, idx) => {
      console.log(`  Result ${idx + 1}:`, {
        match_number: result.match_number,
        status: result.status,
        winner: result.winner,
        isFinished: FINISHED_STATUSES.includes(result.status)
      });
    });
    
    results.forEach(result => {
      // Nur abgeschlossene Matches mit Winner zählen
      if (!result.winner || !FINISHED_STATUSES.includes(result.status)) {
        console.log(`  ⚠️ Skipped (no winner or not finished):`, result.match_number, result.status, result.winner);
        return;
      }
      
      completed++;
      console.log(`  ✅ Counted:`, result.match_number, result.status, result.winner);
      
      if (userSide === 'home') {
        // Wir sind Home-Team
        if (result.winner === 'home') ourScore++;
        else if (result.winner === 'guest') opponentScore++;
      } else {
        // Wir sind Away-Team
        if (result.winner === 'guest') ourScore++;
        else if (result.winner === 'home') opponentScore++;
      }
    });

    return { our: ourScore, opponent: opponentScore, completed };
  }, [matchday, playerTeams, results]);

  // Berechne Home/Away-Score (DB-Perspektive, links=Home, rechts=Away)
  const calculateHomeAwayScore = useCallback(() => {
    let home = 0;
    let away = 0;
    let completed = 0;
    
    // Alle abgeschlossenen Match-Status
    const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
    
    results.forEach(r => {
      if (!r.winner || !FINISHED_STATUSES.includes(r.status)) return;
      completed++;
      if (r.winner === 'home') home++;
      else if (r.winner === 'guest') away++;
    });
    
    console.log('🔍 [MatchdayResults] calculateHomeAwayScore:', { home, away, completed, totalResults: results.length });
    return { home, away, completed };
  }, [results]);

  // Countdown-Funktion
  const getCountdown = useCallback(() => {
    if (!matchday || !matchday.match_date) return '⏰ Wird geladen...';
    
    const matchTime = new Date(matchday.match_date);
    const now = currentTime;
    const diff = matchTime - now;
    
    if (diff < 0) {
      // Spiel hat bereits begonnen
      const elapsed = Math.abs(diff);
      const hoursSinceStart = elapsed / 3600000;
      
      // 🔧 Prüfe Anzahl der Ergebnisse (Winter: 6, Sommer: 9)
      const expectedResults = matchday.season === 'summer' ? 9 : 6;
      // Alle abgeschlossenen Match-Status (nicht nur 'completed')
      const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
      const completedResults = results.filter(r => FINISHED_STATUSES.includes(r.status) && r.winner).length;
      
      // Beendet: Alle Ergebnisse eingetragen ODER > 7h her
      if (completedResults >= expectedResults) {
        return `✅ Beendet (${completedResults}/${expectedResults})`;
      }
      
      // LIVE: < 7h ODER nicht alle Ergebnisse
      if (hoursSinceStart <= 7) {
        const startTime = matchTime.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `🔴 LIVE (seit ${startTime} Uhr) • ${completedResults}/${expectedResults}`;
      }
      
      // Spiel ist > 7h her aber nicht alle Ergebnisse
      return `⏳ Ergebnisse fehlen (${completedResults}/${expectedResults})`;
    }
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (hours > 24) return `📅 In ${Math.floor(hours / 24)} Tagen`;
    if (hours > 2) return `⏰ In ${hours}h ${minutes}m`;
    return `🔥 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [matchday, currentTime, results]);

  // Prüfe ob Live-Button angezeigt werden soll
  const shouldShowLiveBadge = useCallback(() => {
    if (!matchday) return false;
    
    const matchTime = new Date(matchday.match_date);
    const now = new Date();
    const isToday = matchTime.toDateString() === now.toDateString();
    const within6Hours = now >= matchTime && now <= new Date(matchTime.getTime() + 6 * 3600000);
    
    return isToday && within6Hours;
  }, [matchday]);

  // Render einzelnes Match mit echten Spielerdaten
  const renderMatchCard = (result) => {
    const isSingles = result.match_type === 'Einzel';
    
    // Bestimme User-Team-Seite für richtige Win/Loss-Anzeige
    let isOurTeamHome = false;
    if (matchday && playerTeams && playerTeams.length > 0) {
      const playerTeamIds = playerTeams.map(t => t.id);
      isOurTeamHome = playerTeamIds.includes(matchday.home_team_id);
    }
    
    // Gewinner (DB-Perspektive) für Zeilen-Häkchen
    const matchWinnerRaw = result.winner || calculateMatchWinner(result);
    
    // Badge im Header: Zeige Vereinsnamen statt "Sieg/Niederlage"
    let winnerDisplay = null;
    if (matchWinnerRaw) {
      // Prüfe ob unser Verein beteiligt ist
      const isOurMatch = isOurTeamHome || (matchday && playerTeams && playerTeams.length > 0 && 
                         playerTeams.some(t => t.id === matchday.away_team_id));
      
      // Bestimme ob wir gewonnen haben (nur relevant wenn wir beteiligt sind)
      const userWon = (isOurTeamHome && matchWinnerRaw === 'home') || (!isOurTeamHome && matchWinnerRaw === 'guest');
      
      // Hole Team-Namen für bessere Anzeige
      let winningTeamName = '';
      if (matchday) {
        if (matchWinnerRaw === 'home') {
          // Heim-Team hat gewonnen → zeige Heim-Verein
          winningTeamName = matchday.home_team?.club_name || 
                          matchday.homeTeam?.club_name || 
                          'Heim';
        } else if (matchWinnerRaw === 'guest') {
          // Gast-Team hat gewonnen → zeige Gast-Verein
          winningTeamName = matchday.away_team?.club_name || 
                          matchday.awayTeam?.club_name || 
                          'Gast';
        }
      }
      
      // Fallback: Wenn kein Team-Name verfügbar, verwende "Heim/Gast"
      if (!winningTeamName || winningTeamName === '') {
        winningTeamName = matchWinnerRaw === 'home' ? 'Heim' : 'Gast';
      }
      
      winnerDisplay = { 
        won: userWon,
        isOurMatch: isOurMatch, // NEU: Flag ob unser Verein beteiligt ist
        text: winningTeamName // Zeige Vereinsnamen statt "Sieg/Niederlage"
      };
    }
    
    // Hole Spieler-Daten aus playerData State (separat geladen)
    const player1 = playerData[result.home_player_id] || playerData[result.home_player1_id] || {};
    const player2 = playerData[result.home_player2_id] || {};
    const player3 = playerData[result.guest_player_id] || playerData[result.guest_player1_id] || {};
    const player4 = playerData[result.guest_player2_id] || {};
    
    const getProfileImageSrc = (index) => {
      const images = ['/face1.jpg', '/face2.jpg', '/face3.jpg', '/face4.jpg', '/face5.jpg'];
      return images[index % images.length];
    };
    
    return (
      <div key={result.id || result.match_number} className="match-result-card">
        {/* Header */}
        <div className="match-card-head">
          <h3>
            Spiel #{result.match_number}
          </h3>
          {winnerDisplay && (
            <div className={`improvement-badge-top ${
              !winnerDisplay.isOurMatch ? 'neutral' : 
              winnerDisplay.won ? 'positive' : 'negative'
            }`} style={{ fontSize: '0.8rem' }}>
              <span className="badge-icon">{
                !winnerDisplay.isOurMatch ? '🏆' : 
                winnerDisplay.won ? '✓' : '✗'
              }</span>
              <span className="badge-value">{winnerDisplay.text}</span>
              </div>
            )}
        </div>

        {/* Match Row - New Layout */}
        <div className={`match-row-new ${!isSingles ? 'is-doubles' : 'is-singles'}`}>
          {/* Home Team Row */}
          <div className="team-row">
            <div className="team-left">
              {isSingles ? (
                <img 
                  src={player1?.profile_image || getProfileImageSrc(0)} 
                  alt={player1?.name || 'Player 1'}
                  className="player-avatar"
                  onError={(e) => { e.target.src = getProfileImageSrc(0); }}
                />
              ) : (
                <div className="avatar-group">
                  <img 
                    src={player1?.profile_image || getProfileImageSrc(0)} 
                    alt={player1?.name || 'Player 1'}
                    className="player-avatar"
                    onError={(e) => { e.target.src = getProfileImageSrc(0); }}
                  />
                  <img 
                    src={player2?.profile_image || getProfileImageSrc(1)} 
                    alt={player2?.name || 'Player 2'}
                    className="player-avatar"
                    onError={(e) => { e.target.src = getProfileImageSrc(1); }}
                  />
                </div>
              )}
              <div className="team-names">
                <div className="name-line">
                  <span className="player-name-part">{player1?.name || 'Spieler 1'}</span>
                  {player1?.current_lk && <span className="player-lk-part">(LK {player1.current_lk})</span>}
                </div>
                {!isSingles && player2 && (
                  <div className="name-line">
                    <span className="player-name-part">{player2?.name || 'Spieler 2'}</span>
                    {player2?.current_lk && <span className="player-lk-part">(LK {player2.current_lk})</span>}
                  </div>
                )}
              </div>
              {matchWinnerRaw === 'home' && <span className="tick">✓</span>}
            </div>
            <div className="scores-row">
              {result.set1_home != null && <div className={`score-cell ${result.set1_home > result.set1_guest ? 'score-win' : 'score-lose'}`}>{result.set1_home}</div>}
              {result.set2_home != null && <div className={`score-cell ${result.set2_home > result.set2_guest ? 'score-win' : 'score-lose'}`}>{result.set2_home}</div>}
              {result.set3_home != null && <div className={`score-cell ${result.set3_home > result.set3_guest ? 'score-win' : 'score-lose'}`}>{result.set3_home}</div>}
            </div>
          </div>

          <div className="separator-row"></div>

          {/* Away Team Row */}
          <div className="team-row">
            <div className="team-left">
              {isSingles ? (
                <img 
                  src={player3?.profile_image || getProfileImageSrc(2)} 
                  alt={player3?.name || 'Gegner 1'}
                  className="player-avatar"
                  onError={(e) => { e.target.src = getProfileImageSrc(2); }}
                />
              ) : (
                <div className="avatar-group">
                  <img 
                    src={player3?.profile_image || getProfileImageSrc(2)} 
                    alt={player3?.name || 'Gegner 1'}
                    className="player-avatar"
                    onError={(e) => { e.target.src = getProfileImageSrc(2); }}
                  />
                  <img 
                    src={player4?.profile_image || getProfileImageSrc(3)} 
                    alt={player4?.name || 'Gegner 2'}
                    className="player-avatar"
                    onError={(e) => { e.target.src = getProfileImageSrc(3); }}
                  />
                </div>
              )}
              <div className="team-names">
                <div className="name-line">
                  <span className="player-name-part">{player3?.name || 'Gegner 1'}</span>
                  {player3?.current_lk && <span className="player-lk-part">(LK {player3.current_lk})</span>}
                </div>
                {!isSingles && player4 && (
                  <div className="name-line">
                    <span className="player-name-part">{player4?.name || 'Gegner 2'}</span>
                    {player4?.current_lk && <span className="player-lk-part">(LK {player4.current_lk})</span>}
                  </div>
                )}
              </div>
              {matchWinnerRaw === 'guest' && <span className="tick">✓</span>}
            </div>
            <div className="scores-row">
              {result.set1_guest != null && <div className={`score-cell ${result.set1_guest > result.set1_home ? 'score-win' : 'score-lose'}`}>{result.set1_guest}</div>}
              {result.set2_guest != null && <div className={`score-cell ${result.set2_guest > result.set2_home ? 'score-win' : 'score-lose'}`}>{result.set2_guest}</div>}
              {result.set3_guest != null && <div className={`score-cell ${result.set3_guest > result.set3_home ? 'score-win' : 'score-lose'}`}>{result.set3_guest}</div>}
            </div>
          </div>
        </div>

        {/* Spielabbruch-Hinweis */}
        {result.status && ['retired', 'walkover', 'disqualified', 'defaulted'].includes(result.status) && (() => {
          // Bestimme wer verloren hat (= wer abgebrochen hat)
          const loserSide = matchWinnerRaw === 'home' ? 'away' : 'home';
          const loserTeamName = loserSide === 'home' 
            ? (matchday.home_team?.club_name || 'Heim')
            : (matchday.away_team?.club_name || 'Gast');
          
          return (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
              borderRadius: '6px', 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: '#92400e',
              border: '2px solid #fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {result.status === 'retired' && '🏥'}
                {result.status === 'walkover' && '🚶'}
                {result.status === 'disqualified' && '⛔'}
                {result.status === 'defaulted' && '❌'}
              </span>
              <div>
                <div style={{ marginBottom: '0.25rem' }}>
                  {result.status === 'retired' && `Spielabbruch: ${loserTeamName} gibt auf`}
                  {result.status === 'walkover' && `Kampflos: ${loserTeamName} nicht angetreten`}
                  {result.status === 'disqualified' && `Disqualifikation: ${loserTeamName}`}
                  {result.status === 'defaulted' && `Nicht erschienen: ${loserTeamName}`}
                </div>
                {winnerDisplay && (
                  <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#78350f' }}>
                    ➜ Für {winnerDisplay.text} gewertet
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Notizen */}
        {result.notes && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem', color: '#6b7280' }}>
            💬 {result.notes}
          </div>
        )}
      </div>
    );
  };

  // Berechne Werte nur wenn Daten verfügbar sind
  const score = useMemo(() => {
    console.log('🔍 [MatchdayResults] score useMemo triggered:', {
      hasMatchday: !!matchday,
      playerTeamsLength: playerTeams?.length || 0,
      resultsLength: results?.length || 0,
      resultsDetails: results?.map(r => ({ id: r.id, status: r.status, winner: r.winner }))
    });
    
    if (!matchday || !playerTeams || playerTeams.length === 0) {
      console.log('⚠️ [MatchdayResults] Early return from score useMemo - missing data');
      return { our: 0, opponent: 0, completed: 0 };
    }
    
    console.log('✅ [MatchdayResults] Calling calculateScore()...');
    const calculatedScore = calculateScore();
    console.log('✅ [MatchdayResults] Score calculated:', calculatedScore);
    return calculatedScore;
  }, [matchday, playerTeams, results, calculateScore]);

  const countdown = useMemo(() => {
    if (!matchday) return '⏰ Wird geladen...';
    return getCountdown();
  }, [matchday, getCountdown]);

  const showLiveBadge = useMemo(() => shouldShowLiveBadge(), [shouldShowLiveBadge]);
  
  const isCompleted = useMemo(() => {
    const expectedMatches = matchday?.season === 'summer' ? 9 : 6;
    const completed = score.completed >= expectedMatches;
    console.log('🔍 [MatchdayResults] isCompleted:', { completed, scoreCompleted: score.completed, expectedMatches });
    return completed;
  }, [score, matchday]);

  if (loading) {
    return (
      <div className="dashboard container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Matchday...</p>
        </div>
      </div>
    );
  }

  if (error || !matchday) {
    return (
      <div className="dashboard container">
        <div className="error-container">
          <h2>❌ Fehler</h2>
          <p>{error || 'Matchday nicht gefunden'}</p>
          <button onClick={() => navigate('/')} className="btn-back">
            <ArrowLeft size={16} />
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container">
      {/* Back Button */}
      <div className="fade-in" style={{ paddingTop: '0.5rem', marginBottom: '1rem' }}>
            <button 
              className="back-button"
          onClick={() => navigate('/results')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--text)',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={18} />
          Zurück
            </button>
      </div>

      {/* CARD 1: Match Info */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Match Info</div>
          {showLiveBadge && (
            <div className="improvement-badge-top negative" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', animation: 'pulse 2s infinite' }}>
              <span className="badge-icon">🔴</span>
              <span className="badge-value">LIVE</span>
            </div>
          )}
        </div>
        
        <div className="season-content">
          <div className="match-info-grid">
            <div className="match-info-row">
              <span className="info-label">📅 Datum:</span>
              <span className="info-value">
                {matchday.match_date && format(new Date(matchday.match_date), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </span>
            </div>
            
            <div className="match-info-row">
              <span className="info-label">⏰ Uhrzeit:</span>
              <span className="info-value">
                {matchday.start_time || 'TBA'}
              </span>
                </div>
            
            {matchday.location && (
              <div className="match-info-row">
                <span className="info-label">
                  {matchday.location === 'Home' ? '🏠' : '✈️'}
                </span>
                <span className="info-value">
                  {matchday.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}
                </span>
                </div>
            )}
            
            {matchday.venue && (
              <div className="match-info-row">
                <span className="info-label">📍 Ort:</span>
                <span className="info-value">{matchday.venue}</span>
              </div>
            )}
          </div>
          
          {/* Countdown */}
          {!isCompleted && (
            <div className="next-match-card" style={{ marginTop: '1rem' }}>
              <div className="next-match-countdown">{countdown}</div>
            </div>
          )}
              </div>
            </div>
            
      {/* CARD 2: Scoreboard */}
      <div className="fade-in lk-card-full scoreboard-card">
        <div className="formkurve-header">
          <div className="formkurve-title">
            {isCompleted ? 'Endergebnis' : 'Aktueller Stand'}
          </div>
          {isCompleted && (
            <div className={`improvement-badge-top ${score.our > score.opponent ? 'positive' : score.opponent > score.our ? 'negative' : 'neutral'}`}>
              <span className="badge-icon">
                {score.our > score.opponent ? '🏆' : score.opponent > score.our ? '😢' : '🤝'}
              </span>
              <span className="badge-value">
                {score.our > score.opponent ? 'Sieg' : score.opponent > score.our ? 'Niederlage' : 'Draw'}
              </span>
            </div>
          )}
        </div>
        
        <div className="scoreboard-content-new">
          {/* Team Namen: HOME : AWAY (immer DB-Perspektive) */}
          <div className="score-teams">
            <span className="team-name-score home">
              {matchday.home_team?.team_name 
                ? `${matchday.home_team.club_name} ${matchday.home_team.team_name}` 
                : matchday.home_team?.club_name || 'Heim-Team'}
            </span>
                <span className="team-separator">:</span>
            <span className="team-name-score guest">
              {matchday.away_team?.team_name 
                ? `${matchday.away_team.club_name} ${matchday.away_team.team_name}` 
                : matchday.away_team?.club_name || 'Gast-Team'}
            </span>
          </div>
          
          {/* Großer Score: HOME : AWAY (berechnet) */}
          {(() => { const s = calculateHomeAwayScore(); return (
          <div className="score-display-large">
              <div className="score-number-huge">{s.home}</div>
                <div className="score-separator-huge">:</div>
              <div className="score-number-huge">{s.away}</div>
          </div>
          ); })()}
          
          {/* Status */}
          <div className="score-status-text">
            {isCompleted 
              ? `✅ Alle ${score.completed} Spiele beendet`
              : `🎾 ${score.completed} von 6 Spielen beendet`
            }
          </div>
          
          {/* Edit Button */}
            <button
            className="btn-participation"
            onClick={() => navigate(`/live-results/${matchId}/edit`)}
            >
            <Edit size={16} style={{ marginRight: '6px' }} />
            Ergebnisse bearbeiten
            </button>
          </div>
      </div>

      {/* CARD 3: Match Results */}
      {results.length > 0 ? (
        <>
          {/* Einzel */}
          {results.filter(r => r.match_type === 'Einzel').length > 0 && (
            <div className="fade-in lk-card-full">
          <div className="formkurve-header">
                <div className="formkurve-title">🎾 Einzel</div>
            <div className="match-count-badge">
                  {results.filter(r => r.match_type === 'Einzel').length} Spiele
        </div>
          </div>
          <div className="season-matches">
                {results.filter(r => r.match_type === 'Einzel').map(renderMatchCard)}
              </div>
              </div>
      )}
      
          {/* Doppel */}
          {results.filter(r => r.match_type === 'Doppel').length > 0 && (
            <div className="fade-in lk-card-full">
          <div className="formkurve-header">
                <div className="formkurve-title">🎾🎾 Doppel</div>
            <div className="match-count-badge">
                  {results.filter(r => r.match_type === 'Doppel').length} Spiele
            </div>
          </div>
          <div className="season-matches">
                {results.filter(r => r.match_type === 'Doppel').map(renderMatchCard)}
          </div>
        </div>
      )}
        </>
      ) : (
        <div className="fade-in lk-card-full">
            <div className="no-results">
            <div style={{ fontSize: '3rem' }}>🎾</div>
              <h3>Noch keine Ergebnisse</h3>
            <p>Klicke auf &ldquo;Ergebnisse bearbeiten&rdquo; um zu beginnen!</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default MatchdayResults;
