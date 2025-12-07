import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import './Rankings.css';
import './Dashboard.css';

/**
 * Rankings-Komponente (Neue Version)
 * 
 * Features:
 * - ✅ SAISONSUEBERGREIFEND: LK-Berechnung berücksichtigt Winter + Sommer
 * - ✅ Multi-Club Support: Spieler in mehreren Vereinen
 * - ✅ Mannschafts-Filter: Alle Teams oder spezifische Mannschaft
 * - ✅ Optimierte Performance: Stats-Caching statt N×M Queries
 * - ✅ Modulare Struktur für Wartbarkeit
 */
function Rankings() {
  const { players, playerTeams } = useData();
  
  // State Management
  const [sortBy, setSortBy] = useState('registered');
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [selectedClubTeams, setSelectedClubTeams] = useState([]);
  const [selectedClubName, setSelectedClubName] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());
  const [lkCalculations, setLkCalculations] = useState({});
  const [allMatches, setAllMatches] = useState([]);
  const [rosterRanks, setRosterRanks] = useState({}); // {playerId: rank} für Sortierung nach Meldelisten-Rang
  const [currentSeason, setCurrentSeason] = useState('Winter 2025/26'); // Aktuelle Saison (für Meldelisten) - wird dynamisch geladen
  
  // LK-Berechnung Konstanten
  const SEASON_START = new Date('2025-09-29');
  const AGE_CLASS_FACTOR = 0.8; // M40/H40
  
  // ==========================================
  // 1. CLUB & TEAM LOADING
  // ==========================================
  
  // Lade ALLE Matches (nicht gefiltert) für LK-Berechnung
  useEffect(() => {
    const loadAllMatches = async () => {
      try {
        console.log('🔵 Rankings: Loading ALL matchdays for LK calculation...');
        const { data, error } = await supabase
          .from('matchdays')
          .select(`
            id,
            match_date,
            start_time,
            location,
            venue,
            season,
            home_team_id,
            away_team_id,
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
          .order('match_date', { ascending: false });
        
        if (error) {
          console.error('Error loading matchdays:', error);
          return;
        }
        
        // Konvertiere zu Format das calculatePlayerLK erwartet
        const formattedMatches = (data || []).map(m => {
          // Bestimme Gegner-Name aus home/away teams
          const homeTeamName = m.home_team ? 
            `${m.home_team.club_name} ${m.home_team.team_name || ''}`.trim() : 
            'Unbekannt';
          const awayTeamName = m.away_team ? 
            `${m.away_team.club_name} ${m.away_team.team_name || ''}`.trim() : 
            'Unbekannt';
          
          return {
            id: m.id,
            date: new Date(m.match_date),
            opponent: `${homeTeamName} vs ${awayTeamName}`, // Neutral
            location: m.location,
            venue: m.venue,
            season: m.season,
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id
          };
        });
        
        setAllMatches(formattedMatches);
        console.log('✅ Rankings: Loaded', formattedMatches.length, 'matches');
      } catch (error) {
        console.error('Error loading all matches:', error);
      }
    };
    
    loadAllMatches();
  }, []);
  
  const loadPlayerStats = useCallback(async (playersToProcess) => {
    if (!playersToProcess || playersToProcess.length === 0) {
      setPlayerStats({});
      return;
    }
    
    console.log('📊 Loading stats for', playersToProcess.length, 'players');
    
    try {
      // 🔧 Lade ALLE match_results (ohne Join, da matchday_id genügt)
      const { data: allResults, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('status', 'completed'); // Nur abgeschlossene Matches
      
      if (error) {
        console.error('Error loading match results:', error);
        return;
      }
      
      console.log('✅ Loaded', allResults?.length || 0, 'completed match results');
      
      const stats = {};
      
      for (const player of playersToProcess) {
        // Filter Ergebnisse für diesen Spieler
        const playerResults = (allResults || []).filter(result => 
          result.home_player_id === player.id ||
          result.home_player1_id === player.id ||
          result.home_player2_id === player.id ||
          result.guest_player_id === player.id ||
          result.guest_player1_id === player.id ||
          result.guest_player2_id === player.id
        );
        
        let wins = 0;
        let losses = 0;
        
        playerResults.forEach(result => {
          // Bestimme: Ist Spieler im Home- oder Guest-Team?
          const isPlayerInHomeTeam = 
            result.home_player_id === player.id ||
            result.home_player1_id === player.id ||
            result.home_player2_id === player.id;
          
          // Zähle Siege und Niederlagen
          if (isPlayerInHomeTeam) {
            if (result.winner === 'home') wins++;
            else if (result.winner === 'guest') losses++;
          } else {
            if (result.winner === 'guest') wins++;
            else if (result.winner === 'home') losses++;
          }
        });
        
        stats[player.id] = { wins, losses, total: wins + losses };
        
        if (playerResults.length > 0) {
          console.log(`  ✅ ${player.name}: ${wins} Siege, ${losses} Niederlagen (${playerResults.length} Matches)`);
        }
      }
      
      setPlayerStats(stats);
      console.log('✅ Stats loaded for', Object.keys(stats).length, 'players');
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  }, []);
  
  const loadClubTeams = useCallback(async (clubId) => {
    if (!clubId) return;
    
    try {
      // ✅ Lade ALLE Teams des Vereins (nicht nur eigene Memberships!)
      const { data: allClubTeams, error } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category, club_id')
        .eq('club_id', clubId)
        .order('category', { ascending: true });
      
      if (error) {
        console.error('Error loading club teams:', error);
        return;
      }
      
      console.log('📊 All club teams loaded:', allClubTeams?.length || 0, allClubTeams);
      
      setSelectedClubTeams(allClubTeams || []);
      
      if (allClubTeams && allClubTeams.length > 0) {
        setSelectedClubName(allClubTeams[0].club_name);
      }
      
    } catch (error) {
      console.error('Error loading club teams:', error);
    }
  }, []);
  
  const loadFilteredPlayers = useCallback(async () => {
    if (!selectedClubId) {
      setFilteredPlayers([]);
      setRosterRanks({});
      return;
    }
    
    // ✅ WICHTIG: Wenn kein spezifisches Team ausgewählt, verwende team_memberships (alte Logik)
    if (selectedTeamId === 'all') {
      if (!players || players.length === 0) {
        setFilteredPlayers([]);
        setRosterRanks({});
        return;
      }
      
      try {
        const { data: memberships, error } = await supabase
          .from('team_memberships')
          .select('player_id, team_id, team_info!inner(club_id)')
          .eq('is_active', true);
        
        if (error) {
          console.error('Error loading memberships:', error);
          return;
        }
        
        const clubPlayerIds = memberships
          .filter(m => m.team_info?.club_id === selectedClubId)
          .map(m => m.player_id);
        
        let filtered = players.filter(p => clubPlayerIds.includes(p.id));
        filtered = filtered.filter(p => p.name !== 'Theo Tester');
        
        const sorted = filtered.sort((a, b) => {
          const lkA = parseFloat((a.current_lk || a.season_start_lk || a.ranking || '25').replace('LK ', '').replace(',', '.'));
          const lkB = parseFloat((b.current_lk || b.season_start_lk || b.ranking || '25').replace('LK ', '').replace(',', '.'));
          return lkA - lkB;
        });
        
        setFilteredPlayers(sorted);
        loadPlayerStats(sorted);
        setRosterRanks({});
      } catch (error) {
        console.error('Error loading filtered players:', error);
      }
      return;
    }
    
    // ✅ NEU: Wenn spezifisches Team ausgewählt, verwende Meldeliste als primäre Quelle
    try {
      // Lade Team-Informationen (team_name, category, club_id) für intelligente Roster-Anzeige
      const { data: selectedTeamInfo, error: teamInfoError } = await supabase
        .from('team_info')
        .select('id, team_name, category, club_id')
        .eq('id', selectedTeamId)
        .single();
      
      if (teamInfoError || !selectedTeamInfo) {
        console.warn('⚠️ Team-Info nicht gefunden:', teamInfoError);
        setFilteredPlayers([]);
        setRosterRanks({});
        return;
      }
      
      const selectedTeamNumber = selectedTeamInfo.team_name ? parseInt(selectedTeamInfo.team_name, 10) : 1;
      const selectedCategory = selectedTeamInfo.category;
      const selectedClubIdForRoster = selectedTeamInfo.club_id;
      
      console.log(`[Rankings] 🔍 Lade Kader für Team: ${selectedCategory} ${selectedTeamInfo.team_name} (Mannschaftsnummer: ${selectedTeamNumber})`);
      
      // ✅ NEU: Prüfe zuerst, ob Meldeliste existiert und vollständig gematched ist
      // Suche in ALLEN Teams derselben Kategorie und desselben Vereins
      const { data: rosterCheck, error: rosterCheckError } = await supabase
        .from('team_roster')
        .select(`
          id, 
          player_id,
          team_number,
          team_id,
          team_info!inner(category, club_id)
        `)
        .eq('team_info.category', selectedCategory)
        .eq('team_info.club_id', selectedClubIdForRoster)
        .eq('season', currentSeason);
      
      const rosterExists = !rosterCheckError && (rosterCheck?.length || 0) > 0;
      const totalEntries = rosterCheck?.length || 0;
      const matchedEntries = rosterCheck?.filter(r => r.player_id).length || 0;
      const fullyMatched = rosterExists && totalEntries > 0 && matchedEntries === totalEntries;
      
      // ✅ WICHTIG: Nur importieren, wenn Meldeliste nicht existiert ODER nicht vollständig gematched ist
      // Prüfe nur für das ausgewählte Team (nicht für alle Teams der Kategorie)
      const { data: selectedTeamRosterCheck, error: selectedTeamRosterCheckError } = await supabase
        .from('team_roster')
        .select('id, player_id')
        .eq('team_id', selectedTeamId)
        .eq('season', currentSeason);
      
      const selectedTeamRosterExists = !selectedTeamRosterCheckError && (selectedTeamRosterCheck?.length || 0) > 0;
      
      if (!fullyMatched && !selectedTeamRosterExists) {
        console.log(`[Rankings] 🔍 Meldeliste für Team ${selectedTeamId}, Saison ${currentSeason} nicht gefunden. Versuche automatischen Import...`);
        
        try {
          // Importiere dynamisch, um Circular Dependencies zu vermeiden
          const { autoImportTeamRoster } = await import('../services/autoTeamRosterImportService');
          
          // Führe Import aus (blockierend, da wir die Daten sofort brauchen)
          await autoImportTeamRoster(selectedTeamId, currentSeason);
          
          console.log(`[Rankings] ✅ Automatischer Import der Meldeliste gestartet`);
        } catch (importError) {
          console.warn(`[Rankings] ⚠️ Fehler beim automatischen Import der Meldeliste:`, importError);
          // Weiter machen, auch wenn Import fehlschlägt
        }
        
        // Warte kurz, falls gerade importiert wird
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 Sekunden warten
      } else if (fullyMatched) {
        console.log(`[Rankings] ✅ Meldeliste vollständig gematched (${matchedEntries}/${totalEntries}) - keine weitere Aktion nötig`);
      }
      
      // Versuche verschiedene Saison-Formate
      let roster = null;
      let rosterError = null;
      
      // ✅ WICHTIG: Lade Roster für ALLE Teams derselben Kategorie und desselben Vereins
      // Filtere dann basierend auf team_number:
      // - Mannschaft 1: Zeige team_number >= 1 (also 1, 2, 3, etc.)
      // - Mannschaft 2: Zeige team_number >= 2 (also 2, 3, etc.), aber NICHT 1
      // Versuche 1: Exakte Saison
      let { data, error } = await supabase
        .from('team_roster')
        .select(`
          id,
          player_id,
          rank,
          player_name,
          lk,
          tvm_id,
          birth_year,
          team_id,
          team_number,
          season,
          team_info!inner(category, club_id, team_name)
        `)
        .eq('team_info.category', selectedCategory)
        .eq('team_info.club_id', selectedClubIdForRoster)
        .eq('season', currentSeason)
        .order('rank', { ascending: true });
      
      if (error || !data || data.length === 0) {
        // Versuche 2: Alle Saisons für Teams derselben Kategorie (nehme die neueste)
        const { data: allRosters, error: allError } = await supabase
          .from('team_roster')
          .select(`
            id,
            player_id,
            rank,
            player_name,
            lk,
            tvm_id,
            birth_year,
            team_id,
            team_number,
            season,
            team_info!inner(category, club_id, team_name)
          `)
          .eq('team_info.category', selectedCategory)
          .eq('team_info.club_id', selectedClubIdForRoster)
          .order('created_at', { ascending: false });
        
        if (!allError && allRosters && allRosters.length > 0) {
          // Finde die häufigste Saison (falls mehrere vorhanden)
          const seasonCounts = {};
          allRosters.forEach(r => {
            seasonCounts[r.season] = (seasonCounts[r.season] || 0) + 1;
          });
          const mostCommonSeason = Object.keys(seasonCounts).reduce((a, b) => 
            seasonCounts[a] > seasonCounts[b] ? a : b
          );
          
          // Update currentSeason und filtere nach dieser Saison
          setCurrentSeason(mostCommonSeason);
          roster = allRosters.filter(r => r.season === mostCommonSeason);
          console.log(`✅ Meldeliste gefunden für Saison: ${mostCommonSeason} (${roster.length} Spieler)`);
        } else {
          roster = [];
          rosterError = allError;
        }
      } else {
        roster = data;
      }
      
      if (rosterError) {
        console.warn('⚠️ Error loading roster (Tabelle existiert möglicherweise noch nicht):', rosterError);
        setFilteredPlayers([]);
        setRosterRanks({});
        return;
      }
      
      if (!roster || roster.length === 0) {
        console.log('ℹ️ Keine Meldeliste gefunden für dieses Team. Möglicherweise wird sie gerade importiert...');
        // Zeige leere Liste mit Hinweis
        setFilteredPlayers([]);
        setRosterRanks({});
        
        // ✅ VERBESSERT: Verhindere Endlosschleife - nur einmal retry, und nur wenn Import gestartet wurde
        // Prüfe ob source_url vorhanden ist (dann könnte Import möglich sein)
        if (!rosterExists) {
          // Prüfe ob Team-Portrait-URL vorhanden ist
          const { data: teamSeason } = await supabase
            .from('team_seasons')
            .select('source_url')
            .eq('team_id', selectedTeamId)
            .eq('season', currentSeason)
            .maybeSingle();
          
          const hasTeamPortraitUrl = teamSeason?.source_url && teamSeason.source_url.includes('teamPortrait');
          
          if (hasTeamPortraitUrl) {
            // Nur retry wenn Team-Portrait-URL vorhanden ist (Import könnte laufen)
            const retryKey = `roster_retry_${selectedTeamId}_${currentSeason}`;
            const hasRetried = sessionStorage.getItem(retryKey);
            
            if (!hasRetried) {
              sessionStorage.setItem(retryKey, 'true');
              setTimeout(() => {
                loadFilteredPlayers();
              }, 3000);
            } else {
              console.log('ℹ️ Retry bereits durchgeführt, keine weiteren Versuche');
            }
          } else {
            console.log('ℹ️ Keine Team-Portrait-URL vorhanden, Import nicht möglich');
          }
        }
        return;
      }
      
      // ✅ WICHTIG: Filtere basierend auf team_number gemäß Wettspielordnung
      // - Mannschaft 1 (team_number = 1): Zeige alle Spieler mit team_number >= 1
      // - Mannschaft 2 (team_number = 2): Zeige nur Spieler mit team_number >= 2 (NICHT 1)
      // - Mannschaft 3 (team_number = 3): Zeige nur Spieler mit team_number >= 3 (NICHT 1, 2)
      // etc.
      // FALLBACK: Wenn team_number null ist, verwende team_name aus team_info
      const filteredRoster = roster.filter(r => {
        // Versuche team_number zu verwenden, sonst team_name
        let playerTeamNumber = r.team_number;
        if (playerTeamNumber === null || playerTeamNumber === undefined) {
          // Fallback: Verwende team_name aus team_info
          const teamName = r.team_info?.team_name;
          if (teamName) {
            playerTeamNumber = parseInt(teamName, 10);
            if (isNaN(playerTeamNumber)) {
              playerTeamNumber = 1; // Fallback: 1 wenn team_name nicht parsebar
            }
          } else {
            playerTeamNumber = 1; // Fallback: 1 wenn team_name nicht vorhanden
          }
        }
        
        // Zeige nur Spieler mit team_number >= selectedTeamNumber
        return playerTeamNumber >= selectedTeamNumber;
      });
      
      console.log(`[Rankings] 📊 Roster gefiltert: ${roster.length} → ${filteredRoster.length} Spieler (team_number >= ${selectedTeamNumber})`);
      
      // Filtere nach Club (zusätzliche Sicherheit)
      const clubRoster = filteredRoster.filter(r => r.team_info?.club_id === selectedClubId);
      
      // ✅ WICHTIG: Auch wenn keine Meldeliste vorhanden ist, zeige leere Liste (nicht return!)
      // Das Team sollte trotzdem im Dropdown erscheinen
      if (clubRoster.length === 0) {
        console.log(`ℹ️ Keine Meldeliste für Team ${selectedTeamId} gefunden - zeige leere Liste`);
        setFilteredPlayers([]);
        setRosterRanks({});
        // NICHT return - lade stattdessen Spieler aus team_memberships als Fallback
        // (wird weiter unten behandelt)
        return;
      }
      
      // 2. Sammle alle player_ids (die vorhanden sind)
      const playerIds = clubRoster
        .filter(r => r.player_id)
        .map(r => r.player_id);
      
      // 3. Lade vollständige Spieler-Daten aus players_unified (nur für Einträge mit player_id)
      let playersMap = new Map();
      if (playerIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players_unified')
          .select('*')
          .in('id', playerIds);
        
        if (playersError) {
          console.warn('⚠️ Error loading players_unified:', playersError);
        } else if (playersData) {
          playersData.forEach(p => {
            playersMap.set(p.id, p);
          });
        }
      }
      
      // 4. Erstelle kombinierte Spieler-Liste aus Meldeliste
      const rosterRankMap = {}; // {playerId: rank} für Anzeige
      const combinedPlayers = clubRoster.map(rosterEntry => {
        const playerId = rosterEntry.player_id;
        const playerData = playerId ? playersMap.get(playerId) : null;
        
        // Speichere Rang für Anzeige
        if (playerId) {
          rosterRankMap[playerId] = rosterEntry.rank;
        }
        
        // Kombiniere Daten: Meldeliste als Basis, players_unified als Ergänzung
        return {
          id: playerId || `roster-${rosterEntry.id}`, // Fallback-ID wenn kein player_id
          roster_id: rosterEntry.id,
          rank: rosterEntry.rank,
          name: playerData?.name || rosterEntry.player_name, // Priorisiere players_unified
          current_lk: playerData?.current_lk || rosterEntry.lk,
          season_start_lk: playerData?.season_start_lk || rosterEntry.lk,
          ranking: playerData?.ranking || null,
          tvm_id: playerData?.tvm_id || rosterEntry.tvm_id,
          birth_date: playerData?.birth_date || (rosterEntry.birth_year ? `${rosterEntry.birth_year}-01-01` : null),
          is_active: playerData?.is_active ?? false, // Wenn kein player_id, dann nicht aktiv
          has_player_id: !!playerId, // Flag: Hat dieser Eintrag einen player_id?
          player_type: playerData?.player_type || 'opponent',
          email: playerData?.email || null,
          phone: playerData?.phone || null,
          profile_image: playerData?.profile_image || null,
          // Zusätzliche Roster-Daten
          roster_player_name: rosterEntry.player_name,
          roster_lk: rosterEntry.lk
        };
      });
      
      // 5. Filtere "Theo Tester" heraus
      const filtered = combinedPlayers.filter(p => p.name !== 'Theo Tester');
      
      // 6. Sortiere nach Rang (bereits von DB sortiert, aber sicherstellen)
      const sorted = filtered.sort((a, b) => a.rank - b.rank);
      
      // 7. Speichere Roster-Ränge für Anzeige
      setRosterRanks(rosterRankMap);
      
      console.log(`✅ Kader geladen: ${sorted.length} Spieler aus Meldeliste (${playerIds.length} mit player_id, ${sorted.length - playerIds.length} ohne player_id)`);
      setFilteredPlayers(sorted);
      loadPlayerStats(sorted.filter(p => p.has_player_id).map(p => ({ id: p.id }))); // Nur für Spieler mit player_id
    } catch (error) {
      console.error('Error loading filtered players:', error);
      setFilteredPlayers([]);
      setRosterRanks({});
    }
  }, [selectedClubId, selectedTeamId, players, loadPlayerStats, currentSeason]);
  
  useEffect(() => {
    if (!playerTeams || playerTeams.length === 0) {
      setFilteredPlayers([]);
      return;
    }
    
    const clubsMap = new Map();
    playerTeams.forEach(team => {
      const clubId = team.club_id || team.team_info?.club_id;
      const clubName = team.club_name || team.team_info?.club_name;
      if (clubId && clubName) {
        clubsMap.set(clubId, { id: clubId, name: clubName });
      }
    });
    
    const clubs = Array.from(clubsMap.values());
    console.log('🏢 User clubs:', clubs);
    
    if (clubs.length > 0 && !selectedClubId) {
      const primaryClub = clubs[0];
      setSelectedClubId(primaryClub.id);
      setSelectedClubName(primaryClub.name);
    }
  }, [playerTeams, selectedClubId]);
  
  useEffect(() => {
    if (selectedClubId) {
      loadClubTeams(selectedClubId);
    }
  }, [selectedClubId, loadClubTeams]);
  
  // ✅ NEU: Lade aktuelle Saison aus team_seasons (für Meldelisten)
  useEffect(() => {
    const loadCurrentSeason = async () => {
      if (!selectedTeamId || selectedTeamId === 'all') {
        // Wenn kein spezifisches Team ausgewählt, verwende Standard-Saison
        return;
      }
      
      try {
        const { data: teamSeason } = await supabase
          .from('team_seasons')
          .select('season')
          .eq('team_id', selectedTeamId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (teamSeason?.season) {
          setCurrentSeason(teamSeason.season);
          console.log('✅ Aktuelle Saison für Meldelisten geladen:', teamSeason.season);
        }
      } catch (error) {
        console.warn('⚠️ Fehler beim Laden der Saison:', error);
      }
    };
    
    loadCurrentSeason();
  }, [selectedTeamId]);
  
  useEffect(() => {
    if (selectedClubId && players) {
      loadFilteredPlayers();
    }
  }, [selectedClubId, selectedTeamId, players, loadFilteredPlayers]);
  
  // ==========================================
  // 3. LK-BERECHNUNG (SAISONSUEBERGREIFEND!)
  // ==========================================
  
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
    const diff = ownLK - oppLK;
    const P = pointsP(diff);
    const A = AGE_CLASS_FACTOR;
    const H = hurdleH(ownLK);
    let improvement = (P * A) / H;
    if (isTeamMatch) improvement *= 1.1;
    return Math.max(0, Number(improvement.toFixed(3)));
  };
  
  const getWeeklyDecay = () => {
    const now = new Date();
    const diffTime = now - SEASON_START;
    const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return 0.025 * weeks;
  };
  
  const visibleLK = (begleitLK) => Math.floor(begleitLK * 10) / 10;
  
  const calculateMatchWinner = (result) => {
    const sets = [
      { home: parseInt(result.set1_home) || 0, guest: parseInt(result.set1_guest) || 0 },
      { home: parseInt(result.set2_home) || 0, guest: parseInt(result.set2_guest) || 0 },
      { home: parseInt(result.set3_home) || 0, guest: parseInt(result.set3_guest) || 0 }
    ];
    
    let homeSetsWon = 0;
    let guestSetsWon = 0;
    
    sets.forEach((set, i) => {
      if (set.home === 0 && set.guest === 0) return;
      if (i === 2) {
        if (set.home >= 10 && set.home >= set.guest + 2) homeSetsWon++;
        else if (set.guest >= 10 && set.guest >= set.home + 2) guestSetsWon++;
      } else {
        if ((set.home === 7 && set.guest === 6) || (set.home >= 6 && set.home >= set.guest + 2)) homeSetsWon++;
        else if ((set.guest === 7 && set.home === 6) || (set.guest >= 6 && set.guest >= set.home + 2)) guestSetsWon++;
      }
    });
    
    if (homeSetsWon >= 2) return 'home';
    if (guestSetsWon >= 2) return 'guest';
    return null;
  };
  
  // KRITISCH: LK-Berechnung SAISONSUEBERGREIFEND!
  const calculatePlayerLK = async (player) => {
    try {
      console.log('🔮 Berechne LK für:', player.name);
      console.log('📊 Spieler LK-Daten:', {
        season_start_lk: player.season_start_lk,
        current_lk: player.current_lk,
        ranking: player.ranking
      });
      
      // WICHTIG: Verwende IMMER season_start_lk als Start-LK, wenn vorhanden!
      // Nur wenn season_start_lk nicht gesetzt ist, verwende current_lk oder ranking
      const lkSource = player.season_start_lk || player.current_lk || player.ranking || '25';
      const startLK = parseFloat(lkSource.replace('LK ', '').replace(',', '.').replace('LK', '').trim());
      let begleitLK = startLK;
      
      console.log('📊 Start-LK für Berechnung:', startLK, '(Quelle:', player.season_start_lk ? 'season_start_lk' : player.current_lk ? 'current_lk' : 'ranking/fallback', ')');
      
      // 🔧 Lade Matches on-demand (für aktuellste Daten)
      let matchesToProcess = allMatches;
      if (allMatches.length === 0) {
        console.log('⚠️ allMatches State leer, lade jetzt...');
        const { data: matchdaysData, error: matchdaysError } = await supabase
          .from('matchdays')
          .select(`
            id,
            match_date,
            start_time,
            location,
            venue,
            season,
            home_team_id,
            away_team_id,
            home_team:home_team_id (club_name, team_name),
            away_team:away_team_id (club_name, team_name)
          `)
          .order('match_date', { ascending: false });
        
        if (!matchdaysError && matchdaysData) {
          matchesToProcess = matchdaysData.map(m => {
            const homeTeamName = m.home_team ? 
              `${m.home_team.club_name} ${m.home_team.team_name || ''}`.trim() : 
              'Unbekannt';
            const awayTeamName = m.away_team ? 
              `${m.away_team.club_name} ${m.away_team.team_name || ''}`.trim() : 
              'Unbekannt';
            
            return {
              id: m.id,
              date: new Date(m.match_date),
              opponent: `${homeTeamName} vs ${awayTeamName}`,
              location: m.location,
              venue: m.venue,
              season: m.season,
              home_team_id: m.home_team_id,
              away_team_id: m.away_team_id
            };
          });
          console.log('✅ On-demand loaded', matchesToProcess.length, 'matches');
        }
      }
      
      console.log('📊 Available matches:', matchesToProcess.length);
      
      let totalImprovements = 0;
      let matchesPlayed = 0;
      const matchDetails = [];
      
      // 🔧 Auch ohne Matches: Berechne LK (nur wöchentlicher Abbau)
      if (matchesToProcess.length === 0) {
        console.log('⚠️ No matches in system - calculating decay only');
        // Keine Matches → Nur wöchentlicher Abbau wird berechnet
      } else {
        console.log('🔍 Checking', matchesToProcess.length, 'matches for player', player.name);
      }
      
      // Loop durch alle Matches (wenn vorhanden)
      for (const match of matchesToProcess) {
        console.log('🔍 Checking match:', match.id, match.opponent);
        
        const { data: resultsData, error } = await supabase
          .from('match_results')
          .select('*')
          .eq('matchday_id', match.id);
        
        if (error) {
          console.log('⚠️ Error loading match results:', error);
          continue;
        }
        
        console.log('📊 Match results:', resultsData?.length || 0);
        
        for (const result of resultsData || []) {
          // 🔧 Prüfe ob Spieler im HOME oder GUEST Team ist
          const isPlayerInHomeTeam = 
            result.home_player_id === player.id ||
            result.home_player1_id === player.id ||
            result.home_player2_id === player.id;
          
          const isPlayerInGuestTeam = 
            result.guest_player_id === player.id ||
            result.guest_player1_id === player.id ||
            result.guest_player2_id === player.id;
          
          const isPlayerInvolved = isPlayerInHomeTeam || isPlayerInGuestTeam;
          
          console.log('  🔍 Result:', result.match_type, 'Player in home?', isPlayerInHomeTeam, 'in guest?', isPlayerInGuestTeam, 'involved?', isPlayerInvolved);
          
          if (!isPlayerInvolved) {
            console.log('  ⏭️ Skipping - player not involved');
            continue;
          }
          
          let winner = result.winner;
          if (!winner) {
            console.log('  🔍 Winner not set, calculating...');
            winner = calculateMatchWinner(result);
          }
          
          console.log('  🏆 Winner:', winner, 'Status:', result.status);
          
          // 🔧 Prüfe ob Spieler gewonnen hat (egal ob home oder guest)
          const didPlayerWin = 
            (isPlayerInHomeTeam && winner === 'home') ||
            (isPlayerInGuestTeam && winner === 'guest');
          
          console.log('  ✅ Did player win?', didPlayerWin, '(home:', isPlayerInHomeTeam, 'winner:', winner, ')');
          
          if (!didPlayerWin) {
            console.log('  ⏭️ Skipping - player lost or draw');
            continue; // Nur Siege zählen für LK-Verbesserung
          }
          
          matchesPlayed++;
          
          let oppLK = 25;
          let oppName = 'Unbekannt';
          let ownLK = begleitLK;
          
          if (result.match_type === 'Einzel') {
            // 🔧 Bestimme Gegner basierend auf Spieler-Position (home oder guest)
            const opponentId = isPlayerInHomeTeam ? result.guest_player_id : result.home_player_id;
            
            const { data: oppData } = await supabase
              .from('players_unified')
              .select('name, current_lk')
              .eq('id', opponentId)
              .single();
            
            if (oppData) {
              oppLK = parseFloat((oppData.current_lk || '25').replace(',', '.').replace('LK ', ''));
              oppName = oppData.name || 'Unbekannt';
            }
          } else {
            // Doppel: Bestimme Partner und Gegner basierend auf Spieler-Position
            const partnerId = isPlayerInHomeTeam ?
              (result.home_player1_id === player.id ? result.home_player2_id : result.home_player1_id) :
              (result.guest_player1_id === player.id ? result.guest_player2_id : result.guest_player1_id);
            
            const { data: partnerData } = await supabase
              .from('players_unified')
              .select('name, current_lk, season_start_lk, ranking')
              .eq('id', partnerId)
              .single();
            
            let partnerLK = 25;
            if (partnerData) {
              const partnerLKStr = partnerData.current_lk || partnerData.season_start_lk || partnerData.ranking;
              partnerLK = parseFloat(partnerLKStr?.replace('LK ', '') || '25');
            }
            
            ownLK = (begleitLK + partnerLK) / 2;
            
            // Bestimme Gegner-IDs basierend auf Spieler-Position
            const opp1Id = isPlayerInHomeTeam ? result.guest_player1_id : result.home_player1_id;
            const opp2Id = isPlayerInHomeTeam ? result.guest_player2_id : result.home_player2_id;
            
            const { data: opp1Data } = await supabase
              .from('players_unified')
              .select('name, current_lk')
              .eq('id', opp1Id)
              .single();
            
            const { data: opp2Data } = await supabase
              .from('players_unified')
              .select('name, current_lk')
              .eq('id', opp2Id)
              .single();
            
            const oppLK1 = parseFloat((opp1Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
            const oppLK2 = parseFloat((opp2Data?.current_lk || '25').replace(',', '.').replace('LK ', ''));
            oppLK = (oppLK1 + oppLK2) / 2;
            const opp1Name = opp1Data?.name || '?';
            const opp2Name = opp2Data?.name || '?';
            oppName = `${opp1Name} & ${opp2Name}`;
          }
          
          console.log('✅ Sieg gefunden! Match:', result.match_type, 'vs.', oppName, 'LK:', oppLK);
          
          const lkBefore = begleitLK;
          const improvement = calcMatchImprovement(ownLK, oppLK, true);
          begleitLK -= improvement;
          totalImprovements += improvement;
          
          matchDetails.push({
            matchType: result.match_type,
            opponent: match.opponent,
            opponentName: oppName,
            opponentLK: oppLK,
            lkBefore: lkBefore,
            improvement: improvement,
            lkAfter: begleitLK
          });
        }
      }
      
      const decay = getWeeklyDecay();
      
      // Berechne Anzahl Wochen für Anzeige
      const now = new Date();
      const diffTime = now - SEASON_START;
      const weeksSinceStart = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
      
      begleitLK = Math.min(25, begleitLK + decay);
      
      const newLK = visibleLK(begleitLK);
      const seasonImprovement = newLK - startLK;
      
      console.log('📈 Gesamt-Verbesserung:', totalImprovements.toFixed(3));
      console.log('📅 Wochen seit Saison-Start:', weeksSinceStart);
      console.log('✨ Neue LK:', newLK.toFixed(1));
      
      const { error: updateError } = await supabase
        .from('players_unified')
        .update({ 
          current_lk: `LK ${newLK.toFixed(1)}`
        })
        .eq('id', player.id);
      
      if (updateError) {
        console.error('❌ Error updating LK:', updateError);
        alert('Fehler beim Speichern der LK!');
        return;
      }
      
      setLkCalculations(prev => ({
        ...prev,
        [player.id]: {
          playerName: player.name,
          startLK: startLK,
          matchesPlayed: matchesPlayed,
          totalImprovements: totalImprovements,
          decay: decay,
          weeksSinceStart: weeksSinceStart,
          begleitLK: begleitLK,
          newLK: newLK,
          seasonImprovement: seasonImprovement,
          matchDetails: matchDetails
        }
      }));
      
      setExpandedPlayers(prev => new Set(prev).add(player.id));
      
      window.dispatchEvent(new CustomEvent('reloadPlayers'));
    } catch (error) {
      console.error('❌ Error calculating LK:', error);
      alert('Fehler bei der LK-Berechnung!');
    }
  };
  
  // ==========================================
  // 4. HELPERS
  // ==========================================
  
  const getPlayerStats = (playerId) => {
    return playerStats[playerId] || { wins: 0, losses: 0, total: 0 };
  };
  
  const getRankingColor = (ranking) => {
    if (!ranking) return '#gray';
    const lk = parseInt(ranking.replace('LK ', '').trim()) || 99;
    if (lk <= 9) return '#10b981';
    if (lk <= 11) return '#3b82f6';
    return '#f59e0b';
  };
  
  const getFormTrend = (wins, losses) => {
    const total = wins + losses;
    if (total === 0) return { icon: '➡️', text: 'Noch keine Spiele', color: '#gray' };
    
    const winRate = wins / total;
    if (winRate === 1) return { icon: '🚀', text: 'Ungeschlagen!', color: '#10b981' };
    if (winRate > 0.75) return { icon: '📈', text: 'Top Form', color: '#059669' };
    if (winRate >= 0.5) return { icon: '↗️', text: 'Aufwärtstrend', color: '#3b82f6' };
    if (winRate >= 0.25) return { icon: '↘️', text: 'Ausbaufähig', color: '#f59e0b' };
    return { icon: '📉', text: 'Formtief', color: '#ef4444' };
  };
  
  // ==========================================
  // 5. RENDER
  // ==========================================
  
  // Extrahiere eindeutige Vereine basierend auf club_id
  const availableClubs = useMemo(() => {
    if (!playerTeams || playerTeams.length === 0) return [];
    
    const clubsMap = new Map();
    playerTeams.forEach(team => {
      const clubId = team.club_id || team.team_info?.club_id;
      const clubName = team.club_name || team.team_info?.club_name;
      if (clubId && clubName && !clubsMap.has(clubId)) {
        clubsMap.set(clubId, { id: clubId, name: clubName });
      }
    });
    
    return Array.from(clubsMap.values());
  }, [playerTeams]);
  
  return (
    <div className="dashboard container">
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          Spieler-Rangliste 🏆
          {selectedClubName && (
            <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
              - {selectedClubName}
            </span>
          )}
        </h1>
      </div>
      
      {/* Club & Team Selectors */}
      <div className="fade-in" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {availableClubs.length > 1 && (
          <select 
            value={selectedClubId || ''}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="btn-modern"
            style={{ padding: '0.5rem 1rem', minWidth: '200px' }}
          >
            {availableClubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        )}
        
        {selectedClubTeams.length > 0 && (
          <select 
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="btn-modern"
            style={{ padding: '0.5rem 1rem', minWidth: '200px' }}
          >
            <option value="all">✅ Alle Mannschaften</option>
            {selectedClubTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.club_name} {team.team_name} ({team.category})
              </option>
            ))}
          </select>
        )}
      </div>
      
      {/* Filter Buttons */}
      <div className="rankings-controls fade-in">
        <div className="sort-buttons-modern">
          <button
            className={`btn-modern ${sortBy === 'registered' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSortBy('registered')}
          >
            <Users size={18} />
            Team intim 😉 ({filteredPlayers.length})
          </button>
          <button
            className={`btn-modern ${sortBy === 'aufsteiger' ? 'btn-modern-active' : 'btn-modern-inactive'}`}
            onClick={() => setSortBy('aufsteiger')}
          >
            <TrendingUp size={18} />
            🚀 Hot Player
          </button>
        </div>
      </div>
      
      {sortBy === 'registered' && (
        <div className="fade-in lk-card-full" style={{ marginBottom: '1.5rem' }}>
          <div className="formkurve-header">
            <div className="formkurve-title">⚡ Live-LK Berechnung</div>
            <div className="match-count-badge">🔮</div>
          </div>
          <div className="season-content">
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Anhand eurer Medenspiel-Ergebnisse berechnet. Wer grad on fire ist, sieht man hier! 🔥
            </p>
          </div>
        </div>
      )}
      
      {/* Player List */}
      <div className="rankings-list fade-in">
        {filteredPlayers.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>🎾 Noch keine Spieler gefunden.</p>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Spieler erscheinen hier nach der Registrierung in der App.
            </p>
          </div>
        ) : (
          filteredPlayers.map((player, index) => {
            // ✅ Nur Stats für Spieler mit player_id laden (nicht für roster-only Einträge)
            const stats = player.has_player_id ? getPlayerStats(player.id) : { wins: 0, losses: 0, total: 0 };
            const form = getFormTrend(stats.wins, stats.losses);
            
            return (
              <div key={player.id} className={`ranking-card card ${!player.is_active ? 'inactive-player' : ''}`}>
                <div className="ranking-card-header">
                  <div>
                    <h3 className="player-name-large">
                      <span className="position-number">{index + 1}</span> - {player.name}
                      {/* ✅ NEU: Zeige Meldelisten-Rang (immer vorhanden, da aus Meldeliste) */}
                      {player.rank && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#3b82f6',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          📋 Rang {player.rank}
                        </span>
                      )}
                      {/* ✅ NEU: Status-Anzeige basierend auf player_id und is_active */}
                      {(!player.has_player_id || !player.is_active) && (
                        <span className="inactive-badge" title={!player.has_player_id ? "Spieler ist noch nicht in players_unified gematcht" : "Spieler hat sich noch nicht in der App registriert"}>
                          {!player.has_player_id ? '🔗 Nicht gematcht' : '🚫 Nicht in der App angemeldet'}
                        </span>
                      )}
                      {player.has_player_id && player.is_active && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          ✅ In der App angemeldet
                        </span>
                      )}
                    </h3>
                    {/* Start-LK unter dem Namen (immer anzeigen wenn vorhanden) */}
                    {player.season_start_lk && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem',
                        marginLeft: '3rem',
                        fontStyle: 'italic'
                      }}>
                        📅 Saison-Start: {player.season_start_lk}
                      </div>
                    )}
                  </div>
                  <div className="player-stats">
                    <span 
                      className="ranking-badge"
                      style={{ backgroundColor: getRankingColor(player.current_lk || player.ranking) }}
                    >
                      {player.current_lk || player.ranking || 'LK ?'}
                    </span>
                    <span className="points-badge">
                      🎾 {stats.wins + stats.losses}/{stats.total}
                    </span>
                    {stats.wins > 0 && (
                      <span className="wins-losses-badge wins-only clickable">
                        ✅ {stats.wins} {stats.wins === 1 ? 'Sieg' : 'Siege'}
                      </span>
                    )}
                    {stats.losses > 0 && (
                      <span className="wins-losses-badge losses-only clickable">
                        ❌ {stats.losses} {stats.losses === 1 ? 'Niederlage' : 'Niederlagen'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="form-indicator">
                  <div className="form-content">
                    <span className="form-label">Form:</span>
                    <div className="form-display">
                      <span className={`form-trend ${form.color}`}>
                        {form.icon}
                      </span>
                      <span className="form-text">{form.text}</span>
                    </div>
                  </div>
                  <button 
                    className="magic-button"
                    onClick={() => calculatePlayerLK(player)}
                    title="LK neu berechnen (SAISONSUEBERGREIFEND)"
                  >
                    🔮 LK
                  </button>
                </div>
                
                {/* LK Calculation Accordion */}
                {expandedPlayers.has(player.id) && lkCalculations[player.id] && (
                  <div className="lk-calculation-accordion">
                    <div className="accordion-header">
                      <div className="accordion-title">
                        <span className="accordion-icon">📊</span>
                        <h4>LK-Berechnung für {lkCalculations[player.id].playerName}</h4>
                      </div>
                      <button 
                        className="close-accordion"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔽 Closing accordion for:', player.name);
                          setExpandedPlayers(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(player.id);
                            return newSet;
                          });
                        }}
                        title="Berechnung zuklappen"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="accordion-body">
                      <div className="calc-result-box">
                        <div className="calc-result-icon">🎯</div>
                        <div className="calc-result-content">
                          <div className="result-label">Neue Live-LK</div>
                          <div className="result-value">LK {lkCalculations[player.id].newLK.toFixed(1)}</div>
                        </div>
                      </div>
                      
                      <div className="calc-details">
                        <div className="calc-section-title">Berechnungsdetails</div>
                        <div className="calc-row">
                          <span className="calc-label">🎾 Start-LK (Saison):</span>
                          <span className="calc-value">LK {lkCalculations[player.id].startLK.toFixed(1)}</span>
                        </div>
                        <div className="calc-row">
                          <span className="calc-label">🏆 Gespielte Matches:</span>
                          <span className="calc-value">{lkCalculations[player.id].matchesPlayed} Siege</span>
                        </div>
                        <div className="calc-row highlight success-row">
                          <span className="calc-label">📈 Verbesserung durch Siege:</span>
                          <span className="calc-value success">−{lkCalculations[player.id].totalImprovements.toFixed(3)}</span>
                        </div>
                        <div className="calc-row">
                          <span className="calc-label">📉 Wöchentlicher Abbau:</span>
                          <span className="calc-value decay">
                            +{lkCalculations[player.id].decay.toFixed(3)} LK 
                            ({lkCalculations[player.id].weeksSinceStart || 0} Wochen × 0.025)
                          </span>
                        </div>
                        <div className="calc-divider"></div>
                        <div className="calc-row">
                          <span className="calc-label">⚙️ Begleit-LK (3 Nachkommastellen):</span>
                          <span className="calc-value technical">{lkCalculations[player.id].begleitLK.toFixed(3)}</span>
                        </div>
                      </div>
                      
                      {lkCalculations[player.id].matchDetails && lkCalculations[player.id].matchDetails.length > 0 && (
                        <div className="match-details-section">
                          <div className="calc-section-title">🎾 Einzelne Matches</div>
                          {lkCalculations[player.id].matchDetails.map((detail, idx) => (
                            <div key={idx} className="match-detail-card">
                              <div className="match-detail-header">
                                <span className="match-detail-type">
                                  {detail.matchType === 'Einzel' ? '👤' : '👥'} {detail.matchType}
                                </span>
                                <span className="match-detail-opponent">vs. {detail.opponent}</span>
                              </div>
                              <div className="match-detail-body">
                                <div className="opponent-details">
                                  <div className="opponent-header">
                                    <span className="detail-label">🎾 Gegner:</span>
                                  </div>
                                  <div className="opponent-list">
                                    <div className="opponent-item">
                                      <span className="opponent-name">{detail.opponentName}</span>
                                      <span className="opponent-lk">LK {detail.opponentLK.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="match-detail-row">
                                  <span className="detail-label">LK vorher:</span>
                                  <span className="detail-value">LK {detail.lkBefore.toFixed(3)}</span>
                                </div>
                                <div className="match-detail-row highlight-green">
                                  <span className="detail-label">Verbesserung:</span>
                                  <span className="detail-value success">−{detail.improvement.toFixed(3)}</span>
                                </div>
                                <div className="match-detail-row">
                                  <span className="detail-label">LK nachher:</span>
                                  <span className="detail-value bold">LK {detail.lkAfter.toFixed(3)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Rankings;
