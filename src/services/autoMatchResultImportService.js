/**
 * Service: Auto Match Result Import Watcher
 * 
 * Empfehlung 3: Intelligenter Watcher für Match-Ergebnisse
 * 
 * Dieser Service:
 * 1. Prüft täglich Matches, die in den letzten 4 Tagen stattgefunden haben
 * 2. Versucht automatisch, Ergebnisse zu importieren (max. 4 Versuche)
 * 3. Zeigt Warnung im SuperAdmin Dashboard, wenn nach 4 Tagen noch kein Ergebnis verfügbar ist
 */

// API Base URL (lokal oder Production)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

/**
 * Berechnet die Anzahl der Tage seit dem Match
 */
function getDaysSinceMatch(matchDate) {
  const match = new Date(matchDate);
  const now = new Date();
  const diffTime = now.getTime() - match.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Prüft, ob heute bereits ein Import-Versuch für diesen Matchday gemacht wurde
 */
async function hasAttemptToday(supabase, matchdayId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('match_result_import_attempts')
    .select('id')
    .eq('matchday_id', matchdayId)
    .eq('attempt_date', today)
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.warn(`[autoMatchResultImport] Fehler beim Prüfen des Versuchs für ${matchdayId}:`, error);
    return false; // Bei Fehler: Versuch erlauben
  }
  
  return !!data;
}

/**
 * Speichert einen Import-Versuch
 */
async function recordAttempt(supabase, matchdayId, success, errorCode = null, errorMessage = null) {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('match_result_import_attempts')
    .upsert({
      matchday_id: matchdayId,
      attempt_date: today,
      success,
      error_code: errorCode,
      error_message: errorMessage
    }, {
      onConflict: 'matchday_id,attempt_date'
    });
  
  if (error) {
    console.warn(`[autoMatchResultImport] Fehler beim Speichern des Versuchs:`, error);
  }
}

/**
 * Zählt die Anzahl der bisherigen Versuche für einen Matchday
 */
async function getAttemptCount(supabase, matchdayId) {
  const { count, error } = await supabase
    .from('match_result_import_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('matchday_id', matchdayId);
  
  if (error) {
    console.warn(`[autoMatchResultImport] Fehler beim Zählen der Versuche:`, error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Findet Spieltage, die automatisch importiert werden sollten
 * - Nur Matches der letzten 4 Tage
 * - Nur Matches ohne Ergebnisse
 * - Nur Matches mit meeting_id
 * - Max. 4 Versuche pro Match
 */
export async function findMatchdaysForAutoImport(supabase) {
  const now = new Date();
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  // Erweitere auf 30 Tage zurück, um auch ältere Matches zu erfassen, die noch nie versucht wurden
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Finde alle vergangenen Matches mit meeting_id
  // WICHTIG: Erweitere auf 30 Tage, um auch ältere Matches zu erfassen, die noch nie versucht wurden
  const { data, error } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      meeting_id,
      status,
      home_team_id,
      away_team_id,
      home_team:home_team_id(id, club_name, team_name),
      away_team:away_team_id(id, club_name, team_name)
    `)
    .not('meeting_id', 'is', null)
    .gte('match_date', thirtyDaysAgo.toISOString())
    .lt('match_date', now.toISOString())
    .order('match_date', { ascending: false });
  
  if (error) {
    console.error('[autoMatchResultImport] Fehler beim Laden der Spieltage:', error);
    return [];
  }
  
  // Filtere nur die ohne Ergebnisse und prüfe Versuche
  const matchdaysToImport = [];
  for (const matchday of data || []) {
    // Prüfe ob bereits Ergebnisse vorhanden sind
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('id')
      .eq('matchday_id', matchday.id)
      .limit(1);
    
    if (resultsError) {
      console.warn(`[autoMatchResultImport] Fehler beim Prüfen der Ergebnisse für ${matchday.id}:`, resultsError.message);
      continue;
    }
    
    // Wenn bereits Ergebnisse vorhanden, überspringe
    if (results && results.length > 0) {
      continue;
    }
    
    // Prüfe Anzahl der Versuche
    const attemptCount = await getAttemptCount(supabase, matchday.id);
    if (attemptCount >= 4) {
      // Bereits 4 Versuche - überspringe (wird als Warnung angezeigt)
      continue;
    }
    
    // Prüfe ob heute bereits versucht wurde
    const attemptedToday = await hasAttemptToday(supabase, matchday.id);
    if (attemptedToday) {
      // Heute bereits versucht - überspringe
      continue;
    }
    
    const daysSinceMatch = getDaysSinceMatch(matchday.match_date);
    
    // ✅ KORRIGIERT: Versuche auch ältere Matches, wenn sie noch nie versucht wurden
    // Oder wenn sie weniger als 4 Versuche haben und innerhalb der letzten 4 Tage waren
    if (daysSinceMatch > 4) {
      // Älter als 4 Tage: Nur versuchen, wenn noch nie versucht wurde (attemptCount === 0)
      if (attemptCount > 0) {
        // Bereits versucht, aber älter als 4 Tage - überspringe (wird als Warnung angezeigt)
        continue;
      }
      // Noch nie versucht, auch wenn älter als 4 Tage - versuche es!
    }
    
    matchdaysToImport.push({
      ...matchday,
      daysSinceMatch,
      attemptCount
    });
  }
  
  return matchdaysToImport;
}

/**
 * Importiert Ergebnisse für einen einzelnen Spieltag
 */
export async function importMatchResultsForMatchday(supabase, matchday) {
  const homeTeamName = `${matchday.home_team?.club_name || ''} ${matchday.home_team?.team_name || ''}`.trim();
  const awayTeamName = `${matchday.away_team?.club_name || ''} ${matchday.away_team?.team_name || ''}`.trim();
  
  const daysSinceMatch = matchday.daysSinceMatch || getDaysSinceMatch(matchday.match_date);
  const attemptCount = matchday.attemptCount || await getAttemptCount(supabase, matchday.id);
  
  console.log(`[autoMatchResultImport] Versuch ${attemptCount + 1}/4: Importiere Ergebnisse für: ${homeTeamName} vs. ${awayTeamName} (${daysSinceMatch} Tage nach Match)`);
  
  try {
    const apiUrl = `${API_BASE_URL}/api/import/meeting-report`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: matchday.meeting_id,
        matchdayId: matchday.id,
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        apply: true
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      if (result.errorCode === 'MEETING_NOT_FOUND' || result.errorCode === 'MEETING_ID_NOT_AVAILABLE') {
        // Nicht kritisch - Meeting-Report ist noch nicht verfügbar
        await recordAttempt(supabase, matchday.id, false, result.errorCode, result.error);
        return { success: false, skipped: true, reason: result.errorCode };
      }
      await recordAttempt(supabase, matchday.id, false, 'HTTP_ERROR', result.error || `HTTP ${response.status}`);
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    
    if (!result.success) {
      await recordAttempt(supabase, matchday.id, false, 'IMPORT_FAILED', result.error);
      return { success: false, error: result.error };
    }
    
    if (result.applyResult) {
      const inserted = result.applyResult.inserted?.length || 0;
      const missingPlayers = result.applyResult.missingPlayers?.length || 0;
      
      // Erfolgreicher Import
      await recordAttempt(supabase, matchday.id, true);
      
      return { 
        success: true, 
        inserted, 
        missingPlayers 
      };
    } else {
      await recordAttempt(supabase, matchday.id, false, 'NO_RESULTS', 'Keine Ergebnisse gefunden');
      return { success: false, error: 'Keine Ergebnisse gefunden' };
    }
  } catch (error) {
    console.error(`[autoMatchResultImport] Fehler beim Import:`, error);
    await recordAttempt(supabase, matchday.id, false, 'EXCEPTION', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Führt den automatischen Import für alle gefundenen Spieltage durch
 * Wird täglich einmal aufgerufen (z.B. beim Dashboard-Load)
 */
export async function runAutoImport(supabase, options = {}) {
  const {
    delayBetweenImports = 2000 // 2 Sekunden Pause zwischen Imports
  } = options;
  
  console.log('[autoMatchResultImport] Starte täglichen Watcher-Import...');
  
  const matchdays = await findMatchdaysForAutoImport(supabase);
  
  if (matchdays.length === 0) {
    console.log('[autoMatchResultImport] Keine Spieltage zum Importieren gefunden (alle bereits versucht oder zu alt)');
    return {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };
  }
  
  console.log(`[autoMatchResultImport] ${matchdays.length} Spieltage gefunden für heute's Import-Versuch...`);
  
  const results = {
    total: matchdays.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  for (let i = 0; i < matchdays.length; i++) {
    const matchday = matchdays[i];
    
    const result = await importMatchResultsForMatchday(supabase, matchday);
    
    if (result.success) {
      results.success++;
      console.log(`[autoMatchResultImport] ✅ ${i + 1}/${matchdays.length}: ${result.inserted} Ergebnisse importiert (Tag ${matchday.daysSinceMatch + 1})`);
    } else if (result.skipped) {
      results.skipped++;
      console.log(`[autoMatchResultImport] ⏭️  ${i + 1}/${matchdays.length}: Übersprungen (${result.reason}) - Tag ${matchday.daysSinceMatch + 1}`);
    } else {
      results.failed++;
      results.errors.push({
        matchdayId: matchday.id,
        meetingId: matchday.meeting_id,
        error: result.error
      });
      console.log(`[autoMatchResultImport] ❌ ${i + 1}/${matchdays.length}: Fehler - ${result.error}`);
    }
    
    // Pause zwischen Imports
    if (i < matchdays.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenImports));
    }
  }
  
  console.log(`[autoMatchResultImport] Täglicher Import abgeschlossen: ${results.success} erfolgreich, ${results.skipped} übersprungen, ${results.failed} fehlgeschlagen`);
  
  return results;
}

/**
 * Findet Matches, die nach 4 Tagen noch keine Ergebnisse haben
 * Diese sollten als Warnung im SuperAdmin Dashboard angezeigt werden
 */
export async function findMatchdaysWithoutResultsAfter4Days(supabase) {
  const now = new Date();
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  
  // ✅ VERBESSERT: Finde alle Matches, die mehr als 4 Tage alt sind, aber noch keine Ergebnisse haben
  // WICHTIG: Prüfe auch Matchdays OHNE meeting_id, wenn sie in der Vergangenheit liegen
  const { data, error } = await supabase
    .from('matchdays')
    .select(`
      id,
      match_date,
      meeting_id,
      status,
      group_name,
      season,
      league,
      match_number,
      notes,
      home_team_id,
      away_team_id,
      home_team:home_team_id(id, club_name, team_name),
      away_team:away_team_id(id, club_name, team_name)
    `)
    // ✅ ENTFERNT: .not('meeting_id', 'is', null) - prüfe auch Matchdays ohne meeting_id
    .lt('match_date', fourDaysAgo.toISOString())
    .order('match_date', { ascending: false });
  
  if (error) {
    console.error('[autoMatchResultImport] Fehler beim Laden der Spieltage:', error);
    return [];
  }
  
  // Filtere nur die ohne Ergebnisse
  const matchdaysWithoutResults = [];
  for (const matchday of data || []) {
    // ✅ VERBESSERT: Prüfe nicht nur ob Einträge existieren, sondern ob Ergebnisse vollständig sind
    // Ein Ergebnis ist vollständig, wenn:
    // 1. Es existiert
    // 2. Es Spieler-IDs hat (home_player_id oder home_player1_id)
    // 3. Es Set-Ergebnisse hat (set1_home und set1_guest)
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('id, home_player_id, home_player1_id, set1_home, set1_guest, status')
      .eq('matchday_id', matchday.id);
    
    if (resultsError) {
      console.warn(`[autoMatchResultImport] Fehler beim Prüfen der Ergebnisse für ${matchday.id}:`, resultsError.message);
      continue;
    }
    
    // ✅ VERBESSERT: Prüfe ob Ergebnisse vollständig sind
    if (results && results.length > 0) {
      // Prüfe ob mindestens ein Ergebnis vollständig ist (hat Spieler UND Set-Ergebnisse)
      const hasCompleteResults = results.some(r => {
        const hasPlayers = r.home_player_id || r.home_player1_id;
        const hasSets = r.set1_home !== null && r.set1_guest !== null;
        return hasPlayers && hasSets;
      });
      
      // Wenn vollständige Ergebnisse vorhanden sind, überspringe
      if (hasCompleteResults) {
        continue;
      }
      
      // Wenn nur unvollständige Ergebnisse vorhanden sind, zähle als "ohne Ergebnisse"
      console.log(`[autoMatchResultImport] ⚠️ Matchday ${matchday.id} hat ${results.length} unvollständige Ergebnisse`);
    }
    
    // Prüfe Anzahl der Versuche
    const attemptCount = await getAttemptCount(supabase, matchday.id);
    const daysSinceMatch = getDaysSinceMatch(matchday.match_date);
    
    matchdaysWithoutResults.push({
      ...matchday,
      daysSinceMatch,
      attemptCount
    });
  }
  
  return matchdaysWithoutResults;
}

