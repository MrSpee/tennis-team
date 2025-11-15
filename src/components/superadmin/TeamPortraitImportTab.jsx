import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LoggingService } from '../../services/activityLogger';
import { calculateSimilarity, normalizeString } from '../../services/matchdayImportService';
import { Loader, CheckCircle, AlertCircle, X, ExternalLink, Users, Calendar, MapPin, Search, AlertTriangle } from 'lucide-react';
import './TeamPortraitImportTab.css';

const FUZZY_MATCH_THRESHOLD = 0.90; // 90% für automatische Bestätigung
const MANUAL_REVIEW_THRESHOLD = 0.75; // 75% - unter diesem Wert manuelle Prüfung

const TeamPortraitImportTab = () => {
  const { player } = useAuth();
  
  // State Management
  const [teamPortraitUrl, setTeamPortraitUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Verein/Team-Zuordnung
  const [allClubs, setAllClubs] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]); // Für Spieler-Matching
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newClubData, setNewClubData] = useState({ name: '', city: '', federation: 'TVM', website: '' });
  const [newTeamData, setNewTeamData] = useState({ team_name: '', category: '', club_id: null });
  
  // Matching-Ergebnisse
  const [clubMatch, setClubMatch] = useState(null); // { match: club, score: 0.95, confidence: 'high'|'medium'|'low' }
  const [teamMatch, setTeamMatch] = useState(null); // { match: team, score: 0.92, confidence: 'high'|'medium'|'low' }
  const [playerMatches, setPlayerMatches] = useState([]); // Array von { scrapedPlayer, matches: [{ player, score }] }
  const [matchMatches, setMatchMatches] = useState([]); // Array von { scrapedMatch, homeTeamMatch: { team, score }, awayTeamMatch: { team, score }, alternatives: {...} }
  
  // Import-Status
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importResult, setImportResult] = useState(null);
  
  // Lade Vereine, Teams und Spieler beim Mount
  useEffect(() => {
    loadClubsAndTeams();
    loadAllPlayers();
  }, []);
  
  // Auto-Matching wenn Daten gescraped wurden
  useEffect(() => {
    if (scrapedData?.club_info?.club_name && allClubs.length > 0) {
      performClubMatching();
    }
  }, [scrapedData, allClubs]);
  
  useEffect(() => {
    if (scrapedData?.team_info?.team_name && selectedClubId && allTeams.length > 0) {
      performTeamMatching();
    }
  }, [scrapedData, selectedClubId, allTeams]);
  
  useEffect(() => {
    if (scrapedData?.players && scrapedData.players.length > 0 && allPlayers.length > 0) {
      performPlayerMatching();
    }
  }, [scrapedData, allPlayers]);
  
  useEffect(() => {
    if (scrapedData?.matches && scrapedData.matches.length > 0 && allTeams.length > 0) {
      performMatchMatching();
    }
  }, [scrapedData, allTeams]);
  
  const loadClubsAndTeams = async () => {
    try {
      // Lade Vereine
      const { data: clubs, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name, city, normalized_name')
        .order('name', { ascending: true });
      
      if (clubsError) throw clubsError;
      setAllClubs(clubs || []);
      
      // Lade Teams
      const { data: teams, error: teamsError } = await supabase
        .from('team_info')
        .select('id, club_id, club_name, team_name, category')
        .order('club_name', { ascending: true });
      
      if (teamsError) throw teamsError;
      setAllTeams(teams || []);
    } catch (err) {
      console.error('Error loading clubs/teams:', err);
      setError(`Fehler beim Laden der Vereine/Teams: ${err.message}`);
    }
  };
  
  const loadAllPlayers = async () => {
    try {
      const { data: players, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id_number, player_type')
        .order('name', { ascending: true });
      
      if (playersError) throw playersError;
      setAllPlayers(players || []);
    } catch (err) {
      console.error('Error loading players:', err);
      // Nicht kritisch - Spieler-Matching funktioniert auch ohne
    }
  };
  
  /**
   * Fuzzy Matching für Verein
   */
  const performClubMatching = () => {
    if (!scrapedData?.club_info?.club_name || allClubs.length === 0) return;
    
    const scrapedClubName = scrapedData.club_info.club_name;
    const matches = [];
    
    // Berechne Similarity für alle Vereine
    allClubs.forEach(club => {
      const score = calculateSimilarity(scrapedClubName, club.name);
      if (score > 0.5) { // Nur relevante Matches
        matches.push({ club, score });
      }
    });
    
    // Sortiere nach Score (höchster zuerst)
    matches.sort((a, b) => b.score - a.score);
    
    if (matches.length === 0) {
      setClubMatch(null);
      return;
    }
    
    const bestMatch = matches[0];
    const confidence = bestMatch.score >= FUZZY_MATCH_THRESHOLD ? 'high' :
                      bestMatch.score >= MANUAL_REVIEW_THRESHOLD ? 'medium' : 'low';
    
    setClubMatch({
      match: bestMatch.club,
      score: bestMatch.score,
      confidence,
      alternatives: matches.slice(1, 5) // Top 5 Alternativen
    });
    
    // Auto-Select wenn Confidence hoch
    if (confidence === 'high') {
      setSelectedClubId(bestMatch.club.id);
    }
  };
  
  /**
   * Fuzzy Matching für Team
   */
  const performTeamMatching = () => {
    if (!scrapedData?.team_info?.team_name || !selectedClubId || allTeams.length === 0) return;
    
    const scrapedTeamName = scrapedData.team_info.team_name;
    const scrapedCategory = scrapedData.team_info.category;
    
    // Suche Teams im ausgewählten Verein
    const clubTeams = allTeams.filter(t => t.club_id === selectedClubId);
    
    const matches = [];
    
    // Berechne Similarity für alle Teams des Vereins
    clubTeams.forEach(team => {
      // Kombiniere Team-Name und Kategorie für Matching
      const teamLabel = `${team.team_name} ${team.category || ''}`.trim();
      const scrapedLabel = `${scrapedTeamName} ${scrapedCategory || ''}`.trim();
      
      let score = calculateSimilarity(scrapedLabel, teamLabel);
      
      // Bonus wenn Kategorie übereinstimmt
      if (scrapedCategory && team.category && 
          normalizeString(scrapedCategory) === normalizeString(team.category)) {
        score = Math.min(1.0, score + 0.1);
      }
      
      if (score > 0.5) {
        matches.push({ team, score });
      }
    });
    
    // Sortiere nach Score
    matches.sort((a, b) => b.score - a.score);
    
    if (matches.length === 0) {
      setTeamMatch(null);
      return;
    }
    
    const bestMatch = matches[0];
    const confidence = bestMatch.score >= FUZZY_MATCH_THRESHOLD ? 'high' :
                      bestMatch.score >= MANUAL_REVIEW_THRESHOLD ? 'medium' : 'low';
    
    setTeamMatch({
      match: bestMatch.team,
      score: bestMatch.score,
      confidence,
      alternatives: matches.slice(1, 5)
    });
    
    // Auto-Select wenn Confidence hoch
    if (confidence === 'high') {
      setSelectedTeamId(bestMatch.team.id);
    }
  };
  
  /**
   * Normalisiert Spielernamen für besseres Matching
   */
  const normalizePlayerName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[ä]/g, 'ae')
      .replace(/[ö]/g, 'oe')
      .replace(/[ü]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9\s,]/g, '')
      .trim();
  };

  /**
   * Kehrt die Reihenfolge von "Nachname, Vorname" zu "Vorname Nachname" um
   */
  const reverseNameOrder = (name) => {
    if (!name) return name;
    const parts = name.split(',').map(p => p.trim());
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`;
    }
    return name;
  };

  /**
   * Verbessertes Fuzzy Matching für Spieler
   */
  const performPlayerMatching = () => {
    if (!scrapedData?.players || scrapedData.players.length === 0 || allPlayers.length === 0) return;
    
    const playerMatches = scrapedData.players.map(scrapedPlayer => {
      const matches = [];
      const scrapedName = scrapedPlayer.name || '';
      const scrapedNameNorm = normalizePlayerName(scrapedName);
      const scrapedNameReversed = reverseNameOrder(scrapedName);
      const scrapedNameReversedNorm = normalizePlayerName(scrapedNameReversed);
      
      // PRIORITÄT 1: Exakte TVM ID-Nummer Match (höchste Priorität)
      if (scrapedPlayer.id_number) {
        const tvmIdStr = String(scrapedPlayer.id_number).trim();
        const exactIdMatch = allPlayers.find(p => {
          if (!p.tvm_id_number) return false;
          return String(p.tvm_id_number).trim() === tvmIdStr;
        });
        if (exactIdMatch) {
          matches.push({ player: exactIdMatch, score: 1.0, matchType: 'tvm_id' });
        }
      }
      
      // PRIORITÄT 2: Exakter Name-Match (normalisiert)
      if (matches.length === 0) {
        const exactNameMatch = allPlayers.find(p => {
          const pNameNorm = normalizePlayerName(p.name || '');
          return pNameNorm === scrapedNameNorm || 
                 pNameNorm === scrapedNameReversedNorm;
        });
        if (exactNameMatch) {
          matches.push({ player: exactNameMatch, score: 0.98, matchType: 'exact_name' });
        }
      }
      
      // PRIORITÄT 3: Fuzzy Name-Matching mit verschiedenen Varianten
      if (matches.length === 0) {
        allPlayers.forEach(player => {
          const playerName = player.name || '';
          const playerNameNorm = normalizePlayerName(playerName);
          const playerNameReversed = reverseNameOrder(playerName);
          const playerNameReversedNorm = normalizePlayerName(playerNameReversed);
          
          // Berechne Similarity für alle Varianten
          const scores = [
            calculateSimilarity(scrapedName, playerName),
            calculateSimilarity(scrapedNameNorm, playerNameNorm),
            calculateSimilarity(scrapedNameReversed, playerName),
            calculateSimilarity(scrapedNameReversedNorm, playerNameNorm),
            calculateSimilarity(scrapedName, playerNameReversed),
            calculateSimilarity(scrapedNameNorm, playerNameReversedNorm)
          ];
          
          const maxScore = Math.max(...scores);
          
          // Nur relevante Matches (Threshold erhöht auf 0.85 für bessere Qualität)
          if (maxScore >= 0.85) {
            matches.push({ 
              player, 
              score: maxScore, 
              matchType: 'fuzzy_name',
              variant: scores.indexOf(maxScore)
            });
          }
        });
        
        // Sortiere nach Score
        matches.sort((a, b) => b.score - a.score);
      }
      
      return {
        scrapedPlayer,
        matches: matches.slice(0, 5), // Top 5 Matches für bessere Übersicht
        bestMatch: matches[0] || null
      };
    });
    
    setPlayerMatches(playerMatches);
  };
  
  const performMatchMatching = () => {
    if (!scrapedData?.matches || scrapedData.matches.length === 0 || allTeams.length === 0) return;
    
    const matchMatches = scrapedData.matches.map(scrapedMatch => {
      const findTeamMatches = (teamName) => {
        if (!teamName) return { matches: [], bestMatch: null };
        
        const matches = [];
        
        // 1. Exakte Matches
        const exactMatches = allTeams.filter(t => 
          t.team_name === teamName || 
          `${t.club_name} ${t.team_name}` === teamName ||
          t.club_name === teamName
        );
        
        exactMatches.forEach(team => {
          matches.push({ team, score: 1.0, matchType: 'exact' });
        });
        
        // 2. Fuzzy Matches (wenn keine exakten Matches)
        if (matches.length === 0) {
          const normalizedSearch = normalizeString(teamName);
          
          allTeams.forEach(team => {
            const teamLabel = `${team.club_name} ${team.team_name}`;
            const normalizedTeam = normalizeString(teamLabel);
            const score = calculateSimilarity(normalizedSearch, normalizedTeam);
            
            if (score >= 0.5) { // Nur relevante Matches
              matches.push({ team, score, matchType: 'fuzzy' });
            }
          });
          
          // Sortiere nach Score
          matches.sort((a, b) => b.score - a.score);
        }
        
        const bestMatch = matches.length > 0 ? matches[0] : null;
        const confidence = bestMatch?.score >= FUZZY_MATCH_THRESHOLD ? 'high' :
                          bestMatch?.score >= MANUAL_REVIEW_THRESHOLD ? 'medium' : 'low';
        
        return {
          matches: matches.slice(0, 10), // Top 10 Alternativen
          bestMatch,
          confidence
        };
      };
      
      const homeTeamMatches = findTeamMatches(scrapedMatch.home_team);
      const awayTeamMatches = findTeamMatches(scrapedMatch.away_team);
      
      // Manuell ausgewählte Teams (initial: bestMatch wenn confidence high)
      const selectedHomeTeamId = homeTeamMatches.confidence === 'high' ? homeTeamMatches.bestMatch?.team.id : null;
      const selectedAwayTeamId = awayTeamMatches.confidence === 'high' ? awayTeamMatches.bestMatch?.team.id : null;
      
      return {
        scrapedMatch,
        homeTeamMatches,
        awayTeamMatches,
        selectedHomeTeamId,
        selectedAwayTeamId
      };
    });
    
    setMatchMatches(matchMatches);
  };
  
  // Handler für manuelle Team-Auswahl bei Matches
  const handleMatchTeamSelection = (matchIndex, teamType, teamId) => {
    setMatchMatches(prev => {
      const updated = [...prev];
      if (updated[matchIndex]) {
        if (teamType === 'home') {
          updated[matchIndex].selectedHomeTeamId = teamId;
        } else {
          updated[matchIndex].selectedAwayTeamId = teamId;
        }
      }
      return updated;
    });
  };
  
  const handleScrape = async () => {
    if (!teamPortraitUrl) {
      setError('Bitte eine Team-Portrait-URL eingeben');
      return;
    }
    
    if (!teamPortraitUrl.includes('teamPortrait')) {
      setError('Ungültige URL. Bitte eine nuLiga Team-Portrait-URL verwenden.');
      return;
    }
    
    setIsScraping(true);
    setError(null);
    setScrapedData(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/import/team-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamPortraitUrl })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Scrapen');
      }
      
      if (!result.success || !result.data) {
        throw new Error('Ungültige Antwort vom Server');
      }
      
      setScrapedData(result.data);
      setSuccessMessage('✅ Team-Portrait erfolgreich gescraped!');
      
    } catch (err) {
      console.error('Error scraping team portrait:', err);
      setError(`Fehler beim Scrapen: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };
  
  const handleCreateClub = async () => {
    try {
      if (!newClubData.name || !newClubData.city) {
        setError('Bitte Name und Stadt eingeben');
        return;
      }
      
      const { data, error: createError } = await supabase
        .rpc('create_club_as_super_admin', {
          p_name: newClubData.name,
          p_city: newClubData.city,
          p_federation: newClubData.federation || 'TVM',
          p_website: newClubData.website || null
        });
      
      if (createError) throw createError;
      
      const club = Array.isArray(data) ? data[0] : data;
      
      // Aktualisiere Liste
      setAllClubs([...allClubs, club]);
      setSelectedClubId(club.id);
      
      // Update scrapedData
      if (scrapedData) {
        setScrapedData({
          ...scrapedData,
          club_info: { ...scrapedData.club_info, matched_club_id: club.id }
        });
      }
      
      setShowCreateClubModal(false);
      setNewClubData({ name: '', city: '', federation: 'TVM', website: '' });
      setSuccessMessage(`✅ Verein "${club.name}" wurde erstellt!`);
      
    } catch (err) {
      console.error('Error creating club:', err);
      setError(`Fehler beim Erstellen des Vereins: ${err.message}`);
    }
  };
  
  const handleCreateTeam = async () => {
    try {
      if (!newTeamData.team_name || !newTeamData.category || !newTeamData.club_id) {
        setError('Bitte Team-Name, Kategorie und Verein auswählen');
        return;
      }
      
      // Hole Club-Name aus club_id
      const { data: clubData, error: clubError } = await supabase
        .from('club_info')
        .select('name')
        .eq('id', newTeamData.club_id)
        .single();
      
      if (clubError) {
        throw new Error(`Fehler beim Laden des Vereins: ${clubError.message}`);
      }
      
      if (!clubData || !clubData.name) {
        throw new Error('Verein nicht gefunden');
      }
      
      const { data, error: createError } = await supabase
        .from('team_info')
        .insert({
          club_id: newTeamData.club_id,
          club_name: clubData.name, // ✅ WICHTIG: club_name ist NOT NULL
          team_name: newTeamData.team_name,
          category: newTeamData.category
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // ✅ Erstelle team_season, wenn scrapedData vorhanden ist
      if (scrapedData?.team_info) {
        const season = scrapedData.team_info.season || 'Winter 2025/26';
        const { error: seasonError } = await supabase
          .from('team_seasons')
          .insert({
            team_id: data.id,
            season: season,
            league: scrapedData.team_info.league || null,
            group_name: scrapedData.team_info.group_name || null,
            team_size: 6, // Standard Team-Größe für Tennis
            is_active: true
          });
        
        if (seasonError) {
          console.warn('⚠️ Fehler beim Erstellen von team_season:', seasonError);
          // Nicht kritisch, Team wurde erstellt
        }
      }
      
      // Aktualisiere Liste
      setAllTeams([...allTeams, data]);
      setSelectedTeamId(data.id);
      
      setShowCreateTeamModal(false);
      setNewTeamData({ team_name: '', category: '', club_id: selectedClubId });
      setSuccessMessage(`✅ Team "${data.team_name}" wurde erstellt!`);
      
    } catch (err) {
      console.error('Error creating team:', err);
      setError(`Fehler beim Erstellen des Teams: ${err.message}`);
    }
  };
  
  const handleImport = async () => {
    if (!scrapedData) {
      setError('Bitte zuerst Team-Portrait scrapen');
      return;
    }
    
    if (!selectedClubId) {
      setError('Bitte einen Verein auswählen oder erstellen');
      return;
    }
    
    if (!selectedTeamId) {
      setError('Bitte ein Team auswählen oder erstellen');
      return;
    }
    
    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);
    setImportProgress({ current: 0, total: 0, message: 'Import startet...' });
    
    try {
      const totalSteps = (scrapedData.players?.length || 0) + (scrapedData.matches?.length || 0);
      setImportProgress({ current: 0, total: totalSteps, message: 'Importiere Spieler...' });
      
      let importedPlayers = 0;
      let importedMatches = 0;
      const errors = [];
      
      // 1. Importiere Spieler
      if (scrapedData.players && scrapedData.players.length > 0) {
        for (let i = 0; i < scrapedData.players.length; i++) {
          const player = scrapedData.players[i];
          
          try {
            // WICHTIG: Nutze die Matching-Ergebnisse aus performPlayerMatching
            const playerMatch = playerMatches.find(pm => 
              pm.scrapedPlayer.name === player.name && 
              pm.scrapedPlayer.id_number === player.id_number
            );
            
            let playerId = null;
            let matchReason = null;
            
            // PRIORITÄT 1: Nutze Matching-Ergebnisse aus performPlayerMatching
            if (playerMatch?.bestMatch && playerMatch.bestMatch.score >= 0.85) {
              playerId = playerMatch.bestMatch.player.id;
              matchReason = `Matching-Ergebnis (${Math.round(playerMatch.bestMatch.score * 100)}%)`;
              console.log(`✅ Verwende existierenden Spieler für ${player.name}: ${playerMatch.bestMatch.player.name} (${matchReason})`);
            } else {
              // PRIORITÄT 2: Prüfe via TVM ID (in allPlayers Array)
              if (player.id_number) {
                const tvmIdStr = String(player.id_number).trim();
                const existingByTvmId = allPlayers.find(p => {
                  if (!p.tvm_id_number) return false;
                  return String(p.tvm_id_number).trim() === tvmIdStr;
                });
                
                if (existingByTvmId) {
                  playerId = existingByTvmId.id;
                  matchReason = 'TVM ID Match (in allPlayers)';
                  console.log(`✅ Gefunden via TVM ID in allPlayers: ${existingByTvmId.name}`);
                }
              }
              
              // PRIORITÄT 3: Prüfe via Name-Matching (normalisiert) in allPlayers
              if (!playerId) {
                const playerNameNorm = normalizePlayerName(player.name);
                const playerNameReversedNorm = normalizePlayerName(reverseNameOrder(player.name));
                
                for (const existingPlayer of allPlayers) {
                  const existingNameNorm = normalizePlayerName(existingPlayer.name || '');
                  const existingNameReversedNorm = normalizePlayerName(reverseNameOrder(existingPlayer.name || ''));
                  
                  // Exakter Match (normalisiert)
                  if (existingNameNorm === playerNameNorm || 
                      existingNameNorm === playerNameReversedNorm ||
                      existingNameReversedNorm === playerNameNorm) {
                    playerId = existingPlayer.id;
                    matchReason = 'Exakter Name-Match (normalisiert)';
                    console.log(`✅ Gefunden via exaktem Name-Match: ${existingPlayer.name} für ${player.name}`);
                    break;
                  }
                  
                  // Fuzzy Match (höherer Threshold: 0.90)
                  const similarity = calculateSimilarity(playerNameNorm, existingNameNorm);
                  if (similarity >= 0.90) {
                    playerId = existingPlayer.id;
                    matchReason = `Fuzzy-Match (${Math.round(similarity * 100)}%)`;
                    console.log(`✅ Gefunden via Fuzzy-Match: ${existingPlayer.name} für ${player.name} (${matchReason})`);
                    break;
                  }
                }
              }
              
              // PRIORITÄT 4: Fallback - Prüfe direkt in DB via TVM ID (falls allPlayers nicht vollständig)
              if (!playerId && player.id_number) {
                try {
                  const tvmId = String(player.id_number).trim();
                  const { data: existing, error: checkError } = await supabase
                    .from('players_unified')
                    .select('id, name')
                    .eq('tvm_id_number', tvmId)
                    .maybeSingle();
                  
                  if (checkError) {
                    if (checkError.code !== 'PGRST116' && checkError.code !== '406') {
                      console.warn(`Fehler beim Prüfen von Spieler ${player.name}:`, checkError);
                    }
                  } else if (existing) {
                    playerId = existing.id;
                    matchReason = 'TVM ID Match (DB Query)';
                    console.log(`✅ Gefunden via TVM ID (DB): ${existing.name}`);
                  }
                } catch (err) {
                  console.warn(`Exception beim Prüfen von Spieler ${player.name}:`, err);
                }
              }
            }
            
            // WICHTIG: Wenn kein Match gefunden wurde, sollte der Spieler NICHT erstellt werden
            // wenn ein ähnlicher Name existiert (auch mit niedrigerem Score)
            if (!playerId && playerMatch?.bestMatch && playerMatch.bestMatch.score >= 0.75) {
              // Warnung: Es gibt ein Match, aber mit niedrigerer Confidence
              console.warn(`⚠️ Potentieller Duplikat für ${player.name}: ${playerMatch.bestMatch.player.name} (${Math.round(playerMatch.bestMatch.score * 100)}%) - bitte manuell prüfen!`);
              // Optional: Hier könnte man den Benutzer fragen, ob er trotzdem erstellen will
            }
            
            // Erstelle Spieler NUR wenn wirklich kein Match gefunden wurde
            if (!playerId) {
              const { data: newPlayer, error: playerError } = await supabase
                .from('players_unified')
                .insert({
                  name: player.name,
                  current_lk: player.lk,
                  tvm_id_number: player.id_number || null,
                  player_type: 'imported',
                  import_source: 'manual',
                  primary_team_id: selectedTeamId
                })
                .select()
                .single();
              
              if (playerError) {
                // Prüfe ob es ein Duplikat-Fehler ist
                if (playerError.code === '23505') {
                  // Duplikat - versuche nochmal zu finden
                  try {
                    const tvmId = player.id_number ? String(player.id_number).trim() : null;
                    if (tvmId) {
                      const { data: existingPlayer } = await supabase
                        .from('players_unified')
                        .select('id')
                        .eq('tvm_id_number', tvmId)
                        .maybeSingle();
                      
                      if (existingPlayer) {
                        playerId = existingPlayer.id;
                      } else {
                        throw playerError;
                      }
                    } else {
                      throw playerError;
                    }
                  } catch (findErr) {
                    throw playerError;
                  }
                } else {
                  throw playerError;
                }
              } else {
                playerId = newPlayer.id;
              }
            }
            
            // Erstelle Privacy Settings (mit upsert für den Fall, dass es bereits existiert)
            if (playerId) {
              const { error: privacyError } = await supabase
                .from('player_privacy_settings')
                .upsert(
                  { player_id: playerId },
                  { onConflict: 'player_id', ignoreDuplicates: false }
                );
              
              if (privacyError && privacyError.code !== '23505') {
                // 23505 = duplicate key, das ist OK
                console.warn(`Fehler beim Erstellen von Privacy Settings für Spieler ${player.name}:`, privacyError);
              }
            }
            
            // Erstelle/Update team_membership
            const season = scrapedData.team_info.season || 'Winter 2025/26';
            const { error: membershipError } = await supabase
              .from('team_memberships')
              .upsert({
                player_id: playerId,
                team_id: selectedTeamId,
                season: season,
                meldeliste_position: player.position,
                is_active: true
              }, { onConflict: 'player_id,team_id,season' });
            
            if (membershipError) throw membershipError;
            
            importedPlayers++;
            setImportProgress({ 
              current: importedPlayers, 
              total: totalSteps, 
              message: `Importiere Spieler... (${importedPlayers}/${scrapedData.players.length})` 
            });
            
          } catch (err) {
            console.error(`Error importing player ${player.name}:`, err);
            errors.push(`Spieler ${player.name}: ${err.message}`);
          }
        }
      }
      
      // 2. Importiere Matches
      setImportProgress({ current: importedPlayers, total: totalSteps, message: 'Importiere Spieltermine...' });
      
      let skippedMatches = 0;
      let newMatchdays = 0;
      let updatedScores = 0;
      
      // Nutze matchMatches (mit manuell ausgewählten Teams)
      if (matchMatches && matchMatches.length > 0) {
        for (let i = 0; i < matchMatches.length; i++) {
          const matchMatch = matchMatches[i];
          const match = matchMatch.scrapedMatch;
          
          try {
            // Nutze manuell ausgewählte Teams (oder bestMatch falls vorhanden)
            // Ignoriere "__all__" als Team-ID
            const homeTeamId = (matchMatch.selectedHomeTeamId && matchMatch.selectedHomeTeamId !== '__all__') 
              ? matchMatch.selectedHomeTeamId 
              : (matchMatch.homeTeamMatches.bestMatch?.team.id && matchMatch.homeTeamMatches.confidence === 'high' ? matchMatch.homeTeamMatches.bestMatch.team.id : null);
            const awayTeamId = (matchMatch.selectedAwayTeamId && matchMatch.selectedAwayTeamId !== '__all__') 
              ? matchMatch.selectedAwayTeamId 
              : (matchMatch.awayTeamMatches.bestMatch?.team.id && matchMatch.awayTeamMatches.confidence === 'high' ? matchMatch.awayTeamMatches.bestMatch.team.id : null);
            
            if (!homeTeamId || !awayTeamId || homeTeamId === '__all__' || awayTeamId === '__all__') {
              console.warn(`⚠️ Match ${match.match_number || i + 1} übersprungen: Teams nicht ausgewählt`, {
                home_team: match.home_team,
                away_team: match.away_team,
                homeTeamId,
                awayTeamId
              });
              skippedMatches++;
              errors.push(`Match ${match.match_number || i + 1}: Teams nicht ausgewählt (${match.home_team} vs ${match.away_team})`);
              continue;
            }
            
            const homeTeam = allTeams.find(t => t.id === homeTeamId);
            const awayTeam = allTeams.find(t => t.id === awayTeamId);
            
            if (!homeTeam || !awayTeam) {
              console.warn(`⚠️ Match ${match.match_number || i + 1} übersprungen: Teams nicht gefunden`, {
                homeTeamId,
                awayTeamId
              });
              skippedMatches++;
              errors.push(`Match ${match.match_number || i + 1}: Teams nicht gefunden`);
              continue;
            }
            
            // Parse Datum
            const matchDate = new Date(match.match_date);
            if (isNaN(matchDate.getTime())) {
              errors.push(`Match ${match.match_number}: Ungültiges Datum`);
              continue;
            }
            
            // Prüfe ob Matchday bereits existiert
            let existingMatchday = null;
            if (match.match_number) {
              const { data: existing } = await supabase
                .from('matchdays')
                .select('id, home_score, away_score')
                .eq('match_number', match.match_number)
                .maybeSingle();
              
              existingMatchday = existing;
            }
            
            // Erstelle/Update Matchday
            const matchdayData = {
              match_date: matchDate.toISOString(),
              start_time: match.start_time || null,
              match_number: match.match_number,
              home_team_id: homeTeam.id,
              away_team_id: awayTeam.id,
              venue: match.venue || null,
              court_number: match.court_range || null,
              season: scrapedData.team_info.season || 'Winter 2025/26',
              league: scrapedData.team_info.league || null,
              group_name: scrapedData.team_info.group_name || null,
              status: match.status || 'scheduled',
              home_score: match.match_points ? parseInt(match.match_points.split(':')[0]) : null,
              away_score: match.match_points ? parseInt(match.match_points.split(':')[1]) : null
            };
            
            let matchError = null;
            if (existingMatchday) {
              // Update existing (nur wenn Scores vorhanden)
              if (matchdayData.home_score !== null || matchdayData.away_score !== null) {
                const { error: updateError } = await supabase
                  .from('matchdays')
                  .update({
                    home_score: matchdayData.home_score,
                    away_score: matchdayData.away_score,
                    status: matchdayData.status
                  })
                  .eq('id', existingMatchday.id);
                
                matchError = updateError;
                if (!updateError) {
                  updatedScores++;
                }
              } else {
                skippedMatches++;
                continue; // Überspringe, wenn kein Update nötig
              }
            } else {
              // Insert new
              const { error: insertError } = await supabase
                .from('matchdays')
                .insert(matchdayData);
              
              matchError = insertError;
              if (!insertError) {
                newMatchdays++;
              }
            }
            
            if (matchError) {
              // Prüfe ob es ein Duplikat-Fehler ist (z.B. unique constraint auf match_date + teams)
              if (matchError.code === '23505') {
                console.warn(`⚠️ Match ${match.match_number || i + 1} bereits vorhanden (Duplikat)`);
                skippedMatches++;
                continue;
              }
              throw matchError;
            }
            
            importedMatches++;
            setImportProgress({ 
              current: importedPlayers + importedMatches, 
              total: totalSteps, 
              message: `Importiere Spieltermine... (${importedMatches}/${scrapedData.matches.length})` 
            });
            
          } catch (err) {
            console.error(`Error importing match ${match.match_number}:`, err);
            errors.push(`Match ${match.match_number}: ${err.message}`);
          }
        }
      }
      
      // 3. Erstelle/Update team_season
      const season = scrapedData.team_info.season || 'Winter 2025/26';
      try {
        // Prüfe ob team_season bereits existiert
        const { data: existingSeason } = await supabase
          .from('team_seasons')
          .select('id')
          .eq('team_id', selectedTeamId)
          .eq('season', season)
          .eq('league', scrapedData.team_info.league || null)
          .eq('group_name', scrapedData.team_info.group_name || null)
          .maybeSingle();
        
        if (existingSeason) {
          // Update existing
          const { error: updateError } = await supabase
            .from('team_seasons')
            .update({ is_active: true })
            .eq('id', existingSeason.id);
          
          if (updateError) {
            console.warn('Fehler beim Updaten von team_season:', updateError);
            errors.push(`Team-Season Update: ${updateError.message}`);
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('team_seasons')
            .insert({
              team_id: selectedTeamId,
              season: season,
              league: scrapedData.team_info.league || null,
              group_name: scrapedData.team_info.group_name || null,
              team_size: 6, // Standard Team-Größe für Tennis
              is_active: true
            });
          
          if (insertError) {
            console.warn('Fehler beim Erstellen von team_season:', insertError);
            errors.push(`Team-Season Insert: ${insertError.message}`);
          }
        }
      } catch (err) {
        console.warn('Exception beim Erstellen/Updaten von team_season:', err);
        errors.push(`Team-Season: ${err.message}`);
      }
      
      // Log Activity
      await LoggingService.logActivity({
        action: 'team_portrait_import',
        entity_type: 'team',
        entity_id: selectedTeamId,
        details: {
          url: teamPortraitUrl,
          players_imported: importedPlayers,
          matches_imported: importedMatches,
          errors: errors.length > 0 ? errors : null
        }
      });
      
      setImportResult({
        success: true,
        players: importedPlayers,
        matches: importedMatches,
        newMatchdays: newMatchdays,
        updatedScores: updatedScores,
        skippedMatches: skippedMatches,
        errors: errors
      });
      
      const matchSummary = [];
      if (newMatchdays > 0) matchSummary.push(`${newMatchdays} neue Matchdays`);
      if (updatedScores > 0) matchSummary.push(`${updatedScores} aktualisierte Scores`);
      if (skippedMatches > 0) matchSummary.push(`${skippedMatches} übersprungen`);
      
      setSuccessMessage(
        `✅ Import erfolgreich! ${importedPlayers} Spieler importiert. ${matchSummary.length > 0 ? `Matches: ${matchSummary.join(' · ')}.` : ''}`
      );
      
    } catch (err) {
      console.error('Error during import:', err);
      setError(`Fehler beim Import: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, message: '' });
    }
  };
  
  const selectedClub = useMemo(() => 
    allClubs.find(c => c.id === selectedClubId),
    [allClubs, selectedClubId]
  );
  
  const selectedTeam = useMemo(() => 
    allTeams.find(t => t.id === selectedTeamId),
    [allTeams, selectedTeamId]
  );
  
  const availableTeams = useMemo(() => 
    allTeams.filter(t => t.club_id === selectedClubId),
    [allTeams, selectedClubId]
  );
  
  return (
    <div className="team-portrait-import-container">
      <div className="import-header">
        <h2>Team-Portrait Import</h2>
        <p className="import-subtitle">
          Importiere komplette Team-Daten direkt von der nuLiga Team-Portrait-Seite
        </p>
      </div>
      
      {/* URL-Eingabe */}
      <div className="import-section">
        <label className="import-label">
          <ExternalLink size={16} />
          nuLiga Team-Portrait URL
        </label>
        <div className="url-input-group">
          <input
            type="url"
            className="url-input"
            placeholder="https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=..."
            value={teamPortraitUrl}
            onChange={(e) => setTeamPortraitUrl(e.target.value)}
            disabled={isScraping}
          />
          <button
            className="btn-scrape"
            onClick={handleScrape}
            disabled={isScraping || !teamPortraitUrl}
          >
            {isScraping ? (
              <>
                <Loader className="spinner" size={16} />
                Scrapen...
              </>
            ) : (
              'Scrapen'
            )}
          </button>
        </div>
      </div>
      
      {/* Fehler/Success Messages */}
      {error && (
        <div className="message-error">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="message-close">
            <X size={14} />
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="message-success">
          <CheckCircle size={16} />
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="message-close">
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* Gescraped Daten */}
      {scrapedData && (
        <>
          {/* Verein-Zuordnung */}
          <div className="import-section">
            <h3 className="section-title">
              <MapPin size={18} />
              Verein-Zuordnung
            </h3>
            
            <div className="club-selection">
              {/* Gescraped Info */}
              {scrapedData.club_info && (
                <div className="scraped-info">
                  <div className="info-row">
                    <span className="info-label">Gescraped:</span>
                    <span className="info-value">{scrapedData.club_info.club_name}</span>
                  </div>
                  {scrapedData.club_info.address && (
                    <div className="info-row">
                      <span className="info-label">Adresse:</span>
                      <span className="info-value">{scrapedData.club_info.address}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Matching-Ergebnis */}
              {clubMatch && (
                <div className={`match-result ${clubMatch.confidence} ${selectedClubId === clubMatch.match.id ? 'selected' : ''}`}>
                  <div className="match-header">
                    <div className="match-status">
                      {clubMatch.confidence === 'high' && (
                        <CheckCircle size={18} className="icon-success" />
                      )}
                      {clubMatch.confidence === 'medium' && (
                        <AlertTriangle size={18} className="icon-warning" />
                      )}
                      {clubMatch.confidence === 'low' && (
                        <AlertCircle size={18} className="icon-error" />
                      )}
                      <span className="match-label">
                        {clubMatch.confidence === 'high' && '✅ Automatisch erkannt'}
                        {clubMatch.confidence === 'medium' && '⚠️ Bitte prüfen'}
                        {clubMatch.confidence === 'low' && '❌ Kein gutes Match'}
                      </span>
                      <span className="match-score">({Math.round(clubMatch.score * 100)}% Übereinstimmung)</span>
                    </div>
                  </div>
                  
                  <div className="match-suggestion">
                    <div className={`suggestion-item best ${selectedClubId === clubMatch.match.id ? 'is-selected' : ''}`}>
                      <div className="suggestion-content">
                        <div className="suggestion-main">
                          <strong>{clubMatch.match.name}</strong>
                          {clubMatch.match.city && <span className="suggestion-meta">({clubMatch.match.city})</span>}
                        </div>
                        {selectedClubId === clubMatch.match.id && (
                          <div className="selected-badge">
                            <CheckCircle size={16} />
                            <span>Ausgewählt</span>
                          </div>
                        )}
                      </div>
                      <button
                        className={`btn-select-match ${selectedClubId === clubMatch.match.id ? 'selected' : ''}`}
                        onClick={() => setSelectedClubId(clubMatch.match.id)}
                      >
                        {selectedClubId === clubMatch.match.id ? (
                          <>
                            <CheckCircle size={14} />
                            Ausgewählt
                          </>
                        ) : (
                          'Auswählen'
                        )}
                      </button>
                    </div>
                    
                    {clubMatch.alternatives && clubMatch.alternatives.length > 0 && (
                      <div className="alternatives">
                        <div className="alternatives-label">Alternative Vorschläge:</div>
                        {clubMatch.alternatives.map((alt, idx) => (
                          <div key={idx} className={`suggestion-item ${selectedClubId === alt.club.id ? 'is-selected' : ''}`}>
                            <div className="suggestion-content">
                              <div className="suggestion-main">
                                {alt.club.name}
                                {alt.club.city && <span className="suggestion-meta">({alt.club.city})</span>}
                                <span className="suggestion-score">{Math.round(alt.score * 100)}%</span>
                              </div>
                              {selectedClubId === alt.club.id && (
                                <div className="selected-badge">
                                  <CheckCircle size={16} />
                                  <span>Ausgewählt</span>
                                </div>
                              )}
                            </div>
                            <button
                              className={`btn-select-match btn-secondary ${selectedClubId === alt.club.id ? 'selected' : ''}`}
                              onClick={() => setSelectedClubId(alt.club.id)}
                            >
                              {selectedClubId === alt.club.id ? (
                                <>
                                  <CheckCircle size={14} />
                                  Ausgewählt
                                </>
                              ) : (
                                'Auswählen'
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Manuelle Auswahl */}
              <div className="manual-selection">
                <label>Oder manuell auswählen:</label>
                <div className="selection-group">
                  <select
                    className="select-input"
                    value={selectedClubId || ''}
                    onChange={(e) => {
                      setSelectedClubId(e.target.value || null);
                      setSelectedTeamId(null); // Reset Team wenn Verein wechselt
                    }}
                  >
                    <option value="">-- Verein auswählen --</option>
                    {allClubs.map(club => (
                      <option key={club.id} value={club.id}>
                        {club.name} {club.city ? `(${club.city})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setNewClubData({
                        name: scrapedData.club_info.club_name || '',
                        city: scrapedData.club_info.city || '',
                        federation: 'TVM',
                        website: scrapedData.club_info.website || ''
                      });
                      setShowCreateClubModal(true);
                    }}
                  >
                    Neuer Verein
                  </button>
                </div>
              </div>
              
              {selectedClub && (
                <div className="selected-info prominent">
                  <div className="selected-info-icon">
                    <CheckCircle size={20} className="icon-success" />
                  </div>
                  <div className="selected-info-content">
                    <div className="selected-info-label">Aktuell ausgewählter Verein:</div>
                    <div className="selected-info-name">{selectedClub.name}</div>
                    {selectedClub.city && (
                      <div className="selected-info-meta">{selectedClub.city}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Team-Zuordnung */}
          {selectedClubId && (
            <div className="import-section">
              <h3 className="section-title">
                <Users size={18} />
                Team-Zuordnung
              </h3>
              
              <div className="team-selection">
                {/* Gescraped Info */}
                {scrapedData.team_info && (
                  <div className="scraped-info">
                    <div className="info-row">
                      <span className="info-label">Gescraped:</span>
                      <span className="info-value">{scrapedData.team_info.team_name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Liga:</span>
                      <span className="info-value">{scrapedData.team_info.league}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Kategorie:</span>
                      <span className="info-value">{scrapedData.team_info.category}</span>
                    </div>
                  </div>
                )}
                
                {/* Matching-Ergebnis */}
                {teamMatch && (
                  <div className={`match-result ${teamMatch.confidence}`}>
                    <div className="match-header">
                      <div className="match-status">
                        {teamMatch.confidence === 'high' && (
                          <CheckCircle size={18} className="icon-success" />
                        )}
                        {teamMatch.confidence === 'medium' && (
                          <AlertTriangle size={18} className="icon-warning" />
                        )}
                        {teamMatch.confidence === 'low' && (
                          <AlertCircle size={18} className="icon-error" />
                        )}
                        <span className="match-label">
                          {teamMatch.confidence === 'high' && '✅ Automatisch erkannt'}
                          {teamMatch.confidence === 'medium' && '⚠️ Bitte prüfen'}
                          {teamMatch.confidence === 'low' && '❌ Kein gutes Match'}
                        </span>
                        <span className="match-score">({Math.round(teamMatch.score * 100)}% Übereinstimmung)</span>
                      </div>
                    </div>
                    
                    <div className="match-suggestion">
                      <div className="suggestion-item best">
                        <div className="suggestion-content">
                          <strong>{teamMatch.match.team_name}</strong>
                          <span className="suggestion-meta">({teamMatch.match.category})</span>
                        </div>
                        <button
                          className="btn-select-match"
                          onClick={() => setSelectedTeamId(teamMatch.match.id)}
                        >
                          {selectedTeamId === teamMatch.match.id ? '✓ Ausgewählt' : 'Auswählen'}
                        </button>
                      </div>
                      
                      {teamMatch.alternatives && teamMatch.alternatives.length > 0 && (
                        <div className="alternatives">
                          <div className="alternatives-label">Alternative Vorschläge:</div>
                          {teamMatch.alternatives.map((alt, idx) => (
                            <div key={idx} className="suggestion-item">
                              <div className="suggestion-content">
                                {alt.team.team_name}
                                <span className="suggestion-meta">({alt.team.category})</span>
                                <span className="suggestion-score">{Math.round(alt.score * 100)}%</span>
                              </div>
                              <button
                                className="btn-select-match btn-secondary"
                                onClick={() => setSelectedTeamId(alt.team.id)}
                              >
                                Auswählen
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Alle Teams des Vereins anzeigen */}
                {availableTeams.length > 0 && (
                  <div className="all-teams-list">
                    <div className="all-teams-label">
                      <Search size={14} />
                      Alle Teams dieses Vereins ({availableTeams.length}):
                    </div>
                    <div className="teams-grid">
                      {availableTeams.map(team => (
                        <div
                          key={team.id}
                          className={`team-card ${selectedTeamId === team.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <div className="team-card-name">{team.team_name}</div>
                          <div className="team-card-category">{team.category}</div>
                          {selectedTeamId === team.id && (
                            <CheckCircle size={16} className="team-card-check" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Manuelle Auswahl */}
                <div className="manual-selection">
                  <label>Oder manuell auswählen:</label>
                  <div className="selection-group">
                    <select
                      className="select-input"
                      value={selectedTeamId || ''}
                      onChange={(e) => setSelectedTeamId(e.target.value || null)}
                      disabled={!selectedClubId}
                    >
                      <option value="">-- Team auswählen --</option>
                      {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.team_name} ({team.category})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setNewTeamData({
                          team_name: scrapedData.team_info.team_name || '',
                          category: scrapedData.team_info.category || '',
                          club_id: selectedClubId
                        });
                        setShowCreateTeamModal(true);
                      }}
                      disabled={!selectedClubId}
                    >
                      Neues Team
                    </button>
                  </div>
                </div>
                
                {selectedTeam && (
                  <div className="selected-info prominent">
                    <div className="selected-info-icon">
                      <CheckCircle size={20} className="icon-success" />
                    </div>
                    <div className="selected-info-content">
                      <div className="selected-info-label">Aktuell ausgewähltes Team:</div>
                      <div className="selected-info-name">{selectedTeam.team_name}</div>
                      <div className="selected-info-meta">{selectedTeam.category}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Spieler-Matching */}
          {selectedTeamId && playerMatches.length > 0 && (
            <div className="import-section">
              <h3 className="section-title">
                <Users size={18} />
                Spieler-Zuordnung ({playerMatches.length})
              </h3>
              
              <div className="players-matching">
                <div className="matching-summary">
                  <div className="summary-item">
                    <CheckCircle size={16} className="icon-success" />
                    <span>
                      {playerMatches.filter(pm => pm.bestMatch && pm.bestMatch.score >= FUZZY_MATCH_THRESHOLD).length} automatisch erkannt
                    </span>
                  </div>
                  <div className="summary-item">
                    <AlertTriangle size={16} className="icon-warning" />
                    <span>
                      {playerMatches.filter(pm => pm.bestMatch && pm.bestMatch.score >= MANUAL_REVIEW_THRESHOLD && pm.bestMatch.score < FUZZY_MATCH_THRESHOLD).length} bitte prüfen
                    </span>
                  </div>
                  <div className="summary-item">
                    <AlertCircle size={16} className="icon-error" />
                    <span>
                      {playerMatches.filter(pm => !pm.bestMatch || pm.bestMatch.score < MANUAL_REVIEW_THRESHOLD).length} neu anlegen
                    </span>
                  </div>
                </div>
                
                <div className="players-list-matching">
                  {playerMatches.map((pm, idx) => {
                    const scraped = pm.scrapedPlayer;
                    const best = pm.bestMatch;
                    const confidence = !best ? 'none' :
                                     best.score >= FUZZY_MATCH_THRESHOLD ? 'high' :
                                     best.score >= MANUAL_REVIEW_THRESHOLD ? 'medium' : 'low';
                    
                    return (
                      <div key={idx} className={`player-match-item ${confidence}`}>
                        <div className="player-match-scraped">
                          <span className="player-position">{scraped.position}.</span>
                          <span className="player-name">{scraped.name}</span>
                          <span className="player-lk">LK {scraped.lk}</span>
                          {scraped.id_number && (
                            <span className="player-id">ID: {scraped.id_number}</span>
                          )}
                        </div>
                        
                        {best && (
                          <div className="player-match-result">
                            <div className="match-indicator">
                              {confidence === 'high' && <CheckCircle size={14} className="icon-success" />}
                              {confidence === 'medium' && <AlertTriangle size={14} className="icon-warning" />}
                              {confidence === 'low' && <AlertCircle size={14} className="icon-error" />}
                              <span className="match-score">{Math.round(best.score * 100)}%</span>
                            </div>
                            <div className="match-player-info">
                              <strong>{best.player.name}</strong>
                              {best.player.current_lk && (
                                <span className="match-lk">LK {best.player.current_lk}</span>
                              )}
                              {best.matchType === 'tvm_id' && (
                                <span className="match-type-badge">TVM ID Match</span>
                              )}
                            </div>
                            {pm.matches.length > 1 && (
                              <div className="match-alternatives">
                                {pm.matches.slice(1, 3).map((alt, altIdx) => (
                                  <div key={altIdx} className="match-alternative">
                                    {alt.player.name} ({Math.round(alt.score * 100)}%)
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!best && (
                          <div className="player-match-result no-match">
                            <AlertCircle size={14} className="icon-error" />
                            <span>Wird als neuer Spieler angelegt</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Match-Matching */}
          {matchMatches.length > 0 && (
            <div className="import-section">
              <h3 className="section-title">
                <Calendar size={18} />
                Spieltermine-Zuordnung ({matchMatches.length})
              </h3>
              
              <div className="matches-matching">
                <div className="matching-summary">
                  <div className="summary-item">
                    <span className="summary-label">✅ Automatisch erkannt:</span>
                    <span className="summary-value">
                      {matchMatches.filter(m => 
                        m.homeTeamMatches.confidence === 'high' && 
                        m.awayTeamMatches.confidence === 'high' &&
                        m.selectedHomeTeamId && 
                        m.selectedAwayTeamId
                      ).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">⚠️ Bitte prüfen:</span>
                    <span className="summary-value">
                      {matchMatches.filter(m => 
                        (m.homeTeamMatches.confidence === 'medium' || m.awayTeamMatches.confidence === 'medium') ||
                        !m.selectedHomeTeamId || !m.selectedAwayTeamId
                      ).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">❌ Kein Match:</span>
                    <span className="summary-value">
                      {matchMatches.filter(m => 
                        (!m.homeTeamMatches.bestMatch || !m.awayTeamMatches.bestMatch)
                      ).length}
                    </span>
                  </div>
                </div>
                
                <div className="matches-list">
                  {matchMatches.map((mm, idx) => {
                    const match = mm.scrapedMatch;
                    const homeConfidence = mm.homeTeamMatches.confidence;
                    const awayConfidence = mm.awayTeamMatches.confidence;
                    const hasBothTeams = mm.selectedHomeTeamId && mm.selectedAwayTeamId;
                    
                    return (
                      <div key={idx} className={`match-match-item ${hasBothTeams ? 'complete' : 'incomplete'}`}>
                        <div className="match-match-header">
                          <div className="match-match-info">
                            <div className="match-match-number">
                              {match.match_number ? `Match #${match.match_number}` : `Match ${idx + 1}`}
                            </div>
                            <div className="match-match-date">
                              {match.match_date && new Date(match.match_date).toLocaleDateString('de-DE')}
                              {match.start_time && ` ${match.start_time}`}
                            </div>
                            {match.venue && (
                              <div className="match-match-venue">
                                <MapPin size={12} />
                                {match.venue}
                              </div>
                            )}
                            {match.match_points && (
                              <div className="match-match-score">
                                {match.match_points}
                              </div>
                            )}
                          </div>
                          {hasBothTeams && (
                            <div className="match-match-status">
                              <CheckCircle size={16} className="icon-success" />
                              <span>Bereit zum Import</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="match-match-teams">
                          {/* Home Team */}
                          <div className="match-team-selection">
                            <div className="team-selection-label">
                              <span>Heim:</span>
                              <span className="scraped-team-name">{match.home_team}</span>
                            </div>
                            <div className="team-selection-matches">
                              {mm.homeTeamMatches.bestMatch ? (
                                <>
                                  <div className={`team-match-result ${homeConfidence}`}>
                                    <div className="team-match-header">
                                      {homeConfidence === 'high' && <CheckCircle size={14} className="icon-success" />}
                                      {homeConfidence === 'medium' && <AlertTriangle size={14} className="icon-warning" />}
                                      {homeConfidence === 'low' && <AlertCircle size={14} className="icon-error" />}
                                      <span>
                                        {mm.homeTeamMatches.bestMatch.team.club_name} {mm.homeTeamMatches.bestMatch.team.team_name}
                                      </span>
                                      <span className="match-score">({Math.round(mm.homeTeamMatches.bestMatch.score * 100)}%)</span>
                                    </div>
                                  </div>
                                  
                                  <select
                                    className="team-select-dropdown"
                                    value={mm.selectedHomeTeamId === '__all__' ? '' : (mm.selectedHomeTeamId || '')}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '__all__') {
                                        handleMatchTeamSelection(idx, 'home', '__all__');
                                      } else {
                                        handleMatchTeamSelection(idx, 'home', value || null);
                                      }
                                    }}
                                  >
                                    <option value="">-- Team auswählen --</option>
                                    {mm.homeTeamMatches.matches.map((tm, tmIdx) => (
                                      <option key={tmIdx} value={tm.team.id}>
                                        {tm.team.club_name} {tm.team.team_name} ({tm.team.category}) - {Math.round(tm.score * 100)}%
                                      </option>
                                    ))}
                                    <option value="__all__">-- Alle Teams anzeigen --</option>
                                  </select>
                                  
                                  {mm.selectedHomeTeamId === '__all__' && (
                                    <select
                                      className="team-select-dropdown"
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleMatchTeamSelection(idx, 'home', e.target.value);
                                        }
                                      }}
                                    >
                                      <option value="">-- Team auswählen --</option>
                                      {allTeams.map(team => (
                                        <option key={team.id} value={team.id}>
                                          {team.club_name} {team.team_name} ({team.category})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </>
                              ) : (
                                <div className="team-match-result no-match">
                                  <AlertCircle size={14} className="icon-error" />
                                  <span>Kein Team gefunden</span>
                                  <select
                                    className="team-select-dropdown"
                                    value={mm.selectedHomeTeamId || ''}
                                    onChange={(e) => handleMatchTeamSelection(idx, 'home', e.target.value || null)}
                                  >
                                    <option value="">-- Team manuell auswählen --</option>
                                    {allTeams.map(team => (
                                      <option key={team.id} value={team.id}>
                                        {team.club_name} {team.team_name} ({team.category})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="match-vs">vs</div>
                          
                          {/* Away Team */}
                          <div className="match-team-selection">
                            <div className="team-selection-label">
                              <span>Gast:</span>
                              <span className="scraped-team-name">{match.away_team}</span>
                            </div>
                            <div className="team-selection-matches">
                              {mm.awayTeamMatches.bestMatch ? (
                                <>
                                  <div className={`team-match-result ${awayConfidence}`}>
                                    <div className="team-match-header">
                                      {awayConfidence === 'high' && <CheckCircle size={14} className="icon-success" />}
                                      {awayConfidence === 'medium' && <AlertTriangle size={14} className="icon-warning" />}
                                      {awayConfidence === 'low' && <AlertCircle size={14} className="icon-error" />}
                                      <span>
                                        {mm.awayTeamMatches.bestMatch.team.club_name} {mm.awayTeamMatches.bestMatch.team.team_name}
                                      </span>
                                      <span className="match-score">({Math.round(mm.awayTeamMatches.bestMatch.score * 100)}%)</span>
                                    </div>
                                  </div>
                                  
                                  <select
                                    className="team-select-dropdown"
                                    value={mm.selectedAwayTeamId === '__all__' ? '' : (mm.selectedAwayTeamId || '')}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '__all__') {
                                        handleMatchTeamSelection(idx, 'away', '__all__');
                                      } else {
                                        handleMatchTeamSelection(idx, 'away', value || null);
                                      }
                                    }}
                                  >
                                    <option value="">-- Team auswählen --</option>
                                    {mm.awayTeamMatches.matches.map((tm, tmIdx) => (
                                      <option key={tmIdx} value={tm.team.id}>
                                        {tm.team.club_name} {tm.team.team_name} ({tm.team.category}) - {Math.round(tm.score * 100)}%
                                      </option>
                                    ))}
                                    <option value="__all__">-- Alle Teams anzeigen --</option>
                                  </select>
                                  
                                  {mm.selectedAwayTeamId === '__all__' && (
                                    <select
                                      className="team-select-dropdown"
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleMatchTeamSelection(idx, 'away', e.target.value);
                                        }
                                      }}
                                    >
                                      <option value="">-- Team auswählen --</option>
                                      {allTeams.map(team => (
                                        <option key={team.id} value={team.id}>
                                          {team.club_name} {team.team_name} ({team.category})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </>
                              ) : (
                                <div className="team-match-result no-match">
                                  <AlertCircle size={14} className="icon-error" />
                                  <span>Kein Team gefunden</span>
                                  <select
                                    className="team-select-dropdown"
                                    value={mm.selectedAwayTeamId || ''}
                                    onChange={(e) => handleMatchTeamSelection(idx, 'away', e.target.value || null)}
                                  >
                                    <option value="">-- Team manuell auswählen --</option>
                                    {allTeams.map(team => (
                                      <option key={team.id} value={team.id}>
                                        {team.club_name} {team.team_name} ({team.category})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Vorschau */}
          <div className="import-section">
            <h3 className="section-title">
              <Calendar size={18} />
              Import-Vorschau
            </h3>
            
            <div className="preview-stats">
              <div className="stat-card">
                <div className="stat-value">{scrapedData.players?.length || 0}</div>
                <div className="stat-label">Spieler</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{scrapedData.matches?.length || 0}</div>
                <div className="stat-label">Spieltermine</div>
              </div>
            </div>
            
            {scrapedData.players && scrapedData.players.length > 0 && (
              <div className="preview-list">
                <h4>Spieler ({scrapedData.players.length}):</h4>
                <div className="player-list">
                  {scrapedData.players.slice(0, 10).map((p, i) => (
                    <div key={i} className="player-item">
                      <span className="player-position">{p.position}.</span>
                      <span className="player-name">{p.name}</span>
                      {p.lk && <span className="player-lk">LK {p.lk}</span>}
                    </div>
                  ))}
                  {scrapedData.players.length > 10 && (
                    <div className="player-item-more">
                      ... und {scrapedData.players.length - 10} weitere
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Import-Button */}
          <div className="import-actions">
            {isImporting && (
              <div className="import-progress">
                <Loader className="spinner" size={16} />
                <span>{importProgress.message}</span>
                {importProgress.total > 0 && (
                  <span className="progress-count">
                    {importProgress.current} / {importProgress.total}
                  </span>
                )}
              </div>
            )}
            
            <button
              className="btn-primary btn-import"
              onClick={handleImport}
              disabled={isImporting || !selectedClubId || !selectedTeamId}
            >
              {isImporting ? (
                <>
                  <Loader className="spinner" size={16} />
                  Importiere...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Import starten
                </>
              )}
            </button>
          </div>
          
          {/* Import-Ergebnis */}
          {importResult && (
            <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
              <h4>Import-Ergebnis:</h4>
              <ul>
                <li>✅ {importResult.players} Spieler importiert</li>
                <li>
                  ✅ Matches verarbeitet: {importResult.newMatchdays || 0} neue Matchdays · {importResult.updatedScores || 0} aktualisierte Scores · {importResult.skippedMatches || 0} übersprungen
                </li>
                {importResult.errors && importResult.errors.length > 0 && (
                  <li className="errors">
                    ⚠️ {importResult.errors.length} Fehler:
                    <ul>
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
      
      {/* Create Club Modal */}
      {showCreateClubModal && (
        <div className="modal-overlay" onClick={() => setShowCreateClubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neuen Verein erstellen</h3>
            <div className="modal-form">
              <label>
                Name: *
                <input
                  type="text"
                  value={newClubData.name}
                  onChange={(e) => setNewClubData({ ...newClubData, name: e.target.value })}
                />
              </label>
              <label>
                Stadt: *
                <input
                  type="text"
                  value={newClubData.city}
                  onChange={(e) => setNewClubData({ ...newClubData, city: e.target.value })}
                />
              </label>
              <label>
                Website:
                <input
                  type="url"
                  value={newClubData.website}
                  onChange={(e) => setNewClubData({ ...newClubData, website: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateClubModal(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleCreateClub}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neues Team erstellen</h3>
            <div className="modal-form">
              <label>
                Team-Name: *
                <input
                  type="text"
                  value={newTeamData.team_name}
                  onChange={(e) => setNewTeamData({ ...newTeamData, team_name: e.target.value })}
                />
              </label>
              <label>
                Kategorie: *
                <input
                  type="text"
                  value={newTeamData.category}
                  onChange={(e) => setNewTeamData({ ...newTeamData, category: e.target.value })}
                  placeholder="z.B. Herren 40"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateTeamModal(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleCreateTeam}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPortraitImportTab;

