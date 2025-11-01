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
  const [loadingPlayerResults, setLoadingPlayerResults] = useState(false);
  
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
  
  // Lade Spieler-Ergebnisse beim Wechsel zur Spieler-Ansicht
  useEffect(() => {
    if (viewMode === 'spieler' && !loading && matches.length > 0 && players.length > 0 && Object.keys(playerResults).length === 0) {
      console.log('🔄 Loading player results for Spieler view...');
      loadPlayerResults(matches);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, loading]);

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
          .eq('matchday_id', match.id);

        console.log(`  ✅ Results for match ${index + 1}:`, {
          count: resultsData?.length || 0,
          hasError: !!resultsError,
          data: resultsData
        });

        return {
          matchId: match.id,
          score: (!resultsError && resultsData) ? calculateMatchScore(resultsData, match.season, match.location) : null
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
      
    } catch (error) {
      console.error('❌ FATAL ERROR in loadMatchesAndResults:', error);
    } finally {
      setLoading(false);
      console.log('✅ Loading set to FALSE - DONE!');
      
      // Lade Spieler-Ergebnisse IM HINTERGRUND (nicht blockierend)
      // Wird später durch useEffect geladen wenn zu Spieler-Ansicht gewechselt wird
    }
  };

  const loadPlayerResults = async (seasonMatches) => {
    try {
      setLoadingPlayerResults(true);
      if (!players || players.length === 0) return;

      // 🔧 SIMPLE APPROACH: Lade alle Spieler aus den eigenen Mannschaften
      const playerTeamIds = playerTeams.map(team => team.id);
      
      console.log('🔍 Loading team players for teams:', playerTeamIds);

      // Lade alle Spieler aus den eigenen Teams
      const { data: teamPlayers, error: playerTeamsError } = await supabase
        .from('team_memberships')
        .select(`
          players_unified!team_memberships_player_id_fkey(
            id, 
            name, 
            email, 
            current_lk, 
            season_start_lk, 
            ranking,
            player_type
          )
        `)
        .in('team_id', playerTeamIds)
        .eq('is_active', true)
        .eq('players_unified.player_type', 'app_user'); // Nur App-User

      if (playerTeamsError) {
        console.error('Error loading team players:', playerTeamsError);
        return;
      }

      // Extrahiere eindeutige Spieler
      const uniquePlayers = teamPlayers
        .map(pt => pt.players_unified)
        .filter((player, index, self) => 
          index === self.findIndex(p => p.id === player.id)
        );

      console.log('🔍 Team Players Found:', {
        totalPlayers: uniquePlayers.length,
        playerNames: uniquePlayers.map(p => p.name),
        playerTeamIds: playerTeamIds
      });

      if (uniquePlayers.length === 0) {
        console.warn('⚠️ No team players found for player results');
        return;
      }

      // 🚀 PERFORMANCE: Lade ALLE match_results für ALLE Matches auf einmal
      const matchIds = seasonMatches.map(m => m.id);
      console.log('🔍 Batch-loading match_results for', matchIds.length, 'matchdays...');
      
      const { data: allResultsData, error: allResultsError } = await supabase
        .from('match_results')
        .select('*')
        .in('matchday_id', matchIds);
      
      if (allResultsError) {
        console.error('Error loading all match results:', allResultsError);
        setPlayerResults({});
        return;
      }
      
      console.log('✅ Loaded', allResultsData?.length || 0, 'total match_results');
      
      // 🚀 PERFORMANCE: Sammle alle Player-IDs und lade in einem Batch
      const allPlayerIds = new Set();
      (allResultsData || []).forEach(r => {
        if (r.home_player_id) allPlayerIds.add(r.home_player_id);
        if (r.home_player1_id) allPlayerIds.add(r.home_player1_id);
        if (r.home_player2_id) allPlayerIds.add(r.home_player2_id);
        if (r.guest_player_id) allPlayerIds.add(r.guest_player_id);
        if (r.guest_player1_id) allPlayerIds.add(r.guest_player1_id);
        if (r.guest_player2_id) allPlayerIds.add(r.guest_player2_id);
      });
      
      console.log('🔍 Batch-loading player data for', allPlayerIds.size, 'unique players...');
      
      const { data: allPlayersData, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, season_start_lk, ranking, player_type, profile_image')
        .in('id', Array.from(allPlayerIds));
      
      if (playersError) {
        console.error('Error loading players:', playersError);
      }
      
      // Erstelle schnelle Lookup-Map
      const playerDataMap = {};
      (allPlayersData || []).forEach(p => {
        playerDataMap[p.id] = p;
      });
      
      console.log('✅ Loaded player data for', Object.keys(playerDataMap).length, 'players');
      
      // Erstelle Player-Results mit Match-Ergebnissen
      const playerResultsMap = {};
      
      for (const player of uniquePlayers) {
        console.log(`🔍 Processing matches for player: ${player.name}`);
        const playerMatches = [];

        // Filtere Match-Ergebnisse für diesen Spieler (KEIN AWAIT mehr!)
        for (const match of seasonMatches) {
          const resultsData = (allResultsData || []).filter(r => 
            r.matchday_id === match.id &&
            (r.home_player_id === player.id || r.home_player1_id === player.id || r.home_player2_id === player.id ||
             r.guest_player_id === player.id || r.guest_player1_id === player.id || r.guest_player2_id === player.id)
          );

          if (resultsData && resultsData.length > 0) {
            console.log(`  📊 Found ${resultsData.length} matches for ${player.name} in ${match.opponent}`);
            
            for (const result of resultsData) {
              // BESTIMME: Ist unser Spieler im Home- oder Guest-Team?
              const isPlayerInHomeTeam = result.home_player_id === player.id || 
                                         result.home_player1_id === player.id || 
                                         result.home_player2_id === player.id;
              
              // Lade Gegner-Daten
              let opponentName = 'Unbekannt';
              let opponentLK = null;
              let partnerName = null;
              let partnerLK = null;
              let opponent1Name = 'Unbekannt';
              let opponent1LK = null;
              let opponent2Name = 'Unbekannt';
              let opponent2LK = null;

              if (result.match_type === 'Einzel') {
                // Lookup Gegner aus Map (KEIN AWAIT!)
                const opponentId = isPlayerInHomeTeam ? result.guest_player_id : result.home_player_id;
                const oppData = opponentId ? playerDataMap[opponentId] : null;
                
                if (oppData) {
                  opponentName = oppData.name;
                  opponentLK = oppData.current_lk;
                } else {
                  opponentName = 'Unbekannt';
                  opponentLK = 'LK ?';
                }
              } else if (result.match_type === 'Doppel') {
                // Lookup Gegner aus Map (KEIN AWAIT!)
                const opp1Id = isPlayerInHomeTeam ? result.guest_player1_id : result.home_player1_id;
                const opp2Id = isPlayerInHomeTeam ? result.guest_player2_id : result.home_player2_id;
                
                const opp1Data = opp1Id ? playerDataMap[opp1Id] : null;
                const opp2Data = opp2Id ? playerDataMap[opp2Id] : null;
                
                opponent1Name = opp1Data?.name || 'Unbekannt';
                opponent1LK = opp1Data?.current_lk;
                opponent2Name = opp2Data?.name || 'Unbekannt';
                opponent2LK = opp2Data?.current_lk;
                
                // Lookup Partner aus Map (KEIN AWAIT!)
                const partnerId = isPlayerInHomeTeam
                  ? (result.home_player1_id === player.id ? result.home_player2_id : result.home_player1_id)
                  : (result.guest_player1_id === player.id ? result.guest_player2_id : result.guest_player1_id);
                
                const partnerData = partnerId ? playerDataMap[partnerId] : null;
                
                if (partnerData) {
                  partnerName = partnerData.name;
                  partnerLK = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
                }
                
                // Nutze opponent1Name für Anzeige
                opponentName = opponent1Name;
                opponentLK = opponent1LK;
              }

                        playerMatches.push({
                          ...result,
                          opponent: match.opponent,
                          matchDate: match.date,
                          matchLocation: match.location,
                          opponentPlayerName: opponentName,
                          opponentPlayerLK: opponentLK,
                          opponent1Name,
                          opponent1LK,
                          opponent2Name,
                          opponent2LK,
                          partnerName,
                          partnerLK
                        });
            }
          }
        }

        // Sortiere Matches nach Datum
        const sortedMatches = playerMatches.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

        playerResultsMap[player.id] = {
          player: player,
          matches: sortedMatches
        };
        
        console.log(`  ✅ ${player.name}: ${sortedMatches.length} matches`);
      }

      console.log('🎯 Final playerResultsMap:', {
        totalPlayers: Object.keys(playerResultsMap).length,
        playerNames: Object.values(playerResultsMap).map(p => p.player.name)
      });
      
      setPlayerResults(playerResultsMap);
    } catch (error) {
      console.error('❌ Error loading player results:', error);
    } finally {
      setLoadingPlayerResults(false);
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

  const calculateMatchScore = (results, matchSeason, matchLocation) => {
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
        // KORRIGIERTE MULTI-TEAM LOGIK:
        // winner bezieht sich auf das Heim-Team vs Gast-Team
        // Wir müssen das in "unser Team" vs "Gegner-Team" umwandeln
        if (matchLocation === 'Home') {
          // Wir spielen Heim: home = unser Team, guest = Gegner
          if (result.winner === 'home') homeScore++;
          else if (result.winner === 'guest') guestScore++;
        } else {
          // Wir spielen Auswärts: guest = unser Team, home = Gegner
          if (result.winner === 'guest') homeScore++; // guest = unser Team gewinnt
          else if (result.winner === 'home') guestScore++; // home = Gegner gewinnt
        }
      } else {
        const matchWinner = calculateMatchWinner(result);
        if (matchWinner) {
          completedMatches++;
          // Gleiche Logik für berechnete Winner
          if (matchLocation === 'Home') {
            if (matchWinner === 'home') homeScore++;
            else if (matchWinner === 'guest') guestScore++;
          } else {
            if (matchWinner === 'guest') homeScore++; // guest = unser Team gewinnt
            else if (matchWinner === 'home') guestScore++; // home = Gegner gewinnt
          }
        }
      }
    });

    console.log('📊 Score Calculation:', { 
      homeScore, 
      guestScore, 
      completedMatches, 
      expectedTotal,
      actualEntriesInDB: results.length,
      season: matchSeason,
      location: matchLocation
    });

    return { home: homeScore, guest: guestScore, completed: completedMatches, total: expectedTotal };
  };

  // Neue Funktion: Berechne Score aus Spieler-Perspektive
  const calculatePlayerPerspectiveScore = (rawScore) => {
    if (!rawScore) {
      return {
        playerScore: 0,
        opponentScore: 0,
        completed: 0,
        total: 6
      };
    }
    
    // VEREINFACHT: calculateMatchScore hat bereits die richtige Perspektive berechnet
    // rawScore.home = unser Team, rawScore.guest = Gegner
    return {
      playerScore: rawScore.home,
      opponentScore: rawScore.guest,
      completed: rawScore.completed,
      total: rawScore.total
    };
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
          // Filter Matches basierend auf gewähltem Team (oder alle Teams)
          const filteredMatches = matches.filter(match => {
            if (!match.teamInfo) {
              return false; // Keine Matches ohne teamInfo anzeigen
            }
            
            // Wenn ein spezifisches Team ausgewählt ist: Nur Matches von diesem Team
            if (selectedTeamId) {
              return match.teamInfo.id === selectedTeamId;
            }
            
            // Wenn kein Team ausgewählt: Zeige alle Matches von allen Spieler-Teams
            const playerTeamIds = playerTeams.map(team => team.id);
            return playerTeamIds.includes(match.teamInfo.id);
          });
          
          console.log('🔍 Filter Debug:', {
            totalMatches: matches.length,
            playerTeamIds: playerTeams.map(team => team.id),
            playerTeamNames: playerTeams.map(team => `${team.club_name} - ${team.team_name}`),
            selectedTeamId: selectedTeamId,
            filteredMatches: filteredMatches.length,
            matchesWithTeamInfo: matches.filter(m => m.teamInfo).length,
            matchTeamIds: matches.map(m => m.teamInfo?.id).filter(Boolean),
            filteredMatchOpponents: filteredMatches.map(m => m.opponent)
          });
          
          return (
            <div className="fade-in lk-card-full">
              <div className="formkurve-header">
                <div className="formkurve-title">Alle Spiele</div>
                <div className="match-count-badge">
                  {filteredMatches.length} {filteredMatches.length === 1 ? 'Spiel' : 'Spiele'}
                </div>
              </div>
              
              {/* Spieler-Teams Info */}
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: '#f0f9ff', 
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                margin: '0 1rem',
                fontSize: '0.8rem',
                color: '#0c4a6e'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  👤 {selectedTeamId ? 'Gefilterte Mannschaft:' : 'Deine Mannschaften:'}
                </div>
                {selectedTeamId ? (
                  <div style={{ marginLeft: '1rem' }}>
                    🏢 {playerTeams.find(t => t.id === selectedTeamId)?.club_name} - {playerTeams.find(t => t.id === selectedTeamId)?.team_name} ({playerTeams.find(t => t.id === selectedTeamId)?.category})
                  </div>
                ) : (
                  playerTeams.map(team => (
                    <div key={team.id} style={{ marginLeft: '1rem' }}>
                      🏢 {team.club_name} - {team.team_name} ({team.category})
                    </div>
                  ))
                )}
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
              const rawScore = matchScores[match.id];
              const status = getMatchStatus(match);
              
              // Berechne Score aus Spieler-Perspektive
              const playerScore = calculatePlayerPerspectiveScore(rawScore);
              
              // Prüfe ob das Medenspiel komplett abgeschlossen ist (alle 6 bzw. 9 Spiele)
              const expectedTotal = match.season === 'summer' ? 9 : 6;
              const isMedenspieleCompleted = rawScore && rawScore.completed >= expectedTotal;
              
              // Outcome basierend auf Spieler-Perspektive
              let outcome, outcomeLabel;
              
              if (!rawScore || rawScore.completed === 0) {
                // Keine Ergebnisse
                outcome = status === 'live' ? 'live' : 'upcoming';
                outcomeLabel = '';
              } else if (isMedenspieleCompleted) {
                // ALLE Spiele abgeschlossen → Finaler Sieger aus Spieler-Perspektive
                if (playerScore.playerScore > playerScore.opponentScore) {
                  outcome = 'win';
                  outcomeLabel = '🏆 Sieg';
                } else if (playerScore.playerScore < playerScore.opponentScore) {
                  outcome = 'loss';
                  outcomeLabel = '😢 Niederlage';
                } else {
                  outcome = 'draw';
                  outcomeLabel = '🤝 Remis';
                }
              } else {
                // Spiel läuft noch - aus Spieler-Perspektive
                if (playerScore.playerScore > playerScore.opponentScore) {
                  outcome = 'leading';
                  outcomeLabel = '📈 Wir führen';
                } else if (playerScore.playerScore < playerScore.opponentScore) {
                  outcome = 'trailing';
                  outcomeLabel = '📉 Gegner führt';
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

                    {/* Heim/Auswärts Row */}
                    <div className="results-match-row">
                      <span className="results-info-label">
                        {match.location === 'Home' ? '🏠' : '✈️'}
                      </span>
                      <span className="results-info-value">
                        {match.location === 'Home' ? 'Heimspiel' : 'Auswärtsspiel'}
                      </span>
                    </div>

                    {/* Score Compact - Aus Spieler-Perspektive */}
                    {rawScore && rawScore.completed > 0 ? (
                      <div className="results-score-compact">
                        <span className={`score-digit ${playerScore.playerScore > playerScore.opponentScore ? 'winner' : ''}`}>
                          {playerScore.playerScore}
                        </span>
                        <span className="score-sep">:</span>
                        <span className={`score-digit ${playerScore.opponentScore > playerScore.playerScore ? 'winner' : ''}`}>
                          {playerScore.opponentScore}
                        </span>
                        {rawScore.completed < rawScore.total && (
                          <span className="score-progress">({rawScore.completed}/{rawScore.total})</span>
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
                    {!isMedenspieleCompleted && rawScore && rawScore.completed > 0 && (
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
            <div className="formkurve-title">Spieler-Ergebnisse in der aktuellen Saison ({getCurrentSeason().display})</div>
            <div className="match-count-badge">
              {loadingPlayerResults ? '...' : Object.values(playerResults).length} {Object.values(playerResults).length === 1 ? 'Spieler' : 'Spieler'}
            </div>
          </div>
          
          <div className="season-content">
          {loadingPlayerResults ? (
            <div className="no-results" style={{ padding: '2rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem' }}>Lade Spieler-Ergebnisse...</p>
            </div>
          ) : Object.values(playerResults).length === 0 ? (
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
                    // Unterstütze sowohl Punkt (13.6) als auch Komma (13,6)
                    const numA = parseFloat(lkA.replace('LK ', '').replace(',', '.').trim()) || 99;
                    const numB = parseFloat(lkB.replace('LK ', '').replace(',', '.').trim()) || 99;
                    return numA - numB;
                  })
                  .map(({ player, matches: playerMatches }) => {
                    const wins = playerMatches.filter(m => {
                      const isPlayerInHomeTeam = m.home_player_id === player.id || 
                                                 m.home_player1_id === player.id || 
                                                 m.home_player2_id === player.id;
                      const winner = m.winner || calculateMatchWinner(m);
                      return isPlayerInHomeTeam ? winner === 'home' : winner === 'guest';
                    }).length;
                    
                    const losses = playerMatches.filter(m => {
                      const isPlayerInHomeTeam = m.home_player_id === player.id || 
                                                 m.home_player1_id === player.id || 
                                                 m.home_player2_id === player.id;
                      const winner = m.winner || calculateMatchWinner(m);
                      return isPlayerInHomeTeam ? winner === 'guest' : winner === 'home';
                    }).length;
                    
                    const totalMatches = playerMatches.length;

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
                              <span className="stat-badge total" style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                              }}>
                                🎾 {totalMatches} {totalMatches === 1 ? 'Einsatz' : 'Einsätze'}
                              </span>
                              <span className="stat-badge wins" style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                              }}>
                                ✅ {wins} {wins === 1 ? 'Sieg' : 'Siege'}
                              </span>
                              <span className="stat-badge losses" style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                              }}>
                                ❌ {losses} {losses === 1 ? 'Niederlage' : 'Niederlagen'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="player-matches">
                          {playerMatches.map((result, idx) => {
                            const matchWinner = result.winner || calculateMatchWinner(result);
                            
                            // BESTIMME: Ist unser Spieler im Home- oder Guest-Team?
                            const isPlayerInHomeTeam = result.home_player_id === player.id || 
                                                       result.home_player1_id === player.id || 
                                                       result.home_player2_id === player.id;
                            
                            // Bestimme ob Spieler gewonnen hat
                            const isWinner = isPlayerInHomeTeam 
                              ? matchWinner === 'home' 
                              : matchWinner === 'guest';
                            
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
                                  {/* Home Team - unser Spieler (immer erste Box) */}
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
                                      {isPlayerInHomeTeam ? (
                                        <>
                                          {result.set1_home !== null && <span className="ms-set">{result.set1_home}</span>}
                                          {result.set2_home !== null && <span className="ms-set">{result.set2_home}</span>}
                                          {(result.set3_home > 0 || result.set3_guest > 0) && (
                                            <span className="ms-set tb">{result.set3_home}</span>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {result.set1_guest !== null && <span className="ms-set">{result.set1_guest}</span>}
                                          {result.set2_guest !== null && <span className="ms-set">{result.set2_guest}</span>}
                                          {(result.set3_home > 0 || result.set3_guest > 0) && (
                                            <span className="ms-set tb">{result.set3_guest}</span>
                                          )}
                                        </>
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
                                  <div className={`ms-team-group opponent ${!isWinner ? 'winner-row' : 'loser-row'}`}>
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
                                          {((!isPlayerInHomeTeam && isWinner) || (isPlayerInHomeTeam && !isWinner)) && <span className="ms-check">✓</span>}
                                        </div>
                                        {!isPlayerInHomeTeam ? (
                                          <>
                                            {result.set1_home !== null && <span className="ms-set">{result.set1_home}</span>}
                                            {result.set2_home !== null && <span className="ms-set">{result.set2_home}</span>}
                                            {(result.set3_home > 0 || result.set3_guest > 0) && (
                                              <span className="ms-set tb">{result.set3_home}</span>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            {result.set1_guest !== null && <span className="ms-set">{result.set1_guest}</span>}
                                            {result.set2_guest !== null && <span className="ms-set">{result.set2_guest}</span>}
                                            {(result.set3_home > 0 || result.set3_guest > 0) && (
                                              <span className="ms-set tb">{result.set3_guest}</span>
                                            )}
                                          </>
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
                                            {((!isPlayerInHomeTeam && isWinner) || (isPlayerInHomeTeam && !isWinner)) && <span className="ms-check">✓</span>}
                                          </div>
                                          {!isPlayerInHomeTeam ? (
                                            <>
                                              {result.set1_home !== null && <span className="ms-set">{result.set1_home}</span>}
                                              {result.set2_home !== null && <span className="ms-set">{result.set2_home}</span>}
                                              {(result.set3_home > 0 || result.set3_guest > 0) && (
                                                <span className="ms-set tb">{result.set3_home}</span>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              {result.set1_guest !== null && <span className="ms-set">{result.set1_guest}</span>}
                                              {result.set2_guest !== null && <span className="ms-set">{result.set2_guest}</span>}
                                              {(result.set3_home > 0 || result.set3_guest > 0) && (
                                                <span className="ms-set tb">{result.set3_guest}</span>
                                              )}
                                            </>
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
                                          <span className="ms-set empty"></span>
                                          <span className="ms-set empty"></span>
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

