import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import './Results.css';
import './Dashboard.css';

const Results = () => {
  console.log('🟣 Results Component MOUNTED');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    players, 
    playerTeams, 
    selectedTeamId, 
    setSelectedTeamId,
    matches: dataContextMatches,
    loading: dataContextLoading
  } = useData();
  
  const [matchScores, setMatchScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(new Date());
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Nutze Matches aus DataContext
  const matches = dataContextMatches;
  
  // Prüfe URL-Parameter für viewMode
  const initialViewMode = searchParams.get('view') === 'spieler' ? 'spieler' : 'mannschaft';
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [playerResults, setPlayerResults] = useState({});

  useEffect(() => {
    console.log('🔵 Results useEffect triggered, hasLoaded:', hasLoaded, 'dataContextMatches:', dataContextMatches.length);
    
    // Warte bis DataContext Matches geladen hat
    if (dataContextLoading) {
      console.log('⏳ DataContext still loading, waiting...');
      return;
    }
    
    // Verhindere doppeltes Laden (React Strict Mode)
    if (hasLoaded) {
      console.log('⚠️ Already loaded, skipping...');
      return;
    }
    
    setHasLoaded(true);
    loadMatchesAndResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataContextLoading, dataContextMatches]);

  // Aktualisiere viewMode wenn URL-Parameter sich ändert
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'spieler') {
      setViewMode('spieler');
    }
  }, [searchParams]);

  // Scrolle zum Spieler wenn player-Parameter vorhanden ist
  useEffect(() => {
    const playerId = searchParams.get('player');
    if (playerId && viewMode === 'spieler') {
      // Warte kurz, bis die Komponente gerendert ist
      setTimeout(() => {
        const playerElement = document.getElementById(`player-${playerId}`);
        if (playerElement) {
          playerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Kurzes Highlight-Effekt
          playerElement.classList.add('highlight-player');
          setTimeout(() => {
            playerElement.classList.remove('highlight-player');
          }, 2000);
        }
      }, 300);
    }
  }, [searchParams, viewMode, playerResults]);

  // Aktuelle Saison bestimmen
  const getCurrentSeason = () => {
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    
    if (currentMonth >= 4 && currentMonth <= 7) {
      return { season: 'summer', display: `Sommer ${currentYear}` };
    } else {
      if (currentMonth >= 8) {
        const nextYear = currentYear + 1;
        return { season: 'winter', display: `Winter ${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}` };
      } else {
        const prevYear = currentYear - 1;
        return { season: 'winter', display: `Winter ${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}` };
      }
    }
  };

  const loadMatchesAndResults = async () => {
    console.log('🟢 loadMatchesAndResults STARTED');
    console.log('🟢 Using matches from DataContext:', dataContextMatches.length);
    
    try {
      setLoading(true);
      console.log('⏳ Loading set to TRUE');
      
      // Nutze Matches aus DataContext (schon mit team_info geladen!)
      const processedMatches = dataContextMatches;
      
      if (processedMatches.length === 0) {
        console.warn('⚠️ No matches from DataContext');
        setMatchScores({});
        setLoading(false);
        return;
      }

      console.log('✅ Using matches from DataContext:', processedMatches.length);
      console.log('📋 First match:', processedMatches[0]);
      console.log('📋 Team IDs in matches:', processedMatches.map(m => ({ 
        opponent: m.opponent, 
        team_id: m.teamId,
        has_team_info: !!m.teamInfo,
        team_info: m.teamInfo
      })));

      // Lade Ergebnisse für alle Matches parallel (viel schneller!)
      console.log('🔍 Fetching match results for', processedMatches.length, 'matches...');
      
      const scoresPromises = processedMatches.map(async (match, index) => {
        console.log(`  📊 Fetching results for match ${index + 1}:`, match.opponent);
        
        const { data: resultsData, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .eq('match_id', match.id);

        console.log(`  ✅ Results for match ${index + 1}:`, {
          count: resultsData?.length || 0,
          hasError: !!resultsError,
          data: resultsData
        });

        return {
          matchId: match.id,
          score: (!resultsError && resultsData) ? calculateMatchScore(resultsData, match.season) : null
        };
      });

      const scoresResults = await Promise.all(scoresPromises);
      console.log('✅ All scores fetched:', scoresResults.length);
      
      // Baue scores-Objekt
      const scores = {};
      scoresResults.forEach((result, index) => {
        if (result.score) {
          scores[result.matchId] = result.score;
          console.log(`  💯 Score ${index + 1}:`, result.score);
        }
      });

      console.log('📊 Final scores object:', scores);
      console.log('🎯 Setting state with', processedMatches.length, 'matches and', Object.keys(scores).length, 'scores');

      setMatchScores(scores);
      
      console.log('✅ State set successfully!');
      
      // Lade Spieler-Ergebnisse
      if (players && players.length > 0) {
        await loadPlayerResults(processedMatches);
      }
      
    } catch (error) {
      console.error('❌ FATAL ERROR in loadMatchesAndResults:', error);
    } finally {
      setLoading(false);
      console.log('✅ Loading set to FALSE - DONE!');
    }
  };

  const loadPlayerResults = async (seasonMatches) => {
    try {
      if (!players || players.length === 0) return;

      const playerResultsMap = {};

      for (const player of players) {
        const playerMatches = [];

        for (const match of seasonMatches) {
          const { data: resultsData } = await supabase
            .from('match_results')
            .select('*')
            .eq('match_id', match.id);

          if (resultsData) {
            for (const result of resultsData) {
              const isPlayerInvolved = 
                result.home_player_id === player.id ||
                result.home_player1_id === player.id ||
                result.home_player2_id === player.id;

              if (isPlayerInvolved) {
                let opponentName = 'Unbekannt';
                let opponentLK = null;
                let partnerName = null;
                let partnerLK = null;
                let opponent1Name = null;
                let opponent1LK = null;
                let opponent2Name = null;
                let opponent2LK = null;

                if (result.match_type === 'Einzel' && result.guest_player_id) {
                  const { data: oppData } = await supabase
                    .from('opponent_players')
                    .select('name, lk')
                    .eq('id', result.guest_player_id)
                    .single();
                  
                  if (oppData) {
                    opponentName = oppData.name;
                    opponentLK = oppData.lk;
                  }
                } else if (result.match_type === 'Doppel') {
                  const { data: opp1Data } = await supabase
                    .from('opponent_players')
                    .select('name, lk')
                    .eq('id', result.guest_player1_id)
                    .single();
                  
                  const { data: opp2Data } = await supabase
                    .from('opponent_players')
                    .select('name, lk')
                    .eq('id', result.guest_player2_id)
                    .single();
                  
                  opponent1Name = opp1Data?.name || 'Unbekannt';
                  opponent1LK = opp1Data?.lk || null;
                  opponent2Name = opp2Data?.name || 'Unbekannt';
                  opponent2LK = opp2Data?.lk || null;
                  
                  const partnerId = result.home_player1_id === player.id 
                    ? result.home_player2_id 
                    : result.home_player1_id;
                  
                  if (partnerId) {
                    const { data: partnerData } = await supabase
                      .from('players')
                      .select('name, current_lk, season_start_lk, ranking, profile_image')
                      .eq('id', partnerId)
                      .single();
                    
                    if (partnerData) {
                      partnerName = partnerData.name;
                      partnerLK = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
                    }
                  }
                }

                playerMatches.push({
                  ...result,
                  opponent: match.opponent,
                  matchDate: match.date,
                  opponentPlayerName: opponentName,
                  opponentPlayerLK: opponentLK,
                  partnerName,
                  partnerLK,
                  opponent1Name,
                  opponent1LK,
                  opponent2Name,
                  opponent2LK
                });
              }
            }
          }
        }

        if (playerMatches.length > 0) {
          const sortedMatches = playerMatches.sort((a, b) => {
            if (a.match_type !== b.match_type) {
              return a.match_type === 'Einzel' ? -1 : 1;
            }
            return new Date(a.matchDate) - new Date(b.matchDate);
          });

          playerResultsMap[player.id] = {
            player: player,
            matches: sortedMatches
          };
        }
      }

      setPlayerResults(playerResultsMap);
    } catch (error) {
      console.error('❌ Error loading player results:', error);
    }
  };

  // Tennis Match Logic
  const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
    if (isChampionsTiebreak) {
      if (home >= 10 && home >= guest + 2) return 'home';
      if (guest >= 10 && guest >= home + 2) return 'guest';
      return null;
    } else {
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

  const calculateMatchScore = (results, matchSeason) => {
    let homeScore = 0;
    let guestScore = 0;
    let completedMatches = 0;

    // Erwartete Anzahl Spiele je nach Saison
    const expectedTotal = matchSeason === 'summer' ? 9 : 6; // Sommer: 9, Winter: 6

    results.forEach(result => {
      // Prüfe ob das Match tatsächlich gespielt wurde (mindestens ein Set hat Werte)
      const hasScores = (result.set1_home > 0 || result.set1_guest > 0 || 
                        result.set2_home > 0 || result.set2_guest > 0 ||
                        result.set3_home > 0 || result.set3_guest > 0);
      
      if (!hasScores) {
        // Match wurde noch nicht gespielt, nicht als completed zählen
        return;
      }

      if (result.status === 'completed' && result.winner) {
        completedMatches++;
        if (result.winner === 'home') homeScore++;
        else if (result.winner === 'guest') guestScore++;
      } else {
        const matchWinner = calculateMatchWinner(result);
        if (matchWinner === 'home') {
          completedMatches++;
          homeScore++;
        } else if (matchWinner === 'guest') {
          completedMatches++;
          guestScore++;
        }
      }
    });

    console.log('📊 Score Calculation:', { 
      homeScore, 
      guestScore, 
      completedMatches, 
      expectedTotal,
      actualEntriesInDB: results.length,
      season: matchSeason
    });

    return { home: homeScore, guest: guestScore, completed: completedMatches, total: expectedTotal };
  };

  const getMatchStatus = (match) => {
    const score = matchScores[match.id];
    const now = new Date();
    const matchDate = new Date(match.date);
    const hoursSinceMatch = (now - matchDate) / (1000 * 60 * 60);

    // Kein Ergebnis eingetragen
    if (!score || score.completed === 0) {
      // Spiel liegt mehr als 24 Stunden zurück ohne Ergebnis
      if (hoursSinceMatch > 24) {
        return 'finished-no-result';
      }
      // Spiel ist heute oder hat vor kurzem begonnen (bis 12 Stunden nach Start)
      // → LIVE/In Progress
      if (hoursSinceMatch >= -2 && hoursSinceMatch <= 12) {
        return 'live';
      }
      // Ansonsten: noch geplant (zukünftig)
      return 'upcoming';
    }

    // Teilweise Ergebnisse vorhanden (1-5 von 6 Matches)
    if (score.completed < score.total) {
      return 'in-progress';
    }

    // Alle 6 Matches abgeschlossen
    return 'completed';
  };

  const { display } = getCurrentSeason();

  console.log('🎨 Rendering Results, loading:', loading, 'matches:', matches.length);

  if (loading) {
    return (
      <div className="dashboard container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Ergebnisse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container">
      {/* Header - Moderner Dashboard-Stil */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          Spielergebnisse 🏆
        </h1>
        
        {/* Season Info prominent */}
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280',
          fontWeight: '600',
          marginTop: '0.5rem',
          marginBottom: '1rem'
        }}>
          Saison: {display}
        </div>
        
        {/* View-Mode Toggle - Moderne Tab-Buttons */}
        <div className="view-mode-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'mannschaft' ? 'active' : ''}`}
            onClick={() => setViewMode('mannschaft')}
          >
            <span style={{ fontSize: '1.2rem' }}>👥</span>
            <span>Mannschaft</span>
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'spieler' ? 'active' : ''}`}
            onClick={() => setViewMode('spieler')}
          >
            <span style={{ fontSize: '1.2rem' }}>🎾</span>
            <span>Spieler</span>
          </button>
        </div>
      </div>

      {/* Results Container */}
      {viewMode === 'mannschaft' ? (
        /* Mannschafts-Ansicht Card */
        (() => {
          // Filter Matches basierend auf selectedTeamId
          const filteredMatches = matches.filter(match => {
            // Wenn kein Team ausgewählt → zeige alle Matches
            if (!selectedTeamId) {
              return true;
            }
            
            // Wenn Team ausgewählt:
            // - Match MIT teamInfo: Prüfe ob ID übereinstimmt
            // - Match OHNE teamInfo: Zeige trotzdem an (alte Daten)
            if (match.teamInfo) {
              return match.teamInfo.id === selectedTeamId;
            }
            
            // Matches ohne teamInfo immer anzeigen (Fallback)
            return true;
          });
          
          console.log('🔍 Filter Debug:', {
            totalMatches: matches.length,
            selectedTeamId: selectedTeamId,
            filteredMatches: filteredMatches.length,
            matchesWithTeamInfo: matches.filter(m => m.teamInfo).length,
            matchTeamIds: matches.map(m => m.teamInfo?.id).filter(Boolean)
          });
          
          return (
            <div className="fade-in lk-card-full">
              <div className="formkurve-header">
                <div className="formkurve-title">Alle Spiele</div>
                <div className="match-count-badge">
                  {filteredMatches.length} {filteredMatches.length === 1 ? 'Spiel' : 'Spiele'}
                </div>
              </div>
              
              {/* Team-Selector - nur in Mannschafts-Ansicht und nur wenn > 1 Team */}
              {playerTeams.length > 1 && (
                <div style={{ padding: '1rem 1rem 0 1rem' }}>
                  <div className="team-selector-modern">
                    <label className="team-selector-label">Team filtern:</label>
                    <select 
                      className="team-selector-dropdown"
                      value={selectedTeamId || ''}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {playerTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.club_name} - {team.team_name} ({team.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <div className="season-content">
              {filteredMatches.length === 0 ? (
                <div className="no-results">
                  <div style={{ fontSize: '3rem' }}>🎾</div>
                  <h3>Keine Spiele gefunden</h3>
                  <p>Für die aktuelle Saison {display} {selectedTeamId && playerTeams.length > 1 ? 'und das gewählte Team' : ''} sind noch keine Spiele geplant.</p>
                </div>
              ) : (
                <div className="season-matches">
                  {filteredMatches.map((match) => {
              const score = matchScores[match.id];
              const status = getMatchStatus(match);
              
              // Prüfe ob das Medenspiel komplett abgeschlossen ist (alle 6 bzw. 9 Spiele)
              const expectedTotal = match.season === 'summer' ? 9 : 6;
              const isMedenspieleCompleted = score && score.completed >= expectedTotal;
              
              // Outcome basierend auf Medenspiel-Status
              let outcome, outcomeLabel;
              
              if (!score || score.completed === 0) {
                // Keine Ergebnisse
                outcome = status === 'live' ? 'live' : 'upcoming';
                outcomeLabel = '';
              } else if (isMedenspieleCompleted) {
                // ALLE Spiele abgeschlossen → Finaler Sieger
                if (score.home > score.guest) {
                  outcome = 'win';
                  outcomeLabel = '🏆 Sieg';
                } else if (score.home < score.guest) {
                  outcome = 'loss';
                  outcomeLabel = '🏆 Niederlage';
                } else {
                  outcome = 'draw';
                  outcomeLabel = '🏆 Remis';
                }
              } else {
                // Spiel läuft noch (1-5 Spiele bei Winter, 1-8 bei Sommer)
                if (score.home > score.guest) {
                  outcome = 'leading';
                  outcomeLabel = '🏠 Heim führt';
                } else if (score.home < score.guest) {
                  outcome = 'trailing';
                  outcomeLabel = '✈️ Gast führt';
                } else {
                  outcome = 'tied';
                  outcomeLabel = '⚖️ Unentschieden';
                }
              }

              return (
                <div 
                  key={match.id} 
                  className="match-result-card"
                  onClick={() => navigate(`/ergebnisse/${match.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Match Header */}
                  <div className="match-header">
                    <div className="match-info">
                      <span className="match-opponent-name">{match.opponent}</span>
                    </div>
                    <div className="match-status">
                      {/* Status Badge */}
                      <div className={`improvement-badge-top ${
                        status === 'completed' ? 'positive' : 
                        status === 'in-progress' || status === 'live' ? 'neutral' : 
                        'negative'
                      }`} style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                        <span className="badge-value">
                          {status === 'completed' ? '✅' : 
                           status === 'in-progress' || status === 'live' ? '⏳' : 
                           status === 'upcoming' ? '📅' : 
                           '❓'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Info Compact */}
                  <div className="results-match-compact">
                    {/* Datum + Zeit Row */}
                    <div className="results-match-row">
                      <span className="results-info-label">
                        📅 {match.date.toLocaleDateString('de-DE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </span>
                      <span className="results-info-value">
                        {match.date.toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} Uhr
                      </span>
                    </div>

                    {/* Score Compact - Reihenfolge basierend auf Home/Away */}
                    {score && score.completed > 0 ? (
                      <div className="results-score-compact">
                        {match.location === 'Home' ? (
                          <>
                            <span className={`score-digit ${score.home > score.guest ? 'winner' : ''}`}>
                              {score.home}
                            </span>
                            <span className="score-sep">:</span>
                            <span className={`score-digit ${score.guest > score.home ? 'winner' : ''}`}>
                              {score.guest}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`score-digit ${score.guest > score.home ? 'winner' : ''}`}>
                              {score.guest}
                            </span>
                            <span className="score-sep">:</span>
                            <span className={`score-digit ${score.home > score.guest ? 'winner' : ''}`}>
                              {score.home}
                            </span>
                          </>
                        )}
                        {score.completed < score.total && (
                          <span className="score-progress">({score.completed}/{score.total})</span>
                        )}
                      </div>
                    ) : (
                      <div className="results-score-compact">
                        <span className="score-digit">-</span>
                        <span className="score-sep">:</span>
                        <span className="score-digit">-</span>
                      </div>
                    )}

                    {/* Outcome Badge */}
                    {isMedenspieleCompleted && (
                      <div className={`outcome-badge ${outcome}`}>
                        {outcome === 'win' && '🏆 Sieg'}
                        {outcome === 'loss' && '😢 Niederlage'}
                        {outcome === 'draw' && '🤝 Remis'}
                      </div>
                    )}
                    {!isMedenspieleCompleted && score && score.completed > 0 && (
                      <div className="outcome-badge in-progress">
                        {outcomeLabel}
                      </div>
                    )}
                  </div>

                  {/* Details Link */}
                  <div className="results-match-footer">
                    <span className="view-details-link">
                      Details ansehen <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              );
                  })}
                </div>
              )}
              </div>
            </div>
          );
        })()
      ) : (
        // SPIELER-ANSICHT
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Spieler-Ergebnisse</div>
            <div className="match-count-badge">
              {Object.values(playerResults).length} {Object.values(playerResults).length === 1 ? 'Spieler' : 'Spieler'}
            </div>
          </div>
          
          <div className="season-content">
          {Object.values(playerResults).length === 0 ? (
            <div className="no-results">
              <div style={{ fontSize: '3rem' }}>🎾</div>
              <h3>Keine Spieler-Ergebnisse</h3>
              <p>Es sind noch keine Ergebnisse für einzelne Spieler vorhanden.</p>
            </div>
          ) : (
            <div className="season-matches">
                {Object.values(playerResults)
                  .sort((a, b) => {
                    const lkA = a.player.current_lk || a.player.season_start_lk || a.player.ranking || 'LK 99';
                    const lkB = b.player.current_lk || b.player.season_start_lk || b.player.ranking || 'LK 99';
                    const numA = parseFloat(lkA.replace('LK ', '').trim()) || 99;
                    const numB = parseFloat(lkB.replace('LK ', '').trim()) || 99;
                    return numA - numB;
                  })
                  .map(({ player, matches: playerMatches }) => {
                    const wins = playerMatches.filter(m => {
                      const winner = m.winner || calculateMatchWinner(m);
                      return winner === 'home';
                    }).length;
                    
                    const losses = playerMatches.filter(m => {
                      const winner = m.winner || calculateMatchWinner(m);
                      return winner === 'guest';
                    }).length;

                    return (
                      <div key={player.id} id={`player-${player.id}`} className="player-section">
                        <div className="player-summary-card">
                          <div className="player-avatar-compact">
                            <img src={player.profile_image || '/app-icon.jpg'} alt={player.name} />
                          </div>
                          <div className="player-info-compact">
                            <h3 className="player-name-compact">{player.name}</h3>
                            <span className="player-lk-badge">
                              {player.current_lk || player.season_start_lk || player.ranking || 'LK ?'}
                            </span>
                            <div className="player-stats-compact">
                              <span className="stat-badge wins">✅ {wins} {wins === 1 ? 'Sieg' : 'Siege'}</span>
                              <span className="stat-badge losses">❌ {losses} {losses === 1 ? 'Niederlage' : 'Niederlagen'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="player-matches">
                          {playerMatches.map((result, idx) => {
                            const matchWinner = result.winner || calculateMatchWinner(result);
                            const isWinner = matchWinner === 'home';
                            const setsCount = (result.set3_home > 0 || result.set3_guest > 0) ? 3 : 2;
                            const opponentFaces = ['/face1.jpg', '/face1.png', '/face2.jpg', '/face3.jpg', '/face4.jpg', '/face5.jpg'];

                            return (
                              <article key={idx} className="ms-card">
                                <header className="ms-head">
                                  <h2 className="ms-title">
                                    {result.match_type === 'Einzel' ? '👤 Einzel' : '👥 Doppel'} vs. {result.opponent}
                                  </h2>
                                </header>
                                <hr className="ms-divider" />
                                <section className="ms-rows">
                                  {/* Home Team - EINE BOX */}
                                  <div className={`ms-team-group ${isWinner ? 'winner-row' : 'loser-row'}`}>
                                    {/* Spieler 1 mit Sätzen */}
                                    <div className="ms-row" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                      <div className="ms-avatar">
                                        <img src={player.profile_image || '/app-icon.jpg'} alt={player.name} />
                                      </div>
                                      <div className="ms-left">
                                        <span className="ms-name">{player.name}</span>
                                        <span className="ms-meta">
                                          {player.current_lk || player.season_start_lk || player.ranking || ''}
                                        </span>
                                        {isWinner && <span className="ms-check">✓</span>}
                                      </div>
                                      {result.set1_home !== null && <span className="ms-set">{result.set1_home}</span>}
                                      {result.set2_home !== null && <span className="ms-set">{result.set2_home}</span>}
                                      {(result.set3_home > 0 || result.set3_guest > 0) && (
                                        <span className="ms-set tb">{result.set3_home}</span>
                                      )}
                                    </div>
                                    {/* Spieler 2 (Partner) ohne Sätze - nur bei Doppel */}
                                    {result.match_type === 'Doppel' && result.partnerName && (
                                      <div className="ms-row secondary" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                        <div className="ms-avatar">
                                          <img src="/app-icon.jpg" alt={result.partnerName} />
                                        </div>
                                        <div className="ms-left">
                                          <span className="ms-name">{result.partnerName}</span>
                                          {result.partnerLK && (
                                            <span className="ms-meta">{result.partnerLK}</span>
                                          )}
                                        </div>
                                        {result.set1_home !== null && <span className="ms-set empty"></span>}
                                        {result.set2_home !== null && <span className="ms-set empty"></span>}
                                        {(result.set3_home > 0 || result.set3_guest > 0) && (
                                          <span className="ms-set empty"></span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Guest Team - EINE BOX */}
                                  <div className={`ms-team-group opponent ${!isWinner && matchWinner === 'guest' ? 'winner-row' : 'loser-row'}`}>
                                    {result.match_type === 'Einzel' ? (
                                      <div className="ms-row" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                        <div className="ms-avatar opponent">
                                          <img src={opponentFaces[idx % opponentFaces.length]} alt="Opponent" />
                                        </div>
                                        <div className="ms-left">
                                          <span className="ms-name">{result.opponentPlayerName}</span>
                                          {result.opponentPlayerLK && (
                                            <span className="ms-meta">LK {result.opponentPlayerLK}</span>
                                          )}
                                          {!isWinner && matchWinner === 'guest' && <span className="ms-check">✓</span>}
                                        </div>
                                        {result.set1_guest !== null && <span className="ms-set">{result.set1_guest}</span>}
                                        {result.set2_guest !== null && <span className="ms-set">{result.set2_guest}</span>}
                                        {(result.set3_home > 0 || result.set3_guest > 0) && (
                                          <span className="ms-set tb">{result.set3_guest}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        {/* Gegner 1 mit Sätzen */}
                                        <div className="ms-row" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                          <div className="ms-avatar opponent">
                                            <img src={opponentFaces[idx % opponentFaces.length]} alt="Opponent" />
                                          </div>
                                          <div className="ms-left">
                                            <span className="ms-name">{result.opponent1Name || 'Unbekannt'}</span>
                                            {result.opponent1LK && (
                                              <span className="ms-meta">LK {result.opponent1LK}</span>
                                            )}
                                            {!isWinner && matchWinner === 'guest' && <span className="ms-check">✓</span>}
                                          </div>
                                          {result.set1_guest !== null && <span className="ms-set">{result.set1_guest}</span>}
                                          {result.set2_guest !== null && <span className="ms-set">{result.set2_guest}</span>}
                                          {(result.set3_home > 0 || result.set3_guest > 0) && (
                                            <span className="ms-set tb">{result.set3_guest}</span>
                                          )}
                                        </div>
                                        {/* Gegner 2 ohne Sätze */}
                                        <div className="ms-row secondary" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                          <div className="ms-avatar opponent">
                                            <img src={opponentFaces[(idx + 1) % opponentFaces.length]} alt="Opponent 2" />
                                          </div>
                                          <div className="ms-left">
                                            <span className="ms-name">{result.opponent2Name || 'Unbekannt'}</span>
                                            {result.opponent2LK && (
                                              <span className="ms-meta">LK {result.opponent2LK}</span>
                                            )}
                                          </div>
                                          {result.set1_guest !== null && <span className="ms-set empty"></span>}
                                          {result.set2_guest !== null && <span className="ms-set empty"></span>}
                                          {(result.set3_home > 0 || result.set3_guest > 0) && (
                                            <span className="ms-set empty"></span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </section>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;

