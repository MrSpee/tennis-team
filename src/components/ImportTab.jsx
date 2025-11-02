import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import MatchdayImportService from '../services/matchdayImportService';
import './ImportTab.css';

const ImportTab = () => {
  const { player } = useAuth();
  
  // State Management
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [matchingReview, setMatchingReview] = useState(null); // NEU: Review-Ergebnisse vom Fuzzy Matching
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerMatchResults, setPlayerMatchResults] = useState([]); // Fuzzy matching results
  const [clubSuggestions, setClubSuggestions] = useState(null); // Für Club-Matching Modal
  const [pendingTeamInfo, setPendingTeamInfo] = useState(null); // Wartet auf Club-Bestätigung
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [showReview, setShowReview] = useState(false); // NEU: Review-Panel anzeigen
  const [editablePlayers, setEditablePlayers] = useState([]); // NEU: Editierbare Spieler-Daten
  const [editableMatches, setEditableMatches] = useState([]); // NEU: Editierbare Match-Daten (für Datum-Fix)
  const [allClubs, setAllClubs] = useState([]); // NEU: Alle Vereine für Dropdown
  const [allTeamsForPlayers, setAllTeamsForPlayers] = useState([]); // NEU: Alle Teams für Spieler-Dropdown
  
  // Team auswählen (später aus Context/Props)
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]); // Alle Teams für manuelle Auswahl (für Matches)
  const [manualTeamId, setManualTeamId] = useState(null); // Manuell ausgewähltes Team für Spieler-Import

  // Lade Teams beim Mount
  useEffect(() => {
    loadUserTeams();
    loadAllClubs(); // NEU: Lade alle Vereine für Spieler-Zuordnung
    loadAllTeamsList(); // NEU: Lade alle Teams
  }, [player]);

  // NEU: Lade alle Vereine für Spieler-Zuordnung
  const loadAllClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('club_info')
        .select('id, name, city')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setAllClubs(data || []);
    } catch (err) {
      console.error('Error loading clubs:', err);
    }
  };

  // NEU: Lade alle Teams für Spieler-Zuordnung
  const loadAllTeamsList = async () => {
    try {
      const { data, error } = await supabase
        .from('team_info')
        .select('id, club_name, team_name, category')
        .order('club_name', { ascending: true });
      
      if (error) throw error;
      setAllTeamsForPlayers(data || []);
      // Auch für allTeams setzen (wird noch verwendet)
      setAllTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  const loadUserTeams = async () => {
    if (!player?.id) return;

    try {
      // Lade User-Teams
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          team_id,
          is_primary,
          team_info (
            id,
            team_name,
            club_name,
            category
          )
        `)
        .eq('player_id', player.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      
      const formattedTeams = data.map(pt => ({
        id: pt.team_info.id,
        name: `${pt.team_info.club_name} ${pt.team_info.team_name || ''} (${pt.team_info.category})`,
        isPrimary: pt.is_primary
      }));

      setTeams(formattedTeams);
      
      // Setze Primary Team als Default
      const primaryTeam = formattedTeams.find(t => t.isPrimary);
      if (primaryTeam) {
        setSelectedTeamId(primaryTeam.id);
      }

      // Lade ALLE Teams (für manuelle Auswahl beim Spieler-Import)
      const { data: allTeamsData, error: allTeamsError } = await supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .order('club_name', { ascending: true });

      if (allTeamsError) throw allTeamsError;

      const formattedAllTeams = allTeamsData.map(t => ({
        id: t.id,
        name: `${t.club_name} ${t.team_name || ''} (${t.category})`,
        club_name: t.club_name,
        team_name: t.team_name,
        category: t.category
      }));

      setAllTeams(formattedAllTeams);

    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  /**
   * OpenAI API aufrufen zum Parsen
   */
  const handleParseMatches = async () => {
    if (!inputText.trim()) {
      setError('Bitte gib Text ein oder füge eine URL ein.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParsedData(null);
    setSuccessMessage(null);

    try {
      console.log('🔄 Calling parse API...');
      
      // API-Aufruf an Vercel Function (kein teamId nötig - KI erkennt es!)
      const response = await fetch('/api/import/parse-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          userEmail: player?.email
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Parsen');
      }

      console.log('✅ Parsing successful:', result);

      // Setze geparste Daten
      const parsed = result.data || result;
      setParsedData(parsed);
      
      // NEU: Führe Fuzzy Matching für Club, Team, League durch
      console.log('🔍 Performing entity fuzzy-matching...');
      try {
        const review = await MatchdayImportService.analyzeParsedData(parsed);
        setMatchingReview(review);
        console.log('✅ Matching review:', review);
        
        // Merge Review-Ergebnisse zurück in parsedData (für späteren Import)
        if (review.club?.matched) {
          parsed.team_info = parsed.team_info || {};
          parsed.team_info.matched_club_id = review.club.matched.id;
          parsed.team_info.matched_club_name = review.club.matched.name;
        }
        
        if (review.team?.matched) {
          parsed.team_info.matched_team_id = review.team.matched.id;
          parsed.team_info.matched_team_name = review.team.matched.team_name || review.team.matched.name;
        }
        
        if (review.league) {
          parsed.team_info.matched_league = review.league.normalized;
          parsed.team_info.matched_group = review.league.group;
        }
        
        // Zeige Review-Panel wenn etwas überprüft werden muss
        const needsReview = review.club?.needsReview || review.team?.needsReview || 
                           review.league?.needsReview ||
                           review.matches?.some(m => m.needsReview);
        
        if (needsReview) {
          setShowReview(true);
        }
      } catch (reviewError) {
        console.warn('⚠️ Review-Matching fehlgeschlagen (weiterhin nutzbar):', reviewError);
        // Fehler ist nicht kritisch - User kann trotzdem importieren
      }
      
      // Auto-Select: Alle Matches
      if (parsed.matches?.length > 0) {
        setSelectedMatches(parsed.matches.map((_, idx) => idx));
      }
      
      // Spieler: Fuzzy-Matching durchführen
      if (parsed.players?.length > 0) {
        console.log('🔍 Performing player fuzzy-matching...');
        const matchResults = await performPlayerMatching(parsed.players);
        setPlayerMatchResults(matchResults);
        
        // NEU: Initialisiere editierbare Spieler-Daten mit geparsten Werten
        const editableData = parsed.players.map((player, idx) => {
          // Versuche Verein-ID zu finden
          let clubId = parsed.team_info?.matched_club_id || null;
          let clubName = parsed.team_info?.club_name || parsed.team_info?.matched_club_name || '';
          
          // Wenn club_name vorhanden aber keine ID, suche Verein
          if (!clubId && clubName) {
            const foundClub = allClubs.find(c => 
              c.name.toLowerCase() === clubName.toLowerCase()
            );
            if (foundClub) {
              clubId = foundClub.id;
              clubName = foundClub.name;
            }
          }
          
          // Versuche Team-ID zu finden
          let teamId = parsed.team_info?.matched_team_id || null;
          
          // Wenn Verein gefunden, aber kein Team, suche passendes Team
          if (clubId && !teamId && parsed.team_info?.category) {
            const foundTeam = allTeamsForPlayers.find(t => 
              (t.club_name.toLowerCase() === clubName.toLowerCase() || 
               (t.club_name && clubName && t.club_name.includes(clubName.split(' ')[0]))) &&
              t.category === parsed.team_info.category
            );
            if (foundTeam) {
              teamId = foundTeam.id;
            }
          }
          
          return {
            index: idx,
            name: player.name || '',
            lk: player.lk || '',
            tvm_id_number: player.id_number || '',
            club_id: clubId,
            club_name: clubName,
            team_id: teamId,
            category: parsed.team_info?.category || '',
            is_captain: player.is_captain || false,
            isValid: false // Wird durch Validierung gesetzt
          };
        });
        
        setEditablePlayers(editableData);
        
        // Nur NEUE Spieler standardmäßig auswählen (aber nur wenn alle Daten vollständig sind)
        const newPlayerIndices = matchResults
          .map((r, idx) => {
            if (r.status === 'new') {
              const editable = editableData[idx];
              // Prüfe ob alle Pflichtfelder vorhanden sind
              if (editable.lk && editable.tvm_id_number && editable.club_name) {
                return idx;
              }
            }
            return null;
          })
          .filter(idx => idx !== null);
        setSelectedPlayers(newPlayerIndices);
      }
      
      // Erfolgs-Nachricht (zeigt alles was erkannt wurde)
      let successMsg = '🎉 KI-Analyse erfolgreich!\n\n';
      if (result.data.team_info) {
        successMsg += `🎾 Team: ${result.data.team_info.club_name}`;
        if (result.data.team_info.team_name) successMsg += ` - ${result.data.team_info.team_name}`;
        successMsg += '\n';
      }
      if (result.data.matches?.length > 0) {
        successMsg += `📅 ${result.data.matches.length} Match(es) erkannt\n`;
      }
      if (result.data.players?.length > 0) {
        successMsg += `👥 ${result.data.players.length} Spieler erkannt\n`;
      }
      setSuccessMessage(successMsg);

    } catch (err) {
      console.error('❌ Parse error:', err);
      setError(err.message || 'Fehler beim Parsen der Daten');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Matches in Supabase importieren
   */
  const handleImportMatches = async () => {
    if (!parsedData || selectedMatches.length === 0) {
      setError('Keine Matches zum Importieren ausgewählt.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Nutze editableMatches falls vorhanden (für Datum-Fixes)
      const matchesToImport = selectedMatches.map(idx => {
        const originalMatch = parsedData.matches[idx];
        const editedMatch = editableMatches[idx];
        
        // Merge: Wenn editiert, nutze editierte Werte
        return {
          ...originalMatch,
          match_date: editedMatch?.match_date || originalMatch.match_date,
          start_time: editedMatch?.start_time || originalMatch.start_time
        };
      });
      
      console.log('💾 Importing matches to Supabase (mit editierten Daten):', matchesToImport);
      
      // SCHRITT 1: Finde oder erstelle das Team (inkl. Season)
      // Nutze matched_club_id/matched_team_id aus Review falls vorhanden
      let teamId = null;
      
      if (parsedData.team_info?.matched_team_id) {
        // Review hat bereits ein Team gefunden
        teamId = parsedData.team_info.matched_team_id;
        console.log('✅ Using reviewed team_id:', teamId);
      } else {
        // Alte Logik: findOrCreateTeam
        teamId = await findOrCreateTeam(parsedData.team_info, parsedData.season);
        console.log('🎯 Using team_id (new/found):', teamId);
      }

      // SCHRITT 2: Prüfe auf Duplikate
      const duplicateCheck = await checkForDuplicates(matchesToImport, teamId);
      
      if (duplicateCheck.duplicates.length > 0) {
        const confirmImport = window.confirm(
          `⚠️ ${duplicateCheck.duplicates.length} Matchday(s) existieren bereits:\n\n` +
          duplicateCheck.duplicates.map(d => `${d.match_date}`).join('\n') +
          '\n\nTrotzdem importieren? (Duplikate werden übersprungen)'
        );
        
        if (!confirmImport) {
          setIsProcessing(false);
          return;
        }
      }

      // Filtere Duplikate raus
      const uniqueMatches = matchesToImport.filter((match, idx) => {
        return !duplicateCheck.duplicates.some(d => 
          d.match_date === match.match_date
        );
      });

      if (uniqueMatches.length === 0) {
        setError('Alle ausgewählten Matches existieren bereits.');
        setIsProcessing(false);
        return;
      }

      // SCHRITT 3: Hole unser Team für home_team_id (NUR existierende Felder!)
      const { data: ourTeamData, error: teamError } = await supabase
        .from('team_info')
        .select('id, club_name, team_name, category')
        .eq('id', teamId)
        .single();

      if (teamError || !ourTeamData) {
        throw new Error('Unser Team wurde nicht gefunden');
      }

      // Hole league und group_name aus team_seasons (falls vorhanden)
      const { data: seasonData } = await supabase
        .from('team_seasons')
        .select('league, group_name')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .maybeSingle();

      // Merge season data falls vorhanden
      if (seasonData) {
        ourTeamData.league = seasonData.league;
        ourTeamData.group_name = seasonData.group_name;
      }

      // SCHRITT 4: Finde oder erstelle Gegner-Teams und erstelle matchdays
      const matchdaysToCreate = [];
      
      // Helper: Finde oder erstelle Team (mit Fuzzy Matching)
      const findOrCreateTeamByName = async (teamName) => {
        // Parse Team-Name (z.B. "SV RG Sürth 1" → club: "SV RG Sürth", team: "1")
        const parts = teamName.split(' ');
        const clubName = parts.slice(0, -1).join(' ') || teamName;
        const tn = parts[parts.length - 1] || null;
        
        // NEU: Versuche Fuzzy Matching für Club
        try {
          const clubMatch = await MatchdayImportService.matchClub(clubName);
          let clubId = null;
          
          if (clubMatch.match) {
            clubId = clubMatch.match.id;
            console.log('✅ Club gefunden via Fuzzy Matching:', clubMatch.match.name);
          } else {
            // Club nicht gefunden → erstelle ihn
            console.warn(`⚠️ Club "${clubName}" nicht gefunden. Erstelle automatisch...`);
            const { data: newClub, error: clubError } = await supabase
              .from('club_info')
              .insert({
                name: clubName,
                city: null,
                region: 'Mittelrhein'
              })
              .select('id')
              .single();
            
            if (!clubError && newClub) {
              clubId = newClub.id;
              console.log(`✅ Club erstellt: ${clubName} (ID: ${clubId})`);
            }
          }
          
          // NEU: Versuche Fuzzy Matching für Team (wenn Club gefunden)
          if (clubId && tn) {
            const teamMatch = await MatchdayImportService.matchTeam(
              tn,
              clubId,
              ourTeamData.category || null,
              { rawClubName: clubName }
            );
            
            if (teamMatch.match) {
              console.log('✅ Team gefunden via Fuzzy Matching:', teamMatch.match.team_name);
              return teamMatch.match.id;
            }
          }
          
          // Team nicht gefunden → erstelle automatisch
          console.warn(`⚠️ Team "${teamName}" nicht gefunden. Erstelle automatisch...`);
          
          const { data: newTeam, error: createError } = await supabase
            .from('team_info')
            .insert({
              club_name: clubName,
              club_id: clubId, // NEU: Link zu Club falls vorhanden
              team_name: tn,
              category: ourTeamData.category || null
            })
            .select('id')
            .single();
          
          if (createError || !newTeam) {
            throw new Error(`Team "${teamName}" konnte nicht erstellt werden: ${createError?.message}`);
          }
          
          console.log(`✅ Team erstellt: ${clubName} ${tn} (ID: ${newTeam.id})`);
          return newTeam.id;
          
        } catch (matchError) {
          console.warn('⚠️ Fuzzy Matching fehlgeschlagen, verwende einfache Suche:', matchError);
          
          // Fallback: Einfache Suche
          let { data: teamData } = await supabase
            .from('team_info')
            .select('id')
            .or(`team_name.ilike.%${tn}%,club_name.ilike.%${clubName}%`)
            .limit(1)
            .maybeSingle();
          
          if (teamData) return teamData.id;
          
          // Erstelle neu
          const { data: newTeam, error: createError } = await supabase
            .from('team_info')
            .insert({
              club_name: clubName,
              team_name: tn,
              category: ourTeamData.category || null
            })
            .select('id')
            .single();
          
          if (createError || !newTeam) {
            throw new Error(`Team "${teamName}" konnte nicht erstellt werden: ${createError?.message}`);
          }
          
          return newTeam.id;
        }
      };
      
      for (const match of uniqueMatches) {
        // WICHTIG: Extrahiere beide Teams aus dem geparsten Match!
        const homeTeamName = match.home_team;
        const awayTeamName = match.away_team;
        
        if (!homeTeamName || !awayTeamName) {
          console.error('❌ Match fehlt home_team oder away_team:', match);
          continue;
        }
        
        console.log('🔍 Parsing match:', { home: homeTeamName, away: awayTeamName });
        
        // Finde oder erstelle BEIDE Teams
        const homeTeamId = await findOrCreateTeamByName(homeTeamName);
        const awayTeamId = await findOrCreateTeamByName(awayTeamName);
        
        console.log('✅ Teams resolved:', { home: homeTeamId, away: awayTeamId });

        // Parse Datum und Zeit
        const matchDateTime = new Date(match.match_date);
        const startTime = match.start_time || matchDateTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        
        // Parse Score (z.B. "1:5" → home_score=1, away_score=5)
        let homeScore = 0;
        let awayScore = 0;
        if (match.match_points && match.match_points.includes(':')) {
          const [h, a] = match.match_points.split(':').map(s => parseInt(s.trim()) || 0);
          homeScore = h;
          awayScore = a;
        }

        // Bestimme Season basierend auf Match-Datum
        const matchMonth = matchDateTime.getMonth();
        let determinedSeason = 'summer';
        if (matchMonth >= 8 || matchMonth <= 1) {
          determinedSeason = 'winter';
        } else {
          determinedSeason = 'summer';
        }
        
        // NEU: Verwende manuell bearbeitete Season und Year aus UI
        const finalSeason = parsedData.season || determinedSeason;
        const finalYear = parsedData.year || null;
        
        matchdaysToCreate.push({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: matchDateTime.toISOString(),
          start_time: startTime.substring(0, 5), // "15:00"
          venue: match.venue || null,
          location: 'Home', // Default (könnte später verbessert werden)
          season: finalSeason, // Manuell bearbeitet oder automatisch
          year: finalYear, // NEU: Jahr für die Saison
          league: parsedData.league || ourTeamData.league || null,
          group_name: parsedData.group_name || ourTeamData.group_name || null,
          status: match.status === 'offen' ? 'scheduled' : 'completed',
          home_score: homeScore,
          away_score: awayScore,
          final_score: match.match_points || null
        });
      }

      console.log('📝 Creating matchdays:', matchdaysToCreate);

      // Insert in Supabase
      const { data, error: insertError } = await supabase
        .from('matchdays')
        .insert(matchdaysToCreate)
        .select();

      if (insertError) throw insertError;

      console.log('✅ Import successful:', data);

      // Log KI-Match Import Aktivität
      try {
        for (const matchday of data) {
          await LoggingService.logActivity('ki_import_match', 'matchday', matchday.id, {
            match_date: matchday.match_date,
            home_team_id: matchday.home_team_id,
            away_team_id: matchday.away_team_id,
            location: matchday.location,
            venue: matchday.venue,
            season: matchday.season,
            status: matchday.status,
            import_source: 'tvm_import'
          });
        }
      } catch (logError) {
        console.warn('⚠️ Logging failed (non-critical):', logError);
      }

      // Stats
      setImportStats({
        total: matchesToImport.length,
        imported: uniqueMatches.length,
        duplicates: duplicateCheck.duplicates.length,
        cost: parsedData.metadata.cost_estimate
      });

      setSuccessMessage(
        `🎉 Import erfolgreich!\n\n` +
        `✅ ${uniqueMatches.length} neue Matchday(s) importiert\n` +
        `⏭️ ${duplicateCheck.duplicates.length} Duplikat(e) übersprungen\n` +
        `💰 Kosten: ${parsedData.metadata.cost_estimate}`
      );

      // Reset
      setInputText('');
      setParsedData(null);
      setSelectedMatches([]);

    } catch (err) {
      console.error('❌ Import error:', err);
      setError(err.message || 'Fehler beim Importieren der Matches');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Finde oder erstelle Team in Supabase
   */
  const findOrCreateTeam = async (teamInfo, season) => {
    if (!teamInfo) {
      throw new Error('Team-Informationen fehlen. KI konnte kein Team erkennen.');
    }

    try {
      console.log('🔍 Searching for team:', teamInfo.club_name, teamInfo.team_name);
      
      // SCHRITT 1: Suche existierendes Team in team_info
      const { data: existingTeam, error: searchError } = await supabase
        .from('team_info')
        .select('id')
        .eq('club_name', teamInfo.club_name)
        .eq('team_name', teamInfo.team_name || null)
        .eq('category', teamInfo.category || 'Herren')
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      let teamId;

      if (existingTeam) {
        console.log('✅ Team found in team_info:', existingTeam.id);
        teamId = existingTeam.id;
      } else {
        // SCHRITT 2: Team existiert nicht → Finde/Erstelle Verein zuerst!
        console.log('⚠️ Team not found, finding/creating club first...');
        
        // 2a. SMART CLUB MATCHING mit Fuzzy-Search
        let clubId = await findOrSuggestClub(teamInfo.club_name, season);
        
        if (!clubId) {
          throw new Error('Club-Matching abgebrochen oder fehlgeschlagen.');
        }

        // 2b. Wenn CREATE_NEW → Erstelle neuen Verein
        if (clubId === 'CREATE_NEW') {
          console.log('➕ Creating new club:', teamInfo.club_name);
          
          const { data: newClub, error: clubError } = await supabase
            .from('club_info')
            .insert({
              name: teamInfo.club_name,
              city: null,
              region: 'Mittelrhein',
              website: teamInfo.website || null
            })
            .select('id')
            .single();
          
          if (clubError) throw clubError;
          clubId = newClub.id;
          console.log('✅ New club created:', clubId);
        }

        // 2c. Jetzt Team erstellen mit club_id
        console.log('📝 Creating team with club_id:', clubId);
        
        const { data: newTeam, error: insertError } = await supabase
          .from('team_info')
          .insert({
            club_name: teamInfo.club_name,
            team_name: teamInfo.team_name || null,
            category: teamInfo.category || 'Herren',
            region: 'Mittelrhein',
            tvm_link: teamInfo.website || null
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        console.log('✅ Team created in team_info:', newTeam.id);
        teamId = newTeam.id;
      }

      // SCHRITT 3: Prüfe/Erstelle team_seasons Eintrag
      const currentSeason = season || 'Winter 2025/26';
      
      const { data: existingSeason, error: seasonSearchError } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', teamId)
        .eq('season', currentSeason)
        .maybeSingle();

      if (seasonSearchError && seasonSearchError.code !== 'PGRST116') {
        console.warn('⚠️ Error checking season:', seasonSearchError);
      }

      if (!existingSeason) {
        console.log('📅 Creating team_seasons entry...');
        
        // Extrahiere Liga aus teamInfo.league (z.B. "Herren 50 2. Bezirksliga Gr. 054")
        const leagueMatch = teamInfo.league?.match(/(\d+\.\s*\w+)/);
        const league = leagueMatch ? leagueMatch[1] : null;
        
        // Extrahiere Gruppe (z.B. "Gr. 054")
        const groupMatch = teamInfo.league?.match(/Gr\.\s*(\d+)/);
        const groupName = groupMatch ? `Gr. ${groupMatch[1]}` : null;

        const { error: seasonInsertError } = await supabase
          .from('team_seasons')
          .insert({
            team_id: teamId,
            season: currentSeason,
            league: league || '2. Bezirksliga',
            group_name: groupName,
            team_size: 4, // Default für 4er-Teams
            is_active: true
          });

        if (seasonInsertError) {
          console.warn('⚠️ Could not create season:', seasonInsertError);
        } else {
          console.log('✅ team_seasons created');
        }
      }

      return teamId;

    } catch (err) {
      console.error('❌ Error finding/creating team:', err);
      throw new Error('Fehler beim Finden/Erstellen des Teams: ' + err.message);
    }
  };

  /**
   * Prüfe auf Duplikate in der Datenbank
   */
  const checkForDuplicates = async (matches, teamId) => {
    try {
      // Hole unser Team
      const { data: ourTeamData } = await supabase
        .from('team_info')
        .select('id')
        .eq('id', teamId)
        .single();

      // Prüfe auf vorhandene matchdays für unser Team
      const { data: existingMatchdays, error } = await supabase
        .from('matchdays')
        .select('match_date, home_team_id, away_team_id')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
        
      if (error) throw error;

      // Prüfe auf Duplikate basierend auf Datum (nur Tag)
      const duplicates = (existingMatchdays || []).filter(dbMatchday => {
        const dbDate = new Date(dbMatchday.match_date).toISOString().split('T')[0];
        return matches.some(m => {
          const matchDate = new Date(m.match_date).toISOString().split('T')[0];
          return matchDate === dbDate;
        });
      });

      return {
        duplicates: duplicates.map(d => ({ 
          match_date: d.match_date.split('T')[0], 
          opponent: 'Gegner' // Kann nicht mehr opponent sein, nur Datum
        })),
        unique: matches.filter(m => 
          !duplicates.some(d => {
            const dDate = new Date(d.match_date).toISOString().split('T')[0];
            const mDate = new Date(m.match_date).toISOString().split('T')[0];
            return dDate === mDate;
          })
        )
      };
    } catch (err) {
      console.error('Error checking duplicates:', err);
      return { duplicates: [], unique: matches };
    }
  };

  /**
   * Toggle Match-Auswahl
   */
  const toggleMatchSelection = (index) => {
    setSelectedMatches(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  /**
   * Spieler-Import mit Fuzzy-Matching
   */
  const handleImportPlayers = async () => {
    if (!parsedData?.players || selectedPlayers.length === 0) {
      setError('Keine Spieler zum Importieren ausgewählt.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // SCHRITT 1: Validierung - Prüfe ob alle ausgewählten Spieler vollständig sind
      const incompletePlayers = selectedPlayers.filter(idx => {
        const editable = editablePlayers[idx];
        return !editable || !editable.name || !editable.lk || !editable.tvm_id_number || 
               !editable.club_id || !editable.team_id;
      });
      
      if (incompletePlayers.length > 0) {
        setError(`❌ ${incompletePlayers.length} Spieler haben unvollständige Daten. Bitte fülle alle Pflichtfelder (Verein, Team, LK, TVM ID) aus.`);
        setIsProcessing(false);
        return;
      }

      // SCHRITT 3: Für jeden ausgewählten Spieler
      const playersToImport = selectedPlayers.map(idx => {
        const editable = editablePlayers[idx];
        const originalPlayer = parsedData.players[idx];
        return {
          ...originalPlayer,
          name: editable.name,
          lk: editable.lk,
          id_number: editable.tvm_id_number,
          club_id: editable.club_id,
          team_id: editable.team_id,
          club_name: editable.club_name,
          category: editable.category,
          matchResult: playerMatchResults[idx]
        };
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const playerData of playersToImport) {
        const matchResult = playerData.matchResult;
        
        // VALIDIERUNG: Prüfe Pflichtfelder
        if (!playerData.name || !playerData.lk || !playerData.id_number || !playerData.club_id || !playerData.team_id) {
          console.warn('⚠️ Spieler übersprungen - unvollständige Daten:', playerData.name);
          skipped++;
          continue;
        }

        // FALL 1: Existierender Spieler (exakte Übereinstimmung)
        if (matchResult?.status === 'exact' && matchResult.playerId) {
          console.log('✅ Updating existing player:', playerData.name);
          
          // Update LK und TVM ID (falls geändert oder fehlend)
          const updateFields = {};
          
          if (playerData.lk) {
            updateFields.current_lk = playerData.lk;
            updateFields.last_lk_update = new Date().toISOString();
          }
          
          if (playerData.id_number) {
            updateFields.tvm_id_number = playerData.id_number;
          }
          
          if (Object.keys(updateFields).length > 0) {
            const { error: updateError } = await supabase
              .from('players_unified')
              .update(updateFields)
              .eq('id', matchResult.playerId);

            if (updateError) {
              console.error('❌ Error updating player:', updateError);
              skipped++;
              continue;
            }
          }
          
          updated++;
          
          // Verknüpfe mit Team (falls noch nicht) - verwende team_id aus editablePlayers
          if (playerData.team_id) {
            await linkPlayerToTeam(matchResult.playerId, playerData.team_id, playerData.is_captain);
          }
          
          continue;
        }

        // FALL 2: Neuer Spieler → players_unified mit status='pending'
        console.log('🆕 Creating imported player:', playerData.name);
        
        // WICHTIG: Verwende team_id aus editablePlayers (nicht aus parsedData!)
        const targetTeamId = playerData.team_id;
        
        if (!targetTeamId) {
          console.error('❌ Spieler ohne Team-ID kann nicht importiert werden:', playerData.name);
          skipped++;
          continue;
        }
        
        const { data: newImportedPlayer, error: insertError } = await supabase
          .from('players_unified')
          .insert({
            name: playerData.name,
            current_lk: playerData.lk, // ⚠️ PFLICHTFELD
            tvm_id_number: playerData.id_number, // ⚠️ PFLICHTFELD
            is_captain: playerData.is_captain || false,
            player_type: 'app_user',
            is_active: false,
            user_id: null,
            status: 'pending', // NEU: Explizit pending setzen
            import_source: 'tvm_import'
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('❌ Error creating imported player:', insertError);
          skipped++;
        } else {
          created++;
          console.log('✅ Imported player created:', playerData.name, 'ID:', newImportedPlayer.id);
          
          // Verknüpfe Spieler mit Team (WICHTIG: Verwende targetTeamId!)
          await linkPlayerToTeam(newImportedPlayer.id, targetTeamId, playerData.is_captain);

          // Log KI-Import Aktivität
          try {
            await LoggingService.logActivity('ki_import_player', 'player', newImportedPlayer.id, {
              player_name: playerData.name,
              player_lk: playerData.lk,
              tvm_id_number: playerData.id_number,
              is_captain: playerData.is_captain,
              team_id: targetTeamId,
              import_source: 'tvm_import'
            });
          } catch (logError) {
            console.warn('⚠️ Logging failed (non-critical):', logError);
          }
        }
      }

      setImportStats({
        total: playersToImport.length,
        created,
        updated,
        skipped
      });

      setSuccessMessage(
        `🎉 Spieler-Import erfolgreich!\n\n` +
        `🆕 ${created} neue Spieler erstellt\n` +
        `🔄 ${updated} Spieler aktualisiert\n` +
        `⏭️ ${skipped} übersprungen`
      );

      // Reset
      setInputText('');
      setParsedData(null);
      setSelectedPlayers([]);
      setPlayerMatchResults([]);
      setEditablePlayers([]);
      setMatchingReview(null);

    } catch (err) {
      console.error('❌ Spieler-Import error:', err);
      setError(err.message || 'Fehler beim Importieren der Spieler');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * SMART CLUB MATCHING: Finde Verein mit Fuzzy-Matching
   * Berücksichtigt Schreibfehler, Abkürzungen, etc.
   */
  const findOrSuggestClub = async (clubName) => {
    try {
      console.log('🔍 Smart Club Matching for:', clubName);
      
      // 1. Exakte Übereinstimmung
      const { data: exactMatch, error: exactError } = await supabase
        .from('club_info')
        .select('id, name, city')
        .eq('name', clubName)
        .maybeSingle();

      if (exactError && exactError.code !== 'PGRST116') {
        throw exactError;
      }

      if (exactMatch) {
        console.log('✅ Exact club match:', exactMatch.name);
        return exactMatch.id;
      }

      // 2. Fuzzy-Matching mit allen Vereinen
      const { data: allClubs, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name, city, region');

      if (clubsError) throw clubsError;

      // Berechne Similarity für alle Clubs
      const matches = allClubs
        .map(club => ({
          ...club,
          similarity: calculateClubSimilarity(clubName, club.name),
          nameMatch: calculateSimilarity(clubName, club.name)
        }))
        .sort((a, b) => b.similarity - a.similarity);

      const bestMatch = matches[0];
      const confidence = Math.round(bestMatch.similarity * 100);

      console.log('🎯 Best match:', bestMatch.name, 'Confidence:', confidence + '%');

      // 3. Hohe Confidence (>95%) → Automatisch verwenden
      if (confidence >= 95) {
        console.log('✅ High confidence match, using automatically');
        return bestMatch.id;
      }

      // 4. Zeige IMMER Modal für User-Bestätigung (egal ob Confidence hoch oder niedrig)
      console.log('⚠️ Asking user to confirm club match...');
      
      // Lade ALLE Clubs für manuelle Auswahl
      const { data: allClubsData, error: allClubsError } = await supabase
        .from('club_info')
        .select('id, name, city, region')
        .order('name', { ascending: true });
      
      if (allClubsError) {
        console.warn('⚠️ Could not load all clubs:', allClubsError);
      }
      
      return new Promise((resolve) => {
        setClubSuggestions({
          searchTerm: clubName,
          suggestions: matches.slice(0, 3),
          allClubs: allClubsData || [], // NEU: Alle Vereine für Dropdown
          onConfirm: (clubId) => {
            setClubSuggestions(null);
            resolve(clubId);
          },
          onCreateNew: () => {
            setClubSuggestions(null);
            resolve('CREATE_NEW');
          },
          onCancel: () => {
            setClubSuggestions(null);
            resolve(null);
          }
        });
      });

    } catch (err) {
      console.error('❌ Error in findOrSuggestClub:', err);
      throw err;
    }
  };

  /**
   * Erweiterte Club-Similarity (berücksichtigt Abkürzungen, etc.)
   */
  const calculateClubSimilarity = (search, clubName) => {
    const s1 = search.toLowerCase().trim();
    const s2 = clubName.toLowerCase().trim();
    
    // Exakte Übereinstimmung
    if (s1 === s2) return 1.0;
    
    // Substring-Match (z.B. "VKC Köln" in "VKC Köln e.V.")
    if (s2.includes(s1) || s1.includes(s2)) return 0.95;
    
    // NEU: Expandiere häufige Abkürzungen
    const expandAbbreviation = (str) => {
      // "rg" → "rot-gelb"
      str = str.replace(/rg\s+/g, 'rot-gelb ');
      // "tc" → "tennis club"
      str = str.replace(/\btc\b/g, 'tennis club');
      // "sv" → "sportverein"
      str = str.replace(/\bsv\b/g, 'sportverein');
      return str;
    };
    
    const expandedS1 = expandAbbreviation(s1);
    const expandedS2 = expandAbbreviation(s2);
    
    // Prüfe ob expandierte Versionen matchen
    if (expandedS2.includes(expandedS1) || expandedS1.includes(expandedS2)) {
      return 0.92;
    }
    
    // Entferne häufige Suffixe
    const cleanS1 = s1.replace(/\s*(e\.?v\.?|tennis|tc|sv|tg|thc|gg)\s*/gi, ' ').trim();
    const cleanS2 = s2.replace(/\s*(e\.?v\.?|tennis|tc|sv|tg|thc|gg)\s*/gi, ' ').trim();
    
    if (cleanS1 === cleanS2) return 0.9;
    
    // NEU: Erkenne "nur Stadt" Übereinstimmungen (z.B. "Sürth" in "SV Rot-Gelb Sürth")
    const cityS1 = s1.split(/\s+/).pop(); // Letztes Wort = vermutlich Stadt
    const cityS2 = s2.split(/\s+/).pop();
    
    if (cityS1 === cityS2 && cityS1.length > 3) {
      // Wenn nur Stadt sich unterscheidet, aber Rest ähnlich ist
      const restS1 = s1.replace(new RegExp(cityS1 + '$', 'i'), '').trim();
      const restS2 = s2.replace(new RegExp(cityS2 + '$', 'i'), '').trim();
      
      if (restS1.length > 0 && restS2.length > 0) {
        const restSimilarity = calculateSimilarity(restS1, restS2);
        if (restSimilarity > 0.7) {
          return 0.85 + (restSimilarity * 0.1); // 0.85-0.95 Range
        }
      }
    }
    
    // Levenshtein Distance
    return calculateSimilarity(s1, s2);
  };

  /**
   * Verknüpfe Spieler mit Team
   */
  const linkPlayerToTeam = async (playerId, teamId, isCaptain) => {
    if (!teamId) {
      console.log('ℹ️ No team provided, skipping team link');
      return;
    }

    try {
      // Prüfe ob Verknüpfung schon existiert (auch inaktive!)
      const { data: existing } = await supabase
        .from('team_memberships')
        .select('id, is_active')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existing) {
        // Wenn Membership existiert aber inaktiv ist → aktiviere sie
        if (!existing.is_active) {
          console.log('🔄 Activating existing but inactive team membership');
          await supabase
            .from('team_memberships')
            .update({
              is_active: true,
              role: isCaptain ? 'captain' : 'player',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          console.log('✅ Team membership activated');
        } else {
          console.log('ℹ️ Player already linked to team (active)');
        }
        return;
      }

      // Prüfe ob Spieler bereits in einem anderen Team ist (für dieses Team)
      // Wenn ja, deaktiviere alte Memberships für dieses Team
      const { data: otherMemberships } = await supabase
        .from('team_memberships')
        .select('id')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .neq('is_active', false); // Alle außer false (true oder null)

      if (otherMemberships && otherMemberships.length > 0) {
        // Deaktiviere alte Memberships für dieses Team (falls mehrere existieren)
        await supabase
          .from('team_memberships')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('player_id', playerId)
          .eq('team_id', teamId)
          .neq('is_active', false);
      }

      // Erstelle neue Verknüpfung
      const { error: insertError } = await supabase
        .from('team_memberships')
        .insert({
          player_id: playerId,
          team_id: teamId,
          role: isCaptain ? 'captain' : 'player',
          is_primary: false,
          season: 'Winter 2025/26',
          is_active: true
        });

      if (insertError) {
        // Wenn Fehler wegen Duplikat (ON CONFLICT) → aktiviere einfach die existierende
        if (insertError.code === '23505') {
          console.log('🔄 Membership exists (conflict), activating...');
          await supabase
            .from('team_memberships')
            .update({
              is_active: true,
              role: isCaptain ? 'captain' : 'player',
              updated_at: new Date().toISOString()
            })
            .eq('player_id', playerId)
            .eq('team_id', teamId);
          console.log('✅ Team membership activated after conflict');
        } else {
          throw insertError;
        }
      } else {
        console.log('✅ Player linked to team (new membership created)');
      }
    } catch (err) {
      console.error('⚠️ Error linking player to team:', err);
    }
  };

  /**
   * Fuzzy-Matching für Spieler (prüft players_unified)
   */
  const performPlayerMatching = async (players) => {
    if (!players || players.length === 0) return [];

    try {
      // Lade ALLE Spieler aus players_unified (inkl. TVM ID)
      const { data: allPlayers, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, tvm_id_number, status, player_type')
        .in('status', ['active', 'pending']);

      if (playersError) throw playersError;

      // Normalisiere LK-Feld
      const existingPlayers = (allPlayers || []).map(p => ({ 
        ...p, 
        lk: p.current_lk, 
        source: p.player_type 
      }));

      // Für jeden importierten Spieler: Fuzzy-Match
      const matchResults = players.map(importPlayer => {
        // PRIORITÄT 1: Exakte Übereinstimmung Name + LK + TVM ID (100% Match)
        if (importPlayer.lk && importPlayer.id_number) {
          const tripleMatch = existingPlayers.find(p => {
            const nameMatch = p.name.toLowerCase() === importPlayer.name.toLowerCase();
            const lkMatch = p.current_lk === importPlayer.lk;
            const tvmMatch = p.tvm_id_number === importPlayer.id_number;
            return nameMatch && lkMatch && tvmMatch;
          });

          if (tripleMatch) {
            return {
              status: 'exact',
              playerId: tripleMatch.id,
              existingName: tripleMatch.name,
              existingLk: tripleMatch.current_lk,
              confidence: 100,
              matchType: 'name_lk_tvm'
            };
          }
        }

        // PRIORITÄT 2: Name + TVM ID (ohne LK)
        if (importPlayer.id_number) {
          const nameTvmMatch = existingPlayers.find(p => {
            const nameMatch = p.name.toLowerCase() === importPlayer.name.toLowerCase();
            const tvmMatch = p.tvm_id_number === importPlayer.id_number;
            return nameMatch && tvmMatch;
          });

          if (nameTvmMatch) {
            return {
              status: 'exact',
              playerId: nameTvmMatch.id,
              existingName: nameTvmMatch.name,
              existingLk: nameTvmMatch.current_lk,
              confidence: 95,
              matchType: 'name_tvm'
            };
          }
        }

        // PRIORITÄT 3: Name + LK (ohne TVM ID)
        if (importPlayer.lk) {
          const nameLkMatch = existingPlayers.find(p => {
            const nameMatch = p.name.toLowerCase() === importPlayer.name.toLowerCase();
            const lkMatch = p.current_lk === importPlayer.lk;
            return nameMatch && lkMatch;
          });

          if (nameLkMatch) {
            return {
              status: 'exact',
              playerId: nameLkMatch.id,
              existingName: nameLkMatch.name,
              existingLk: nameLkMatch.current_lk,
              confidence: 90,
              matchType: 'name_lk'
            };
          }
        }

        // PRIORITÄT 4: Nur TVM ID (falls Name anders geschrieben)
        // WICHTIG: Prüfe auf Duplikate - wenn mehrere Spieler mit gleicher TVM ID, nimm den mit passendem Namen
        if (importPlayer.id_number) {
          const tvmMatches = existingPlayers.filter(p => 
            p.tvm_id_number === importPlayer.id_number
          );

          if (tvmMatches.length === 1) {
            // Exakt ein Match → verwende diesen
            return {
              status: 'exact',
              playerId: tvmMatches[0].id,
              existingName: tvmMatches[0].name,
              existingLk: tvmMatches[0].current_lk,
              confidence: 85,
              matchType: 'tvm_only'
            };
          } else if (tvmMatches.length > 1) {
            // MEHRERE Matches mit gleicher TVM ID → versuche Name-Match
            const nameMatch = tvmMatches.find(p => {
              const similarity = calculateSimilarity(importPlayer.name, p.name);
              return similarity > 0.7; // Mindestens 70% ähnlich
            });

            if (nameMatch) {
              return {
                status: 'exact',
                playerId: nameMatch.id,
                existingName: nameMatch.name,
                existingLk: nameMatch.current_lk,
                confidence: 85,
                matchType: 'tvm_only',
                warning: `⚠️ Mehrere Spieler mit TVM ID ${importPlayer.id_number} gefunden. Verwende: ${nameMatch.name}`
              };
            } else {
              // Kein Name-Match → nimm den ersten (oder neuesten)
              return {
                status: 'exact',
                playerId: tvmMatches[0].id,
                existingName: tvmMatches[0].name,
                existingLk: tvmMatches[0].current_lk,
                confidence: 75,
                matchType: 'tvm_only',
                warning: `⚠️ Mehrere Spieler mit TVM ID ${importPlayer.id_number}. Möglicherweise Duplikat!`
              };
            }
          }
        }

        // PRIORITÄT 5: Exakte Übereinstimmung (nur Name)
        const exactNameMatch = existingPlayers.find(
          p => p.name.toLowerCase() === importPlayer.name.toLowerCase()
        );

        if (exactNameMatch) {
          return {
            status: 'exact',
            playerId: exactNameMatch.id,
            existingName: exactNameMatch.name,
            existingLk: exactNameMatch.current_lk,
            confidence: 80,
            matchType: 'name_only'
          };
        }

        // PRIORITÄT 6: Fuzzy Match (ähnliche Namen)
        const fuzzyMatches = existingPlayers
          .map(p => ({
            player: p,
            similarity: calculateSimilarity(importPlayer.name, p.name)
          }))
          .filter(m => m.similarity > 0.7)
          .sort((a, b) => b.similarity - a.similarity);

        if (fuzzyMatches.length > 0) {
          return {
            status: 'fuzzy',
            playerId: fuzzyMatches[0].player.id,
            existingName: fuzzyMatches[0].player.name,
            existingLk: fuzzyMatches[0].player.current_lk,
            confidence: Math.round(fuzzyMatches[0].similarity * 100),
            alternatives: fuzzyMatches.slice(1, 3),
            matchType: 'fuzzy_name'
          };
        }

        // Kein Match
        return {
          status: 'new',
          playerId: null,
          confidence: 0
        };
      });

      return matchResults;
    } catch (err) {
      console.error('Error performing fuzzy matching:', err);
      return [];
    }
  };

  /**
   * Einfache String-Similarity (Levenshtein Distance)
   */
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    const distance = levenshteinDistance(s1, s2);
    return 1 - (distance / maxLen);
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  /**
   * Beispiel-Text einfügen (für Testing)
   */
  const insertExampleText = () => {
    setInputText(`VKC Köln
Stadt Köln
Alfred Schütte Allee 51
51105 Köln
http://www.vkc-koeln.de

Mannschaftsführer
Kliemt Mathias (-)

Herren 50 2. Bezirksliga Gr. 054
Herren 50 1 (4er)

Meldeliste:
Position	Mannschaft	Name	LK	ID-Nr.	Info	MF	Nation
1	1	Gregor Kaul	6.8	17160158			GER
2	1	Hubertus von Henninges	8.2	17403842			GER
3	1	Gary Meuser	10.4	17104633			GER
4	1	Mathias Kliemt	13.7	17282054		MF	GER
5	2	Michael Kostka	14.6	16902597			GER

Spielplan:
Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
11.10.2025, 18:00	Cologne Sportspark	VKC Köln 1	TG Leverkusen 2	0:0	0:0	0:0	offen
29.11.2025, 18:00	KölnerTHC Stadion RW	KölnerTHC Stadion RW 2	VKC Köln 1	0:0	0:0	0:0	offen
17.01.2026, 18:00	Cologne Sportspark	VKC Köln 1	TPSK 1925 Köln 1	0:0	0:0	0:0	offen`);
  };

  return (
    <div className="import-tab">
      <div className="import-header">
        <h2>🤖 Universeller KI-Import</h2>
        <p>Kopiere TVM-Daten hier rein - die KI erkennt automatisch Matches, Spieler & Teams!</p>
      </div>

      {/* NEU: Review-Panel für Fuzzy Matching */}
      {showReview && matchingReview && (
        <div className="import-section" style={{ 
          background: '#fef3c7', 
          border: '2px solid #f59e0b', 
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
              🔍 Review: Entity-Matching
            </h3>
            <button
              onClick={() => setShowReview(false)}
              style={{
                padding: '0.5rem 1rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              ✕ Schließen
            </button>
          </div>
          
          {/* Club Review */}
          {matchingReview.club && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: 'white', 
              borderRadius: '8px',
              border: `2px solid ${matchingReview.club.needsReview ? '#f59e0b' : '#10b981'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong>🏢 Verein:</strong>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: matchingReview.club.needsReview ? '#fef3c7' : '#dcfce7',
                  color: matchingReview.club.needsReview ? '#92400e' : '#15803d',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {matchingReview.club.matched ? `${matchingReview.club.confidence}% Match` : 'Kein Match'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <strong>Erkannt:</strong> {matchingReview.club.raw}
              </div>
              {matchingReview.club.matched ? (
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>Gefunden:</strong> {matchingReview.club.matched.name}
                  {matchingReview.club.matched.city && ` (${matchingReview.club.matched.city})`}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>
                  ⚠️ Kein passender Verein gefunden. Bitte manuell zuordnen.
                </div>
              )}
              
              {/* Manuelles Verein-Dropdown */}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                  Verein manuell auswählen:
                </label>
                <select
                  value={matchingReview.club.matched?.id || ''}
                  onChange={async (e) => {
                    const clubId = e.target.value;
                    if (!clubId) return;
                    
                    const { data: club } = await supabase
                      .from('club_info')
                      .select('*')
                      .eq('id', clubId)
                      .single();
                    
                    if (club) {
                      const updatedReview = { ...matchingReview };
                      updatedReview.club.matched = club;
                      updatedReview.club.confidence = 100;
                      updatedReview.club.needsReview = false;
                      setMatchingReview(updatedReview);
                      
                      // Update parsedData
                      const newData = { ...parsedData };
                      newData.team_info.matched_club_id = club.id;
                      newData.team_info.matched_club_name = club.name;
                      setParsedData(newData);
                      
                      // Update editablePlayers auch
                      if (editablePlayers.length > 0) {
                        setEditablePlayers(editablePlayers.map(editable => ({
                          ...editable,
                          club_id: club.id,
                          club_name: club.name
                        })));
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="">-- Verein auswählen --</option>
                  {allClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name}{club.city ? ` (${club.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {matchingReview.club.alternatives && matchingReview.club.alternatives.length > 0 && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#6b7280' }}>
                    Alternativen anzeigen ({matchingReview.club.alternatives.length})
                  </summary>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {matchingReview.club.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          // Lade Club-Details
                          const { data: club } = await supabase
                            .from('club_info')
                            .select('*')
                            .eq('id', alt.id)
                            .single();
                          
                          if (club) {
                            const updatedReview = { ...matchingReview };
                            updatedReview.club.matched = club;
                            updatedReview.club.score = alt.score;
                            updatedReview.club.confidence = Math.round(alt.score * 100);
                            updatedReview.club.needsReview = false;
                            setMatchingReview(updatedReview);
                            
                            // Update parsedData
                            const newData = { ...parsedData };
                            newData.team_info.matched_club_id = club.id;
                            newData.team_info.matched_club_name = club.name;
                            setParsedData(newData);
                          }
                        }}
                        style={{
                          padding: '0.5rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        {alt.name} {alt.city ? `(${alt.city})` : ''} - {Math.round(alt.score * 100)}%
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
          
          {/* Team Review */}
          {matchingReview.team && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: 'white', 
              borderRadius: '8px',
              border: `2px solid ${matchingReview.team.needsReview ? '#f59e0b' : '#10b981'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong>🏆 Mannschaft:</strong>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: matchingReview.team.needsReview ? '#fef3c7' : '#dcfce7',
                  color: matchingReview.team.needsReview ? '#92400e' : '#15803d',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {matchingReview.team.matched ? `${matchingReview.team.confidence}% Match` : 'Kein Match'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <strong>Erkannt:</strong> {matchingReview.team.raw}
                {matchingReview.team.category && ` (${matchingReview.team.category})`}
              </div>
              {matchingReview.team.matched ? (
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>Gefunden:</strong> {matchingReview.team.matched.team_name || matchingReview.team.matched.name}
                  {matchingReview.team.matched.club_name && ` - ${matchingReview.team.matched.club_name}`}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>
                  ⚠️ Kein passendes Team gefunden. Bitte manuell auswählen.
                </div>
              )}
              
              {/* Manuelles Team-Dropdown (gefiltert nach Verein) */}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                  Team manuell auswählen:
                </label>
                <select
                  value={matchingReview.team.matched?.id || ''}
                  onChange={async (e) => {
                    const teamId = e.target.value;
                    if (!teamId) return;
                    
                    const { data: team } = await supabase
                      .from('team_info')
                      .select('*')
                      .eq('id', teamId)
                      .single();
                    
                    if (team) {
                      const updatedReview = { ...matchingReview };
                      updatedReview.team.matched = team;
                      updatedReview.team.confidence = 100;
                      updatedReview.team.needsReview = false;
                      setMatchingReview(updatedReview);
                      
                      // Update parsedData
                      const newData = { ...parsedData };
                      newData.team_info.matched_team_id = team.id;
                      newData.team_info.team_name = team.team_name;
                      newData.team_info.category = team.category;
                      setParsedData(newData);
                      
                      // Update editablePlayers auch
                      if (editablePlayers.length > 0) {
                        setEditablePlayers(editablePlayers.map(editable => ({
                          ...editable,
                          team_id: team.id,
                          category: team.category
                        })));
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="">-- Team auswählen --</option>
                  {/* Filtere Teams nach ausgewähltem Verein */}
                  {(() => {
                    const selectedClubId = matchingReview.club?.matched?.id || parsedData?.team_info?.matched_club_id;
                    const filteredTeams = selectedClubId 
                      ? allTeams.filter(t => t.club_id === selectedClubId || t.club_name === matchingReview.club?.matched?.name)
                      : allTeams;
                    
                    return filteredTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.club_name} - {team.team_name} ({team.category})
                      </option>
                    ));
                  })()}
                </select>
                {(!matchingReview.club?.matched && !parsedData?.team_info?.matched_club_id) && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    💡 Bitte zuerst einen Verein auswählen, um Teams zu sehen.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* League Review */}
          {matchingReview.league && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: 'white', 
              borderRadius: '8px',
              border: `2px solid ${matchingReview.league.needsReview ? '#f59e0b' : '#10b981'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong>🏅 Liga:</strong>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: matchingReview.league.needsReview ? '#fef3c7' : '#dcfce7',
                  color: matchingReview.league.needsReview ? '#92400e' : '#15803d',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {matchingReview.league.confidence || 0}% Match
                </span>
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                <strong>Erkannt:</strong> {matchingReview.league.raw}
                {matchingReview.league.group && ` (${matchingReview.league.group})`}
              </div>
              {matchingReview.league.normalized && (
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <strong>Normalisiert:</strong> {matchingReview.league.normalized}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Team-Info wird automatisch erkannt (editierbar) */}
      {parsedData?.team_info && (
        <div className="import-section">
          <div className="team-info-banner">
            <h3>🎾 Erkanntes Team: ✏️</h3>
            <div className="team-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Vereinsname:</label>
                <input 
                  type="text"
                  value={parsedData.team_info.club_name || ''}
                  onChange={(e) => {
                    const newData = { ...parsedData };
                    newData.team_info.club_name = e.target.value;
                    setParsedData(newData);
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Mannschaft:</label>
                <input 
                  type="text"
                  value={parsedData.team_info.team_name || ''}
                  onChange={(e) => {
                    const newData = { ...parsedData };
                    newData.team_info.team_name = e.target.value;
                    setParsedData(newData);
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Kategorie:</label>
                <input 
                  type="text"
                  value={parsedData.team_info.category || ''}
                  onChange={(e) => {
                    const newData = { ...parsedData };
                    newData.team_info.category = e.target.value;
                    setParsedData(newData);
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Saison:</label>
                <select
                  value={parsedData.season || ''}
                  onChange={(e) => {
                    const newData = { ...parsedData };
                    newData.season = e.target.value;
                    setParsedData(newData);
                  }}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">-- Saison wählen --</option>
                  <option value="winter">Winter</option>
                  <option value="summer">Sommer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Jahr:</label>
                <input 
                  type="text"
                  value={parsedData.year || ''}
                  onChange={(e) => {
                    const newData = { ...parsedData };
                    newData.year = e.target.value;
                    setParsedData(newData);
                  }}
                  placeholder="z.B. 2025/26 (Winter) oder 2026 (Sommer)"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              {parsedData.team_info.league && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Liga:</label>
                  <input 
                    type="text"
                    value={parsedData.team_info.league || ''}
                    onChange={(e) => {
                      const newData = { ...parsedData };
                      newData.team_info.league = e.target.value;
                      setParsedData(newData);
                    }}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Text-Eingabe */}
      <div className="import-section">
        <div className="input-header">
          <label htmlFor="match-text">📋 TVM-Meldeliste:</label>
          <button 
            onClick={insertExampleText}
            className="btn-example"
            type="button"
          >
            📝 Beispiel einfügen
          </button>
        </div>
        
        <textarea
          id="match-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Kopiere hier die komplette TVM-Seite (inkl. Team-Info und Spielplan)...

Die KI erkennt automatisch:
✅ Verein & Mannschaft
✅ Alle Spieltage
✅ Spieler (falls Meldeliste dabei)"
          rows={12}
          className="match-input"
        />

        <div className="input-actions">
          <button
            onClick={handleParseMatches}
            disabled={!inputText.trim() || isProcessing}
            className="btn-parse"
          >
            {isProcessing ? '⏳ Verarbeite...' : '🤖 KI analysieren'}
          </button>
          
          <button
            onClick={() => {
              setInputText('');
              setParsedData(null);
              setError(null);
              setSuccessMessage(null);
            }}
            className="btn-clear"
            type="button"
          >
            🗑️ Zurücksetzen
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="message error-message">
          <span className="message-icon">❌</span>
          <div>
            <strong>Fehler:</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && !parsedData && (
        <div className="message success-message">
          <span className="message-icon">✅</span>
          <div>
            <strong>Erfolgreich!</strong>
            <p style={{ whiteSpace: 'pre-line' }}>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Parsed Matches Vorschau */}
      {parsedData && parsedData.matches && parsedData.matches.length > 0 && (
        <div className="import-section">
          <div className="preview-header">
            <h3>🎯 Erkannte Matches ({parsedData.matches.length})</h3>
            <div className="preview-meta">
              {parsedData.season && <span className="meta-badge">📅 {parsedData.season}</span>}
              {parsedData.category && <span className="meta-badge">🎾 {parsedData.category}</span>}
              <span className="meta-badge">💰 {parsedData.metadata.cost_estimate}</span>
            </div>
          </div>

          <div className="matches-preview">
            {parsedData.matches.map((match, idx) => {
              const editable = editableMatches[idx] || {
                match_date: match.match_date || '',
                start_time: match.start_time || ''
              };
              
              // Check if date is invalid
              const isInvalidDate = !editable.match_date || isNaN(new Date(editable.match_date).getTime());
              
              return (
              <div 
                key={idx}
                className={`match-card ${selectedMatches.includes(idx) ? 'selected' : ''}`}
                onClick={() => toggleMatchSelection(idx)}
              >
                <div className="match-checkbox">
                  <input 
                    type="checkbox"
                    checked={selectedMatches.includes(idx)}
                    onChange={() => toggleMatchSelection(idx)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="match-details">
                  <div className="match-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    {/* Datum - mit Inline-Edit bei Invalid Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto' }}>
                      {isInvalidDate ? (
                        <>
                          <span style={{ 
                            color: '#dc2626', 
                            fontWeight: '600', 
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: '#fee2e2',
                            borderRadius: '4px'
                          }}>
                            ⚠️ Datum fehlt
                          </span>
                          <input 
                            type="date"
                            value={editable.match_date || ''}
                            onChange={(e) => {
                              const newEditableMatches = [...editableMatches];
                              newEditableMatches[idx] = {
                                ...editable,
                                match_date: e.target.value
                              };
                              setEditableMatches(newEditableMatches);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.875rem',
                              border: '2px solid #3b82f6',
                              borderRadius: '6px',
                              background: 'white'
                            }}
                          />
                        </>
                      ) : (
                        <span className="match-date">
                          📅 {new Date(editable.match_date).toLocaleDateString('de-DE', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </span>
                      )}
                    </div>
                    
                    {/* Zeit */}
                    {editable.start_time && (
                      <span className="match-time">🕐 {editable.start_time} Uhr</span>
                    )}
                    {match.matchday && (
                      <span className="match-day">🎯 Spieltag {match.matchday}</span>
                    )}
                  </div>
                  
                  <div className="match-opponent">
                    <span className={`home-away-badge ${match.is_home_match ? 'home' : 'away'}`}>
                      {match.is_home_match ? '🏠 Heim' : '✈️ Auswärts'}
                    </span>
                    <strong className="opponent-name">
                      {match.home_team && match.away_team 
                        ? `${match.home_team} vs ${match.away_team}`
                        : match.opponent}
                    </strong>
                  </div>
                  
                  {match.venue && (
                    <div className="match-venue">
                      📍 {match.venue}
                      {match.address && `, ${match.address}`}
                    </div>
                  )}
                  
                  {match.league && (
                    <div className="match-league">
                      🏆 {match.league}
                    </div>
                  )}
                  
                  {match.notes && (
                    <div className="match-notes">
                      💬 {match.notes}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          <div className="import-actions">
            <button
              onClick={handleImportMatches}
              disabled={selectedMatches.length === 0 || isProcessing}
              className="btn-import"
            >
              {isProcessing 
                ? '⏳ Importiere...' 
                : `💾 ${selectedMatches.length} Match(es) importieren`
              }
            </button>
            
            <button
              onClick={() => {
                setParsedData(null);
                setSelectedMatches([]);
              }}
              className="btn-cancel"
              type="button"
            >
              ❌ Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Parsed Players Vorschau */}
      {parsedData && parsedData.players && parsedData.players.length > 0 && (
        <div className="import-section">
          <div className="preview-header">
            <h3>👥 Erkannte Spieler ({parsedData.players.length})</h3>
            <div className="preview-meta">
              {parsedData.season && <span className="meta-badge">📅 {parsedData.season}</span>}
              <span className="meta-badge">💰 {parsedData.metadata.cost_estimate}</span>
            </div>
          </div>

          {/* Info-Box: Pflichtfelder */}
          <div style={{ 
            padding: '1rem', 
            background: '#eff6ff', 
            border: '1px solid #3b82f6', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e40af' }}>
              ℹ️ Wichtig: Pflichtfelder für jeden Spieler
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
              Jeder Spieler benötigt <strong>Verein, Team, LK und TVM ID</strong>. 
              Spieler ohne vollständige Daten können nicht importiert werden.
            </div>
          </div>

          <div className="players-preview" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {parsedData.players.map((player, idx) => {
              const matchResult = playerMatchResults[idx] || { status: 'new' };
              const editable = editablePlayers[idx] || {
                index: idx,
                name: player.name || '',
                lk: player.lk || '',
                tvm_id_number: player.id_number || '',
                club_id: null,
                club_name: '',
                team_id: null,
                category: '',
                is_captain: player.is_captain || false
              };
              
              // Validierung: Alle Pflichtfelder müssen gefüllt sein
              const isValid = editable.name.trim() !== '' &&
                            editable.lk.trim() !== '' &&
                            editable.tvm_id_number.trim() !== '' &&
                            editable.club_id !== null &&
                            editable.team_id !== null;
              
              // Filtere Teams nach ausgewähltem Verein
              const availableTeams = editable.club_id
                ? allTeamsForPlayers.filter(t => t.club_name === editable.club_name || t.id === editable.team_id)
                : allTeamsForPlayers;
              
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${isValid ? (selectedPlayers.includes(idx) ? '#10b981' : '#e5e7eb') : '#ef4444'}`,
                    borderRadius: '8px',
                    background: selectedPlayers.includes(idx) ? '#f0fdf4' : 'white',
                    opacity: isValid ? 1 : 0.7
                  }}
                >
                  {/* Header mit Checkbox */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedPlayers.includes(idx)}
                        disabled={!isValid}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isValid) {
                            setSelectedPlayers(prev => 
                              prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                            );
                          }
                        }}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          cursor: isValid ? 'pointer' : 'not-allowed' 
                        }}
                      />
                      <strong style={{ fontSize: '1rem' }}>{editable.name}</strong>
                      {matchResult.status !== 'new' && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          💾 Existiert ({matchResult.confidence}%)
                        </span>
                      )}
                      {player.is_captain && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          👑 MF
                        </span>
                      )}
                    </div>
                    {!isValid && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        ⚠️ Daten unvollständig
                      </span>
                    )}
                  </div>
                  
                  {/* Editierbare Felder */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {/* LK */}
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                        🏆 LK <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editable.lk}
                        onChange={(e) => {
                          const newEditable = [...editablePlayers];
                          newEditable[idx].lk = e.target.value;
                          setEditablePlayers(newEditable);
                        }}
                        placeholder="z.B. 6.8"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${editable.lk ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    
                    {/* TVM ID */}
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                        🆔 TVM ID <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editable.tvm_id_number}
                        onChange={(e) => {
                          const newEditable = [...editablePlayers];
                          newEditable[idx].tvm_id_number = e.target.value;
                          setEditablePlayers(newEditable);
                        }}
                        placeholder="z.B. 17160158"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${editable.tvm_id_number ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Verein & Team */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {/* Verein */}
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                        🏢 Verein <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={editable.club_id || ''}
                        onChange={async (e) => {
                          const clubId = e.target.value || null;
                          const newEditable = [...editablePlayers];
                          newEditable[idx].club_id = clubId;
                          
                          // Setze Verein-Name
                          if (clubId) {
                            const club = allClubs.find(c => c.id === clubId);
                            if (club) {
                              newEditable[idx].club_name = club.name;
                              
                              // Versuche automatisch Team zu finden (passend zur Category)
                              const matchingTeam = allTeamsForPlayers.find(t => 
                                t.club_name === club.name && 
                                t.category === editable.category
                              );
                              if (matchingTeam) {
                                newEditable[idx].team_id = matchingTeam.id;
                              } else {
                                newEditable[idx].team_id = null; // Reset Team wenn kein Match
                              }
                            }
                          } else {
                            newEditable[idx].club_name = '';
                            newEditable[idx].team_id = null;
                          }
                          
                          setEditablePlayers(newEditable);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${editable.club_id ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: 'white'
                        }}
                      >
                        <option value="">-- Verein wählen --</option>
                        {allClubs.map(club => (
                          <option key={club.id} value={club.id}>
                            {club.name} {club.city ? `(${club.city})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Team */}
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                        🏆 Team <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={editable.team_id || ''}
                        disabled={!editable.club_id}
                        onChange={(e) => {
                          const teamId = e.target.value || null;
                          const newEditable = [...editablePlayers];
                          newEditable[idx].team_id = teamId;
                          
                          // Setze Category basierend auf Team
                          if (teamId) {
                            const team = allTeamsForPlayers.find(t => t.id === teamId);
                            if (team) {
                              newEditable[idx].category = team.category || '';
                            }
                          }
                          
                          setEditablePlayers(newEditable);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: `1px solid ${editable.team_id ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: editable.club_id ? 'white' : '#f3f4f6',
                          cursor: editable.club_id ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <option value="">-- Team wählen --</option>
                        {availableTeams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.club_name} {team.team_name ? `- ${team.team_name}` : ''} ({team.category})
                          </option>
                        ))}
                      </select>
                      {!editable.club_id && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                          ⚠️ Wähle zuerst einen Verein
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Validierungs-Hinweis */}
                  {!isValid && (
                    <div style={{
                      padding: '0.5rem',
                      background: '#fee2e2',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#991b1b',
                      marginTop: '0.5rem'
                    }}>
                      ⚠️ Pflichtfelder: LK, TVM ID, Verein und Team müssen ausgefüllt sein
                    </div>
                  )}
                  
                  {/* Existing Player Info */}
                  {matchResult.status !== 'new' && matchResult.existingName && (
                    <div style={{
                      padding: '0.5rem',
                      background: '#eff6ff',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#1e40af',
                      marginTop: '0.5rem'
                    }}>
                      💾 <strong>Existierender Spieler:</strong> {matchResult.existingName}
                      {matchResult.existingLk && ` (LK ${matchResult.existingLk})`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="import-actions">
            {/* Validierung: Prüfe ob alle ausgewählten Spieler vollständig sind */}
            {(() => {
              const incompletePlayers = selectedPlayers.filter(idx => {
                const editable = editablePlayers[idx];
                if (!editable) return true;
                return !editable.name || !editable.lk || !editable.tvm_id_number || 
                       !editable.club_id || !editable.team_id;
              });
              
              const canImport = selectedPlayers.length > 0 && incompletePlayers.length === 0;
              
              return (
                <>
                  {incompletePlayers.length > 0 && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#fee2e2',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.875rem',
                      color: '#991b1b'
                    }}>
                      ⚠️ <strong>{incompletePlayers.length} Spieler</strong> haben unvollständige Daten. 
                      Bitte vervollständige alle Pflichtfelder (LK, TVM ID, Verein, Team) bevor du importierst.
                    </div>
                  )}
                  <button
                    onClick={handleImportPlayers}
                    disabled={!canImport || isProcessing}
                    className="btn-import"
                    style={{
                      opacity: canImport ? 1 : 0.5,
                      cursor: canImport ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isProcessing 
                      ? '⏳ Importiere...' 
                      : `👥 ${selectedPlayers.length} Spieler importieren`
                    }
                  </button>
                </>
              );
            })()}
            
            <button
              onClick={() => {
                setParsedData(null);
                setSelectedPlayers([]);
                setPlayerMatchResults([]);
                setEditablePlayers([]);
                setMatchingReview(null);
              }}
              className="btn-cancel"
              type="button"
            >
              ❌ Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Import Stats */}
      {importStats && (
        <div className="import-stats">
          <h4>📊 Import-Statistik</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Gesamt:</span>
              <span className="stat-value">{importStats.total}</span>
            </div>
            {importStats.imported !== undefined && (
              <div className="stat-item success">
                <span className="stat-label">Importiert:</span>
                <span className="stat-value">✅ {importStats.imported}</span>
              </div>
            )}
            {importStats.created !== undefined && (
              <div className="stat-item success">
                <span className="stat-label">Erstellt:</span>
                <span className="stat-value">🆕 {importStats.created}</span>
              </div>
            )}
            {importStats.updated !== undefined && (
              <div className="stat-item info">
                <span className="stat-label">Aktualisiert:</span>
                <span className="stat-value">🔄 {importStats.updated}</span>
              </div>
            )}
            {importStats.duplicates !== undefined && (
              <div className="stat-item warning">
                <span className="stat-label">Duplikate:</span>
                <span className="stat-value">⏭️ {importStats.duplicates}</span>
              </div>
            )}
            {importStats.skipped !== undefined && (
              <div className="stat-item warning">
                <span className="stat-label">Übersprungen:</span>
                <span className="stat-value">⏭️ {importStats.skipped}</span>
              </div>
            )}
            <div className="stat-item info">
              <span className="stat-label">Kosten:</span>
              <span className="stat-value">💰 {importStats.cost}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="import-info">
        <h4>ℹ️ Wie funktioniert der Smart-Import?</h4>
        <ul>
          <li>📋 Kopiere die <strong>komplette TVM-Seite</strong> (Team-Info, Spielplan, Meldeliste)</li>
          <li>🤖 Die KI erkennt <strong>automatisch</strong> was im Text ist:
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>🎾 Team & Verein</li>
              <li>📅 Matches & Spieltage</li>
              <li>👥 Spieler & LK</li>
            </ul>
          </li>
          <li>✅ Du wählst aus was importiert werden soll</li>
          <li>🔍 Duplikate & Schreibfehler werden erkannt</li>
          <li>💰 Kosten: ~$0.01 pro Import</li>
        </ul>
      </div>

      {/* Club-Suggestion Modal */}
      {clubSuggestions && (
        <div className="modal-overlay" onClick={clubSuggestions.onCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏢 Verein zuordnen</h3>
              <button onClick={clubSuggestions.onCancel} className="modal-close">✕</button>
            </div>
            
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Der Verein <strong>"{clubSuggestions.searchTerm}"</strong> wurde nicht exakt gefunden.
                <br />
                Meinst du einen dieser Vereine?
              </p>
              
              <div className="club-suggestions">
                {clubSuggestions.suggestions.map((club, idx) => (
                  <div 
                    key={club.id}
                    className="club-suggestion-card"
                    onClick={() => clubSuggestions.onConfirm(club.id)}
                  >
                    <div className="suggestion-header">
                      <strong>{club.name}</strong>
                      <span className={`confidence-badge ${club.similarity >= 0.9 ? 'high' : club.similarity >= 0.8 ? 'medium' : 'low'}`}>
                        {Math.round(club.similarity * 100)}% Match
                      </span>
                    </div>
                    <div className="suggestion-details">
                      {club.city && <span>📍 {club.city}</span>}
                      {club.region && <span>🗺️ {club.region}</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* NEU: Manuelle Auswahl aus aller Vereine */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                  Oder wähle manuell aus allen Vereinen:
                </p>
                <select 
                  className="modal-select"
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== '') {
                      clubSuggestions.onConfirm(e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">-- Alle Vereine anzeigen --</option>
                  {clubSuggestions.allClubs && clubSuggestions.allClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} {club.city ? `(${club.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => clubSuggestions.onCreateNew && clubSuggestions.onCreateNew()}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.75rem 2rem' }}
                >
                  ➕ Neuen Verein erstellen
                </button>
                <button 
                  onClick={clubSuggestions.onCancel}
                  className="btn-cancel"
                  style={{ width: 'auto', padding: '0.75rem 2rem' }}
                >
                  ❌ Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTab;

