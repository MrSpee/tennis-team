import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
// import { getOpponentPlayers } from '../services/liveResultsService'; // Gegner werden jetzt als Freitext eingegeben
import {
  checkEntryAuthorization,
  calculateGamificationPoints,
  saveAchievement,
  saveMatchResultHistory,
  isMatchCompleted,
  getBadgeForTime,
  checkTeamBonus
} from '../services/gamificationService';
import './LiveResults.css';

const LiveResultsWithDB = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // State für echte Daten
  const [match, setMatch] = useState(null);
  const [homePlayers, setHomePlayers] = useState({ available: [], others: [] });
  const [opponentPlayers, setOpponentPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State für Match-Ergebnisse
  const [matchResults, setMatchResults] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // State für Freitext-Eingaben (neue Spieler)
  const [showFreeTextModal, setShowFreeTextModal] = useState(false);
  const [freeTextContext, setFreeTextContext] = useState(null); // {matchId, playerType}
  const [freeTextValue, setFreeTextValue] = useState('');
  
  // State für Match-Status (Spielabbrüche etc.)
  const [matchStatuses, setMatchStatuses] = useState({});

  // Lade echte Daten aus der Datenbank
  useEffect(() => {
    // ProtectedRoute garantiert bereits, dass User eingeloggt ist
    if (matchId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade aktuellen User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Benutzer nicht authentifiziert');
        return;
      }

      // Lade Spieler-Daten des aktuellen Users
      const { data: currentPlayer, error: playerError } = await supabase
        .from('players_unified')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (playerError || !currentPlayer) {
        setError('Spieler-Profil nicht gefunden');
        return;
      }

      // Lade Matchday-Daten mit Team-Info
      const { data: matchData, error: matchError } = await supabase
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
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error('Error loading match:', matchError);
        setError('Match nicht gefunden');
        return;
      }

      setMatch(matchData);
      
      // Hole Team-IDs vom Matchday
      const homeTeamId = matchData.home_team_id;
      const awayTeamId = matchData.away_team_id;
      const matchSeason = matchData.season; // z.B. "Winter 2025/26"
      
      if (!homeTeamId || !awayTeamId) {
        setError('Matchday hat keine Team-Zuordnung');
        return;
      }
      
      console.log('✅ Heim-Team:', matchData.home_team?.club_name, matchData.home_team?.team_name);
      console.log('✅ Auswärts-Team:', matchData.away_team?.club_name, matchData.away_team?.team_name);

      // ✅ NEU: Lade nur Spieler aus Teams mit der GLEICHEN KATEGORIE (z.B. "Herren 30")
      // ✅ WICHTIG: Lade nur Spieler aus dem SPEZIFISCHEN TEAM (home_team_id), nicht aus allen Teams des Vereins
      // matchSeason wurde bereits oben deklariert (Zeile 106)
      const homeTeamCategory = matchData.home_team?.category; // z.B. "Herren 30", "Damen", etc.
      
      // ✅ NEU: Lade Meldelisten-Spieler aus team_roster für das spezifische Team
      // WICHTIG: Alle Spieler werden SOFORT zu players_unified gematcht (keine temporären roster_ IDs)
      let rosterPlayers = [];
      if (homeTeamId && matchSeason) {
        try {
          const { data: teamRoster, error: rosterError } = await supabase
            .from('team_roster')
            .select(`
              id,
              rank,
              player_name,
              lk,
              tvm_id,
              birth_year,
              player_id,
              players_unified:player_id(id, name, current_lk, season_start_lk)
            `)
            .eq('team_id', homeTeamId)
            .eq('season', matchSeason)
            .order('rank', { ascending: true }); // Niedrigster Rang = bester Spieler
          
          if (!rosterError && teamRoster && teamRoster.length > 0) {
            console.log(`✅ ${teamRoster.length} Meldelisten-Spieler gefunden für Home-Team ${homeTeamId}, Saison ${matchSeason}`);
            
            // Für jeden Spieler ohne player_id: Führe Fuzzy-Matching durch
            for (const roster of teamRoster) {
              if (!roster.player_id) {
                try {
                  console.log(`🔍 Matche Spieler ohne player_id: ${roster.player_name}`);
                  const matchedPlayerId = await matchRosterPlayerToUnified(roster, homeTeamId);
                  
                  // Update team_roster mit player_id
                  await supabase
                    .from('team_roster')
                    .update({ player_id: matchedPlayerId })
                    .eq('id', roster.id);
                  
                  // Lade aktualisierte Spieler-Daten
                  const { data: updatedPlayer } = await supabase
                    .from('players_unified')
                    .select('id, name, current_lk, season_start_lk')
                    .eq('id', matchedPlayerId)
                    .single();
                  
                  if (updatedPlayer) {
                    roster.player_id = matchedPlayerId;
                    roster.players_unified = updatedPlayer;
                  }
                } catch (matchError) {
                  console.error(`❌ Fehler beim Matchen von ${roster.player_name}:`, matchError);
                  // Weiter machen, Spieler wird später beim Speichern behandelt
                }
              }
            }
            
            // Konvertiere team_roster Einträge zu homePlayers Format (NUR mit player_id)
            rosterPlayers = teamRoster
              .filter(roster => roster.player_id && roster.players_unified) // Nur Spieler mit player_id
              .map(roster => ({
                id: roster.player_id, // IMMER echte UUID, nie roster_ ID
                name: roster.players_unified.name,
                current_lk: roster.players_unified.current_lk || roster.players_unified.season_start_lk || roster.lk,
                season_start_lk: roster.players_unified.season_start_lk || roster.lk,
                rank: roster.rank,
                fromRoster: true
              }));
            
            console.log(`✅ ${rosterPlayers.length} Meldelisten-Spieler mit player_id geladen`);
          } else if (rosterError) {
            console.warn('⚠️ Fehler beim Laden der Home-Team Meldeliste:', rosterError);
          } else {
            console.log(`ℹ️ Keine Meldelisten-Spieler gefunden für Home-Team ${homeTeamId}, Saison ${matchSeason}`);
          }
        } catch (error) {
          console.warn('⚠️ Fehler beim Laden der Home-Team Meldeliste:', error);
        }
      }
      
      // Lade Verfügbarkeits-Daten für das Match (wird für beide Fälle benötigt)
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('match_availability')
        .select('player_id, status')
        .eq('matchday_id', matchId);

      if (availabilityError) {
        console.error('Error loading availability:', availabilityError);
        // Verfügbarkeit ist optional, fahre ohne fort
      }

      const availablePlayerIds = (availabilityData || [])
        .filter(avail => avail.status === 'available')
        .map(avail => avail.player_id);
      
      // Wenn Meldelisten-Spieler vorhanden sind, verwende diese (ggf. kombiniert mit team_memberships)
      if (rosterPlayers.length > 0) {
        const homeClubName = matchData.home_team?.club_name;
        
        // Versuche zusätzlich Spieler aus team_memberships zu laden
        let allClubPlayers = [];
        if (homeClubName) {
          // 1. Finde Teams des Vereins mit der GLEICHEN KATEGORIE
          let clubTeamsQuery = supabase
            .from('team_info')
            .select('id, category')
            .ilike('club_name', `%${homeClubName}%`);
          
          if (homeTeamCategory) {
            clubTeamsQuery = clubTeamsQuery.eq('category', homeTeamCategory);
          }
        
          const { data: clubTeams } = await clubTeamsQuery;
          const clubTeamIds = (clubTeams || []).map(t => t.id);
          
          if (clubTeamIds.length > 0) {
            // 2. Lade Spieler aus team_memberships
            const { data: teamMembers } = await supabase
              .from('team_memberships')
              .select('player_id')
              .in('team_id', clubTeamIds)
              .eq('is_active', true);

            const teamMemberIds = [...new Set((teamMembers || []).map(tm => tm.player_id))];

            // 3. Lade Spieler-Daten
            const { data: clubPlayersData } = await supabase
              .from('players_unified')
              .select('id, name, current_lk, season_start_lk, ranking')
              .in('id', teamMemberIds);
            
            allClubPlayers = (clubPlayersData || []) || [];
          }
        }
        
        // Kombiniere Meldelisten-Spieler mit team_memberships Spielern
        const combinedHomePlayers = [...rosterPlayers];
        const rosterPlayerIds = new Set(rosterPlayers.map(p => p.id));
        
        allClubPlayers.forEach(player => {
          if (!rosterPlayerIds.has(player.id)) {
            combinedHomePlayers.push(player);
          }
        });
        
        // Sortiere: Zuerst nach Rang (wenn vorhanden), dann nach LK
        const sortByLK = (a, b) => {
          const getLKValue = (lkString) => {
            if (!lkString) return 999;
            const match = String(lkString).match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : 999;
          };
          const lkA = getLKValue(a.current_lk || a.season_start_lk || a.ranking);
          const lkB = getLKValue(b.current_lk || b.season_start_lk || b.ranking);
          return lkA - lkB;
        };
        
        const sortByRankOrLK = (a, b) => {
          if (a.rank && !b.rank) return -1;
          if (!a.rank && b.rank) return 1;
          if (a.rank && b.rank) return a.rank - b.rank;
          return sortByLK(a, b);
        };
        
        const sortedHomePlayers = combinedHomePlayers.sort(sortByRankOrLK);
        const availableHomePlayers = sortedHomePlayers.filter(player => availablePlayerIds.includes(player.id));
        const otherHomePlayers = sortedHomePlayers.filter(player => !availablePlayerIds.includes(player.id));
        
        setHomePlayers({
          available: availableHomePlayers,
          others: otherHomePlayers
        });
        console.log(`✅ ${sortedHomePlayers.length} Home-Team-Spieler geladen (${rosterPlayers.length} aus Meldeliste, ${allClubPlayers.length} aus team_memberships)`);
      } else {
        // FALLBACK: Wenn keine Meldelisten-Spieler gefunden wurden, lade aus team_memberships
        const homeClubName = matchData.home_team?.club_name;
        
        if (!homeClubName) {
          setError('Club-Name konnte nicht ermittelt werden');
          return;
        }
        
        // 1. Finde Teams des Vereins mit der GLEICHEN KATEGORIE
        let clubTeamsQuery = supabase
          .from('team_info')
          .select('id, category')
          .ilike('club_name', `%${homeClubName}%`);
        
        // ✅ WICHTIG: Filtere nach Kategorie, wenn vorhanden
        if (homeTeamCategory) {
          clubTeamsQuery = clubTeamsQuery.eq('category', homeTeamCategory);
          console.log('🔍 Filtere Teams nach Kategorie:', homeTeamCategory);
        }
        
        const { data: clubTeams, error: clubTeamsError } = await clubTeamsQuery;
        
        if (clubTeamsError) {
          console.error('Error loading club teams:', clubTeamsError);
          setError('Vereins-Teams konnten nicht geladen werden');
          return;
        }
        
        const clubTeamIds = (clubTeams || []).map(t => t.id);
        
        if (clubTeamIds.length === 0) {
          console.warn(`⚠️ Keine Teams für Verein "${homeClubName}" mit Kategorie "${homeTeamCategory || 'alle'}" gefunden`);
          setHomePlayers({ available: [], others: [] });
        } else {
          console.log(`✅ ${clubTeamIds.length} Team(s) mit Kategorie "${homeTeamCategory || 'alle'}" gefunden`);
          
          // 2. Lade Spieler aus Teams mit der gleichen Kategorie (NUR aktive Memberships)
          const { data: teamMembers, error: teamError } = await supabase
            .from('team_memberships')
            .select('player_id')
            .in('team_id', clubTeamIds)
            .eq('is_active', true);

          const teamMemberIds = [...new Set((teamMembers || []).map(tm => tm.player_id))]; // Duplikate entfernen

          // 3. Lade Spieler-Daten
          const { data: clubPlayersData, error: clubPlayersError } = await supabase
            .from('players_unified')
            .select('id, name, current_lk, season_start_lk, ranking')
            .in('id', teamMemberIds);

          if (clubPlayersError) {
            console.error('Error loading club players:', clubPlayersError);
            setError('Vereins-Spieler konnten nicht geladen werden');
            return;
          }

          // Sortiere nach LK (NIEDRIGSTE zuerst = aufsteigend - niedrige LK ist besser!)
          const sortByLK = (a, b) => {
            // 🔧 Extrahiere LK-Wert aus String (z.B. "LK 12.7" -> 12.7)
            const getLKValue = (lkString) => {
              if (!lkString) return 999;
              const match = String(lkString).match(/(\d+(?:\.\d+)?)/);
              return match ? parseFloat(match[1]) : 999;
            };
            const lkA = getLKValue(a.current_lk || a.season_start_lk || a.ranking);
            const lkB = getLKValue(b.current_lk || b.season_start_lk || b.ranking);
            return lkA - lkB; // Aufsteigend: niedrigste LK zuerst
          };
          
          const allClubPlayers = (clubPlayersData || []).sort(sortByLK);
          const availablePlayers = allClubPlayers.filter(player => availablePlayerIds.includes(player.id));
          const otherPlayers = allClubPlayers.filter(player => !availablePlayerIds.includes(player.id));
          
          setHomePlayers({
            available: availablePlayers,
            others: otherPlayers
          });
          console.log(`✅ ${allClubPlayers.length} Home-Team-Spieler aus team_memberships geladen`);
        }
      }

      // NEU: Lade ALLE Gegner-Spieler des GEGNER-VEREINS (nicht nur des Teams)
      const awayClubName = matchData.away_team?.club_name;
      // matchSeason wurde bereits oben deklariert (Zeile 106)
      // awayTeamId wurde bereits oben deklariert (Zeile 105)
      
      if (awayClubName) {
        // ✅ NEU: Zuerst versuche Meldelisten-Spieler aus team_roster zu laden
        // WICHTIG: Alle Spieler werden SOFORT zu players_unified gematcht (keine temporären roster_ IDs)
        let rosterPlayers = [];
        if (awayTeamId && matchSeason) {
          try {
            const { data: teamRoster, error: rosterError } = await supabase
              .from('team_roster')
              .select(`
                id,
                rank,
                player_name,
                lk,
                tvm_id,
                birth_year,
                player_id,
                players_unified:player_id(id, name, current_lk, season_start_lk)
              `)
              .eq('team_id', awayTeamId)
              .eq('season', matchSeason)
              .order('rank', { ascending: true }); // Niedrigster Rang = bester Spieler
            
            if (!rosterError && teamRoster && teamRoster.length > 0) {
              console.log(`✅ ${teamRoster.length} Meldelisten-Spieler gefunden für Team ${awayTeamId}, Saison ${matchSeason}`);
              
              // Für jeden Spieler ohne player_id: Führe Fuzzy-Matching durch
              for (const roster of teamRoster) {
                if (!roster.player_id) {
                  try {
                    console.log(`🔍 Matche Spieler ohne player_id: ${roster.player_name}`);
                    const matchedPlayerId = await matchRosterPlayerToUnified(roster, awayTeamId);
                    
                    // Update team_roster mit player_id
                    await supabase
                      .from('team_roster')
                      .update({ player_id: matchedPlayerId })
                      .eq('id', roster.id);
                    
                    // Lade aktualisierte Spieler-Daten
                    const { data: updatedPlayer } = await supabase
                      .from('players_unified')
                      .select('id, name, current_lk, season_start_lk')
                      .eq('id', matchedPlayerId)
                      .single();
                    
                    if (updatedPlayer) {
                      roster.player_id = matchedPlayerId;
                      roster.players_unified = updatedPlayer;
                    }
                  } catch (matchError) {
                    console.error(`❌ Fehler beim Matchen von ${roster.player_name}:`, matchError);
                    // Weiter machen, Spieler wird später beim Speichern behandelt
                  }
                }
              }
              
              // Konvertiere team_roster Einträge zu opponentPlayers Format (NUR mit player_id)
              rosterPlayers = teamRoster
                .filter(roster => roster.player_id && roster.players_unified) // Nur Spieler mit player_id
                .map(roster => ({
                  id: roster.player_id, // IMMER echte UUID, nie roster_ ID
                  name: roster.players_unified.name,
                  current_lk: roster.players_unified.current_lk || roster.players_unified.season_start_lk || roster.lk,
                  season_start_lk: roster.players_unified.season_start_lk || roster.lk,
                  rank: roster.rank, // Rang in Meldeliste
                  fromRoster: true // Flag: Kommt aus Meldeliste
                }));
              
              console.log(`✅ ${rosterPlayers.length} Meldelisten-Spieler mit player_id geladen`);
            } else if (rosterError) {
              console.warn('⚠️ Fehler beim Laden der Meldeliste:', rosterError);
            } else {
              console.log(`ℹ️ Keine Meldelisten-Spieler gefunden für Team ${awayTeamId}, Saison ${matchSeason}`);
            }
          } catch (error) {
            console.warn('⚠️ Fehler beim Laden der Meldeliste (Tabelle existiert möglicherweise noch nicht):', error);
          }
        }
        
        // 1. Finde ALLE Teams des Gegner-Vereins
        const { data: opponentClubTeams, error: opponentClubTeamsError } = await supabase
          .from('team_info')
          .select('id')
          .ilike('club_name', `%${awayClubName}%`);
        
        if (!opponentClubTeamsError && opponentClubTeams && opponentClubTeams.length > 0) {
          const opponentClubTeamIds = opponentClubTeams.map(t => t.id);
          
          // 2. Lade ALLE Spieler aus ALLEN Teams des Gegner-Vereins (NUR aktive Memberships)
          const { data: opponentTeamMembers, error: opponentTeamError } = await supabase
            .from('team_memberships')
            .select('player_id')
            .in('team_id', opponentClubTeamIds)
            .eq('is_active', true);
          
          let opponentTeamMemberIds = [...new Set((opponentTeamMembers || []).map(tm => tm.player_id))]; // Duplikate entfernen
          
          // 3. FALLBACK: Wenn keine Spieler in team_memberships gefunden wurden, lade ALLE Spieler die in match_results für dieses Team vorkommen
          if (opponentTeamMemberIds.length === 0 && awayTeamId) {
            console.log('⚠️ Keine Spieler in team_memberships gefunden, suche in match_results...');
            
            // Lade alle match_results für dieses Matchday
            const { data: matchResults, error: resultsError } = await supabase
              .from('match_results')
              .select('home_player_id, guest_player_id, home_player1_id, home_player2_id, guest_player1_id, guest_player2_id')
              .eq('matchday_id', matchId);
            
            if (!resultsError && matchResults) {
              const playerIdsFromResults = new Set();
              matchResults.forEach(result => {
                if (result.home_player_id) playerIdsFromResults.add(result.home_player_id);
                if (result.guest_player_id) playerIdsFromResults.add(result.guest_player_id);
                if (result.home_player1_id) playerIdsFromResults.add(result.home_player1_id);
                if (result.home_player2_id) playerIdsFromResults.add(result.home_player2_id);
                if (result.guest_player1_id) playerIdsFromResults.add(result.guest_player1_id);
                if (result.guest_player2_id) playerIdsFromResults.add(result.guest_player2_id);
              });
              
              // Prüfe welche Spieler zum Away-Team gehören (über match_results die guest_* haben)
              const awayPlayerIds = new Set();
              matchResults.forEach(result => {
                if (result.guest_player_id) awayPlayerIds.add(result.guest_player_id);
                if (result.guest_player1_id) awayPlayerIds.add(result.guest_player1_id);
                if (result.guest_player2_id) awayPlayerIds.add(result.guest_player2_id);
              });
              
              opponentTeamMemberIds = Array.from(awayPlayerIds);
              console.log(`✅ ${opponentTeamMemberIds.length} Spieler aus match_results gefunden`);
            }
          }
          
          // 4. Lade Spieler-Daten aus players_unified (nur wenn nicht bereits aus Meldeliste)
          let playersFromUnified = [];
          if (opponentTeamMemberIds.length > 0) {
            const { data: opponentsData, error: opponentsError } = await supabase
              .from('players_unified')
              .select('id, name, current_lk, season_start_lk')
              .in('id', opponentTeamMemberIds);
            
            if (opponentsError) {
              console.warn('⚠️ Konnte Gegner-Spieler nicht laden:', opponentsError);
            } else {
              playersFromUnified = (opponentsData || []).map(player => ({
                ...player,
                fromRoster: false // Flag: Kommt aus players_unified
              }));
            }
          }
          
          // 5. Kombiniere Meldelisten-Spieler mit players_unified Spielern
          // Entferne Duplikate (priorisiere Meldelisten-Spieler)
          const combinedPlayers = [...rosterPlayers];
          const rosterPlayerIds = new Set(rosterPlayers.map(p => p.id));
          
          playersFromUnified.forEach(player => {
            // Nur hinzufügen, wenn nicht bereits in Meldeliste vorhanden
            if (!rosterPlayerIds.has(player.id)) {
              combinedPlayers.push(player);
            }
          });
          
          // 6. Sortiere: Zuerst nach Rang (wenn vorhanden), dann nach LK
          const sortByRankOrLK = (a, b) => {
            // Priorisiere Spieler mit Rang (aus Meldeliste)
            if (a.rank && !b.rank) return -1;
            if (!a.rank && b.rank) return 1;
            if (a.rank && b.rank) return a.rank - b.rank; // Niedrigster Rang zuerst
            
            // Wenn kein Rang: Sortiere nach LK
            const getLKValue = (lkString) => {
              if (!lkString) return 999;
              const match = String(lkString).match(/(\d+(?:\.\d+)?)/);
              return match ? parseFloat(match[1]) : 999;
            };
            const lkA = getLKValue(a.current_lk || a.season_start_lk);
            const lkB = getLKValue(b.current_lk || b.season_start_lk);
            return lkA - lkB; // Aufsteigend: niedrigste LK zuerst
          };
          
          const sortedOpponents = combinedPlayers.sort(sortByRankOrLK);
          setOpponentPlayers(sortedOpponents);
          console.log(`✅ ${sortedOpponents.length} Gegner-Spieler geladen (${rosterPlayers.length} aus Meldeliste, ${playersFromUnified.length} aus players_unified)`);
        } else {
          // Wenn keine Teams gefunden, aber Meldelisten-Spieler vorhanden: Nutze diese
          if (rosterPlayers.length > 0) {
            setOpponentPlayers(rosterPlayers);
            console.log(`✅ ${rosterPlayers.length} Gegner-Spieler aus Meldeliste geladen`);
          } else {
            console.warn('⚠️ Konnte Gegner-Verein Teams nicht laden');
            setOpponentPlayers([]);
          }
        }
      } else {
        console.warn('⚠️ Gegner-Verein Name nicht gefunden');
        setOpponentPlayers([]);
      }

      // ✅ NEU: Automatisches Laden der Meldeliste für das Gast-Team im Hintergrund
      if (awayTeamId && matchSeason) {
        // Importiere dynamisch, um Circular Dependencies zu vermeiden
        import('../services/autoTeamRosterImportService').then(({ autoImportTeamRoster }) => {
          // Führe im Hintergrund aus (nicht blockierend)
          const runImport = () => {
            autoImportTeamRoster(awayTeamId, matchSeason);
          };
          
          if ('requestIdleCallback' in window) {
            requestIdleCallback(runImport, { timeout: 3000 });
          } else {
            // Fallback: Führe nach kurzer Verzögerung aus
            setTimeout(runImport, 1000);
          }
        }).catch(err => {
          console.warn('⚠️ Fehler beim Laden von autoTeamRosterImportService:', err);
        });
      }
      
      // Lade bereits gespeicherte Ergebnisse (nutze matchday_id)
      await loadExistingResults(matchId);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResults = async (matchdayId) => {
    try {
      console.log('🔍 Loading existing results for matchday:', matchdayId);
      
      // Lade bereits gespeicherte Ergebnisse aus der Datenbank (nutze matchday_id)
      const { data: existingResults, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('matchday_id', matchdayId);

      if (error) {
        console.error('❌ Error loading existing results:', error);
        // Falls Fehler, initialisiere mit leeren Ergebnissen
        initializeMatchResults();
        return;
      }

      console.log('✅ Found existing results:', existingResults?.length || 0);

      // Erstelle Map der bestehenden Ergebnisse
      const existingResultsMap = {};
      const statusMap = {};
      if (existingResults) {
        existingResults.forEach(result => {
          existingResultsMap[result.match_number] = result;
          // Speichere Status separat
          statusMap[result.match_number] = result.status || 'normal';
        });
      }
      
      // Setze Match-Status
      setMatchStatuses(statusMap);

      // Initialisiere Match-Ergebnisse mit bestehenden Daten
      const results = [];
      
      // Match 2 und 4 (Einzel-Matches zuerst)
      [2, 4].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Einzel',
          title: `Match ${matchNumber}`,
          homePlayer: existing?.home_player_id || '',
          guestPlayer: existing?.guest_player_id || '',
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || '',
          matchStatus: existing?.status || 'normal'
        });
      });
      
      // Match 5 und 6 (Doppel-Matches)
      [5, 6].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Doppel',
          title: `Match ${matchNumber}`,
          homePlayers: [existing?.home_player1_id || '', existing?.home_player2_id || ''],
          guestPlayers: [existing?.guest_player1_id || '', existing?.guest_player2_id || ''],
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || '',
          matchStatus: existing?.status || 'normal'
        });
      });
      
      // Match 1 und 3 (weitere Einzel-Matches)
      [1, 3].forEach(matchNumber => {
        const existing = existingResultsMap[matchNumber];
        results.push({
          id: matchNumber,
          type: 'Einzel',
          title: `Match ${matchNumber}`,
          homePlayer: existing?.home_player_id || '',
          guestPlayer: existing?.guest_player_id || '',
          scores: [
            { home: existing?.set1_home || '-', guest: existing?.set1_guest || '-', isMatchTiebreak: false },
            { home: existing?.set2_home || '-', guest: existing?.set2_guest || '-', isMatchTiebreak: false },
            { home: existing?.set3_home || '-', guest: existing?.set3_guest || '-', isMatchTiebreak: true }
          ],
          comment: existing?.notes || '',
          matchStatus: existing?.status || 'normal'
        });
      });
      
      setMatchResults(results);
      console.log('✅ Match results initialized with existing data');
      
    } catch (err) {
      console.error('❌ Error in loadExistingResults:', err);
      // Fallback: Initialisiere mit leeren Ergebnissen
      initializeMatchResults();
    }
  };

  const initializeMatchResults = () => {
    const results = [];
    
    // Match 2 und 4 (Einzel-Matches zuerst)
    results.push({
      id: 2,
      type: 'Einzel',
      title: 'Match 2',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    results.push({
      id: 4,
      type: 'Einzel',
      title: 'Match 4',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    // Match 5 und 6 (Doppel-Matches)
    results.push({
      id: 5,
      type: 'Doppel',
      title: 'Match 5',
      homePlayers: ['', ''],
      guestPlayers: ['', ''],
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    results.push({
      id: 6,
      type: 'Doppel',
      title: 'Match 6',
      homePlayers: ['', ''],
      guestPlayers: ['', ''],
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    // Match 1 und 3 (weitere Einzel-Matches)
    results.push({
      id: 1,
      type: 'Einzel',
      title: 'Match 1',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    results.push({
      id: 3,
      type: 'Einzel',
      title: 'Match 3',
      homePlayer: '',
      guestPlayer: '',
      scores: [
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: false },
        { home: '-', guest: '-', isMatchTiebreak: true }
      ],
      comment: '',
      matchStatus: 'normal'
    });
    
    setMatchResults(results);
  };

  const handleScoreChange = (matchId, setIndex, player, value) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        const newScores = [...match.scores];
        newScores[setIndex] = {
          ...newScores[setIndex],
          [player]: value === '-' ? '' : value
        };
        return { ...match, scores: newScores };
      }
      return match;
    }));
  };

  const handlePlayerSelect = (matchId, playerType, playerId) => {
    // Prüfe ob Freitext-Modal geöffnet werden soll
    if (playerId === '__freetext__') {
      setFreeTextContext({ matchId, playerType });
      setShowFreeTextModal(true);
      return;
    }
    
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        if (match.type === 'Einzel') {
          return { ...match, [playerType]: playerId };
        } else {
          // Doppel - playerType ist z.B. 'homePlayer1'
          const playerIndex = playerType.includes('1') ? 0 : 1;
          const newPlayers = [...match[playerType.includes('home') ? 'homePlayers' : 'guestPlayers']];
          newPlayers[playerIndex] = playerId;
          return { ...match, [playerType.includes('home') ? 'homePlayers' : 'guestPlayers']: newPlayers };
        }
      }
      return match;
    }));
  };
  
  const handleFreeTextSubmit = async () => {
    if (!freeTextValue.trim()) {
      alert('Bitte gib einen Spieler-Namen ein!');
      return;
    }
    
    if (!freeTextContext) {
      console.error('❌ Kein freeTextContext gefunden');
      return;
    }
    
    const { matchId, playerType } = freeTextContext;
    const playerName = freeTextValue.trim();
    
    console.log('🆕 Erstelle sofort Spieler in DB:', playerName);
    
    try {
      // Erstelle Spieler SOFORT in der Datenbank
      const newPlayerId = await createNewPlayer(playerName);
      console.log('✅ Spieler erfolgreich erstellt:', newPlayerId);
      
      // Lade Spieler-Daten neu für Dropdown
      await reloadOpponentPlayers();
      
      // Warte kurz, damit die Dropdown-Liste aktualisiert ist
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verwende die neue ID für handlePlayerSelect
      handlePlayerSelect(matchId, playerType, newPlayerId);
      
      // Schließe Modal
      setShowFreeTextModal(false);
      setFreeTextValue('');
      setFreeTextContext(null);
      
      console.log('✅ Spieler wurde ausgewählt und Dropdown aktualisiert');
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Spielers:', error);
      alert('Fehler beim Erstellen des Spielers: ' + error.message);
    }
  };
  
  // Lade Gegner-Spieler neu
  const reloadOpponentPlayers = async () => {
    if (!match?.away_team_id || !match?.away_team?.club_name) return;
    
    try {
      // 1. Lade aus team_memberships
      const { data: opponentClubTeams } = await supabase
        .from('team_info')
        .select('id')
        .ilike('club_name', `%${match.away_team.club_name}%`);
      
      const opponentClubTeamIds = (opponentClubTeams || []).map(t => t.id);
      
      const { data: opponentTeamMembers } = await supabase
        .from('team_memberships')
        .select('player_id')
        .in('team_id', opponentClubTeamIds)
        .eq('is_active', true);
      
      let opponentTeamMemberIds = [...new Set((opponentTeamMembers || []).map(tm => tm.player_id))];
      
      // 2. FALLBACK: Lade aus match_results wenn keine in team_memberships
      if (opponentTeamMemberIds.length === 0) {
        const { data: matchResults } = await supabase
          .from('match_results')
          .select('guest_player_id, guest_player1_id, guest_player2_id')
          .eq('matchday_id', matchId);
        
        if (matchResults) {
          const awayPlayerIds = new Set();
          matchResults.forEach(result => {
            if (result.guest_player_id) awayPlayerIds.add(result.guest_player_id);
            if (result.guest_player1_id) awayPlayerIds.add(result.guest_player1_id);
            if (result.guest_player2_id) awayPlayerIds.add(result.guest_player2_id);
          });
          opponentTeamMemberIds = Array.from(awayPlayerIds);
        }
      }
      
      if (opponentTeamMemberIds.length > 0) {
        const { data: opponentsData } = await supabase
          .from('players_unified')
          .select('id, name, current_lk, season_start_lk')
          .in('id', opponentTeamMemberIds);
        
        // NEU: Sortiere nach LK (niedrigste zuerst)
        const sortByLK = (a, b) => {
          // 🔧 Extrahiere LK-Wert aus String (z.B. "LK 12.7" -> 12.7)
          const getLKValue = (lkString) => {
            if (!lkString) return 999;
            const match = String(lkString).match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : 999;
          };
          const lkA = getLKValue(a.current_lk || a.season_start_lk);
          const lkB = getLKValue(b.current_lk || b.season_start_lk);
          return lkA - lkB; // Aufsteigend: niedrigste LK zuerst
        };
        const sortedOpponents = (opponentsData || []).sort(sortByLK);
        setOpponentPlayers(sortedOpponents);
        console.log('✅ Gegner-Spieler neu geladen:', sortedOpponents.length);
      }
    } catch (err) {
      console.error('⚠️ Fehler beim Neuladen der Gegner-Spieler:', err);
    }
  };
  
  // Helper-Funktion: Berechnet Ähnlichkeit zwischen zwei Strings (Dice Coefficient)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    
    const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 100;
    
    // Dice Coefficient: Berechnet Ähnlichkeit basierend auf Bigrammen
    const getBigrams = (s) => {
      const bigrams = new Set();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.substring(i, i + 2));
      }
      return bigrams;
    };
    
    const bigrams1 = getBigrams(s1);
    const bigrams2 = getBigrams(s2);
    
    let intersection = 0;
    bigrams1.forEach(bigram => {
      if (bigrams2.has(bigram)) intersection++;
    });
    
    const union = bigrams1.size + bigrams2.size;
    if (union === 0) return 0;
    
    return Math.round((2 * intersection / union) * 100);
  };

  // Helper-Funktion: Normalisiert Namen für Vergleich (behandelt "Nachname, Vorname" und "Vorname Nachname")
  const normalizeNameForComparison = (name) => {
    if (!name) return '';
    // Entferne Leerzeichen und konvertiere zu lowercase
    const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Wenn Format "Nachname, Vorname" → konvertiere zu "Vorname Nachname"
    const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      return `${commaMatch[2]} ${commaMatch[1]}`.trim();
    }
    
    return normalized;
  };

  // Helper-Funktion: Führt Fuzzy-Matching mit players_unified durch und gibt player_id zurück
  const matchRosterPlayerToUnified = async (rosterEntry, teamId) => {
    try {
      const rosterName = rosterEntry.player_name;
      const normalizedRosterName = normalizeNameForComparison(rosterName);
      
      console.log(`🔍 Matche Spieler: "${rosterName}" (normalisiert: "${normalizedRosterName}")`);
      
      // 1. TVM-ID Match (falls vorhanden) - HÖCHSTE Priorität (eindeutig!)
      if (rosterEntry.tvm_id) {
        const { data: tvmMatch } = await supabase
          .from('players_unified')
          .select('id, name, tvm_id')
          .eq('tvm_id', rosterEntry.tvm_id)
          .maybeSingle();
        
        if (tvmMatch) {
          console.log(`✅ TVM-ID Match gefunden: ${tvmMatch.name} (${tvmMatch.id})`);
          return tvmMatch.id;
        }
      }
      
      // 2. Exakte Übereinstimmung (Name) - auch mit normalisiertem Namen
      const { data: allPlayers } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id')
        .limit(1000); // Lade mehr Spieler für besseres Matching
      
      if (allPlayers && allPlayers.length > 0) {
        // Prüfe exakte Übereinstimmung (auch mit normalisiertem Namen)
        const exactMatch = allPlayers.find(p => {
          const normalizedPlayerName = normalizeNameForComparison(p.name);
          return normalizedPlayerName === normalizedRosterName || 
                 p.name.toLowerCase() === rosterName.toLowerCase();
        });
        
        if (exactMatch) {
          console.log(`✅ Exaktes Match gefunden: ${exactMatch.name} (${exactMatch.id})`);
          return exactMatch.id;
        }
        
        // 3. Fuzzy-Matching (Name-Ähnlichkeit) mit normalisiertem Namen
        const matches = allPlayers
          .map(player => {
            const normalizedPlayerName = normalizeNameForComparison(player.name);
            const similarity1 = calculateSimilarity(player.name, rosterName);
            const similarity2 = calculateSimilarity(normalizedPlayerName, normalizedRosterName);
            return {
              ...player,
              similarity: Math.max(similarity1, similarity2) // Nimm höchste Similarity
            };
          })
          .filter(m => m.similarity >= 80) // Mindestens 80% Ähnlichkeit
          .sort((a, b) => b.similarity - a.similarity);
        
        if (matches.length > 0) {
          const bestMatch = matches[0];
          console.log(`🎯 Fuzzy-Match gefunden: ${bestMatch.name} (${bestMatch.similarity}% Ähnlichkeit)`);
          return bestMatch.id;
        }
      }
      
      // 4. Kein Match gefunden: Erstelle neuen Spieler
      console.log(`🆕 Kein Match gefunden, erstelle neuen Spieler: ${rosterEntry.player_name}`);
      
      // WICHTIG: Normalisiere den Namen (konvertiere "Nachname, Vorname" zu "Vorname Nachname")
      let normalizedName = rosterEntry.player_name;
      const commaMatch = normalizedName.match(/^([^,]+),\s*(.+)$/);
      if (commaMatch) {
        normalizedName = `${commaMatch[2]} ${commaMatch[1]}`.trim();
        console.log(`📝 Normalisiere Namen: "${rosterEntry.player_name}" → "${normalizedName}"`);
      }
      
      const { data: newPlayer, error: createError } = await supabase
        .from('players_unified')
        .insert({
          name: normalizedName, // Verwende normalisierten Namen
          is_active: false,
          current_lk: rosterEntry.lk || null,
          season_start_lk: rosterEntry.lk || null,
          tvm_id: rosterEntry.tvm_id || null,
          birth_date: rosterEntry.birth_year ? `${rosterEntry.birth_year}-01-01` : null,
          player_type: 'opponent',
          ranking: null
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Fehler beim Erstellen des Spielers:', createError);
        throw createError;
      }
      
      console.log('✅ Neuer Spieler erfolgreich erstellt:', newPlayer.id);
      
      // Erstelle Team-Membership, falls Team-ID vorhanden
      if (teamId) {
        try {
          await supabase
            .from('team_memberships')
            .insert({
              player_id: newPlayer.id,
              team_id: teamId,
              is_active: true,
              role: 'player'
            });
        } catch (membershipError) {
          console.warn('⚠️ Fehler beim Erstellen der Team-Membership:', membershipError);
          // Nicht kritisch, weiter machen
        }
      }
      
      return newPlayer.id;
    } catch (error) {
      console.error('❌ Fehler in matchRosterPlayerToUnified:', error);
      throw error;
    }
  };
  
  // Helper-Funktion: Erstelle einen neuen Spieler in players_unified
  const createNewPlayer = async (playerName) => {
    try {
      console.log('🔍 createNewPlayer aufgerufen mit Name:', playerName);
      
      // Prüfe zuerst, ob Spieler bereits existiert
      console.log('🔍 Prüfe auf existierenden Spieler...');
      const { data: existingPlayer, error: searchError } = await supabase
        .from('players_unified')
        .select('id')
        .ilike('name', playerName)
        .limit(1)
        .maybeSingle();
      
      if (searchError) {
        console.error('❌ Fehler bei Spieler-Suche:', searchError);
      }
      
      if (existingPlayer) {
        console.log('✅ Spieler bereits vorhanden, verwende existierende ID:', existingPlayer.id);
        return existingPlayer.id;
      }
      
      console.log('🆕 Spieler existiert nicht, erstelle neuen Spieler...');
      
      // Bestimme Team-Zuordnung basierend auf playerType
      let clubName = null;
      let teamId = null;
      
      if (freeTextContext?.playerType.includes('guest')) {
        // Gast-Spieler → away_team
        clubName = match?.away_team?.club_name || null;
        teamId = match?.away_team_id || null;
        console.log('🏢 Gast-Spieler wird zugewiesen an Verein:', clubName, 'Team:', teamId);
      } else if (freeTextContext?.playerType.includes('home')) {
        // Heim-Spieler → home_team
        clubName = match?.home_team?.club_name || null;
        teamId = match?.home_team_id || null;
        console.log('🏢 Heim-Spieler wird zugewiesen an Verein:', clubName, 'Team:', teamId);
      }
      
      // Jeder Spieler kann zu mehreren Teams/Vereinen gehören - keine club_id direkt auf dem Spieler
      // Die Zuordnung erfolgt über team_memberships → team_info → club_name
      
      // Erstelle neuen Spieler (inactive ohne user_id)
      const { data: newPlayer, error: createError } = await supabase
        .from('players_unified')
        .insert({
          name: playerName,
          is_active: false,
          current_lk: null,
          season_start_lk: null,
          ranking: null
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Fehler beim Erstellen des Spielers:', createError);
        throw createError;
      }
      
      console.log('✅ Neuer Spieler erfolgreich erstellt:', newPlayer.id);
      
      // Erstelle Team-Membership, falls Team-ID vorhanden
      if (teamId) {
        try {
          const { error: membershipError } = await supabase
            .from('team_memberships')
            .insert({
              player_id: newPlayer.id,
              team_id: teamId
            });
          
          if (membershipError) {
            console.error('⚠️ Fehler beim Erstellen der Team-Membership:', membershipError);
            // Nicht kritisch, fahre fort
          } else {
            console.log('✅ Spieler wurde Team zugewiesen:', teamId);
          }
        } catch (membershipErr) {
          console.error('⚠️ Fehler bei Team-Zuordnung:', membershipErr);
          // Nicht kritisch, fahre fort
        }
      }
      
      return newPlayer.id;
    } catch (error) {
      console.error('❌ Error in createNewPlayer:', error);
      throw error;
    }
  };

  const handleCommentChange = (matchId, comment) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        return { ...match, comment };
      }
      return match;
    }));
  };
  
  const handleMatchStatusChange = (matchId, status) => {
    setMatchResults(prev => prev.map(match => {
      if (match.id === matchId) {
        return { ...match, matchStatus: status };
      }
      return match;
    }));
    setMatchStatuses(prev => ({ ...prev, [matchId]: status }));
  };

  const saveMatchResult = async (matchData) => {
    try {
      setSaving(true);
      
      // Hole aktuellen Benutzer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      // Prüfe, ob überhaupt Daten eingegeben wurden
      const hasPlayerData = matchData.type === 'Einzel' 
        ? (matchData.homePlayer && matchData.guestPlayer)
        : (matchData.homePlayers[0] && matchData.homePlayers[1] && matchData.guestPlayers[0] && matchData.guestPlayers[1]);

      const hasScoreData = matchData.scores.some(score => 
        (score.home && score.home !== '-') || (score.guest && score.guest !== '-')
      );

      if (!hasPlayerData && !hasScoreData) {
        alert('Bitte wähle mindestens einen Spieler oder gib ein Ergebnis ein!');
        return;
      }

      // Hole Match-Status (Spielabbruch etc.)
      const matchStatus = matchData.matchStatus || 'normal';
      const isAborted = ['retired', 'walkover', 'disqualified', 'defaulted'].includes(matchStatus);
      
      // Bereite Daten für Supabase vor
      const resultData = {
        matchday_id: matchId,  // Referenz zum Matchday
        match_number: parseInt(matchData.id), // Stelle sicher, dass es eine Zahl ist
        match_type: matchData.type,
        entered_by: user.id,
        notes: '', // Wird später befüllt mit Kommentar + Status-Info
        status: isAborted ? matchStatus : (hasScoreData ? 'in_progress' : 'pending')
      };
      
      // Füge Kommentar hinzu (wenn vorhanden)
      let notesText = '';
      if (matchData.comment && matchData.comment.trim() !== '') {
        notesText = matchData.comment;
      }
      
      // Füge Status-Info hinzu bei Spielabbrüchen
      if (isAborted) {
        const statusLabels = {
          retired: 'Aufgegeben (Verletzung/Erschöpfung)',
          walkover: 'Kampflos (w/o - Gegner nicht angetreten)',
          disqualified: 'Disqualifikation',
          defaulted: 'Nicht angetreten'
        };
        const statusLabel = statusLabels[matchStatus] || matchStatus;
        notesText = notesText ? `${statusLabel}. ${notesText}` : statusLabel;
      }
      
      resultData.notes = notesText || null;

      // Füge Spieler-IDs hinzu (nur wenn nicht leer)
      // WICHTIG: Alle Spieler sollten jetzt echte UUIDs sein (aus players_unified)
      // Meldelisten-Spieler wurden bereits beim Laden gematcht
      if (matchData.type === 'Einzel') {
        // Home Player: Sollte immer UUID sein (oder Text-Name für Freitext-Eingabe)
        const homePlayer = matchData.homePlayer && matchData.homePlayer !== '' ? matchData.homePlayer : null;
        if (homePlayer) {
          if (homePlayer.includes('-') && homePlayer.length === 36) {
            // UUID: Direkt verwenden (aus players_unified)
            resultData.home_player_id = homePlayer;
          } else {
            // Text-Name: Neuen Spieler erstellen (Freitext-Eingabe)
            console.log('🆕 Home Player ist Text-Name, erstelle neuen Spieler:', homePlayer);
            try {
              resultData.home_player_id = await createNewPlayer(homePlayer);
            } catch (createError) {
              console.error('❌ Fehler beim Erstellen des Home Players:', createError);
              throw createError;
            }
          }
        } else {
          resultData.home_player_id = null;
        }
        
        // Guest Player: Sollte immer UUID sein (oder Text-Name für Freitext-Eingabe)
        const guestPlayer = matchData.guestPlayer && matchData.guestPlayer !== '' ? matchData.guestPlayer : null;
        console.log('🔍 Guest Player Value:', guestPlayer);
        if (guestPlayer) {
          if (guestPlayer.includes('-') && guestPlayer.length === 36) {
            // UUID: Direkt verwenden (aus players_unified)
            console.log('✅ Guest Player ist UUID, verwende direkt:', guestPlayer);
            resultData.guest_player_id = guestPlayer;
          } else {
            // Text-Name: Neuen Spieler erstellen (Freitext-Eingabe)
            console.log('🆕 Guest Player ist Text-Name, erstelle neuen Spieler:', guestPlayer);
            try {
              resultData.guest_player_id = await createNewPlayer(guestPlayer);
              console.log('✅ Neuer Spieler erstellt und zugewiesen:', resultData.guest_player_id);
            } catch (createError) {
              console.error('❌ Fehler beim Erstellen des Guest Players:', createError);
              throw createError;
            }
          }
        } else {
          console.log('⚠️ Kein Guest Player angegeben');
          resultData.guest_player_id = null;
        }
      } else {
        // Doppel: Prüfe beide Home-Spieler
        const homePlayer1 = matchData.homePlayers[0] && matchData.homePlayers[0] !== '' ? matchData.homePlayers[0] : null;
        const homePlayer2 = matchData.homePlayers[1] && matchData.homePlayers[1] !== '' ? matchData.homePlayers[1] : null;
        
        if (homePlayer1) {
          if (homePlayer1.includes('-') && homePlayer1.length === 36) {
            resultData.home_player1_id = homePlayer1;
          } else {
            resultData.home_player1_id = await createNewPlayer(homePlayer1);
          }
        } else {
          resultData.home_player1_id = null;
        }
        
        if (homePlayer2) {
          if (homePlayer2.includes('-') && homePlayer2.length === 36) {
            resultData.home_player2_id = homePlayer2;
          } else {
            resultData.home_player2_id = await createNewPlayer(homePlayer2);
          }
        } else {
          resultData.home_player2_id = null;
        }
        
        // Prüfe beide Guest-Spieler
        const guestPlayer1 = matchData.guestPlayers[0] && matchData.guestPlayers[0] !== '' ? matchData.guestPlayers[0] : null;
        const guestPlayer2 = matchData.guestPlayers[1] && matchData.guestPlayers[1] !== '' ? matchData.guestPlayers[1] : null;
        
        if (guestPlayer1) {
          if (guestPlayer1.includes('-') && guestPlayer1.length === 36) {
            console.log('✅ Guest Player 1 ist UUID:', guestPlayer1);
            resultData.guest_player1_id = guestPlayer1;
          } else {
            console.log('🆕 Guest Player 1 ist Text-Name, erstelle neuen Spieler:', guestPlayer1);
            try {
              resultData.guest_player1_id = await createNewPlayer(guestPlayer1);
            } catch (createError) {
              console.error('❌ Fehler beim Erstellen von Guest Player 1:', createError);
              throw createError;
            }
          }
        } else {
          resultData.guest_player1_id = null;
        }
        
        if (guestPlayer2) {
          if (guestPlayer2.includes('-') && guestPlayer2.length === 36) {
            console.log('✅ Guest Player 2 ist UUID:', guestPlayer2);
            resultData.guest_player2_id = guestPlayer2;
          } else {
            console.log('🆕 Guest Player 2 ist Text-Name, erstelle neuen Spieler:', guestPlayer2);
            try {
              resultData.guest_player2_id = await createNewPlayer(guestPlayer2);
            } catch (createError) {
              console.error('❌ Fehler beim Erstellen von Guest Player 2:', createError);
              throw createError;
            }
          }
        } else {
          resultData.guest_player2_id = null;
        }
      }

      // Füge Satz-Ergebnisse hinzu (nur wenn nicht leer)
      const scores = matchData.scores;
      resultData.set1_home = scores[0].home && scores[0].home !== '-' && scores[0].home !== '' ? parseInt(scores[0].home) : null;
      resultData.set1_guest = scores[0].guest && scores[0].guest !== '-' && scores[0].guest !== '' ? parseInt(scores[0].guest) : null;
      resultData.set2_home = scores[1].home && scores[1].home !== '-' && scores[1].home !== '' ? parseInt(scores[1].home) : null;
      resultData.set2_guest = scores[1].guest && scores[1].guest !== '-' && scores[1].guest !== '' ? parseInt(scores[1].guest) : null;
      resultData.set3_home = scores[2].home && scores[2].home !== '-' && scores[2].home !== '' ? parseInt(scores[2].home) : null;
      resultData.set3_guest = scores[2].guest && scores[2].guest !== '-' && scores[2].guest !== '' ? parseInt(scores[2].guest) : null;

      // Berechne Gesamtergebnis nur wenn alle Sätze gespielt sind
      let homeSets = 0;
      let guestSets = 0;
      let allSetsPlayed = true;
      
      if (scores[0].home && scores[0].guest && scores[0].home !== '-' && scores[0].guest !== '-') {
        if (parseInt(scores[0].home) > parseInt(scores[0].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }
      
      if (scores[1].home && scores[1].guest && scores[1].home !== '-' && scores[1].guest !== '-') {
        if (parseInt(scores[1].home) > parseInt(scores[1].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }
      
      if (scores[2].home && scores[2].guest && scores[2].home !== '-' && scores[2].guest !== '-') {
        if (parseInt(scores[2].home) > parseInt(scores[2].guest)) homeSets++;
        else guestSets++;
      } else {
        allSetsPlayed = false;
      }

      // Tennis Match Logic - Korrekte Implementierung der Regeln
      const calculateMatchWinner = (sets) => {
        let homeSetsWon = 0;
        let guestSetsWon = 0;

        // Prüfe jeden Satz
        for (let i = 0; i < sets.length; i++) {
          const set = sets[i];
          const home = parseInt(set.home) || 0;
          const guest = parseInt(set.guest) || 0;

          if (home === 0 && guest === 0) continue; // Leerer Satz

          const setWinner = calculateSetWinner(home, guest, i === 2); // 3. Satz ist Champions Tiebreak

          if (setWinner === 'home') homeSetsWon++;
          else if (setWinner === 'guest') guestSetsWon++;
        }

        // Best of 3: Wer 2 Sätze gewinnt, gewinnt das Match
        if (homeSetsWon >= 2) return 'home';
        if (guestSetsWon >= 2) return 'guest';
        return null; // Match noch nicht beendet
      };

      const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
        if (isChampionsTiebreak) {
          // Champions Tiebreak: Bis 10 Punkte, mindestens 2 Punkte Vorsprung
          if (home >= 10 && home >= guest + 2) return 'home';
          if (guest >= 10 && guest >= home + 2) return 'guest';
          return null;
        } else {
          // Normaler Satz: Bis 6 Spiele, mindestens 2 Spiele Vorsprung
          // Tiebreak bei 6-6: Einer muss 7 erreichen
          
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
          if (home === 6 && guest === 6) {
            return null;
          }
          
          return null; // Satz noch nicht beendet
        }
      };

      // Berechne den Match-Gewinner mit korrekter Tennis-Logik oder Spielabbruch-Logik
      let matchWinner = null;
      const hasStarted = scores.some(set => set.home > 0 || set.guest > 0);
      
      if (isAborted) {
        // Bei Spielabbruch: Bestimme Gewinner basierend auf Status
        // WICHTIG: Wir nehmen an, dass der HEIM-Spieler immer derjenige ist, der NICHT abgebrochen hat
        // Der User muss beim Eingeben darauf achten, den richtigen Status zu wählen
        // Für eine bessere UX könnten wir später eine explizite Gewinner-Auswahl hinzufügen
        
        if (matchStatus === 'retired') {
          // Der Spieler, der NICHT aufgegeben hat, gewinnt
          // Wir müssen prüfen, WELCHER Spieler aufgegeben hat
          // Standard: Wenn matchStatus = retired, nehmen wir an, dass der GAST aufgegeben hat
          matchWinner = 'home'; // Default: Heim gewinnt bei retired
        } else if (matchStatus === 'walkover') {
          // Kampflos: Der anwesende Spieler gewinnt
          matchWinner = 'home'; // Default: Heim gewinnt bei w/o
        } else if (matchStatus === 'disqualified') {
          // Der NICHT disqualifizierte Spieler gewinnt
          matchWinner = 'home'; // Default: Heim gewinnt bei Disqualifikation
        } else if (matchStatus === 'defaulted') {
          // Der erschienene Spieler gewinnt
          matchWinner = 'home'; // Default: Heim gewinnt bei defaulted
        }
        
        // Setze Ergebnis bei Spielabbruch
        resultData.home_score = matchWinner === 'home' ? 1 : 0;
        resultData.away_score = matchWinner === 'guest' ? 1 : 0;
        resultData.winner = matchWinner;
        resultData.status = matchStatus; // Speichere den genauen Abbruch-Status
        resultData.completed_at = new Date().toISOString();
        
      } else {
        // Normale Tennis-Logik
        matchWinner = calculateMatchWinner(scores);
        
        // Setze Gesamtergebnis und Status basierend auf Tennis-Logik
        if (matchWinner !== null) {
          // Match ist beendet
          resultData.home_score = matchWinner === 'home' ? 1 : 0;
          resultData.away_score = matchWinner === 'guest' ? 1 : 0;
          resultData.winner = matchWinner;
          resultData.status = 'completed';
          resultData.completed_at = new Date().toISOString();
        } else if (hasStarted) {
          // Match läuft noch
          resultData.home_score = 0; // Wird später berechnet
          resultData.away_score = 0; // Wird später berechnet
          resultData.winner = null;
          resultData.status = 'in_progress';
          resultData.completed_at = null;
        } else {
          // Nur Spieler ausgewählt, noch nicht begonnen
          resultData.home_score = 0;
          resultData.away_score = 0;
          resultData.winner = null;
          resultData.status = 'pending';
          resultData.completed_at = null;
        }
      }

      // 🎮 GAMIFICATION: Prüfe Berechtigung
      const homeTeamId = match?.home_team_id;
      const awayTeamId = match?.away_team_id;
      
      if (!homeTeamId || !awayTeamId) {
        throw new Error('Matchday hat keine Team-Zuordnung');
      }

      const isAuthorized = await checkEntryAuthorization(user.id, matchId, homeTeamId, awayTeamId);
      if (!isAuthorized) {
        throw new Error('Du bist nicht berechtigt, Ergebnisse für diesen Matchday einzutragen.');
      }

      // Prüfe ob Super-Admin
      const { data: playerData } = await supabase
        .from('players_unified')
        .select('id, is_super_admin')
        .eq('user_id', user.id)
        .single();
      const isSuperAdmin = playerData?.is_super_admin === true;

      // Prüfe ob bereits abgeschlossenes Spiel geändert wird
      const { data: existingResult, error: checkError } = await supabase
        .from('match_results')
        .select('id, status, gamification_points, entered_by')
        .eq('matchday_id', resultData.matchday_id)
        .eq('match_number', resultData.match_number)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing result:', checkError);
      }

      const isUpdate = existingResult !== null;
      const wasCompleted = existingResult && isMatchCompleted(existingResult.status);
      const willBeCompleted = isMatchCompleted(resultData.status);

      // Warnung bei Änderungen an abgeschlossenen Spielen
      if (isUpdate && wasCompleted && !isSuperAdmin) {
        const confirmed = window.confirm(
          '⚠️ Dieses Spiel ist bereits abgeschlossen.\n\n' +
          'Die vorhandenen Daten werden überschrieben. Bist du sicher?'
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      // Debug: Zeige was gesendet wird
      console.log('🔍 Sending data to Supabase:', resultData);

      let error;
      
      // 🎮 GAMIFICATION: Berechne Punkte (vor dem Speichern)
      let gamificationPoints = 0;
      let achievementData = null;
      let pointsCalculation = null;

      if (!isSuperAdmin && (willBeCompleted || resultData.status === 'in_progress' || resultData.status === 'pending')) {
        // Berechne Spielstart
        const matchStart = new Date(match.match_date);
        if (match.start_time) {
          const [hours, minutes] = match.start_time.split(':').map(Number);
          matchStart.setHours(hours, minutes, 0, 0);
        }

        const enteredAt = new Date();

        // Berechne Punkte
        pointsCalculation = calculateGamificationPoints({
          matchStart,
          matchType: resultData.match_type,
          enteredAt,
          status: resultData.status,
          existingResult: existingResult || null,
          isSuperAdmin
        });

        gamificationPoints = pointsCalculation.points;

        // Speichere Punkte im resultData
        if (isUpdate && wasCompleted && !willBeCompleted) {
          // Änderung an abgeschlossenem Spiel: Keine Punkte
          resultData.gamification_points = 0;
        } else {
          // Neue Eingabe oder Abschluss: Speichere Punkte
          resultData.gamification_points = gamificationPoints;
        }

        // Speichere Achievement-Daten für später
        if (gamificationPoints > 0) {
          achievementData = {
            playerId: playerData.id,
            achievementType: pointsCalculation.isProgressEntry ? 'progress_entry' : 'speed_entry',
            points: gamificationPoints,
            badgeName: getBadgeForTime(pointsCalculation.timeDiffMinutes),
            matchdayId: matchId,
            matchResultId: null, // Wird nach dem Speichern gesetzt
            matchType: resultData.match_type,
            timeToEntryMinutes: pointsCalculation.timeDiffMinutes,
            expectedEndTime: pointsCalculation.expectedEndTime,
            isProgressEntry: pointsCalculation.isProgressEntry
          };
        }
      } else {
        // Super-Admin oder keine Punkte: Setze auf 0
        resultData.gamification_points = 0;
      }

      // Speichere entered_by und entered_at
      resultData.entered_by = user.id;
      resultData.entered_at = new Date().toISOString();

      // Audit-Trail: Speichere alte Werte wenn abgeschlossenes Spiel geändert wird
      let previousValues = null;
      if (isUpdate && wasCompleted && !isSuperAdmin) {
        previousValues = {
          status: existingResult.status,
          winner: existingResult.winner,
          home_score: existingResult.home_score,
          away_score: existingResult.away_score,
          set1_home: existingResult.set1_home,
          set1_guest: existingResult.set1_guest,
          set2_home: existingResult.set2_home,
          set2_guest: existingResult.set2_guest,
          set3_home: existingResult.set3_home,
          set3_guest: existingResult.set3_guest
        };
      }

      let savedResultId = null;

      if (existingResult) {
        // Aktualisiere existierenden Eintrag
        console.log('📝 Aktualisiere existierendes Ergebnis:', existingResult.id);
        const { data: updatedData, error: updateError } = await supabase
          .from('match_results')
          .update(resultData)
          .eq('id', existingResult.id)
          .select()
          .single();
        error = updateError;
        savedResultId = updatedData?.id || existingResult.id;
      } else {
        // Erstelle neuen Eintrag
        console.log('➕ Erstelle neues Ergebnis...');
        const { data: insertedData, error: insertError } = await supabase
          .from('match_results')
          .insert(resultData)
          .select()
          .single();
        error = insertError;
        savedResultId = insertedData?.id;
      }

      if (error) {
        console.error('❌ Supabase Error:', error);
        
        // Spezifische Fehlerbehandlung
        if (error.code === '23505') {
          throw new Error('Match-Ergebnis existiert bereits. Versuche es erneut oder lösche den bestehenden Eintrag.');
        } else if (error.code === '22P02') {
          throw new Error('Ungültige Daten. Bitte überprüfe die Eingaben.');
        } else {
          throw error;
        }
      }

      // 🎮 GAMIFICATION: Speichere Audit-Trail für Änderungen
      if (isUpdate && wasCompleted && previousValues && savedResultId) {
        try {
          await saveMatchResultHistory({
            matchResultId: savedResultId,
            changedBy: user.id,
            previousValues,
            newValues: {
              status: resultData.status,
              winner: resultData.winner,
              home_score: resultData.home_score,
              away_score: resultData.away_score,
              set1_home: resultData.set1_home,
              set1_guest: resultData.set1_guest,
              set2_home: resultData.set2_home,
              set2_guest: resultData.set2_guest,
              set3_home: resultData.set3_home,
              set3_guest: resultData.set3_guest
            }
          });
        } catch (historyError) {
          console.error('⚠️ Error saving match result history:', historyError);
          // Nicht kritisch, weiter machen
        }
      }

      // 🎮 GAMIFICATION: Speichere Achievement
      if (achievementData && gamificationPoints > 0 && savedResultId) {
        try {
          achievementData.matchResultId = savedResultId;
          await saveAchievement(achievementData);
          console.log('✅ Achievement gespeichert:', achievementData);

          // 🏆 TEAM-BONUS: Prüfe ob alle Ergebnisse schnell eingegeben wurden
          if (willBeCompleted && !isSuperAdmin) {
            try {
              const teamBonus = await checkTeamBonus(matchId, new Date());
              if (teamBonus > 0) {
                console.log(`🏆 Team-Bonus vergeben: +${teamBonus} Punkte`);
              }
            } catch (teamBonusError) {
              console.error('⚠️ Error checking team bonus:', teamBonusError);
              // Nicht kritisch, weiter machen
            }
          }
        } catch (achievementError) {
          console.error('⚠️ Error saving achievement:', achievementError);
          // Nicht kritisch, weiter machen
        }
      }

      // Erfolgsmeldung basierend auf Tennis-Logik oder Spielabbruch
      let statusMessage;
      let pointsMessage = '';
      
      if (isAborted) {
        // Spielabbruch
        const winnerText = matchWinner === 'home' ? 'Heim' : 'Gast';
        const statusLabels = {
          retired: '🏥 Aufgabe',
          walkover: '🚶 Kampflos (w/o)',
          disqualified: '⛔ Disqualifikation',
          defaulted: '❌ Nicht angetreten'
        };
        const statusLabel = statusLabels[matchStatus] || matchStatus;
        statusMessage = `${statusLabel} - ${winnerText} gewinnt!`;
      } else if (matchWinner !== null) {
        // Match ist normal beendet
        const winnerText = matchWinner === 'home' ? 'Heim' : 'Gast';
        statusMessage = `🏆 Match abgeschlossen! ${winnerText} gewinnt!`;
      } else if (hasStarted) {
        // Match läuft noch - prüfe welche Sätze gespielt wurden
        const playedSets = scores.filter(set => set.home > 0 || set.guest > 0).length;
        const currentSet = playedSets + 1;
        statusMessage = `💾 Zwischenstand gespeichert! Aktuell: Satz ${currentSet}`;
      } else {
        // Nur Spieler ausgewählt
        statusMessage = '📝 Spieler-Auswahl gespeichert!';
      }

      // 🎮 GAMIFICATION: Füge Punkte-Meldung hinzu
      if (gamificationPoints > 0 && !isSuperAdmin) {
        const badgeName = achievementData?.badgeName || '';
        if (pointsCalculation?.isProgressEntry) {
          pointsMessage = `\n\n🎮 ${badgeName}\n+${gamificationPoints} Punkte (Zwischenstand)`;
        } else {
          pointsMessage = `\n\n🎮 ${badgeName}\n+${gamificationPoints} Punkte`;
        }
      } else if (isUpdate && wasCompleted && !isSuperAdmin) {
        pointsMessage = '\n\n⚠️ Keine Punkte für Änderungen an abgeschlossenen Spielen';
      }
        
      alert(statusMessage + pointsMessage);
      
      // Zurück zur Übersicht nach dem Speichern
      setTimeout(() => {
        navigate(`/ergebnisse/${matchId}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error saving match result:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderPlayerSelect = (matchData, playerType, playerId) => {
    // Prüfe ob der aktuelle Wert ein Freitext ist (keine UUID)
    const isFreeText = playerId && !playerId.includes('-') && playerId.length !== 36 && playerId !== '';
    
    if (playerType.includes('home')) {
      // Heim-Spieler: Dropdown oder Freitext-Anzeige analog Gegner
      return (
        <div style={{ position: 'relative' }}>
          {isFreeText ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div 
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  fontSize: '0.875rem'
                }}
              >
                ✏️ {playerId}
              </div>
              <button
                onClick={() => {
                  handlePlayerSelect(matchData.id, playerType, '');
                }}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                ✏️
              </button>
            </div>
          ) : (
            <select
              value={playerId}
              onChange={(e) => handlePlayerSelect(matchData.id, playerType, e.target.value)}
              className="player-select"
            >
              <option value="">Spieler wählen...</option>
              
              {/* Angemeldete Spieler */}
              {homePlayers.available && homePlayers.available.length > 0 && (
                <optgroup label="✅ Angemeldete Spieler">
                  {homePlayers.available.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {(player.current_lk || player.season_start_lk || player.ranking) && `(${player.current_lk || player.season_start_lk || player.ranking})`}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Alle anderen Spieler */}
              {homePlayers.others && homePlayers.others.length > 0 && (
                <optgroup label="👥 Alle Spieler">
                  {homePlayers.others.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {(player.current_lk || player.season_start_lk || player.ranking) && `(${player.current_lk || player.season_start_lk || player.ranking})`}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Option für Freitext-Eingabe */}
              <optgroup label="➕">
                <option value="__freetext__">➕ Spieler hinzufügen...</option>
              </optgroup>
            </select>
          )}
        </div>
      );
    } else {
      // Gast-Spieler: Dropdown mit allen verfügbaren Spielern + Freitext-Option
      return (
        <div style={{ position: 'relative' }}>
          {isFreeText ? (
            // Zeige den Freitext-Wert als display-field
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div 
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  fontSize: '0.875rem'
                }}
              >
                ✏️ {playerId}
              </div>
              <button
                onClick={() => {
                  handlePlayerSelect(matchData.id, playerType, '');
                }}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                ✏️
              </button>
            </div>
          ) : (
            <select
              key={`opponent-select-${opponentPlayers.length}`} // Force re-render when list changes
              value={playerId}
              onChange={(e) => handlePlayerSelect(matchData.id, playerType, e.target.value)}
              className="player-select"
            >
              <option value="">Gegner-Spieler wählen...</option>
              
              {/* Verfügbare Spieler aus der DB */}
              {opponentPlayers.map(player => {
                const lkDisplay = (player.current_lk || player.season_start_lk) ? `LK ${player.current_lk || player.season_start_lk}` : '';
                const rankDisplay = player.rank ? `Rang ${player.rank}` : '';
                const displayParts = [rankDisplay, lkDisplay].filter(Boolean);
                const displaySuffix = displayParts.length > 0 ? ` (${displayParts.join(', ')})` : '';
                const rosterBadge = player.fromRoster ? '📋 ' : '';
                
                return (
                  <option key={player.id} value={player.id}>
                    {rosterBadge}{player.name}{displaySuffix}
                  </option>
                );
              })}
              
              {/* Option für Freitext-Eingabe */}
              <optgroup label="➕">
                <option value="__freetext__">➕ Spieler hinzufügen...</option>
              </optgroup>
            </select>
          )}
        </div>
      );
    }
  };

  const renderScoreInputs = (matchData) => {
    return (
      <div className="score-inputs">
        {matchData.scores.map((score, index) => (
          <div key={index} className="set-input">
            <label className="set-label">
              {index === 0 ? 'Satz 1' : index === 1 ? 'Satz 2' : 'Champ.-TB'}
            </label>
            <div className="score-row">
              <input
                type="number"
                min="0"
                max={index === 2 ? "20" : "7"}
                value={score.home === '-' ? '' : score.home}
                onChange={(e) => handleScoreChange(matchData.id, index, 'home', e.target.value)}
                className="score-input home-score"
                placeholder="-"
              />
              <span className="score-separator">:</span>
              <input
                type="number"
                min="0"
                max={index === 2 ? "20" : "7"}
                value={score.guest === '-' ? '' : score.guest}
                onChange={(e) => handleScoreChange(matchData.id, index, 'guest', e.target.value)}
                className="score-input guest-score"
                placeholder="-"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMatchCard = (matchData) => {
    return (
      <div key={matchData.id} className="match-card-editable">
        <div className="match-header-editable">
          <h3>{matchData.title} - {matchData.type}</h3>
        </div>

        {matchData.type === 'Einzel' ? (
          <div className="player-selection-editable">
            <div className="player-row-editable">
              <span className="player-label-editable">
                Heim-Spieler von {match?.home_team?.club_name || 'Heim-Team'}:
              </span>
              {renderPlayerSelect(matchData, 'homePlayer', matchData.homePlayer)}
            </div>
            <div className="vs-divider">vs</div>
            <div className="player-row-editable">
              <span className="player-label-editable">
                Gast-Spieler von {match?.away_team?.club_name || 'Gast-Team'}:
              </span>
              {renderPlayerSelect(matchData, 'guestPlayer', matchData.guestPlayer)}
            </div>
          </div>
        ) : (
          <div className="player-selection-editable">
            <div className="player-row-editable">
              <span className="player-label-editable">
                Heim-Spieler von {match?.home_team?.club_name || 'Heim-Team'} 1:
              </span>
              {renderPlayerSelect(matchData, 'homePlayer1', matchData.homePlayers[0])}
            </div>
            <div className="player-row-editable">
              <span className="player-label-editable">
                Heim-Spieler von {match?.home_team?.club_name || 'Heim-Team'} 2:
              </span>
              {renderPlayerSelect(matchData, 'homePlayer2', matchData.homePlayers[1])}
            </div>
            <div className="vs-divider">vs</div>
            <div className="player-row-editable">
              <span className="player-label-editable">
                Gast-Spieler von {match?.away_team?.club_name || 'Gast-Team'} 1:
              </span>
              {renderPlayerSelect(matchData, 'guestPlayer1', matchData.guestPlayers[0])}
            </div>
            <div className="player-row-editable">
              <span className="player-label-editable">
                Gast-Spieler von {match?.away_team?.club_name || 'Gast-Team'} 2:
              </span>
              {renderPlayerSelect(matchData, 'guestPlayer2', matchData.guestPlayers[1])}
            </div>
          </div>
        )}

        {renderScoreInputs(matchData)}
        
        {/* Match-Status Auswahl (Spielabbrüche etc.) */}
        <div className="match-status-section" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
            📊 Match-Status:
          </label>
          <select
            value={matchData.matchStatus || 'normal'}
            onChange={(e) => handleMatchStatusChange(matchData.id, e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              backgroundColor: matchData.matchStatus && matchData.matchStatus !== 'normal' ? '#fef3c7' : 'white'
            }}
          >
            <option value="normal">✅ Normal beendet</option>
            <option value="retired">🏥 Aufgegeben (Verletzung/Erschöpfung)</option>
            <option value="walkover">🚶 Kampflos (w/o - Gegner nicht angetreten)</option>
            <option value="disqualified">⛔ Disqualifikation</option>
            <option value="defaulted">❌ Nicht angetreten</option>
          </select>
          {matchData.matchStatus && matchData.matchStatus !== 'normal' && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              backgroundColor: '#fef3c7', 
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#92400e'
            }}>
              ⚠️ Bei Spielabbruch: Der <strong>Heim-Spieler</strong> gewinnt automatisch. Wenn der <strong>Gast</strong> gewonnen hat, bitte Spieler-Positionen tauschen.
            </div>
          )}
        </div>

        <div className="comment-section-editable">
          <label>💬 Kommentar:</label>
          <textarea
            value={matchData.comment}
            onChange={(e) => handleCommentChange(matchData.id, e.target.value)}
            placeholder="Zusätzliche Notizen (z.B. Grund für Aufgabe, Verletzungsdetails)..."
            rows="3"
            className="comment-textarea"
          />
        </div>

        <button
          onClick={() => saveMatchResult(matchData)}
          disabled={saving}
          className="save-button-editable"
        >
          <Save size={20} />
          {saving ? 'Speichere...' : 'Ergebnis speichern'}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="live-results-page">
        <div className="loading">Lade Daten...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-results-page">
        <div className="error">Fehler: {error}</div>
        <button onClick={() => navigate(`/ergebnisse/${matchId}`)}>Zurück zur Übersicht</button>
      </div>
    );
  }

  return (
    <div className="live-results-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-top">
            <button 
              onClick={() => navigate(`/ergebnisse/${matchId}`)}
              className="back-button"
            >
              <ArrowLeft size={16} />
              Zurück zur Übersicht
            </button>
            <h1>🎾 Ergebnisse eintragen</h1>
            <div style={{ 
              marginTop: '0.5rem',
              padding: '0.75rem', 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#1e40af',
              lineHeight: '1.5',
              maxWidth: '600px'
            }}>
              <strong>⚡ Schnell-Eingabe lohnt sich!</strong> Sammle Punkte für zeitnahe Eingaben, baue Streaks auf und gewinne Preise! 🎁 Je schneller du einträgst, desto mehr Punkte bekommst du!
            </div>
          </div>
          {match?.home_team && match?.away_team && (
            <div className="match-teams-info">
              <div className="team-badge home">
                <span className="team-label">Heim:</span>
                <span className="team-name">{match.home_team.club_name} {match.home_team.team_name}</span>
              </div>
              <span className="vs-badge">vs</span>
              <div className="team-badge away">
                <span className="team-label">Auswärts:</span>
                <span className="team-name">{match.away_team.club_name} {match.away_team.team_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Einzel-Matches */}
      <section className="matches-section">
        <h2>👤 Einzel-Matches</h2>
        <div className="matches-grid">
          {matchResults
            .filter(m => m.type === 'Einzel')
            .map(renderMatchCard)}
        </div>
      </section>

      {/* Doppel-Matches */}
      <section className="matches-section">
        <h2>👥 Doppel-Matches</h2>
        <div className="matches-grid">
          {matchResults
            .filter(m => m.type === 'Doppel')
            .map(renderMatchCard)}
        </div>
      </section>

      {/* Navigation */}
      <div className="footer-navigation">
        <button 
          onClick={() => navigate(`/ergebnisse/${matchId}`)}
          className="back-to-overview"
        >
          <ArrowLeft size={16} />
          Zurück zur Spielübersicht
        </button>
      </div>
      
      {/* Freitext-Modal für neue Spieler */}
      {showFreeTextModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>✏️ Neuer Spieler</h3>
            <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
              Gib den Namen des Gegners ein:
            </p>
            <input
              type="text"
              value={freeTextValue}
              onChange={(e) => setFreeTextValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleFreeTextSubmit();
                }
              }}
              placeholder="Spieler-Name eingeben..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                marginBottom: '1rem'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowFreeTextModal(false);
                  setFreeTextValue('');
                  setFreeTextContext(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleFreeTextSubmit}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveResultsWithDB;
