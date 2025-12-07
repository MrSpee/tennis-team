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
 * Importiert Meldelisten für alle Vereine mit club_number
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
    // 1. Lade alle Teams mit club_number
    console.log('[bulk-import-club-rosters] 🔍 Lade Teams mit club_number...');
    const { data: teams, error: teamsError } = await supabase
      .from('team_info')
      .select('id, club_id, club_name, team_name, category, club_number, club_info!inner(id, name)')
      .not('club_number', 'is', null)
      .order('club_number', { ascending: true });
    
    if (teamsError) {
      throw new Error(`Fehler beim Laden der Teams: ${teamsError.message}`);
    }
    
    if (!teams || teams.length === 0) {
      return {
        ...results,
        message: 'Keine Teams mit club_number gefunden'
      };
    }
    
    // 2. Gruppiere Teams nach Club-Nummer
    const clubsMap = new Map();
    teams.forEach(team => {
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
    
    const clubs = Array.from(clubsMap.values());
    results.total = clubs.length;
    
    // Limit für Test-Zwecke
    const clubsToProcess = maxClubs ? clubs.slice(0, maxClubs) : clubs;
    
    console.log(`[bulk-import-club-rosters] 📊 ${clubsToProcess.length} Vereine mit club_number gefunden`);
    
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
          const matchingTeam = club.teams.find(t => t.category === team.contestType);
          if (matchingTeam) {
            teamMapping[team.contestType] = matchingTeam.id;
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
          for (const [contestType, teamId] of Object.entries(teamMapping)) {
            const team = parseResult.teams.find(t => t.contestType === contestType);
            if (team && team.roster && team.roster.length > 0) {
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
              }
            }
          }
          
          results.success++;
          results.clubs.push({
            clubNumber: club.clubNumber,
            clubName: club.clubName,
            status: 'success',
            teamsImported: Object.keys(teamMapping).length,
            totalPlayers: savedRosters.reduce((sum, r) => sum + (r.total || 0), 0),
            matchedPlayers: savedRosters.reduce((sum, r) => sum + (r.matched || 0), 0)
          });
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

