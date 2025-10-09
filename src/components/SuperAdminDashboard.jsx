import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  Building2, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Eye,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import './Dashboard.css';

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [pendingClubs, setPendingClubs] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [clubPlayerCounts, setClubPlayerCounts] = useState({});
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all'); // Default: Alle Logs anzeigen
  const [logsFilter, setLogsFilter] = useState('all');
  const [clubSearchTerm, setClubSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [playerSortField, setPlayerSortField] = useState('created_at');
  const [playerSortDirection, setPlayerSortDirection] = useState('desc');
  const [teams, setTeams] = useState([]);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamCategoryFilter, setTeamCategoryFilter] = useState('all');
  const [teamSeasonFilter, setTeamSeasonFilter] = useState('all');
  const [allMatches, setAllMatches] = useState([]);
  const [matchView, setMatchView] = useState('upcoming'); // 'upcoming' | 'completed'
  const [matchSearchTerm, setMatchSearchTerm] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('all');

  // State für Sortierung
  const [teamSortField, setTeamSortField] = useState('club'); // 'club', 'category', 'players', 'season'
  const [teamSortDirection, setTeamSortDirection] = useState('asc'); // 'asc', 'desc'
  const [matchSortField, setMatchSortField] = useState('date'); // 'date', 'team', 'status'
  const [matchSortDirection, setMatchSortDirection] = useState('desc'); // 'asc', 'desc'

  // State für Match-Detail-Modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);

  // Sortier-Helper-Funktionen
  const toggleTeamSort = (field) => {
    if (teamSortField === field) {
      setTeamSortDirection(teamSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamSortField(field);
      setTeamSortDirection('asc');
    }
  };

  const toggleMatchSort = (field) => {
    if (matchSortField === field) {
      setMatchSortDirection(matchSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMatchSortField(field);
      setMatchSortDirection('asc');
    }
  };

  const sortTeams = (teamsToSort) => {
    return [...teamsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (teamSortField) {
        case 'club':
          comparison = (a.club_name || '').localeCompare(b.club_name || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'players':
          comparison = (a.player_count || 0) - (b.player_count || 0);
          break;
        case 'season':
          comparison = (a.season || '').localeCompare(b.season || '');
          break;
        default:
          comparison = 0;
      }
      
      return teamSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortMatches = (matchesToSort) => {
    return [...matchesToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (matchSortField) {
        case 'date':
          comparison = new Date(a.match_date) - new Date(b.match_date);
          break;
        case 'team':
          comparison = (a.home_team || '').localeCompare(b.home_team || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = 0;
      }
      
      return matchSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Lade Match-Details inkl. aller Einzelergebnisse
  const loadMatchDetails = async (match) => {
    try {
      setLoadingMatchDetails(true);
      setSelectedMatch(match);

      console.log('🔵 Loading match details for:', match.id);

      // Lade alle match_results für dieses Match mit Spieler-Informationen
      const { data: resultsData, error } = await supabase
        .from('match_results')
        .select(`
          *,
          home_player:players!match_results_home_player_id_fkey(id, name, current_lk),
          guest_player:players!match_results_guest_player_id_fkey(id, name, current_lk),
          home_player1:players!match_results_home_player1_id_fkey(id, name, current_lk),
          home_player2:players!match_results_home_player2_id_fkey(id, name, current_lk),
          guest_player1:players!match_results_guest_player1_id_fkey(id, name, current_lk),
          guest_player2:players!match_results_guest_player2_id_fkey(id, name, current_lk)
        `)
        .eq('match_id', match.id)
        .order('match_number', { ascending: true });

      if (error) {
        console.error('❌ Error loading match details:', error);
        return;
      }

      console.log('✅ Match details loaded:', resultsData?.length || 0, 'results');
      setMatchDetails(resultsData || []);

    } catch (error) {
      console.error('Error loading match details:', error);
    } finally {
      setLoadingMatchDetails(false);
    }
  };

  const closeMatchModal = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  // Lade alle Admin-Daten
  useEffect(() => {
    loadAdminData();
  }, [dateFilter, logsFilter]);

  // Lazy Loading: Lade Players nur wenn Users-Tab geöffnet wird
  useEffect(() => {
    if (selectedTab === 'users' && players.length === 0) {
      loadPlayers();
    }
  }, [selectedTab]);

  // Lazy Loading: Lade Teams nur wenn Teams-Tab geöffnet wird
  useEffect(() => {
    if (selectedTab === 'teams' && teams.length === 0) {
      loadTeams();
    }
  }, [selectedTab]);

  // Lazy Loading: Lade Matches nur wenn Matches-Tab geöffnet wird
  useEffect(() => {
    if (selectedTab === 'matches' && allMatches.length === 0) {
      loadMatches();
    }
  }, [selectedTab]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Lade echte Statistiken aus der Datenbank
      console.log('🔵 Loading admin statistics...');

      // 1. Zähle aktive Benutzer (mit mindestens einem Team)
      const { count: activeUsersCount } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Zähle alle Vereine
      const { count: totalClubsCount } = await supabase
        .from('club_info')
        .select('id', { count: 'exact', head: true });

      // 3. Zähle ausstehende Vereins-Prüfungen
      const { count: pendingReviewsCount } = await supabase
        .from('club_info')
        .select('id', { count: 'exact', head: true })
        .eq('is_verified', false);

      // 4. Zähle Spieler die Onboarding abgeschlossen haben (haben mindestens 1 Team)
      const { data: playersWithTeams } = await supabase
        .from('player_teams')
        .select('player_id');
      const onboardingCompletedCount = new Set(playersWithTeams?.map(pt => pt.player_id) || []).size;

      // 5. Zähle alle Teams
      const { count: totalTeamsCount } = await supabase
        .from('team_info')
        .select('id', { count: 'exact', head: true });

      // 6. Zähle alle Matches
      const { count: totalMatchesCount } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true });

      // 7. Zähle alle Trainings
      const { count: totalTrainingsCount } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact', head: true });

      // 8. Zähle Aktivitäten heute
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: dailyActivityCount } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      console.log('✅ Statistics loaded:', {
        users: activeUsersCount,
        clubs: totalClubsCount,
        pending: pendingReviewsCount,
        onboarded: onboardingCompletedCount,
        teams: totalTeamsCount,
        matches: totalMatchesCount,
        trainings: totalTrainingsCount,
        dailyActivity: dailyActivityCount
      });

      // Setze Stats
      setStats({
        totalUsers: activeUsersCount || 0,
        totalClubs: totalClubsCount || 0,
        pendingReviews: pendingReviewsCount || 0,
        onboardingCompleted: onboardingCompletedCount || 0,
        totalTeams: totalTeamsCount || 0,
        totalMatches: totalMatchesCount || 0,
        totalTrainings: totalTrainingsCount || 0,
        dailyActivity: dailyActivityCount || 0
      });

      // Lade Activity Logs mit Filter
      console.log('🔵 Loading activity logs with filter:', logsFilter, 'from:', getDateFilter());
      
      let logsQuery = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter nach Aktionstyp
      if (logsFilter !== 'all') {
        logsQuery = logsQuery.eq('action', logsFilter);
      }

      const { data: logsData, error: logsError } = await logsQuery;
      
      if (logsError) {
        console.error('❌ Error loading activity logs:', logsError);
      } else {
        console.log('✅ Activity logs loaded:', logsData?.length || 0, 'entries');
      }

      // Lade ausstehende Vereine
      const { data: clubsData } = await supabase
        .from('club_info')
        .select('*')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      // Lade alle Vereine
      const { data: allClubsData } = await supabase
        .from('club_info')
        .select('*')
        .order('created_at', { ascending: false });

      // Lade Spieler-Anzahl pro Verein separat
      const { data: clubPlayerCounts } = await supabase
        .from('player_teams')
        .select(`
          player_id,
          team_info!inner(
            club_name
          )
        `);

      // Erstelle Map: club_name → Anzahl eindeutige Spieler
      const playerCountMap = {};
      clubPlayerCounts?.forEach(pt => {
        const clubName = pt.team_info?.club_name;
        if (clubName) {
          if (!playerCountMap[clubName]) {
            playerCountMap[clubName] = new Set();
          }
          playerCountMap[clubName].add(pt.player_id);
        }
      });

      // Konvertiere Sets zu Zahlen
      Object.keys(playerCountMap).forEach(clubName => {
        playerCountMap[clubName] = playerCountMap[clubName].size;
      });

      // Lade Matches für Match-Info in Logs
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, opponent, match_date, location, venue, season')
        .order('match_date', { ascending: false });

      // Lade minimale Player-Daten für Activity Log Enrichment
      const { data: minimalPlayersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id, name, email');

      if (playersError) {
        console.error('❌ Error loading players for logs:', playersError);
      }

      console.log('✅ Minimal players loaded for logs:', minimalPlayersData?.length || 0);
      console.log('🔍 Sample player data:', minimalPlayersData?.[0]);

      // 🔧 Enriche Activity Logs mit Player-Daten
      let enrichedLogs = logsData || [];
      if (logsData && minimalPlayersData) {
        // Erstelle eine Map user_id → player für schnelle Zuordnung
        const userIdToPlayer = {};
        minimalPlayersData.forEach(p => {
          if (p.user_id) {
            userIdToPlayer[p.user_id] = p;
          }
        });
        
        console.log('🔍 userIdToPlayer Map:', Object.keys(userIdToPlayer).length, 'entries');
        console.log('🔍 First log entry:', logsData[0]);
        console.log('🔍 First log user_id:', logsData[0]?.user_id, 'Type:', typeof logsData[0]?.user_id);
        
        // Füge player-Daten zu jedem Log hinzu
        enrichedLogs = logsData.map(log => {
          // Wenn user_id NULL ist, versuche aus entity_id zu ermitteln
          let player = null;
          
          if (log.user_id) {
            player = userIdToPlayer[log.user_id];
            if (!player) {
              console.warn('⚠️ No player found for user_id:', log.user_id, 'Action:', log.action);
            }
          } else {
            // user_id ist NULL - versuche aus entity_id abzuleiten
            console.warn('⚠️ Log has NULL user_id:', log.action, 'entity_type:', log.entity_type, 'entity_id:', log.entity_id);
            
            // Wenn entity_type = 'player', ist entity_id wahrscheinlich die player_id
            if (log.entity_type === 'player' && log.entity_id) {
              player = minimalPlayersData.find(p => p.id === log.entity_id);
              if (player) {
                console.log('✅ Inferred player from entity_id:', player.name);
              }
            }
          }
          
          return {
            ...log,
            player: player || null
          };
        });
        
        console.log('✅ Logs enriched with player data');
        console.log('🔍 First enriched log:', enrichedLogs[0]);
        console.log('🔍 Logs without player:', enrichedLogs.filter(l => !l.player).length);
      }

      setActivityLogs(enrichedLogs);
      setPendingClubs(clubsData || []);
      setAllClubs(allClubsData || []);
      setClubPlayerCounts(playerCountMap);
      setMatches(matchesData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      console.log('🔵 Loading full player data for Users tab...');
      
      // Schritt 1: Lade alle Spieler
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersError) {
        console.error('❌ Error loading players:', playersError);
        return;
      }

      console.log('✅ Players loaded:', playersData?.length || 0, 'players');

      // Schritt 2: Lade player_teams mit team_info für alle Spieler
      const { data: playerTeamsData, error: teamsError } = await supabase
        .from('player_teams')
        .select(`
          player_id,
          role,
          is_primary,
          team_info(
            club_name,
            team_name,
            category
          )
        `);

      if (teamsError) {
        console.error('❌ Error loading player teams:', teamsError);
      } else {
        console.log('✅ Player teams loaded:', playerTeamsData?.length || 0, 'team assignments');
      }

      // Schritt 3: Merge die Daten
      const playersWithTeams = playersData.map(player => {
        const teams = (playerTeamsData || [])
          .filter(pt => pt.player_id === player.id)
          .map(pt => ({
            role: pt.role,
            is_primary: pt.is_primary,
            team_info: pt.team_info
          }));
        
        return {
          ...player,
          player_teams: teams
        };
      });

      console.log('✅ Players with teams merged:', playersWithTeams.length);
      console.log('🔍 First player sample:', playersWithTeams[0]);
      setPlayers(playersWithTeams);

    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadTeams = async () => {
    try {
      console.log('🔵 Loading teams data for Teams tab...');

      // Lade Teams mit allen relevanten Informationen
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_info')
        .select(`
          id,
          team_name,
          club_name,
          category,
          region,
          tvm_link,
          club_id,
          club_info(
            id,
            name,
            city
          )
        `)
        .order('club_name', { ascending: true });

      if (teamsError) {
        console.error('❌ Error loading teams:', teamsError);
        return;
      }

      console.log('✅ Teams loaded:', teamsData?.length || 0, 'teams');

      // Lade team_seasons für alle Teams (nur aktive)
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('team_seasons')
        .select('*')
        .eq('is_active', true)
        .order('season', { ascending: false });

      if (seasonsError) {
        console.error('❌ Error loading team seasons:', seasonsError);
      } else {
        console.log('✅ Team seasons loaded:', seasonsData?.length || 0, 'seasons');
      }

      // Lade Spieler-Anzahl pro Team
      const { data: playerCountsData, error: countsError } = await supabase
        .from('player_teams')
        .select('team_id, player_id');

      if (countsError) {
        console.error('❌ Error loading player counts:', countsError);
      } else {
        console.log('✅ Player counts loaded');
      }

      // Merge alle Daten
      const teamsWithDetails = teamsData.map(team => {
        // Finde alle Saisons für dieses Team
        const teamSeasons = (seasonsData || []).filter(s => s.team_id === team.id);
        
        // Zähle eindeutige Spieler für dieses Team
        const playerCount = (playerCountsData || [])
          .filter(pt => pt.team_id === team.id)
          .length;

        // Nimm die neueste Saison als Haupt-Saison
        const latestSeason = teamSeasons[0] || {};

        // Extrahiere Jahr aus Season-String (z.B. "Winter 2025/26" → 2025)
        const seasonYear = latestSeason.season ? 
          parseInt(latestSeason.season.match(/\d{4}/)?.[0] || new Date().getFullYear()) : 
          new Date().getFullYear();

        return {
          ...team,
          season: latestSeason.season || 'Keine Saison',
          season_year: seasonYear,
          league: latestSeason.league || '-',
          group_name: latestSeason.group_name || '-',
          team_size: latestSeason.team_size || 6,
          player_count: playerCount,
          all_seasons: teamSeasons,
          has_season: teamSeasons.length > 0
        };
      });

      console.log('✅ Teams with details merged:', teamsWithDetails.length);
      console.log('🔍 First team sample:', teamsWithDetails[0]);
      setTeams(teamsWithDetails);

    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadMatches = async () => {
    try {
      console.log('🔵 Loading matches data for Matches tab...');

      // Lade alle Matches mit Team-Informationen
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          team_id,
          opponent,
          match_date,
          location,
          venue,
          season,
          players_needed,
          created_at,
          team_info(
            id,
            team_name,
            club_name,
            category
          )
        `)
        .order('match_date', { ascending: false });

      if (matchesError) {
        console.error('❌ Error loading matches:', matchesError);
        return;
      }

      console.log('✅ Matches loaded:', matchesData?.length || 0, 'matches');

      // Lade Match-Verfügbarkeiten für alle Matches
      const { data: availabilityData, error: availError } = await supabase
        .from('match_availability')
        .select('match_id, status, player_id');

      if (availError) {
        console.error('❌ Error loading match availability:', availError);
      } else {
        console.log('✅ Match availability loaded');
      }

      // Lade Match-Ergebnisse
      const { data: resultsData, error: resultsError } = await supabase
        .from('match_results')
        .select('match_id, status, winner');

      if (resultsError) {
        console.error('❌ Error loading match results:', resultsError);
      } else {
        console.log('✅ Match results loaded:', resultsData?.length || 0, 'results');
      }

      // Merge Matches mit Verfügbarkeiten und Ergebnissen
      const matchesWithDetails = matchesData.map(match => {
        // Zähle Spieler-Rückmeldungen für dieses Match
        const availabilities = (availabilityData || []).filter(a => a.match_id === match.id);
        const confirmedCount = availabilities.filter(a => a.status === 'available').length;
        const declinedCount = availabilities.filter(a => a.status === 'unavailable').length;
        const pendingCount = availabilities.filter(a => a.status === 'pending').length;

        // Hole Match-Ergebnis: Nur COMPLETED results zählen
        const matchResults = (resultsData || []).filter(r => r.match_id === match.id);
        const completedResults = matchResults.filter(r => r.status === 'completed');
        const hasResult = completedResults.length > 0;
        
        // Zähle Siege
        // winner: 'home' = Heimmannschaft gewinnt (die in der venue spielt)
        // winner: 'guest' = Gastmannschaft gewinnt
        const homeWins = completedResults.filter(r => r.winner === 'home').length;
        const guestWins = completedResults.filter(r => r.winner === 'guest').length;
        
        // Bestimme Heimmannschaft und Gastmannschaft für neutrale Anzeige
        // location='Away' → team_info ist Guest, opponent ist Home
        // location='Home' → team_info ist Home, opponent ist Guest
        const isAwayMatch = match.location === 'Away';
        const homeTeam = isAwayMatch ? match.opponent : (match.team_info?.club_name + ' ' + match.team_info?.team_name);
        const guestTeam = isAwayMatch ? (match.team_info?.club_name + ' ' + match.team_info?.team_name) : match.opponent;

        // Debug: Log für Matches mit Ergebnissen
        if (hasResult) {
          console.log(`🎾 Match "${homeTeam} vs ${guestTeam}" hat Ergebnis:`, {
            match_id: match.id,
            location: match.location,
            homeTeam,
            guestTeam,
            homeWins,
            guestWins,
            result: `${homeWins}:${guestWins}`,
            winner: homeWins > guestWins ? homeTeam : guestTeam
          });
        }

        // Bestimme Status
        const matchDate = new Date(match.match_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let status = 'upcoming';
        if (matchDate < today) {
          status = hasResult ? 'completed' : 'past';
        } else if (matchDate.toDateString() === today.toDateString()) {
          status = 'today';
        }

        // Formatiere Datum
        const formattedDate = matchDate.toLocaleDateString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        // Formatiere Uhrzeit
        const formattedTime = matchDate.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          ...match,
          status,
          confirmed_count: confirmedCount,
          declined_count: declinedCount,
          pending_count: pendingCount,
          total_responses: availabilities.length,
          formatted_date: formattedDate,
          formatted_time: formattedTime,
          is_upcoming: status === 'upcoming' || status === 'today',
          is_completed: status === 'completed' || status === 'past',
          has_result: hasResult,
          home_team: homeTeam,       // Heimmannschaft Name
          guest_team: guestTeam,     // Gastmannschaft Name
          home_score: homeWins,      // Heimmannschaft Siege
          away_score: guestWins,     // Gastmannschaft Siege
          result: hasResult ? `${homeWins}:${guestWins}` : null,
          total_matches: matchResults.length,
          completed_matches: completedResults.length
        };
      });

      console.log('✅ Matches with details merged:', matchesWithDetails.length);
      console.log('🔍 First match sample:', matchesWithDetails[0]);
      setAllMatches(matchesWithDetails);

    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let filterDate;
    
    switch (dateFilter) {
      case 'today':
        filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
        filterDate = new Date(0); // Unix epoch
        break;
      default:
        filterDate = new Date(0);
    }
    
    console.log('📅 Date filter:', dateFilter, '→', filterDate.toISOString());
    return filterDate.toISOString();
  };

  const handleClubAction = async (clubId, action) => {
    try {
      const { error } = await supabase
        .from('club_info')
        .update({
          is_verified: action === 'approve',
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', clubId);

      if (error) throw error;

      // Log die Aktion
      await supabase.rpc('log_activity', {
        p_action: `club_${action}`,
        p_entity_type: 'club',
        p_entity_id: clubId,
        p_details: { action }
      });

      // Aktualisiere Daten
      loadAdminData();

    } catch (error) {
      console.error(`Error ${action}ing club:`, error);
      alert(`Fehler beim ${action === 'approve' ? 'Genehmigen' : 'Ablehnen'} des Vereins`);
    }
  };

  const getActionLabel = (action) => {
    const labelMap = {
      'club_selected': 'Verein ausgewählt',
      'team_created': 'Mannschaft erstellt',
      'profile_updated': 'Profil aktualisiert',
      'onboarding_completed': 'Onboarding abgeschlossen',
      'training_created': 'Training erstellt',
      'training_confirm': 'Training zugesagt',
      'training_decline': 'Training abgesagt',
      'matchday_confirm': 'Medenspiel Verfügbarkeit',
      'matchday_decline': 'Medenspiel Verfügbarkeit',
      'matchday_available': 'Medenspiel Verfügbarkeit',
      'matchday_unavailable': 'Medenspiel Verfügbarkeit',
      'profile_edited': 'Profil bearbeitet',
      'lk_changed': 'LK geändert',
      'match_result_entered': 'Match-Ergebnis eingegeben',
      'page_navigation': 'Seiten-Navigation',
      'error_occurred': 'Fehler aufgetreten',
      'club_approve': 'Verein genehmigt',
      'club_reject': 'Verein abgelehnt'
    };
    return labelMap[action] || action.replace(/_/g, ' ');
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'club_selected': '🏢',
      'team_created': '🏆',
      'profile_updated': '👤',
      'onboarding_completed': '✅',
      'training_created': '🏃',
      'training_confirm': '✅',
      'training_decline': '❌',
      'matchday_confirm': '📅',
      'matchday_decline': '📅',
      'matchday_available': '📅',
      'matchday_unavailable': '📅',
      'profile_edited': '✏️',
      'lk_changed': '📈',
      'match_result_entered': '🏆',
      'page_navigation': '🧭',
      'error_occurred': '⚠️',
      'club_approve': '✅',
      'club_reject': '❌'
    };
    return iconMap[action] || '📝';
  };

  const getActionColor = (action) => {
    const colorMap = {
      'club_selected': '#3b82f6',
      'team_created': '#10b981',
      'profile_updated': '#8b5cf6',
      'onboarding_completed': '#10b981',
      'training_created': '#f59e0b',
      'training_confirm': '#10b981',
      'training_decline': '#ef4444',
      'matchday_confirm': '#10b981',
      'matchday_decline': '#ef4444',
      'profile_edited': '#8b5cf6',
      'lk_changed': '#06b6d4',
      'match_result_entered': '#f59e0b',
      'page_navigation': '#6b7280',
      'error_occurred': '#ef4444',
      'club_approve': '#10b981',
      'club_reject': '#ef4444'
    };
    return colorMap[action] || '#6b7280';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Zeit', 'Benutzer', 'Aktion', 'Entität', 'Details'].join(','),
      ...activityLogs.map(log => [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.user_email || 'Unbekannt',
        log.action,
        log.entity_type || '',
        JSON.stringify(log.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dashboard container" style={{ paddingTop: '2rem' }}>
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">⏳ Lade Admin-Daten...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard container" style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <div className="lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">👑 Super-Admin Dashboard</div>
          <div className="formkurve-subtitle">
            System-Übersicht & Vereinsverwaltung
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="lk-card-full">
        <div className="season-content">
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'overview', label: '📊 Übersicht', icon: TrendingUp },
              { id: 'clubs', label: '🏢 Vereine', icon: Building2 },
              { id: 'teams', label: '🏆 Teams', icon: Users },
              { id: 'matches', label: '🎾 Matches', icon: Activity },
              { id: 'logs', label: '📝 Aktivitäten', icon: Activity },
              { id: 'users', label: '👥 Benutzer', icon: Users },
              { id: 'import', label: '📥 Import', icon: Download }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`btn-modern ${selectedTab === tab.id ? 'btn-modern-active' : 'btn-modern-inactive'}`}
                style={{ minWidth: '120px' }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="today">Heute</option>
                <option value="week">Letzte Woche</option>
                <option value="month">Letzter Monat</option>
                <option value="all">Alle</option>
              </select>
            </div>

            {selectedTab === 'logs' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={logsFilter}
                  onChange={(e) => setLogsFilter(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Alle Aktionen</option>
                  <option value="club_selected">Vereinsauswahl</option>
                  <option value="team_created">Team erstellt</option>
                  <option value="profile_updated">Profil aktualisiert</option>
                  <option value="onboarding_completed">Onboarding abgeschlossen</option>
                  <option value="training_created">Training erstellt</option>
                  <option value="training_confirm">Training zugesagt</option>
                  <option value="training_decline">Training abgesagt</option>
                  <option value="matchday_confirm">Matchday zugesagt</option>
                  <option value="matchday_decline">Matchday abgesagt</option>
                  <option value="profile_edited">Profil bearbeitet</option>
                  <option value="lk_changed">LK geändert</option>
                  <option value="match_result_entered">Match-Ergebnis eingegeben</option>
                  <option value="page_navigation">Seiten-Navigation</option>
                  <option value="error_occurred">Fehler aufgetreten</option>
                </select>
              </div>
            )}

            <button
              onClick={loadAdminData}
              className="btn-modern btn-modern-inactive"
              style={{ padding: '0.5rem' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📊 System-Übersicht</div>
          </div>
          <div className="season-content">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              {/* Aktive Benutzer → Users Tab */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('users')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">👥</div>
                <div className="personality-content">
                  <h4>Aktive Benutzer</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalUsers || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Vereine → Clubs Tab */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('clubs')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">🏢</div>
                <div className="personality-content">
                  <h4>Vereine</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalClubs || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Ausstehende Prüfungen → Clubs Tab */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('clubs')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">⏳</div>
                <div className="personality-content">
                  <h4>Ausstehende Prüfungen</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#f59e0b' }}>
                    {stats.pendingReviews || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Onboarding abgeschlossen → Users Tab */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('users')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">✅</div>
                <div className="personality-content">
                  <h4>Onboarding abgeschlossen</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.onboardingCompleted || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Mannschaften → Teams Tab (neu) */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('teams')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">🏆</div>
                <div className="personality-content">
                  <h4>Mannschaften</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalTeams || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Matches → Matches Tab (neu) */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('matches')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">🎾</div>
                <div className="personality-content">
                  <h4>Matches</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalMatches || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>

              {/* Trainings → keine Detailseite (vorerst) */}
              <div className="personality-card">
                <div className="personality-icon">🏃</div>
                <div className="personality-content">
                  <h4>Trainings</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.totalTrainings || 0}
                  </p>
                </div>
              </div>

              {/* Aktivitäten heute → Logs Tab */}
              <div 
                className="personality-card"
                onClick={() => setSelectedTab('logs')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="personality-icon">📈</div>
                <div className="personality-content">
                  <h4>Aktivitäten heute</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                    {stats.dailyActivity || 0}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Klicken für Details →
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'clubs' && (
        <div>
          {/* Ausstehende Vereine */}
          {pendingClubs.length > 0 && (
            <div className="lk-card-full" style={{ marginBottom: '1.5rem' }}>
              <div className="formkurve-header">
                <div className="formkurve-title">⏳ Ausstehende Prüfungen</div>
                <div className="formkurve-subtitle">
                  {pendingClubs.length} Vereine warten auf Prüfung
                </div>
              </div>
              <div className="season-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingClubs.map(club => (
                    <div key={club.id} style={{
                      padding: '1rem',
                      background: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700' }}>
                          {club.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                          {club.city} • Erstellt: {new Date(club.created_at).toLocaleDateString('de-DE')}
                        </p>
                        {club.admin_notes && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#92400e' }}>
                            📝 {club.admin_notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleClubAction(club.id, 'approve')}
                          className="btn-modern btn-modern-active"
                          style={{ background: '#10b981' }}
                        >
                          <CheckCircle size={16} />
                          Genehmigen
                        </button>
                        <button
                          onClick={() => handleClubAction(club.id, 'reject')}
                          className="btn-modern btn-modern-inactive"
                          style={{ background: '#ef4444', color: 'white' }}
                        >
                          <XCircle size={16} />
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alle Vereine - Tabellen-Ansicht */}
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">🏢 Alle Vereine</div>
              <div className="formkurve-subtitle">
                {allClubs.length} Vereine gesamt • {allClubs.filter(c => c.is_verified).length} verifiziert
              </div>
            </div>
            <div className="season-content">
              {/* Suchfeld */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Verein suchen..."
                  value={clubSearchTerm}
                  onChange={(e) => setClubSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {allClubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Keine Vereine gefunden</p>
                </div>
              ) : (() => {
                // Filter und Sortierung
                const filteredClubs = allClubs
                  .filter(club => {
                    if (!clubSearchTerm) return true;
                    const searchLower = clubSearchTerm.toLowerCase();
                    return (
                      club.name?.toLowerCase().includes(searchLower) ||
                      club.city?.toLowerCase().includes(searchLower) ||
                      club.federation?.toLowerCase().includes(searchLower)
                    );
                  })
                  .sort((a, b) => {
                    // Sortiere nach Spieler-Anzahl (absteigend)
                    const countA = clubPlayerCounts[a.name] || 0;
                    const countB = clubPlayerCounts[b.name] || 0;
                    return countB - countA;
                  });

                if (filteredClubs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>Keine Vereine gefunden für "{clubSearchTerm}"</p>
                    </div>
                  );
                }

                return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                  }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '2px solid #e2e8f0',
                        background: '#f8fafc'
                      }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verein</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Stadt</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verband</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Spieler</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Homepage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Erstellt</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClubs.map((club, index) => {
                        // Hole Spieler-Anzahl aus der Map
                        const playerCount = clubPlayerCounts[club.name] || 0;

                        return (
                          <tr key={club.id} style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            background: index % 2 === 0 ? 'white' : '#f9fafb'
                          }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem', 
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                background: club.is_verified ? '#dcfce7' : '#fef3c7',
                                color: club.is_verified ? '#15803d' : '#92400e',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                {club.is_verified ? '✅ Verifiziert' : '⏳ Prüfung'}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <strong>{club.name}</strong>
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                              {club.city || '-'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                              {club.federation || 'TVM'}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                background: playerCount > 0 ? '#e0e7ff' : '#f1f5f9',
                                color: playerCount > 0 ? '#4338ca' : '#6b7280',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                display: 'inline-block'
                              }}>
                                {playerCount} {playerCount === 1 ? 'Spieler' : 'Spieler'}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {club.website ? (
                                <a 
                                  href={club.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ 
                                    color: '#3b82f6',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  🔗 Website
                                  <Eye size={12} />
                                </a>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {new Date(club.created_at).toLocaleDateString('de-DE')}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {!club.is_verified && (
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleClubAction(club.id, 'approve')}
                                    title="Genehmigen"
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <CheckCircle size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleClubAction(club.id, 'reject')}
                                    title="Ablehnen"
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <XCircle size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'logs' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📝 Aktivitäts-Log</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={exportLogs}
                className="btn-modern btn-modern-inactive"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>
          <div className="season-content">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activityLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Keine Aktivitäten gefunden</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activityLogs.map(log => (
                    <div key={log.id} style={{
                      padding: '0.75rem',
                      background: '#f8fafc',
                      border: `1px solid ${getActionColor(log.action)}20`,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      borderLeft: `4px solid ${getActionColor(log.action)}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>{getActionIcon(log.action)}</span>
                          <strong style={{ color: getActionColor(log.action) }}>
                            {getActionLabel(log.action)}
                          </strong>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {new Date(log.created_at).toLocaleString('de-DE')}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '0.5rem', 
                        marginTop: '0.5rem', 
                        fontSize: '0.8rem',
                        color: '#6b7280' 
                      }}>
                        {/* Erste Zeile: Spieler-Name, Verein, Response */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {(() => {
                            // Nutze JOIN-Daten aus log.player ODER Fallback zu players array
                            const player = log.player || players.find(p => 
                              p.user_id === log.user_id || 
                              p.id === log.details?.player_id ||
                              p.email === log.user_email
                            );
                            
                            if (player) {
                              const teamInfo = player.player_teams?.[0]?.team_info;
                              return (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    👤 <strong>{player.name}</strong>
                                    {player.current_lk && (
                                      <span style={{ 
                                        fontSize: '0.7rem',
                                        padding: '0.125rem 0.375rem',
                                        background: '#e0e7ff',
                                        color: '#4338ca',
                                        borderRadius: '4px',
                                        fontWeight: '600'
                                      }}>
                                        {player.current_lk}
                                      </span>
                                    )}
                                  </div>
                                  {teamInfo && (
                                    <div style={{ 
                                      fontSize: '0.75rem',
                                      color: '#6b7280',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      🏢 {teamInfo.club_name}
                                      {teamInfo.team_name && (
                                        <span style={{ color: '#9ca3af' }}>
                                          • {teamInfo.team_name}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                👤 <strong>{log.user_email || 'Unbekannt'}</strong>
                              </div>
                            );
                          })()}
                          {log.details?.response && (
                            <div style={{ 
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: log.details.response === 'available' ? '#dcfce7' : '#fee2e2',
                              color: log.details.response === 'available' ? '#15803d' : '#991b1b'
                            }}>
                              {log.details.response === 'available' ? '✅ Verfügbar' : '❌ Nicht verfügbar'}
                            </div>
                          )}
                        </div>
                        {/* Zweite Zeile: Match Info (falls matchday action) */}
                        {(log.action.includes('matchday') && log.entity_id) && (() => {
                          const match = matches.find(m => m.id === log.entity_id);
                          if (match) {
                            const matchDate = new Date(match.match_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            });
                            return (
                              <div style={{ 
                                padding: '0.5rem',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                borderLeft: '3px solid #3b82f6',
                                fontSize: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <div>
                                  <strong>🎾 {match.opponent}</strong>
                                  <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                                    • {matchDate}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                  {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                                  {match.venue && ` • ${match.venue}`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details style={{ marginTop: '0.5rem' }}>
                          <summary style={{ 
                            cursor: 'pointer', 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            userSelect: 'none'
                          }}>
                            Details anzeigen
                          </summary>
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem', 
                            background: '#f1f5f9', 
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {/* Profil-Änderungen (profile_edited) */}
                            {log.action === 'profile_edited' && log.details.changes && (
                              <div>
                                <strong style={{ color: '#1f2937', marginBottom: '0.5rem', display: 'block' }}>
                                  📝 Geänderte Felder ({log.details.field_count || Object.keys(log.details.changes).length}):
                                </strong>
                                {Object.keys(log.details.changes).map(field => {
                                  const change = log.details.changes[field];
                                  const fieldLabels = {
                                    name: 'Name',
                                    phone: 'Telefon',
                                    email: 'E-Mail',
                                    current_lk: 'Aktuelle LK',
                                    tennis_motto: 'Tennis-Motto',
                                    favorite_shot: 'Lieblingsschlag',
                                    birth_date: 'Geburtsdatum',
                                    address: 'Adresse',
                                    emergency_contact: 'Notfallkontakt',
                                    emergency_phone: 'Notfall-Telefon'
                                  };
                                  return (
                                    <div key={field} style={{ 
                                      marginBottom: '0.5rem', 
                                      padding: '0.5rem',
                                      background: 'white',
                                      borderRadius: '4px',
                                      borderLeft: '3px solid #3b82f6'
                                    }}>
                                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                                        {fieldLabels[field] || field}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                                        <span style={{ 
                                          padding: '0.25rem 0.5rem',
                                          background: '#fee2e2',
                                          color: '#991b1b',
                                          borderRadius: '4px',
                                          textDecoration: 'line-through'
                                        }}>
                                          {change.old || '(leer)'}
                                        </span>
                                        <span style={{ color: '#6b7280' }}>→</span>
                                        <span style={{ 
                                          padding: '0.25rem 0.5rem',
                                          background: '#dcfce7',
                                          color: '#15803d',
                                          borderRadius: '4px',
                                          fontWeight: '600'
                                        }}>
                                          {change.new || '(leer)'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Andere Details */}
                            {log.details.player_id && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Spieler-ID:</strong> {log.details.player_id.substring(0, 8)}...
                              </div>
                            )}
                            {log.details.url && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>URL:</strong> {log.details.url}
                              </div>
                            )}
                            {log.details.userAgent && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Gerät:</strong> {
                                  log.details.userAgent.includes('iPhone') ? '📱 iPhone' :
                                  log.details.userAgent.includes('Android') ? '📱 Android' :
                                  log.details.userAgent.includes('Mac') ? '💻 Mac' :
                                  log.details.userAgent.includes('Windows') ? '💻 Windows' :
                                  '🖥️ Desktop'
                                }
                              </div>
                            )}
                            {log.details.timestamp && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <strong>Timestamp:</strong> {new Date(log.details.timestamp).toLocaleString('de-DE')}
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'users' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">👥 Benutzer-Verwaltung</div>
            <div className="formkurve-subtitle">
              {players.length} Spieler registriert
            </div>
          </div>
          <div className="season-content">
            {/* Suchfeld */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="🔍 Spieler suchen (Name, Email, Telefon, LK, Verein)..."
                value={playerSearchTerm}
                onChange={(e) => setPlayerSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {players.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Keine Spieler gefunden</p>
              </div>
            ) : (() => {
              // Filter Spieler basierend auf Suchterm
              const filteredPlayers = players.filter(player => {
                if (!playerSearchTerm) return true;
                
                const searchLower = playerSearchTerm.toLowerCase();
                const teams = player.player_teams || [];
                
                return (
                  player.name?.toLowerCase().includes(searchLower) ||
                  player.email?.toLowerCase().includes(searchLower) ||
                  player.phone?.toLowerCase().includes(searchLower) ||
                  player.current_lk?.toLowerCase().includes(searchLower) ||
                  teams.some(pt => 
                    pt.team_info?.club_name?.toLowerCase().includes(searchLower) ||
                    pt.team_info?.team_name?.toLowerCase().includes(searchLower)
                  )
                );
              });

              // Sortiere Spieler
              const sortedPlayers = [...filteredPlayers].sort((a, b) => {
                let aValue, bValue;

                switch (playerSortField) {
                  case 'name':
                    aValue = a.name || '';
                    bValue = b.name || '';
                    break;
                  case 'email':
                    aValue = a.email || '';
                    bValue = b.email || '';
                    break;
                  case 'phone':
                    aValue = a.phone || '';
                    bValue = b.phone || '';
                    break;
                  case 'current_lk':
                    aValue = a.current_lk || '';
                    bValue = b.current_lk || '';
                    break;
                  case 'created_at':
                    aValue = new Date(a.created_at || 0);
                    bValue = new Date(b.created_at || 0);
                    break;
                  case 'is_super_admin':
                    aValue = a.is_super_admin ? 1 : 0;
                    bValue = b.is_super_admin ? 1 : 0;
                    break;
                  case 'role':
                    const aIsCaptain = (a.player_teams || []).some(pt => pt.role === 'captain');
                    const bIsCaptain = (b.player_teams || []).some(pt => pt.role === 'captain');
                    aValue = aIsCaptain ? 1 : 0;
                    bValue = bIsCaptain ? 1 : 0;
                    break;
                  case 'status':
                    aValue = (a.player_teams || []).length;
                    bValue = (b.player_teams || []).length;
                    break;
                  default:
                    return 0;
                }

                // Vergleich
                let comparison = 0;
                if (aValue < bValue) comparison = -1;
                if (aValue > bValue) comparison = 1;

                return playerSortDirection === 'asc' ? comparison : -comparison;
              });

              if (filteredPlayers.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Keine Spieler gefunden für "{playerSearchTerm}"</p>
                  </div>
                );
              }

              return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: '2px solid #e2e8f0',
                      background: '#f8fafc'
                    }}>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'name') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('name');
                            setPlayerSortDirection('asc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Spieler {playerSortField === 'name' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'email') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('email');
                            setPlayerSortDirection('asc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Email {playerSortField === 'email' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'phone') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('phone');
                            setPlayerSortDirection('asc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'center', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Telefon {playerSortField === 'phone' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'current_lk') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('current_lk');
                            setPlayerSortDirection('asc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'center', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        LK {playerSortField === 'current_lk' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Verein(e)</th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'role') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('role');
                            setPlayerSortDirection('desc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'center', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Rolle {playerSortField === 'role' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'created_at') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('created_at');
                            setPlayerSortDirection('desc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Registriert {playerSortField === 'created_at' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (playerSortField === 'status') {
                            setPlayerSortDirection(playerSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPlayerSortField('status');
                            setPlayerSortDirection('desc');
                          }
                        }}
                        style={{ 
                          padding: '0.75rem', 
                          textAlign: 'center', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        Status {playerSortField === 'status' && (playerSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((player, index) => {
                        const teams = player.player_teams || [];
                        const isCaptain = teams.some(pt => pt.role === 'captain');
                        
                        return (
                          <tr key={player.id} style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            background: index % 2 === 0 ? 'white' : '#f9fafb'
                          }}>
                            {/* Spieler Name */}
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong>{player.name || 'Unbekannt'}</strong>
                                {player.is_super_admin && (
                                  <span style={{ 
                                    fontSize: '0.7rem',
                                    padding: '0.125rem 0.375rem',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                  }}>
                                    👑 Admin
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            {/* Email */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {player.email || '-'}
                            </td>
                            
                            {/* Telefon */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {player.phone ? (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {player.phone}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            
                            {/* LK */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {player.current_lk ? (
                                <div style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                  display: 'inline-block'
                                }}>
                                  {player.current_lk}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            
                            {/* Verein(e) */}
                            <td style={{ padding: '0.75rem' }}>
                              {teams.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {teams.map((pt, idx) => (
                                    <div key={idx} style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      🏢 {pt.team_info?.club_name || 'Unbekannt'}
                                      {pt.team_info?.team_name && (
                                        <span style={{ color: '#9ca3af' }}>
                                          {' • '}{pt.team_info.team_name}
                                        </span>
                                      )}
                                      {pt.is_primary && (
                                        <span style={{ 
                                          marginLeft: '0.25rem',
                                          fontSize: '0.7rem',
                                          padding: '0.125rem 0.25rem',
                                          background: '#dbeafe',
                                          color: '#1e40af',
                                          borderRadius: '3px',
                                          fontWeight: '600'
                                        }}>
                                          Hauptteam
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Kein Verein</span>
                              )}
                            </td>
                            
                            {/* Rolle */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {isCaptain ? (
                                <div style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: '600',
                                  fontSize: '0.7rem',
                                  display: 'inline-block'
                                }}>
                                  🎯 MF
                                </div>
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Spieler</span>
                              )}
                            </td>
                            
                            {/* Registriert */}
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                              {new Date(player.created_at).toLocaleDateString('de-DE')}
                            </td>
                            
                            {/* Status */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ 
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                background: teams.length > 0 ? '#dcfce7' : '#fee2e2',
                                color: teams.length > 0 ? '#15803d' : '#991b1b',
                                fontWeight: '600',
                                fontSize: '0.7rem',
                                display: 'inline-block'
                              }}>
                                {teams.length > 0 ? '✅ Aktiv' : '⚠️ Kein Team'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Teams Tab - IMPLEMENTIERT */}
      {selectedTab === 'teams' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">🏆 Teams-Verwaltung</div>
            <div className="formkurve-subtitle">
              {teams.length} Mannschaften in {new Set(teams.map(t => t.club_name)).size} Vereinen
            </div>
          </div>
          <div className="season-content">
            {/* Suche & Filter */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Suchfeld */}
              <input
                type="text"
                placeholder="🔍 Suche nach Verein, Team, Liga..."
                value={teamSearchTerm}
                onChange={(e) => setTeamSearchTerm(e.target.value)}
                style={{
                  flex: '1 1 300px',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              
              {/* Kategorie-Filter */}
              <select
                value={teamCategoryFilter}
                onChange={(e) => setTeamCategoryFilter(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  minWidth: '150px'
                }}
              >
                <option value="all">Alle Kategorien</option>
                {Array.from(new Set(teams.map(t => t.category))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Saison-Filter */}
              <select
                value={teamSeasonFilter}
                onChange={(e) => setTeamSeasonFilter(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  minWidth: '150px'
                }}
              >
                <option value="all">Alle Saisons</option>
                {Array.from(new Set(teams.map(t => t.season))).sort().reverse().map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>

              {/* Sortier-Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                <button
                  onClick={() => toggleTeamSort('club')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: teamSortField === 'club' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: teamSortField === 'club' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: teamSortField === 'club' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Verein {teamSortField === 'club' && (teamSortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleTeamSort('category')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: teamSortField === 'category' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: teamSortField === 'category' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: teamSortField === 'category' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Kategorie {teamSortField === 'category' && (teamSortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleTeamSort('players')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: teamSortField === 'players' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: teamSortField === 'players' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: teamSortField === 'players' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Spieler {teamSortField === 'players' && (teamSortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleTeamSort('season')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: teamSortField === 'season' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: teamSortField === 'season' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: teamSortField === 'season' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Saison {teamSortField === 'season' && (teamSortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Keine Teams gefunden</p>
              </div>
            ) : (() => {
              // Filter Teams
              let filteredTeams = teams.filter(team => {
                const matchesSearch = !teamSearchTerm || 
                  team.club_name?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                  team.team_name?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                  team.category?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                  team.league?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                  team.group_name?.toLowerCase().includes(teamSearchTerm.toLowerCase());
                
                const matchesCategory = teamCategoryFilter === 'all' || team.category === teamCategoryFilter;
                const matchesSeason = teamSeasonFilter === 'all' || team.season === teamSeasonFilter;
                
                return matchesSearch && matchesCategory && matchesSeason;
              });

              // Sortiere Teams
              filteredTeams = sortTeams(filteredTeams);

              // Gruppiere nach Verein
              const teamsByClub = filteredTeams.reduce((acc, team) => {
                const clubName = team.club_name || 'Unbekannter Verein';
                if (!acc[clubName]) {
                  acc[clubName] = [];
                }
                acc[clubName].push(team);
                return acc;
              }, {});

              const clubNames = Object.keys(teamsByClub).sort();

              if (filteredTeams.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Keine Teams gefunden für die gewählten Filter</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {clubNames.map((clubName, clubIndex) => {
                    const clubTeams = teamsByClub[clubName];
                    const totalPlayers = clubTeams.reduce((sum, t) => sum + t.player_count, 0);
                    
                    return (
                      <div key={clubName} style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        {/* Club Header */}
                        <div style={{
                          padding: '1rem 1.5rem',
                          background: `linear-gradient(135deg, ${['#667eea', '#f093fb', '#4facfe', '#43e97b'][clubIndex % 4]} 0%, ${['#764ba2', '#f5576c', '#00f2fe', '#38f9d7'][clubIndex % 4]} 100%)`,
                          color: 'white'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
                                🏢 {clubName}
                              </h3>
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                                {clubTeams.length} Team{clubTeams.length !== 1 ? 's' : ''} • {totalPlayers} Spieler
                              </p>
                            </div>
                            <div style={{ 
                              padding: '0.5rem 1rem', 
                              background: 'rgba(255,255,255,0.2)', 
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              {clubTeams[0]?.region || 'Region unbekannt'}
                            </div>
                          </div>
                        </div>

                        {/* Teams Grid */}
                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                          {clubTeams.map((team) => (
                            <div key={team.id} style={{
                              padding: '1rem',
                              border: '2px solid #e2e8f0',
                              borderRadius: '8px',
                              background: team.has_season ? 'white' : '#fef3c7',
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#3b82f6';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}>
                              {/* Team Name & Category */}
                              <div style={{ marginBottom: '0.75rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                                  {team.team_name}
                                </h4>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                  {team.category}
                                </div>
                              </div>

                              {/* Season Info */}
                              {team.has_season ? (
                                <div style={{ 
                                  padding: '0.5rem', 
                                  background: '#f8fafc', 
                                  borderRadius: '6px',
                                  marginBottom: '0.75rem'
                                }}>
                                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.25rem' }}>
                                    <strong>📅 {team.season}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    🏆 {team.league}
                                    {team.group_name !== '-' && ` • ${team.group_name}`}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '0.5rem', 
                                  background: '#fef3c7', 
                                  borderRadius: '6px',
                                  marginBottom: '0.75rem',
                                  border: '1px dashed #f59e0b'
                                }}>
                                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                                    ⚠️ Keine Saison-Daten
                                  </div>
                                </div>
                              )}

                              {/* Stats */}
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  background: '#e0e7ff', 
                                  color: '#4338ca',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600'
                                }}>
                                  👥 {team.player_count} / {team.team_size} Spieler
                                </div>
                                {team.tvm_link && (
                                  <a
                                    href={team.tvm_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    🔗 TVM
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {selectedTab === 'matches' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">🎾 Match-Verwaltung</div>
            <div className="formkurve-subtitle">
              Alle Matches im System • {allMatches.length} gesamt
            </div>
          </div>
          <div className="season-content">
            {/* Controls */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* View Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  onClick={() => setMatchView('upcoming')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: matchView === 'upcoming' ? '#3b82f6' : 'transparent',
                    color: matchView === 'upcoming' ? 'white' : '#64748b',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 Bevorstehend
                </button>
                <button
                  onClick={() => setMatchView('completed')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: matchView === 'completed' ? '#10b981' : 'transparent',
                    color: matchView === 'completed' ? 'white' : '#64748b',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ✅ Abgeschlossen
                </button>
                <button
                  onClick={() => setMatchView('all')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: matchView === 'all' ? '#6366f1' : 'transparent',
                    color: matchView === 'all' ? 'white' : '#64748b',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Alle
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Suche nach Team, Gegner, Ort..."
                value={matchSearchTerm}
                onChange={(e) => setMatchSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />

              {/* Status Filter */}
              <select
                value={matchStatusFilter}
                onChange={(e) => setMatchStatusFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Alle Status</option>
                <option value="upcoming">Bevorstehend</option>
                <option value="today">Heute</option>
                <option value="completed">Abgeschlossen</option>
                <option value="past">Vergangen (ohne Ergebnis)</option>
              </select>

              {/* Sortier-Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                <button
                  onClick={() => toggleMatchSort('date')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: matchSortField === 'date' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: matchSortField === 'date' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: matchSortField === 'date' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Datum {matchSortField === 'date' && (matchSortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleMatchSort('team')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: matchSortField === 'team' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: matchSortField === 'team' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: matchSortField === 'team' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Team {matchSortField === 'team' && (matchSortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleMatchSort('status')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: matchSortField === 'status' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: matchSortField === 'status' ? '#eff6ff' : 'white',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: matchSortField === 'status' ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Status {matchSortField === 'status' && (matchSortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {/* Matches Display */}
            {(() => {
              // Filter matches
              let filteredMatches = allMatches;

              // View filter
              if (matchView === 'upcoming') {
                filteredMatches = filteredMatches.filter(m => m.is_upcoming);
              } else if (matchView === 'completed') {
                filteredMatches = filteredMatches.filter(m => m.is_completed);
              }

              // Status filter
              if (matchStatusFilter !== 'all') {
                filteredMatches = filteredMatches.filter(m => m.status === matchStatusFilter);
              }

              // Search filter
              if (matchSearchTerm.trim()) {
                const searchLower = matchSearchTerm.toLowerCase();
                filteredMatches = filteredMatches.filter(m =>
                  m.opponent?.toLowerCase().includes(searchLower) ||
                  m.team_info?.team_name?.toLowerCase().includes(searchLower) ||
                  m.team_info?.club_name?.toLowerCase().includes(searchLower) ||
                  m.venue?.toLowerCase().includes(searchLower) ||
                  m.location?.toLowerCase().includes(searchLower)
                );
              }

              // Sortiere Matches
              filteredMatches = sortMatches(filteredMatches);

              if (filteredMatches.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                    <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p>Keine Matches gefunden</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredMatches.map(match => {
                    const statusColors = {
                      upcoming: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
                      today: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                      completed: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
                      past: { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' }
                    };
                    const colors = statusColors[match.status] || statusColors.upcoming;

                    return (
                      <div
                        key={match.id}
                        onClick={() => loadMatchDetails(match)}
                        style={{
                          padding: '1.25rem',
                          border: `2px solid ${colors.border}`,
                          borderRadius: '12px',
                          background: 'white',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          {/* Left: Match Info */}
                          <div style={{ flex: 1 }}>
                            {/* Status Badge */}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                background: colors.bg,
                                color: colors.text,
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase'
                              }}>
                                {match.status === 'upcoming' && '📅 Bevorstehend'}
                                {match.status === 'today' && '🔥 Heute'}
                                {match.status === 'completed' && '✅ Abgeschlossen'}
                                {match.status === 'past' && '⏳ Vergangen'}
                              </span>
                            </div>

                            {/* Teams - Neutral anzeigen: Home vs Guest */}
                            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937' }}>
                              {match.home_team}
                              <span style={{ margin: '0 0.75rem', color: '#6b7280', fontWeight: '400' }}>vs</span>
                              {match.guest_team}
                            </div>

                            {/* Date & Time */}
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              🗓️ {match.formatted_date} • 🕐 {match.formatted_time}
                            </div>

                            {/* Location */}
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              📍 {match.location} • {match.venue}
                            </div>
                          </div>

                          {/* Right: Stats */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                            {/* Result (if completed) */}
                            {match.has_result && (
                              <div style={{
                                padding: '0.75rem 1.25rem',
                                background: colors.bg,
                                borderRadius: '8px',
                                textAlign: 'center',
                                minWidth: '100px'
                              }}>
                                <div style={{ fontSize: '0.7rem', color: colors.text, fontWeight: '600', marginBottom: '0.25rem' }}>
                                  ERGEBNIS
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: colors.text }}>
                                  {match.home_score}:{match.away_score}
                                </div>
                              </div>
                            )}

                            {/* Player Responses */}
                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                background: '#d1fae5',
                                color: '#065f46',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                ✓ {match.confirmed_count}
                              </div>
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                ✗ {match.declined_count}
                              </div>
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                background: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                ? {match.pending_count}
                              </div>
                            </div>

                            {/* Players Needed */}
                            {match.players_needed && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                👥 {match.players_needed} Spieler benötigt
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Additional Info */}
                        <div style={{
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '1rem',
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          <span>🏆 {match.team_info?.category || 'Unbekannt'}</span>
                          <span>📅 {match.season}</span>
                          <span>📊 {match.total_responses} Rückmeldungen</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Import Tab - Placeholder */}
      {selectedTab === 'import' && (
        <div className="lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">📥 Daten-Import mit KI-Unterstützung</div>
            <div className="formkurve-subtitle">
              Automatischer Import von Matches und Spielern aus TVM-Daten
            </div>
          </div>
          <div className="season-content">
            <div style={{ padding: '2rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {/* Match Import */}
                <div style={{ 
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🎾 Match-Import
                  </h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1rem', opacity: 0.9 }}>
                    Importiere Matches aus TVM-Meldelisten mit GPT-4o Unterstützung
                  </p>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', margin: '1rem 0' }}>
                    <li>Text/URL eingeben oder CSV hochladen</li>
                    <li>KI extrahiert Match-Daten automatisch</li>
                    <li>Review & Korrektur vor Import</li>
                    <li>Duplikat-Prüfung</li>
                  </ul>
                  <div style={{ 
                    marginTop: '1.5rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}>
                    💰 Kosten: ~$0.01 pro Import (10 Matches)
                  </div>
                </div>

                {/* Spieler Import */}
                <div style={{ 
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    👥 Spieler-Import
                  </h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1rem', opacity: 0.9 }}>
                    Importiere Spieler aus TVM-Meldelisten mit Fuzzy-Matching
                  </p>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', margin: '1rem 0' }}>
                    <li>TVM-Meldeliste URL oder Copy/Paste</li>
                    <li>KI extrahiert Namen, LK, Teams</li>
                    <li>Matching mit existierenden Spielern</li>
                    <li>Automatische Einladungs-Emails</li>
                  </ul>
                  <div style={{ 
                    marginTop: '1.5rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}>
                    ✅ 3 Status: Existing / Unsicher / Neu
                  </div>
                </div>
              </div>

              {/* Workflow Overview */}
              <div style={{ 
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                  🔄 Import-Workflow
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '1rem'
                }}>
                  {[
                    { step: '1', icon: '📤', label: 'Daten hochladen' },
                    { step: '2', icon: '🤖', label: 'KI-Verarbeitung' },
                    { step: '3', icon: '👁️', label: 'Review & Edit' },
                    { step: '4', icon: '💾', label: 'Datenbank-Import' },
                    { step: '5', icon: '✅', label: 'Fertig!' }
                  ].map((item) => (
                    <div key={item.step} style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{ 
                        fontSize: '2rem',
                        marginBottom: '0.5rem'
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem',
                        color: '#64748b',
                        fontWeight: '600'
                      }}>
                        Schritt {item.step}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginTop: '0.25rem'
                      }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to Action */}
              <div style={{ 
                marginTop: '2rem',
                textAlign: 'center',
                padding: '2rem',
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  🚀 Bereit für die Implementierung
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem' }}>
                  Backend-API & Frontend-UI werden in Phase 4-6 entwickelt
                </p>
                <p style={{ fontSize: '0.75rem', color: '#92400e' }}>
                  📄 Vollständiger Plan: <code style={{ background: 'rgba(255,255,255,0.5)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>SUPER_ADMIN_ROADMAP.md</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match-Detail-Modal */}
      {selectedMatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={closeMatchModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '2rem',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                  🎾 Match-Details
                </h2>
                <button
                  onClick={closeMatchModal}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    lineHeight: '1',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Match Info */}
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                {selectedMatch.home_team}
                <span style={{ margin: '0 0.75rem', color: '#6b7280', fontWeight: '400' }}>vs</span>
                {selectedMatch.guest_team}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                📅 {selectedMatch.formatted_date} • 🕐 {selectedMatch.formatted_time}
                <br />
                📍 {selectedMatch.location} • {selectedMatch.venue}
              </div>
              
              {/* Gesamt-Ergebnis */}
              {selectedMatch.has_result && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: selectedMatch.home_score > selectedMatch.away_score ? '#d1fae5' : '#fee2e2',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                    ENDERGEBNIS
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                    {selectedMatch.home_score} : {selectedMatch.away_score}
                  </div>
                </div>
              )}
            </div>

            {/* Match Results */}
            {loadingMatchDetails ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Lade Spieldetails...</p>
              </div>
            ) : matchDetails && matchDetails.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {matchDetails.map((result, index) => {
                  const isWinnerHome = result.winner === 'home';
                  const isCompleted = result.status === 'completed';

                  return (
                    <div
                      key={result.id}
                      style={{
                        padding: '1rem',
                        border: isCompleted ? `2px solid ${isWinnerHome ? '#10b981' : '#3b82f6'}` : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        background: isCompleted ? (isWinnerHome ? '#f0fdf4' : '#eff6ff') : '#f9fafb'
                      }}
                    >
                      {/* Match Number & Type */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: isCompleted ? (isWinnerHome ? '#10b981' : '#3b82f6') : '#9ca3af',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}>
                            #{result.match_number}
                          </span>
                          <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1f2937' }}>
                            {result.match_type}
                          </span>
                        </div>
                        {isCompleted && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            ✅ Abgeschlossen
                          </span>
                        )}
                      </div>

                      {/* Spieler */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
                        {/* Home Spieler */}
                        <div style={{ textAlign: 'left' }}>
                          {result.match_type === 'Einzel' ? (
                            <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                              <strong>{result.home_player?.name || 'Unbekannt'}</strong>
                              {result.home_player?.current_lk && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                  ({result.home_player.current_lk})
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                                <strong>{result.home_player1?.name || 'Unbekannt'}</strong>
                                {result.home_player1?.current_lk && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                    ({result.home_player1.current_lk})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem' }}>
                                <strong>{result.home_player2?.name || 'Unbekannt'}</strong>
                                {result.home_player2?.current_lk && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                    ({result.home_player2.current_lk})
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Satz-Ergebnisse */}
                        <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                            {result.set1_home}:{result.set1_guest}
                            {result.set2_home !== null && (
                              <> {result.set2_home}:{result.set2_guest}</>
                            )}
                            {result.set3_home !== null && (
                              <> {result.set3_home}:{result.set3_guest}</>
                            )}
                          </div>
                        </div>

                        {/* Guest Spieler */}
                        <div style={{ textAlign: 'right' }}>
                          {result.match_type === 'Einzel' ? (
                            <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                              <strong>{result.guest_player?.name || 'Unbekannt'}</strong>
                              {result.guest_player?.current_lk && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.5rem' }}>
                                  ({result.guest_player.current_lk})
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                                <strong>{result.guest_player1?.name || 'Unbekannt'}</strong>
                                {result.guest_player1?.current_lk && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.5rem' }}>
                                    ({result.guest_player1.current_lk})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem' }}>
                                <strong>{result.guest_player2?.name || 'Unbekannt'}</strong>
                                {result.guest_player2?.current_lk && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.5rem' }}>
                                    ({result.guest_player2.current_lk})
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                <p>Keine Einzelergebnisse vorhanden</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
