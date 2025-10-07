import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Lokale Test-Daten für TC Köln (nur für Theo Tester)
import tcKoelnTestData from '../../testdata-tc-koeln/tc-koeln-team.json';

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
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

  // Initial data load
  useEffect(() => {
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
  }, [configured]);

  // Reload TeamInfo wenn selectedTeamId sich ändert (Matches werden nicht gefiltert)
  useEffect(() => {
    if (selectedTeamId && configured) {
      console.log('🔄 Team changed, reloading team info for:', selectedTeamId);
      loadTeamInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  // Lade alle Daten
  const loadAllData = async (playerId = null) => {
    try {
      // Lade zuerst Player-Teams (wenn playerId vorhanden) - für Test-Daten-Filter
      if (playerId) {
        await loadPlayerTeams(playerId);
      }
      
      // Lade Matches NACH loadPlayerTeams (benötigt currentPlayerName)
      await loadMatches();
      
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
        .from('players')
        .select('name')
        .eq('id', playerId)
        .single();
      
      const playerName = playerData?.name || '';
      console.log('👤 Player name:', playerName);
      setCurrentPlayerName(playerName); // Speichere für Test-Daten-Filter
      
      const { data, error } = await supabase
        .from('player_teams')
        .select(`
          *,
          team_info (
            id,
            team_name,
            club_name,
            category,
            league,
            group_name,
            region,
            tvm_link,
            season,
            season_year
          )
        `)
        .eq('player_id', playerId)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error loading player teams:', error);
        return;
      }

      console.log('✅ Player teams loaded from DB:', data);
      
      let teams = data.map(pt => ({
        ...pt.team_info,
        is_primary: pt.is_primary,
        role: pt.role
      }));
      
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
        console.log('⚠️ TC Köln test data SKIPPED for', playerName, '(not Theo Tester)');
      }
      
      setPlayerTeams(teams);
      
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

  // Lade Matches (ALLE Matches mit Team-Info)
  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_info (
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
        .order('match_date', { ascending: true });

      if (error) {
        console.error('Error loading matches:', error);
        return;
      }

      console.log('✅ Matches loaded from DB:', data?.length || 0, 'matches');

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
        console.log('⚠️ TC Köln test matches SKIPPED for', currentPlayerName, '(not Theo Tester)');
      }

      setMatches(transformedMatches);
    } catch (error) {
      console.error('Error in loadMatches:', error);
    }
  };

  // Lade Spieler (für Rangliste)
  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('is_active', true)
      .order('points', { ascending: false });

    if (error) {
      console.error('Error loading players:', error);
      return;
    }

    setPlayers(data);
  };

  // Lade Tabelle
  const loadLeagueStandings = async () => {
    const { data, error } = await supabase
      .from('league_standings')
      .select('*')
      .eq('season', 'winter')
      .order('position', { ascending: true });

    if (error) {
      console.error('Error loading standings:', error);
      return;
    }

    // Transformiere für Kompatibilität
    const transformed = data.map(row => ({
      position: row.position,
      team: row.team_name,
      matches: row.matches_played,
      wins: row.wins,
      losses: row.losses,
      points: row.points
    }));

    setLeagueStandings(transformed);
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
            category: data.category,
            league: data.league,
            group: data.group_name,
            region: data.region,
            tvmLink: data.tvm_link,
            season: data.season,
            seasonYear: data.season_year
          });
        } else {
          setTeamInfo(null);
        }
        return;
      }
      
      // Fallback: Lade Team für aktuelle Saison (alte Logik)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let season = 'winter';
      let seasonYear = '';
      
      if (currentMonth >= 4 && currentMonth <= 7) {
        season = 'summer';
        seasonYear = String(currentYear);
      } else {
        season = 'winter';
        if (currentMonth >= 8) {
          const nextYear = currentYear + 1;
          seasonYear = `${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}`;
        } else {
          const prevYear = currentYear - 1;
          seasonYear = `${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}`;
        }
      }
      
      console.log('🔵 Loading team info for season:', season, seasonYear);

      const { data, error } = await supabase
        .from('team_info')
        .select('*')
        .eq('season', season)
        .eq('season_year', seasonYear)
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
          category: data.category,
          league: data.league,
          group: data.group_name,
          region: data.region,
          tvmLink: data.tvm_link,
          season: data.season,
          seasonYear: data.season_year
        });
      } else {
        console.log('⚠️ No team info for current season yet');
        setTeamInfo(null);
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

    // Players (für Rangliste)
    const playersSubscription = supabase
      .channel('players-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
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
        .from('players')
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
        .from('players')
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

