import { supabase } from '../lib/supabaseClient';

/**
 * Automatisches Laden von Meldelisten für Teams, die in Matchdays vorkommen
 * Lädt Meldelisten im Hintergrund, wenn sie noch nicht existieren
 */

/**
 * Prüft ob eine Meldeliste für ein Team/Saison bereits existiert
 */
async function teamRosterExists(teamId, season) {
  try {
    const { count, error } = await supabase
      .from('team_roster')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('season', season);
    
    if (error) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Prüfen von team_roster für Team ${teamId}:`, error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.warn(`[autoTeamRosterImport] ⚠️ Exception beim Prüfen von team_roster:`, error);
    return false;
  }
}

/**
 * Holt die Team-Portrait-URL aus team_seasons
 */
async function getTeamPortraitUrl(teamId, season) {
  try {
    const { data, error } = await supabase
      .from('team_seasons')
      .select('source_url')
      .eq('team_id', teamId)
      .eq('season', season)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Laden von team_seasons für Team ${teamId}:`, error);
      return null;
    }
    
    // Prüfe ob source_url eine Team-Portrait-URL ist
    if (data?.source_url && data.source_url.includes('teamPortrait')) {
      return data.source_url;
    }
    
    return null;
  } catch (error) {
    console.warn(`[autoTeamRosterImport] ⚠️ Exception beim Laden von team_seasons:`, error);
    return null;
  }
}

/**
 * Parst und speichert eine Meldeliste für ein Team
 */
async function importTeamRoster(teamId, season, teamPortraitUrl) {
  try {
    console.log(`[autoTeamRosterImport] 🔄 Importiere Meldeliste für Team ${teamId}, Saison ${season}...`);
    
    const response = await fetch('/api/import/parse-team-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamPortraitUrl: teamPortraitUrl,
        teamId: teamId,
        season: season,
        apply: true // Speichere in DB
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.saved) {
      console.log(`[autoTeamRosterImport] ✅ Meldeliste importiert: ${result.saved.stats?.total || 0} Spieler (${result.saved.stats?.matched || 0} gematcht)`);
      return result.saved;
    } else {
      throw new Error(result.error || 'Import fehlgeschlagen');
    }
  } catch (error) {
    console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Importieren der Meldeliste für Team ${teamId}:`, error.message);
    return null;
  }
}

/**
 * Lädt automatisch Meldelisten für Teams, die in Matchdays vorkommen
 * @param {Array} matchdays - Array von Matchday-Objekten mit home_team_id, away_team_id, season
 */
export async function autoImportTeamRostersForMatchdays(matchdays) {
  if (!matchdays || matchdays.length === 0) {
    return;
  }
  
  console.log(`[autoTeamRosterImport] 🔍 Prüfe Meldelisten für ${matchdays.length} Matchdays...`);
  
  // Sammle alle eindeutigen Team/Saison-Kombinationen
  const teamSeasonMap = new Map();
  
  matchdays.forEach(matchday => {
    if (!matchday.season) return;
    
    const season = matchday.season;
    
    // Home Team
    if (matchday.home_team_id) {
      const key = `${matchday.home_team_id}:${season}`;
      if (!teamSeasonMap.has(key)) {
        teamSeasonMap.set(key, {
          teamId: matchday.home_team_id,
          season: season
        });
      }
    }
    
    // Away Team
    if (matchday.away_team_id) {
      const key = `${matchday.away_team_id}:${season}`;
      if (!teamSeasonMap.has(key)) {
        teamSeasonMap.set(key, {
          teamId: matchday.away_team_id,
          season: season
        });
      }
    }
  });
  
  console.log(`[autoTeamRosterImport] 📊 Gefunden: ${teamSeasonMap.size} eindeutige Team/Saison-Kombinationen`);
  
  // Prüfe für jede Kombination, ob Meldeliste existiert
  const importPromises = [];
  
  for (const [key, { teamId, season }] of teamSeasonMap) {
    // Prüfe ob Meldeliste bereits existiert
    const exists = await teamRosterExists(teamId, season);
    
    if (exists) {
      console.log(`[autoTeamRosterImport] ✅ Meldeliste bereits vorhanden für Team ${teamId}, Saison ${season}`);
      continue;
    }
    
    // Hole Team-Portrait-URL
    const teamPortraitUrl = await getTeamPortraitUrl(teamId, season);
    
    if (!teamPortraitUrl) {
      console.log(`[autoTeamRosterImport] ⚠️ Keine Team-Portrait-URL gefunden für Team ${teamId}, Saison ${season}`);
      continue;
    }
    
    // Importiere Meldeliste im Hintergrund (mit Verzögerung, um Server nicht zu überlasten)
    const delay = importPromises.length * 2000; // 2 Sekunden Abstand zwischen Imports
    
    const importPromise = new Promise(resolve => {
      setTimeout(async () => {
        const result = await importTeamRoster(teamId, season, teamPortraitUrl);
        resolve(result);
      }, delay);
    });
    
    importPromises.push(importPromise);
  }
  
  if (importPromises.length > 0) {
    console.log(`[autoTeamRosterImport] 🚀 Starte Import von ${importPromises.length} Meldelisten im Hintergrund...`);
    
    // Warte nicht auf alle Imports - lasse sie im Hintergrund laufen
    Promise.all(importPromises).then(results => {
      const successful = results.filter(r => r !== null).length;
      console.log(`[autoTeamRosterImport] ✅ ${successful}/${importPromises.length} Meldelisten erfolgreich importiert`);
    }).catch(error => {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Importieren von Meldelisten:`, error);
    });
  } else {
    console.log(`[autoTeamRosterImport] ✅ Alle Meldelisten bereits vorhanden`);
  }
}

/**
 * Lädt automatisch Meldelisten für ein einzelnes Team
 * @param {string} teamId - Team-ID
 * @param {string} season - Saison (z.B. "Winter 2025/26")
 */
export async function autoImportTeamRoster(teamId, season) {
  if (!teamId || !season) {
    return;
  }
  
  // Prüfe ob Meldeliste bereits existiert
  const exists = await teamRosterExists(teamId, season);
  if (exists) {
    console.log(`[autoTeamRosterImport] ✅ Meldeliste bereits vorhanden für Team ${teamId}, Saison ${season}`);
    return;
  }
  
  // Hole Team-Portrait-URL
  const teamPortraitUrl = await getTeamPortraitUrl(teamId, season);
  if (!teamPortraitUrl) {
    console.log(`[autoTeamRosterImport] ⚠️ Keine Team-Portrait-URL gefunden für Team ${teamId}, Saison ${season}`);
    return;
  }
  
  // Importiere Meldeliste
  await importTeamRoster(teamId, season, teamPortraitUrl);
}

