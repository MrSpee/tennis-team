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
 * @returns {Object} Import-Ergebnis
 */
export async function importGroupFromNuLiga(group, scrapedData, supabase, clubs, teams) {
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
    
    // Schritt 3: Team-Seasons sicherstellen
    await ensureTeamSeasons(scrapedData, teamMap, group, supabase, result);
    
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
        
        if (error) throw error;
        
        clubMap.set(clubName, newClub);
        result.clubsCreated++;
      } catch (error) {
        result.errors.push({
          type: 'club_creation_error',
          clubName,
          error: error.message
        });
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
      // Team existiert bereits
      const fullTeamName = scrapedTeam.teamName || `${clubName} ${teamSuffix}`.trim();
      teamMap.set(fullTeamName, existingTeam);
      teamMap.set(`${clubName} ${teamSuffix}`, existingTeam); // Auch mit Suffix als Key
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
          teamMap.set(fullTeamName, newTeam);
          teamMap.set(`${clubName} ${teamSuffix}`, newTeam); // Auch mit Suffix als Key
          result.teamsCreated++;
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
 */
async function ensureTeamSeasons(scrapedData, teamMap, group, supabase, result) {
  const scrapedTeams = scrapedData.teamsDetailed || [];
  
  for (const scrapedTeam of scrapedTeams) {
    const fullTeamName = scrapedTeam.teamName || `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const teamName = `${scrapedTeam.clubName} ${scrapedTeam.teamSuffix || ''}`.trim();
    const team = teamMap.get(fullTeamName) || teamMap.get(teamName);
    
    if (!team) continue;
    
    // Prüfe ob team_season bereits existiert
    const { data: existing } = await supabase
      .from('team_seasons')
      .select('id')
      .eq('team_id', team.id)
      .eq('season', group.season)
      .eq('league', group.league)
      .eq('group_name', group.groupName)
      .maybeSingle();
    
    if (!existing) {
      // Erstelle team_season
      try {
        const { error } = await supabase
          .from('team_seasons')
          .insert({
            team_id: team.id,
            season: group.season,
            league: group.league,
            group_name: group.groupName,
            team_size: 6,
            is_active: true
          });
        
        if (error && error.code !== '23505') {
          throw error;
        }
        
        if (!error) {
          result.teamSeasonsCreated++;
        }
      } catch (error) {
        result.errors.push({
          type: 'team_season_creation_error',
          teamName,
          error: error.message
        });
      }
    }
  }
}

/**
 * Importiert Matches (primär über match_number)
 */
async function importMatches(scrapedData, teamMap, group, supabase, result) {
  const matches = scrapedData.matches || [];
  
  for (const match of matches) {
    try {
      const homeTeamName = match.homeTeam || '';
      const awayTeamName = match.awayTeam || '';
      const homeTeam = teamMap.get(homeTeamName);
      const awayTeam = teamMap.get(awayTeamName);
      
      if (!homeTeam || !awayTeam) {
        result.errors.push({
          type: 'match_import_error',
          matchNumber: match.matchNumber,
          error: `Teams nicht gefunden: ${homeTeamName} oder ${awayTeamName}`
        });
        continue;
      }
      
      // Prüfe ob Match bereits existiert (primär über match_number)
      let existingMatch = null;
      
      if (match.matchNumber) {
        const { data } = await supabase
          .from('matchdays')
          .select('id, match_number, home_team_id, away_team_id, match_date')
          .eq('match_number', match.matchNumber)
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName)
          .maybeSingle();
        
        existingMatch = data;
      }
      
      // Fallback: Suche nach Datum + Teams
      if (!existingMatch && match.matchDateIso) {
        const matchDateOnly = new Date(match.matchDateIso).toISOString().split('T')[0];
        const { data } = await supabase
          .from('matchdays')
          .select('id, match_number, home_team_id, away_team_id, match_date')
          .eq('home_team_id', homeTeam.id)
          .eq('away_team_id', awayTeam.id)
          .gte('match_date', `${matchDateOnly}T00:00:00`)
          .lt('match_date', `${matchDateOnly}T23:59:59`)
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName)
          .maybeSingle();
        
        existingMatch = data;
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
        notes: match.notes || null
      };
      
      if (existingMatch) {
        // Update bestehendes Match
        const { error } = await supabase
          .from('matchdays')
          .update(matchData)
          .eq('id', existingMatch.id);
        
        if (error) throw error;
        result.matchesUpdated++;
      } else {
        // Erstelle neues Match
        const { error } = await supabase
          .from('matchdays')
          .insert(matchData)
          .select()
          .single();
        
        if (error) throw error;
        result.matchesImported++;
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
 * Importiert Match-Results (wenn meetingId vorhanden)
 */
async function importMatchResults(scrapedData, group, supabase, result) {
  const matches = scrapedData.matches || [];
  
  for (const match of matches) {
    if (!match.meetingId || match.status !== 'completed') continue;
    
    try {
      // Finde Matchday in DB
      const { data: matchday } = await supabase
        .from('matchdays')
        .select('id, home_team_id, away_team_id')
        .eq('match_number', match.matchNumber)
        .eq('season', group.season)
        .eq('league', group.league)
        .eq('group_name', group.groupName)
        .maybeSingle();
      
      if (!matchday) {
        result.errors.push({
          type: 'match_results_import_error',
          matchNumber: match.matchNumber,
          error: 'Matchday nicht gefunden'
        });
        continue;
      }
      
      // Lade Team-Namen für API
      const { data: homeTeam } = await supabase
        .from('team_info')
        .select('club_name, team_name')
        .eq('id', matchday.home_team_id)
        .single();
      
      const { data: awayTeam } = await supabase
        .from('team_info')
        .select('club_name, team_name')
        .eq('id', matchday.away_team_id)
        .single();
      
      const homeLabel = homeTeam ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim() : '';
      const awayLabel = awayTeam ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim() : '';
      
      // Rufe Meeting-Report API auf
      const response = await fetch('/api/import/meeting-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchdayId: matchday.id,
          meetingId: match.meetingId,
          groupId: group.groupName,
          matchNumber: match.matchNumber,
          matchDate: match.matchDateIso,
          homeTeam: homeLabel,
          awayTeam: awayLabel,
          apply: true
        })
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        result.matchResultsImported++;
      } else {
        result.errors.push({
          type: 'match_results_import_error',
          matchNumber: match.matchNumber,
          error: responseData.error || 'Unbekannter Fehler'
        });
      }
    } catch (error) {
      result.errors.push({
        type: 'match_results_import_error',
        matchNumber: match.matchNumber,
        error: error.message
      });
    }
  }
}

