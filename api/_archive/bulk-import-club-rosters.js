const { createSupabaseClient } = require('../_lib/supabaseAdmin');
const {
  parseClubPoolsPage,
  saveTeamRoster,
  saveClubNumber
} = require('./parse-club-rosters');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function withCors(res, status, payload) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.status(status).json(payload);
}

/**
 * Konstruiert die clubPools-URL basierend auf Club-Nummer
 */
function buildClubPoolsUrl(clubNumber) {
  return `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=${clubNumber}`;
}

/**
 * Extrahiert club_number aus einer clubPools-URL
 */
function extractClubNumberFromUrl(url) {
  if (!url) return null;
  const match = url.match(/[?&]club=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Importiert Meldelisten für alle Vereine
 * Strategie: 
 * 1. Versuche Teams mit club_number zu finden
 * 2. Falls keine vorhanden: Lade alle Clubs und versuche clubPools-URLs zu konstruieren
 */
async function bulkImportClubRosters(supabase, targetSeason, options = {}) {
  const {
    maxClubs = null, // Limit für Test-Zwecke
    delayBetweenClubs = 2000, // 2 Sekunden Pause zwischen Vereinen
    delayBetweenTeams = 500, // 0.5 Sekunden Pause zwischen Teams
    dryRun = false // Wenn true, wird nichts gespeichert
  } = options;
  
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    clubs: []
  };
  
  try {
    // 1. Versuche zuerst Teams mit club_number zu finden
    console.log('[bulk-import-club-rosters] 🔍 Lade Teams mit club_number...');
    const { data: teamsWithClubNumber, error: teamsError } = await supabase
      .from('team_info')
      .select('id, club_id, club_name, team_name, category, club_number, club_info!inner(id, name)')
      .not('club_number', 'is', null)
      .order('club_number', { ascending: true });
    
    if (teamsError) {
      throw new Error(`Fehler beim Laden der Teams: ${teamsError.message}`);
    }
    
    let clubs = [];
    
    if (teamsWithClubNumber && teamsWithClubNumber.length > 0) {
      // Strategie 1: Verwende Teams mit club_number
      console.log(`[bulk-import-club-rosters] ✅ ${teamsWithClubNumber.length} Teams mit club_number gefunden`);
      
      const clubsMap = new Map();
      teamsWithClubNumber.forEach(team => {
        if (!team.club_number) return;
        
        if (!clubsMap.has(team.club_number)) {
          clubsMap.set(team.club_number, {
            clubNumber: team.club_number,
            clubId: team.club_id,
            clubName: team.club_name || team.club_info?.name,
            teams: []
          });
        }
        
        clubsMap.get(team.club_number).teams.push({
          id: team.id,
          category: team.category,
          teamName: team.team_name
        });
      });
      
      clubs = Array.from(clubsMap.values());
    } else {
      // Strategie 2: Lade alle Clubs und versuche club_number aus team_seasons.source_url zu extrahieren
      console.log('[bulk-import-club-rosters] ⚠️ Keine Teams mit club_number gefunden. Versuche club_number aus source_url zu extrahieren...');
      
      const { data: allClubs, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (clubsError) {
        throw new Error(`Fehler beim Laden der Vereine: ${clubsError.message}`);
      }
      
      if (!allClubs || allClubs.length === 0) {
        return {
          ...results,
          message: 'Keine Vereine in der Datenbank gefunden'
        };
      }
      
      // Für jeden Club: Suche nach team_seasons mit clubPools-URLs
      const clubsMap = new Map();
      
      for (const club of allClubs) {
        // Lade Teams dieses Clubs mit team_seasons
        const { data: teams, error: teamsError2 } = await supabase
          .from('team_info')
          .select(`
            id,
            club_id,
            club_name,
            team_name,
            category,
            team_seasons(
              source_url,
              season
            )
          `)
          .eq('club_id', club.id);
        
        if (teamsError2) {
          console.warn(`[bulk-import-club-rosters] ⚠️ Fehler beim Laden der Teams für Club ${club.name}:`, teamsError2.message);
          continue;
        }
        
        if (!teams || teams.length === 0) continue;
        
        // Versuche club_number aus source_url zu extrahieren
        let clubNumber = null;
        for (const team of teams) {
          if (team.team_seasons && Array.isArray(team.team_seasons) && team.team_seasons.length > 0) {
            for (const season of team.team_seasons) {
              if (season.season === targetSeason && season.source_url) {
                if (season.source_url.includes('clubPools')) {
                  clubNumber = extractClubNumberFromUrl(season.source_url);
                  if (clubNumber) break;
                }
              }
            }
            if (clubNumber) break;
          }
        }
        
        if (clubNumber) {
          if (!clubsMap.has(clubNumber)) {
            clubsMap.set(clubNumber, {
              clubNumber: clubNumber,
              clubId: club.id,
              clubName: club.name,
              teams: []
            });
          }
          
          teams.forEach(team => {
            clubsMap.get(clubNumber).teams.push({
              id: team.id,
              category: team.category,
              teamName: team.team_name
            });
          });
        }
      }
      
      clubs = Array.from(clubsMap.values());
      
      if (clubs.length === 0) {
        return {
          ...results,
          message: 'Keine Vereine mit clubPools-URLs gefunden. Bitte verwende zuerst den Einzel-Import, um clubPools-URLs zu importieren. Diese werden dann automatisch für den Bulk-Import verwendet.'
        };
      }
      
      console.log(`[bulk-import-club-rosters] ✅ ${clubs.length} Vereine mit clubPools-URLs gefunden`);
    }
    
    results.total = clubs.length;
    
    // Limit für Test-Zwecke
    const clubsToProcess = maxClubs ? clubs.slice(0, maxClubs) : clubs;
    
    console.log(`[bulk-import-club-rosters] 📊 ${clubsToProcess.length} Vereine gefunden (${clubs.length} insgesamt)`);
    
    // 3. Importiere Meldelisten für jeden Verein
    for (let i = 0; i < clubsToProcess.length; i++) {
      const club = clubsToProcess[i];
      const clubPoolsUrl = buildClubPoolsUrl(club.clubNumber);
      
      console.log(`[bulk-import-club-rosters] 🔄 Verarbeite Verein ${i + 1}/${clubsToProcess.length}: ${club.clubName} (${club.clubNumber})`);
      
      try {
        // Parse clubPools-Seite direkt
        console.log(`[bulk-import-club-rosters] 🔍 Parse clubPools-Seite: ${clubPoolsUrl}`);
        const parseResult = await parseClubPoolsPage(clubPoolsUrl, targetSeason);
        console.log(`[bulk-import-club-rosters] ✅ Parse erfolgreich: ${parseResult?.teams?.length || 0} Teams gefunden`);
        
        if (!parseResult || !parseResult.teams || parseResult.teams.length === 0) {
          results.skipped++;
          results.clubs.push({
            clubNumber: club.clubNumber,
            clubName: club.clubName,
            status: 'skipped',
            reason: 'Keine Teams gefunden'
          });
          continue;
        }
        
        // Erstelle Team-Mapping automatisch
        const teamMapping = {};
        parseResult.teams.forEach(team => {
          // Versuche exaktes Matching
          let matchingTeam = club.teams.find(t => t.category === team.contestType);
          
          // Falls kein exaktes Match: Versuche flexible Matching
          if (!matchingTeam) {
            // Normalisiere Kategorien für Vergleich (z.B. "Damen 30" vs "Frauen 30")
            const normalizeCategory = (cat) => {
              if (!cat) return '';
              return cat.toLowerCase()
                .replace(/damen/g, 'damen')
                .replace(/frauen/g, 'damen')
                .replace(/herren/g, 'herren')
                .trim();
            };
            
            const normalizedContestType = normalizeCategory(team.contestType);
            matchingTeam = club.teams.find(t => {
              const normalizedCategory = normalizeCategory(t.category);
              return normalizedCategory === normalizedContestType;
            });
          }
          
          // Falls immer noch kein Match: Versuche Teilstring-Matching
          if (!matchingTeam) {
            matchingTeam = club.teams.find(t => {
              const contestLower = team.contestType.toLowerCase();
              const categoryLower = t.category.toLowerCase();
              return contestLower.includes(categoryLower) || categoryLower.includes(contestLower);
            });
          }
          
          if (matchingTeam) {
            teamMapping[team.contestType] = matchingTeam.id;
            console.log(`[bulk-import-club-rosters] ✅ Team-Mapping: "${team.contestType}" → "${matchingTeam.category}" (${matchingTeam.id})`);
          } else {
            console.warn(`[bulk-import-club-rosters] ⚠️ Kein Team-Match gefunden für "${team.contestType}"`);
          }
        });
        
        if (Object.keys(teamMapping).length === 0) {
          results.skipped++;
          results.clubs.push({
            clubNumber: club.clubNumber,
            clubName: club.clubName,
            status: 'skipped',
            reason: 'Keine Teams zugeordnet'
          });
          continue;
        }
        
        // Importiere Meldelisten (wenn nicht dryRun)
        if (!dryRun && club.clubId) {
          // Speichere Club-Nummer
          await saveClubNumber(supabase, club.clubId, club.clubNumber);
          
          // Importiere Meldelisten für jedes Team
          const savedRosters = [];
          const failedRosters = [];
          
          for (const [contestType, teamId] of Object.entries(teamMapping)) {
            const team = parseResult.teams.find(t => t.contestType === contestType);
            
            if (!team) {
              failedRosters.push({
                contestType,
                teamId,
                reason: 'Team nicht in Parse-Ergebnis gefunden'
              });
              continue;
            }
            
            if (!team.roster || team.roster.length === 0) {
              failedRosters.push({
                contestType,
                teamName: team.teamName,
                teamId,
                reason: `Keine Spieler in Meldeliste gefunden (Roster leer oder Parsing fehlgeschlagen)`,
                teamUrl: team.teamUrl
              });
              console.warn(`[bulk-import-club-rosters] ⚠️ Team "${contestType}" hat leere Meldeliste (${team.roster?.length || 0} Spieler)`);
              continue;
            }
            
            try {
              const saved = await saveTeamRoster(supabase, teamId, targetSeason, team.roster);
              savedRosters.push({
                teamName: team.teamName,
                contestType: contestType,
                total: saved.stats.total,
                matched: saved.stats.matched
              });
              
              // Pause zwischen Teams
              await new Promise(resolve => setTimeout(resolve, delayBetweenTeams));
            } catch (error) {
              console.error(`[bulk-import-club-rosters] ❌ Fehler beim Speichern der Meldeliste für Team ${team.teamName}:`, error);
              failedRosters.push({
                contestType,
                teamName: team.teamName,
                teamId,
                reason: `Fehler beim Speichern: ${error.message}`
              });
            }
          }
          
          // Warnung wenn Roster leer waren
          if (failedRosters.length > 0) {
            console.warn(`[bulk-import-club-rosters] ⚠️ ${failedRosters.length} Teams mit Problemen:`, failedRosters);
          }
          
          // Status basierend auf Erfolg
          const hasFailures = failedRosters.length > 0;
          const hasSuccesses = savedRosters.length > 0;
          
          if (hasFailures && !hasSuccesses) {
            results.failed++;
            results.clubs.push({
              clubNumber: club.clubNumber,
              clubName: club.clubName,
              status: 'failed',
              reason: `${failedRosters.length} Teams konnten nicht importiert werden`,
              failedTeams: failedRosters,
              teamsImported: 0,
              totalPlayers: 0,
              matchedPlayers: 0
            });
          } else if (hasFailures && hasSuccesses) {
            results.success++;
            results.clubs.push({
              clubNumber: club.clubNumber,
              clubName: club.clubName,
              status: 'partial',
              teamsImported: savedRosters.length,
              teamsFailed: failedRosters.length,
              totalPlayers: savedRosters.reduce((sum, r) => sum + (r.total || 0), 0),
              matchedPlayers: savedRosters.reduce((sum, r) => sum + (r.matched || 0), 0),
              failedTeams: failedRosters
            });
          } else {
            results.success++;
            results.clubs.push({
              clubNumber: club.clubNumber,
              clubName: club.clubName,
              status: 'success',
              teamsImported: savedRosters.length,
              totalPlayers: savedRosters.reduce((sum, r) => sum + (r.total || 0), 0),
              matchedPlayers: savedRosters.reduce((sum, r) => sum + (r.matched || 0), 0)
            });
          }
        } else {
          // Dry-Run: Nur zählen
          results.success++;
          results.clubs.push({
            clubNumber: club.clubNumber,
            clubName: club.clubName,
            status: 'dry-run',
            teamsFound: parseResult.teams.length,
            teamsMapped: Object.keys(teamMapping).length
          });
        }
        
        // Pause zwischen Vereinen
        if (i < clubsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenClubs));
        }
        
      } catch (error) {
        console.error(`[bulk-import-club-rosters] ❌ Fehler bei Verein ${club.clubName}:`, error);
        results.failed++;
        results.clubs.push({
          clubNumber: club.clubNumber,
          clubName: club.clubName,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('[bulk-import-club-rosters] ❌ Fehler:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return withCors(res, 200, {});
  }
  
  if (req.method !== 'POST') {
    return withCors(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { 
      targetSeason = 'Winter 2025/2026',
      maxClubs = null,
      delayBetweenClubs = 2000,
      delayBetweenTeams = 500,
      dryRun = true // Standard: Dry-Run
    } = req.body;
    
    console.log('[bulk-import-club-rosters] 📥 Request erhalten:', {
      targetSeason,
      maxClubs,
      dryRun
    });
    
    // Prüfe ob Funktionen verfügbar sind
    if (!parseClubPoolsPage || typeof parseClubPoolsPage !== 'function') {
      throw new Error('parseClubPoolsPage Funktion nicht verfügbar');
    }
    if (!saveTeamRoster || typeof saveTeamRoster !== 'function') {
      throw new Error('saveTeamRoster Funktion nicht verfügbar');
    }
    if (!saveClubNumber || typeof saveClubNumber !== 'function') {
      throw new Error('saveClubNumber Funktion nicht verfügbar');
    }
    
    let supabase;
    try {
      supabase = createSupabaseClient();
      console.log('[bulk-import-club-rosters] ✅ Supabase Client erstellt');
    } catch (supabaseError) {
      console.error('[bulk-import-club-rosters] ❌ Fehler beim Erstellen des Supabase Clients:', supabaseError);
      throw new Error(`Supabase Client Fehler: ${supabaseError.message}`);
    }
    
    // Führe Bulk-Import aus
    console.log('[bulk-import-club-rosters] 🚀 Starte Bulk-Import...');
    const results = await bulkImportClubRosters(supabase, targetSeason, {
      maxClubs,
      delayBetweenClubs,
      delayBetweenTeams,
      dryRun
    });
    console.log('[bulk-import-club-rosters] ✅ Bulk-Import abgeschlossen:', results);
    
    return withCors(res, 200, {
      success: true,
      ...results,
      message: dryRun 
        ? `Dry-Run: ${results.success} Vereine würden importiert werden`
        : `${results.success} Vereine erfolgreich importiert, ${results.failed} fehlgeschlagen, ${results.skipped} übersprungen`
    });
    
  } catch (error) {
    console.error('[bulk-import-club-rosters] ❌ Fehler:', error);
    console.error('[bulk-import-club-rosters] ❌ Stack:', error.stack);
    console.error('[bulk-import-club-rosters] ❌ Error Details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Sende detaillierte Fehlermeldung zurück
    const errorResponse = {
      success: false,
      error: error.message || 'Fehler beim Bulk-Import der Meldelisten',
      details: error.toString(),
      name: error.name
    };
    
    // In Development: Stack-Trace hinzufügen
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      errorResponse.stack = error.stack;
    }
    
    return withCors(res, 500, errorResponse);
  }
};

