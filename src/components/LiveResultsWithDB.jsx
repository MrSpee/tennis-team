import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
// import { getOpponentPlayers } from '../services/liveResultsService'; // Gegner werden jetzt als Freitext eingegeben
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
      
      if (!homeTeamId || !awayTeamId) {
        setError('Matchday hat keine Team-Zuordnung');
        return;
      }
      
      console.log('✅ Heim-Team:', matchData.home_team?.club_name, matchData.home_team?.team_name);
      console.log('✅ Auswärts-Team:', matchData.away_team?.club_name, matchData.away_team?.team_name);

      // Lade Team-Mitglieder des Heim-Teams (NUR aktive Memberships)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_memberships')
        .select('player_id')
        .eq('team_id', homeTeamId)
        .eq('is_active', true);

      const teamMemberIds = (teamMembers || []).map(tm => tm.player_id);

      // Lade unsere Spieler aus dem Team (Heim-Spieler) - ALLE (aktiv + inaktiv)
      const { data: teamPlayersData, error: teamPlayersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, season_start_lk, ranking')
        .in('id', teamMemberIds)
        .order('name');

      if (teamPlayersError) {
        console.error('Error loading team players:', teamPlayersError);
        setError('Team-Spieler konnten nicht geladen werden');
        return;
      }

      // Lade Verfügbarkeits-Daten für das Match
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('match_availability')
        .select('player_id, status')
        .eq('matchday_id', matchId);

      if (availabilityError) {
        console.error('Error loading availability:', availabilityError);
        // Verfügbarkeit ist optional, fahre ohne fort
      }

      // Gruppiere Spieler: Zuerst angemeldete, dann alle anderen
      // NEU: Sortiere nach LK (niedrigste zuerst)
      const sortByLK = (a, b) => {
        const lkA = a.current_lk || a.season_start_lk || a.ranking || 999;
        const lkB = b.current_lk || b.season_start_lk || b.ranking || 999;
        return parseFloat(lkA) - parseFloat(lkB);
      };
      
      const allTeamPlayers = teamPlayersData || [];
      const availablePlayerIds = (availabilityData || [])
        .filter(avail => avail.status === 'available')
        .map(avail => avail.player_id);

      const availablePlayers = allTeamPlayers.filter(player => availablePlayerIds.includes(player.id)).sort(sortByLK);
      const otherPlayers = allTeamPlayers.filter(player => !availablePlayerIds.includes(player.id)).sort(sortByLK);

      setHomePlayers({
        available: availablePlayers,
        others: otherPlayers
      });

      // Lade Gegner-Spieler: Nur Spieler des Auswärts-Teams (NUR aktive Memberships)
      const { data: opponentTeamMembers, error: opponentTeamError } = await supabase
        .from('team_memberships')
        .select('player_id')
        .eq('team_id', awayTeamId)
        .eq('is_active', true);
      
      const opponentTeamMemberIds = (opponentTeamMembers || []).map(tm => tm.player_id);
      
      if (opponentTeamMemberIds.length > 0) {
        // Lade Spieler der Gegner-Mannschaft - ALLE (aktiv + inaktiv)
        const { data: opponentsData, error: opponentsError } = await supabase
          .from('players_unified')
          .select('id, name, current_lk, season_start_lk')
          .in('id', opponentTeamMemberIds);
        
        if (opponentsError) {
          console.warn('⚠️ Konnte Gegner-Spieler nicht laden:', opponentsError);
          setOpponentPlayers([]);
        } else {
          // NEU: Sortiere nach LK (niedrigste zuerst)
          const sortByLK = (a, b) => {
            const lkA = a.current_lk || a.season_start_lk || 999;
            const lkB = b.current_lk || b.season_start_lk || 999;
            return parseFloat(lkA) - parseFloat(lkB);
          };
          const sortedOpponents = (opponentsData || []).sort(sortByLK);
          setOpponentPlayers(sortedOpponents);
          console.log('✅ Gegner-Spieler geladen:', sortedOpponents.length);
        }
      } else {
        console.warn('⚠️ Gegner-Mannschaft hat keine Spieler');
        setOpponentPlayers([]);
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
      if (existingResults) {
        existingResults.forEach(result => {
          existingResultsMap[result.match_number] = result;
        });
      }

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
          comment: existing?.notes || ''
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
          comment: existing?.notes || ''
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
          comment: existing?.notes || ''
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
      comment: ''
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
      comment: ''
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
      comment: ''
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
      comment: ''
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
      comment: ''
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
      comment: ''
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
    if (!match?.away_team_id) return;
    
    try {
      const { data: opponentTeamMembers } = await supabase
        .from('team_memberships')
        .select('player_id')
        .eq('team_id', match.away_team_id);
      
      const opponentTeamMemberIds = (opponentTeamMembers || []).map(tm => tm.player_id);
      
      if (opponentTeamMemberIds.length > 0) {
        const { data: opponentsData } = await supabase
          .from('players_unified')
          .select('id, name, current_lk, season_start_lk')
          .in('id', opponentTeamMemberIds);
        
        // NEU: Sortiere nach LK (niedrigste zuerst)
        const sortByLK = (a, b) => {
          const lkA = a.current_lk || a.season_start_lk || 999;
          const lkB = b.current_lk || b.season_start_lk || 999;
          return parseFloat(lkA) - parseFloat(lkB);
        };
        const sortedOpponents = (opponentsData || []).sort(sortByLK);
        setOpponentPlayers(sortedOpponents);
        console.log('✅ Gegner-Spieler neu geladen:', sortedOpponents.length);
      }
    } catch (err) {
      console.error('⚠️ Fehler beim Neuladen der Gegner-Spieler:', err);
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

      // Bereite Daten für Supabase vor
      const resultData = {
        matchday_id: matchId,  // Referenz zum Matchday
        match_number: parseInt(matchData.id), // Stelle sicher, dass es eine Zahl ist
        match_type: matchData.type,
        entered_by: user.id,
        notes: '', // Wird später befüllt mit Kommentar + Gegner-Namen
        status: hasScoreData ? 'in_progress' : 'pending'
      };
      
      // Füge Kommentar hinzu (wenn vorhanden)
      if (matchData.comment && matchData.comment.trim() !== '') {
        resultData.notes = matchData.comment;
      }

      // Füge Spieler-IDs hinzu (nur wenn nicht leer)
      if (matchData.type === 'Einzel') {
        resultData.home_player_id = matchData.homePlayer && matchData.homePlayer !== '' ? matchData.homePlayer : null;
        
        // Prüfe ob guestPlayer eine UUID ist oder ein Text
        const guestPlayer = matchData.guestPlayer && matchData.guestPlayer !== '' ? matchData.guestPlayer : null;
        console.log('🔍 Guest Player Value:', guestPlayer);
        if (guestPlayer) {
          // Prüfe ob es eine UUID ist (enthält Bindestriche und ist 36 Zeichen lang)
          if (guestPlayer.includes('-') && guestPlayer.length === 36) {
            console.log('✅ Guest Player ist UUID, verwende direkt:', guestPlayer);
            resultData.guest_player_id = guestPlayer;
          } else {
            // Es ist ein Text-Name - erstelle neuen Spieler in players_unified
            console.log('🆕 Guest Player ist Text-Name, erstelle neuen Spieler:', guestPlayer);
            try {
              const newPlayerId = await createNewPlayer(guestPlayer);
              resultData.guest_player_id = newPlayerId;
              console.log('✅ Neuer Spieler erstellt und zugewiesen:', newPlayerId);
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
        resultData.home_player1_id = matchData.homePlayers[0] && matchData.homePlayers[0] !== '' ? matchData.homePlayers[0] : null;
        resultData.home_player2_id = matchData.homePlayers[1] && matchData.homePlayers[1] !== '' ? matchData.homePlayers[1] : null;
        
        // Prüfe beide Gegner-Spieler
        const guestPlayer1 = matchData.guestPlayers[0] && matchData.guestPlayers[0] !== '' ? matchData.guestPlayers[0] : null;
        const guestPlayer2 = matchData.guestPlayers[1] && matchData.guestPlayers[1] !== '' ? matchData.guestPlayers[1] : null;
        
        if (guestPlayer1) {
          // Prüfe ob es eine UUID ist
          if (guestPlayer1.includes('-') && guestPlayer1.length === 36) {
            console.log('✅ Guest Player 1 ist UUID:', guestPlayer1);
            resultData.guest_player1_id = guestPlayer1;
          } else {
            // Erstelle neuen Spieler in players_unified
            console.log('🆕 Guest Player 1 ist Text-Name, erstelle neuen Spieler:', guestPlayer1);
            try {
              const newPlayerId = await createNewPlayer(guestPlayer1);
              resultData.guest_player1_id = newPlayerId;
            } catch (createError) {
              console.error('❌ Fehler beim Erstellen von Guest Player 1:', createError);
              throw createError;
            }
          }
        } else {
          resultData.guest_player1_id = null;
        }
        
        if (guestPlayer2) {
          // Prüfe ob es eine UUID ist
          if (guestPlayer2.includes('-') && guestPlayer2.length === 36) {
            console.log('✅ Guest Player 2 ist UUID:', guestPlayer2);
            resultData.guest_player2_id = guestPlayer2;
          } else {
            // Erstelle neuen Spieler in players_unified
            console.log('🆕 Guest Player 2 ist Text-Name, erstelle neuen Spieler:', guestPlayer2);
            try {
              const newPlayerId = await createNewPlayer(guestPlayer2);
              resultData.guest_player2_id = newPlayerId;
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

      // Berechne den Match-Gewinner mit korrekter Tennis-Logik
      const matchWinner = calculateMatchWinner(scores);
      const hasStarted = scores.some(set => set.home > 0 || set.guest > 0);

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

      // Debug: Zeige was gesendet wird
      console.log('🔍 Sending data to Supabase:', resultData);

      // Speichere in Supabase - erst versuche zu aktualisieren, sonst insert
      // Prüfe ob Eintrag bereits existiert
      const { data: existingResult, error: checkError } = await supabase
        .from('match_results')
        .select('id')
        .eq('matchday_id', resultData.matchday_id)
        .eq('match_number', resultData.match_number)
        .maybeSingle();

      let error;
      
      if (existingResult) {
        // Aktualisiere existierenden Eintrag
        console.log('📝 Aktualisiere existierendes Ergebnis:', existingResult.id);
        const { error: updateError } = await supabase
          .from('match_results')
          .update(resultData)
          .eq('id', existingResult.id);
        error = updateError;
      } else {
        // Erstelle neuen Eintrag
        console.log('➕ Erstelle neues Ergebnis...');
        const { error: insertError } = await supabase
          .from('match_results')
          .insert(resultData);
        error = insertError;
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

      // Erfolgsmeldung basierend auf korrekter Tennis-Logik
      let statusMessage;
      
      if (matchWinner !== null) {
        // Match ist beendet
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
        
      alert(statusMessage);
      
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
              {opponentPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {(player.current_lk || player.season_start_lk) && `(LK ${player.current_lk || player.season_start_lk})`}
                </option>
              ))}
              
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

        <div className="comment-section-editable">
          <label>💬 Kommentar:</label>
          <textarea
            value={matchData.comment}
            onChange={(e) => handleCommentChange(matchData.id, e.target.value)}
            placeholder="Zusätzliche Notizen..."
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
            <h1>🎾 Live-Ergebnisse</h1>
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
