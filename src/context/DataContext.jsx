import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

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
  }, [configured]);

  // Lade alle Daten
  const loadAllData = async () => {
    try {
      await Promise.all([
        loadMatches(),
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

  // Lade Matches
  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
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

    // Transformiere Daten - verwende playerId als Key (nicht Name!)
    const transformedMatches = data.map(match => ({
      id: match.id,
      date: new Date(match.match_date),
      opponent: match.opponent,
      location: match.location,
      venue: match.venue,
      season: match.season,
      playersNeeded: match.players_needed,
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

    setMatches(transformedMatches);
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

  // Lade Team Info
  const loadTeamInfo = async () => {
    // Bestimme aktuelle Saison
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

    // Lade Team-Info für die aktuelle Saison
    const { data, error } = await supabase
      .from('team_info')
      .select('*')
      .eq('season', season)
      .eq('season_year', seasonYear)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error loading team info:', error);
      return;
    }

    if (data) {
      console.log('✅ Team info loaded:', data);
      setTeamInfo({
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
      
      console.log('📝 Verfügbarkeits-Log:', logEntry);
      
      // Speichere Log in localStorage für Admin-Anzeige
      const existingLogs = JSON.parse(localStorage.getItem('availability_logs') || '[]');
      existingLogs.unshift(logEntry);
      
      // Erweitert: Behalte mehr Einträge für bessere Nachverfolgung (500 statt 100)
      if (existingLogs.length > 500) {
        existingLogs.splice(500);
      }
      
      localStorage.setItem('availability_logs', JSON.stringify(existingLogs));
      
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
    updateTeamInfo
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

