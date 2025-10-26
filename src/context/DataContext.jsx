import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// Lokale Test-Daten für TC Köln (nur für Theo Tester)
import tcKoelnTestData from '../../testdata-tc-koeln/tc-koeln-team.json';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const { isAuthenticated, loading: authLoading, player } = useAuth();
  
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leagueStandings, setLeagueStandings] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
        loadLeagueStandings(),
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
          
          // Lade team_seasons - versuche beide Season-Formate
          // WICHTIG: Die DB verwendet 'Winter 2025/26' als Standard
          let { data: seasonData } = await supabase
            .from('team_seasons')
            .select('*')
            .eq('team_id', pt.team_info.id)
            .eq('season', 'Winter 2025/26')
            .eq('is_active', true)
            .maybeSingle();
          
          console.log(`🔍 Querying 'Winter 2025/26' for ${pt.team_info.team_name || pt.team_info.category}:`, seasonData);
          
          // Fallback auf 'winter_25_26' (für alte Einträge)
          if (!seasonData) {
            const { data: fallbackData } = await supabase
              .from('team_seasons')
              .select('*')
              .eq('team_id', pt.team_info.id)
              .eq('season', 'winter_25_26')
              .eq('is_active', true)
              .maybeSingle();
            seasonData = fallbackData;
            console.log(`🔍 Fallback 'winter_25_26' for ${pt.team_info.team_name || pt.team_info.category}:`, fallbackData);
          }
          
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
      
      // LOKALE TEST-DATEN: Füge TC Köln hinzu NUR für Theo Tester
      const isTheoTester = playerName === 'Theo Tester';
      if (tcKoelnTestData.enabled && isTheoTester) {
        console.log('🧪 Adding TC Köln test team for Theo Tester');
        teams.push({
          id: tcKoelnTestData.team.id,
          club_name: tcKoelnTestData.team.club_name,
          team_name: tcKoelnTestData.team.team_name,
          category: tcKoelnTestData.team.category,
          league: tcKoelnTestData.team.league,
          group_name: tcKoelnTestData.team.group_name,
          region: tcKoelnTestData.team.region,
          tvm_link: tcKoelnTestData.team.tvm_link,
          season: tcKoelnTestData.team.season,
          season_year: tcKoelnTestData.team.season_year,
          is_primary: false,
          role: 'player',
          isTestData: true
        });
      } else if (tcKoelnTestData.enabled && !isTheoTester) {
        // console.log('⚠️ TC Köln test data SKIPPED for', playerName, '(not Theo Tester)');
      }
      
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

      const { data, error } = await supabase
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
            players (
              id,
              name,
              ranking
            )
          )
        `)
        .in('team_id', playerTeamIds)  // 🔒 FILTERUNG: Nur Matches der eigenen Teams!
        .order('match_date', { ascending: true });

      if (error) {
        console.error('Error loading matches:', error);
        return;
      }

      console.log('✅ Matches loaded from DB (filtered by player teams):', data?.length || 0, 'matches');

      // Transformiere Daten - verwende playerId als Key (nicht Name!)
      let transformedMatches = data.map(match => ({
        id: match.id,
        date: new Date(match.match_date),
        opponent: match.opponent,
        location: match.location,
        venue: match.venue,
        season: match.season,
        playersNeeded: match.players_needed,
        teamId: match.team_id,
        // Team-Info für Badge UND Filter
        teamInfo: match.team_info ? {
          id: match.team_info.id, // WICHTIG: ID für Filterung!
          clubName: match.team_info.club_name,
          teamName: match.team_info.team_name,
          category: match.team_info.category
        } : null,
        availability: match.match_availability.reduce((acc, avail) => {
          // Verwende player_id als Key für schnellen Zugriff
          acc[avail.player_id] = {
            status: avail.status,
            comment: avail.comment,
            playerName: avail.players?.name || 'Unbekannt'
          };
          return acc;
        }, {})
      }));

      // LOKALE TEST-DATEN: Füge TC Köln Matches hinzu NUR für Theo Tester
      const isTheoTester = currentPlayerName === 'Theo Tester';
      if (tcKoelnTestData.enabled && tcKoelnTestData.matches && isTheoTester) {
        console.log('🧪 Adding', tcKoelnTestData.matches.length, 'TC Köln test matches for Theo Tester');
        
        const testMatches = tcKoelnTestData.matches.map(match => ({
          id: match.id,
          date: new Date(match.match_date),
          opponent: match.opponent,
          location: match.location,
          venue: match.venue,
          season: match.season,
          playersNeeded: match.players_needed,
          teamId: match.team_id,
          teamInfo: {
            id: tcKoelnTestData.team.id, // WICHTIG: ID für Filterung!
            clubName: tcKoelnTestData.team.club_name,
            teamName: tcKoelnTestData.team.team_name,
            category: tcKoelnTestData.team.category
          },
          availability: match.availability || {},
          isTestData: true
        }));
        
        transformedMatches = [...transformedMatches, ...testMatches];
        console.log('✅ Total matches (DB + Test):', transformedMatches.length);
      } else if (tcKoelnTestData.enabled && !isTheoTester) {
        // console.log('⚠️ TC Köln test matches SKIPPED for', currentPlayerName, '(not Theo Tester)');
      }

      setMatches(transformedMatches);
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
      .eq('is_active', true)
      .eq('player_type', 'app_user') // Nur App-User für Frontend
      .order('points', { ascending: false });

    if (error) {
      console.error('Error loading players:', error);
      return;
    }

    console.log('✅ Players loaded:', data?.length || 0, 'players');
    setPlayers(data);
  };

  // Lade Tabelle (DEAKTIVIERT - Tabelle existiert nicht)
  const loadLeagueStandings = async () => {
    // console.log('⚠️ League standings loading deactivated - table does not exist');
    setLeagueStandings([]);
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
          setTeamInfo({
            id: data.id,
            teamName: data.team_name,
            clubName: data.club_name,
            category: data.category || 'Herren',
            league: data.league || 'Kreisliga',
            group: data.group_name || '',
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
      // 1. Lösche zuerst alle match_availability Einträge für dieses Match
      console.log('🔵 Deleting match_availability entries...');
      const { error: availabilityError } = await supabase
        .from('match_availability')
        .delete()
        .eq('match_id', matchId);

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
        .eq('match_id', matchId);

      if (resultsError) {
        console.warn('⚠️ Error deleting results (might not exist):', resultsError);
        // Nicht abbrechen, da match_results möglicherweise leer ist
      } else {
        console.log('✅ Match results deleted (if any)');
      }

      // 3. Lösche das Match selbst
      console.log('🔵 Deleting match...');
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (matchError) {
        console.error('❌ Error deleting match:', matchError);
        throw matchError;
      }
      console.log('✅ Match deleted');

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
        .eq('match_id', matchId)
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
            match_id: matchId,
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
      
      // Lade alle Verfügbarkeits-Daten mit Spieler- und Match-Informationen
      const { data: availabilityData, error } = await supabase
        .from('match_availability')
        .select(`
          *,
          players!match_availability_player_id_fkey (
            name
          ),
          matches!match_availability_match_id_fkey (
            opponent,
            match_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading historical data:', error);
        return { success: false, error: error.message };
      }

      console.log('📊 Found historical availability records:', availabilityData?.length || 0);

      // Konvertiere zu Log-Format
      const historicalLogs = availabilityData?.map(record => ({
        timestamp: record.created_at || new Date().toISOString(),
        playerName: record.players?.name || 'Unbekannter Spieler',
        playerId: record.player_id,
        matchInfo: record.matches ? `${record.matches.opponent} (${new Date(record.matches.match_date).toLocaleDateString('de-DE')})` : 'Unbekanntes Match',
        matchId: record.match_id,
        status: record.status,
        comment: record.comment || null,
        action: 'imported', // Kennzeichnung als importierte historische Daten
        originalId: record.id
      })) || [];

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

  const value = {
    matches,
    players,
    leagueStandings,
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

