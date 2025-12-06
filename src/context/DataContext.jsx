import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import computeStandings, { buildTeamLabel } from '../utils/standings';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { isAuthenticated, loading: authLoading, player } = useAuth();
  
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leagueStandings, setLeagueStandings] = useState([]);
  const [leagueMatches, setLeagueMatches] = useState([]);
  const [leagueMeta, setLeagueMeta] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const parseIntSafe = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  // Multi-Team Support
  const [playerTeams, setPlayerTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [currentPlayerName, setCurrentPlayerName] = useState(null);
  
  const configured = isSupabaseConfigured();

  // Initial data load - NUR wenn User authentifiziert ist
  useEffect(() => {
    // Warte bis Auth-Check abgeschlossen ist
    if (authLoading) {
      return;
    }

    // Nur laden wenn User authentifiziert ist
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    console.log('🔵 DataContext - User authenticated, loading data...');
    
    // LOCAL Storage wurde für Onboarding-Testing verwendet, ist jetzt aber deprecated
    // Lösche alte LOCAL Daten falls vorhanden
    const localPlayerData = localStorage.getItem('localPlayerData');
    const localOnboardingComplete = localStorage.getItem('localOnboardingComplete');
    
    if (localPlayerData || localOnboardingComplete) {
      console.log('🗑️ Removing deprecated local storage data...');
      localStorage.removeItem('localPlayerData');
      localStorage.removeItem('localOnboardingComplete');
    }
    
    if (!configured) {
      console.warn('⚠️ Supabase nicht konfiguriert - Verwende lokale Daten');
      setLoading(false);
      return;
    }

    loadAllData();
    setupRealtimeSubscriptions();
    
    // Listen für manuelle Player-Reloads (z.B. nach LK-Berechnung)
    const handleReloadPlayers = () => {
      console.log('🔄 Manual player reload triggered');
      loadPlayers();
    };
    
    // Listen für manuelle Team-Reloads
    const handleReloadTeams = (event) => {
      const playerId = event.detail?.playerId;
      console.log('🔄 Team reload event received:', { event, playerId });
      if (playerId) {
        console.log('🔄 Manual team reload triggered for player:', playerId);
        loadPlayerTeams(playerId);
      } else {
        console.warn('⚠️ No playerId in reloadTeams event');
      }
    };
    
    window.addEventListener('reloadPlayers', handleReloadPlayers);
    window.addEventListener('reloadTeams', handleReloadTeams);
    
    return () => {
      window.removeEventListener('reloadPlayers', handleReloadPlayers);
      window.removeEventListener('reloadTeams', handleReloadTeams);
    };
  }, [configured, isAuthenticated, authLoading, player?.id]); // player?.id hinzugefügt für bessere Dependency

  // Reload TeamInfo wenn selectedTeamId sich ändert (Matches werden nicht gefiltert)
  useEffect(() => {
    if (selectedTeamId && configured) {
      console.log('🔄 Team changed, reloading team info for:', selectedTeamId);
      loadTeamInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  // Lade alle Daten
  const loadAllData = async () => {
    try {
      // Verwende aktuellen Player aus AuthContext
      const currentPlayerId = player?.id;
      
      if (currentPlayerId) {
        console.log('🔵 Loading data for player:', currentPlayerId);
        // Lade zuerst Player-Teams - loadMatches wird intern aufgerufen!
        await loadPlayerTeams(currentPlayerId);
      } else {
        console.log('⚠️ No player ID available, loading data without player context');
      }
      
      // 🔧 FIX: loadMatches wird NICHT mehr hier aufgerufen!
      // Es wird jetzt IN loadPlayerTeams aufgerufen (nach dem playerTeams gesetzt wurde)
      
      // Rest parallel laden
      await Promise.all([
        loadPlayers(),
        loadTeamInfo()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lade Player-Teams (für Multi-Team Support)
  const loadPlayerTeams = async (playerId) => {
    try {
      console.log('🔍 Loading teams for player:', playerId);
      
      // Lade Spieler-Name für Test-Daten-Check
      const { data: playerData } = await supabase
        .from('players_unified')
        .select('name')
        .eq('id', playerId)
        .single();
      
      const playerName = playerData?.name || '';
      console.log('👤 Player name:', playerName);
      setCurrentPlayerName(playerName); // Speichere für Test-Daten-Filter
      
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team_info (
            id,
            team_name,
            club_name,
            category,
            region,
            tvm_link,
            club_id
          )
        `)
        .eq('player_id', playerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error loading player teams:', error);
        return;
      }

      console.log('✅ Player teams loaded from DB:', data);
      
      // Lade team_seasons für jedes Team
      // WICHTIG: Unterstütze ALLE möglichen Season-Werte ('winter_25_26', 'Winter 2025/26', etc.)
      const teamsWithSeasons = await Promise.all(
        data.map(async (pt) => {
          console.log(`📊 Loading data for team: ${pt.team_info.team_name || pt.team_info.category} (ID: ${pt.team_info.id})`);
          
          // Lade team_seasons - Berechne aktuelle Saison dynamisch
          const now = new Date();
          const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
          const currentYear = now.getFullYear();
          
          let currentSeason;
          if (currentMonth >= 4 && currentMonth <= 7) {
            currentSeason = `Sommer ${currentYear}`;
          } else {
            if (currentMonth >= 8) {
              const nextYear = currentYear + 1;
              currentSeason = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
            } else {
              const prevYear = currentYear - 1;
              currentSeason = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
            }
          }
          
          console.log(`🔍 Querying '${currentSeason}' for ${pt.team_info.team_name || pt.team_info.category}`);
          
          let { data: seasonData } = await supabase
            .from('team_seasons')
            .select('*')
            .eq('team_id', pt.team_info.id)
            .eq('season', currentSeason)
            .eq('is_active', true)
            .maybeSingle();
          
          console.log(`✅ Found season data for '${currentSeason}':`, seasonData);
          
          // Lade Anzahl aktiver Spieler für dieses Team
          const { count: playerCount } = await supabase
            .from('team_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', pt.team_info.id)
            .eq('is_active', true);
          
          const result = {
            ...pt.team_info,
            is_primary: pt.is_primary,
            role: pt.role,
            // Füge team_seasons Daten hinzu
            league: seasonData?.league || null,
            group_name: seasonData?.group_name || null,
            team_size: seasonData?.team_size || null,
            season: seasonData?.season || null,
            player_count: playerCount || null
          };
          
          console.log(`✅ Final data for ${pt.team_info.team_name || pt.team_info.category}:`, {
            league: result.league,
            group_name: result.group_name,
            player_count: result.player_count
          });
          
          return result;
        })
      );
      
      let teams = teamsWithSeasons;
      
      console.log('🔍 Teams with seasons data:', teams);
      
      // TEST-DATEN deaktiviert für sauberes Development
      
      setPlayerTeams(teams);
      console.log('✅ playerTeams state updated with', teams.length, 'teams');
      
      // 🔧 FIX: Lade Matches NACHDEM playerTeams gesetzt wurde!
      console.log('🔄 Now loading matches with team filter...');
      await loadMatches(teams); // Übergebe teams direkt!
      
      // 🔧 FIX: Lade auch Players für Spieler-Ansicht!
      console.log('🔄 Now loading players...');
      await loadPlayers();
      
      // Setze Primary-Team als Default (für Results.jsx Filterung)
      const primaryTeam = teams.find(t => t.is_primary) || teams[0];
      if (primaryTeam && !selectedTeamId) {
        console.log('✅ Primary team set as default:', primaryTeam.club_name, primaryTeam.team_name);
        setSelectedTeamId(primaryTeam.id);
      }
      
    } catch (error) {
      console.error('Error in loadPlayerTeams:', error);
    }
  };

  // Lade Matches (NUR für die Teams des Spielers!)
  const loadMatches = async (teamsToFilter = null) => {
    try {
      // 🔒 FILTERUNG: Verwende übergebene teams ODER state playerTeams
      const teamsForFilter = teamsToFilter || playerTeams;
      const playerTeamIds = teamsForFilter.map(t => t.id);
      
      // console.log('🔍 loadMatches called with:', { teamsToFilterParam: teamsToFilter?.length || 0, playerTeamIds });
      
      if (playerTeamIds.length === 0) {
        console.log('⚠️ No teams found for player, no matches to load');
        setMatches([]);
        return;
      }

      // console.log('🔒 Loading matches for player teams:', playerTeamIds);

      // Versuche zuerst matchdays zu laden (neue Struktur)
      let data = null;
      let error = null;
      
      try {
        const result = await supabase
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
            ),
            match_availability (
              id,
              player_id,
              status,
              comment,
              player:players_unified!match_availability_player_id_fkey (
                id,
                name,
                current_lk,
                season_start_lk
              )
            )
          `)
          .or(`home_team_id.in.(${playerTeamIds.join(',')}),away_team_id.in.(${playerTeamIds.join(',')})`)
          .order('match_date', { ascending: true });
        
        data = result.data;
        error = result.error;
      } catch (err) {
        console.warn('⚠️ matchdays Tabelle existiert noch nicht, versuche matches:', err);
        
        // Fallback: Nutze alte matches Tabelle
        const result = await supabase
          .from('matches')
          .select(`
            *,
            team_info!matches_team_id_fkey (
              id,
              club_name,
              team_name,
              category
            ),
            match_availability (
              id,
              player_id,
              status,
              comment,
              players_unified!match_availability_player_id_fkey (
                id,
                name,
                current_lk,
                season_start_lk
              )
            )
          `)
          .in('team_id', playerTeamIds)
          .order('match_date', { ascending: true });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error loading matches:', error);
        return;
      }

      console.log('✅ Matches loaded from DB (filtered by player teams):', data?.length || 0, 'matches');
      console.log('🔍 Player Team IDs used for filter:', playerTeamIds);
      console.log('📋 Matchdays details:', data?.map(m => ({
        id: m.id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_team: m.home_team?.club_name,
        away_team: m.away_team?.club_name,
        match_date: m.match_date,
        matchMatchesFilter: playerTeamIds.includes(m.home_team_id) || playerTeamIds.includes(m.away_team_id)
      })));

      // ✅ NEU: Lade match_results und berechne scores
      const matchIds = data.map(m => m.id);
      let matchScoresMap = {};
      
      if (matchIds.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('match_results')
          .select('match_id, matchday_id, status, winner')
          .or(matchIds.map(id => `matchday_id.eq.${id}`).join(','));
        
        if (!resultsError && resultsData) {
          // Alle abgeschlossenen Match-Status (nicht nur 'completed')
          const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
          
          // Berechne scores pro match
          resultsData.forEach(result => {
            const id = result.matchday_id || result.match_id;
            if (!matchScoresMap[id]) {
              matchScoresMap[id] = { home_wins: 0, away_wins: 0, completed: 0 };
            }
            
            if (FINISHED_STATUSES.includes(result.status)) {
              matchScoresMap[id].completed++;
              if (result.winner === 'home') {
                matchScoresMap[id].home_wins++;
              } else if (result.winner === 'guest' || result.winner === 'away') {
                matchScoresMap[id].away_wins++;
              }
            }
          });
          
          console.log('✅ Match results aggregated:', Object.keys(matchScoresMap).length, 'matches with results');
        }
      }

      // Transformiere Daten - handle sowohl matchdays als auch matches
      let transformedMatches = data.map(matchday => {
        // ✅ Füge aggregierte Scores hinzu (überschreibe DB-Werte falls vorhanden)
        const scores = matchScoresMap[matchday.id];
        if (scores) {
          matchday.home_score = scores.home_wins;
          matchday.away_score = scores.away_wins;
        }
        
        // Prüfe ob es matchdays (neue Struktur) oder matches (alte Struktur) ist
        const isNewStructure = matchday.home_team_id || matchday.away_team_id;
        
        if (isNewStructure) {
          // Neue Struktur: matchdays mit home_team_id und away_team_id
          // BESTIMME: Ist unser Team das Home-Team oder Away-Team?
          const isOurTeamHome = matchday.home_team && matchday.home_team.id && playerTeamIds.includes(matchday.home_team.id);
          const isOurTeamAway = matchday.away_team && matchday.away_team.id && playerTeamIds.includes(matchday.away_team.id);
          
          // Unser Team und Gegner (BEREINIGT)
          const ourTeam = isOurTeamHome ? matchday.home_team : (isOurTeamAway ? matchday.away_team : null);
          const opponentTeam = isOurTeamHome ? matchday.away_team : (isOurTeamAway ? matchday.home_team : null);
          
          // WICHTIG: Zusammensetzen des Gegner-Namens mit korrektem Leerzeichen
          let opponentName = 'Gegner';
          if (opponentTeam) {
            const clubName = opponentTeam.club_name || '';
            const teamName = opponentTeam.team_name || '';
            // Füge nur team_name hinzu wenn es existiert UND nicht leer ist
            if (teamName && teamName.trim()) {
              opponentName = `${clubName} ${teamName}`.trim();
            } else {
              opponentName = clubName || 'Gegner';
            }
          }
          
          // Parse Datum und kombinieren mit start_time
          let matchDateTime = new Date(matchday.match_date);
          
          // Wenn start_time vorhanden ist, setze die Zeit
          if (matchday.start_time) {
            const [hours, minutes] = matchday.start_time.split(':');
            if (hours && minutes) {
              matchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
          }
          
          return {
            id: matchday.id,
            date: matchDateTime,
            opponent: opponentName,
            location: isOurTeamHome ? 'Home' : (isOurTeamAway ? 'Away' : matchday.location), // ✅ AUS SPIELER-PERSPEKTIVE!
            venue: matchday.venue,
            venue_id: matchday.venue_id, // ✅ NEU: Für Surface-Info
            court_number: matchday.court_number, // ✅ NEU: Platz-Start
            court_number_end: matchday.court_number_end, // ✅ NEU: Platz-Ende
            season: matchday.season,
            playersNeeded: 4, // Standard für matchdays (kann später aus DB kommen)
            teamId: ourTeam?.id,
            // WICHTIG: Behalte Original-IDs für score-Berechnung in Results.jsx
            home_team_id: matchday.home_team_id,
            away_team_id: matchday.away_team_id,
            // ✅ NEU: Lade home_score und away_score aus matchday
            home_score: matchday.home_score,
            away_score: matchday.away_score,
            teamInfo: ourTeam ? {
              id: ourTeam.id,
              clubName: ourTeam.club_name,
              teamName: ourTeam.team_name,
              category: ourTeam.category
            } : null,
            availability: (matchday.match_availability || []).reduce((acc, avail) => {
              acc[avail.player_id] = {
                status: avail.status,
                comment: avail.comment,
                playerName: avail.player?.name || avail.players?.name || 'Unbekannt'
              };
              return acc;
            }, {})
          };
        } else {
          // Alte Struktur: matches (Fallback)
          return {
            id: matchday.id,
            date: new Date(matchday.match_date),
            opponent: matchday.opponent,
            location: matchday.location,
            venue: matchday.venue,
            season: matchday.season,
            playersNeeded: matchday.players_needed,
            teamId: matchday.team_id,
            // ✅ NEU: Lade home_score und away_score auch für alte Struktur
            home_score: matchday.home_score,
            away_score: matchday.away_score,
            teamInfo: matchday.team_info ? {
              id: matchday.team_info.id,
              clubName: matchday.team_info.club_name,
              teamName: matchday.team_info.team_name,
              category: matchday.team_info.category
            } : null,
            availability: (matchday.match_availability || []).reduce((acc, avail) => {
              acc[avail.player_id] = {
                status: avail.status,
                comment: avail.comment,
                playerName: avail.players?.name || 'Unbekannt'
              };
              return acc;
            }, {})
          };
        }
      });

      // TEST-DATEN deaktiviert für sauberes Development

      setMatches(transformedMatches);
      
      // ✅ NEU: Automatisches Laden von Meldelisten im Hintergrund
      if (data && data.length > 0) {
        // Importiere dynamisch, um Circular Dependencies zu vermeiden
        import('../services/autoTeamRosterImportService').then(({ autoImportTeamRostersForMatchdays }) => {
          // Führe im Hintergrund aus (nicht blockierend)
          const runImport = () => {
            autoImportTeamRostersForMatchdays(data);
          };
          
          if ('requestIdleCallback' in window) {
            requestIdleCallback(runImport, { timeout: 5000 });
          } else {
            // Fallback: Führe nach kurzer Verzögerung aus
            setTimeout(runImport, 2000);
          }
        }).catch(err => {
          console.warn('⚠️ Fehler beim Laden von autoTeamRosterImportService:', err);
        });
      }
    } catch (error) {
      console.error('Error in loadMatches:', error);
    }
  };

  // Lade Spieler (für Rangliste)
  const loadPlayers = async () => {
    console.log('🔄 Loading players from players_unified...');
    const { data, error } = await supabase
      .from('players_unified')
      .select('*')
      // ⚠️ KOMMENTAR: Zeige ALLE Spieler (auch externe Vereinsspieler)
      // .eq('is_active', true) // REMOVED: Zeige auch inaktive für Rangliste
      .order('points', { ascending: false });

    if (error) {
      console.error('Error loading players:', error);
      return;
    }

    console.log('✅ Players loaded:', data?.length || 0, 'players');
    
    // ✅ NEU: Prüfe und korrigiere season_start_lk Inkonsistenzen im Hintergrund
    if (data && data.length > 0) {
      try {
        const { correctSeasonStartLKForPlayers } = await import('../lib/lkUtils');
        // Prüfe nur Spieler mit beiden Werten gesetzt
        const playersToCheck = data.filter(p => p.season_start_lk && p.current_lk);
        if (playersToCheck.length > 0) {
          // Führe Korrektur im Hintergrund aus (nicht blockierend)
          correctSeasonStartLKForPlayers(playersToCheck, supabase, 1.0)
            .then(corrections => {
              if (corrections.length > 0) {
                console.log(`✅ ${corrections.length} Spieler mit inkonsistenter season_start_lk automatisch korrigiert`);
                // Lade Spieler neu, um aktualisierte Werte zu erhalten
                loadPlayers();
              }
            })
            .catch(err => {
              console.warn('⚠️ Fehler bei automatischer season_start_lk Korrektur:', err);
            });
        }
      } catch (err) {
        console.warn('⚠️ Fehler beim Laden der Korrektur-Funktion:', err);
      }
    }
    
    setPlayers(data);
  };

  // Lade Tabelle auf Basis der aktuellen Liga/Gruppe des Spieler-Teams
  const loadLeagueStandings = async (teamsOverride = null) => {
    try {
      const teamsSource = (teamsOverride && teamsOverride.length > 0)
        ? teamsOverride
        : playerTeams;

      if (!teamsSource || teamsSource.length === 0) {
        setLeagueStandings([]);
        setLeagueMatches([]);
        setLeagueMeta(null);
        return;
      }

      const referenceTeam = teamsSource.find(t => t.is_primary) || teamsSource[0];

      if (!referenceTeam) {
        setLeagueStandings([]);
        setLeagueMatches([]);
        setLeagueMeta(null);
        return;
      }

      let seasonLabel = referenceTeam.season;
      if (!seasonLabel) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (currentMonth >= 4 && currentMonth <= 7) {
          seasonLabel = `Sommer ${currentYear}`;
        } else if (currentMonth >= 8) {
          const nextYear = currentYear + 1;
          seasonLabel = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
        } else {
          const prevYear = currentYear - 1;
          seasonLabel = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
        }
      }

      if (!referenceTeam.league || !referenceTeam.group_name) {
        console.warn('⚠️ league/group_name fehlen für Standings-Berechnung');
        setLeagueStandings([]);
        setLeagueMatches([]);
        setLeagueMeta({
          league: referenceTeam.league,
          group: referenceTeam.group_name,
          season: seasonLabel
        });
        return;
      }

      const { data: leagueTeamSeasons, error: teamsError } = await supabase
        .from('team_seasons')
        .select(`
          team_id,
          team_info!team_seasons_team_id_fkey(id, team_name, club_name)
        `)
        .eq('league', referenceTeam.league)
        .eq('group_name', referenceTeam.group_name)
        .eq('season', seasonLabel)
        .eq('is_active', true);

      if (teamsError) {
        throw teamsError;
      }

      let leagueTeams = (leagueTeamSeasons || [])
        .map((ts) => ts?.team_info)
        .filter(Boolean);

      let fallbackTeamIds = new Set();

      if (!leagueTeams || leagueTeams.length <= 1) {
        const { data: ownMatchesRaw, error: ownMatchesError } = await supabase
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
            group_name
          `)
          .or(`home_team_id.eq.${referenceTeam.id},away_team_id.eq.${referenceTeam.id}`)
          .eq('season', seasonLabel)
          .eq('league', referenceTeam.league)
          .eq('group_name', referenceTeam.group_name);

        if (ownMatchesError) {
          throw ownMatchesError;
        }

        ownMatchesRaw?.forEach(match => {
          if (match.home_team_id) fallbackTeamIds.add(match.home_team_id);
          if (match.away_team_id) fallbackTeamIds.add(match.away_team_id);
        });
        fallbackTeamIds.add(referenceTeam.id);

        const fallbackTeamIdArray = Array.from(fallbackTeamIds);

        if (fallbackTeamIdArray.length > 0) {
          const { data: fallbackTeams, error: fallbackTeamsError } = await supabase
            .from('team_info')
            .select('id, team_name, club_name')
            .in('id', fallbackTeamIdArray);

          if (fallbackTeamsError) {
            throw fallbackTeamsError;
          }

          leagueTeams = (fallbackTeams || []).filter(Boolean);
        }
      }

      if (!leagueTeams || leagueTeams.length === 0) {
        console.warn('⚠️ Keine Teams für Liga/Gruppe gefunden');
        setLeagueStandings([]);
        setLeagueMatches([]);
        setLeagueMeta({
          league: referenceTeam.league,
          group: referenceTeam.group_name,
          season: seasonLabel
        });
        return;
      }

      const teamIdSet = new Set(leagueTeams.map(team => team.id).filter(Boolean));

      if (fallbackTeamIds.size > 0) {
        fallbackTeamIds.forEach(id => teamIdSet.add(id));
      }

      const teamIds = Array.from(teamIdSet);

      if (teamIds.length === 0) {
        setLeagueStandings([]);
        setLeagueMatches([]);
        setLeagueMeta({
          league: referenceTeam.league,
          group: referenceTeam.group_name,
          season: seasonLabel
        });
        return;
      }

      const idList = teamIds.join(',');

      const { data: leagueMatchesRaw, error: matchesError } = await supabase
        .from('matchdays')
        .select(`
          id,
          match_date,
          start_time,
          season,
          status,
          venue,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          league,
          group_name
        `)
        .or(`home_team_id.in.(${idList}),away_team_id.in.(${idList})`)
        .eq('season', seasonLabel)
        .eq('league', referenceTeam.league)
        .eq('group_name', referenceTeam.group_name);

      if (matchesError) {
        throw matchesError;
      }

      const filteredMatchesRaw = (leagueMatchesRaw || []).filter(match => {
        return teamIdSet.has(match.home_team_id) && teamIdSet.has(match.away_team_id);
      });

      let resultsData = [];
      const matchIds = (filteredMatchesRaw || []).map((match) => match.id).filter(Boolean);

      if (matchIds.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchIds);

        if (resultsError) {
          throw resultsError;
        }

        resultsData = results || [];
      }

      const standingsRaw = computeStandings(leagueTeams, filteredMatchesRaw || [], resultsData);
      const playerTeamIdSet = new Set(teamsSource.map(team => team.id));

      const standingsWithFlags = standingsRaw.map(entry => ({
        ...entry,
        is_own_team: playerTeamIdSet.has(entry.team_id)
      }));

      const resultsByMatchId = resultsData.reduce((acc, result) => {
        if (!result || !result.matchday_id) return acc;
        if (!acc[result.matchday_id]) {
          acc[result.matchday_id] = [];
        }
        acc[result.matchday_id].push(result);
        return acc;
      }, {});

      const teamLookup = leagueTeams.reduce((acc, team) => {
        if (team && team.id) {
          acc[team.id] = team;
        }
        return acc;
      }, {});

      const leagueMatchDetails = (filteredMatchesRaw || []).map((match) => {
        const matchDate = match.match_date ? new Date(match.match_date) : null;
        const resultsForMatch = resultsByMatchId[match.id] || [];

        let homeMatchPoints = 0;
        let awayMatchPoints = 0;
        let homeSets = 0;
        let awaySets = 0;
        let homeGames = 0;
        let awayGames = 0;
        let completedMatches = 0;

        // Alle abgeschlossenen Match-Status (nicht nur 'completed')
        const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];

        resultsForMatch.forEach((result) => {
          if (!result || !FINISHED_STATUSES.includes(result.status) || !result.winner) return;

          completedMatches += 1;

          if (result.winner === 'home') {
            homeMatchPoints += 1;
          } else if (result.winner === 'guest' || result.winner === 'away') {
            awayMatchPoints += 1;
          }

          const set1Home = parseIntSafe(result.set1_home);
          const set1Guest = parseIntSafe(result.set1_guest);
          const set2Home = parseIntSafe(result.set2_home);
          const set2Guest = parseIntSafe(result.set2_guest);
          const set3Home = parseIntSafe(result.set3_home);
          const set3Guest = parseIntSafe(result.set3_guest);

          if (set1Home > set1Guest) homeSets += 1;
          else if (set1Guest > set1Home) awaySets += 1;
          homeGames += set1Home;
          awayGames += set1Guest;

          if (set2Home > set2Guest) homeSets += 1;
          else if (set2Guest > set2Home) awaySets += 1;
          homeGames += set2Home;
          awayGames += set2Guest;

          if (set3Home > 0 || set3Guest > 0) {
            if (set3Home > set3Guest) homeSets += 1;
            else if (set3Guest > set3Home) awaySets += 1;

            const isChampionsTiebreak = set3Home >= 10 || set3Guest >= 10;
            if (isChampionsTiebreak) {
              if (set3Home > set3Guest) {
                homeGames += 1;
              } else if (set3Guest > set3Home) {
                awayGames += 1;
              }
            } else {
              homeGames += set3Home;
              awayGames += set3Guest;
            }
          }
        });

        const expectedMatches = (match.season || '').toLowerCase().includes('sommer') || (match.season || '').toLowerCase().includes('summer') ? 9 : 6;

        let winner = null;
        if (homeMatchPoints > awayMatchPoints) {
          winner = 'home';
        } else if (awayMatchPoints > homeMatchPoints) {
          winner = 'away';
        } else if ((match.status === 'finished') && (homeMatchPoints + awayMatchPoints > 0)) {
          winner = 'draw';
        }

        const displayScore = (homeMatchPoints + awayMatchPoints) > 0
          ? `${homeMatchPoints}:${awayMatchPoints}`
          : (match.home_score != null || match.away_score != null)
            ? `${match.home_score ?? 0}:${match.away_score ?? 0}`
            : '–:–';

        const homeTeam = teamLookup[match.home_team_id];
        const awayTeam = teamLookup[match.away_team_id];

        const isPlayerHomeTeam = playerTeamIdSet.has(match.home_team_id);
        const isPlayerAwayTeam = playerTeamIdSet.has(match.away_team_id);
        const involvesPlayerTeam = isPlayerHomeTeam || isPlayerAwayTeam;

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
            displayName: buildTeamLabel(homeTeam),
            club_name: homeTeam?.club_name || null,
            team_name: homeTeam?.team_name || null,
            isPlayerTeam: isPlayerHomeTeam
          },
          awayTeam: {
            id: match.away_team_id,
            displayName: buildTeamLabel(awayTeam),
            club_name: awayTeam?.club_name || null,
            team_name: awayTeam?.team_name || null,
            isPlayerTeam: isPlayerAwayTeam
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

      setLeagueStandings(standingsWithFlags);
      setLeagueMatches(leagueMatchDetails);
      setLeagueMeta({
        league: referenceTeam.league,
        group: referenceTeam.group_name,
        season: seasonLabel
      });
    } catch (error) {
      console.error('Error loading league standings:', error);
      setLeagueStandings([]);
      setLeagueMatches([]);
      setLeagueMeta(null);
    }
  };

  // Lade Team Info (mit Team-Filter Support)
  const loadTeamInfo = async () => {
    try {
      // Wenn selectedTeamId gesetzt ist, lade spezifisches Team
      if (selectedTeamId) {
        console.log('🔍 Loading team info for team_id:', selectedTeamId);
        
        const { data, error } = await supabase
          .from('team_info')
          .select('*')
          .eq('id', selectedTeamId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading team info:', error);
          return;
        }

        if (data) {
          console.log('✅ Team info loaded:', data);
          
          // Lade group_name aus team_seasons (nicht aus team_info!)
          // Nutze is_active statt hartkodierter Season
          const { data: seasonData } = await supabase
            .from('team_seasons')
            .select('group_name, league')
            .eq('team_id', data.id)
            .eq('is_active', true)
            .maybeSingle();
          
          setTeamInfo({
            id: data.id,
            teamName: data.team_name,
            clubName: data.club_name,
            category: data.category || 'Herren',
            league: seasonData?.league || data.league || 'Kreisliga',
            group: seasonData?.group_name || '',
            region: data.region || 'Köln',
            tvmLink: data.tvm_link || '',
            address: data.address || '',
            contact: data.contact || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logoUrl: data.logo_url || '/app-icon.jpg'
          });
        } else {
          setTeamInfo(null);
        }
        return;
      }
      
      // Fallback: Vereinfachte Team-Info-Ladung ohne Season-Filter
      // Nur laden wenn noch keine Team Info vorhanden ist
      if (teamInfo) {
        console.log('🔵 Team info already loaded, skipping fallback');
        return;
      }
      
      console.log('🔵 Loading team info (fallback - no season filter)');

      const { data, error } = await supabase
        .from('team_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading team info:', error);
        return;
      }

      if (data) {
        console.log('✅ Team info loaded (fallback):', data);
        setTeamInfo({
          id: data.id,
          teamName: data.team_name,
          clubName: data.club_name,
          category: data.category || 'Herren',
          league: 'Kreisliga', // Default - wird später aus team_seasons geladen
          group: '', // Default - wird später aus team_seasons geladen
          region: data.region || 'Köln',
          tvmLink: data.tvm_link || '',
          address: data.address || '',
          contact: data.contact || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logoUrl: data.logo_url || '/app-icon.jpg'
        });
      } else {
        console.log('⚠️ No team info found - using defaults');
        // Fallback zu Standard-Werten (generisch, NICHT clubspezifisch!)
        setTeamInfo({
          id: 'default',
          teamName: 'Mein Team',
          clubName: 'Mein Verein',
          category: 'Herren',
          league: 'Kreisliga',
          group: 'Gruppe 1',
          region: 'Mittelrhein',
          tvmLink: '',
          address: '',
          contact: 'Teamleitung',
          phone: '',
          email: '',
          website: '',
          logoUrl: '/app-icon.jpg'
        });
      }
    } catch (error) {
      console.error('Error in loadTeamInfo:', error);
    }
  };

  // Realtime-Subscriptions einrichten
  const setupRealtimeSubscriptions = () => {
    // Matches
    const matchesSubscription = supabase
      .channel('matches-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'matches' },
        () => loadMatches()
      )
      .subscribe();

    // Availability
    const availabilitySubscription = supabase
      .channel('availability-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_availability' },
        () => loadMatches()
      )
      .subscribe();

    // Players (für Rangliste) - aktualisiert für players_unified
    const playersSubscription = supabase
      .channel('players-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players_unified' },
        () => loadPlayers()
      )
      .subscribe();

    // Cleanup
    return () => {
      matchesSubscription.unsubscribe();
      availabilitySubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  };

  /**
   * Match hinzufügen (nur für Captains)
   */
  const addMatch = async (match) => {
    console.log('🔵 DataContext - addMatch called with:', match);
    console.log('🔵 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          match_date: match.date.toISOString(),
          opponent: match.opponent,
          location: match.location,
          venue: match.venue || null,
          season: match.season || 'winter',
          players_needed: match.playersNeeded || 4
        })
        .select()
        .single();

      console.log('🔵 Insert result - data:', data, 'error:', error);

      if (error) throw error;

      console.log('✅ Match inserted, reloading matches...');
      await loadMatches();
      console.log('✅ Matches reloaded');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error adding match:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Match aktualisieren (nur für Captains)
   */
  const updateMatch = async (matchId, matchData) => {
    console.log('🔵 DataContext - updateMatch called with:', { matchId, matchData });
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .update({
          match_date: matchData.date.toISOString(),
          opponent: matchData.opponent,
          location: matchData.location,
          venue: matchData.venue || null,
          season: matchData.season || 'winter',
          players_needed: matchData.playersNeeded || 4
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Match updated, reloading matches...');
      await loadMatches();
      console.log('✅ Matches reloaded');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error updating match:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Match löschen (nur für Captains)
   * Löscht Match inkl. aller zugehörigen Verfügbarkeits-Einträge (Cascade)
   */
  const deleteMatch = async (matchId) => {
    console.log('🗑️ DataContext - deleteMatch called for:', matchId);
    
    try {
      // 1. Lösche zuerst alle match_availability Einträge für diesen Matchday
      console.log('🔵 Deleting match_availability entries...');
      const { error: availabilityError } = await supabase
        .from('match_availability')
        .delete()
        .eq('matchday_id', matchId);

      if (availabilityError) {
        console.error('❌ Error deleting availability:', availabilityError);
        throw availabilityError;
      }
      console.log('✅ Match availability entries deleted');

      // 2. Lösche match_results falls vorhanden
      console.log('🔵 Deleting match_results entries...');
      const { error: resultsError } = await supabase
        .from('match_results')
        .delete()
        .eq('matchday_id', matchId);

      if (resultsError) {
        console.warn('⚠️ Error deleting results (might not exist):', resultsError);
        // Nicht abbrechen, da match_results möglicherweise leer ist
      } else {
        console.log('✅ Match results deleted (if any)');
      }

      // 3. Lösche den Matchday selbst
      console.log('🔵 Deleting matchday...');
      const { error: matchdayError } = await supabase
        .from('matchdays')
        .delete()
        .eq('id', matchId);

      if (matchdayError) {
        console.error('❌ Error deleting matchday:', matchdayError);
        throw matchdayError;
      }
      console.log('✅ Matchday deleted');

      // 4. Lade alle Matches neu
      console.log('🔵 Reloading matches...');
      await loadMatches();
      console.log('✅ All data reloaded');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error in deleteMatch:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Verfügbarkeit für Match setzen
   */
  const updateMatchAvailability = async (matchId, playerId, status, comment = '') => {
    console.log('🔵 DataContext - updateMatchAvailability:', { matchId, playerId, status, comment });
    
    try {
      // Hole Spieler- und Match-Informationen für Logging
      const player = players.find(p => p.id === playerId);
      const match = matches.find(m => m.id === matchId);
      const playerName = player?.name || 'Unbekannter Spieler';
      const matchInfo = match ? `${match.opponent} (${new Date(match.date).toLocaleDateString('de-DE')})` : 'Unbekanntes Match';
      // Prüfe ob Eintrag existiert
      const { data: existing, error: selectError } = await supabase
        .from('match_availability')
        .select('id')
        .eq('matchday_id', matchId)
        .eq('player_id', playerId)
        .maybeSingle();

      console.log('🔵 Existing availability:', existing);

      if (existing) {
        // Update
        console.log('✏️ Updating existing availability:', existing.id);
        const { error } = await supabase
          .from('match_availability')
          .update({ status, comment })
          .eq('id', existing.id);

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        console.log('✅ Availability updated');
      } else {
        // Insert
        console.log('➕ Inserting new availability');
        const { error } = await supabase
          .from('match_availability')
          .insert({
            matchday_id: matchId,
            player_id: playerId,
            status,
            comment: comment || null
          });

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        console.log('✅ Availability inserted');
      }

      console.log('🔵 Reloading matches...');
      await loadMatches();
      console.log('✅ Matches reloaded');
      
      // Zusätzlich: Force ein Re-render der Komponenten
      // Das kann helfen, wenn die UI nicht aktualisiert wird
      console.log('🔄 Triggering component re-render...');
      
      // Erweiterte Logging für Admin-Bereich
      const logEntry = {
        timestamp: new Date().toISOString(),
        playerName,
        playerId,
        matchInfo,
        matchId,
        status,
        comment: comment || null,
        action: existing ? 'updated' : 'created',
        previousStatus: existing ? 'unknown' : null // Könnte erweitert werden um vorherigen Status zu tracken
      };
      
      console.log('📝 Verfügbarkeits-Log Entry:', logEntry);
      
      // Speichere Log in localStorage für Admin-Anzeige
      try {
        const existingLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
        existingLogs.unshift(logEntry);
        
        // Erweitert: Behalte mehr Einträge für bessere Nachverfolgung (500 statt 100)
        if (existingLogs.length > 500) {
          existingLogs.splice(500);
        }
        
        localStorage.setItem('availability_logs', JSON.stringify(existingLogs));
        console.log('✅ Log saved to localStorage. Total logs:', existingLogs.length);
        
        // Debug: Zeige gespeicherte Logs
        const savedLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
        console.log('🔍 Current localStorage logs:', savedLogs.slice(0, 3));
      } catch (logError) {
        console.error('❌ Error saving log to localStorage:', logError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating availability:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Spieler-Profil abrufen
   */
  const getPlayerProfile = async (playerId) => {
    try {
      const { data, error } = await supabase
        .from('players_unified')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting player profile:', error);
      return null;
    }
  };

  /**
   * Spieler-Profil aktualisieren
   */
  const updatePlayerProfile = async (playerId, profileData) => {
    try {
      const { data, error } = await supabase
        .from('players_unified')
        .update(profileData)
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;

      await loadPlayers();
      return { success: true, data };
    } catch (error) {
      console.error('Error updating player profile:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Importiere alle historischen Verfügbarkeits-Daten aus der Datenbank
   */
  const importHistoricalAvailabilityLogs = async () => {
    try {
      console.log('🔍 Importing historical availability data...');
      
      // Lade alle Verfügbarkeits-Daten mit Spieler- und Matchday-Informationen
      const { data: availabilityData, error } = await supabase
        .from('match_availability')
        .select(`
          *,
          players_unified!match_availability_player_id_fkey (
            name,
            current_lk,
            season_start_lk
          ),
          matchday:matchday_id (
            id,
            match_date,
            home_team:home_team_id (
              id,
              team_name,
              club_name
            ),
            away_team:away_team_id (
              id,
              team_name,
              club_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading historical data:', error);
        return { success: false, error: error.message };
      }

      console.log('📊 Found historical availability records:', availabilityData?.length || 0);

      // Konvertiere zu Log-Format
      const historicalLogs = availabilityData?.map(record => {
        const matchday = record.matchday;
        const matchInfo = matchday ? 
          `${matchday.home_team?.club_name || 'Home'} vs ${matchday.away_team?.club_name || 'Away'} (${new Date(matchday.match_date).toLocaleDateString('de-DE')})` 
          : 'Unbekanntes Match';
        
        return {
          timestamp: record.created_at || new Date().toISOString(),
          playerName: record.players?.name || 'Unbekannter Spieler',
          playerId: record.player_id,
          matchInfo,
          matchId: record.matchday_id,
          status: record.status,
          comment: record.comment || null,
          action: 'imported', // Kennzeichnung als importierte historische Daten
          originalId: record.id
        };
      }) || [];

      console.log('📝 Converted to log format:', historicalLogs.length, 'entries');

      // Merge mit bestehenden Logs (vermeide Duplikate)
      const existingLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
      const existingIds = new Set(existingLogs.map(log => log.originalId || `${log.playerId}-${log.matchId}`));
      
      const newLogs = historicalLogs.filter(log => !existingIds.has(log.originalId || `${log.playerId}-${log.matchId}`));
      
      console.log('🔄 Merging logs:', {
        existing: existingLogs.length,
        historical: historicalLogs.length,
        new: newLogs.length
      });

      // Kombiniere und sortiere nach Timestamp
      const allLogs = [...existingLogs, ...newLogs].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Behalte nur die letzten 500 Einträge
      if (allLogs.length > 500) {
        allLogs.splice(500);
      }

      localStorage.setItem('availability_logs', JSON.stringify(allLogs));
      
      console.log('✅ Historical data imported successfully:', {
        totalLogs: allLogs.length,
        newImports: newLogs.length
      });

      return { 
        success: true, 
        imported: newLogs.length,
        total: allLogs.length
      };

    } catch (error) {
      console.error('❌ Error in importHistoricalAvailabilityLogs:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Team-Info aktualisieren (pro Saison)
   */
  const updateTeamInfo = async (teamData) => {
    try {
      console.log('🔵 DataContext - Updating team info:', teamData);
      console.log('🔵 TVM Link to save:', teamData.tvmLink);
      console.log('🔵 Season:', teamData.season, 'Year:', teamData.seasonYear);

      // Prüfe ob Team-Info für diese Saison existiert
      const { data: existing, error: selectError } = await supabase
        .from('team_info')
        .select('id')
        .eq('season', teamData.season)
        .eq('season_year', teamData.seasonYear)
        .maybeSingle();

      console.log('🔵 Existing team info:', existing, 'Error:', selectError);

      let result;
      if (existing) {
        // Update existierende Saison
        console.log('✏️ Updating existing team info for', teamData.season, teamData.seasonYear);
        console.log('✏️ Update data:', {
          team_name: teamData.teamName,
          club_name: teamData.clubName,
          category: teamData.category,
          league: teamData.league,
          group_name: teamData.group,
          region: teamData.region,
          tvm_link: teamData.tvmLink || null
        });
        
        result = await supabase
          .from('team_info')
          .update({
            team_name: teamData.teamName,
            club_name: teamData.clubName,
            category: teamData.category,
            league: teamData.league,
            group_name: teamData.group,
            region: teamData.region,
            tvm_link: teamData.tvmLink || null
          })
          .eq('id', existing.id)
          .select()
          .single();
          
        console.log('✏️ Update result:', result);
      } else {
        // Insert neue Saison
        console.log('➕ Creating new team info for', teamData.season, teamData.seasonYear);
        console.log('➕ Insert data:', {
          team_name: teamData.teamName,
          club_name: teamData.clubName,
          category: teamData.category,
          league: teamData.league,
          group_name: teamData.group,
          region: teamData.region,
          tvm_link: teamData.tvmLink || null,
          season: teamData.season,
          season_year: teamData.seasonYear
        });
        
        result = await supabase
          .from('team_info')
          .insert({
            team_name: teamData.teamName,
            club_name: teamData.clubName,
            category: teamData.category,
            league: teamData.league,
            group_name: teamData.group,
            region: teamData.region,
            tvm_link: teamData.tvmLink || null,
            season: teamData.season,
            season_year: teamData.seasonYear
          })
          .select()
          .single();
          
        console.log('➕ Insert result:', result);
      }

      if (result.error) {
        console.error('❌ Supabase error:', result.error);
        throw result.error;
      }

      console.log('✅ Team info saved successfully:', result.data);
      console.log('✅ Saved TVM Link:', result.data.tvm_link);
      
      await loadTeamInfo();
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating team info:', error);
      console.error('❌ Error details:', error.message, error.code);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (!configured) return;

    if (playerTeams.length === 0) {
      setLeagueStandings([]);
      setLeagueMatches([]);
      setLeagueMeta(null);
      return;
    }

    const selectedTeam = selectedTeamId
      ? playerTeams.find(team => team.id === selectedTeamId)
      : null;

    if (selectedTeam) {
      loadLeagueStandings([selectedTeam]);
    } else {
      loadLeagueStandings(playerTeams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, selectedTeamId, playerTeams]);

  const value = {
    matches,
    players,
    leagueStandings,
    leagueMatches,
    leagueMeta,
    teamInfo,
    loading,
    configured,
    addMatch,
    updateMatch,
    deleteMatch,
    updateMatchAvailability,
    setLeagueStandings,
    getPlayerProfile,
    updatePlayerProfile,
    updateTeamInfo,
    importHistoricalAvailabilityLogs,
    // Multi-Team Support
    playerTeams,
    selectedTeamId,
    setSelectedTeamId,
    loadPlayerTeams
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

