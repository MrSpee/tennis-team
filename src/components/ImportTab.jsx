import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LoggingService } from '../services/activityLogger';
import './ImportTab.css';

const ImportTab = () => {
  const { player } = useAuth();
  
  // State Management
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerMatchResults, setPlayerMatchResults] = useState([]); // Fuzzy matching results
  const [clubSuggestions, setClubSuggestions] = useState(null); // Für Club-Matching Modal
  const [pendingTeamInfo, setPendingTeamInfo] = useState(null); // Wartet auf Club-Bestätigung
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [importStats, setImportStats] = useState(null);
  
  // Team auswählen (später aus Context/Props)
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]); // Alle Teams für manuelle Auswahl
  const [manualTeamId, setManualTeamId] = useState(null); // Manuell ausgewähltes Team für Spieler-Import

  // Lade Teams beim Mount
  useEffect(() => {
    loadUserTeams();
  }, [player]);

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
      setParsedData(result.data);
      
      // Auto-Select: Alle Matches
      if (result.data.matches?.length > 0) {
        setSelectedMatches(result.data.matches.map((_, idx) => idx));
      }
      
      // Spieler: Fuzzy-Matching durchführen
      if (result.data.players?.length > 0) {
        console.log('🔍 Performing player fuzzy-matching...');
        const matchResults = await performPlayerMatching(result.data.players);
        setPlayerMatchResults(matchResults);
        
        // Nur NEUE Spieler standardmäßig auswählen
        const newPlayerIndices = matchResults
          .map((r, idx) => r.status === 'new' ? idx : null)
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
      const matchesToImport = selectedMatches.map(idx => parsedData.matches[idx]);
      
      console.log('💾 Importing matches to Supabase:', matchesToImport);
      
      // SCHRITT 1: Finde oder erstelle das Team (inkl. Season)
      let teamId = await findOrCreateTeam(parsedData.team_info, parsedData.season);
      console.log('🎯 Using team_id:', teamId);

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
          d.match_date === match.match_date && 
          d.opponent === match.opponent
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
      
      for (const match of uniqueMatches) {
        // Finde Gegner-Team per Name-Lookup
        let { data: opponentTeamData } = await supabase
          .from('team_info')
          .select('id')
          .or(`team_name.ilike.%${match.opponent}%,club_name.ilike.%${match.opponent}%`)
          .limit(1)
          .maybeSingle();

        // Wenn Gegner nicht gefunden, erstelle ein neues Team automatisch
        if (!opponentTeamData) {
          console.warn(`⚠️ Gegner-Team "${match.opponent}" nicht gefunden. Erstelle automatisch...`);
          
          // Parse Gegner-Name (z.B. "TV Dellbrück 1" → club: "TV Dellbrück", team: "1")
          const opponentParts = match.opponent.split(' ');
          const clubName = opponentParts.slice(0, -1).join(' ') || match.opponent;
          const teamName = opponentParts[opponentParts.length - 1] || null;
          
          // Versuche, category aus dem Team-Namen abzuleiten (z.B. "Herren 40 1" → "Herren 40")
          // oder verwende die category vom eigenen Team als Referenz
          const category = ourTeamData.category || null;
          
          // Erstelle Gegner-Team als vollwertiges Team in unserer Datenbank
          const { data: newTeam, error: createError } = await supabase
            .from('team_info')
            .insert({
              club_name: clubName,
              team_name: teamName,
              category: category
              // Kein is_active Feld - team_info hat das nicht!
            })
            .select('id')
            .single();
          
          if (createError || !newTeam) {
            console.error(`❌ Fehler beim Erstellen des Gegner-Teams "${match.opponent}":`, createError);
            throw new Error(`Gegner-Team "${match.opponent}" konnte nicht erstellt werden`);
          }
          
          opponentTeamData = newTeam;
          console.log(`✅ Gegner-Team erstellt: ${clubName} ${teamName} (ID: ${newTeam.id})`);
        }

        // Parse Datum und Zeit
        const matchDateTime = new Date(match.match_date);
        const startTime = match.start_time || matchDateTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        // Bestimme home/away (basierend auf Spielort oder is_home_match)
        const isHomeMatch = match.is_home_match || match.venue?.toLowerCase().includes(ourTeamData.club_name?.toLowerCase() || '');
        
        // Jetzt haben wir IMMER ein opponentTeamData (entweder gefunden oder erstellt)
        const homeTeamId = isHomeMatch ? ourTeamData.id : opponentTeamData.id;
        const awayTeamId = isHomeMatch ? opponentTeamData.id : ourTeamData.id;
        
        // Parse Score (z.B. "2:1" → home_score=2, away_score=1)
        let homeScore = 0;
        let awayScore = 0;
        if (match.match_points && match.match_points.includes(':')) {
          const [h, a] = match.match_points.split(':').map(s => parseInt(s.trim()) || 0);
          // Wenn Gegner nicht gefunden, nehmen wir an, dass unser Team immer "home" spielt
          if (opponentTeamData) {
            homeScore = isHomeMatch ? h : a;
            awayScore = isHomeMatch ? a : h;
          } else {
            // Wenn kein Gegner gefunden, übernehme Score unverändert
            homeScore = h;
            awayScore = a;
          }
        }

        matchdaysToCreate.push({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: matchDateTime.toISOString(),
          start_time: startTime.substring(0, 5), // "15:00"
          venue: match.venue || null,
          location: opponentTeamData ? (isHomeMatch ? 'Home' : 'Away') : 'Home',
          season: parsedData.season?.toLowerCase().includes('winter') ? 'winter' : 'summer',
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

        // 2c. Jetzt Team erstellen mit club_id
        console.log('📝 Creating team with club_id:', clubId);
        
        const { data: newTeam, error: insertError } = await supabase
          .from('team_info')
          .insert({
            club_id: clubId,
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
      // SCHRITT 1: Team ermitteln (automatisch oder manuell)
      let teamId = null;

      if (parsedData?.team_info) {
        // Automatisch aus geparsten Daten
        teamId = await findOrCreateTeam(parsedData.team_info, parsedData.season);
        console.log('🎯 Team ID (automatisch ermittelt):', teamId);
      } else if (manualTeamId) {
        // Manuell ausgewählt
        teamId = manualTeamId;
        console.log('🎯 Team ID (manuell ausgewählt):', teamId);
      } else {
        // Kein Team → Import OHNE Team-Zuordnung (erlaubt!)
        console.log('ℹ️ Spieler werden ohne Team-Zuordnung importiert');
      }

      // SCHRITT 2: Für jeden ausgewählten Spieler
      const playersToImport = selectedPlayers.map(idx => ({
        ...parsedData.players[idx],
        matchResult: playerMatchResults[idx]
      }));

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const playerData of playersToImport) {
        const matchResult = playerData.matchResult;

        // FALL 1: Existierender Spieler (exakte Übereinstimmung)
        if (matchResult?.status === 'exact' && matchResult.playerId) {
          console.log('✅ Updating existing player:', playerData.name);
          
          // Update LK wenn sich geändert hat
          const { error: updateError } = await supabase
            .from('players_unified')
            .update({
              current_lk: playerData.lk || null,
              last_lk_update: new Date().toISOString()
            })
            .eq('id', matchResult.playerId);

          if (updateError) {
            console.error('❌ Error updating player:', updateError);
            skipped++;
          } else {
            updated++;
            
            // Verknüpfe mit Team (falls noch nicht)
            await linkPlayerToTeam(matchResult.playerId, teamId, playerData.is_captain);
          }
          continue;
        }

        // FALL 2: Neuer Spieler → players_unified mit status='pending'
        console.log('🆕 Creating imported player:', playerData.name);
        
        const { data: newImportedPlayer, error: insertError } = await supabase
          .from('players_unified')
          .insert({
            name: playerData.name,
            current_lk: playerData.lk || null,
            tvm_id_number: playerData.id_number || null, // ⚠️ WICHTIG: Für eindeutige Zuordnung!
            is_captain: playerData.is_captain || false,
            player_type: 'app_user',
            is_active: false, // ⚠️ WICHTIG: Noch kein Account!
            user_id: null, // ⚠️ WICHTIG: Noch kein Login!
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
          
          // Verknüpfe Spieler mit Team
          if (teamId) {
            await linkPlayerToTeam(newImportedPlayer.id, teamId, playerData.is_captain);
          }

          // Log KI-Import Aktivität
          try {
            await LoggingService.logActivity('ki_import_player', 'player', newImportedPlayer.id, {
              player_name: playerData.name,
              player_lk: playerData.lk,
              tvm_id_number: playerData.id_number,
              is_captain: playerData.is_captain,
              team_id: teamId,
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

      // 4. Mittlere Confidence (70-94%) → Nutzer fragen
      if (confidence >= 70) {
        console.log('⚠️ Medium confidence, asking user...');
        
        return new Promise((resolve) => {
          setClubSuggestions({
            searchTerm: clubName,
            suggestions: matches.slice(0, 3),
            onConfirm: (clubId) => {
              setClubSuggestions(null);
              resolve(clubId);
            },
            onCancel: () => {
              setClubSuggestions(null);
              resolve(null);
            }
          });
        });
      }

      // 5. Niedrige Confidence (<70%) → Verein fehlt
      throw new Error(
        `❌ Verein "${clubName}" nicht gefunden!\n\n` +
        `Ähnlichste Vereine in der DB:\n` +
        matches.slice(0, 3).map((m, i) => `${i + 1}. ${m.name} (${Math.round(m.similarity * 100)}%)`).join('\n') +
        `\n\nBitte lege den Verein im "🏢 Vereine" Tab an.`
      );

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
    
    // Entferne häufige Suffixe
    const cleanS1 = s1.replace(/\s*(e\.?v\.?|tennis|tc|sv|tg|thc|gg)\s*/gi, ' ').trim();
    const cleanS2 = s2.replace(/\s*(e\.?v\.?|tennis|tc|sv|tg|thc|gg)\s*/gi, ' ').trim();
    
    if (cleanS1 === cleanS2) return 0.9;
    
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
      // Prüfe ob Verknüpfung schon existiert
      const { data: existing } = await supabase
        .from('team_memberships')
        .select('id')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existing) {
        console.log('ℹ️ Player already linked to team');
        return;
      }

      // Erstelle Verknüpfung
      await supabase
        .from('team_memberships')
        .insert({
          player_id: playerId,
          team_id: teamId,
          role: isCaptain ? 'captain' : 'player',
          is_primary: false,
          season: 'winter_25_26',
          is_active: true
        });

      console.log('✅ Player linked to team');
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
      // Lade ALLE Spieler aus players_unified
      const { data: allPlayers, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, status, player_type')
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
        // Exakte Übereinstimmung (Name)
        const exactMatch = existingPlayers.find(
          p => p.name.toLowerCase() === importPlayer.name.toLowerCase()
        );

        if (exactMatch) {
          return {
            status: 'exact',
            playerId: exactMatch.id,
            existingName: exactMatch.name,
            existingLk: exactMatch.current_lk,
            confidence: 100
          };
        }

        // Fuzzy Match (ähnliche Namen)
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
            alternatives: fuzzyMatches.slice(1, 3)
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

      {/* Team-Info wird automatisch erkannt */}
      {parsedData?.team_info && (
        <div className="import-section">
          <div className="team-info-banner">
            <h3>🎾 Erkanntes Team:</h3>
            <div className="team-details">
              <strong>{parsedData.team_info.club_name}</strong>
              {parsedData.team_info.team_name && ` - ${parsedData.team_info.team_name}`}
              {parsedData.team_info.category && ` (${parsedData.team_info.category})`}
              <br />
              {parsedData.team_info.league && <span className="meta-badge">{parsedData.team_info.league}</span>}
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
            {parsedData.matches.map((match, idx) => (
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
                  <div className="match-header">
                    <span className="match-date">
                      📅 {new Date(match.match_date).toLocaleDateString('de-DE', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </span>
                    {match.start_time && (
                      <span className="match-time">🕐 {match.start_time} Uhr</span>
                    )}
                    {match.matchday && (
                      <span className="match-day">🎯 Spieltag {match.matchday}</span>
                    )}
                  </div>
                  
                  <div className="match-opponent">
                    <span className={`home-away-badge ${match.is_home_match ? 'home' : 'away'}`}>
                      {match.is_home_match ? '🏠 Heim' : '✈️ Auswärts'}
                    </span>
                    <strong className="opponent-name">{match.opponent}</strong>
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
            ))}
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

          {/* Manuelle Team-Auswahl (falls keine Team-Info erkannt) */}
          {!parsedData.team_info && (
            <div style={{ 
              padding: '1rem', 
              background: '#fef3c7', 
              border: '1px solid #f59e0b', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#92400e' }}>
                ⚠️ Keine Team-Informationen erkannt
              </div>
              <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '0.75rem' }}>
                Wähle optional ein Team aus, dem die Spieler zugeordnet werden sollen. 
                Du kannst Spieler auch ohne Team importieren.
              </div>
              <select
                value={manualTeamId || ''}
                onChange={(e) => setManualTeamId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="">🚫 Kein Team (Spieler ohne Zuordnung)</option>
                {allTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="players-preview">
            {parsedData.players.map((player, idx) => {
              const matchResult = playerMatchResults[idx] || { status: 'new' };
              
              return (
                <div 
                  key={idx}
                  className={`player-card ${selectedPlayers.includes(idx) ? 'selected' : ''} ${matchResult.status}`}
                  onClick={() => {
                    setSelectedPlayers(prev => 
                      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                    );
                  }}
                >
                  <div className="match-checkbox">
                    <input 
                      type="checkbox"
                      checked={selectedPlayers.includes(idx)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedPlayers(prev => 
                          prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                        );
                      }}
                    />
                  </div>
                  
                  <div className="player-details">
                    <div className="player-header">
                      <strong className="player-name">{player.name}</strong>
                      <span className={`player-status-badge ${matchResult.status}`}>
                        {matchResult.status === 'exact' && `✅ Existiert (${matchResult.confidence}%)`}
                        {matchResult.status === 'fuzzy' && `⚠️ Ähnlich (${matchResult.confidence}%)`}
                        {matchResult.status === 'new' && '🆕 Neu'}
                      </span>
                    </div>
                    
                    <div className="player-info">
                      <span className="player-lk">🏆 LK {player.lk}</span>
                      <span className="player-position">📍 Pos. {player.position}</span>
                      {player.is_captain && <span className="captain-badge">👑 MF</span>}
                      <span className="player-id">🆔 {player.id_number}</span>
                    </div>
                    
                    {/* Existing Player Info */}
                    {matchResult.status !== 'new' && matchResult.existingName && (
                      <div className="existing-player-info">
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          💾 <strong>Existierender Spieler:</strong> {matchResult.existingName}
                          {matchResult.existingLk && ` (LK ${matchResult.existingLk})`}
                        </div>
                        {player.lk !== matchResult.existingLk && (
                          <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                            ⚡ LK-Update: {matchResult.existingLk} → {player.lk}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="import-actions">
            <button
              onClick={handleImportPlayers}
              disabled={selectedPlayers.length === 0 || isProcessing}
              className="btn-import"
            >
              {isProcessing 
                ? '⏳ Importiere...' 
                : `👥 ${selectedPlayers.length} Spieler importieren`
              }
            </button>
            
            <button
              onClick={() => {
                setParsedData(null);
                setSelectedPlayers([]);
                setPlayerMatchResults([]);
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
              
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button 
                  onClick={clubSuggestions.onCancel}
                  className="btn-cancel"
                  style={{ width: 'auto', padding: '0.75rem 2rem' }}
                >
                  ❌ Keiner passt / Abbrechen
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

