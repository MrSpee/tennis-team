/**
 * Neuer, robuster nuLiga Group-Importer
 * 
 * Konzept:
 * 1. Einfache Datenstruktur aus nuLiga
 * 2. Automatisches Erstellen fehlender Clubs/Teams
 * 3. Match-Import über match_number (eindeutig!)
 * 4. Automatischer Match-Results Import
 */

import { normalizeString } from '../../services/matchdayImportService';

/**
 * Importiert eine komplette Gruppe aus nuLiga-Daten
 * 
 * @param {Object} group - Die Gruppe aus der DB (mit category, league, groupName, season)
 * @param {Object} scrapedData - Die gescrapten Daten von nuLiga
 * @param {Object} supabase - Supabase Client
 * @param {Array} clubs - Alle Clubs aus DB
 * @param {Array} teams - Alle Teams aus DB
 * @param {string} sourceUrl - URL, von der die Daten stammen (optional, für zukünftige Erweiterungen)
 * @returns {Object} Import-Ergebnis
 */
export async function importGroupFromNuLiga(group, scrapedData, supabase, clubs, teams, sourceUrl = null) {
  const result = {
    clubsCreated: 0,
    teamsCreated: 0,
    teamSeasonsCreated: 0,
    matchesImported: 0,
    matchesUpdated: 0,
    matchResultsImported: 0,
    errors: []
  };

  try {
    // Schritt 1: Automatisch fehlende Clubs erstellen
    const clubMap = await ensureClubs(scrapedData, clubs, supabase, result);
    
    // Schritt 2: Automatisch fehlende Teams erstellen (mit Kategorie aus Group!)
    const teamMap = await ensureTeams(scrapedData, clubMap, teams, group, supabase, result);
    
    // Schritt 3: Team-Seasons sicherstellen (inkl. sourceUrl)
    // ✅ WICHTIG: Übergebe sourceUrl, damit die URL auf Gruppenebene in team_seasons gespeichert wird
    await ensureTeamSeasons(scrapedData, teamMap, group, supabase, result, sourceUrl);
    
    // Schritt 4: Matches importieren (primär über match_number)
    await importMatches(scrapedData, teamMap, group, supabase, result);
    
    // Schritt 5: Match-Results importieren (wenn meetingId vorhanden)
    await importMatchResults(scrapedData, group, supabase, result);
    
  } catch (error) {
    result.errors.push({
      type: 'import_error',
      message: error.message,
      error
    });
  }

  return result;
}

/**
 * Stellt sicher, dass alle Clubs existieren
 */
async function ensureClubs(scrapedData, existingClubs, supabase, result) {
  const clubMap = new Map();
  const scrapedTeams = scrapedData.teamsDetailed || [];
  const clubNames = new Set();
  
  // Sammle alle Club-Namen
  scrapedTeams.forEach(team => {
    const clubName = team.clubName || '';
    if (clubName) clubNames.add(clubName);
  });
  
  // Erstelle Lookup für existierende Clubs
  const existingClubsMap = new Map();
  existingClubs.forEach(club => {
    const normalized = normalizeString(club.name || '');
    if (!existingClubsMap.has(normalized)) {
      existingClubsMap.set(normalized, []);
    }
    existingClubsMap.get(normalized).push(club);
  });
  
  // Für jeden Club: Finde oder erstelle
  for (const clubName of clubNames) {
    const normalized = normalizeString(clubName);
    const candidates = existingClubsMap.get(normalized) || [];
    
    if (candidates.length > 0) {
      // Club existiert bereits
      clubMap.set(clubName, candidates[0]);
    } else {
      // Club erstellen
      try {
        const { data: newClub, error } = await supabase
          .from('club_info')
          .insert({
            name: clubName,
            normalized_name: normalized,
            data_source: 'tvm_scraper',
            is_verified: false
          })
          .select()
          .single();
        
        if (error) {
          // Wenn Club bereits existiert (409 Conflict oder Unique Constraint), versuche ihn zu finden
          if (error.code === '23505' || error.code === 'PGRST116' || error.status === 409) {
            console.log(`[ensureClubs] ⚠️ Club "${clubName}" existiert bereits, suche in DB...`);
            const { data: foundClub } = await supabase
              .from('club_info')
              .select('*')
              .ilike('name', clubName)
              .limit(1)
              .maybeSingle();
            
            if (foundClub) {
              clubMap.set(clubName, foundClub);
              console.log(`[ensureClubs] ✅ Club gefunden: ${foundClub.name} (ID: ${foundClub.id})`);
            } else {
              // Versuche mit normalized_name
              const { data: foundByNormalized } = await supabase
                .from('club_info')
                .select('*')
                .eq('normalized_name', normalized)
                .limit(1)
                .maybeSingle();
              
              if (foundByNormalized) {
                clubMap.set(clubName, foundByNormalized);
                console.log(`[ensureClubs] ✅ Club gefunden via normalized_name: ${foundByNormalized.name}`);
              } else {
                throw error; // Wenn wirklich nicht gefunden, werfe Fehler
              }
            }
          } else {
            throw error;
          }
        } else {
          clubMap.set(clubName, newClub);
          result.clubsCreated++;
        }
      } catch (error) {
        result.errors.push({
          type: 'club_creation_error',
          clubName,
          error: error.message
        });
        console.error(`[ensureClubs] ❌ Fehler beim Erstellen/Suchen von Club "${clubName}":`, error);
      }
    }
  }
  
  return clubMap;
}

/**
 * Stellt sicher, dass alle Teams existieren (mit Kategorie aus Group!)
 */
async function ensureTeams(scrapedData, clubMap, existingTeams, group, supabase, result) {
  const teamMap = new Map();
  const scrapedTeams = scrapedData.teamsDetailed || [];
  
  // WICHTIG: Kategorie kommt IMMER aus der Group!
  const requiredCategory = group.category || null;
  
  // Erstelle Lookup für existierende Teams
  const existingTeamsMap = new Map();
  existingTeams.forEach(team => {
    const key = `${team.club_id}_${normalizeString(team.team_name || '')}_${normalizeString(team.category || '')}`;
    if (!existingTeamsMap.has(key)) {
      existingTeamsMap.set(key, []);
    }
    existingTeamsMap.get(key).push(team);
  });
  
  // Für jedes Team: Finde oder erstelle
  for (const scrapedTeam of scrapedTeams) {
    const clubName = scrapedTeam.clubName || '';
    const teamSuffix = scrapedTeam.teamSuffix || '';
    const club = clubMap.get(clubName);
    
    if (!club) {
      result.errors.push({
        type: 'team_creation_error',
        teamName: `${clubName} ${teamSuffix}`,
        error: 'Club nicht gefunden'
      });
      continue;
    }
    
    // Suche existierendes Team (mit Kategorie-Prüfung!)
    const key = `${club.id}_${normalizeString(teamSuffix)}_${normalizeString(requiredCategory || '')}`;
    const candidates = existingTeamsMap.get(key) || [];
    
    // Filtere nach exakter Übereinstimmung
    let existingTeam = candidates.find(t => 
      t.club_id === club.id &&
      normalizeString(t.team_name || '') === normalizeString(teamSuffix) &&
      normalizeString(t.category || '') === normalizeString(requiredCategory || '')
    );
    
    if (existingTeam) {
      // Team existiert bereits – prüfe Kategorie
      const normalizedExistingCategory = normalizeString(existingTeam.category || '');
      const normalizedRequiredCategory = normalizeString(requiredCategory || '');
      
      if (normalizedExistingCategory !== normalizedRequiredCategory) {
        console.log(`[ensureTeams] ⚠️ Kategorie-Mismatch für Team "${clubName} ${teamSuffix}" (aktuell: "${existingTeam.category}", erwartet: "${requiredCategory}") – aktualisiere Kategorie`);
        const { error: updateError } = await supabase
          .from('team_info')
          .update({ category: requiredCategory })
          .eq('id', existingTeam.id);
        
        if (updateError) {
          console.warn(`[ensureTeams] ❌ Fehler beim Update der Kategorie für Team "${clubName} ${teamSuffix}":`, updateError);
        } else {
          existingTeam.category = requiredCategory;
        }
      }
      
      const fullTeamName = scrapedTeam.teamName || `${clubName} ${teamSuffix}`.trim();
      // ✅ VERBESSERT: Speichere alle möglichen Varianten des Team-Namens
      teamMap.set(fullTeamName, existingTeam);
      teamMap.set(`${clubName} ${teamSuffix}`, existingTeam);
      teamMap.set(fullTeamName.trim(), existingTeam);
      teamMap.set(`${clubName} ${teamSuffix}`.trim(), existingTeam);
      // Normalisierte Variante für besseres Matching
      teamMap.set(normalizeString(fullTeamName), existingTeam);
    } else {
      // Team erstellen (mit Kategorie!)
      try {
        const { data: newTeam, error } = await supabase
          .from('team_info')
          .insert({
            club_id: club.id,
            club_name: club.name,
            team_name: teamSuffix || null,
            category: requiredCategory,
            region: null
          })
          .select()
          .single();
        
        if (error) {
          // Prüfe ob Team bereits existiert (Unique Constraint)
          if (error.code === '23505') {
            // Versuche es zu finden
            const { data: found } = await supabase
              .from('team_info')
              .select('*')
              .eq('club_id', club.id)
              .eq('team_name', teamSuffix || null)
              .eq('category', requiredCategory)
              .maybeSingle();
            
            if (found) {
              existingTeam = found;
              teamMap.set(`${clubName} ${teamSuffix}`, existingTeam);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        } else {
          const fullTeamName = scrapedTeam.teamName || `${clubName} ${teamSuffix}`.trim();
          // ✅ VERBESSERT: Speichere alle möglichen Varianten des Team-Namens
          teamMap.set(fullTeamName, newTeam);
          teamMap.set(`${clubName} ${teamSuffix}`, newTeam);
          teamMap.set(fullTeamName.trim(), newTeam);
          teamMap.set(`${clubName} ${teamSuffix}`.trim(), newTeam);
          // Normalisierte Variante für besseres Matching
          teamMap.set(normalizeString(fullTeamName), newTeam);
          result.teamsCreated++;
          console.log(`[ensureTeams] ✅ Team erstellt: "${fullTeamName}" (ID: ${newTeam.id})`);
        }
      } catch (error) {
        result.errors.push({
          type: 'team_creation_error',
          teamName: `${clubName} ${teamSuffix}`,
          error: error.message
        });
      }
    }
  }
  
  return teamMap;
}

/**
 * Stellt sicher, dass alle Team-Seasons existieren
 * WICHTIG: Entfernt auch Teams, die nicht mehr in der nuLiga-Gruppe sind
 * ✅ NEU: Speichert sourceUrl in team_seasons für die Gruppe
 */
async function ensureTeamSeasons(scrapedData, teamMap, group, supabase, result, sourceUrl = null) {
  const scrapedTeams = scrapedData.teamsDetailed || [];
  const scrapedTeamIds = new Set();
  
  // Sammle alle Team-IDs aus scrapedData
  for (const scrapedTeam of scrapedTeams) {
    const fullTeamName = scrapedTeam.teamName || `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const teamName = `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const team = teamMap.get(fullTeamName) || teamMap.get(teamName);
    if (team) {
      scrapedTeamIds.add(team.id);
    }
  }
  
  // WICHTIG: Finde alle team_seasons für diese Gruppe, die nicht mehr in nuLiga sind
  const { data: existingTeamSeasons } = await supabase
    .from('team_seasons')
    .select('id, team_id, team_info!inner(club_name, team_name)')
    .eq('season', group.season)
    .eq('league', group.league)
    .eq('group_name', group.groupName);
  
  if (existingTeamSeasons) {
    for (const existingSeason of existingTeamSeasons) {
      // Wenn Team nicht mehr in nuLiga-Gruppe ist, entferne es
      if (!scrapedTeamIds.has(existingSeason.team_id)) {
        console.log(`[ensureTeamSeasons] ⚠️ Team "${existingSeason.team_info?.club_name} ${existingSeason.team_info?.team_name}" ist nicht mehr in nuLiga-Gruppe ${group.groupName}, entferne aus team_seasons`);
        const { error } = await supabase
          .from('team_seasons')
          .delete()
          .eq('id', existingSeason.id);
        
        if (error) {
          result.errors.push({
            type: 'team_season_removal_error',
            teamId: existingSeason.team_id,
            error: error.message
          });
        } else {
          console.log(`[ensureTeamSeasons] ✅ Team entfernt aus Gruppe ${group.groupName}`);
        }
      }
    }
  }
  
  // Erstelle/Update team_seasons für alle Teams aus nuLiga
  for (const scrapedTeam of scrapedTeams) {
    const fullTeamName = scrapedTeam.teamName || `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const teamName = `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const team = teamMap.get(fullTeamName) || teamMap.get(teamName);
    
    if (!team) continue;
    
    // Prüfe ob team_season bereits existiert
    const { data: existing, error: checkError } = await supabase
      .from('team_seasons')
      .select('id, source_url, source_type')
      .eq('team_id', team.id)
      .eq('season', group.season)
      .eq('league', group.league)
      .eq('group_name', group.groupName)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = "not found" - das ist OK
      console.warn(`[ensureTeamSeasons] ⚠️ Fehler beim Prüfen der team_season für Team ${team.id}:`, checkError);
    }
    
    if (!existing) {
      // Erstelle team_season
      try {
        const { data: newSeason, error } = await supabase
          .from('team_seasons')
          .insert({
            team_id: team.id,
            season: group.season,
            league: group.league, // WICHTIG: League aus nuLiga (nicht aus DB!)
            group_name: group.groupName,
            team_size: 6,
            is_active: true,
            source_url: sourceUrl || null, // ✅ NEU: URL auf Gruppenebene speichern
            source_type: 'nuliga' // ✅ NEU: Typ der Quelle
          })
          .select()
          .maybeSingle();
        
        // ✅ VERBESSERT: Behandle 409 Conflict (HTTP) und 23505 (PostgreSQL Unique Constraint)
        if (error) {
          if (error.code === '23505' || error.status === 409 || error.message?.includes('409') || error.message?.includes('Conflict')) {
            // Duplikat - versuche den bestehenden Eintrag zu finden
            console.log(`[ensureTeamSeasons] ℹ️ Team-Season existiert bereits (409/23505), suche bestehenden Eintrag...`);
            const { data: foundExisting } = await supabase
              .from('team_seasons')
              .select('id, source_url, source_type')
              .eq('team_id', team.id)
              .eq('season', group.season)
              .eq('league', group.league)
              .eq('group_name', group.groupName)
              .maybeSingle();
            
            if (foundExisting) {
              // Aktualisiere source_url, falls sie noch nicht gesetzt ist
              if (sourceUrl && !foundExisting.source_url) {
                const { error: updateError } = await supabase
                  .from('team_seasons')
                  .update({ source_url: sourceUrl, source_type: 'nuliga' })
                  .eq('id', foundExisting.id);
                
                if (updateError) {
                  console.warn(`[ensureTeamSeasons] ⚠️ Fehler beim Update der source_url:`, updateError);
                } else {
                  console.log(`[ensureTeamSeasons] ✅ source_url aktualisiert für Team-Season ${foundExisting.id}`);
                }
              }
              result.teamSeasonsCreated++;
              continue; // Weiter zum nächsten Team
            } else {
              // Nicht gefunden, aber Conflict - das ist seltsam, logge es
              console.warn(`[ensureTeamSeasons] ⚠️ 409 Conflict, aber Eintrag nicht gefunden für Team ${team.id}`);
              result.errors.push({
                type: 'team_season_creation_error',
                teamId: team.id,
                error: '409 Conflict, aber Eintrag nicht gefunden'
              });
              continue;
            }
          } else {
            // Anderer Fehler - werfe ihn
            throw error;
          }
        }
        
        if (newSeason) {
          result.teamSeasonsCreated++;
          console.log(`[ensureTeamSeasons] ✅ Team-Season erstellt für Team ${team.id} (${group.groupName})`);
        }
      } catch (error) {
        // Fehler wurde bereits oben behandelt (409/23505)
        if (error.code !== '23505' && error.status !== 409 && !error.message?.includes('409') && !error.message?.includes('Conflict')) {
          result.errors.push({
            type: 'team_season_creation_error',
            teamName: `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`,
            error: error.message
          });
          console.error(`[ensureTeamSeasons] ❌ Fehler beim Erstellen der Team-Season:`, error);
        } else {
          // 409 Conflict wurde bereits behandelt - nur loggen
          console.log(`[ensureTeamSeasons] ℹ️ Team-Season existiert bereits (409/23505) - wurde bereits behandelt`);
        }
      }
    } else {
      // Update League/Kategorie und source_url falls sich geändert hat
      const updateData = {
        league: group.league, // WICHTIG: League aus nuLiga übernehmen
        is_active: true
      };
      
      // ✅ NEU: Aktualisiere source_url, wenn eine neue vorhanden ist
      if (sourceUrl) {
        updateData.source_url = sourceUrl;
        updateData.source_type = 'nuliga';
      }
      
      const { error: updateError } = await supabase
        .from('team_seasons')
        .update(updateData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.warn(`[ensureTeamSeasons] ⚠️ Fehler beim Update von team_season für Team ${teamName}:`, updateError);
      }
    }
  }
}

/**
 * Importiert Matches (primär über match_number)
 * @param {Object} scrapedData - Die gescrapten Daten
 * @param {Map} teamMap - Map von Team-Namen zu Team-IDs
 * @param {Object} group - Die Gruppe aus der DB
 * @param {Object} supabase - Supabase Client
 * @param {Object} result - Ergebnis-Objekt
 * @param {string} sourceUrl - URL, von der die Daten stammen (optional)
 */
async function importMatches(scrapedData, teamMap, group, supabase, result) {
  const matches = scrapedData.matches || [];
  
  console.log(`[importMatches] 🔍 Importiere ${matches.length} Matches für Gruppe ${group.groupName}`);
  console.log(`[importMatches] 📊 Team-Map enthält ${teamMap.size} Teams:`, Array.from(teamMap.keys()).slice(0, 10));
  
  for (const match of matches) {
    try {
      const homeTeamName = match.homeTeam || '';
      const awayTeamName = match.awayTeam || '';
      
      // ✅ VERBESSERT: Versuche verschiedene Varianten des Team-Namens zu finden
      let homeTeam = teamMap.get(homeTeamName);
      let awayTeam = teamMap.get(awayTeamName);
      
      // Fallback: Versuche mit verschiedenen Varianten
      if (!homeTeam) {
        // Versuche ohne führende/trailing Leerzeichen
        homeTeam = teamMap.get(homeTeamName.trim());
        // Versuche mit verschiedenen Schreibweisen
        if (!homeTeam) {
          for (const [key, value] of teamMap.entries()) {
            if (normalizeString(key) === normalizeString(homeTeamName)) {
              homeTeam = value;
              break;
            }
          }
        }
      }
      
      if (!awayTeam) {
        awayTeam = teamMap.get(awayTeamName.trim());
        if (!awayTeam) {
          for (const [key, value] of teamMap.entries()) {
            if (normalizeString(key) === normalizeString(awayTeamName)) {
              awayTeam = value;
              break;
            }
          }
        }
      }
      
      // DEBUG: Log Match-Info
      console.log(`[importMatches] 🔍 Prüfe Match #${match.matchNumber}:`, {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        matchDate: match.matchDateIso,
        startTime: match.startTime,
        status: match.status,
        homeTeamFound: !!homeTeam,
        awayTeamFound: !!awayTeam
      });
      
      if (!homeTeam || !awayTeam) {
        const missingTeams = [];
        if (!homeTeam) missingTeams.push(`Home: ${homeTeamName}`);
        if (!awayTeam) missingTeams.push(`Away: ${awayTeamName}`);
        
        result.errors.push({
          type: 'match_import_error',
          matchNumber: match.matchNumber,
          error: `Teams nicht gefunden: ${missingTeams.join(', ')}`
        });
        console.warn(`[importMatches] ⚠️ Teams nicht gefunden für Match #${match.matchNumber}: ${missingTeams.join(', ')}`);
        console.warn(`[importMatches] 💡 Verfügbare Teams in Map:`, Array.from(teamMap.keys()).filter(k => 
          normalizeString(k).includes(normalizeString(homeTeamName)) || 
          normalizeString(k).includes(normalizeString(awayTeamName))
        ));
        continue;
      }
      
      // ✅ KORRIGIERT: Prüfe ob Match bereits existiert
      // WICHTIG: match_number ist eindeutig pro Saison (z.B. Gr. 001: #1-21, Gr. 002: #22-36)
      // ABER: Wir filtern trotzdem nach group_name für zusätzliche Sicherheit
      // UND: Wir validieren die Teams, falls match_number doch falsch zugeordnet wurde
      let existingMatch = null;
      
      if (match.matchNumber) {
        // ✅ Suche in aktueller Saison/League/Group (zusätzliche Sicherheit)
        // Auch wenn match_number eindeutig ist, verhindert group_name-Filter falsche Zuordnungen
        const { data: dataInGroup } = await supabase
          .from('matchdays')
          .select('id, match_number, home_team_id, away_team_id, away_team_id, match_date, season, league, group_name, meeting_id')
          .eq('match_number', match.matchNumber)
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName)
          .maybeSingle();
        
        if (dataInGroup) {
          // ✅ ZUSÄTZLICHE VALIDIERUNG: Prüfe ob Teams übereinstimmen
          // Das verhindert, dass falsche Matches gefunden werden (z.B. wenn match_number falsch zugeordnet wurde)
          const teamsMatch = 
            (dataInGroup.home_team_id === homeTeam.id && dataInGroup.away_team_id === awayTeam.id) ||
            (dataInGroup.home_team_id === awayTeam.id && dataInGroup.away_team_id === homeTeam.id);
          
          if (teamsMatch) {
            existingMatch = dataInGroup;
            console.log(`[importMatches] ✅ Bestehendes Match gefunden über match_number #${match.matchNumber} in Gruppe ${group.groupName} (Teams stimmen überein)`);
          } else {
            console.warn(`[importMatches] ⚠️ Match #${match.matchNumber} in Gruppe ${group.groupName} gefunden, aber Teams stimmen nicht überein. Erstelle neues Match.`);
            // Teams stimmen nicht überein - erstelle neues Match (match_number war falsch zugeordnet)
            existingMatch = null;
          }
        }
      }
      
      // ✅ Fallback: Suche nach Datum + Teams (NUR in aktueller Gruppe)
      if (!existingMatch && match.matchDateIso) {
        const matchDateOnly = new Date(match.matchDateIso).toISOString().split('T')[0];
        const { data } = await supabase
          .from('matchdays')
          .select('id, match_number, home_team_id, away_team_id, match_date, season, league, group_name, meeting_id')
          .eq('home_team_id', homeTeam.id)
          .eq('away_team_id', awayTeam.id)
          .gte('match_date', `${matchDateOnly}T00:00:00`)
          .lt('match_date', `${matchDateOnly}T23:59:59`)
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName)
          .maybeSingle();
        
        if (data) {
          existingMatch = data;
          console.log(`[importMatches] ✅ Bestehendes Match gefunden über Datum + Teams für Match #${match.matchNumber || 'ohne Nummer'}`);
        }
      }
      
      // WICHTIG: Wenn kein Datum vorhanden ist, aber match_number vorhanden ist, sollte das Match trotzdem importiert werden
      if (!match.matchDateIso && match.matchNumber) {
        console.log(`[importMatches] ⚠️ Match #${match.matchNumber} hat kein Datum, aber match_number vorhanden - importiere trotzdem`);
      }
      
      // Bereite Match-Daten vor
      const matchData = {
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        match_date: match.matchDateIso || null,
        start_time: match.startTime || null,
        venue: match.venue || null,
        court_number: match.court_number || null,
        court_number_end: match.court_number_end || null,
        season: group.season,
        league: group.league,
        group_name: group.groupName,
        match_number: match.matchNumber || null,
        status: match.status || 'scheduled',
        home_score: match.matchPoints?.home || null,
        away_score: match.matchPoints?.away || null,
        final_score: match.matchPoints ? `${match.matchPoints.home}:${match.matchPoints.away}` : null,
        notes: match.notes || null,
        // ✅ WICHTIG: meeting_id nur setzen, wenn:
        // 1. Kein bestehendes Match vorhanden (neues Match)
        // 2. ODER bestehendes Match hat keine meeting_id (NULL)
        // 3. ODER neue meeting_id ist vorhanden (Update von NULL zu Wert oder Update zu neuem Wert)
        meeting_id: match.meetingId || null,
        meeting_report_url: match.meetingReportUrl || null,
        // ✅ ENTFERNT: source_url und source_type werden jetzt in team_seasons gespeichert, nicht in matchdays
      };
      
      if (existingMatch) {
        // ✅ WICHTIG: meeting_id nur aktualisieren wenn:
        // 1. Bestehende meeting_id ist NULL (noch nicht gesetzt)
        // 2. ODER neue meeting_id ist vorhanden UND Teams stimmen überein (bereits validiert oben)
        // Das verhindert, dass korrekte meeting_ids überschrieben werden
        if (existingMatch.meeting_id && !match.meetingId) {
          // Bestehende meeting_id behalten, keine neue vorhanden
          delete matchData.meeting_id;
          delete matchData.meeting_report_url;
          console.log(`[importMatches] ℹ️  Behalte bestehende meeting_id ${existingMatch.meeting_id} für Match #${match.matchNumber}`);
        } else if (match.meetingId && (!existingMatch.meeting_id || match.meetingId !== existingMatch.meeting_id)) {
          // Neue meeting_id vorhanden und (bestehende ist NULL oder unterschiedlich) - aktualisiere
          console.log(`[importMatches] 🔄 Aktualisiere meeting_id für Match #${match.matchNumber}: ${existingMatch.meeting_id || 'NULL'} → ${match.meetingId}`);
        } else if (existingMatch.meeting_id && match.meetingId && match.meetingId === existingMatch.meeting_id) {
          // meeting_id ist bereits korrekt - keine Änderung nötig
          delete matchData.meeting_id;
          delete matchData.meeting_report_url;
        }
        
        // ✅ ENTFERNT: source_url und source_type werden jetzt in team_seasons gespeichert, nicht in matchdays
        
        // Update bestehendes Match
        const { error } = await supabase
          .from('matchdays')
          .update(matchData)
          .eq('id', existingMatch.id);
        
        if (error) {
          console.error(`[importMatches] ❌ Fehler beim Update von Match #${match.matchNumber}:`, error);
          throw error;
        }
        result.matchesUpdated++;
        console.log(`[importMatches] ✅ Match #${match.matchNumber} aktualisiert`);
      } else {
        // Erstelle neues Match
        const { data: newMatch, error } = await supabase
          .from('matchdays')
          .insert(matchData)
          .select()
          .single();
        
        if (error) {
          // WICHTIG: Wenn match_number bereits existiert (409 Conflict), finde das Match und update es
          if (error.code === '23505' && error.message?.includes('match_number')) {
            console.log(`[importMatches] ⚠️ Match #${match.matchNumber} existiert bereits (Unique Constraint), suche und update...`);
            
            // Suche das existierende Match (auch über alle Saisons/Leagues/Groups)
            const { data: foundMatch } = await supabase
              .from('matchdays')
              .select('id, match_number, home_team_id, away_team_id, match_date, season, league, group_name')
              .eq('match_number', match.matchNumber)
              .maybeSingle();
            
            if (foundMatch) {
              // Update das existierende Match
              const { error: updateError } = await supabase
                .from('matchdays')
                .update(matchData)
                .eq('id', foundMatch.id);
              
              if (updateError) {
                console.error(`[importMatches] ❌ Fehler beim Update von Match #${match.matchNumber} nach Conflict:`, updateError);
                throw updateError;
              }
              
              result.matchesUpdated++;
              console.log(`[importMatches] ✅ Match #${match.matchNumber} aktualisiert (nach Conflict-Erkennung)`);
            } else {
              // Match nicht gefunden trotz Unique Constraint - das sollte nicht passieren
              console.error(`[importMatches] ❌ Match #${match.matchNumber} existiert laut Constraint, aber nicht gefunden!`);
              throw error;
            }
          } else {
            console.error(`[importMatches] ❌ Fehler beim Erstellen von Match #${match.matchNumber}:`, error);
            throw error;
          }
        } else {
          result.matchesImported++;
          console.log(`[importMatches] ✅ Match #${match.matchNumber} erstellt (Datum: ${match.matchDateIso || 'kein Datum'})`);
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'match_import_error',
        matchNumber: match.matchNumber,
        error: error.message
      });
    }
  }
}

/**
 * Extrahiert numerische Gruppen-ID aus Group-Name (z.B. "Gr. 034" → "34")
 */
function extractGroupId(groupName) {
  if (!groupName) return null;
  const match = String(groupName).match(/Gr\.\s*(\d+)/i) || String(groupName).match(/(\d+)/);
  if (!match) return null;
  const num = match[1].replace(/^0+/, '');
  return num || '0';
}

/**
 * Importiert Match-Results (wenn meetingId vorhanden)
 * WICHTIG: Match-Results Import ist optional und sollte Fehler nicht blockieren
 */
async function importMatchResults(scrapedData, group, supabase, result) {
  const matches = scrapedData.matches || [];
  
  // Extrahiere numerische Gruppen-ID
  const groupId = extractGroupId(group.groupName) || scrapedData.group?.groupId || null;
  
  // WICHTIG: Lade alle Matchdays für diese Gruppe aus der DB (inkl. meeting_id)
  const { data: allMatchdays, error: matchdaysError } = await supabase
    .from('matchdays')
    .select('id, match_number, meeting_id, home_team_id, away_team_id')
    .eq('season', group.season)
    .eq('league', group.league)
    .eq('group_name', group.groupName);
  
  if (matchdaysError) {
    result.errors.push({
      type: 'match_results_import_error',
      error: `Fehler beim Laden der Matchdays: ${matchdaysError.message}`
    });
    return;
  }
  
  // Erstelle Map: match_number -> matchday (inkl. meeting_id aus DB)
  const matchdayMap = new Map();
  if (allMatchdays) {
    allMatchdays.forEach(md => {
      if (md.match_number) {
        matchdayMap.set(String(md.match_number), md);
      }
    });
  }
  
  // Kombiniere: Scraped Matches + DB Matchdays
  const skippedMatches = []; // Sammle Matches ohne meetingId für Zusammenfassung
  for (const match of matches) {
    // WICHTIG: meetingId kann aus scraped Match ODER aus DB Matchday kommen
    let meetingId = match.meetingId;
    let matchday = null;
    
    if (match.matchNumber) {
      matchday = matchdayMap.get(String(match.matchNumber));
      // Priorität: DB meeting_id > scraped meetingId
      if (matchday?.meeting_id) {
        meetingId = matchday.meeting_id;
      }
    }
    
    // WICHTIG: Nur Matches mit meetingId importieren
    if (!meetingId) {
      skippedMatches.push(match.matchNumber);
      continue;
    }
    
    // DEBUG: Log Match-Info
    console.log(`[importMatchResults] 🔍 Prüfe Match #${match.matchNumber}:`, {
      meetingId: meetingId,
      meetingIdSource: matchday?.meeting_id ? 'DB' : 'scraped',
      status: match.status,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam
    });
    
    try {
      // Wenn matchday noch nicht geladen, lade es jetzt
      if (!matchday && match.matchNumber) {
        const { data: loadedMatchday, error: matchdayError } = await supabase
          .from('matchdays')
          .select('id, home_team_id, away_team_id, meeting_id')
          .eq('match_number', match.matchNumber)
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName)
          .maybeSingle();
        
        if (matchdayError) {
          result.errors.push({
            type: 'match_results_import_error',
            matchNumber: match.matchNumber,
            error: `Fehler beim Laden des Matchdays: ${matchdayError.message}`
          });
          continue;
        }
        
        matchday = loadedMatchday;
      }
      
      if (!matchday) {
        // Matchday nicht gefunden - das ist ok, vielleicht wurde es noch nicht importiert
        console.log(`[importMatchResults] Matchday nicht gefunden für Match #${match.matchNumber}, überspringe Match-Results Import`);
        continue;
      }
      
      // Lade Team-Namen für API (mit Fehlerbehandlung)
      let homeLabel = '';
      let awayLabel = '';
      
      if (matchday.home_team_id) {
        const { data: homeTeam, error: homeError } = await supabase
          .from('team_info')
          .select('club_name, team_name')
          .eq('id', matchday.home_team_id)
          .maybeSingle();
        
        if (!homeError && homeTeam) {
          homeLabel = `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim();
        }
      }
      
      if (matchday.away_team_id) {
        const { data: awayTeam, error: awayError } = await supabase
          .from('team_info')
          .select('club_name, team_name')
          .eq('id', matchday.away_team_id)
          .maybeSingle();
        
        if (!awayError && awayTeam) {
          awayLabel = `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim();
        }
      }
      
      // Fallback: Verwende Team-Namen aus scraped Match
      if (!homeLabel && match.homeTeam) {
        homeLabel = match.homeTeam;
      }
      if (!awayLabel && match.awayTeam) {
        awayLabel = match.awayTeam;
      }
      
      // Rufe Meeting-Report API auf
      const response = await fetch('/api/import/meeting-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchdayId: matchday.id,
          meetingId: meetingId, // WICHTIG: Verwende meetingId aus DB oder scraped
          groupId: groupId, // WICHTIG: Numerische ID, nicht Name!
          matchNumber: match.matchNumber,
          matchDate: match.matchDateIso,
          homeTeam: homeLabel,
          awayTeam: awayLabel,
          apply: true
        })
      });
      
      let responseData;
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        result.errors.push({
          type: 'match_results_import_error',
          matchNumber: match.matchNumber,
          error: `Fehler beim Parsen der API-Antwort: ${parseError.message}`
        });
        continue;
      }
      
      // DEBUG: Log API-Antwort
      if (response.ok && responseData.success) {
        console.log(`[importMatchResults] ✅ Match-Results importiert für Match #${match.matchNumber}`);
        console.log(`[importMatchResults] 📊 API-Antwort:`, {
          singlesCount: responseData.singles?.length || 0,
          doublesCount: responseData.doubles?.length || 0,
          firstSingle: responseData.singles?.[0] ? {
            matchNumber: responseData.singles[0].matchNumber,
            homePlayers: responseData.singles[0].homePlayers?.map(p => ({ name: p.name, lk: p.lk })) || [],
            awayPlayers: responseData.singles[0].awayPlayers?.map(p => ({ name: p.name, lk: p.lk })) || []
          } : null,
          applyResult: responseData.applyResult ? {
            inserted: responseData.applyResult.inserted?.length || 0,
            missingPlayers: responseData.applyResult.missingPlayers?.length || 0,
            missingPlayersList: responseData.applyResult.missingPlayers?.map(p => ({ name: p.name, lk: p.lk, context: p.contexts?.[0] })) || []
          } : null
        });
        
        // WICHTIG: Zeige fehlende Spieler in der Konsole
        if (responseData.applyResult?.missingPlayers && responseData.applyResult.missingPlayers.length > 0) {
          console.warn(`[importMatchResults] ⚠️ ${responseData.applyResult.missingPlayers.length} Spieler konnten nicht erstellt werden:`, 
            responseData.applyResult.missingPlayers.map(p => `${p.name} (LK: ${p.lk || 'keine'})`).join(', ')
          );
        }
        result.matchResultsImported++;
      } else {
        // WICHTIG: Bestimmte Fehler sind ok (z.B. MEETING_ID_NOT_AVAILABLE, MATCH_NOT_FOUND)
        const errorCode = responseData.errorCode;
        const errorMessage = responseData.error || `HTTP ${response.status}: Unbekannter Fehler`;
        const isExpectedError = errorCode === 'MEETING_ID_NOT_AVAILABLE' || 
                                errorCode === 'MATCH_NOT_FOUND' ||
                                (response.status === 200 && !responseData.success); // 200 mit success: false ist ok
        
        if (!isExpectedError) {
          // 500 Error oder andere unerwartete Fehler
          console.error(`[importMatchResults] ❌ Fehler beim Import für Match #${match.matchNumber}:`, {
            status: response.status,
            errorCode,
            error: errorMessage,
            responseData
          });
          result.errors.push({
            type: 'match_results_import_error',
            matchNumber: match.matchNumber,
            error: errorMessage,
            errorCode,
            httpStatus: response.status
          });
        } else {
          console.log(`[importMatchResults] ℹ️ Match-Results Import übersprungen für Match #${match.matchNumber}: ${errorMessage}`);
        }
      }
    } catch (error) {
      // WICHTIG: Fehler beim Match-Results Import sollten den gesamten Import nicht blockieren
      console.error(`[importMatchResults] Fehler beim Import für Match #${match.matchNumber}:`, error);
      result.errors.push({
        type: 'match_results_import_error',
        matchNumber: match.matchNumber,
        error: error.message || 'Unbekannter Fehler'
      });
    }
  }
  
  // Zusammenfassung: Matches ohne meetingId
  if (skippedMatches.length > 0) {
    console.log(`[importMatchResults] ⏭️ ${skippedMatches.length} Match(es) ohne meetingId übersprungen (noch nicht gespielt oder Ergebnisse nicht verfügbar): #${skippedMatches.slice(0, 10).join(', #')}${skippedMatches.length > 10 ? ` ... (+${skippedMatches.length - 10} weitere)` : ''}`);
  }
}

