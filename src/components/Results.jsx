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
  
  // ✅ NEU: Vereins-Übersicht State
  const [clubOverview, setClubOverview] = useState(null);
  const [allClubTeams, setAllClubTeams] = useState([]);
  const [selectedClubTeamId, setSelectedClubTeamId] = useState(null);
  const [showClubOverview, setShowClubOverview] = useState(true);
  
  // ✅ NEU: Globale Suche (Phase 2)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  
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
  
  // ✅ NEU: Lade Matches wenn externes Team ausgewählt wird
  useEffect(() => {
    if (selectedClubTeamId && !playerTeams.some(pt => pt.id === selectedClubTeamId)) {
      // Team ist nicht in meinen Teams → lade separat
      loadMatchesForTeam(selectedClubTeamId);
    }
  }, [selectedClubTeamId, playerTeams]);
  
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

  // ✅ NEU: Lade Matches für ein beliebiges Team (auch ohne Membership)
  const [externalTeamMatches, setExternalTeamMatches] = useState({});
  
  // ✅ NEU: Globale Suche
  const performGlobalSearch = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults(null);
      return;
    }
    
    try {
      console.log('🔍 Global search for:', term);
      
      // Suche nach Vereinen
      const { data: clubs, error: clubError } = await supabase
        .from('club_info')
        .select('id, name, city')
        .ilike('name', `%${term}%`)
        .limit(5);
      
      if (clubError) throw clubError;
      
      // Suche nach Teams
      const { data: teams, error: teamError } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .or(`team_name.ilike.%${term}%,club_name.ilike.%${term}%,category.ilike.%${term}%`)
        .limit(10);
      
      if (teamError) throw teamError;
      
      // Suche nach Spielern
      const { data: playersList, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk')
        .ilike('name', `%${term}%`)
        .eq('status', 'active')
        .limit(10);
      
      if (playersError) throw playersError;
      
      setSearchResults({
        clubs: clubs || [],
        teams: teams || [],
        players: playersList || []
      });
      
      console.log('✅ Search results:', {
        clubs: clubs?.length || 0,
        teams: teams?.length || 0,
        players: playersList?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Error performing global search:', error);
      setSearchResults(null);
    }
  };
  
  // ✅ Debounce für Suche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        performGlobalSearch(searchTerm);
      } else {
        setSearchResults(null);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const loadMatchesForTeam = async (teamId) => {
    try {
      console.log('📥 Loading matches for external team:', teamId);
      
      // ✅ OHNE Season-Filter (alle Matches laden)
      const { data, error } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          start_time,
          home_team_id,
          away_team_id,
          venue,
          season,
          status,
          home_score,
          away_score
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading external team matches:', error);
        throw error;
      }
      
      console.log('✅ Raw external matches loaded:', data?.length || 0, data);
      
      // Transformiere wie DataContext
      const transformedMatches = (data || []).map(m => {
        const isHome = m.home_team_id === teamId;
        return {
          id: m.id,
          date: new Date(m.match_date),
          opponent: isHome ? 'Away Team' : 'Home Team', // Wird später aufgelöst
          location: isHome ? 'Home' : 'Away',
          venue: m.venue,
          season: m.season,
          home_score: m.home_score,
          away_score: m.away_score,
          teamId: teamId,
          teamInfo: { id: teamId } // Für Filterung
        };
      });
      
      setExternalTeamMatches(prev => ({
        ...prev,
        [teamId]: transformedMatches
      }));
      
      console.log('✅ External team matches transformed:', transformedMatches.length);
      
    } catch (error) {
      console.error('❌ Error loading external team matches:', error);
    }
  };
  
  // ✅ NEU: Lade Vereins-Übersicht
  const loadClubOverview = async () => {
    if (!playerTeams || playerTeams.length === 0) {
      console.log('⚠️ No playerTeams available for club overview');
      return;
    }
    
    try {
      // Hole Primary Team (Haupt-Verein)
      const primaryTeam = playerTeams.find(t => t.is_primary) || playerTeams[0];
      const clubName = primaryTeam.club_name;
      
      console.log('🏢 Loading club overview for:', clubName);
      console.log('🏢 Primary team:', primaryTeam);
      
      // Lade ALLE Teams dieses Vereins
      const { data: clubTeams, error: teamsError } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .eq('club_name', clubName)
        .order('category', { ascending: true });
      
      if (teamsError) {
        console.error('❌ Error loading club teams:', teamsError);
        throw teamsError;
      }
      
      console.log('✅ Club teams loaded:', clubTeams?.length || 0, clubTeams);
      setAllClubTeams(clubTeams || []);
      
      // Lade Matches für ALLE Teams dieses Vereins
      const teamIds = (clubTeams || []).map(t => t.id);
      
      if (teamIds.length === 0) {
        console.warn('⚠️ No team IDs found for club');
        setClubOverview({
          clubName,
          totalTeams: 0,
          totalMatches: 0,
          totalPlayed: 0,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0
        });
        return;
      }
      
      console.log('🔍 Loading matches for team IDs:', teamIds);
      
      // ✅ OHNE Season-Filter (alle Matches laden)
      const { data: clubMatches, error: matchesError } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          season,
          status
        `)
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`);
      
      if (matchesError) {
        console.error('❌ Error loading club matches:', matchesError);
        throw matchesError;
      }
      
      console.log('✅ Club matches loaded:', clubMatches?.length || 0, clubMatches);
      
      // ✅ NEU: Lade match_results für alle Matches und aggregiere Scores
      const matchIds = (clubMatches || []).map(m => m.id);
      
      const { data: allMatchResults, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .in('matchday_id', matchIds);
      
      if (resultsError) {
        console.error('❌ Error loading match results:', resultsError);
      }
      
      console.log('✅ Match results loaded:', allMatchResults?.length || 0, allMatchResults);
      
      // Aggregiere Scores pro Match
      const matchScoresMap = {};
      (allMatchResults || []).forEach(result => {
        if (!matchScoresMap[result.matchday_id]) {
          matchScoresMap[result.matchday_id] = { home: 0, away: 0, completed: 0 };
        }
        
        // Zähle Winner
        if (result.winner === 'home') {
          matchScoresMap[result.matchday_id].home++;
          console.log(`  ✅ Home win for match ${result.matchday_id}`);
        } else if (result.winner === 'away') {
          matchScoresMap[result.matchday_id].away++;
          console.log(`  ✅ Away win for match ${result.matchday_id}`);
        }
        
        // ✅ Zähle ALLE Ergebnisse mit winner (nicht nur is_completed)
        if (result.winner) {
          matchScoresMap[result.matchday_id].completed++;
        } else {
          console.log(`  ⚠️ Result without winner:`, result);
        }
      });
      
      console.log('📊 Aggregated scores:', matchScoresMap);
      
      // Berechne Gesamt-Bilanz für Verein
      let totalWins = 0;
      let totalLosses = 0;
      let totalDraws = 0;
      let totalPlayed = 0;
      
      (clubMatches || []).forEach(match => {
        const scores = matchScoresMap[match.id];
        
        console.log(`🔍 Match ${match.id}:`, {
          hasScores: !!scores,
          scores,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          isVKCHome: teamIds.includes(match.home_team_id),
          isVKCAway: teamIds.includes(match.away_team_id)
        });
        
        // Prüfe ob Match echte Ergebnisse hat
        if (scores && scores.completed > 0) {
          const isHomeTeam = teamIds.includes(match.home_team_id);
          const ourScore = isHomeTeam ? scores.home : scores.away;
          const oppScore = isHomeTeam ? scores.away : scores.home;
          
          console.log(`  ✅ Match hat Ergebnisse:`, {
            isHomeTeam,
            ourScore,
            oppScore,
            completed: scores.completed
          });
          
          // Nur zählen wenn mindestens ein Punkt erzielt wurde
          if (ourScore > 0 || oppScore > 0) {
            totalPlayed++;
            
            if (ourScore > oppScore) {
              totalWins++;
              console.log(`    🎉 SIEG! ${ourScore}:${oppScore}`);
            } else if (ourScore < oppScore) {
              totalLosses++;
              console.log(`    😞 NIEDERLAGE ${ourScore}:${oppScore}`);
            } else {
              totalDraws++;
              console.log(`    🤝 REMIS ${ourScore}:${oppScore}`);
            }
          } else {
            console.log(`    ⚠️ Beide Scores sind 0, wird nicht gezählt`);
          }
        } else {
          console.log(`  ⚠️ Keine Ergebnisse für dieses Match`);
        }
      });
      
      console.log('📊 Club stats calculated:', {
        totalPlayed,
        totalWins,
        totalLosses,
        totalDraws
      });
      
      setClubOverview({
        clubName,
        totalTeams: clubTeams.length,
        totalMatches: (clubMatches || []).length,
        totalPlayed,
        totalWins,
        totalLosses,
        totalDraws
      });
      
      console.log('✅ Club overview loaded:', {
        clubName,
        teams: clubTeams.length,
        matches: clubMatches?.length || 0,
        record: `${totalWins}/${totalLosses}/${totalDraws}`
      });
      
    } catch (error) {
      console.error('❌ Error loading club overview:', error);
    }
  };

  const loadMatchesAndResults = async () => {
    console.log('🟢 loadMatchesAndResults STARTED');
    console.log('🟢 Using matches from DataContext:', dataContextMatches.length);
    
    try {
      setLoading(true);
      console.log('⏳ Loading set to TRUE');
      
      // ✅ Lade Vereins-Übersicht
      await loadClubOverview();
      
      // ✅ Setze Primary Team als initial ausgewählt (falls nicht bereits gesetzt)
      if (!selectedClubTeamId && !selectedTeamId && playerTeams.length > 0) {
        const primaryTeam = playerTeams.find(t => t.is_primary) || playerTeams[0];
        setSelectedClubTeamId(primaryTeam.id);
        setSelectedTeamId(primaryTeam.id);
        console.log('✅ Primary team set as selected:', primaryTeam);
      }
      
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
          score: (!resultsError && resultsData) ? calculateMatchScore(resultsData, match.season, match.home_team_id, match.away_team_id) : null
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

      // Lade alle Spieler aus den eigenen Teams (MIT profile_image!)
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
            player_type,
            profile_image
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
      
      // Erstelle schnelle Lookup-Map (Gegner aus match_results)
      const playerDataMap = {};
      (allPlayersData || []).forEach(p => {
        playerDataMap[p.id] = p;
      });
      
      // 🔧 FIX: Füge auch eigene Team-Spieler zur Map hinzu (für profile_image!)
      uniquePlayers.forEach(p => {
        if (p && p.id && !playerDataMap[p.id]) {
          playerDataMap[p.id] = p;
        }
      });
      
      console.log('✅ Loaded player data for', Object.keys(playerDataMap).length, 'players (incl. team players)');
      
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

        // 🔧 FIX: Nutze vollständige Player-Daten aus playerDataMap (inkl. profile_image!)
        const fullPlayerData = playerDataMap[player.id] || player;

        playerResultsMap[player.id] = {
          player: fullPlayerData,  // ✅ Jetzt mit profile_image!
          matches: sortedMatches
        };
        
        console.log(`  ✅ ${player.name}: ${sortedMatches.length} matches, profile_image: ${fullPlayerData.profile_image ? '✅' : '❌'}`);
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

  const calculateMatchScore = (results, matchSeason, homeTeamId, awayTeamId) => {
    // NEUE LOGIK: Wie in MatchdayResults.jsx - bestimme userSide dynamisch!
    const playerTeamIds = playerTeams.map(t => t.id);
    const isHome = playerTeamIds.includes(homeTeamId);
    const isAway = playerTeamIds.includes(awayTeamId);
    const userSide = isHome ? 'home' : (isAway ? 'away' : null);
    
    if (!userSide) {
      console.warn('⚠️ User is neither home nor away team!', { homeTeamId, awayTeamId, playerTeamIds });
      return { home: 0, guest: 0, completed: 0, total: 6 };
    }

    let ourTeamScore = 0;      // Unser Team (Chris Spee's Team)
    let opponentScore = 0;     // Gegner-Team
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
        // KORREKTE PERSPEKTIVE: Basierend auf userSide (wie MatchdayResults)
        if (userSide === 'home') {
          // Wir sind Home-Team
          if (result.winner === 'home') ourTeamScore++;
          else if (result.winner === 'guest') opponentScore++;
        } else {
          // Wir sind Away-Team
          if (result.winner === 'guest') ourTeamScore++;    // guest = unser Team
          else if (result.winner === 'home') opponentScore++; // home = Gegner
        }
      } else {
        const matchWinner = calculateMatchWinner(result);
        if (matchWinner) {
          completedMatches++;
          // Gleiche Logik für berechnete Winner
          if (userSide === 'home') {
            if (matchWinner === 'home') ourTeamScore++;
            else if (matchWinner === 'guest') opponentScore++;
          } else {
            if (matchWinner === 'guest') ourTeamScore++;    // guest = unser Team
            else if (matchWinner === 'home') opponentScore++; // home = Gegner
          }
        }
      }
    });

    console.log('📊 Score Calculation (wie MatchdayResults):', { 
      ourTeamScore, 
      opponentScore, 
      completedMatches, 
      expectedTotal,
      actualEntriesInDB: results.length,
      season: matchSeason,
      userSide,
      homeTeamId,
      awayTeamId,
      playerTeamIds
    });

    // WICHTIG: Rückgabe mit klareren Namen
    // 'home' = unser Team, 'guest' = Gegner (aus Spieler-Perspektive)
    return { home: ourTeamScore, guest: opponentScore, completed: completedMatches, total: expectedTotal };
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
    
    // ✅ calculateMatchScore hat bereits die korrekte Perspektive berechnet!
    // rawScore.home = ourTeamScore (unser Team, egal ob Heim oder Auswärts)
    // rawScore.guest = opponentScore (Gegner-Team)
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
      </div>

      {/* ✅ NEU: Vereins-Performance-Übersicht */}
      {clubOverview && showClubOverview && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1.5rem',
              borderRadius: '12px 12px 0 0',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>
                    🏢 {clubOverview.clubName}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                    {clubOverview.totalTeams} Mannschaften • {clubOverview.totalMatches} Spiele
                  </p>
                </div>
                <button
                  onClick={() => setShowClubOverview(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Ausblenden
                </button>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0 0 12px 12px' }}>
              {/* Gesamt-Bilanz */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                  📊 Gesamt-Bilanz Saison {display}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                      {clubOverview.totalWins}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#047857', marginTop: '0.25rem' }}>
                      SIEGE
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                      {clubOverview.totalDraws}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#92400e', marginTop: '0.25rem' }}>
                      REMIS
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
                      {clubOverview.totalLosses}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#991b1b', marginTop: '0.25rem' }}>
                      NIEDERLAGEN
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2563eb' }}>
                      {clubOverview.totalPlayed > 0 ? Math.round((clubOverview.totalWins / clubOverview.totalPlayed) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', marginTop: '0.25rem' }}>
                      SIEGQUOTE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ NEU: Separate Mannschaften-Auswahl Card */}
      {allClubTeams.length > 0 && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                🏆 Mannschaften wählen
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allClubTeams.map(team => {
                  const isPrimary = playerTeams.find(pt => pt.id === team.id && pt.is_primary);
                  const isMember = playerTeams.some(pt => pt.id === team.id);
                  const isSelected = selectedClubTeamId === team.id || (!selectedClubTeamId && isPrimary);
                  
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedClubTeamId(team.id === selectedClubTeamId ? null : team.id);
                        setSelectedTeamId(team.id === selectedClubTeamId ? '' : team.id);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: isSelected 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                          : 'white',
                        color: isSelected ? 'white' : '#1f2937',
                        border: isSelected ? '2px solid #1e40af' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {team.category}
                      {isMember && ' ⭐'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!showClubOverview && clubOverview && (
        <button
          onClick={() => setShowClubOverview(true)}
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏢 Vereins-Übersicht anzeigen
        </button>
      )}

      <div className="fade-in" style={{ marginBottom: '1rem' }}>
        {/* ✅ NEU: Globale Suche */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            position: 'relative',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <input
              type="text"
              placeholder="🔍 Suche nach Verein, Mannschaft oder Spieler..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1.25rem',
                fontSize: '0.95rem',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: searchTerm ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
              }}
              onBlur={(e) => {
                if (!searchTerm) {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(null);
                }}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '0.25rem 0.5rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            )}
          </div>
          
          {/* ✅ Suchergebnisse Dropdown */}
          {searchResults && (searchResults.clubs.length > 0 || searchResults.teams.length > 0 || searchResults.players.length > 0) && (
            <div style={{
              maxWidth: '600px',
              margin: '0.5rem auto 0 auto',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1000
            }}>
              {/* Vereine */}
              {searchResults.clubs.length > 0 && (
                <div style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    🏢 Vereine ({searchResults.clubs.length})
                  </div>
                  {searchResults.clubs.map(club => (
                    <button
                      key={club.id}
                      onClick={() => {
                        // Zeige alle Teams dieses Vereins
                        console.log('🏢 Selected club:', club);
                        setSearchTerm('');
                        setSearchResults(null);
                        // TODO: Filter nach Verein implementieren
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{club.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{club.city}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Teams */}
              {searchResults.teams.length > 0 && (
                <div style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    👥 Mannschaften ({searchResults.teams.length})
                  </div>
                  {searchResults.teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        console.log('👥 Selected team:', team);
                        setSelectedClubTeamId(team.id);
                        setSelectedTeamId(team.id);
                        setSearchTerm('');
                        setSearchResults(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{team.club_name} - {team.category}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{team.team_name}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Spieler */}
              {searchResults.players.length > 0 && (
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    🎾 Spieler ({searchResults.players.length})
                  </div>
                  {searchResults.players.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        console.log('🎾 Selected player:', p);
                        // Wechsle zur Spieler-Ansicht und scrolle zum Spieler
                        setViewMode('spieler');
                        setSearchTerm('');
                        setSearchResults(null);
                        // TODO: Scroll to player
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>LK {p.current_lk}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Keine Ergebnisse */}
          {searchResults && searchResults.clubs.length === 0 && searchResults.teams.length === 0 && searchResults.players.length === 0 && (
            <div style={{
              maxWidth: '600px',
              margin: '0.5rem auto 0 auto',
              padding: '1rem',
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              ⚠️ Keine Ergebnisse für &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Results Container */}
      {viewMode === 'mannschaft' ? (
        /* Mannschafts-Ansicht Card */
        (() => {
          // ✅ NEU: Filter Matches basierend auf Auswahl
          const filteredMatches = (() => {
            // Fall 1: Vereins-Team ausgewählt (auch ohne Membership!)
            if (selectedClubTeamId) {
              // Prüfe ob Matches für externes Team geladen wurden
              if (externalTeamMatches[selectedClubTeamId]) {
                return externalTeamMatches[selectedClubTeamId];
              }
              // Ansonsten filter aus eigenen Matches (falls es doch ein eigenes Team ist)
              return matches.filter(m => m.teamInfo?.id === selectedClubTeamId);
            }
            
            // Fall 2: Eigenes Team ausgewählt (alte Logik)
            if (selectedTeamId) {
              return matches.filter(m => m.teamInfo?.id === selectedTeamId);
            }
            
            // Fall 3: Keine Auswahl → Zeige alle eigenen Team-Matches
            const playerTeamIds = playerTeams.map(team => team.id);
            return matches.filter(m => m.teamInfo && playerTeamIds.includes(m.teamInfo.id));
          })();
          
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
                  {/* Match Description - Ganz oben - Nur bei abgeschlossenen Spielen */}
                  {isMedenspieleCompleted && match.teamInfo && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: outcome === 'win' 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)'
                        : outcome === 'loss'
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(75, 85, 99, 0.1) 100%)',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                      fontSize: '0.85rem',
                      color: '#1f2937',
                      lineHeight: '1.5',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      {outcome === 'win' && (
                        <span>
                          <strong style={{ color: '#059669' }}>{match.teamInfo.clubName}</strong> gewinnt <strong style={{ color: '#059669' }}>{playerScore.playerScore}:{playerScore.opponentScore}</strong> gegen {match.opponent}
                        </span>
                      )}
                      {outcome === 'loss' && (
                        <span>
                          <strong style={{ color: '#dc2626' }}>{match.teamInfo.clubName}</strong> verliert <strong style={{ color: '#dc2626' }}>{playerScore.playerScore}:{playerScore.opponentScore}</strong> gegen {match.opponent}
                        </span>
                      )}
                      {outcome === 'draw' && (
                        <span>
                          <strong style={{ color: '#6b7280' }}>{match.teamInfo.clubName}</strong> spielt <strong style={{ color: '#6b7280' }}>{playerScore.playerScore}:{playerScore.opponentScore}</strong> remis gegen {match.opponent}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Match Header - Kompakt ohne Badge */}
                  <div className="match-header">
                    <div className="match-info">
                      <span className="match-opponent-name">{match.opponent}</span>
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

