import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import TeamView from './TeamView';
import './Results.css';
import './Dashboard.css';

const Results = () => {
  console.log('🟣 Results Component MOUNTED');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, player: currentPlayer } = useAuth();
  const { 
    players, 
    playerTeams, 
    selectedTeamId, 
    setSelectedTeamId,
    matches: dataContextMatches,
    loading: dataContextLoading,
    leagueMatches,
    leagueMeta
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
  const [teamViewTab, setTeamViewTab] = useState('spiele'); // Tab für Liga-Spielplan
  
  // ✅ NEU: Globale Suche (Phase 2)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [activeSearchView, setActiveSearchView] = useState(null); // { type: 'club'|'team'|'player', id: string, name: string }
  const [searchHistory, setSearchHistory] = useState([]); // Für Navigation zurück
  
  // 🎯 SOCIAL FEATURES (Follow/Unfollow)
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  
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
  const [externalLeagueMatches, setExternalLeagueMatches] = useState({});
  const [externalLeagueMeta, setExternalLeagueMeta] = useState({});
  
  // ✅ State für Suche-Team Matches
  const [searchTeamMatches, setSearchTeamMatches] = useState(null);
  const [searchTeamLeagueMatches, setSearchTeamLeagueMatches] = useState([]);
  const [searchTeamLeagueMeta, setSearchTeamLeagueMeta] = useState(null);
  const [loadingSearchTeamMatches, setLoadingSearchTeamMatches] = useState(false);
  
  // ✅ State für Suche-Spieler Ergebnisse
  const [searchPlayerResults, setSearchPlayerResults] = useState(null);
  const [loadingSearchPlayerResults, setLoadingSearchPlayerResults] = useState(false);
  
  // ✅ NEU: Globale Suche
  const performGlobalSearch = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults(null);
      return;
    }
    
    try {
      console.log('🔍 Global search for:', term);
      
      // Prüfe ob Benutzer authentifiziert ist
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.warn('⚠️ Keine gültige Session für globale Suche');
        setSearchResults(null);
        return;
      }
      
      // Suche nach Vereinen
      const { data: clubs, error: clubError } = await supabase
        .from('club_info')
        .select('id, name, city')
        .ilike('name', `%${term}%`)
        .limit(5);
      
      if (clubError) {
        console.error('❌ Error searching clubs:', clubError);
        // Ignoriere club_error, aber fahre mit anderen Suchen fort
      }
      
      // Suche nach Teams (club_name ist direkt in team_info vorhanden)
      let { data: teams, error: teamError } = await supabase
        .from('team_info')
        .select(`
          id, 
          team_name, 
          category,
          club_name,
          club_info(id, name)
        `)
        .or(`team_name.ilike.%${term}%,club_name.ilike.%${term}%,category.ilike.%${term}%`)
        .limit(10);
      
      // Erweitere die Suche um club_name über club_info (falls club_name in team_info leer ist)
      if (!teamError && teams) {
        // Filtere Teams, bei denen der Club-Name über club_info passt
        const { data: clubsForTeams, error: clubsError } = await supabase
          .from('club_info')
          .select('id, name')
          .ilike('name', `%${term}%`)
          .limit(5);
        
        if (!clubsError && clubsForTeams && clubsForTeams.length > 0) {
          const clubIds = clubsForTeams.map(c => c.id);
          const { data: teamsByClub, error: teamsByClubError } = await supabase
            .from('team_info')
            .select(`
              id, 
              team_name, 
              category,
              club_name,
              club_info(id, name)
            `)
            .in('club_id', clubIds)
            .limit(10);
          
          if (!teamsByClubError && teamsByClub) {
            // Kombiniere beide Ergebnisse und entferne Duplikate
            const allTeams = [...(teams || []), ...teamsByClub];
            const uniqueTeams = allTeams.filter((team, index, self) => 
              index === self.findIndex(t => t.id === team.id)
            );
            teams = uniqueTeams.slice(0, 10);
          }
        }
      }
      
      if (teamError) {
        console.error('❌ Error searching teams:', teamError);
        // Ignoriere team_error, aber fahre mit anderen Suchen fort
      }
      
      // Suche nach Spielern
      // WICHTIG: Suche nach ALLEN Spielern, die den Namen matchen
      // (auch inaktive oder externe Spieler, die Ergebnisse haben)
      const { data: playersList, error: playersError } = await supabase
        .from('players_unified')
        .select(`
          id, 
          name, 
          current_lk,
          season_start_lk,
          is_active,
          player_type,
          primary_team_id,
          user_id
        `)
        .ilike('name', `%${term}%`)
        // KEIN Filter nach status (existiert nicht) oder is_active
        // Zeige alle Spieler, die den Namen matchen - auch externe Spieler mit Ergebnissen
        .limit(20); // Erhöhe Limit für bessere Ergebnisse
      
      if (playersError) {
        console.error('❌ Error searching players:', playersError);
        // Ignoriere players_error, aber fahre mit anderen Suchen fort
      }
      
      // Normalisiere Teams-Ergebnisse (club_name kann aus team_info oder club_info kommen)
      const normalizedTeams = (teams || []).map(team => ({
        id: team.id,
        team_name: team.team_name,
        category: team.category,
        club_name: team.club_name || team.club_info?.name || ''
      }));
      
      setSearchResults({
        clubs: clubs || [],
        teams: normalizedTeams,
        players: playersList || []
      });
      
      console.log('✅ Search results:', {
        clubs: clubs?.length || 0,
        teams: normalizedTeams?.length || 0,
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
  
  // ✅ Handler für Suchergebnis-Klicks - öffnet neutrale View
  const handleSearchResultClick = async (type, id) => {
    console.log('🔍 Search result clicked:', type, id);
    
    let name = '';
    let data = null;
    
    if (type === 'club') {
      const club = searchResults?.clubs.find(c => c.id === id);
      name = club?.name || '';
      
      // Lade alle Teams dieses Vereins mit Details
      try {
        const { data: clubTeams, error: teamsError } = await supabase
          .from('team_info')
          .select('id, team_name, club_name, category')
          .eq('club_id', id)
          .order('category', { ascending: true });
        
        if (teamsError) throw teamsError;
        
        // Lade Details für alle Teams parallel
        const teamsWithDetails = await Promise.all(
          (clubTeams || []).map(async (team) => {
            try {
              // Lade team_seasons für Liga-Info
              const { data: seasons } = await supabase
                .from('team_seasons')
                .select('season, league, group_name, is_active')
                .eq('team_id', team.id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
              
              // Lade Match-Count
              const { data: matches, count } = await supabase
                .from('matches')
                .select('id', { count: 'exact', head: true })
                .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);
              
              return {
                ...team,
                details: {
                  season: seasons?.season || null,
                  league: seasons?.league || null,
                  group: seasons?.group_name || null,
                  matchCount: count || 0
                }
              };
            } catch (error) {
              console.error(`Error loading details for team ${team.id}:`, error);
              return {
                ...team,
                details: null
              };
            }
          })
        );
        
        data = {
          teams: teamsWithDetails,
          clubId: id,
          clubName: name
        };
      } catch (error) {
        console.error('Error loading club teams:', error);
      }
    } else if (type === 'team') {
      const team = searchResults?.teams.find(t => t.id === id);
      name = `${team?.club_name || ''} ${team?.category || ''} ${team?.team_name || ''}`.trim();
      data = { teamId: id };
      
      // Lade Matches für dieses Team
      // Prüfe, ob das Team zu den eigenen Teams gehört
      const isOwnTeam = playerTeams.some(team => team.id === id);
      const playerTeamIdsForFilter = isOwnTeam ? playerTeams.map(team => team.id) : [];
      
      setLoadingSearchTeamMatches(true);
      loadMatchesForTeam(id, true, playerTeamIdsForFilter).then(() => {
        setLoadingSearchTeamMatches(false);
      }).catch((error) => {
        console.error('Error loading matches for search team:', error);
        setLoadingSearchTeamMatches(false);
      });
    } else if (type === 'player') {
      const player = searchResults?.players.find(p => p.id === id);
      name = player?.name || '';
      data = { playerId: id };
      
      // Lade Ergebnisse für diesen Spieler
      setLoadingSearchPlayerResults(true);
      loadPlayerResultsForSearch(id).then(() => {
        setLoadingSearchPlayerResults(false);
      }).catch((error) => {
        console.error('Error loading results for search player:', error);
        setLoadingSearchPlayerResults(false);
      });
    }
    
    // Setze aktive Suche-Ansicht (neutrale View)
    setActiveSearchView({ type, id, name, data });
    
    // Füge zur History hinzu (für Zurück-Navigation)
    setSearchHistory(prev => [...prev, { type, id, name }]);
    
    // Schließe Dropdown, aber behalte searchTerm für Navigation
    setSearchResults(null);
  };
  
  // ✅ Zurück-Navigation in Suche - lädt Daten neu
  const handleSearchBack = async () => {
    if (searchHistory.length > 1) {
      // Gehe zum vorherigen Eintrag
      const newHistory = [...searchHistory];
      newHistory.pop(); // Entferne aktuellen Eintrag
      const previous = newHistory[newHistory.length - 1];
      setSearchHistory(newHistory);
      
      // Lade Daten für vorherigen Eintrag neu
      if (previous.type === 'club') {
        try {
          const { data: clubTeams, error: teamsError } = await supabase
            .from('team_info')
            .select('id, team_name, club_name, category')
            .eq('club_id', previous.id)
            .order('category', { ascending: true });
          
          if (teamsError) throw teamsError;
          
          setActiveSearchView({ 
            type: previous.type, 
            id: previous.id, 
            name: previous.name,
            data: {
              teams: clubTeams || [],
              clubId: previous.id,
              clubName: previous.name
            }
          });
        } catch (error) {
          console.error('Error loading club teams on back:', error);
          setActiveSearchView({ type: previous.type, id: previous.id, name: previous.name });
        }
      } else if (previous.type === 'team') {
        setActiveSearchView({ 
          type: previous.type, 
          id: previous.id, 
          name: previous.name,
          data: { teamId: previous.id }
        });
      } else {
        setActiveSearchView({ type: previous.type, id: previous.id, name: previous.name });
      }
    } else {
      // Zurück zur Suche
      setActiveSearchView(null);
      setSearchHistory([]);
    }
  };
  
  // ✅ Suche zurücksetzen
  const handleResetSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    setActiveSearchView(null);
    setSearchHistory([]);
  };
  
  // ✅ Komponente für Team-Details-Ansicht
  const TeamDetailsView = ({ 
    teamId, 
    teamName, 
    teamMeta, 
    searchTeamMatches,
    externalTeamMatches,
    searchTeamLeagueMatches,
    externalLeagueMatches,
    playerTeams,
    display,
    onTeamChange
  }) => {
    const [teamInfo, setTeamInfo] = useState(null);
    
    useEffect(() => {
      if (teamId) {
        supabase
          .from('team_info')
          .select('id, team_name, category, club_name')
          .eq('id', teamId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setTeamInfo(data);
            }
          });
      }
    }, [teamId]);
    
    const displayName = teamInfo 
      ? `${teamInfo.category || ''} ${teamInfo.team_name || ''}`.trim()
      : teamName;
    
    return (
      <>
        {/* Mannschaftsdetails */}
        {(teamMeta || teamInfo) && (
          <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {displayName}
              </div>
              {teamMeta && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {teamMeta.league && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🏆</span>
                      <span>{teamMeta.league}</span>
                    </div>
                  )}
                  {teamMeta.group && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📋</span>
                      <span>Gruppe {teamMeta.group}</span>
                    </div>
                  )}
                  {teamMeta.season && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📅</span>
                      <span>{teamMeta.season}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <TeamView 
          teamId={teamId}
          matches={searchTeamMatches || externalTeamMatches[teamId] || []}
          leagueMatches={searchTeamLeagueMatches.length > 0 
            ? searchTeamLeagueMatches 
            : (externalLeagueMatches[teamId] || [])}
          leagueMeta={teamMeta || null}
          playerTeamIds={(() => {
            // Prüfe, ob das gesuchte Team zu den eigenen Teams gehört
            const isOwnTeam = playerTeams.some(team => team.id === teamId);
            // Wenn es nicht zu den eigenen Teams gehört, leere Liste (keine "Unsere Begegnungen")
            // Wenn es zu den eigenen Teams gehört, alle eigenen Teams (normale Ansicht)
            return isOwnTeam ? playerTeams.map(team => team.id) : [];
          })()}
          display={display}
          onTeamChange={onTeamChange}
        />
      </>
    );
  };
  
  const loadMatchesForTeam = async (teamId, isSearchTeam = false, playerTeamIdsForFilter = []) => {
    try {
      console.log('📥 Loading matches for external team:', teamId, isSearchTeam ? '(search team)' : '', 'playerTeamIds:', playerTeamIdsForFilter);
      
      // 1. Lade Team-Season Info für Liga/Gruppe
      const currentSeason = 'Winter 2025/26';
      const { data: teamSeasons } = await supabase
        .from('team_seasons')
        .select('league, group_name, season, team_info!inner(id, team_name, club_name, category)')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('season', currentSeason)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!teamSeasons) {
        console.warn('⚠️ No team_season found for team:', teamId);
        return;
      }
      
      // 2. Lade alle Teams in der gleichen Liga/Gruppe
      const { data: leagueTeamSeasons } = await supabase
        .from('team_seasons')
        .select('team_id, team_info!inner(id, team_name, club_name, category)')
        .eq('league', teamSeasons.league)
        .eq('group_name', teamSeasons.group_name)
        .eq('season', teamSeasons.season)
        .eq('is_active', true);
      
      const leagueTeamIds = (leagueTeamSeasons || []).map(ts => ts.team_info.id);
      
      // 3. Lade ALLE Matchdays für die gesamte Liga/Gruppe (nicht nur für dieses Team!)
      // WICHTIG: Für die Tabelle brauchen wir alle Matches der Gruppe, nicht nur die des ausgewählten Teams!
      const { data: allGroupMatchdays, error: allGroupError } = await supabase
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
          away_score,
          league,
          group_name,
          home_team:team_info!matchdays_home_team_id_fkey(id, club_name, team_name, category),
          away_team:team_info!matchdays_away_team_id_fkey(id, club_name, team_name, category)
        `)
        .eq('season', currentSeason)
        .eq('league', teamSeasons.league)
        .eq('group_name', teamSeasons.group_name)
        .order('match_date', { ascending: true });
      
      if (allGroupError) {
        console.error('❌ Error loading all group matchdays:', allGroupError);
        throw allGroupError;
      }
      
      // 4. Filtere Matchdays für dieses spezifische Team (für filteredMatches)
      const matchdays = (allGroupMatchdays || []).filter(m => 
        m.home_team_id === teamId || m.away_team_id === teamId
      );
      
      console.log('✅ Loaded matchdays:', {
        totalGroupMatches: allGroupMatchdays?.length || 0,
        teamMatches: matchdays.length,
        league: teamSeasons.league,
        group: teamSeasons.group_name
      });
      
      // 5. Lade match_results für ALLE Matchdays der Gruppe (für Tabelle!)
      const allMatchIds = (allGroupMatchdays || []).map(m => m.id);
      let matchResults = [];
      if (allMatchIds.length > 0) {
        const { data: results } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', allMatchIds);
        matchResults = results || [];
      }
      
      const resultsByMatchId = matchResults.reduce((acc, result) => {
        if (!result || !result.matchday_id) return acc;
        if (!acc[result.matchday_id]) acc[result.matchday_id] = [];
        acc[result.matchday_id].push(result);
        return acc;
      }, {});
      
      // 6. Transformiere ALLE Matchdays der Gruppe zu leagueMatches Format (für Tabelle!)
      const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
      
      const leagueMatchDetails = (allGroupMatchdays || []).map(match => {
        const matchDate = match.match_date ? new Date(match.match_date) : null;
        const resultsForMatch = resultsByMatchId[match.id] || [];
        
        let homeMatchPoints = 0;
        let awayMatchPoints = 0;
        let homeSets = 0;
        let awaySets = 0;
        let homeGames = 0;
        let awayGames = 0;
        let completedMatches = 0;
        
        resultsForMatch.forEach((result) => {
          if (!result || !FINISHED_STATUSES.includes(result.status) || !result.winner) return;
          
          completedMatches += 1;
          
          if (result.winner === 'home') {
            homeMatchPoints += 1;
          } else if (result.winner === 'guest' || result.winner === 'away') {
            awayMatchPoints += 1;
          }
          
          const set1Home = parseInt(result.set1_home || 0, 10);
          const set1Guest = parseInt(result.set1_guest || 0, 10);
          const set2Home = parseInt(result.set2_home || 0, 10);
          const set2Guest = parseInt(result.set2_guest || 0, 10);
          const set3Home = parseInt(result.set3_home || 0, 10);
          const set3Guest = parseInt(result.set3_guest || 0, 10);
          
          if (set1Home > set1Guest) homeSets += 1;
          else if (set1Guest > set1Home) awaySets += 1;
          homeGames += set1Home;
          awayGames += set1Guest;
          
          if (set2Home > set2Guest) homeSets += 1;
          else if (set2Guest > set2Home) awaySets += 1;
          homeGames += set2Home;
          awayGames += set2Guest;
          
          if (set3Home !== null && set3Guest !== null) {
            if (set3Home > set3Guest) homeSets += 1;
            else if (set3Guest > set3Home) awaySets += 1;
            homeGames += set3Home;
            awayGames += set3Guest;
          }
        });
        
        const expectedMatches = 6;
        const displayScore = completedMatches > 0 
          ? `${homeMatchPoints}:${awayMatchPoints}`
          : (match.home_score !== null && match.away_score !== null 
            ? `${match.home_score}:${match.away_score}` 
            : '–:–');
        
        const winner = homeMatchPoints > awayMatchPoints ? 'home' 
          : awayMatchPoints > homeMatchPoints ? 'away' 
          : null;
        
        // Setze involvesPlayerTeam basierend auf playerTeamIdsForFilter, nicht auf teamId
        // Wenn playerTeamIdsForFilter leer ist (fremdes Team), ist involvesPlayerTeam immer false
        const isPlayerHomeTeam = playerTeamIdsForFilter.length > 0 && playerTeamIdsForFilter.includes(match.home_team_id);
        const isPlayerAwayTeam = playerTeamIdsForFilter.length > 0 && playerTeamIdsForFilter.includes(match.away_team_id);
        const involvesPlayerTeam = isPlayerHomeTeam || isPlayerAwayTeam;
        
        // Für Highlighting: markiere das gesuchte Team (auch wenn es nicht zu eigenen Teams gehört)
        const isSearchedHomeTeam = match.home_team_id === teamId;
        const isSearchedAwayTeam = match.away_team_id === teamId;
        
        const buildTeamLabel = (team) => {
          if (!team) return 'Unbekannt';
          const parts = [team.club_name, team.team_name].filter(Boolean);
          return parts.join(' ') || 'Unbekannt';
        };
        
        return {
          id: match.id,
          date: matchDate,
          start_time: match.start_time || null,
          season: match.season,
          status: match.status,
          venue: match.venue,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          homeTeam: {
            id: match.home_team_id,
            displayName: buildTeamLabel(match.home_team),
            club_name: match.home_team?.club_name || null,
            team_name: match.home_team?.team_name || null,
            isPlayerTeam: isPlayerHomeTeam,
            isSearchedTeam: isSearchedHomeTeam
          },
          awayTeam: {
            id: match.away_team_id,
            displayName: buildTeamLabel(match.away_team),
            club_name: match.away_team?.club_name || null,
            team_name: match.away_team?.team_name || null,
            isPlayerTeam: isPlayerAwayTeam,
            isSearchedTeam: isSearchedAwayTeam
          },
          homeMatchPoints,
          awayMatchPoints,
          homeSets,
          awaySets,
          homeGames,
          awayGames,
          completedMatches,
          expectedMatches,
          displayScore,
          winner,
          involvesPlayerTeam,
          isPlayerHomeTeam,
          isPlayerAwayTeam
        };
      }).sort((a, b) => {
        const aTime = a.date ? a.date.getTime() : 0;
        const bTime = b.date ? b.date.getTime() : 0;
        return aTime - bTime;
      });
      
      // 6. Speichere leagueMeta
      const meta = {
        league: teamSeasons.league,
        group: teamSeasons.group_name,
        season: teamSeasons.season
      };
      
      setExternalLeagueMeta(prev => ({
        ...prev,
        [teamId]: meta
      }));
      
      // 7. Speichere leagueMatches
      setExternalLeagueMatches(prev => ({
        ...prev,
        [teamId]: leagueMatchDetails
      }));
      
      // 8. Transformiere auch zu einfachen matches (für Kompatibilität)
      const transformedMatches = (matchdays || []).map(m => {
        const isHome = m.home_team_id === teamId;
        const opponentTeam = isHome ? m.away_team : m.home_team;
        const ourTeam = isHome ? m.home_team : m.away_team;
        
        return {
          id: m.id,
          date: new Date(m.match_date),
          opponent: opponentTeam ? `${opponentTeam.club_name} ${opponentTeam.team_name || ''} (${opponentTeam.category})`.trim() : 'Unbekannt',
          location: isHome ? 'Home' : 'Away',
          venue: m.venue,
          season: m.season,
          home_score: m.home_score,
          away_score: m.away_score,
          teamId: teamId,
          teamInfo: ourTeam || { id: teamId }
        };
      });
      
      setExternalTeamMatches(prev => ({
        ...prev,
        [teamId]: transformedMatches
      }));
      
      // 9. Speichere auch für Suche-State (falls aktiv) - NACH transformedMatches
      if (isSearchTeam || (activeSearchView?.type === 'team' && activeSearchView.data?.teamId === teamId)) {
        setSearchTeamLeagueMatches(leagueMatchDetails);
        setSearchTeamLeagueMeta(meta);
        setSearchTeamMatches(transformedMatches);
        console.log('✅ Search team matches saved:', {
          leagueMatches: leagueMatchDetails.length,
          matches: transformedMatches.length,
          meta
        });
      }
      
      console.log('✅ External team matches loaded:', {
        teamId,
        totalGroupMatches: allGroupMatchdays?.length || 0,
        teamMatches: matchdays.length,
        leagueMatches: leagueMatchDetails.length,
        league: teamSeasons.league,
        group: teamSeasons.group_name
      });
      
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
        } else if (result.winner === 'guest' || result.winner === 'away') {
          matchScoresMap[result.matchday_id].away++;
          console.log(`  ✅ Away/Guest win for match ${result.matchday_id}`);
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
        const isHomeTeam = teamIds.includes(match.home_team_id);
        const isAwayTeam = teamIds.includes(match.away_team_id);
        
        console.log(`🔍 Match ${match.id}:`, {
          date: match.match_date,
          hasScores: !!scores,
          scores,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          isOurTeamHome: isHomeTeam,
          isOurTeamAway: isAwayTeam,
          dbHomeScore: match.home_score,
          dbAwayScore: match.away_score
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

  // ✅ Lade Spieler-Ergebnisse für Suche (einzelner Spieler)
  const loadPlayerResultsForSearch = async (playerId) => {
    try {
      setLoadingSearchPlayerResults(true);
      
      // Lade Spieler-Daten
      const { data: playerData, error: playerError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, season_start_lk, ranking, player_type, profile_image, updated_at, created_at, user_id')
        .eq('id', playerId)
        .single();
      
      if (playerError || !playerData) {
        console.error('Error loading player data:', playerError);
        setSearchPlayerResults(null);
        return;
      }
      
      // Lade alle Matches der aktuellen Saison
      const currentSeason = getCurrentSeason();
      // Die Datenbank verwendet "Winter 2025/26" Format
      // Konvertiere getCurrentSeason() Format zu DB-Format
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let seasonValue;
      
      if (currentMonth >= 4 && currentMonth <= 7) {
        // Sommer: "Sommer 2025"
        seasonValue = `Sommer ${currentYear}`;
      } else {
        // Winter: "Winter YYYY/YY+1"
        if (currentMonth >= 8) {
          const nextYear = currentYear + 1;
          seasonValue = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
        } else {
          const prevYear = currentYear - 1;
          seasonValue = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
        }
      }
      
      const { data: seasonMatches, error: matchesError } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          start_time,
          season,
          home_team_id,
          away_team_id,
          venue,
          home_team:team_info!matchdays_home_team_id_fkey(id, club_name, team_name, category),
          away_team:team_info!matchdays_away_team_id_fkey(id, club_name, team_name, category)
        `)
        .eq('season', seasonValue)
        .order('match_date', { ascending: true });
      
      if (matchesError) {
        console.error('Error loading season matches:', matchesError);
        setSearchPlayerResults({
          player: playerData,
          matches: []
        });
        return;
      }
      
      if (!seasonMatches || seasonMatches.length === 0) {
        setSearchPlayerResults({
          player: playerData,
          matches: []
        });
        return;
      }
      
      // Lade alle match_results für diese Matches
      // Split in Batches um Supabase .in() Limit zu vermeiden (max ~100 IDs pro Query)
      const matchIds = seasonMatches.map(m => m.id);
      const BATCH_SIZE = 100;
      let allResultsData = [];
      let allResultsError = null;
      
      for (let i = 0; i < matchIds.length; i += BATCH_SIZE) {
        const batch = matchIds.slice(i, i + BATCH_SIZE);
        const { data: batchData, error: batchError } = await supabase
        .from('match_results')
        .select('*')
          .in('matchday_id', batch);
        
        if (batchError) {
          console.error('Error loading batch of match results:', batchError);
          allResultsError = batchError;
          break;
        }
        
        if (batchData) {
          allResultsData = [...allResultsData, ...batchData];
        }
      }
      
      if (allResultsError) {
        console.error('Error loading match results:', allResultsError);
        setSearchPlayerResults({
          player: playerData,
          matches: []
        });
        return;
      }
      
      // Sammle alle Player-IDs für Batch-Load (inkl. gesuchten Spieler)
      const allPlayerIds = new Set([playerId]); // Füge gesuchten Spieler hinzu
      (allResultsData || []).forEach(r => {
        if (r.home_player_id) allPlayerIds.add(r.home_player_id);
        if (r.home_player1_id) allPlayerIds.add(r.home_player1_id);
        if (r.home_player2_id) allPlayerIds.add(r.home_player2_id);
        if (r.guest_player_id) allPlayerIds.add(r.guest_player_id);
        if (r.guest_player1_id) allPlayerIds.add(r.guest_player1_id);
        if (r.guest_player2_id) allPlayerIds.add(r.guest_player2_id);
      });
      
      // Lade alle Spieler-Daten (Batch-Load wenn mehr als 100 IDs)
      const playerIdsArray = Array.from(allPlayerIds);
      const PLAYER_BATCH_SIZE = 100;
      let allPlayersData = [];
      
      for (let i = 0; i < playerIdsArray.length; i += PLAYER_BATCH_SIZE) {
        const batch = playerIdsArray.slice(i, i + PLAYER_BATCH_SIZE);
        const { data: batchPlayersData } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, season_start_lk, ranking, player_type, profile_image')
          .in('id', batch);
        
        if (batchPlayersData) {
          allPlayersData = [...allPlayersData, ...batchPlayersData];
        }
      }
      
      const playerDataMap = {};
      allPlayersData.forEach(p => {
        playerDataMap[p.id] = p;
      });
      // Füge gesuchten Spieler hinzu (falls nicht bereits vorhanden)
      if (!playerDataMap[playerId]) {
        playerDataMap[playerId] = playerData;
      }
      
      // Filtere Match-Ergebnisse für diesen Spieler
      const playerMatches = [];
      
      for (const match of seasonMatches) {
        const resultsData = (allResultsData || []).filter(r => 
          r.matchday_id === match.id &&
          (r.home_player_id === playerId || r.home_player1_id === playerId || r.home_player2_id === playerId ||
           r.guest_player_id === playerId || r.guest_player1_id === playerId || r.guest_player2_id === playerId)
        );
        
        if (resultsData && resultsData.length > 0) {
          for (const result of resultsData) {
            const isPlayerInHomeTeam = result.home_player_id === playerId || 
                                       result.home_player1_id === playerId || 
                                       result.home_player2_id === playerId;
            
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
              const opponentId = isPlayerInHomeTeam ? result.guest_player_id : result.home_player_id;
              const oppData = opponentId ? playerDataMap[opponentId] : null;
              
              if (oppData) {
                opponentName = oppData.name;
                opponentLK = oppData.current_lk;
              }
            } else if (result.match_type === 'Doppel') {
              // Bei Doppeln: Gegner sind die beiden Spieler des gegnerischen Teams
              const opp1Id = isPlayerInHomeTeam ? result.guest_player1_id : result.home_player1_id;
              const opp2Id = isPlayerInHomeTeam ? result.guest_player2_id : result.home_player2_id;
              
              const opp1Data = opp1Id ? playerDataMap[opp1Id] : null;
              const opp2Data = opp2Id ? playerDataMap[opp2Id] : null;
              
              opponent1Name = opp1Data?.name || 'Unbekannt';
              opponent1LK = opp1Data?.current_lk || opp1Data?.season_start_lk || null;
              opponent2Name = opp2Data?.name || 'Unbekannt';
              opponent2LK = opp2Data?.current_lk || opp2Data?.season_start_lk || null;
              
              // Partner ist der andere Spieler im eigenen Team
              let partnerId = null;
              if (isPlayerInHomeTeam) {
                // Spieler ist im Home-Team
                if (result.home_player1_id === playerId) {
                  partnerId = result.home_player2_id;
                } else if (result.home_player2_id === playerId) {
                  partnerId = result.home_player1_id;
                }
              } else {
                // Spieler ist im Guest-Team
                if (result.guest_player1_id === playerId) {
                  partnerId = result.guest_player2_id;
                } else if (result.guest_player2_id === playerId) {
                  partnerId = result.guest_player1_id;
                }
              }
              
              const partnerData = partnerId ? playerDataMap[partnerId] : null;
              
              if (partnerData) {
                partnerName = partnerData.name;
                partnerLK = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking || null;
              }
              
              // Für Einzel-Anzeige: Kombiniere beide Gegner-Namen
              opponentName = opponent2Name && opponent2Name !== 'Unbekannt' 
                ? `${opponent1Name} / ${opponent2Name}`
                : opponent1Name;
              opponentLK = opponent1LK;
            }
            
            // Bestimme eigenes Team und Gegner-Team
            const playerTeam = isPlayerInHomeTeam ? match.home_team : match.away_team;
            const opponentTeam = isPlayerInHomeTeam ? match.away_team : match.home_team;
            
            const playerTeamName = playerTeam 
              ? `${playerTeam.club_name} ${playerTeam.team_name || ''} (${playerTeam.category})`.trim()
              : 'Unbekannt';
            const opponentTeamName = opponentTeam 
              ? `${opponentTeam.club_name} ${opponentTeam.team_name || ''} (${opponentTeam.category})`.trim()
              : 'Unbekannt';
            
            playerMatches.push({
              ...result,
              opponent: opponentTeamName,
              playerTeam: playerTeamName,
              playerTeamData: playerTeam,
              opponentTeamData: opponentTeam,
              matchDate: match.match_date ? new Date(match.match_date) : null,
              matchLocation: match.venue || match.location || 'Unbekannt',
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
      const sortedMatches = playerMatches.sort((a, b) => {
        const aTime = a.matchDate ? a.matchDate.getTime() : 0;
        const bTime = b.matchDate ? b.matchDate.getTime() : 0;
        return aTime - bTime;
      });
      
      // ✅ Lade Team- und Vereinsinformationen für den Spieler
      const { data: teamMemberships, error: teamsError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team_info (
            id,
            club_name,
            team_name,
            category,
            club_id,
            club_info (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('player_id', playerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });
      
      // Gruppiere Teams nach Verein
      const clubsMap = new Map();
      if (teamMemberships && !teamsError) {
        teamMemberships.forEach(membership => {
          const team = membership.team_info;
          if (team && team.club_info) {
            const clubId = team.club_info.id || team.club_id;
            const clubName = team.club_info.name || team.club_name;
            
            if (!clubsMap.has(clubId)) {
              clubsMap.set(clubId, {
                id: clubId,
                name: clubName,
                logo_url: team.club_info.logo_url || null,
                teams: []
              });
            }
            
            clubsMap.get(clubId).teams.push({
              id: team.id,
              team_name: team.team_name,
              category: team.category,
              club_name: team.club_name,
              is_primary: membership.is_primary
            });
          }
        });
      }
      
      const clubs = Array.from(clubsMap.values());
      
      // ✅ Lade Follower-Informationen
      const { data: followerData } = await supabase
        .from('player_followers')
        .select('id, follower_id, following_id')
        .or(`follower_id.eq.${playerId},following_id.eq.${playerId}`);
      
      const tennismateCount = followerData?.filter(f => f.following_id === playerId).length || 0;
      const followingCount = followerData?.filter(f => f.follower_id === playerId).length || 0;
      
      // ✅ Lade Team-Ranking Position (beste Position aus allen Teams)
      let bestRank = null;
      let bestRankTeam = null;
      if (teamMemberships && teamMemberships.length > 0) {
        const teamIds = teamMemberships.map(tm => tm.team_info?.id).filter(Boolean);
        if (teamIds.length > 0) {
          // Lade aktuelle Saison für Ranking
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          let seasonValue;
          if (currentMonth >= 4 && currentMonth <= 7) {
            seasonValue = `Sommer ${currentYear}`;
          } else {
            if (currentMonth >= 8) {
              const nextYear = currentYear + 1;
              seasonValue = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
            } else {
              const prevYear = currentYear - 1;
              seasonValue = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
            }
          }
          
          // Lade Team-Roster für Ranking-Position
          const { data: rosterData } = await supabase
            .from('team_roster')
            .select('rank, team_id, team_info(id, team_name, category, club_name)')
            .eq('player_id', playerId)
            .eq('season', seasonValue)
            .in('team_id', teamIds)
            .order('rank', { ascending: true })
            .limit(1);
          
          if (rosterData && rosterData.length > 0) {
            bestRank = rosterData[0].rank;
            bestRankTeam = rosterData[0].team_info;
          }
        }
      }
      
      setSearchPlayerResults({
        player: playerData,
        matches: sortedMatches,
        clubs: clubs,
        teams: teamMemberships || [],
        tennismateCount,
        followingCount,
        bestRank,
        bestRankTeam
      });
      
      // Lade Social Features (Follow-Status) wenn eingeloggt
      if (currentPlayer?.id && playerData.id !== currentPlayer.id) {
        loadSocialFeatures(playerData.id);
      }
      
    } catch (error) {
      console.error('❌ Error loading player results for search:', error);
      setSearchPlayerResults(null);
    } finally {
      setLoadingSearchPlayerResults(false);
    }
  };
  
  // 🎯 Lade Social Features für gesuchten Spieler
  const loadSocialFeatures = async (targetPlayerId) => {
    if (!currentPlayer?.id || !targetPlayerId) return;
    
    try {
      // Prüfe ob aktueller Spieler dem Ziel-Spieler folgt
      const { data: followData } = await supabase
        .from('player_followers')
        .select('id, follower_id, following_id, is_mutual')
        .eq('follower_id', currentPlayer.id)
        .eq('following_id', targetPlayerId)
        .maybeSingle();
      
      setIsFollowing(!!followData);
      
      console.log('✅ Social features loaded:', {
        isFollowing: !!followData,
        targetPlayerId
      });
    } catch (error) {
      console.error('❌ Error loading social features:', error);
    }
  };
  
  // 🎯 FOLLOW/UNFOLLOW HANDLER
  const handleFollowToggle = async (targetPlayerId) => {
    if (!currentPlayer?.id || !targetPlayerId || socialLoading) return;
    
    setSocialLoading(true);
    
    try {
      if (isFollowing) {
        // UNFOLLOW
        const { error } = await supabase
          .from('player_followers')
          .delete()
          .eq('follower_id', currentPlayer.id)
          .eq('following_id', targetPlayerId);
        
        if (error) throw error;
        
        setIsFollowing(false);
        console.log('✅ Unfollowed player:', targetPlayerId);
      } else {
        // FOLLOW
        const { error } = await supabase
          .from('player_followers')
          .insert({
            follower_id: currentPlayer.id,
            following_id: targetPlayerId
          });
        
        if (error) throw error;
        
        setIsFollowing(true);
        console.log('✅ Followed player:', targetPlayerId);
      }
      
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
      alert('Fehler beim Folgen/Entfolgen. Bitte versuche es erneut.');
    } finally {
      setSocialLoading(false);
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

      // Alle abgeschlossenen Match-Status (nicht nur 'completed')
      const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
      
      if (FINISHED_STATUSES.includes(result.status) && result.winner) {
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
      <div className="fade-in" style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          Spielergebnisse 🏆
        </h1>
        
        {/* Season Info prominent */}
        <div style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280',
          fontWeight: '600',
          marginTop: '0.5rem',
          marginBottom: '2rem'
        }}>
          Saison: {display}
        </div>
        
        {/* ✅ Globale Suche - mit deutlicher Überschrift */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            🔍 Globale Suche
          </h2>
          <div style={{
            position: 'relative',
            maxWidth: '600px',
            margin: '0px auto'
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
              onClick={handleResetSearch}
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
            margin: '0.5rem auto 0',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {/* Vereine */}
            {searchResults.clubs.length > 0 && (
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                  🏢 Vereine
                </div>
                {searchResults.clubs.map(club => (
                  <div
                    key={club.id}
                    onClick={() => handleSearchResultClick('club', club.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'white',
                      transition: 'all 0.2s',
                      marginBottom: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{club.name}</div>
                    {club.city && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{club.city}</div>}
                  </div>
                ))}
              </div>
            )}
            
            {/* Mannschaften */}
            {searchResults.teams.length > 0 && (
              <div style={{ padding: '1rem', borderTop: searchResults.clubs.length > 0 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                  🏆 Mannschaften
                </div>
                {searchResults.teams.map(team => (
                  <div
                    key={team.id}
                    onClick={() => handleSearchResultClick('team', team.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'white',
                      transition: 'all 0.2s',
                      marginBottom: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{team.team_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{team.club_name} · {team.category}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Spieler */}
            {searchResults.players.length > 0 && (
              <div style={{ padding: '1rem', borderTop: (searchResults.clubs.length > 0 || searchResults.teams.length > 0) ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                  👤 Spieler
                </div>
                {searchResults.players.map(player => (
                  <div
                    key={player.id}
                    onClick={() => handleSearchResultClick('player', player.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'white',
                      transition: 'all 0.2s',
                      marginBottom: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{player.name}</div>
                    {player.current_lk && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {player.current_lk?.toLowerCase().startsWith('lk')
                          ? player.current_lk
                          : `LK ${player.current_lk}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ Aktive Suche-Ansicht (neutrale View) */}
      {activeSearchView && (
        <div style={{
          maxWidth: '1200px',
          margin: '2rem auto',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          padding: '2rem'
        }}>
          {/* Header mit Zurück-Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <button
              onClick={handleSearchBack}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ← Zurück
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {activeSearchView.name}
              </h2>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '0.25rem'
              }}>
                {activeSearchView.type === 'club' && '🏢 Verein'}
                {activeSearchView.type === 'team' && '🏆 Mannschaft'}
                {activeSearchView.type === 'player' && '👤 Spieler'}
              </div>
            </div>
            <button
              onClick={handleResetSearch}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}
            >
              ✕ Schließen
            </button>
          </div>
          
          {/* Inhalt basierend auf Typ */}
          {activeSearchView.type === 'club' && activeSearchView.data?.teams && (
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '1rem'
              }}>
                Mannschaften ({activeSearchView.data.teams.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {activeSearchView.data.teams.map(team => {
                  const details = team.details;
                  
                  return (
                    <div
                      key={team.id}
                      onClick={() => handleSearchResultClick('team', team.id)}
                      style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ 
                        fontWeight: '700', 
                        color: '#1f2937',
                        fontSize: '1.125rem',
                        marginBottom: '0.5rem'
                      }}>
                        {team.category} {team.team_name}
                      </div>
                      {details && (
                        <div style={{ 
                          fontSize: '0.875rem', 
                          color: '#6b7280',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          {details.league && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>🏆</span>
                              <span>{details.league}</span>
                            </div>
                          )}
                          {details.group && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>📋</span>
                              <span>{details.group}</span>
                            </div>
                          )}
                          {details.season && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>📅</span>
                              <span>{details.season}</span>
                            </div>
                          )}
                          {details.matchCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                              <span>⚽</span>
                              <span>{details.matchCount} {details.matchCount === 1 ? 'Spiel' : 'Spiele'}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {!details && (
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                          Keine Details verfügbar
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {activeSearchView.type === 'team' && activeSearchView.data?.teamId && (
            <div>
              {loadingSearchTeamMatches ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p>Lade Spiele und Tabelle...</p>
                </div>
              ) : (
                <>
                  <TeamDetailsView 
                    teamId={activeSearchView.data.teamId}
                    teamName={activeSearchView.name}
                    teamMeta={searchTeamLeagueMeta || externalLeagueMeta[activeSearchView.data.teamId]}
                    searchTeamMatches={searchTeamMatches}
                    externalTeamMatches={externalTeamMatches}
                    searchTeamLeagueMatches={searchTeamLeagueMatches}
                    externalLeagueMatches={externalLeagueMatches}
                    playerTeams={playerTeams}
                    display={display}
                    onTeamChange={async (newTeamId) => {
                      // Navigation zu anderem Team innerhalb der Suche
                      const { data: teamData } = await supabase
                        .from('team_info')
                        .select('id, team_name, category, club_name')
                        .eq('id', newTeamId)
                        .single();
                      
                      if (teamData) {
                        const teamName = `${teamData.club_name || ''} ${teamData.category || ''} ${teamData.team_name || ''}`.trim();
                        setActiveSearchView({ 
                          type: 'team', 
                          id: newTeamId, 
                          name: teamName,
                          data: { teamId: newTeamId }
                        });
                        setSearchHistory(prev => [...prev, { type: 'team', id: newTeamId, name: teamName }]);
                        
                        // Lade Matches für neues Team
                        // Prüfe, ob das Team zu den eigenen Teams gehört
                        const isOwnTeam = playerTeams.some(team => team.id === newTeamId);
                        const playerTeamIdsForFilter = isOwnTeam ? playerTeams.map(team => team.id) : [];
                        
                        setLoadingSearchTeamMatches(true);
                        loadMatchesForTeam(newTeamId, true, playerTeamIdsForFilter).then(() => {
                          setLoadingSearchTeamMatches(false);
                        }).catch((error) => {
                          console.error('Error loading matches for search team:', error);
                          setLoadingSearchTeamMatches(false);
                        });
                      }
                    }}
                  />
                </>
              )}
            </div>
          )}
          
          {activeSearchView.type === 'player' && activeSearchView.data?.playerId && (
            <div>
              {loadingSearchPlayerResults ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p>Lade Spieler-Ergebnisse...</p>
                </div>
              ) : searchPlayerResults ? (
                <div>
                  {/* Spieler-Info Card */}
                  <div className="card" style={{
                    marginBottom: '1.5rem',
                    padding: '1.5rem',
                    background: 'white'
                  }}>
                    {/* Header mit Avatar und Name */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1.5rem',
                      paddingBottom: '1.5rem',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <img 
                        src={searchPlayerResults.player.profile_image || '/app-icon.jpg'} 
                        alt={searchPlayerResults.player.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #10b981',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <h2 style={{
                              fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#1f2937',
                              margin: '0 0 0.25rem 0'
                        }}>
                          {searchPlayerResults.player.name}
                            </h2>
                        <div style={{
                              fontSize: '1rem',
                          color: '#6b7280',
                              fontWeight: '500'
                        }}>
                          {searchPlayerResults.player.current_lk || searchPlayerResults.player.season_start_lk || searchPlayerResults.player.ranking || 'LK ?'}
                            </div>
                          </div>
                          {/* Follow-Button (nur wenn eingeloggt und nicht eigenes Profil) */}
                          {currentPlayer?.id && searchPlayerResults.player.id !== currentPlayer.id && (
                            <button
                              onClick={() => handleFollowToggle(searchPlayerResults.player.id)}
                              disabled={socialLoading}
                              className="btn"
                              style={{
                                background: isFollowing 
                                  ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' 
                                  : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: isFollowing ? '#4b5563' : 'white',
                                border: isFollowing ? '2px solid #d1d5db' : '2px solid #6d28d9',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: socialLoading ? 0.6 : 1,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isFollowing ? (
                                <>
                                  <UserMinus size={18} />
                                  Entfolgen
                                </>
                              ) : (
                                <>
                                  <UserPlus size={18} />
                                  Folgen
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Vereinsinformationen */}
                    {searchPlayerResults.clubs && searchPlayerResults.clubs.length > 0 && (
                      <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#0369a1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          🏢 Aktiv bei
                        </div>
                        {searchPlayerResults.clubs.map((club, idx) => (
                          <div key={club.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: idx < searchPlayerResults.clubs.length - 1 ? '0.75rem' : '0',
                            paddingBottom: idx < searchPlayerResults.clubs.length - 1 ? '0.75rem' : '0',
                            borderBottom: idx < searchPlayerResults.clubs.length - 1 ? '1px solid #bae6fd' : 'none'
                          }}>
                            {club.logo_url ? (
                              <img 
                                src={club.logo_url} 
                                alt={club.name}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid #e5e7eb'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '0.875rem'
                              }}>
                                {club.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: '600',
                                color: '#1f2937',
                                fontSize: '0.95rem'
                              }}>
                                {club.name}
                              </div>
                              <div style={{
                                fontSize: '0.8rem',
                                color: '#6b7280',
                                marginTop: '0.125rem'
                              }}>
                                {club.teams.length} {club.teams.length === 1 ? 'Mannschaft' : 'Mannschaften'} · {club.teams.map(t => `${t.category} ${t.team_name || ''}`).join(', ')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Saison-Information */}
                    <div style={{
                      marginBottom: '1.5rem',
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>📅</span>
                      <span style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        Saison: {(() => {
                          const currentMonth = new Date().getMonth();
                          const currentYear = new Date().getFullYear();
                          if (currentMonth >= 4 && currentMonth <= 7) {
                            return `Sommer ${currentYear}`;
                          } else if (currentMonth >= 8) {
                            const nextYear = currentYear + 1;
                            return `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
                          } else {
                            const prevYear = currentYear - 1;
                            return `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
                          }
                        })()}
                      </span>
                    </div>
                    
                    {/* Statistiken Dashboard */}
                    {searchPlayerResults.matches.length > 0 && (() => {
                      // Berechne Siege und Niederlagen
                      const matchResults = searchPlayerResults.matches.map(m => {
                        const isPlayerInHomeTeam = m.home_player_id === searchPlayerResults.player.id || 
                                                   m.home_player1_id === searchPlayerResults.player.id || 
                                                   m.home_player2_id === searchPlayerResults.player.id;
                        const winner = m.winner || calculateMatchWinner(m);
                        const won = isPlayerInHomeTeam ? winner === 'home' : winner === 'guest';
                        return { ...m, won, matchDate: m.matchDate };
                      });
                      
                      const wins = matchResults.filter(m => m.won).length;
                      const losses = matchResults.filter(m => !m.won).length;
                      const winRate = searchPlayerResults.matches.length > 0 
                        ? Math.round((wins / searchPlayerResults.matches.length) * 100) 
                        : 0;
                      
                      // Berechne aktuelle Form (letzte 5 Spiele)
                      const last5Matches = [...matchResults].reverse().slice(0, 5);
                      const recentWins = last5Matches.filter(m => m.won).length;
                      const recentLosses = last5Matches.filter(m => !m.won).length;
                      const recentWinRate = last5Matches.length > 0 ? (recentWins / last5Matches.length) * 100 : 0;
                      
                      // Form-Tag basierend auf letzten 5 Spielen
                      let formTag = { text: 'Stabil', color: '#6b7280', bg: '#f3f4f6', icon: '➡️' };
                      if (recentWinRate >= 80) {
                        formTag = { text: 'In Top-Form', color: '#059669', bg: '#d1fae5', icon: '🔥' };
                      } else if (recentWinRate >= 60) {
                        formTag = { text: 'Gut in Form', color: '#10b981', bg: '#d1fae5', icon: '📈' };
                      } else if (recentWinRate >= 40) {
                        formTag = { text: 'Stabil', color: '#6b7280', bg: '#f3f4f6', icon: '➡️' };
                      } else if (recentWinRate >= 20) {
                        formTag = { text: 'Aufbauend', color: '#f59e0b', bg: '#fef3c7', icon: '📉' };
                      } else {
                        formTag = { text: 'Schwacher Lauf', color: '#dc2626', bg: '#fee2e2', icon: '⚠️' };
                      }
                      
                      // LK-Berechnungslogik (aus Dashboard.jsx)
                      const parseLK = (lkString) => {
                        if (!lkString) return null;
                        const normalized = String(lkString).trim()
                          .replace(/^LK\s*/i, '')
                          .replace(/,/g, '.')
                          .replace(/\s+/g, '');
                        const parsed = parseFloat(normalized);
                        return isNaN(parsed) || parsed < 1 || parsed > 30 ? null : parsed;
                      };
                      
                      const pointsP = (diff) => {
                        if (diff <= -4) return 10;
                        if (diff >= 4) return 110;
                        if (diff < 0) {
                          const t = (diff + 4) / 4;
                          return 10 + 40 * (t * t);
                        }
                        const t = diff / 4;
                        return 50 + 60 * (t * t);
                      };
                      
                      const hurdleH = (ownLK) => 50 + 12.5 * (25 - ownLK);
                      
                      const calcMatchImprovement = (ownLK, oppLK, isTeamMatch = true) => {
                        const AGE_CLASS_FACTOR = 0.8; // M40/H40
                        const diff = ownLK - oppLK;
                        const P = pointsP(diff);
                        const A = AGE_CLASS_FACTOR;
                        const H = hurdleH(ownLK);
                        let improvement = (P * A) / H;
                        if (isTeamMatch) improvement *= 1.1;
                        return Math.max(0, Number(improvement.toFixed(3)));
                      };
                      
                      // Start-LK des Spielers
                      const playerLKStr = searchPlayerResults.player.current_lk || searchPlayerResults.player.season_start_lk || searchPlayerResults.player.ranking || '25';
                      let currentLK = parseLK(playerLKStr) || 25;
                      
                      // Berechne LK-Kurve: Starte mit der Start-LK und berechne für jedes Match
                      const lkCurveData = [];
                      let startLK = currentLK; // Speichere Start-LK
                      
                      // Gehe chronologisch durch die Matches (von alt nach neu)
                      [...matchResults].forEach((match, idx) => {
                        const isPlayerInHomeTeam = match.home_player_id === searchPlayerResults.player.id || 
                                                   match.home_player1_id === searchPlayerResults.player.id || 
                                                   match.home_player2_id === searchPlayerResults.player.id;
                        
                        const playerLKBefore = currentLK;
                        let playerLKAfter = currentLK;
                        
                        if (match.won) {
                          // Berechne LK-Verbesserung nur bei Sieg
                          let opponentLK = 25; // Fallback
                          
                          if (match.match_type === 'Einzel') {
                            // Für Einzel: verwende opponentPlayerLK wenn verfügbar
                            if (match.opponentPlayerLK) {
                              const parsedOppLK = parseLK(match.opponentPlayerLK);
                              if (parsedOppLK) opponentLK = parsedOppLK;
                            }
                            
                            if (opponentLK !== 25) {
                              const lkImprovement = calcMatchImprovement(currentLK, opponentLK, true);
                              playerLKAfter = Math.max(0, currentLK - lkImprovement);
                            }
                          } else {
                            // Für Doppel: verwende Durchschnitts-LK der Gegner
                            if (match.opponent1LK && match.opponent2LK) {
                              const opp1LK = parseLK(match.opponent1LK) || 25;
                              const opp2LK = parseLK(match.opponent2LK) || 25;
                              opponentLK = (opp1LK + opp2LK) / 2;
                              
                              // Bei Doppel: Verbesserung auf Durchschnitts-LK anwenden
                              // Vereinfacht: verwende Spieler-LK direkt
                              const lkImprovement = calcMatchImprovement(currentLK, opponentLK, true);
                              playerLKAfter = Math.max(0, currentLK - lkImprovement);
                            }
                          }
                        }
                        
                        lkCurveData.push({
                          x: idx,
                          lk: playerLKAfter,
                          lkBefore: playerLKBefore,
                          won: match.won,
                          matchDate: match.matchDate
                        });
                        
                        // Aktualisiere currentLK für nächstes Match
                        currentLK = playerLKAfter;
                      });
                      
                      // Invertiere LK für Anzeige (niedrigere LK = besser = höher im Chart)
                      // Normalisiere auf 0-100 Bereich, invertiert (niedrigste LK = 100, höchste LK = 0)
                      const allLKs = lkCurveData.map(d => d.lk);
                      const minLK = Math.min(...allLKs, startLK);
                      const maxLK = Math.max(...allLKs, startLK);
                      const lkRange = maxLK - minLK || 1;
                      
                      const normalizedData = lkCurveData.map(d => ({
                        ...d,
                        normalizedY: 100 - ((d.lk - minLK) / lkRange) * 100 // Invertiert: niedrigere LK = höher
                      }));
                      
                      // Berechne Aktivität (wann war der Spieler zuletzt in der App aktiv)
                      const hasUserAccount = searchPlayerResults.player.user_id !== null && searchPlayerResults.player.user_id !== undefined;
                      let activityText = '';
                      let activityNumber = '';
                      let activityIcon = '💤';
                      let lastActiveTime = '';
                      
                      if (!hasUserAccount) {
                        // Spieler ist nicht in der App angemeldet
                        activityText = 'Nicht in App aktiv';
                        activityNumber = '–';
                        activityIcon = '🚫';
                        lastActiveTime = '';
                      } else {
                        // Spieler ist angemeldet - berechne Zeit seit letzter Aktivität
                        const lastActive = searchPlayerResults.player.updated_at || searchPlayerResults.player.created_at;
                        const lastActiveDate = lastActive ? new Date(lastActive) : new Date();
                        const now = new Date();
                        const daysSinceActive = Math.floor((now - lastActiveDate) / (1000 * 60 * 60 * 24));
                        
                        // Formatiere genaue Zeit für Anzeige
                        const formatTime = (date) => {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          return `${hours}:${minutes} Uhr`;
                        };
                        
                        const formatDate = (date) => {
                          const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                          return days[date.getDay()];
                        };
                        
                        if (daysSinceActive === 0) {
                          activityText = 'Heute';
                          activityNumber = '0';
                          activityIcon = '⚡';
                          lastActiveTime = formatTime(lastActiveDate);
                        } else if (daysSinceActive === 1) {
                          activityText = 'Gestern';
                          activityNumber = '1';
                          activityIcon = '⚡';
                          lastActiveTime = `${formatDate(lastActiveDate)} ${formatTime(lastActiveDate)}`;
                        } else if (daysSinceActive < 7) {
                          activityText = 'Vor Tagen';
                          activityNumber = daysSinceActive.toString();
                          activityIcon = '📱';
                          lastActiveTime = `${formatDate(lastActiveDate)} ${formatTime(lastActiveDate)}`;
                        } else if (daysSinceActive < 30) {
                          const weeks = Math.floor(daysSinceActive / 7);
                          activityText = weeks === 1 ? 'Vor Woche' : 'Vor Wochen';
                          activityNumber = weeks.toString();
                          activityIcon = '📱';
                          lastActiveTime = lastActiveDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + formatTime(lastActiveDate);
                        } else if (daysSinceActive < 365) {
                          const months = Math.floor(daysSinceActive / 30);
                          activityText = months === 1 ? 'Vor Monat' : 'Vor Monaten';
                          activityNumber = months.toString();
                          activityIcon = '💤';
                          lastActiveTime = lastActiveDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        } else {
                          const years = Math.floor(daysSinceActive / 365);
                          activityText = years === 1 ? 'Vor Jahr' : 'Vor Jahren';
                          activityNumber = years.toString();
                          activityIcon = '💤';
                          lastActiveTime = lastActiveDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                      }
                      
                      // Bestimme Win-Rate für Form-Badge
                      const formWinRate = Math.round(recentWinRate);
                      
                      // Berechne Trend für Form-Badge (Vergleich mit vorherigen 5 Spielen)
                      let formTrend = null;
                      if (matchResults.length >= 10) {
                        const previous5Matches = [...matchResults].reverse().slice(5, 10);
                        const previousWins = previous5Matches.filter(m => m.won).length;
                        const previousWinRate = (previousWins / previous5Matches.length) * 100;
                        
                        if (recentWinRate > previousWinRate + 10) {
                          formTrend = '⬆️'; // Verbessert
                        } else if (recentWinRate < previousWinRate - 10) {
                          formTrend = '⬇️'; // Verschlechtert
                        } else {
                          formTrend = '➡️'; // Stabil
                        }
                      }
                      
                      return (
                        <>
                          {/* 3D Badges */}
                        <div style={{
                            marginBottom: '1.5rem',
                          display: 'flex',
                            gap: '1.5rem',
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                          }}>
                            {/* Badge: Aktuelle Form (Verbessert) */}
                            <div className="badge-3d-card theme-primary">
                              <div className="badge-3d-circle-container">
                                <div className="badge-3d-circle">
                                  <span className="badge-3d-icon">
                                    {formTag.icon}
                                  </span>
                                </div>
                              </div>
                              <div className="badge-3d-number">{formWinRate}%</div>
                          <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                textAlign: 'center',
                                marginTop: '0.5rem'
                              }}>
                                {formTag.text}
                              </div>
                              {/* Win-Loss Record */}
                              <div style={{
                                fontSize: '0.65rem',
                                color: '#9ca3af',
                                textAlign: 'center',
                                marginTop: '0.25rem',
                                fontWeight: '600'
                              }}>
                                {recentWins} Sieg{recentWins !== 1 ? 'e' : ''}, {recentLosses} Niederlage{recentLosses !== 1 ? 'n' : ''} {formTrend && <span style={{ marginLeft: '0.25rem' }}>{formTrend}</span>}
                              </div>
                            </div>
                            
                            {/* Badge: Aktivität (mit Zeit) */}
                            <div className="badge-3d-card theme-secondary">
                              <div className="badge-3d-circle-container">
                                <div className="badge-3d-circle">
                                  <span className="badge-3d-icon">
                                    {activityIcon}
                                  </span>
                                </div>
                              </div>
                              <div className="badge-3d-number">{activityNumber}</div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                textAlign: 'center',
                                marginTop: '0.5rem',
                                lineHeight: 1.3
                              }}>
                                {activityText}
                              </div>
                              {/* Genauere Zeit-Anzeige */}
                              {lastActiveTime && (
                                <div style={{
                                  fontSize: '0.6rem',
                                  color: '#9ca3af',
                                  textAlign: 'center',
                                  marginTop: '0.25rem',
                                  fontWeight: '500'
                                }}>
                                  {lastActiveTime}
                                </div>
                              )}
                            </div>
                            
                            {/* Badge: Ranking */}
                            <div className="badge-3d-card theme-warning">
                              <div className="badge-3d-circle-container">
                                <div className="badge-3d-circle">
                                  <span className="badge-3d-icon">
                                    🏆
                                  </span>
                                </div>
                              </div>
                              <div className="badge-3d-number">
                                {searchPlayerResults.bestRank !== null && searchPlayerResults.bestRank !== undefined ? `#${searchPlayerResults.bestRank}` : '–'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                textAlign: 'center',
                                marginTop: '0.5rem',
                                lineHeight: 1.3
                              }}>
                                {searchPlayerResults.bestRank !== null && searchPlayerResults.bestRank !== undefined ? (
                                  searchPlayerResults.bestRankTeam ? (
                                    <>
                                      {searchPlayerResults.bestRankTeam.category}
                                      {searchPlayerResults.bestRankTeam.team_name ? ` ${searchPlayerResults.bestRankTeam.team_name}` : ''}
                                    </>
                                  ) : 'Team-Ranking'
                                ) : 'Kein Ranking'}
                              </div>
                            </div>
                            
                            {/* Badge: Tennismates/Follower */}
                            <div className="badge-3d-card theme-danger">
                              <div className="badge-3d-circle-container">
                                <div className="badge-3d-circle">
                                  <span className="badge-3d-icon">
                                    👥
                                  </span>
                                </div>
                              </div>
                              <div className="badge-3d-number">
                                {(searchPlayerResults.tennismateCount || 0) > 0 
                                  ? (searchPlayerResults.tennismateCount || 0)
                                  : '–'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                textAlign: 'center',
                                marginTop: '0.5rem',
                                lineHeight: 1.3
                              }}>
                                {(searchPlayerResults.tennismateCount || 0) > 0 
                                  ? `${searchPlayerResults.tennismateCount} Follower`
                                  : 'Keine Follower'}
                              </div>
                            </div>
                          </div>
                          
                          {/* LK-Formkurve */}
                          {normalizedData.length > 1 && (
                            <div style={{
                              marginBottom: '1.5rem',
                              padding: '1rem',
                              background: '#f9fafb',
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                              }}>
                                📊 LK-Formkurve ({matchResults.length} Spiele)
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginBottom: '1rem'
                              }}>
                                Start: LK {startLK.toFixed(1)} → Aktuell: LK {currentLK.toFixed(1)} ({currentLK < startLK ? '📈' : currentLK > startLK ? '📉' : '➡️'} {currentLK < startLK ? (startLK - currentLK).toFixed(1) : currentLK > startLK ? (currentLK - startLK).toFixed(1) : '0.0'})
                              </div>
                              <svg 
                                width="100%" 
                                height="140" 
                                viewBox="0 0 400 140" 
                                style={{ 
                                  overflow: 'visible',
                                  background: 'white',
                                  borderRadius: '8px'
                                }}
                              >
                                {/* Y-Achse Labels (LK-Werte) */}
                                <text x="15" y="20" fontSize="9" fill="#6b7280" textAnchor="end">{maxLK.toFixed(1)}</text>
                                <text x="15" y="70" fontSize="9" fill="#6b7280" textAnchor="end">{((minLK + maxLK) / 2).toFixed(1)}</text>
                                <text x="15" y="120" fontSize="9" fill="#6b7280" textAnchor="end">{minLK.toFixed(1)}</text>
                                
                                {/* Grid-Linien (horizontal) */}
                                <line x1="20" y1="20" x2="380" y2="20" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                                <line x1="20" y1="70" x2="380" y2="70" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                                <line x1="20" y1="120" x2="380" y2="120" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                                
                                {/* LK-Kurve Linie */}
                                <polyline
                                  points={normalizedData.map((d, idx) => {
                                    const x = 20 + (idx / (normalizedData.length - 1 || 1)) * 360;
                                    const y = 20 + (d.normalizedY / 100) * 100;
                                    return `${x},${y}`;
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                
                                {/* Füllung unter der Kurve */}
                                <polygon
                                  points={`20,120 ${normalizedData.map((d, idx) => {
                                    const x = 20 + (idx / (normalizedData.length - 1 || 1)) * 360;
                                    const y = 20 + (d.normalizedY / 100) * 100;
                                    return `${x},${y}`;
                                  }).join(' ')} 380,120`}
                                  fill="url(#lkGradient)"
                                  opacity="0.2"
                                />
                                <defs>
                                  <linearGradient id="lkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                                  </linearGradient>
                                </defs>
                                
                                {/* Punkte für jedes Spiel mit LK-Wert */}
                                {normalizedData.map((d, idx) => {
                                  const x = 20 + (idx / (normalizedData.length - 1 || 1)) * 360;
                                  const y = 20 + (d.normalizedY / 100) * 100;
                                  return (
                                    <g key={idx}>
                                      <circle
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill={d.won ? '#10b981' : '#ef4444'}
                                        stroke="white"
                                        strokeWidth="2"
                                      />
                                      {/* LK-Wert als Tooltip (optional, nur bei Hover sichtbar) */}
                                      <text
                                        x={x}
                                        y={y - 8}
                                        fontSize="8"
                                        fill="#6b7280"
                                        textAnchor="middle"
                                        fontWeight="600"
                                      >
                                        {d.lk.toFixed(1)}
                                      </text>
                                    </g>
                                  );
                                })}
                                
                                {/* Start/Ende Labels */}
                                <text x="20" y="135" fontSize="10" fill="#6b7280" textAnchor="middle">Start</text>
                                <text x="380" y="135" fontSize="10" fill="#6b7280" textAnchor="middle">Jetzt</text>
                                
                                {/* Pfeil für bessere LK (nach oben) */}
                                <text x="395" y="15" fontSize="12" fill="#10b981">↑</text>
                                <text x="390" y="25" fontSize="8" fill="#6b7280">besser</text>
                              </svg>
                            </div>
                          )}
                          
                          {/* Statistiken Cards */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '1rem'
                          }}>
                            <div style={{
                              padding: '1rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              borderRadius: '12px',
                            color: 'white',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Einsätze
                          </div>
                          <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                lineHeight: 1
                              }}>
                                {searchPlayerResults.matches.length}
                              </div>
                            </div>
                            
                            <div style={{
                              padding: '1rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              borderRadius: '12px',
                            color: 'white',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Siege
                          </div>
                          <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                lineHeight: 1
                              }}>
                                {wins}
                              </div>
                            </div>
                            
                            <div style={{
                              padding: '1rem',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              borderRadius: '12px',
                            color: 'white',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Niederlagen
                          </div>
                              <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                lineHeight: 1
                              }}>
                                {losses}
                        </div>
                            </div>
                            
                            <div style={{
                              padding: '1rem',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              borderRadius: '12px',
                              color: 'white',
                              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Siegquote
                              </div>
                              <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                lineHeight: 1
                              }}>
                                {winRate}%
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Matches */}
                  {searchPlayerResults.matches.length > 0 ? (
                    <div className="season-matches">
                      {searchPlayerResults.matches.map((result, idx) => {
                        const matchWinner = result.winner || calculateMatchWinner(result);
                        const isPlayerInHomeTeam = result.home_player_id === searchPlayerResults.player.id || 
                                                   result.home_player1_id === searchPlayerResults.player.id || 
                                                   result.home_player2_id === searchPlayerResults.player.id;
                        const isWinner = isPlayerInHomeTeam 
                          ? matchWinner === 'home' 
                          : matchWinner === 'guest';
                        const setsCount = (result.set3_home > 0 || result.set3_guest > 0) ? 3 : 2;
                        const opponentFaces = ['/face1.jpg', '/face1.png', '/face2.jpg', '/face3.jpg', '/face4.jpg', '/face5.jpg'];
                        
                        return (
                          <article key={idx} className="ms-card">
                            <header className="ms-head">
                              <h2 className="ms-title">
                                {result.match_type === 'Einzel' ? '👤 Einzel' : '👥 Doppel'} vs. {result.match_type === 'Einzel' ? (result.opponentPlayerName || result.opponent) : (result.opponent1Name && result.opponent2Name ? `${result.opponent1Name} / ${result.opponent2Name}` : (result.opponent1Name || result.opponent))}
                              </h2>
                              {/* Team-Informationen */}
                              <div style={{
                                marginTop: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                              }}>
                                <div>
                                  <span style={{ fontWeight: '600' }}>Für:</span> {result.playerTeam || 'Unbekannt'}
                                </div>
                                <div>
                                  <span style={{ fontWeight: '600' }}>Gegen:</span> {result.opponent || 'Unbekannt'}
                                </div>
                              </div>
                            </header>
                            <hr className="ms-divider" />
                            <section className="ms-rows">
                              <div className={`ms-team-group ${isWinner ? 'winner-row' : 'loser-row'}`}>
                                <div className="ms-row" style={{ gridTemplateColumns: `auto minmax(0, 1fr) repeat(${setsCount}, 38px)` }}>
                                  <div className="ms-avatar">
                                    <img src={searchPlayerResults.player.profile_image || '/app-icon.jpg'} alt={searchPlayerResults.player.name} />
                                  </div>
                                  <div className="ms-left">
                                    <span className="ms-name">{searchPlayerResults.player.name}</span>
                                    <span className="ms-meta">
                                      {searchPlayerResults.player.current_lk || searchPlayerResults.player.season_start_lk || searchPlayerResults.player.ranking || ''}
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
                  ) : (
                    <div className="no-results">
                      <div style={{ fontSize: '3rem' }}>🎾</div>
                      <h3>Keine Ergebnisse</h3>
                      <p>Für diesen Spieler wurden noch keine Ergebnisse in dieser Saison gefunden.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-results">
                  <div style={{ fontSize: '3rem' }}>🎾</div>
                  <h3>Keine Ergebnisse gefunden</h3>
                  <p>Es konnten keine Ergebnisse für diesen Spieler geladen werden.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✅ NEU: Mein(e) Mannschaft(en) - nur Teams mit Spieler-Zuordnung (nur wenn keine aktive Suche) */}
      {!activeSearchView && playerTeams && playerTeams.length > 0 && viewMode === 'mannschaft' && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">Meine Mannschaft(en)</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
              {playerTeams.length} {playerTeams.length === 1 ? 'Mannschaft' : 'Mannschaften'}
            </div>
          </div>
          
          <div className="season-content">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              {playerTeams.map(team => {
                const isSelected = selectedTeamId === team.id || selectedClubTeamId === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setSelectedClubTeamId(null);
                      setTeamViewTab('spiele');
                    }}
                    style={{
                      padding: '1rem',
                      background: isSelected ? '#eff6ff' : 'white',
                      border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{
                      fontWeight: '600',
                      color: '#1f2937',
                      fontSize: '0.95rem',
                      marginBottom: '0.25rem'
                    }}>
                      {team.category} {team.team_name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {team.club_name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEU: Mein(e) Verein(e) - mit eingeklappter Bilanz (nur wenn keine aktive Suche) */}
      {!activeSearchView && clubOverview && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">Mein(e) Verein(e)</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
              {clubOverview.totalTeams} {clubOverview.totalTeams === 1 ? 'Mannschaft' : 'Mannschaften'}
            </div>
          </div>
          
          <div className="season-content">
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                {clubOverview.clubName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {clubOverview.totalMatches} {clubOverview.totalMatches === 1 ? 'Spiel' : 'Spiele'} in dieser Saison
              </div>
            </div>
            
            {/* Bilanz eingeklappt */}
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontSize: '0.75rem', 
                fontWeight: '600', 
                color: '#6b7280',
                padding: '0.5rem',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                listStyle: 'none'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                📊 Bilanz anzeigen
              </summary>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                      {clubOverview.totalWins}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#047857', marginTop: '0.25rem' }}>
                      SIEGE
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>
                      {clubOverview.totalDraws}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400e', marginTop: '0.25rem' }}>
                      REMIS
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                      {clubOverview.totalLosses}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#991b1b', marginTop: '0.25rem' }}>
                      NIEDERLAGEN
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>
                      {clubOverview.totalPlayed > 0 ? Math.round((clubOverview.totalWins / clubOverview.totalPlayed) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1e40af', marginTop: '0.25rem' }}>
                      SIEGQUOTE
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
      
      {/* ✅ NEU: Tab-Navigation und Team-Ansicht für ausgewählte Mannschaft (nur wenn keine aktive Suche) */}
      {!activeSearchView && (selectedTeamId || selectedClubTeamId) && viewMode === 'mannschaft' && (
        <>
          {/* Tab-Navigation für Liga-Spielplan */}
          <div className="fade-in" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
              <button
                onClick={() => setTeamViewTab('spiele')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: teamViewTab === 'spiele' 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                    : 'white',
                  color: teamViewTab === 'spiele' ? 'white' : '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                📊 Spiele
              </button>
              <button
                onClick={() => setTeamViewTab('tabelle')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: teamViewTab === 'tabelle' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'white',
                  color: teamViewTab === 'tabelle' ? 'white' : '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                📈 Tabelle
              </button>
            </div>
          </div>
        </>
      )}

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
          
          // Verwende leagueMatches aus externalLeagueMatches, falls vorhanden
          const effectiveLeagueMatches = selectedClubTeamId && externalLeagueMatches[selectedClubTeamId]
            ? externalLeagueMatches[selectedClubTeamId]
            : leagueMatches;
          
          return (
            <TeamView 
              teamId={selectedClubTeamId || selectedTeamId}
              matches={filteredMatches}
              leagueMatches={effectiveLeagueMatches}
              leagueMeta={leagueMeta}
              playerTeamIds={playerTeams.map(team => team.id)}
              display={display}
              activeTab={teamViewTab}
              onTabChange={setTeamViewTab}
            />
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
    </div>
  );
};

export default Results;



