/**
 * Vercel Cron Job: Automatische meeting_id und Ergebnis-Update
 * 
 * Läuft täglich um 14:00 UTC (0 14 * * *)
 * 
 * Funktionalität:
 * 1. Findet alle vergangenen Matchdays ohne meeting_id (max. 50)
 * 2. Gruppiert nach source_url aus team_seasons
 * 3. Scraped nuLiga für jede Gruppe
 * 4. Matcht Matches und aktualisiert meeting_id
 * 5. Findet Matchdays mit meeting_id aber ohne Ergebnisse (max. 50)
 * 6. Holt Ergebnisse via meeting-report API
 * 7. Loggt Ergebnisse und sendet Email bei Fehlern
 */

const { createSupabaseClient } = require('../_lib/supabaseAdmin');

// ✅ DIREKTE INTEGRATION: Importiere Funktionen für Meeting-Report-Verarbeitung
// Umgeht HTTP-Requests und löst HTTP 401 Problem
let scrapeMeetingReport = null;
let applyMeetingResults = null;

// Lazy Load: Lade Module nur wenn benötigt
async function loadMeetingReportFunctions() {
  if (!scrapeMeetingReport) {
    const nuligaScraper = await import('../../lib/nuligaScraper.mjs');
    scrapeMeetingReport = nuligaScraper.scrapeMeetingReport;
  }
  if (!applyMeetingResults) {
    const meetingReportModule = require('../import/meeting-report');
    applyMeetingResults = meetingReportModule.applyMeetingResults;
  }
}

// Helper: Normalisiere String (für Team-Matching)
function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Normalisiere Kategorie (aus meeting-report.js)
function normalizeCategory(category) {
  if (!category || typeof category !== 'string') {
    return category;
  }
  
  const trimmed = category.trim();
  const match = trimmed.match(/^(Damen|Herren)\s+(\d+)$/i);
  
  if (match) {
    const gender = match[1];
    const number = parseInt(match[2], 10);
    if (number >= 1 && number <= 3) {
      return gender;
    }
  }
  
  return trimmed;
}

// Helper: Berechne Similarity (vereinfacht - Dice Coefficient)
function diceCoefficient(str1, str2) {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  
  const bigrams1 = new Set();
  const bigrams2 = new Set();
  
  for (let i = 0; i < norm1.length - 1; i++) {
    bigrams1.add(norm1.substr(i, 2));
  }
  for (let i = 0; i < norm2.length - 1; i++) {
    bigrams2.add(norm2.substr(i, 2));
  }
  
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) intersection++;
  }
  
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

// Helper: Calculate Similarity (aus matchdayImportService)
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (normalizeString(str1) === normalizeString(str2)) return 1.0;
  return diceCoefficient(str1, str2);
}

// Helper: Build Team Label
function buildTeamLabel(team) {
  if (!team) return '';
  const clubName = team.club_name || '';
  const teamName = team.team_name || '';
  return `${clubName} ${teamName}`.trim();
}

// Helper: Get League Overview URL
async function getLeagueOverviewUrl(supabase, league, groupName, season) {
  let baseUrl;
  let tab = 2;
  
  if (league && league.includes('Köln-Leverkusen')) {
    baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
    
    const categoryMatch = league.match(/(Damen|Herren)(?:\s+(\d+))?/i);
    let categoryForTab = categoryMatch ? categoryMatch[1] : '';
    if (categoryMatch && categoryMatch[2]) {
      const number = parseInt(categoryMatch[2], 10);
      if (number >= 30) {
        categoryForTab = `${categoryMatch[1]} ${number}`;
      }
    }
    
    if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(categoryForTab)) {
      tab = 3;
    }
    
    return `${baseUrl}&tab=${tab}`;
  } else {
    baseUrl = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=TVM+Winter+2025%2F2026';
    
    try {
      const { data: teamSeason } = await supabase
        .from('team_seasons')
        .select('team_id')
        .eq('group_name', groupName)
        .eq('season', season)
        .eq('league', league)
        .limit(1)
        .maybeSingle();
      
      if (teamSeason?.team_id) {
        const { data: teamInfo } = await supabase
          .from('team_info')
          .select('category')
          .eq('id', teamSeason.team_id)
          .maybeSingle();
        
        if (teamInfo?.category) {
          const normalizedCategory = normalizeCategory(teamInfo.category);
          if (/Herren\s+[3-7]\d|Damen\s+[3-6]\d/.test(normalizedCategory)) {
            tab = 3;
          }
        }
      }
    } catch (error) {
      console.warn('[update-meeting-ids] Fehler beim Laden der Kategorie:', error.message);
    }
    
    return `${baseUrl}&tab=${tab}`;
  }
}

// Helper: Resolve Group ID from group_name
function resolveGroupId(groupName) {
  if (!groupName) return null;
  const match = groupName.match(/Gr\.\s*(\d+)/i) || groupName.match(/(\d{3})/);
  return match ? match[1] : null;
}

// Helper: Sende Email bei Fehlern (vereinfacht - nur Logging für jetzt)
async function sendErrorEmail(summary) {
  // TODO: Implementiere Email-Versand
  // Optionen:
  // 1. Supabase Edge Function für Email
  // 2. Externer Service (SendGrid, Resend, etc.)
  // 3. Environment Variable: ADMIN_EMAIL
  
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.warn('[update-meeting-ids] ⚠️ ADMIN_EMAIL nicht gesetzt - Email wird nicht gesendet');
    console.error('[update-meeting-ids] ❌ ERROR SUMMARY:', JSON.stringify(summary, null, 2));
    return;
  }
  
  // TODO: Implementiere Email-Versand hier
  // Für jetzt: Nur Console-Logging
  console.error('[update-meeting-ids] ❌ ERROR SUMMARY (sollte an ' + adminEmail + ' gesendet werden):', JSON.stringify(summary, null, 2));
}

// Helper: Logge Zusammenfassung in Datenbank
async function logCronJobResult(supabase, summary) {
  // TODO: Erstelle cron_job_logs Tabelle oder verwende bestehende Logging-Tabelle
  // Für jetzt: Nur Console-Logging
  
  try {
    // Bestimme Status basierend auf Ergebnis
    let status = 'success';
    if (summary.error || summary.failed > 0 || summary.resultsFailed > 0) {
      status = 'error';
    } else if (summary.updated === 0 && summary.resultsUpdated === 0 && summary.totalProcessed === 0 && summary.resultsProcessed === 0) {
      status = 'warning';
    }
    
    // Erstelle Summary-Objekt für JSONB
    const summaryJson = {
      resultsProcessed: summary.resultsProcessed || 0,
      resultsUpdated: summary.resultsUpdated || 0,
      resultsFailed: summary.resultsFailed || 0,
      resultsSkipped: summary.resultsSkipped || 0,
    };
    
    // Speichere in Datenbank
    const { error } = await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'update-meeting-ids',
        start_time: summary.startTime,
        end_time: summary.endTime,
        status: status,
        total_processed: summary.totalProcessed || 0,
        updated: summary.updated || 0,
        failed: summary.failed || 0,
        skipped: summary.skipped || 0,
        duration_ms: summary.durationMs || 0,
        message: summary.message || null,
        summary: summaryJson,
        errors: summary.errors && summary.errors.length > 0 ? summary.errors : null
      });
    
    if (error) {
      console.error('[update-meeting-ids] ❌ Fehler beim Speichern des Logs:', error);
    } else {
      console.log('[update-meeting-ids] ✅ Cron Job Log gespeichert:', {
        status,
        totalProcessed: summary.totalProcessed || 0,
        updated: summary.updated || 0,
        failed: summary.failed || 0,
        duration: summary.durationMs ? `${(summary.durationMs / 1000).toFixed(2)}s` : 'N/A'
      });
    }
  } catch (error) {
    console.error('[update-meeting-ids] ❌ Fehler in logCronJobResult:', error);
    // Fehler beim Logging sollte den Cron-Job nicht abbrechen
  }
  
  // Console-Logging bleibt für Debugging
  console.log('[update-meeting-ids] 📊 Cron Job Zusammenfassung:', {
    startTime: summary.startTime,
    endTime: summary.endTime,
    duration: summary.durationMs ? `${(summary.durationMs / 1000).toFixed(2)}s` : 'N/A',
    totalProcessed: summary.totalProcessed,
    updated: summary.updated,
    failed: summary.failed,
    skipped: summary.skipped,
    message: summary.message || null,
    error: summary.error || null,
    errorsCount: summary.errors?.length || 0,
    resultsProcessed: summary.resultsProcessed || 0,
    resultsUpdated: summary.resultsUpdated || 0,
    resultsFailed: summary.resultsFailed || 0,
    resultsSkipped: summary.resultsSkipped || 0,
  });
}

// Schritt 2: Update Ergebnisse (hole Scores für Matchdays mit meeting_id)
async function updateScores(supabase) {
  // ✅ DIREKTE INTEGRATION: Lade Meeting-Report-Funktionen
  await loadMeetingReportFunctions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const summary = {
    totalProcessed: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // Finde Matchdays mit meeting_id aber ohne home_score/away_score
    const { data: matchdays, error: fetchError } = await supabase
      .from('matchdays')
      .select(`
        id,
        match_date,
        meeting_id,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        final_score,
        status,
        home_team:team_info!matchdays_home_team_id_fkey(club_name, team_name),
        away_team:team_info!matchdays_away_team_id_fkey(club_name, team_name)
      `)
      .not('meeting_id', 'is', null)
      .lt('match_date', today.toISOString())
      .neq('status', 'cancelled')
      .neq('status', 'postponed')
      .or('home_score.is.null,away_score.is.null')
      .order('match_date', { ascending: false })
      .limit(50); // Batch-Größe: 50 Matchdays pro täglichem Lauf
    
    if (fetchError) {
      throw new Error(`Fehler beim Laden der Matchdays: ${fetchError.message}`);
    }
    
    if (!matchdays || matchdays.length === 0) {
      summary.message = 'Keine Matchdays mit meeting_id aber ohne Scores gefunden.';
      return summary;
    }
    
    summary.totalProcessed = matchdays.length;
    console.log(`[update-meeting-ids] 🔍 Verarbeite ${matchdays.length} Matchdays für Ergebnis-Update...`);
    
    // ✅ DIREKTE INTEGRATION: Nutze Meeting-Report-Funktionen direkt (umgeht HTTP 401)
    for (const matchday of matchdays) {
      try {
        const homeTeamName = matchday.home_team 
          ? `${matchday.home_team.club_name || ''} ${matchday.home_team.team_name || ''}`.trim()
          : 'Unbekannt';
        const awayTeamName = matchday.away_team
          ? `${matchday.away_team.club_name || ''} ${matchday.away_team.team_name || ''}`.trim()
          : 'Unbekannt';
        
        console.log(`[update-meeting-ids] 📥 Hole Ergebnisse für: ${homeTeamName} vs. ${awayTeamName} (meeting_id: ${matchday.meeting_id})`);
        
        // Schritt 1: Scrape Meeting-Report direkt
        const meetingData = await scrapeMeetingReport({
          meetingId: matchday.meeting_id
        });
        
        if (!meetingData || ((!meetingData.singles || meetingData.singles.length === 0) && (!meetingData.doubles || meetingData.doubles.length === 0))) {
          summary.skipped++;
          console.log(`[update-meeting-ids] ⏭️ Meeting-Report enthält keine Matches für Matchday ${matchday.id}`);
          continue;
        }
        
        // Schritt 2: Wende Ergebnisse direkt an
        const applyResult = await applyMeetingResults({
          supabase,
          matchdayId: matchday.id,
          singles: meetingData.singles || [],
          doubles: meetingData.doubles || [],
          metadata: meetingData.metadata || { homeTeam: homeTeamName, awayTeam: awayTeamName }
        });
        
        if (applyResult.error && applyResult.inserted?.length === 0) {
          summary.failed++;
          summary.errors.push({
            type: 'RESULTS_ERROR',
            matchdayId: matchday.id,
            error: applyResult.error,
            errorDetails: applyResult.errorDetails
          });
          console.error(`[update-meeting-ids] ❌ Fehler beim Anwenden der Ergebnisse für Matchday ${matchday.id}:`, applyResult.error);
          continue;
        }
        
        // Erfolgreich
        summary.updated++;
        const inserted = applyResult.inserted?.length || 0;
        console.log(`[update-meeting-ids] ✅ Ergebnisse für Matchday ${matchday.id} erfolgreich importiert (${inserted} Match-Results)`);
        
      } catch (matchdayError) {
        summary.failed++;
        summary.errors.push({
          matchdayId: matchday.id,
          error: matchdayError.message,
          stack: matchdayError.stack
        });
        console.error(`[update-meeting-ids] ❌ Fehler bei Matchday ${matchday.id}:`, matchdayError);
        // Weiter mit nächstem Matchday
      }
    }
    
    return summary;
    
  } catch (error) {
    console.error('[update-meeting-ids] ❌ Fehler in updateScores:', error);
    summary.error = error.message;
    summary.errors.push({
      type: 'EXCEPTION',
      message: error.message,
      stack: error.stack
    });
    return summary;
  }
}

// Hauptfunktion: Update meeting_ids und Ergebnisse
async function updateMeetingIds() {
  const supabase = createSupabaseClient(true);
  const startTime = new Date();
  
  const summary = {
    startTime: startTime.toISOString(),
    totalProcessed: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Bestimme Base URL für interne API-Calls (wird für beide Schritte benötigt)
  // ✅ FIX: Verwende VERCEL_PROJECT_PRODUCTION_URL als Fallback für Production
  const BASE_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.VERCEL_PROJECT_PRODUCTION_URL 
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : (process.env.VERCEL_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://tennis-team-gamma.vercel.app')); // Fallback zu Production URL
  
  console.log(`[update-meeting-ids] 🔗 Base URL für API-Calls: ${BASE_URL}`);
  
  try {
    // 1. Finde alle vergangenen Matchdays ohne meeting_id und ohne Detailsergebnisse
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Schritt 1: Finde Matchdays OHNE meeting_id (unabhängig von match_results)
    // WICHTIG: Wir wollen ALLE ohne meeting_id holen, auch wenn sie bereits match_results haben
    // (meeting_id ist nötig, um weitere/aktuelle Ergebnisse zu holen)
    const { data: matchdays, error: fetchError } = await supabase
      .from('matchdays')
      .select(`
        id,
        match_date,
        meeting_id,
        group_name,
        home_team_id,
        away_team_id,
        season,
        league
      `)
      .is('meeting_id', null)
      .lt('match_date', today.toISOString())
      // Kein Status-Filter (wie Dashboard) - auch cancelled/postponed können meeting_ids brauchen
      .order('match_date', { ascending: false })
      .limit(50); // Batch-Größe: 50 Matchdays pro täglichem Lauf
    
    if (fetchError) {
      throw new Error(`Fehler beim Laden der Matchdays: ${fetchError.message}`);
    }
    
    if (!matchdays || matchdays.length === 0) {
      summary.message = 'Keine Matchdays ohne meeting_id gefunden.';
      return summary;
    }
    
    // Verwende alle gefundenen Matchdays (ohne zusätzliche Filterung nach match_results)
    const matchdaysWithoutResults = matchdays;
    
    summary.totalProcessed = matchdaysWithoutResults.length;
    console.log(`[update-meeting-ids] 🔍 Verarbeite ${matchdaysWithoutResults.length} Matchdays...`);
    
    // 2. Lade Teams für Team-Labels
    const teamIds = new Set();
    matchdaysWithoutResults.forEach(md => {
      if (md.home_team_id) teamIds.add(md.home_team_id);
      if (md.away_team_id) teamIds.add(md.away_team_id);
    });
    
    const { data: teams, error: teamsError } = await supabase
      .from('team_info')
      .select('id, club_name, team_name, category')
      .in('id', Array.from(teamIds));
    
    if (teamsError) {
      throw new Error(`Fehler beim Laden der Teams: ${teamsError.message}`);
    }
    
    const teamById = new Map();
    (teams || []).forEach(team => {
      teamById.set(team.id, team);
    });
    
    // 3. Lade source_url aus team_seasons
    const { data: teamSeasons, error: teamSeasonsError } = await supabase
      .from('team_seasons')
      .select('group_name, season, league, source_url')
      .in('group_name', Array.from(new Set(matchdaysWithoutResults.map(md => md.group_name).filter(Boolean))))
      .in('season', Array.from(new Set(matchdaysWithoutResults.map(md => md.season).filter(Boolean))))
      .in('league', Array.from(new Set(matchdaysWithoutResults.map(md => md.league).filter(Boolean))));
    
    if (teamSeasonsError) {
      console.warn('[update-meeting-ids] ⚠️ Fehler beim Laden der team_seasons:', teamSeasonsError);
    }
    
    const urlMap = new Map();
    (teamSeasons || []).forEach(ts => {
      const key = `${ts.group_name}::${ts.season}::${ts.league}`;
      if (ts.source_url && !urlMap.has(key)) {
        urlMap.set(key, ts.source_url);
      }
    });
    
    // 4. Gruppiere nach source_url
    const groupedByUrl = new Map();
    matchdaysWithoutResults.forEach(md => {
      const key = md.group_name && md.season && md.league 
        ? `${md.group_name}::${md.season}::${md.league}` 
        : null;
      const url = key && urlMap.has(key) ? urlMap.get(key) : 'default';
      if (!groupedByUrl.has(url)) {
        groupedByUrl.set(url, []);
      }
      groupedByUrl.get(url).push(md);
    });
    
    // 5. Für jede URL-Gruppe: Scrape nuLiga
    // WICHTIG: Nutze scrape-nuliga API (intern über fetch)
    // Da wir server-side sind, können wir die API direkt aufrufen
    
    for (const [sourceUrl, matchdays] of groupedByUrl.entries()) {
      // Gruppiere nach groupId
      const groupIdToMatchdays = new Map();
      
      matchdays.forEach(md => {
        const groupId = resolveGroupId(md.group_name);
        if (groupId) {
          if (!groupIdToMatchdays.has(groupId)) {
            groupIdToMatchdays.set(groupId, []);
          }
          groupIdToMatchdays.get(groupId).push(md);
        }
      });
      
      if (groupIdToMatchdays.size === 0) {
        summary.failed += matchdays.length;
        summary.errors.push({ url: sourceUrl, error: 'Keine Gruppen-IDs gefunden' });
        continue;
      }
      
      // Für jede Gruppe: Scrape nuLiga
      for (const [groupId, groupMatchdays] of groupIdToMatchdays.entries()) {
        try {
          // Bestimme leagueOverviewUrl
          const firstMatchday = groupMatchdays[0];
          if (!firstMatchday) continue;
          
          let leagueOverviewUrl = null;
          if (sourceUrl && sourceUrl !== 'default') {
            // TODO: Parse sourceUrl und konvertiere zu leagueOverviewUrl (wie in Frontend)
            // Für jetzt: Bestimme basierend auf Liga
            leagueOverviewUrl = await getLeagueOverviewUrl(supabase, firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
          } else {
            leagueOverviewUrl = await getLeagueOverviewUrl(supabase, firstMatchday.league, firstMatchday.group_name, firstMatchday.season);
          }
          
          if (!leagueOverviewUrl) {
            summary.failed += groupMatchdays.length;
            summary.errors.push({ groupId, error: 'Konnte leagueOverviewUrl nicht bestimmen' });
            continue;
          }
          
          // Rufe scrape-nuliga API auf
          // WICHTIG: Da wir server-side sind, müssen wir die API über HTTP aufrufen
          // Oder: Nutze die Scraper-Logik direkt (komplexer wegen ES modules)
          // Für jetzt: Nutze API über HTTP
          
          const scrapeUrl = `${BASE_URL}/api/import/scrape-nuliga`;
          const scrapeResponse = await fetch(scrapeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groups: groupId,
              leagueUrl: leagueOverviewUrl,
              includeMatches: true
            })
          });
          
          const scrapeText = await scrapeResponse.text();
          let scrapeData = null;
          try {
            scrapeData = scrapeText ? JSON.parse(scrapeText) : null;
          } catch (parseError) {
            summary.failed += groupMatchdays.length;
            summary.errors.push({ groupId, error: 'Scrape-Antwort konnte nicht geparst werden' });
            continue;
          }
          
          if (!scrapeResponse.ok || !scrapeData?.success) {
            summary.failed += groupMatchdays.length;
            summary.errors.push({ groupId, error: scrapeData?.error || `HTTP ${scrapeResponse.status}` });
            continue;
          }
          
          // Finde passende Gruppe in Ergebnissen
          const details = Array.isArray(scrapeData.details) ? scrapeData.details : [];
          const foundGroupDetail = details.find(entry => {
            const entryGroupId = entry.group?.groupId ? String(entry.group.groupId) : null;
            const normalizedEntryId = entryGroupId ? String(parseInt(entryGroupId, 10)) : null;
            const normalizedSearchId = String(parseInt(groupId, 10));
            return normalizedEntryId === normalizedSearchId;
          });
          
          if (!foundGroupDetail || !foundGroupDetail.matches || foundGroupDetail.matches.length === 0) {
            summary.failed += groupMatchdays.length;
            summary.errors.push({ groupId, error: 'Keine Matches in nuLiga gefunden' });
            continue;
          }
          
          // Match Matches und aktualisiere meeting_id
          for (const matchday of groupMatchdays) {
            const homeTeam = teamById.get(matchday.home_team_id);
            const awayTeam = teamById.get(matchday.away_team_id);
            
            if (!homeTeam || !awayTeam) {
              summary.failed++;
              summary.errors.push({ matchdayId: matchday.id, error: 'Teams nicht gefunden' });
              continue;
            }
            
            const homeLabel = buildTeamLabel(homeTeam);
            const awayLabel = buildTeamLabel(awayTeam);
            const matchDateKey = matchday.match_date ? new Date(matchday.match_date).toISOString().split('T')[0] : null;
            
            // Finde passendes Match
            const normalizedHomeLabel = normalizeString(homeLabel);
            const normalizedAwayLabel = normalizeString(awayLabel);
            
            const candidates = foundGroupDetail.matches
              .map(m => {
                const mDate = m.matchDateIso ? new Date(m.matchDateIso).toISOString().split('T')[0] : null;
                const normalizedMHome = normalizeString(m.homeTeam || '');
                const normalizedMAway = normalizeString(m.awayTeam || '');
                
                const homeSimilarity = calculateSimilarity(normalizedHomeLabel, normalizedMHome);
                const awaySimilarity = calculateSimilarity(normalizedAwayLabel, normalizedMAway);
                const homeSimilarityReversed = calculateSimilarity(normalizedHomeLabel, normalizedMAway);
                const awaySimilarityReversed = calculateSimilarity(normalizedAwayLabel, normalizedMHome);
                
                const dateMatch = mDate === matchDateKey;
                const hasMeetingId = !!m.meetingId;
                
                const normalScore = (homeSimilarity + awaySimilarity) / 2;
                const reversedScore = (homeSimilarityReversed + awaySimilarityReversed) / 2;
                const maxScore = Math.max(normalScore, reversedScore);
                
                const score = dateMatch 
                  ? (maxScore >= 0.99 && !hasMeetingId) 
                    ? maxScore * 0.95
                    : (hasMeetingId ? maxScore : 0)
                  : 0;
                
                return { match: m, dateMatch, hasMeetingId, score };
              })
              .filter(c => c.dateMatch)
              .sort((a, b) => {
                if (Math.abs(a.score - b.score) > 0.01) {
                  return b.score - a.score;
                }
                if (a.hasMeetingId !== b.hasMeetingId) {
                  return a.hasMeetingId ? -1 : 1;
                }
                return 0;
              });
            
            const bestCandidate = candidates.find(c => 
              (c.score >= 0.95) || (c.hasMeetingId && c.score > 0.7)
            );
            
            if (bestCandidate && bestCandidate.match.meetingId) {
              // Update meeting_id
              const { error: updateError } = await supabase
                .from('matchdays')
                .update({ 
                  meeting_id: bestCandidate.match.meetingId,
                  meeting_report_url: bestCandidate.match.meetingReportUrl || null
                })
                .eq('id', matchday.id);
              
              if (updateError) {
                summary.failed++;
                summary.errors.push({ 
                  matchdayId: matchday.id, 
                  error: `DB-Update fehlgeschlagen: ${updateError.message}`
                });
              } else {
                summary.updated++;
                console.log(`[update-meeting-ids] ✅ meeting_id ${bestCandidate.match.meetingId} für Matchday ${matchday.id} aktualisiert`);
              }
            } else {
              summary.skipped++;
            }
          }
          
        } catch (groupError) {
          summary.failed += groupMatchdays.length;
          summary.errors.push({ 
            groupId, 
            error: groupError.message,
            stack: groupError.stack
          });
          console.error(`[update-meeting-ids] ❌ Fehler bei Gruppe ${groupId}:`, groupError);
        }
      }
    }
    
    summary.message = `${summary.updated} meeting_ids aktualisiert, ${summary.failed} fehlgeschlagen, ${summary.skipped} übersprungen`;
    
    // Schritt 2: Hole Ergebnisse für Matchdays mit meeting_id aber ohne Scores
    // WICHTIG: Fehler in Schritt 2 brechen Schritt 1 nicht ab (isolierte Ausführung)
    try {
      const resultsSummary = await updateScores(supabase);
      
      // Merge Ergebnisse in summary
      summary.resultsProcessed = resultsSummary.totalProcessed || 0;
      summary.resultsUpdated = resultsSummary.updated || 0;
      summary.resultsFailed = resultsSummary.failed || 0;
      summary.resultsSkipped = resultsSummary.skipped || 0;
      
      if (resultsSummary.errors && resultsSummary.errors.length > 0) {
        summary.errors = summary.errors || [];
        summary.errors.push(...resultsSummary.errors.map(e => ({ type: 'RESULTS_ERROR', ...e })));
      }
      
      summary.message = `${summary.message || ''} | ${resultsSummary.updated || 0} Ergebnisse aktualisiert, ${resultsSummary.failed || 0} fehlgeschlagen, ${resultsSummary.skipped || 0} übersprungen`;
    } catch (resultsError) {
      console.error('[update-meeting-ids] ❌ Fehler beim Holen der Ergebnisse:', resultsError);
      summary.errors = summary.errors || [];
      summary.errors.push({
        type: 'RESULTS_EXCEPTION',
        message: resultsError.message,
        stack: resultsError.stack
      });
      // Fehler in Schritt 2 brechen nicht den gesamten Job ab
    }
    
    return summary;
    
  } catch (error) {
    console.error('[update-meeting-ids] ❌ Fehler:', error);
    summary.error = error.message;
    summary.errors.push({
      type: 'EXCEPTION',
      message: error.message,
      stack: error.stack
    });
    return summary;
  } finally {
    summary.endTime = new Date().toISOString();
    const duration = new Date(summary.endTime) - new Date(summary.startTime);
    summary.durationMs = duration;
    
    // Logge Zusammenfassung
    await logCronJobResult(supabase, summary);
    
    // Sende Email bei Fehlern
    if (summary.error || summary.failed > 0) {
      await sendErrorEmail(summary);
    }
  }
}

// Vercel Cron Job Handler
module.exports = async function handler(req, res) {
  // Security: Prüfe ob Request von Vercel Cron kommt
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Wenn kein CRON_SECRET gesetzt ist, erlaube nur von Vercel Cron
  // Vercel Cron sendet einen speziellen Header
  if (!cronSecret && req.headers['user-agent']?.includes('vercel-cron') === false) {
    // Für lokales Testing: Erlaube es trotzdem, aber logge Warnung
    console.warn('[update-meeting-ids] ⚠️ Request nicht von Vercel Cron - sollte nur für Testing sein');
  }
  
  try {
    console.log('[update-meeting-ids] 🚀 Cron Job gestartet');
    const summary = await updateMeetingIds();
    
    return res.status(200).json({
      success: !summary.error && summary.failed === 0,
      summary
    });
  } catch (error) {
    console.error('[update-meeting-ids] ❌ Cron Job Fehler:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

