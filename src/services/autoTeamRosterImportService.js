import { supabase } from '../lib/supabaseClient';

/**
 * Automatisches Laden von Meldelisten für Teams, die in Matchdays vorkommen
 * Lädt Meldelisten im Hintergrund, wenn sie noch nicht existieren
 */

/**
 * Prüft ob eine Meldeliste für ein Team/Saison bereits existiert
 * UND ob alle Einträge bereits mit players_unified gematched sind (player_id vorhanden)
 * @returns {Object} { exists: boolean, fullyMatched: boolean, total: number, matched: number }
 */
async function teamRosterExists(teamId, season) {
  try {
    // Lade alle Einträge, um zu prüfen ob alle gematched sind
    const { data: rosterEntries, error } = await supabase
      .from('team_roster')
      .select('id, player_id')
      .eq('team_id', teamId)
      .eq('season', season);
    
    if (error) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Prüfen von team_roster für Team ${teamId}:`, error);
      return { exists: false, fullyMatched: false, total: 0, matched: 0 };
    }
    
    const total = rosterEntries?.length || 0;
    const matched = rosterEntries?.filter(r => r.player_id).length || 0;
    const fullyMatched = total > 0 && matched === total;
    
    return {
      exists: total > 0,
      fullyMatched: fullyMatched,
      total: total,
      matched: matched
    };
  } catch (error) {
    console.warn(`[autoTeamRosterImport] ⚠️ Exception beim Prüfen von team_roster:`, error);
    return { exists: false, fullyMatched: false, total: 0, matched: 0 };
  }
}

/**
 * Holt die Team-Portrait-URL aus team_seasons
 * Verbesserte Suche mit Fallbacks und Debug-Informationen
 */
async function getTeamPortraitUrl(teamId, season) {
  try {
    console.log(`[autoTeamRosterImport] 🔍 Suche Team-Portrait-URL für Team ${teamId}, Saison "${season}"`);
    
    // 1. Versuche exakte Suche (team_id + season + is_active)
    let { data, error } = await supabase
      .from('team_seasons')
      .select('source_url, season, is_active, league, group_name')
      .eq('team_id', teamId)
      .eq('season', season)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler bei exakter Suche (team_id + season + is_active):`, error);
    } else if (data) {
      console.log(`[autoTeamRosterImport] ✅ Exakter Match gefunden:`, {
        season: data.season,
        is_active: data.is_active,
        has_source_url: !!data.source_url,
        source_url: data.source_url, // ✅ NEU: Zeige tatsächliche URL
        source_url_type: data.source_url ? (data.source_url.includes('teamPortrait') ? 'teamPortrait' : 'other') : 'none'
      });
      
      // Prüfe ob source_url eine Team-Portrait-URL ist
      if (data?.source_url && data.source_url.includes('teamPortrait')) {
        console.log(`[autoTeamRosterImport] ✅ Team-Portrait-URL gefunden: ${data.source_url}`);
        return data.source_url;
      }
      
      // ✅ NEU: Wenn source_url vorhanden, aber nicht teamPortrait, zeige sie trotzdem für Debug
      if (data?.source_url) {
        console.log(`[autoTeamRosterImport] ⚠️ source_url vorhanden, aber nicht teamPortrait: ${data.source_url}`);
        console.log(`[autoTeamRosterImport] 💡 Tipp: Diese URL muss zu einer teamPortrait-URL konvertiert werden`);
      }
    } else {
      console.log(`[autoTeamRosterImport] ℹ️ Kein exakter Match gefunden, versuche Fallbacks...`);
    }
    
    // 2. Fallback: Suche ohne is_active Filter
    if (!data || !data.source_url || !data.source_url.includes('teamPortrait')) {
      console.log(`[autoTeamRosterImport] 🔄 Fallback 1: Suche ohne is_active Filter...`);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('team_seasons')
        .select('source_url, season, is_active, league, group_name')
        .eq('team_id', teamId)
        .eq('season', season)
        .maybeSingle();
      
      if (fallbackError) {
        console.warn(`[autoTeamRosterImport] ⚠️ Fehler bei Fallback 1:`, fallbackError);
      } else if (fallbackData) {
        console.log(`[autoTeamRosterImport] ✅ Fallback 1 Match gefunden:`, {
          season: fallbackData.season,
          is_active: fallbackData.is_active,
          has_source_url: !!fallbackData.source_url,
          source_url_type: fallbackData.source_url ? (fallbackData.source_url.includes('teamPortrait') ? 'teamPortrait' : 'other') : 'none'
        });
        
        if (fallbackData?.source_url && fallbackData.source_url.includes('teamPortrait')) {
          console.log(`[autoTeamRosterImport] ✅ Team-Portrait-URL gefunden (Fallback 1): ${fallbackData.source_url}`);
          return fallbackData.source_url;
        }
      }
    }
    
    // 3. Fallback: Suche alle team_seasons Einträge für dieses Team (für Debug)
    console.log(`[autoTeamRosterImport] 🔄 Fallback 2: Zeige alle team_seasons Einträge für Team ${teamId}...`);
    const { data: allSeasons, error: allSeasonsError } = await supabase
      .from('team_seasons')
      .select('season, is_active, source_url, league, group_name')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    if (allSeasonsError) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Laden aller Seasons:`, allSeasonsError);
    } else if (allSeasons && allSeasons.length > 0) {
      console.log(`[autoTeamRosterImport] 📊 Gefundene team_seasons Einträge für Team ${teamId}:`, allSeasons.map(s => ({
        season: s.season,
        is_active: s.is_active,
        has_source_url: !!s.source_url,
        source_url: s.source_url, // ✅ NEU: Zeige tatsächliche URL
        source_url_type: s.source_url ? (s.source_url.includes('teamPortrait') ? 'teamPortrait' : 'other') : 'none',
        league: s.league,
        group_name: s.group_name
      })));
      
      // Versuche ähnliche Season-Formate zu finden
      const normalizedSeason = season.toLowerCase().trim();
      const matchingSeason = allSeasons.find(s => {
        const normalizedS = s.season?.toLowerCase().trim();
        return normalizedS === normalizedSeason || 
               normalizedS?.includes(normalizedSeason) || 
               normalizedSeason.includes(normalizedS);
      });
      
      if (matchingSeason?.source_url && matchingSeason.source_url.includes('teamPortrait')) {
        console.log(`[autoTeamRosterImport] ✅ Team-Portrait-URL gefunden (Fallback 2, ähnliche Season): ${matchingSeason.source_url}`);
        return matchingSeason.source_url;
      }
    } else {
      console.log(`[autoTeamRosterImport] ⚠️ Keine team_seasons Einträge gefunden für Team ${teamId}`);
    }
    
    // 4. Fallback: Prüfe ob Team überhaupt existiert
    const { data: teamInfo, error: teamError } = await supabase
      .from('team_info')
      .select('id, club_name, team_name, category')
      .eq('id', teamId)
      .maybeSingle();
    
    if (teamError) {
      console.warn(`[autoTeamRosterImport] ⚠️ Fehler beim Laden der Team-Info:`, teamError);
    } else if (teamInfo) {
      console.log(`[autoTeamRosterImport] ℹ️ Team-Info:`, {
        club_name: teamInfo.club_name,
        team_name: teamInfo.team_name,
        category: teamInfo.category
      });
    } else {
      console.warn(`[autoTeamRosterImport] ⚠️ Team ${teamId} existiert nicht in team_info!`);
    }
    
    console.log(`[autoTeamRosterImport] ❌ Keine Team-Portrait-URL gefunden für Team ${teamId}, Saison "${season}"`);
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
    // Prüfe ob Meldeliste bereits existiert UND vollständig gematched ist
    const rosterStatus = await teamRosterExists(teamId, season);
    
    if (rosterStatus.fullyMatched) {
      console.log(`[autoTeamRosterImport] ✅ Meldeliste vollständig gematched für Team ${teamId}, Saison ${season} (${rosterStatus.matched}/${rosterStatus.total})`);
      continue; // Keine weitere Aktion nötig
    }
    
    if (rosterStatus.exists) {
      console.log(`[autoTeamRosterImport] ⚠️ Meldeliste existiert, aber nicht vollständig gematched für Team ${teamId}, Saison ${season} (${rosterStatus.matched}/${rosterStatus.total})`);
      // Weiter mit Import, um fehlende Matches zu vervollständigen
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
  
  // Prüfe ob Meldeliste bereits existiert UND vollständig gematched ist
  const rosterStatus = await teamRosterExists(teamId, season);
  
  if (rosterStatus.fullyMatched) {
    console.log(`[autoTeamRosterImport] ✅ Meldeliste vollständig gematched für Team ${teamId}, Saison ${season} (${rosterStatus.matched}/${rosterStatus.total}) - keine weitere Aktion nötig`);
    return; // Keine weitere Aktion, da bereits vollständig gematched
  }
  
  if (rosterStatus.exists) {
    console.log(`[autoTeamRosterImport] ⚠️ Meldeliste existiert, aber nicht vollständig gematched für Team ${teamId}, Saison ${season} (${rosterStatus.matched}/${rosterStatus.total}) - versuche fehlende Matches`);
    // Weiter mit Import, um fehlende Matches zu vervollständigen
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

