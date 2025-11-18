import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trophy, Users, Calendar, TrendingUp, ChevronRight, ChevronDown, Award, Target, RefreshCw, AlertCircle, CheckCircle2, Plus, Loader, Download } from 'lucide-react';
import { calculateSimilarity, normalizeString } from '../../services/matchdayImportService';
import { importGroupFromNuLiga } from './NuLigaGroupImporter';
import './GroupsTab.css';

const FINISHED_STATUSES = ['completed'];

// Sync-Prüfung: Prüfe ob alle abgeschlossenen Matches match_results haben MIT Spieler-IDs
const checkMatchResultsSync = (matchdays, matchResults) => {
  const finishedMatches = matchdays.filter(m => 
    FINISHED_STATUSES.includes(m.status)
  );
  
  const matchResultsByMatchdayId = new Map();
  matchResults.forEach(mr => {
    if (!matchResultsByMatchdayId.has(mr.matchday_id)) {
      matchResultsByMatchdayId.set(mr.matchday_id, []);
    }
    matchResultsByMatchdayId.get(mr.matchday_id).push(mr);
  });
  
  // Prüfe: Matches ohne Ergebnisse ODER mit Ergebnissen aber ohne Spieler-IDs
  const matchesWithoutResults = finishedMatches.filter(m => {
    const results = matchResultsByMatchdayId.get(m.id) || [];
    if (results.length === 0) return true; // Keine Ergebnisse
    
    // Prüfe ob alle Ergebnisse Spieler-IDs haben
    const hasPlayerIds = results.every(r => {
      if (r.status === 'walkover') {
        return true;
      }
      if (r.match_type === 'Einzel') {
        return r.home_player_id && r.guest_player_id;
      } else {
        return (
          r.home_player1_id &&
          r.home_player2_id &&
          r.guest_player1_id &&
          r.guest_player2_id
        );
      }
    });
    
    return !hasPlayerIds; // Ergebnisse vorhanden, aber keine Spieler-IDs
  });
  
  return {
    totalFinished: finishedMatches.length,
    withResults: finishedMatches.length - matchesWithoutResults.length,
    withoutResults: matchesWithoutResults.length,
    matchesWithoutResults: matchesWithoutResults
  };
};

function GroupsTab({ 
  teams, 
  teamSeasons, 
  matchdays, 
  clubs, 
  players, 
  setTeams, 
  setClubs, 
  setTeamSeasons, 
  loadDashboardData,
  handleLoadMeetingDetails,
  loadMatchResults,
  matchResultsData = {},
  handleCreateMissingPlayer,
  creatingPlayerKey,
  teamById,
  handleReassignMatchTeams
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  
  // Scraper States
  const [scraperData, setScraperData] = useState(null);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [scraperSnapshot, setScraperSnapshot] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [groupImportInput, setGroupImportInput] = useState('');
  const [groupImportSeason, setGroupImportSeason] = useState('');
  const [groupImportDetails, setGroupImportDetails] = useState([]);
  const [groupImportLogs, setGroupImportLogs] = useState([]);
  const [groupImportLoading, setGroupImportLoading] = useState(false);
  const [groupImportError, setGroupImportError] = useState(null);
  const [showGroupImporter, setShowGroupImporter] = useState(false);
  
  // Match Detail States
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [meetingDetails, setMeetingDetails] = useState({});
  // URL-State
  const [urlMatchHandledKey, setUrlMatchHandledKey] = useState(null);

  // Query-Param Utilities
  const getQueryParams = () => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  };
  const updateQueryParams = (updater) => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      updater(params);
      url.search = params.toString();
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  // Hilfsfunktion: Team zur aktuellen Gruppe hinzufügen (team_seasons erzeugen)
  const addTeamToCurrentGroup = async (teamId, group) => {
    if (!teamId || !group) return;
    try {
      const { data: exists, error: checkError } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', teamId)
        .eq('season', group.season)
        .eq('league', group.league)
        .eq('group_name', group.groupName)
        .maybeSingle();
      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('⚠️ Fehler beim Prüfen team_seasons:', checkError);
      }
      if (!exists) {
        const { error: insertError } = await supabase.from('team_seasons').insert({
          team_id: teamId,
          season: group.season,
          league: group.league,
          group_name: group.groupName,
          team_size: 6,
          is_active: true
        });
        if (insertError) throw insertError;
      }
    } catch (e) {
      console.error('❌ Team konnte der Gruppe nicht hinzugefügt werden:', e);
      throw e;
    }
  };

  // Gruppiere Team-Seasons nach Kategorie, Liga und Gruppe
  const groupedData = useMemo(() => {
    const groups = new Map();

    (teamSeasons || []).forEach((ts) => {
      if (!ts.is_active || !ts.season || !ts.league || !ts.group_name) return;

      const category = ts.team_info?.category || 'Unbekannt';
      const league = ts.league || 'Unbekannt';
      const groupName = ts.group_name || 'Unbekannt';
      const season = ts.season || 'Unbekannt';

      const key = `${category}::${league}::${groupName}::${season}`;

      if (!groups.has(key)) {
        groups.set(key, {
          category,
          league,
          groupName,
          season,
          teams: [],
          teamIds: new Set()
        });
      }

      const group = groups.get(key);
      if (!group.teamIds.has(ts.team_id)) {
        const team = teams.find((t) => t.id === ts.team_id);
        if (team) {
          group.teams.push({
            ...team,
            teamSeason: ts
          });
          group.teamIds.add(ts.team_id);
        }
      }
    });

    // Sortiere Teams innerhalb jeder Gruppe
    groups.forEach((group) => {
      group.teams.sort((a, b) => {
        const nameA = `${a.club_name} ${a.team_name || ''}`.trim();
        const nameB = `${b.club_name} ${b.team_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
    });

    return Array.from(groups.values());
  }, [teamSeasons, teams]);

  useEffect(() => {
    if (!groupImportSeason && groupedData && groupedData.length > 0) {
      setGroupImportSeason(groupedData[0].season || '');
    }
  }, [groupImportSeason, groupedData]);

  // Gruppiere nach Kategorien
  const categoriesMap = useMemo(() => {
    const map = new Map();

    groupedData.forEach((group) => {
      if (!map.has(group.category)) {
        map.set(group.category, []);
      }
      map.get(group.category).push(group);
    });

    // Sortiere Gruppen innerhalb jeder Kategorie
    // Sortierung: Kleinere Gruppen-Nummern (höhere Klassen) zuerst
    map.forEach((groups) => {
      groups.sort((a, b) => {
        const groupNameA = a.groupName || '';
        const groupNameB = b.groupName || '';
        
        // Extrahiere Gruppen-Nummern (z.B. "Gr. 034" → 34, "Gr. 037" → 37)
        const extractGroupNumber = (groupName) => {
          // Suche nach Mustern wie "Gr. 034", "Gr. 037", "034", etc.
          const match = groupName.match(/(\d+)/);
          if (match) {
            return parseInt(match[1], 10);
          }
          // Wenn keine Nummer gefunden, sortiere ans Ende
          return 9999;
        };
        
        const numA = extractGroupNumber(groupNameA);
        const numB = extractGroupNumber(groupNameB);
        
        // Sortiere nach Gruppen-Nummer (kleinere zuerst = höhere Klasse)
        if (numA !== numB) {
          return numA - numB;
        }
        
        // Wenn gleiche Gruppen-Nummer, sortiere nach Liga
        const leagueA = a.league || '';
        const leagueB = b.league || '';
        
        // Extrahiere Liga-Nummern für sekundäre Sortierung
        const extractLeagueNumber = (league) => {
          const match = league.match(/(\d+)\./);
          if (match) {
            return parseInt(match[1], 10);
          }
          return 999;
        };
        
        const leagueNumA = extractLeagueNumber(leagueA);
        const leagueNumB = extractLeagueNumber(leagueB);
        
        if (leagueNumA !== leagueNumB) {
          return leagueNumA - leagueNumB;
        }
        
        // Dann alphabetisch nach Liga-Name
        const leagueCompare = leagueA.localeCompare(leagueB);
        if (leagueCompare !== 0) return leagueCompare;
        
        // Zuletzt alphabetisch nach Gruppenname
        return groupNameA.localeCompare(groupNameB);
      });
    });

    return map;
  }, [groupedData]);

  // Berechne Tabelle
  const calculateStandings = (matchdays, matchResults, teamIds) => {
    const teamStats = new Map();

    // WICHTIG: Alle Gruppen-Teams initialisieren (auch wenn sie noch keine Matchdays haben)
    teamIds.forEach((teamId) => {
      teamStats.set(teamId, {
        teamId,
        matches: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0
      });
    });

    // Gruppiere Match Results nach Matchday
    const resultsByMatchday = new Map();
    matchResults.forEach((result) => {
      if (!resultsByMatchday.has(result.matchday_id)) {
        resultsByMatchday.set(result.matchday_id, []);
      }
      resultsByMatchday.get(result.matchday_id).push(result);
    });

    // Verarbeite jedes Match
    matchdays.forEach((match) => {
      const results = resultsByMatchday.get(match.id) || [];
      const homeStats = teamStats.get(match.home_team_id);
      const awayStats = teamStats.get(match.away_team_id);

      if (!homeStats || !awayStats) return;

      // Prüfe ob Match beendet ist (nur echter Abschluss zählt)
      const isFinished = FINISHED_STATUSES.includes(match.status);

      if (!isFinished) return;

      // Verwende match_results falls vorhanden, sonst home_score/away_score
      let homeMatchPoints = 0;
      let awayMatchPoints = 0;
      let homeSets = 0;
      let awaySets = 0;
      let homeGames = 0;
      let awayGames = 0;

      if (results.length > 0) {
        // Berechne aus match_results
        results.forEach((result) => {
          if (!FINISHED_STATUSES.includes(result.status) || !result.winner) return;

          if (result.winner === 'home') {
            homeMatchPoints += 1;
          } else if (result.winner === 'guest' || result.winner === 'away') {
            awayMatchPoints += 1;
          }

          // Sets
          const set1Home = parseInt(result.set1_home || 0, 10);
          const set1Guest = parseInt(result.set1_guest || 0, 10);
          const set2Home = parseInt(result.set2_home || 0, 10);
          const set2Guest = parseInt(result.set2_guest || 0, 10);
          const set3Home = parseInt(result.set3_home || 0, 10);
          const set3Guest = parseInt(result.set3_guest || 0, 10);

          if (set1Home > set1Guest) homeSets += 1;
          else if (set1Guest > set1Home) awaySets += 1;
          if (set2Home > set2Guest) homeSets += 1;
          else if (set2Guest > set2Home) awaySets += 1;
          if (set3Home !== null && set3Guest !== null) {
            if (set3Home > set3Guest) homeSets += 1;
            else if (set3Guest > set3Home) awaySets += 1;
          }

          // Games
          homeGames += set1Home + set2Home + (set3Home || 0);
          awayGames += set1Guest + set2Guest + (set3Guest || 0);
        });
      } else if (match.home_score !== null && match.away_score !== null) {
        // Fallback zu home_score/away_score
        homeMatchPoints = match.home_score;
        awayMatchPoints = match.away_score;
      }

      // Update Statistiken
      homeStats.matches += 1;
      awayStats.matches += 1;

      if (homeMatchPoints > awayMatchPoints) {
        homeStats.wins += 1;
        awayStats.losses += 1;
        homeStats.points += 2;
      } else if (awayMatchPoints > homeMatchPoints) {
        awayStats.wins += 1;
        homeStats.losses += 1;
        awayStats.points += 2;
      } else {
        homeStats.points += 1;
        awayStats.points += 1;
      }

      homeStats.setsWon += homeSets;
      homeStats.setsLost += awaySets;
      awayStats.setsWon += awaySets;
      awayStats.setsLost += homeSets;

      homeStats.gamesWon += homeGames;
      homeStats.gamesLost += awayGames;
      awayStats.gamesWon += awayGames;
      awayStats.gamesLost += homeGames;
    });

    // Konvertiere zu Array und sortiere
    const standingsMap = new Map(); // Deduplizierung: club_name + team_name + category
    
    Array.from(teamStats.values()).forEach((stats) => {
      const team = teams.find((t) => t.id === stats.teamId);
      if (!team) return;

      const teamKey = `${team.club_name}::${team.team_name || ''}::${team.category || ''}`;
      
      // Wenn Team bereits existiert, merge Statistiken (nimm das Team mit mehr Matches)
      if (standingsMap.has(teamKey)) {
        const existing = standingsMap.get(teamKey);
        if (stats.matches > existing.matches) {
          // Ersetze mit Team das mehr Matches hat
          standingsMap.set(teamKey, {
            ...stats,
            team,
            teamName: `${team.club_name} ${team.team_name || ''}`.trim(),
            setsDiff: stats.setsWon - stats.setsLost,
            gamesDiff: stats.gamesWon - stats.gamesLost
          });
        }
        // Sonst behalte das bestehende Team
      } else {
        standingsMap.set(teamKey, {
          ...stats,
          team,
          teamName: `${team.club_name} ${team.team_name || ''}`.trim(),
          setsDiff: stats.setsWon - stats.setsLost,
          gamesDiff: stats.gamesWon - stats.gamesLost
        });
      }
    });

    const standingsArray = Array.from(standingsMap.values())
      .sort((a, b) => {
        // Sortiere nach Punkten, dann Sets-Diff, dann Games-Diff
        if (b.points !== a.points) return b.points - a.points;
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
        return b.gamesDiff - a.gamesDiff;
      });

    // Füge Platz hinzu
    standingsArray.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return standingsArray;
  };

  // Berechne Gruppen-Statistiken
  const calculateGroupStats = (matchdays, matchResults, teamCount) => {
    const totalMatches = matchdays.length;
    const completedMatches = matchdays.filter((m) =>
      FINISHED_STATUSES.includes(m.status)
    ).length;
    const scheduledMatches = matchdays.filter((m) => m.status === 'scheduled').length;
    const cancelledMatches = matchdays.filter((m) => m.status === 'cancelled').length;

    const totalResults = matchResults.length;
    const completedResults = matchResults.filter((r) => FINISHED_STATUSES.includes(r.status)).length;

    return {
      teamCount,
      totalMatches,
      completedMatches,
      scheduledMatches,
      cancelledMatches,
      totalResults,
      completedResults,
      completionRate: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
    };
  };

  // Hilfsfunktion: Matchpunkte aus match_results ableiten
  const deriveMatchPointsFromResults = (results = []) => {
    const accumulator = { home: 0, away: 0 };
    results.forEach((result) => {
      if (!FINISHED_STATUSES.includes(result.status) || !result.winner) return;
      if (result.winner === 'home') accumulator.home += 1;
      if (result.winner === 'guest' || result.winner === 'away') accumulator.away += 1;
    });
    return accumulator;
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getGroupKey = (group) => {
    return `${group.category}::${group.league}::${group.groupName}::${group.season}`;
  };

  // Extrahiere Gruppen-ID aus groupName (z.B. "Gr. 034" → "034")
  const extractGroupId = (groupName) => {
    if (!groupName) return null;
    const match = groupName.match(/(\d+)/);
    return match ? match[1] : null;
  };

  const sanitizeGroupInput = (value) => {
    if (!value) return [];
    return value
      .split(/[\s,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const buildDetailKey = (detail) => {
    const rawIdentifier = detail?.group?.groupName || detail?.group?.groupId || '';
    const groupId = extractGroupId(rawIdentifier);
    const category = (detail?.group?.category || '').toLowerCase() || 'category';
    const league = (detail?.group?.league || '').toLowerCase() || 'league';
    return `${category}::${league}::${groupId || rawIdentifier || Math.random().toString(36).slice(2)}`;
  };

  const buildGroupMetaFromDetail = (detail, seasonOverride) => {
    const rawGroup = detail?.group || {};
    const baseName = rawGroup.groupName || rawGroup.groupId || '';
    const groupId = extractGroupId(baseName) || extractGroupId(rawGroup.groupId || '');
    const prettyGroupName = baseName
      || (groupId ? `Gr. ${groupId.toString().padStart(3, '0')}` : 'Unbekannte Gruppe');
    return {
      category: rawGroup.category || detail?.meta?.category || 'Unbekannt',
      league: rawGroup.league || detail?.meta?.league || 'Unbekannt',
      groupName: prettyGroupName,
      season: seasonOverride || rawGroup.season || detail?.season || groupImportSeason || 'Unbekannt'
    };
  };

  const buildScrapedDataFromDetail = (detail, seasonOverride) => ({
    group: detail?.group || {},
    teamsDetailed: detail?.teamsDetailed || [],
    standings: detail?.standings || [],
    matches: detail?.matches || [],
    season: seasonOverride || detail?.season || groupImportSeason || ''
  });

  const summarizeImportResult = (importResult = {}) => {
    const parts = [];
    const matchTotal = (importResult.matchesImported || 0) + (importResult.matchesUpdated || 0);
    if (matchTotal > 0) parts.push(`${matchTotal} Matches`);
    if (importResult.matchResultsImported) parts.push(`${importResult.matchResultsImported} Ergebnisse`);
    if (importResult.clubsCreated) parts.push(`${importResult.clubsCreated} Vereine`);
    if (importResult.teamsCreated) parts.push(`${importResult.teamsCreated} Teams`);
    if (importResult.teamSeasonsCreated) parts.push(`${importResult.teamSeasonsCreated} Team-Seasons`);
    return parts.length > 0 ? parts.join(' · ') : 'Import abgeschlossen';
  };

  const updateImportDetailStatus = (detailKey, status, summary = null) => {
    setGroupImportDetails((prev) =>
      prev.map((detail) =>
        detail.__importKey === detailKey
          ? {
              ...detail,
              __importStatus: status,
              ...(summary !== null ? { __importSummary: summary } : {})
            }
          : detail
      )
    );
  };

  const getImporterStatusLabel = (status) => {
    switch (status) {
      case 'running':
        return 'Import läuft…';
      case 'success':
        return 'Import erfolgreich';
      case 'error':
        return 'Fehler';
      default:
        return 'Bereit';
    }
  };

  // Wähle Gruppe anhand URL-Param (group=NNN) sobald Daten da sind
  useEffect(() => {
    try {
      if (!groupedData || groupedData.length === 0) return;
      if (selectedGroup) return; // bereits ausgewählt
      const params = new URLSearchParams(window.location.search);
      const groupParam = params.get('group');
      if (!groupParam) return;
      const target = groupedData.find((g) => extractGroupId(g.groupName) === groupParam);
      if (target) {
        // Öffne direkt diese Gruppe
        loadGroupDetails(target);
      }
    } catch {
      // ignore
    }
  }, [groupedData, selectedGroup]);

  // Sync URL beim Wechsel der ausgewählten Gruppe
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      if (!selectedGroup) {
        // Gruppe schließen → Param entfernen
        params.delete('group');
        url.search = params.toString();
        window.history.replaceState({}, '', url.toString());
        return;
      }
      const gid = extractGroupId(selectedGroup.groupName);
      if (gid) {
        params.set('group', gid);
        url.search = params.toString();
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // ignore
    }
  }, [selectedGroup]);

  // Scraper-Funktionen
  const handleScrapeGroup = async (group) => {
    if (!group) return;

    setScraperLoading(true);
    setScraperData(null);
    setComparisonResult(null);
    setShowComparison(false);

    try {
      const groupId = extractGroupId(group.groupName);
      if (!groupId) {
        throw new Error('Gruppen-ID konnte nicht extrahiert werden');
      }

      // Lade Scraper-Daten für diese spezifische Gruppe
      const response = await fetch('/api/import/scrape-nuliga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groups: groupId,
          includeMatches: true
        })
      });

      const rawText = await response.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        throw new Error('Antwort des Scraper-Endpunkts konnte nicht gelesen werden.');
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Scraper-Endpunkt antwortete mit Status ${response.status}.`);
      }

      const details = Array.isArray(data.details) ? data.details : [];
      // Wähle die korrekte Gruppe: gleiche Gruppen-Nr. UND gleiche Kategorie UND gleiche Liga
      const normalize = (v) => (v || '').toString().trim().toLowerCase();
      const wantedGroupId = groupId;
      const wantedCategory = normalize(group.category);
      const wantedLeague = normalize(group.league);
      const groupCandidates = details.filter((entry) => {
        const entryGroupId = extractGroupId(entry.group?.groupName || entry.group?.groupId);
        const entryCategory = normalize(entry.group?.category || entry.group?.meta?.category || entry.meta?.category);
        const entryLeague = normalize(entry.group?.league || entry.group?.meta?.league || entry.meta?.league);
        return entryGroupId === wantedGroupId
          && (!wantedCategory || entryCategory === wantedCategory)
          && (!wantedLeague || entryLeague === wantedLeague);
      });
      const groupData = groupCandidates[0] || details.find(
        (entry) => extractGroupId(entry.group?.groupName || entry.group?.groupId) === groupId
      );

      if (!groupData) {
        throw new Error(`Keine Scraper-Daten für Gruppe ${group.groupName} gefunden.`);
      }

      const scrapedData = {
        group: groupData.group,
        teamsDetailed: groupData.teamsDetailed || [],
        standings: groupData.standings || [],
        matches: groupData.matches || [],
        season: data.season
      };

      setScraperData(scrapedData);

      // NEU: Verwende neuen, robusten Importer
      // Lade Clubs und Teams für Import
      const { data: clubsData } = await supabase
        .from('club_info')
        .select('*');
      
      const { data: teamsData } = await supabase
        .from('team_info')
        .select('*');

      const importResult = await importGroupFromNuLiga(
        group,
        scrapedData,
        supabase,
        clubsData || [],
        teamsData || []
      );

      // Zeige Ergebnis
      const successMessage = [
        `✅ Import abgeschlossen!`,
        `${importResult.clubsCreated} Clubs erstellt`,
        `${importResult.teamsCreated} Teams erstellt`,
        `${importResult.teamSeasonsCreated} Team-Seasons erstellt`,
        `${importResult.matchesImported} Matches importiert`,
        `${importResult.matchesUpdated} Matches aktualisiert`,
        `${importResult.matchResultsImported} Match-Results importiert`
      ].filter(Boolean).join('\n');

      if (importResult.errors.length > 0) {
        const errorMessage = importResult.errors
          .map(e => `- ${e.type}: ${e.error || e.message}`)
          .join('\n');
        alert(`${successMessage}\n\n⚠️ Fehler:\n${errorMessage}`);
      } else {
        alert(successMessage);
      }

      // Lade Gruppen-Details neu (WICHTIG: forceReload = true)
      await loadGroupDetails(group, true);
      
      // Warte kurz, damit State aktualisiert wird
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Lade Match-Results neu für alle Matches in dieser Gruppe
      // Hole Matchdays direkt aus der DB, da groupDetails State möglicherweise noch nicht aktualisiert ist
      if (loadMatchResults) {
        const { data: matchdays } = await supabase
          .from('matchdays')
          .select('id')
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName);
        
        if (matchdays && matchdays.length > 0) {
          for (const matchday of matchdays) {
            try {
              await loadMatchResults(matchday.id);
            } catch (err) {
              console.warn(`Fehler beim Laden der Match-Results für Matchday ${matchday.id}:`, err);
            }
          }
        }
      }
      
      // Lade Dashboard-Daten neu (falls verfügbar)
      if (loadDashboardData) {
        await loadDashboardData();
      }
      
      // Lade Gruppen-Details nochmal, um sicherzustellen, dass alles aktualisiert ist
      await loadGroupDetails(group, true);

    } catch (error) {
      console.error('❌ Fehler beim Import der Gruppe:', error);
      alert(`Fehler beim Import: ${error.message}`);
    } finally {
      setScraperLoading(false);
    }
  };

  const handleFetchGroupImportData = async () => {
    const sanitizedGroups = sanitizeGroupInput(groupImportInput);
    setGroupImportError(null);
    setGroupImportLogs([]);
    setGroupImportDetails([]);
    setGroupImportLoading(true);

    try {
      const payload = {
        includeMatches: true,
        requestDelayMs: 350
      };

      if (sanitizedGroups.length > 0) {
        payload.groups = sanitizedGroups.join(',');
      }
      if (groupImportSeason) {
        payload.season = groupImportSeason;
      }

      const response = await fetch('/api/import/scrape-nuliga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      const data = rawText ? JSON.parse(rawText) : {};

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'nuLiga-Daten konnten nicht geladen werden.');
      }

      const details = Array.isArray(data.details) ? data.details : [];
      if (details.length === 0) {
        setGroupImportError('Keine Gruppen im nuLiga-Response gefunden. Bitte Filter prüfen.');
        return;
      }

      const mappedDetails = details.map((detail) => ({
        ...detail,
        __importKey: buildDetailKey(detail),
        __importStatus: 'pending',
        __importSummary: null
      }));

      setGroupImportDetails(mappedDetails);
      if (!groupImportSeason && data.season) {
        setGroupImportSeason(data.season);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der nuLiga-Daten:', error);
      setGroupImportError(error.message || 'Unbekannter Fehler beim Abrufen der nuLiga-Daten.');
    } finally {
      setGroupImportLoading(false);
    }
  };

  const runGroupImport = async (detail) => {
    const detailKey = detail.__importKey || buildDetailKey(detail);
    const groupMeta = buildGroupMetaFromDetail(detail, groupImportSeason);
    const scrapedData = buildScrapedDataFromDetail(detail, groupImportSeason);
    updateImportDetailStatus(detailKey, 'running');

    try {
      const { data: clubsData, error: clubsError } = await supabase.from('club_info').select('*');
      if (clubsError) throw clubsError;
      const { data: teamsData, error: teamsError } = await supabase.from('team_info').select('*');
      if (teamsError) throw teamsError;

      const importResult = await importGroupFromNuLiga(
        groupMeta,
        scrapedData,
        supabase,
        clubsData || [],
        teamsData || []
      );

      const summary = summarizeImportResult(importResult);
      updateImportDetailStatus(detailKey, 'success', summary);
      setGroupImportLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          group: groupMeta.groupName,
          status: 'success',
          summary,
          errors: importResult.errors || []
        },
        ...prev
      ]);

      if (loadDashboardData) {
        await loadDashboardData();
      }

      return importResult;
    } catch (error) {
      console.error('❌ Fehler beim Gruppenimport:', error);
      updateImportDetailStatus(detailKey, 'error', error.message);
      setGroupImportLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          group: groupMeta.groupName,
          status: 'error',
          summary: error.message,
          errors: [error]
        },
        ...prev
      ]);
      throw error;
    }
  };

  const handleImportSingleGroup = async (detail) => {
    setGroupImportError(null);
    setGroupImportLoading(true);
    try {
      await runGroupImport(detail);
    } catch (error) {
      setGroupImportError(error.message || 'Import fehlgeschlagen.');
    } finally {
      setGroupImportLoading(false);
    }
  };

  const handleImportAllGroups = async () => {
    if (groupImportDetails.length === 0) {
      setGroupImportError('Bitte zuerst Gruppen aus nuLiga laden.');
      return;
    }

    const pending = groupImportDetails.filter((detail) => detail.__importStatus !== 'success');
    if (pending.length === 0) {
      setGroupImportError('Alle geladenen Gruppen wurden bereits importiert.');
      return;
    }

    setGroupImportError(null);
    setGroupImportLoading(true);
    let lastError = null;

    try {
      for (const detail of pending) {
        try {
          await runGroupImport(detail);
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) {
        setGroupImportError(lastError.message || 'Mindestens ein Import ist fehlgeschlagen.');
      }
    } finally {
      setGroupImportLoading(false);
    }
  };

  // Wähle Match anhand URL-Param (matchday oder match Nummer), sobald Matchdays geladen sind
  useEffect(() => {
    if (!selectedGroup || !groupDetails?.matchdays?.length) return;
    const groupKey = `${selectedGroup.category}::${selectedGroup.league}::${selectedGroup.groupName}::${selectedGroup.season}`;
    if (urlMatchHandledKey === groupKey) return; // pro Gruppe nur einmal initial anwenden
    const params = getQueryParams();
    const matchdayId = params.get('matchday');
    const matchNumberParam = params.get('match');
    let preselect = null;
    if (matchdayId) {
      preselect = groupDetails.matchdays.find((m) => m.id === matchdayId) || null;
    }
    if (!preselect && matchNumberParam) {
      preselect = groupDetails.matchdays.find(
        (m) => m.match_number && String(m.match_number) === String(matchNumberParam)
      ) || null;
    }
    if (preselect) {
      setSelectedMatch(preselect);
      setUrlMatchHandledKey(groupKey);
    } else {
      // nichts zu preselecten, aber merken dass geprüft wurde
      setUrlMatchHandledKey(groupKey);
    }
  }, [selectedGroup, groupDetails?.matchdays, urlMatchHandledKey]);

  // Sync URL, wenn ausgewähltes Match wechselt
  useEffect(() => {
    if (!selectedMatch) {
      // Entferne Param, wenn kein Match ausgewählt
      updateQueryParams((p) => {
        p.delete('matchday');
        p.delete('match');
      });
      return;
    }
    updateQueryParams((p) => {
      p.set('matchday', selectedMatch.id);
      if (selectedMatch.match_number != null) {
        p.set('match', String(selectedMatch.match_number));
      } else {
        p.delete('match');
      }
    });
  }, [selectedMatch]);

  // Reagiere auf Browser-Navigation (Vor/Zurück)
  useEffect(() => {
    const onPopState = () => {
      const params = getQueryParams();
      const matchdayId = params.get('matchday');
      const matchNumberParam = params.get('match');
      if (!groupDetails?.matchdays?.length) return;
      let next = null;
      if (matchdayId) {
        next = groupDetails.matchdays.find((m) => m.id === matchdayId) || null;
      }
      if (!next && matchNumberParam) {
        next = groupDetails.matchdays.find(
          (m) => m.match_number && String(m.match_number) === String(matchNumberParam)
        ) || null;
      }
      setSelectedMatch(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [groupDetails?.matchdays]);

  // Speichere Scraper-Snapshot in DB
  const saveScraperSnapshot = async (groupKey, group, scrapedData) => {
    try {
      const { data, error } = await supabase
        .from('scraper_snapshots')
        .insert({
          group_id: groupKey,
          category: group.category,
          league: group.league,
          group_name: group.groupName,
          season: group.season,
          scraped_data: scrapedData
        })
        .select()
        .single();

      if (error) throw error;
      setScraperSnapshot(data);
      return data;
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Snapshots:', error);
      // Nicht kritisch, weiter machen
      return null;
    }
  };

  // Aktualisiere Vergleichsergebnis im Snapshot
  const updateScraperSnapshotComparison = async (groupKey, comparison) => {
    if (!scraperSnapshot) return;

    try {
      const { error } = await supabase
        .from('scraper_snapshots')
        .update({ comparison_result: comparison })
        .eq('id', scraperSnapshot.id);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Vergleichsergebnisses:', error);
    }
  };

  // Vergleichslogik: Scraper-Daten vs. DB-Daten
  const compareScrapedWithDatabase = async (group, scrapedData) => {
    const groupKey = getGroupKey(group);
    const comparison = {
      groupKey,
      clubs: { total: 0, matched: 0, missing: 0, missingItems: [] },
      teams: { total: 0, matched: 0, missing: 0, missingItems: [] },
      matchdays: { total: 0, matched: 0, missing: 0, missingItems: [], mismatchItems: [] },
      overallMatch: 0
    };

    // Lade Clubs und Teams aus DB (für Matching benötigt)
    let clubs = [];
    let teams = [];
    try {
      const { data: clubsData, error: clubsError } = await supabase
        .from('club_info')
        .select('id, name, normalized_name');
      if (!clubsError && clubsData) {
        clubs = clubsData;
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('team_info')
        .select('id, club_id, club_name, team_name, category');
      if (!teamsError && teamsData) {
        teams = teamsData;
      }
    } catch (err) {
      console.warn('⚠️ Fehler beim Laden von Clubs/Teams für Vergleich:', err);
    }

    // 1. Club-Vergleich
    const scrapedClubs = new Set();
    const scrapedTeams = scrapedData.teamsDetailed || [];
    
    scrapedTeams.forEach((team) => {
      const teamName = (team.teamName || team.team || '').trim();
      if (!teamName) return;
      
      // Extrahiere Club-Name
      const parts = teamName.split(/\s+/);
      const clubName = parts.slice(0, -1).join(' ').trim(); // Alles außer letztem Teil (Team-Nummer)
      if (clubName) {
        scrapedClubs.add(clubName);
      }
    });

    comparison.clubs.total = scrapedClubs.size;
    
    scrapedClubs.forEach((scrapedClubName) => {
      const normalizedScraped = normalizeString(scrapedClubName);
      const found = clubs.find((club) => {
        const normalizedDb = normalizeString(club.name || '');
        return normalizedDb === normalizedScraped || 
               calculateSimilarity(scrapedClubName, club.name || '') >= 0.90;
      });

      if (found) {
        comparison.clubs.matched += 1;
      } else {
        comparison.clubs.missing += 1;
        comparison.clubs.missingItems.push({
          scrapedName: scrapedClubName,
          confidence: 0.0,
          action: 'create_club'
        });
      }
    });

    // 2. Team-Vergleich - NUR Teams die in dieser Gruppe sind
    // Filtere zuerst: Welche Teams sind bereits in dieser Gruppe in der DB?
    const groupTeamIds = new Set(group.teams.map(t => t.id));
    const groupTeamsInDb = teams.filter(t => groupTeamIds.has(t.id));
    
    // Erstelle Lookup für Teams in dieser Gruppe (mit team_season)
    const groupTeamsByKey = new Map();
    groupTeamsInDb.forEach((team) => {
      const key = `${normalizeString(team.club_name || '')}_${normalizeString(team.team_name || '')}`;
      groupTeamsByKey.set(key, team);
    });

    comparison.teams.total = scrapedTeams.length;
    
    scrapedTeams.forEach((scrapedTeam) => {
      const teamName = (scrapedTeam.teamName || scrapedTeam.team || '').trim();
      if (!teamName) return;

      // Extrahiere Club- und Team-Name
      const parts = teamName.split(/\s+/);
      const clubName = parts.slice(0, -1).join(' ').trim();
      const teamSuffix = parts[parts.length - 1];

      // Finde Club in DB
      const dbClub = clubs.find((club) => {
        const normalizedDb = normalizeString(club.name || '');
        const normalizedScraped = normalizeString(clubName);
        return normalizedDb === normalizedScraped || 
               calculateSimilarity(clubName, club.name || '') >= 0.90;
      });

      if (!dbClub) {
        // Club fehlt → Team auch fehlt
        comparison.teams.missing += 1;
        comparison.teams.missingItems.push({
          scrapedName: teamName,
          scrapedClub: clubName,
          scrapedSuffix: teamSuffix,
          confidence: 0.0,
          action: 'create_team',
          requiresClub: true
        });
        return;
      }

      // WICHTIG: Kategorie aus dem Scraped-Team oder Group-Header
      const expectedCategory = scrapedTeam.category || group?.category || null;
      
      // Suche Team in DB - ZUERST in der aktuellen Gruppe (mit Kategorie-Prüfung)
      const teamKey = `${normalizeString(dbClub.name || '')}_${normalizeString(teamSuffix)}`;
      let dbTeam = groupTeamsByKey.get(teamKey);
      
      // VALIDIERUNG: Prüfe ob gefundenes Team die richtige Kategorie hat
      let wrongCategoryTeam = null;
      if (dbTeam && expectedCategory) {
        const teamCategory = normalizeString(dbTeam.category || '');
        const groupCategory = normalizeString(expectedCategory);
        if (teamCategory && groupCategory && teamCategory !== groupCategory) {
          // Kategorie stimmt nicht - Team ist falsch zugeordnet!
          console.warn(`⚠️ Team "${dbTeam.club_name} ${dbTeam.team_name}" hat falsche Kategorie: ${dbTeam.category} (erwartet: ${expectedCategory})`);
          wrongCategoryTeam = dbTeam; // Merke das falsche Team für später
          dbTeam = null; // Ignoriere dieses Team
        }
      }
      
      // Falls nicht in Gruppe gefunden, suche global (aber markiere als "nicht in Gruppe")
      // WICHTIG: Kategorie ist entscheidend! "VKC 1" in Herren 30 ≠ "VKC 1" in Herren 50
      if (!dbTeam) {
        // Suche nach Team mit richtiger Kategorie
        const candidateTeams = teams.filter((team) => {
          if (team.club_id !== dbClub.id) return false;
          const normalizedDbTeam = normalizeString(team.team_name || '');
          const normalizedScrapedSuffix = normalizeString(teamSuffix);
          const teamNameMatch = normalizedDbTeam === normalizedScrapedSuffix;
          return teamNameMatch;
        });

        if (expectedCategory) {
          const normalizedExpectedCategory = normalizeString(expectedCategory);
          dbTeam = candidateTeams.find((team) => {
            const teamCategory = normalizeString(team.category || '');
            return teamCategory === normalizedExpectedCategory;
          });
        } else {
          // Wenn keine Kategorie erwartet wird, akzeptiere nur Teams ohne Kategorie
          dbTeam = candidateTeams.find(team => !team.category) || null;
        }
      }
      
      // AUTOMATISCHE BEREINIGUNG: Wenn falsches Team in Gruppe, entferne es und füge richtiges hinzu
      if (wrongCategoryTeam && dbTeam && expectedCategory) {
        comparison.teams.fixActions = comparison.teams.fixActions || [];
        comparison.teams.fixActions.push({
          action: 'fix_category_mismatch',
          wrongTeamId: wrongCategoryTeam.id,
          wrongTeamName: `${wrongCategoryTeam.club_name} ${wrongCategoryTeam.team_name}`,
          wrongCategory: wrongCategoryTeam.category,
          correctTeamId: dbTeam.id,
          correctTeamName: `${dbTeam.club_name} ${dbTeam.team_name}`,
          correctCategory: dbTeam.category,
          clubId: dbClub.id,
          teamSuffix: teamSuffix
        });
      }

      if (dbTeam && groupTeamIds.has(dbTeam.id)) {
        // Team existiert UND ist in dieser Gruppe
        comparison.teams.matched += 1;
      } else if (dbTeam && !groupTeamIds.has(dbTeam.id)) {
        // Team existiert, aber NICHT in dieser Gruppe → fehlt team_season
        comparison.teams.missing += 1;
        comparison.teams.missingItems.push({
          scrapedName: teamName,
          scrapedClub: clubName,
          scrapedSuffix: teamSuffix,
          existingTeamId: dbTeam.id,
          confidence: 0.0,
          action: 'add_team_season',
          suggestedClubId: dbClub.id
        });
      } else {
        // Team existiert gar nicht
        comparison.teams.missing += 1;
        comparison.teams.missingItems.push({
          scrapedName: teamName,
          scrapedClub: clubName,
          scrapedSuffix: teamSuffix,
          confidence: 0.0,
          action: 'create_team',
          suggestedClubId: dbClub.id
        });
      }
    });

    // 3. Matchday-Vergleich
    const scrapedMatches = scrapedData.matches || [];
    comparison.matchdays.total = scrapedMatches.length;

    // Lade ALLE Matchdays für diese Gruppe aus der DB (nicht nur die in groupDetails)
    let allGroupMatchdays = [];
    if (groupDetails?.matchdays) {
      allGroupMatchdays = groupDetails.matchdays;
    } else {
      // Falls groupDetails noch nicht geladen, lade direkt aus DB
      try {
        const { data: dbMatchdays, error: mdError } = await supabase
          .from('matchdays')
          .select('id, match_date, match_number, home_team_id, away_team_id, season, league, group_name')
          .eq('season', group.season)
          .eq('league', group.league)
          .eq('group_name', group.groupName);
        
        if (!mdError && dbMatchdays) {
          allGroupMatchdays = dbMatchdays;
        }
      } catch (err) {
        console.warn('⚠️ Fehler beim Laden der Matchdays für Vergleich:', err);
      }
    }

    const toDateOnly = (iso) => {
      if (!iso) return null;
      try {
        return new Date(iso).toISOString().split('T')[0];
      } catch {
        return null;
      }
    };

    scrapedMatches.forEach((scrapedMatch) => {
      // Robustere Extraktion der Matchnummer (verschiedene mögliche Felder)
      const matchNumber =
        scrapedMatch.matchNumber ??
        scrapedMatch.match_number ??
        scrapedMatch.number ??
        scrapedMatch.nr ??
        scrapedMatch.id ??
        null;
      const homeTeam = scrapedMatch.homeTeam || '';
      const awayTeam = scrapedMatch.awayTeam || '';
      const matchDate = scrapedMatch.matchDateIso;

      // Suche Match in DB - mehrere Strategien
      let found = false;
      let matchedDb = null;
      let matchingStrategy = null;
      
      // Versuche Team-IDs zu finden (MIT KATEGORIE!) - wird für mehrere Strategien benötigt
      const findTeamIdForMatch = (teamName) => {
          const parts = teamName.split(/\s+/);
          const clubName = parts.slice(0, -1).join(' ').trim();
          const teamSuffix = parts[parts.length - 1];

          const dbClub = clubs.find((club) => {
            const normalizedDb = normalizeString(club.name || '');
            const normalizedScraped = normalizeString(clubName);
            return normalizedDb === normalizedScraped || 
                   calculateSimilarity(clubName, club.name || '') >= 0.90;
          });

          if (!dbClub) {
            console.warn(`⚠️ Club nicht gefunden für Team "${teamName}" (Club: "${clubName}")`);
            return null;
          }

          // WICHTIG: Kategorie aus Group-Kontext verwenden
          const expectedCategory = group?.category || null;

          // WICHTIG: Filtere zuerst nach Club, dann nach Team-Name, dann nach Kategorie
          // Das stellt sicher, dass wir das Team mit der RICHTIGEN Kategorie finden
          const candidateTeams = teams.filter((team) => {
            if (team.club_id !== dbClub.id) return false;
            const normalizedDbTeam = normalizeString(team.team_name || '');
            const normalizedScrapedSuffix = normalizeString(teamSuffix);
            const teamNameMatch = normalizedDbTeam === normalizedScrapedSuffix;
            return teamNameMatch;
          });

          console.log(`🔍 [findTeamIdForMatch] Suche Team: "${teamName}" (Club: "${clubName}", Suffix: "${teamSuffix}", Kategorie: "${expectedCategory}")`);
          console.log(`🔍 [findTeamIdForMatch] Gefundene Kandidaten: ${candidateTeams.length}`, candidateTeams.map(t => `${t.club_name} ${t.team_name} (${t.category})`));

          // Wenn mehrere Teams mit gleichem Namen existieren, wähle das mit der richtigen Kategorie
          let dbTeam = null;
          if (expectedCategory) {
            const normalizedExpectedCategory = normalizeString(expectedCategory);
            // Priorität 1: Team mit exakt passender Kategorie
            dbTeam = candidateTeams.find((team) => {
              const teamCategory = normalizeString(team.category || '');
              return teamCategory === normalizedExpectedCategory;
            });
            
            // Wenn kein Team mit passender Kategorie gefunden, logge alle Kandidaten
            if (!dbTeam && candidateTeams.length > 0) {
              const foundCategories = candidateTeams.map(t => t.category).join(', ');
              console.warn(`⚠️ Team "${clubName} ${teamSuffix}" gefunden, aber keine passende Kategorie. Gefundene Kategorien: ${foundCategories}, erwartet: ${expectedCategory}`);
            } else if (dbTeam) {
              console.log(`✅ [findTeamIdForMatch] Team gefunden: ${dbTeam.club_name} ${dbTeam.team_name} (${dbTeam.category}) - ID: ${dbTeam.id}`);
            }
          } else {
            // Wenn keine Kategorie erwartet wird, nimm das erste Team
            dbTeam = candidateTeams[0] || null;
            if (dbTeam) {
              console.log(`✅ [findTeamIdForMatch] Team gefunden (ohne Kategorie-Prüfung): ${dbTeam.club_name} ${dbTeam.team_name} - ID: ${dbTeam.id}`);
            }
          }

          if (!dbTeam) {
            console.warn(`⚠️ Team nicht gefunden: "${teamName}" (Club: "${clubName}", Suffix: "${teamSuffix}", Kategorie: "${expectedCategory || 'keine'}")`);
            console.warn(`⚠️ Verfügbare Teams für Club "${clubName}":`, teams.filter(t => t.club_id === dbClub.id).map(t => `${t.team_name} (${t.category})`));
          }
          return dbTeam?.id || null;
        };

      // Strategie 1: Suche nach match_number
      if (matchNumber) {
        matchedDb = allGroupMatchdays.find((match) =>
          match.match_number && String(match.match_number) === String(matchNumber)
        ) || null;
        if (matchedDb) {
          found = true;
          matchingStrategy = 'match_number';
          console.log(`✅ Match gefunden (Strategie: match_number #${matchNumber}): DB-ID ${matchedDb.id}`);
        }
      }

      // Strategie 2: Suche nach Datum + Teams (wenn Teams gefunden werden können)
      if (!found && matchDate) {
        const matchDateOnly = toDateOnly(matchDate);
        
        const homeTeamId = findTeamIdForMatch(homeTeam);
        const awayTeamId = findTeamIdForMatch(awayTeam);

        // Suche nach Datum + Teams
        if (homeTeamId && awayTeamId && matchDateOnly) {
          matchedDb = allGroupMatchdays.find((match) => {
            if (!match.match_date) return false;
            const dbDateOnly = toDateOnly(match.match_date);
            const sameDate = dbDateOnly === matchDateOnly;
            const sameTeams =
              (match.home_team_id === homeTeamId && match.away_team_id === awayTeamId) ||
              (match.home_team_id === awayTeamId && match.away_team_id === homeTeamId);
            return sameDate && sameTeams;
          }) || null;
          if (matchedDb) {
            found = true;
            matchingStrategy = 'date+teams';
            console.log(`✅ Match gefunden (Strategie: Datum+Teams, ${matchDateOnly}): DB-ID ${matchedDb.id}`);
          }
        } else {
          if (!homeTeamId) console.warn(`⚠️ Home-Team-ID nicht gefunden für "${homeTeam}"`);
          if (!awayTeamId) console.warn(`⚠️ Away-Team-ID nicht gefunden für "${awayTeam}"`);
        }

        // Fallback: Nur nach Datum suchen (weniger genau) - NUR wenn genau 1 Match an diesem Tag
        if (!found && matchDateOnly) {
          const matchesOnDate = allGroupMatchdays.filter((match) => {
            if (!match.match_date) return false;
            const dbDateOnly = toDateOnly(match.match_date);
            return dbDateOnly === matchDateOnly;
          });
          
          // WICHTIG: Nur wenn genau 1 Match an diesem Tag, verwende es
          // Sonst wäre das Matching zu unsicher (mehrere Matches am gleichen Tag)
          if (matchesOnDate.length === 1) {
            matchedDb = matchesOnDate[0];
            found = true;
            matchingStrategy = 'date-only';
            console.warn(`⚠️ Match gefunden (Strategie: Datum-only, ${matchDateOnly}): DB-ID ${matchedDb.id}. Teams konnten nicht eindeutig gemappt werden - bitte manuell prüfen!`);
          } else if (matchesOnDate.length > 1) {
            console.warn(`⚠️ Match-Matching per Datum-only nicht möglich: ${matchesOnDate.length} Matches am ${matchDateOnly} gefunden. Matching zu unsicher. Scraped: "${homeTeam}" vs "${awayTeam}" (Match #${matchNumber || 'unbekannt'})`);
            // matchedDb bleibt null, found bleibt false
          } else {
            console.warn(`⚠️ Kein Match gefunden für Datum ${matchDateOnly}. Scraped: "${homeTeam}" vs "${awayTeam}" (Match #${matchNumber || 'unbekannt'})`);
          }
        }
      }

      if (found) {
        comparison.matchdays.matched += 1;
        // Prüfe auf Abweichungen (Zeit, match_number, Teams)
        try {
          const desiredDate = matchDate ? new Date(matchDate).toISOString() : null;
          const desiredTime = scrapedMatch.startTime || null;
          const dbTime = matchedDb?.start_time || null;
          const dbDateIso = matchedDb?.match_date ? new Date(matchedDb.match_date).toISOString() : null;
          const needsDateUpdate = Boolean(desiredDate && dbDateIso && toDateOnly(desiredDate) !== toDateOnly(dbDateIso));
          const needsTimeUpdate = Boolean(desiredTime && desiredTime !== dbTime);
          const needsNumberUpdate = Boolean(matchNumber && String(matchedDb?.match_number || '') !== String(matchNumber));

          // Prüfe Teams - verwende findTeamIdForMatch für konsistente Logik
          let needsTeamUpdate = false;
          let resolvedHomeId = null;
          let resolvedAwayId = null;
          resolvedHomeId = findTeamIdForMatch(homeTeam);
          resolvedAwayId = findTeamIdForMatch(awayTeam);
          if (resolvedHomeId && resolvedAwayId) {
            needsTeamUpdate = Boolean(
              matchedDb.home_team_id !== resolvedHomeId || matchedDb.away_team_id !== resolvedAwayId
            );
          }

          const scrapedStatus = scrapedMatch.status === 'completed' ? 'completed' :
            scrapedMatch.status === 'cancelled' ? 'cancelled' : 'scheduled';
          const isCompleted = scrapedStatus === 'completed';
          const hasResultsInDb = (groupDetails?.matchResults || []).some((r) => r.matchday_id === matchedDb.id);
          const needsResultImport = isCompleted && !hasResultsInDb;

          if (needsDateUpdate || needsTimeUpdate || needsNumberUpdate || needsTeamUpdate || needsResultImport) {
            const mismatchReasons = [];
            if (needsDateUpdate) mismatchReasons.push('Datum');
            if (needsTimeUpdate) mismatchReasons.push('Zeit');
            if (needsNumberUpdate) mismatchReasons.push('Matchnummer');
            if (needsTeamUpdate) mismatchReasons.push('Teams');
            if (needsResultImport) mismatchReasons.push('Ergebnisse');
            
            console.log(`⚠️ Abweichung erkannt für Match ${matchedDb.id} (Match #${matchNumber || matchedDb.match_number || 'unbekannt'}): ${mismatchReasons.join(', ')}. Matching-Strategie: ${matchingStrategy || 'unbekannt'}`);
            
            comparison.matchdays.mismatchItems.push({
              dbMatch: {
                id: matchedDb.id,
                match_number: matchedDb.match_number,
                match_date: matchedDb.match_date,
                start_time: matchedDb.start_time,
                home_team_id: matchedDb.home_team_id,
                away_team_id: matchedDb.away_team_id
              },
              scraped: {
                matchNumber,
                matchDateIso: matchDate,
                startTime: scrapedMatch.startTime || null,
                homeTeam,
                awayTeam,
                status: scrapedStatus
              },
              needs: {
                date: needsDateUpdate,
                time: needsTimeUpdate,
                number: needsNumberUpdate,
                teams: needsTeamUpdate,
                importResults: needsResultImport
              },
              resolved: {
                homeTeamId: resolvedHomeId,
                awayTeamId: resolvedAwayId
              },
              matchingStrategy: matchingStrategy || null,
              action: 'update_matchday'
            });
          }
        } catch (mismatchErr) {
          // eslint-disable-next-line no-console
          console.warn('⚠️ Fehler bei Abgleich Match-Abweichungen:', mismatchErr);
        }
      } else {
        comparison.matchdays.missing += 1;
        comparison.matchdays.missingItems.push({
          matchNumber: matchNumber || null,
          homeTeam,
          awayTeam,
          matchDate: matchDate || null,
          action: 'create_matchday'
        });
      }
    });

    // 4. AUTOMATISCHE BEREINIGUNG: Führe Fix-Actions aus
    let fixActionsPerformed = false;
    if (comparison.teams.fixActions && comparison.teams.fixActions.length > 0) {
      console.log(`🔧 Starte automatische Bereinigung: ${comparison.teams.fixActions.length} Teams mit falscher Kategorie werden korrigiert...`);
      fixActionsPerformed = true;
      
      for (const fixAction of comparison.teams.fixActions) {
        try {
          // 1. Entferne falsches Team aus der Gruppe (setze is_active = false)
          const { error: deactivateError } = await supabase
            .from('team_seasons')
            .update({ is_active: false })
            .eq('team_id', fixAction.wrongTeamId)
            .eq('season', group.season)
            .eq('league', group.league)
            .eq('group_name', group.groupName)
            .eq('is_active', true);
          
          if (deactivateError) {
            console.error(`❌ Fehler beim Deaktivieren des falschen Teams ${fixAction.wrongTeamId}:`, deactivateError);
            continue;
          }
          
          console.log(`✅ Falsches Team entfernt: ${fixAction.wrongTeamName} (${fixAction.wrongCategory}) aus Gruppe ${group.groupName}`);

          // 2. Prüfe ob richtiges Team bereits in Gruppe ist
          const { data: existingTeamSeason, error: checkError } = await supabase
            .from('team_seasons')
            .select('id')
            .eq('team_id', fixAction.correctTeamId)
            .eq('season', group.season)
            .eq('league', group.league)
            .eq('group_name', group.groupName)
            .maybeSingle();
          
          if (checkError && checkError.code !== 'PGRST116') {
            console.error(`❌ Fehler beim Prüfen des richtigen Teams ${fixAction.correctTeamId}:`, checkError);
            continue;
          }

          // 3. Füge richtiges Team zur Gruppe hinzu (falls noch nicht vorhanden)
          if (!existingTeamSeason) {
            const { error: insertError } = await supabase
              .from('team_seasons')
              .insert({
                team_id: fixAction.correctTeamId,
                season: group.season,
                league: group.league,
                group_name: group.groupName,
                is_active: true
              });
            
            if (insertError) {
              console.error(`❌ Fehler beim Hinzufügen des richtigen Teams ${fixAction.correctTeamId}:`, insertError);
              continue;
            }
            
            console.log(`✅ Richtiges Team hinzugefügt: ${fixAction.correctTeamName} (${fixAction.correctCategory}) zu Gruppe ${group.groupName}`);
          } else {
            // Aktiviere team_season falls es bereits existiert aber inaktiv ist
            const { error: activateError } = await supabase
              .from('team_seasons')
              .update({ is_active: true })
              .eq('id', existingTeamSeason.id);
            
            if (activateError) {
              console.error(`❌ Fehler beim Aktivieren des richtigen Teams ${fixAction.correctTeamId}:`, activateError);
            } else {
              console.log(`✅ Richtiges Team aktiviert: ${fixAction.correctTeamName} (${fixAction.correctCategory}) in Gruppe ${group.groupName}`);
            }
          }

          // 4. Aktualisiere Matchdays: Ersetze falsche Team-IDs durch richtige
          const { data: matchdaysToUpdate, error: matchdaysError } = await supabase
            .from('matchdays')
            .select('id, home_team_id, away_team_id')
            .eq('season', group.season)
            .eq('league', group.league)
            .eq('group_name', group.groupName)
            .or(`home_team_id.eq.${fixAction.wrongTeamId},away_team_id.eq.${fixAction.wrongTeamId}`);
          
          if (matchdaysError) {
            console.error(`❌ Fehler beim Laden der Matchdays für Update:`, matchdaysError);
            continue;
          }

          if (matchdaysToUpdate && matchdaysToUpdate.length > 0) {
            for (const matchday of matchdaysToUpdate) {
              const updates = {};
              if (matchday.home_team_id === fixAction.wrongTeamId) {
                updates.home_team_id = fixAction.correctTeamId;
              }
              if (matchday.away_team_id === fixAction.wrongTeamId) {
                updates.away_team_id = fixAction.correctTeamId;
              }
              
              if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                  .from('matchdays')
                  .update(updates)
                  .eq('id', matchday.id);
                
                if (updateError) {
                  console.error(`❌ Fehler beim Aktualisieren des Matchdays ${matchday.id}:`, updateError);
                } else {
                  console.log(`✅ Matchday ${matchday.id} aktualisiert: Team-IDs korrigiert`);
                }
              }
            }
          }

        } catch (err) {
          console.error(`❌ Fehler bei automatischer Bereinigung für ${fixAction.wrongTeamName}:`, err);
        }
      }
      
      console.log(`✅ Automatische Bereinigung abgeschlossen!`);
    }

    // 5. Berechne prozentuale Übereinstimmung
    const totalItems = comparison.clubs.total + comparison.teams.total + comparison.matchdays.total;
    const totalMatched = comparison.clubs.matched + comparison.teams.matched + comparison.matchdays.matched;
    
    comparison.overallMatch = totalItems > 0 
      ? Math.round((totalMatched / totalItems) * 100) 
      : 100;

    // Markiere ob Bereinigung durchgeführt wurde (für Neuladen der Gruppen-Details)
    comparison.fixActionsPerformed = fixActionsPerformed;

    return comparison;
  };

  // Lade vorhandenen Snapshot
  const loadScraperSnapshot = async (group) => {
    const groupKey = getGroupKey(group);
    try {
      const { data, error } = await supabase
        .from('scraper_snapshots')
        .select('*')
        .eq('group_id', groupKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setScraperSnapshot(data);
        setScraperData(data.scraped_data);
        if (data.comparison_result) {
          setComparisonResult(data.comparison_result);
          setShowComparison(true);
        }
        return data;
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Snapshots:', error);
    }
    return null;
  };

  // Erstelle fehlendes Item
  const handleCreateMissingItem = async (item, type) => {
    try {
      if (type === 'club') {
        // Erstelle Club
        const { data: newClub, error } = await supabase
          .from('club_info')
          .insert({
            name: item.scrapedName,
            normalized_name: normalizeString(item.scrapedName),
            data_source: 'tvm_scraper',
            is_verified: false
          })
          .select()
          .single();

        if (error) throw error;
        
        // Aktualisiere clubs-Array
        setClubs((prev) => [...prev, newClub]);
        
        // Lade Vergleich neu (ohne Modal)
        if (selectedGroup && scraperData) {
          const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
          setComparisonResult(comparison);
        }
      } else if (type === 'team') {
        // Prüfe ob team_season hinzugefügt werden muss
        if (item.action === 'add_team_season' && item.existingTeamId) {
          // Team existiert bereits, füge nur team_season hinzu
          if (!selectedGroup) {
            console.error('❌ Keine Gruppe ausgewählt!');
            return;
          }

          // VALIDIERUNG: Prüfe ob Team die richtige Kategorie hat
          const { data: teamCheck, error: teamCheckError } = await supabase
            .from('team_info')
            .select('category')
            .eq('id', item.existingTeamId)
            .maybeSingle();

          if (teamCheckError && teamCheckError.code !== 'PGRST116') {
            console.error('❌ Fehler beim Prüfen der Team-Kategorie:', teamCheckError);
            return;
          }

          if (!teamCheck) {
            console.error('❌ Team konnte nicht gefunden werden!');
            return;
          }

          if (teamCheck.category !== selectedGroup.category) {
            console.error(`❌ Team hat Kategorie "${teamCheck.category}", aber Gruppe erfordert "${selectedGroup.category}"!`);
            return;
          }

          const { data: newSeason, error: seasonError } = await supabase
            .from('team_seasons')
            .insert({
              team_id: item.existingTeamId,
              season: selectedGroup.season,
              league: selectedGroup.league,
              group_name: selectedGroup.groupName,
              team_size: 6,
              is_active: true
            })
            .select()
            .single();

          if (seasonError) {
            // Prüfe ob bereits vorhanden (Unique Constraint)
            if (seasonError.code === '23505') {
              // Aktualisiere bestehenden Eintrag
              const { data: updatedSeason, error: updateError } = await supabase
                .from('team_seasons')
                .update({ is_active: true })
                .eq('team_id', item.existingTeamId)
                .eq('season', selectedGroup.season)
                .eq('league', selectedGroup.league)
                .eq('group_name', selectedGroup.groupName)
                .select()
                .single();

              if (updateError) throw updateError;
              
              // Aktualisiere teamSeasons-Array
              if (updatedSeason && setTeamSeasons) {
                setTeamSeasons((prev) => {
                  const filtered = prev.filter(ts => ts.id !== updatedSeason.id);
                  return [...filtered, updatedSeason];
                });
              }
            } else {
              throw seasonError;
            }
          } else if (newSeason && setTeamSeasons) {
            // Aktualisiere teamSeasons-Array
            setTeamSeasons((prev) => [...prev, newSeason]);
          }

          // Lade Gruppen-Details neu (mit forceReload)
          if (selectedGroup) {
            await loadGroupDetails(selectedGroup, true);
          }
          
          // Lade Vergleich neu
          if (selectedGroup && scraperData) {
            const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
            setComparisonResult(comparison);
          }
          
          return;
        }

        // Erstelle neues Team
        if (!item.suggestedClubId) {
          console.error('❌ Club muss zuerst erstellt werden!');
          return;
        }

        let club = clubs.find(c => c.id === item.suggestedClubId);
        if (!club) {
          try {
            const { data: fetchedClub, error: fetchClubError } = await supabase
              .from('club_info')
              .select('id, name, normalized_name')
              .eq('id', item.suggestedClubId)
              .maybeSingle();

            if (fetchClubError) {
              console.error('❌ Club konnte nicht nachgeladen werden:', fetchClubError);
              return;
            }

            if (!fetchedClub) {
              console.error('❌ Club nicht gefunden!');
              return;
            }

            club = fetchedClub;
            setClubs((prev) => (prev.some((c) => c.id === fetchedClub.id) ? prev : [...prev, fetchedClub]));
          } catch (clubLoadError) {
            console.error('❌ Club konnte nicht geladen werden:', clubLoadError);
            return;
          }
        }

        if (!selectedGroup) {
          console.error('❌ Keine Gruppe ausgewählt!');
          return;
        }

        // WICHTIG: Die Gruppe determiniert die Kategorie!
        // Alle Teams in dieser Gruppe MÜSSEN die gleiche Kategorie wie die Gruppe haben
        const requiredCategory = selectedGroup.category;
        if (!requiredCategory) {
          console.error('❌ Gruppe hat keine Kategorie!');
          return;
        }

        // WICHTIG: Prüfe ZUERST ob Team bereits existiert (club_id + team_name + category)
        const { data: existingTeam, error: checkError } = await supabase
          .from('team_info')
          .select('id, club_name, team_name, category')
          .eq('club_id', item.suggestedClubId)
          .eq('team_name', item.scrapedSuffix || '')
          .eq('category', requiredCategory)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Fehler beim Prüfen auf existierendes Team:', checkError);
        }

        let teamId;
        if (existingTeam) {
          // VALIDIERUNG: Prüfe ob Kategorie übereinstimmt
          if (existingTeam.category !== requiredCategory) {
            console.error(`❌ Team "${existingTeam.club_name} ${existingTeam.team_name}" hat Kategorie "${existingTeam.category}", aber Gruppe erfordert "${requiredCategory}"!`);
            return;
          }
          
          // Team existiert bereits - verwende es
          console.log(`ℹ️ Team existiert bereits (ID: ${existingTeam.id}), verwende es`);
          teamId = existingTeam.id;
        } else {
          // Erstelle neues Team mit der Kategorie der Gruppe
          const { data: newTeam, error: teamError } = await supabase
            .from('team_info')
            .insert({
              club_id: item.suggestedClubId,
              club_name: club.name,
              team_name: item.scrapedSuffix || null,
              category: requiredCategory, // WICHTIG: Kategorie kommt von der Gruppe!
              region: null
            })
            .select()
            .single();

          if (teamError) throw teamError;
          teamId = newTeam.id;
          
          // Aktualisiere State-Arrays
          setTeams((prev) => [...prev, newTeam]);
        }

        // Erstelle team_season (falls noch nicht vorhanden)
        const { data: existingSeason, error: seasonCheckError } = await supabase
          .from('team_seasons')
          .select('id')
          .eq('team_id', teamId)
          .eq('season', selectedGroup.season)
          .eq('league', selectedGroup.league)
          .eq('group_name', selectedGroup.groupName)
          .maybeSingle();

        if (seasonCheckError && seasonCheckError.code !== 'PGRST116') {
          console.warn('⚠️ Fehler beim Prüfen auf existierende team_season:', seasonCheckError);
        }

        if (!existingSeason) {
          // Erstelle team_season
          const { data: newSeason, error: seasonError } = await supabase
            .from('team_seasons')
            .insert({
              team_id: teamId,
              season: selectedGroup.season,
              league: selectedGroup.league,
              group_name: selectedGroup.groupName,
              team_size: 6,
              is_active: true
            })
            .select()
            .single();

          if (seasonError && seasonError.code !== '23505') {
            throw seasonError;
          }

          if (newSeason && setTeamSeasons) {
            setTeamSeasons((prev) => [...prev, newSeason]);
          }
        } else {
          // Aktualisiere bestehenden Eintrag auf is_active = true
          const { error: updateError } = await supabase
            .from('team_seasons')
            .update({ is_active: true })
            .eq('id', existingSeason.id);

          if (updateError) {
            console.warn('⚠️ Fehler beim Aktualisieren der team_season:', updateError);
          }
        }

        // Lade Gruppen-Details neu
        if (selectedGroup) {
          await loadGroupDetails(selectedGroup);
        }
        
        // Lade Vergleich neu
        if (selectedGroup && scraperData) {
          const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
          setComparisonResult(comparison);
        }
      } else if (type === 'matchday') {
        // Erstelle Matchday
        if (!selectedGroup) {
          console.error('❌ Keine Gruppe ausgewählt!');
          return;
        }

        // Finde Team-IDs für home und away
        // WICHTIG: Berücksichtige die Kategorie der Gruppe!
        const requiredCategory = selectedGroup.category;
        const findTeamId = (teamName) => {
          const parts = teamName.split(/\s+/);
          const clubName = parts.slice(0, -1).join(' ').trim();
          const teamSuffix = parts[parts.length - 1];

          const dbClub = clubs.find((club) => {
            const normalizedDb = normalizeString(club.name || '');
            const normalizedScraped = normalizeString(clubName);
            return normalizedDb === normalizedScraped || 
                   calculateSimilarity(clubName, club.name || '') >= 0.90;
          });

          if (!dbClub) return null;

          // WICHTIG: Suche Team mit Kategorie-Filter!
          const dbTeam = teams.find((team) => {
            if (team.club_id !== dbClub.id) return false;
            const normalizedDbTeam = normalizeString(team.team_name || '');
            const normalizedScrapedSuffix = normalizeString(teamSuffix);
            const teamNameMatch = normalizedDbTeam === normalizedScrapedSuffix;
            
            // WICHTIG: Prüfe auch Kategorie-Übereinstimmung
            if (requiredCategory && team.category) {
              const categoryMatch = normalizeString(team.category) === normalizeString(requiredCategory);
              return teamNameMatch && categoryMatch;
            }
            
            return teamNameMatch;
          });

          return dbTeam?.id || null;
        };

        const homeTeamId = findTeamId(item.homeTeam);
        const awayTeamId = findTeamId(item.awayTeam);

        if (!homeTeamId || !awayTeamId) {
          console.error(`❌ Teams nicht gefunden: ${item.homeTeam} oder ${item.awayTeam}`);
          return;
        }

        // WICHTIG: Wenn kein Datum vorhanden ist, verwende NICHT den aktuellen Timestamp!
        // Das würde zu falschen Import-Daten führen (z.B. Match 428)
        if (!item.matchDate) {
          console.error(`❌ Match ${item.matchNumber || 'unbekannt'} (${item.homeTeam} vs ${item.awayTeam}) hat kein Datum - kann nicht importiert werden!`);
          setError(`Match ${item.matchNumber || 'unbekannt'} hat kein Datum und kann nicht importiert werden. Bitte Datum in nuLiga prüfen oder manuell eingeben.`);
          return;
        }
        
        const matchDate = new Date(item.matchDate).toISOString();
        const matchDateOnly = matchDate.split('T')[0];

        // WICHTIG: Prüfe ZUERST ob Matchday bereits existiert (Unique Constraint!)
        const { data: existingMatchday, error: checkError } = await supabase
          .from('matchdays')
          .select('id, match_date, match_number, home_team_id, away_team_id')
          .gte('match_date', `${matchDateOnly}T00:00:00`)
          .lt('match_date', `${matchDateOnly}T23:59:59`)
          .or(`and(home_team_id.eq.${homeTeamId},away_team_id.eq.${awayTeamId}),and(home_team_id.eq.${awayTeamId},away_team_id.eq.${homeTeamId})`)
          .eq('season', selectedGroup.season)
          .eq('league', selectedGroup.league)
          .eq('group_name', selectedGroup.groupName)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Fehler beim Prüfen auf existierenden Matchday:', checkError);
        }

        if (existingMatchday) {
          // Matchday existiert bereits - aktualisiere nur match_number falls vorhanden
          console.log(`ℹ️ Matchday existiert bereits (ID: ${existingMatchday.id}), überspringe Erstellung`);
          
          if (item.matchNumber && !existingMatchday.match_number) {
            // Aktualisiere match_number falls noch nicht vorhanden
            const { error: updateError } = await supabase
              .from('matchdays')
              .update({ match_number: item.matchNumber })
              .eq('id', existingMatchday.id);
            
            if (updateError) {
              console.warn('⚠️ Fehler beim Aktualisieren der match_number:', updateError);
            }
          }

          // Lade Vergleich neu (Matchday sollte jetzt als "matched" erkannt werden)
          if (selectedGroup && scraperData) {
            const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
            setComparisonResult(comparison);
          }
          return;
        }

        // Prüfe auch nach match_number (falls vorhanden)
        if (item.matchNumber) {
          const { data: existingByNumber, error: numberCheckError } = await supabase
            .from('matchdays')
            .select('id, match_number')
            .eq('match_number', item.matchNumber)
            .maybeSingle();

          if (numberCheckError && numberCheckError.code !== 'PGRST116') {
            console.error('❌ Fehler beim Prüfen auf match_number:', numberCheckError);
          }

          if (existingByNumber) {
            console.log(`ℹ️ Matchday mit match_number ${item.matchNumber} existiert bereits (ID: ${existingByNumber.id}), überspringe Erstellung`);
            
            // Lade Vergleich neu
            if (selectedGroup && scraperData) {
              const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
              setComparisonResult(comparison);
            }
            return;
          }
        }

        // Matchday existiert nicht - erstelle neuen
        const { data: newMatchday, error: matchdayError } = await supabase
          .from('matchdays')
          .insert({
            match_date: matchDate,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_number: item.matchNumber || null,
            season: selectedGroup.season,
            league: selectedGroup.league,
            group_name: selectedGroup.groupName,
            status: 'scheduled',
            location: 'Home'
          })
          .select()
          .single();

        if (matchdayError) {
          // Wenn Unique Constraint Fehler, bedeutet das Matchday existiert bereits
          if (matchdayError.code === '23505') {
            console.log('ℹ️ Matchday existiert bereits (Unique Constraint), überspringe Erstellung');
            
            // Lade Vergleich neu
            if (selectedGroup && scraperData) {
              const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
              setComparisonResult(comparison);
            }
            return;
          }
          throw matchdayError;
        }

        // Lade Gruppen-Details neu (mit forceReload)
        if (selectedGroup) {
          await loadGroupDetails(selectedGroup, true);
        }
        
        // Lade Vergleich neu
        if (selectedGroup && scraperData) {
          const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
          setComparisonResult(comparison);
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen:', error);
      // Zeige Fehler in der Konsole, kein Modal
    }
  };

  // Sync/Update für abweichende Matchdays
  const handleSyncMatchday = async (mismatchItem) => {
    if (!mismatchItem?.dbMatch || !selectedGroup) return;
    const matchId = mismatchItem.dbMatch.id;
    const updates = {};
    const warnings = [];
    
    try {
      if (mismatchItem.needs.date && mismatchItem.scraped.matchDateIso) {
        updates.match_date = new Date(mismatchItem.scraped.matchDateIso).toISOString();
      }
      if (mismatchItem.needs.time) {
        updates.start_time = (mismatchItem.scraped.startTime || '').toString().slice(0, 5) || null;
      }
      if (mismatchItem.needs.number && mismatchItem.scraped.matchNumber != null) {
        updates.match_number = mismatchItem.scraped.matchNumber;
      }
      
      // WICHTIG: Teams nur updaten wenn resolved IDs vorhanden sind
      if (mismatchItem.needs.teams) {
        if (mismatchItem.resolved?.homeTeamId && mismatchItem.resolved?.awayTeamId) {
          updates.home_team_id = mismatchItem.resolved.homeTeamId;
          updates.away_team_id = mismatchItem.resolved.awayTeamId;
        } else {
          // Teams konnten nicht automatisch gemappt werden
          warnings.push(`Teams konnten nicht automatisch gemappt werden: "${mismatchItem.scraped.homeTeam}" vs "${mismatchItem.scraped.awayTeam}"`);
          console.warn(`⚠️ Teams konnten nicht automatisch gemappt werden für Match ${mismatchItem.dbMatch.id}:`, {
            scraped: {
              homeTeam: mismatchItem.scraped.homeTeam,
              awayTeam: mismatchItem.scraped.awayTeam
            },
            resolved: mismatchItem.resolved
          });
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updErr } = await supabase.from('matchdays').update(updates).eq('id', matchId);
        if (updErr) throw updErr;
        
        const updatedFields = Object.keys(updates).join(', ');
        console.log(`✅ Matchday ${matchId} aktualisiert: ${updatedFields}`);
      } else if (warnings.length > 0) {
        // Keine Updates möglich, aber Warnungen vorhanden
        const message = `⚠️ Keine Änderungen möglich:\n\n${warnings.join('\n')}\n\nMöchtest du die Teams manuell zuordnen?`;
        if (window.confirm(message)) {
          // Öffne manuelles Re-Mapping (falls verfügbar)
          const dbMatch = mismatchItem.dbMatch;
          const currentMatch = {
            id: dbMatch.id,
            home_team_id: dbMatch.home_team_id,
            away_team_id: dbMatch.away_team_id,
            match_number: dbMatch.match_number,
            match_date: dbMatch.match_date,
            group_name: selectedGroup.groupName
          };
          
          // Versuche handleReassignMatchTeams zu verwenden (wenn verfügbar)
          if (handleReassignMatchTeams) {
            try {
              // Zeige Dialog für manuelle Team-Zuordnung
              // Der User muss die Teams manuell auswählen - das ist komplexer, daher nur Hinweis
              alert('Bitte verwende die "Teams neu zuordnen"-Funktion im Matchday-Detail, um die Teams manuell zuzuordnen.');
            } catch (reassignErr) {
              console.error('❌ Fehler beim Öffnen des Re-Mapping-Dialogs:', reassignErr);
            }
          } else {
            alert('Bitte verwende die "Teams neu zuordnen"-Funktion im Matchday-Detail, um die Teams manuell zuzuordnen.');
          }
        }
        return; // Beende hier, da keine Updates gemacht wurden
      } else {
        // Keine Updates und keine Warnungen - sollte nicht passieren, aber logge es
        console.warn(`⚠️ handleSyncMatchday: Keine Updates für Match ${matchId}, aber auch keine Warnungen.`, mismatchItem);
        alert('Keine Änderungen erforderlich oder möglich.');
        return;
      }
      
      // Optional: Ergebnisse importieren
      if (mismatchItem.needs.importResults && handleLoadMeetingDetails) {
        const homeTeam = teamById.get(updates.home_team_id || mismatchItem.dbMatch.home_team_id);
        const awayTeam = teamById.get(updates.away_team_id || mismatchItem.dbMatch.away_team_id);
        const homeLabel = homeTeam ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim() : '';
        const awayLabel = awayTeam ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim() : '';
        await handleLoadMeetingDetails(
          { id: matchId, group_name: selectedGroup.groupName, match_number: updates.match_number || mismatchItem.dbMatch.match_number, match_date: updates.match_date || mismatchItem.dbMatch.match_date },
          { homeLabel, awayLabel, applyImport: true }
        );
      }
      
      // Lade Daten neu
      await loadGroupDetails(selectedGroup, true);
      if (scraperData) {
        const refreshed = await compareScrapedWithDatabase(selectedGroup, scraperData);
        setComparisonResult(refreshed);
      }
      
      // Zeige Erfolgsmeldung
      if (warnings.length === 0) {
        const updatedFields = Object.keys(updates).join(', ');
        console.log(`✅ Matchday erfolgreich synchronisiert: ${updatedFields}`);
      }
    } catch (err) {
      console.error('❌ Fehler beim Sync des Matchdays:', err);
      alert(`Fehler beim Synchronisieren: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  // Lade Details für eine Gruppe (mit forceReload Option)
  const loadGroupDetails = async (group, forceReload = false) => {
    const groupKey = getGroupKey(group);
    if (!forceReload && selectedGroup && getGroupKey(selectedGroup) === groupKey) {
      setSelectedGroup(null);
      setGroupDetails(null);
      setShowComparison(false);
      setComparisonResult(null);
      setScraperData(null);
      return;
    }

    setLoadingDetails(true);
    setSelectedGroup(group);
    
    // Versuche vorhandenen Snapshot zu laden (nur wenn nicht forceReload)
    if (!forceReload) {
      await loadScraperSnapshot(group);
    }

    try {
      // Lade Teams neu für diese Gruppe (falls neue Teams hinzugefügt wurden)
      const { data: updatedTeamSeasons, error: tsError } = await supabase
        .from('team_seasons')
        .select('*, team_info(id, club_name, team_name, category)')
        .eq('season', group.season)
        .eq('league', group.league)
        .eq('group_name', group.groupName)
        .eq('is_active', true);

      if (!tsError && updatedTeamSeasons) {
        // Finde Teams für diese team_seasons
        const updatedTeamIds = updatedTeamSeasons.map(ts => ts.team_id);
        const { data: updatedTeamsData, error: teamsError } = await supabase
          .from('team_info')
          .select('*')
          .in('id', updatedTeamIds);

        if (!teamsError && updatedTeamsData) {
          // Aktualisiere group.teams mit neuen Daten
          const updatedTeams = updatedTeamSeasons
            .map(ts => {
              const team = updatedTeamsData.find(t => t.id === ts.team_id);
              return team ? { ...team, teamSeason: ts } : null;
            })
            .filter(Boolean);
          
          // VALIDIERUNG: Prüfe ob alle Teams die richtige Kategorie haben
          if (group.category) {
            const categoryMismatches = updatedTeams.filter(team => {
              const teamCategory = normalizeString(team.category || '');
              const groupCategory = normalizeString(group.category);
              return teamCategory && groupCategory && teamCategory !== groupCategory;
            });
            
            if (categoryMismatches.length > 0) {
              console.warn('⚠️ Kategorie-Mismatches in Gruppe:', group.groupName);
              categoryMismatches.forEach(team => {
                console.warn(`   - ${team.club_name} ${team.team_name}: ${team.category} (erwartet: ${group.category})`);
              });

              // Auto-Remap: Erzeuge/verwende korrekt kategorisierte Teams und re-mappe Verknüpfungen dieser Gruppe
              for (const wrongTeam of categoryMismatches) {
                try {
                  // 1) Prüfe, ob ein korrektes Team existiert (gleicher Club + team_name + richtige Kategorie)
                  const { data: existingCorrect, error: existErr } = await supabase
                    .from('team_info')
                    .select('*')
                    .eq('club_id', wrongTeam.club_id)
                    .eq('team_name', wrongTeam.team_name || null)
                    .eq('category', group.category)
                    .maybeSingle();
                  if (existErr && existErr.code !== 'PGRST116') {
                    console.warn('⚠️ Fehler bei Suche nach korrekt kategorisiertem Team:', existErr);
                  }

                  let correctTeam = existingCorrect || null;

                  // 2) Falls nicht vorhanden, anlegen
                  if (!correctTeam) {
                    const { data: created, error: createErr } = await supabase
                      .from('team_info')
                      .insert({
                        club_id: wrongTeam.club_id,
                        club_name: wrongTeam.club_name,
                        team_name: wrongTeam.team_name || null,
                        category: group.category,
                        region: wrongTeam.region || null
                      })
                      .select()
                      .single();
                    if (createErr) {
                      console.warn('⚠️ Konnte korrektes Team nicht anlegen:', createErr);
                      continue;
                    }
                    correctTeam = created;
                  }

                  // 3) Re-map team_seasons dieser Gruppe auf korrektes Team
                  const { error: tsUpdateErr } = await supabase
                    .from('team_seasons')
                    .update({ team_id: correctTeam.id })
                    .eq('team_id', wrongTeam.id)
                    .eq('season', group.season)
                    .eq('league', group.league)
                    .eq('group_name', group.groupName);
                  if (tsUpdateErr) {
                    console.warn('⚠️ Konnte team_seasons nicht remappen:', tsUpdateErr);
                  }

                  // 4) Re-map matchdays dieser Gruppe auf korrektes Team (sowohl home als auch away)
                  const { error: mdUpdateHomeErr } = await supabase
                    .from('matchdays')
                    .update({ home_team_id: correctTeam.id })
                    .eq('home_team_id', wrongTeam.id)
                    .eq('season', group.season)
                    .eq('league', group.league)
                    .eq('group_name', group.groupName);
                  if (mdUpdateHomeErr) {
                    console.warn('⚠️ Konnte matchdays (home) nicht remappen:', mdUpdateHomeErr);
                  }
                  const { error: mdUpdateAwayErr } = await supabase
                    .from('matchdays')
                    .update({ away_team_id: correctTeam.id })
                    .eq('away_team_id', wrongTeam.id)
                    .eq('season', group.season)
                    .eq('league', group.league)
                    .eq('group_name', group.groupName);
                  if (mdUpdateAwayErr) {
                    console.warn('⚠️ Konnte matchdays (away) nicht remappen:', mdUpdateAwayErr);
                  }
                } catch (autoRemapError) {
                  console.warn('⚠️ Auto-Remap Kategorie fehlgeschlagen:', autoRemapError);
                }
              }
            }
          }
          
          // Aktualisiere group-Objekt
          group.teams = updatedTeams;
        }
      }

      const teamIds = group.teams.map((t) => t.id);

      // Lade alle Matchdays für diese Gruppe
      // Lade ALLE Matchdays der Gruppe (vollständiger Spielplan),
      // unabhängig davon, ob beide Teams bereits als Gruppen-Teams verknüpft sind.
      const { data: groupMatchdays, error: matchdaysError } = await supabase
        .from('matchdays')
        .select(`
          *,
          home_team:team_info!matchdays_home_team_id_fkey(id, club_name, team_name, category),
          away_team:team_info!matchdays_away_team_id_fkey(id, club_name, team_name, category)
        `)
        .eq('season', group.season)
        .eq('league', group.league)
        .eq('group_name', group.groupName)
        .order('match_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (matchdaysError) throw matchdaysError;

      // Lade Match Results für alle Matchdays
      const matchdayIds = (groupMatchdays || []).map((m) => m.id);
      let matchResults = [];
      if (matchdayIds.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .in('matchday_id', matchdayIds);

        if (!resultsError && results) {
          matchResults = results;
        }
      }

      // SYNC-PRÜFUNG: Prüfe ob alle abgeschlossenen Matches match_results haben
      const syncCheck = checkMatchResultsSync(groupMatchdays || [], matchResults);

      // Berechne Tabelle
      const standings = calculateStandings(groupMatchdays || [], matchResults, teamIds);

      // Berechne Statistiken
      const stats = calculateGroupStats(groupMatchdays || [], matchResults, group.teams.length);

      setGroupDetails({
        matchdays: groupMatchdays || [],
        matchResults,
        standings,
        stats,
        syncCheck
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Gruppendetails:', error);
      setGroupDetails({ error: error.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="groups-tab-container">
      <div className="groups-header">
        <h2 className="groups-title">
          <Trophy size={32} /> Gruppenübersicht
        </h2>
        <p className="groups-subtitle">
          Übersicht aller Gruppen nach Altersklassen und Ligen
        </p>
      </div>

      {showGroupImporter ? (
        <div className="group-importer-card">
          <div className="group-importer-header">
            <div>
              <h3 className="group-importer-title">nuLiga Gruppenimport</h3>
              <p className="group-importer-subtitle">
                Vereine, Teams, Saisons & Matchdays direkt aus nuLiga übernehmen
              </p>
            </div>
            <div className="group-importer-actions">
              <button
                className="group-importer-btn ghost"
                onClick={() => setShowGroupImporter(false)}
              >
                Schließen
              </button>
              <button
                className="group-importer-btn primary"
                onClick={handleImportAllGroups}
                disabled={groupImportLoading || groupImportDetails.length === 0}
              >
                <Download size={16} />
                Alle importieren
              </button>
            </div>
          </div>

          <div className="group-importer-grid">
            <div className="group-importer-field">
              <label>Gruppen-IDs (z.B. 34, 35, 36)</label>
              <input
                type="text"
                value={groupImportInput}
                onChange={(e) => setGroupImportInput(e.target.value)}
                placeholder="Leer lassen = alle Gruppen laut nuLiga"
              />
              <span className="group-importer-hint">
                Mehrere IDs durch Komma oder Leerzeichen trennen
              </span>
            </div>
            <div className="group-importer-field">
              <label>Saison</label>
              <input
                type="text"
                value={groupImportSeason}
                onChange={(e) => setGroupImportSeason(e.target.value)}
                placeholder="z.B. Winter 2025/26"
              />
              <span className="group-importer-hint">
                Wird an den Scraper weitergegeben (optional)
              </span>
            </div>
          </div>

          <div className="group-importer-buttons">
            <button
              className="group-importer-btn"
              onClick={handleFetchGroupImportData}
              disabled={groupImportLoading}
            >
              {groupImportLoading && groupImportDetails.length === 0 ? (
                <>
                  <Loader size={16} className="spinning" />
                  Lädt nuLiga-Daten…
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  nuLiga Daten laden
                </>
              )}
            </button>
            {groupImportDetails.length > 0 && (
              <button
                className="group-importer-btn ghost"
                onClick={handleImportAllGroups}
                disabled={groupImportLoading}
              >
                <Download size={16} />
                Offene Gruppen importieren
              </button>
            )}
          </div>

          {groupImportError && (
            <div className="group-importer-alert error">
              <AlertCircle size={18} />
              <span>{groupImportError}</span>
            </div>
          )}

          {groupImportDetails.length > 0 && (
            <div className="group-importer-results">
              <table>
                <thead>
                  <tr>
                    <th>Gruppe</th>
                    <th>Liga</th>
                    <th>Kategorie</th>
                    <th>Saison</th>
                    <th>Matches</th>
                    <th>Status</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {groupImportDetails.map((detail) => {
                    const status = detail.__importStatus || 'pending';
                    const groupLabel = detail.group?.groupName || detail.group?.groupId || 'Unbekannt';
                    return (
                      <tr key={detail.__importKey}>
                        <td>{groupLabel}</td>
                        <td>{detail.group?.league || '–'}</td>
                        <td>{detail.group?.category || '–'}</td>
                        <td>{groupImportSeason || detail.season || '–'}</td>
                        <td>{detail.matches?.length ?? 0}</td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {status === 'running' && <Loader size={14} className="spinning" />}
                            {getImporterStatusLabel(status)}
                          </span>
                          {detail.__importSummary && (
                            <div className="status-hint">{detail.__importSummary}</div>
                          )}
                        </td>
                        <td>
                          <button
                            className="group-importer-btn secondary"
                            onClick={() => handleImportSingleGroup(detail)}
                            disabled={groupImportLoading}
                          >
                            Importieren
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {groupImportLogs.length > 0 && (
            <div className="group-importer-log">
              <h4>Letzte Aktionen</h4>
              <ul>
                {groupImportLogs.slice(0, 6).map((entry, index) => (
                  <li key={`${entry.timestamp}-${entry.group}-${index}`}>
                    <div className="log-entry-headline">
                      <strong>{entry.group}</strong>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className={`status-badge status-${entry.status}`}>
                      {entry.summary}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="group-importer-collapsed">
          <div>
            <h3>nuLiga Gruppenimport</h3>
            <p>Import-Werkzeug öffnen, um Vereine & Matchdays direkt aus nuLiga zu übernehmen.</p>
          </div>
          <button
            className="group-importer-btn primary"
            onClick={() => setShowGroupImporter(true)}
          >
            Importer öffnen
          </button>
        </div>
      )}

      <div className="groups-content">
        <div className={`groups-list ${selectedGroup ? 'narrow' : ''}`}>
          {Array.from(categoriesMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, groups]) => (
              <div key={category} className="category-section">
                <button
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="category-header-content">
                    <span className="category-name">{category}</span>
                    <span className="category-count">{groups.length} Gruppe{groups.length !== 1 ? 'n' : ''}</span>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>

                {expandedCategories.has(category) && (
                  <div className="groups-grid">
                    {groups.map((group) => {
                      const isSelected = selectedGroup && getGroupKey(selectedGroup) === getGroupKey(group);
                      return (
                        <div
                          key={getGroupKey(group)}
                          className={`group-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => loadGroupDetails(group)}
                        >
                          <div className="group-card-header">
                            <h3 className="group-league">{group.league}</h3>
                            <span className="group-badge">{group.groupName}</span>
                          </div>
                          <div className="group-card-body">
                            <div className="group-info-item">
                              <Users size={16} />
                              <span>{group.teams.length} Teams</span>
                            </div>
                            <div className="group-info-item">
                              <Calendar size={16} />
                              <span>{group.season}</span>
                            </div>
                          </div>
                          {isSelected && loadingDetails && (
                            <div className="group-loading">Lade Details…</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
        </div>

        {selectedGroup && groupDetails && !loadingDetails && (
          <div className="group-details-panel">
            <div className="details-header">
              <div>
                <h3 className="details-title">{selectedGroup.league}</h3>
                <p className="details-subtitle">
                  {selectedGroup.groupName} • {selectedGroup.season}
                </p>
              </div>
              <div className="details-header-actions">
                <button
                  className="scraper-btn"
                  onClick={() => handleScrapeGroup(selectedGroup)}
                  disabled={scraperLoading}
                >
                  <RefreshCw size={16} className={scraperLoading ? 'spinning' : ''} />
                  {scraperLoading ? 'Lade nuLiga-Daten…' : 'Mit nuLiga vergleichen'}
                </button>
                <button
                  className="close-details-btn"
                  onClick={() => {
                    setSelectedGroup(null);
                    setGroupDetails(null);
                    setShowComparison(false);
                    setComparisonResult(null);
                    setScraperData(null);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {groupDetails.error ? (
              <div className="details-error">
                <p>Fehler beim Laden der Details: {groupDetails.error}</p>
              </div>
            ) : (
              <>
                {/* Statistiken */}
                <div className="details-stats">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <Users size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{groupDetails.stats.teamCount}</div>
                      <div className="stat-label">Teams</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <Calendar size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{groupDetails.stats.totalMatches}</div>
                      <div className="stat-label">Spiele</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <Target size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{groupDetails.stats.completedMatches}</div>
                      <div className="stat-label">Beendet</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">
                      <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{groupDetails.stats.completionRate}%</div>
                      <div className="stat-label">Fertig</div>
                    </div>
                  </div>
                </div>

                {/* Tabelle */}
                {groupDetails.standings && groupDetails.standings.length > 0 && (
                  <div className="details-section">
                    <h4 className="section-title">
                      <Trophy size={20} /> Tabelle
                    </h4>
                    <div className="standings-table-wrapper">
                      <table className="standings-table">
                        <thead>
                          <tr>
                            <th>Platz</th>
                            <th>Team</th>
                            <th>Spiele</th>
                            <th>S</th>
                            <th>N</th>
                            <th>Sätze</th>
                            <th>Spiele</th>
                            <th>Punkte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupDetails.standings.map((entry) => (
                            <tr key={entry.teamId} className={entry.position <= 3 ? 'top-three' : ''}>
                              <td className="position-cell">
                                {entry.position === 1 && <Award size={16} className="gold" />}
                                {entry.position === 2 && <Award size={16} className="silver" />}
                                {entry.position === 3 && <Award size={16} className="bronze" />}
                                <span>{entry.position}</span>
                              </td>
                              <td className="team-cell">{entry.teamName}</td>
                              <td>{entry.matches}</td>
                              <td className="win-cell">{entry.wins}</td>
                              <td className="loss-cell">{entry.losses}</td>
                              <td>
                                {entry.setsWon}:{entry.setsLost}
                                {entry.setsDiff !== 0 && (
                                  <span className={`diff ${entry.setsDiff > 0 ? 'positive' : 'negative'}`}>
                                    {entry.setsDiff > 0 ? '+' : ''}{entry.setsDiff}
                                  </span>
                                )}
                              </td>
                              <td>
                                {entry.gamesWon}:{entry.gamesLost}
                                {entry.gamesDiff !== 0 && (
                                  <span className={`diff ${entry.gamesDiff > 0 ? 'positive' : 'negative'}`}>
                                    {entry.gamesDiff > 0 ? '+' : ''}{entry.gamesDiff}
                                  </span>
                                )}
                              </td>
                              <td className="points-cell">{entry.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Vergleichs-Übersicht */}
                {showComparison && comparisonResult && (
                  <div className="details-section comparison-section">
                    <h4 className="section-title">
                      <RefreshCw size={20} /> nuLiga-Vergleich
                    </h4>
                    
                    {/* Prozentuale Übereinstimmung */}
                    <div className="comparison-overview">
                      <div className={`match-percentage ${comparisonResult.overallMatch >= 90 ? 'high' : comparisonResult.overallMatch >= 70 ? 'medium' : 'low'}`}>
                        <div className="match-percentage-value">{comparisonResult.overallMatch}%</div>
                        <div className="match-percentage-label">Übereinstimmung</div>
                      </div>
                      
                      <div className="comparison-stats">
                        <div className="comparison-stat-item">
                          <div className="stat-label">Clubs</div>
                          <div className="stat-value">
                            {comparisonResult.clubs.matched}/{comparisonResult.clubs.total}
                            {comparisonResult.clubs.missing > 0 && (
                              <span className="missing-count"> ({comparisonResult.clubs.missing} fehlen)</span>
                            )}
                          </div>
                        </div>
                        <div className="comparison-stat-item">
                          <div className="stat-label">Teams</div>
                          <div className="stat-value">
                            {comparisonResult.teams.matched}/{comparisonResult.teams.total}
                            {comparisonResult.teams.missing > 0 && (
                              <span className="missing-count"> ({comparisonResult.teams.missing} fehlen)</span>
                            )}
                          </div>
                        </div>
                        <div className="comparison-stat-item">
                          <div className="stat-label">Matchdays</div>
                          <div className="stat-value">
                            {comparisonResult.matchdays.matched}/{comparisonResult.matchdays.total}
                            {comparisonResult.matchdays.missing > 0 && (
                              <span className="missing-count"> ({comparisonResult.matchdays.missing} fehlen)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fehlende Clubs */}
                    {comparisonResult.clubs.missingItems.length > 0 && (
                      <div className="comparison-differences">
                        <h5 className="differences-title">
                          <AlertCircle size={18} /> Fehlende Clubs ({comparisonResult.clubs.missingItems.length})
                        </h5>
                        <div className="differences-list">
                          {comparisonResult.clubs.missingItems.map((item, idx) => (
                            <div key={idx} className="difference-item clickable" onClick={() => handleCreateMissingItem(item, 'club')}>
                              <div className="difference-item-content">
                                <span className="difference-name">{item.scrapedName}</span>
                                <span className="difference-action">
                                  <Plus size={16} /> Erstellen
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fehlende Teams */}
                    {comparisonResult.teams.missingItems.length > 0 && (
                      <div className="comparison-differences">
                        <h5 className="differences-title">
                          <AlertCircle size={18} /> Fehlende Teams ({comparisonResult.teams.missingItems.length})
                        </h5>
                        <div className="differences-list">
                          {comparisonResult.teams.missingItems.map((item, idx) => (
                            <div 
                              key={idx} 
                              className={`difference-item ${item.requiresClub ? 'disabled' : 'clickable'}`}
                              onClick={() => !item.requiresClub && handleCreateMissingItem(item, 'team')}
                              title={
                                item.requiresClub 
                                  ? 'Club muss zuerst erstellt werden' 
                                  : item.action === 'add_team_season'
                                    ? 'Team existiert bereits, wird zur Gruppe hinzugefügt'
                                    : 'Klicken zum Erstellen'
                              }
                            >
                              <div className="difference-item-content">
                                <span className="difference-name">{item.scrapedName}</span>
                                {item.requiresClub && (
                                  <span className="difference-warning">⚠️ Club fehlt</span>
                                )}
                                {!item.requiresClub && item.action === 'add_team_season' && (
                                  <span className="difference-action">
                                    <Plus size={16} /> Zur Gruppe hinzufügen
                                  </span>
                                )}
                                {!item.requiresClub && item.action !== 'add_team_season' && (
                                  <span className="difference-action">
                                    <Plus size={16} /> Erstellen
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fehlende Matchdays */}
                    {comparisonResult.matchdays.missingItems.length > 0 && (
                      <div className="comparison-differences">
                        <h5 className="differences-title">
                          <AlertCircle size={18} /> Fehlende Matchdays ({comparisonResult.matchdays.missingItems.length})
                        </h5>
                        <div className="differences-list">
                          {comparisonResult.matchdays.missingItems.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="difference-item clickable"
                              onClick={() => handleCreateMissingItem(item, 'matchday')}
                              title="Klicken zum Erstellen"
                            >
                              <div className="difference-item-content">
                                <div className="difference-match-info">
                                  <span className="difference-name">
                                    {item.matchNumber ? `Match #${item.matchNumber}` : 'Match'}
                                  </span>
                                  <span className="difference-teams">
                                    {item.homeTeam} vs {item.awayTeam}
                                  </span>
                                  {item.matchDate && (
                                    <span className="difference-date">
                                      {new Date(item.matchDate).toLocaleDateString('de-DE')}
                                    </span>
                                  )}
                                </div>
                                <span className="difference-action">
                                  <Plus size={16} /> Erstellen
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Abweichende Matchdays */}
                    {(comparisonResult.matchdays?.mismatchItems || []).length > 0 && (
                      <div className="comparison-differences">
                        <h5 className="differences-title">
                          <AlertCircle size={18} /> Abweichende Matchdays ({(comparisonResult.matchdays?.mismatchItems || []).length})
                        </h5>
                        <div className="differences-list">
                          {(comparisonResult.matchdays?.mismatchItems || []).map((item, idx) => {
                            const needs = item.needs || {};
                            const chips = [];
                            if (needs.number) chips.push('Matchnummer');
                            if (needs.date) chips.push('Datum');
                            if (needs.time) chips.push('Zeit');
                            if (needs.teams) chips.push('Teams');
                            if (needs.importResults) chips.push('Ergebnisse');
                            return (
                              <div key={idx} className="difference-item clickable" onClick={() => handleSyncMatchday(item)} title="nuLiga-Stand übernehmen">
                                <div className="difference-item-content">
                                  <div className="difference-match-info">
                                    <span className="difference-name">
                                      {item.scraped.matchNumber ? `Match #${item.scraped.matchNumber}` : 'Match'}
                                    </span>
                                    <span className="difference-teams">
                                      {item.scraped.homeTeam} vs {item.scraped.awayTeam}
                                    </span>
                                    {item.scraped.matchDateIso && (
                                      <span className="difference-date">
                                        {new Date(item.scraped.matchDateIso).toLocaleDateString('de-DE')}
                                        {item.scraped.startTime ? ` · ${String(item.scraped.startTime).slice(0,5)}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="difference-chips">
                                    {chips.map((c) => (
                                      <span key={c} className="chip">{c}</span>
                                    ))}
                                  </div>
                                  <span className="difference-action">
                                    <RefreshCw size={16} /> nuLiga übernehmen
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Alles passt */}
                    {comparisonResult.overallMatch === 100 && (
                      <div className="comparison-success">
                        <CheckCircle2 size={24} />
                        <p>Alle Daten sind synchron! 🎉</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sync-Prüfung Warnung */}
                {groupDetails.syncCheck && groupDetails.syncCheck.withoutResults > 0 && (
                  <div className="details-section">
                    <div className="sync-warning">
                      <AlertCircle size={20} />
                      <div className="sync-warning-content">
                        <h4>Ergebnisse fehlen</h4>
                        <p>
                          {groupDetails.syncCheck.withoutResults} von {groupDetails.syncCheck.totalFinished} abgeschlossenen Spielen haben keine Einzel/Doppel-Ergebnisse.
                        </p>
                        {/* Button zum automatischen Import aller fehlenden Ergebnisse */}
                        {groupDetails.syncCheck.matchesWithoutResults.length > 0 && (
                          <button
                            className="btn-sync-all"
                            onClick={async () => {
                              if (!handleLoadMeetingDetails) return;
                              const matchesToImport = groupDetails.syncCheck.matchesWithoutResults;
                              let successCount = 0;
                              let errorCount = 0;
                              
                              for (const match of matchesToImport) {
                                const homeTeam = match.home_team;
                                const awayTeam = match.away_team;
                                const homeLabel = homeTeam
                                  ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim()
                                  : 'Unbekannt';
                                const awayLabel = awayTeam
                                  ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim()
                                  : 'Unbekannt';
                                
                                setMeetingDetails(prev => ({
                                  ...prev,
                                  [match.id]: { ...prev[match.id], loading: true, importing: true }
                                }));
                                
                                try {
                                  await handleLoadMeetingDetails(match, {
                                    homeLabel,
                                    awayLabel,
                                    applyImport: true
                                  });
                                  successCount++;
                                  console.log(`✅ Ergebnisse importiert für Match #${match.match_number}`);
                                  
                                  // Kurze Pause zwischen Imports
                                  await new Promise(resolve => setTimeout(resolve, 500));
                                } catch (error) {
                                  errorCount++;
                                  console.error(`❌ Fehler beim Import für Match #${match.match_number}:`, error);
                                } finally {
                                  setMeetingDetails(prev => ({
                                    ...prev,
                                    [match.id]: { ...prev[match.id], loading: false, importing: false }
                                  }));
                                }
                              }
                              
                              // Lade Daten neu
                              if (loadMatchResults) {
                                for (const match of matchesToImport) {
                                  setTimeout(() => loadMatchResults(match.id), 500);
                                }
                              }
                              if (loadDashboardData) {
                                setTimeout(() => loadDashboardData(), 1000);
                              }
                              
                              alert(`Import abgeschlossen: ${successCount} erfolgreich, ${errorCount} Fehler`);
                            }}
                          >
                            Alle Ergebnisse automatisch importieren ({groupDetails.syncCheck.matchesWithoutResults.length} Matches)
                          </button>
                        )}
                        <div className="sync-warning-matches">
                          {groupDetails.syncCheck.matchesWithoutResults.slice(0, 5).map((match) => {
                            const homeTeam = match.home_team;
                            const awayTeam = match.away_team;
                            const homeLabel = homeTeam
                              ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim()
                              : 'Unbekannt';
                            const awayLabel = awayTeam
                              ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim()
                              : 'Unbekannt';
                            return (
                              <div key={match.id} className="sync-warning-match">
                                <span>{homeLabel} vs {awayLabel}</span>
                                <button
                                  className="btn-sync-load"
                                  onClick={async () => {
                                    if (!handleLoadMeetingDetails) return;
                                    const homeLabel = homeTeam
                                      ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim()
                                      : 'Unbekannt';
                                    const awayLabel = awayTeam
                                      ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim()
                                      : 'Unbekannt';
                                    setMeetingDetails(prev => ({
                                      ...prev,
                                      [match.id]: { ...prev[match.id], loading: true }
                                    }));
                                    try {
                                      await handleLoadMeetingDetails(match, {
                                        homeLabel,
                                        awayLabel,
                                        applyImport: true
                                      });
                                      if (loadMatchResults) {
                                        setTimeout(() => loadMatchResults(match.id), 500);
                                      }
                                      if (loadDashboardData) {
                                        setTimeout(() => loadDashboardData(), 1000);
                                      }
                                    } catch (error) {
                                      console.error('❌ Fehler beim Laden der Ergebnisse:', error);
                                      setMeetingDetails(prev => ({
                                        ...prev,
                                        [match.id]: { 
                                          ...prev[match.id], 
                                          loading: false,
                                          error: error.message || 'Fehler beim Laden der Ergebnisse'
                                        }
                                      }));
                                    }
                                  }}
                                >
                                  Ergebnisse laden
                                </button>
                              </div>
                            );
                          })}
                          {groupDetails.syncCheck.matchesWithoutResults.length > 5 && (
                            <div className="sync-warning-more">
                              + {groupDetails.syncCheck.matchesWithoutResults.length - 5} weitere
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Spielplan */}
                {groupDetails.matchdays && groupDetails.matchdays.length > 0 && (
                  <div className="details-section">
                    <h4 className="section-title">
                      <Calendar size={20} /> Spielplan
                    </h4>
                    <div className="matchdays-list">
                      {groupDetails.matchdays.map((match) => {
                        const homeTeam = match.home_team;
                        const awayTeam = match.away_team;
                        const homeInGroup = selectedGroup ? (selectedGroup.teams || []).some(t => t.id === match.home_team_id) : false;
                        const awayInGroup = selectedGroup ? (selectedGroup.teams || []).some(t => t.id === match.away_team_id) : false;
                        const homeLabel = homeTeam
                          ? `${homeTeam.club_name} ${homeTeam.team_name || ''}`.trim()
                          : 'Unbekannt';
                        const awayLabel = awayTeam
                          ? `${awayTeam.club_name} ${awayTeam.team_name || ''}`.trim()
                          : 'Unbekannt';
                        const matchDate = match.match_date
                          ? new Date(match.match_date).toLocaleDateString('de-DE', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : '–';
                        const matchTime = match.start_time || '–';
                        // Prüfe ob Match Ergebnisse hat
                        const matchResultsForMatch = (groupDetails.matchResults || []).filter(mr => mr.matchday_id === match.id);
                        const hasResults = matchResultsForMatch.length > 0;
                        const isFinished = FINISHED_STATUSES.includes(match.status) ||
                          (match.home_score !== null && match.away_score !== null);
                        // Wenn match_results vorhanden sind, Score daraus berechnen (Quelle: nuLiga)
                        const pointsFromResults = hasResults
                          ? deriveMatchPointsFromResults(matchResultsForMatch)
                          : null;
                        const score = isFinished
                          ? pointsFromResults
                            ? `${pointsFromResults.home}:${pointsFromResults.away}`
                            : `${match.home_score ?? '–'}:${match.away_score ?? '–'}`
                          : '–:–';

                        const needsResults = isFinished && !hasResults;

                        return (
                          <div 
                            key={match.id} 
                            className={`matchday-item ${isFinished ? 'finished' : ''} ${needsResults ? 'needs-results' : ''} ${(!homeInGroup || !awayInGroup) ? 'not-in-group' : ''} ${selectedMatch?.id === match.id ? 'selected' : ''}`}
                            onClick={() => setSelectedMatch(match)}
                          >
                            <div className="matchday-header">
                              <div className="matchday-date">
                                <div className="matchday-date-main">{matchDate}</div>
                                <div className="matchday-time">{matchTime}</div>
                              </div>
                              {match.match_number && (
                                <div className="matchday-number-badge">
                                  <span className="match-number-label">Match #</span>
                                  <span className="match-number-value">{match.match_number}</span>
                                </div>
                              )}
                              {(!homeInGroup || !awayInGroup) && (
                                <div className="matchday-results-badge missing">
                                  ⚠️ Team fehlt in Gruppe
                                </div>
                              )}
                              {needsResults && (
                                <div className="matchday-results-badge missing">
                                  ⚠️ Ergebnisse fehlen
                                </div>
                              )}
                              {hasResults && (
                                <div className="matchday-results-badge has-results">
                                  ✓ {matchResultsForMatch.length} Ergebnis{matchResultsForMatch.length !== 1 ? 'se' : ''}
                                </div>
                              )}
                            </div>
                            <div className="matchday-teams">
                              <div className="matchday-team home">
                                <span className="team-name">{homeLabel}</span>
                                <span className="team-score">{isFinished ? match.home_score ?? '–' : ''}</span>
                              </div>
                              <div className="matchday-separator">:</div>
                              <div className="matchday-team away">
                                <span className="team-score">{isFinished ? match.away_score ?? '–' : ''}</span>
                                <span className="team-name">{awayLabel}</span>
                              </div>
                            </div>
                            {(!homeInGroup || !awayInGroup) && (
                              <div className="matchday-venue" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                {!homeInGroup && homeTeam?.id && (
                                  <button
                                    className="btn-sync-load"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await addTeamToCurrentGroup(homeTeam.id, selectedGroup);
                                        await loadGroupDetails(selectedGroup, true);
                                      } catch {}
                                    }}
                                  >
                                    + {homeLabel} zur Gruppe
                                  </button>
                                )}
                                {!awayInGroup && awayTeam?.id && (
                                  <button
                                    className="btn-sync-load"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await addTeamToCurrentGroup(awayTeam.id, selectedGroup);
                                        await loadGroupDetails(selectedGroup, true);
                                      } catch {}
                                    }}
                                  >
                                    + {awayLabel} zur Gruppe
                                  </button>
                                )}
                              </div>
                            )}
                            {match.venue && (
                              <div className="matchday-venue">
                                <span>📍 {match.venue}</span>
                              </div>
                            )}
                            {match.status && match.status !== 'scheduled' && match.status !== 'completed' && (
                              <div className="matchday-status">
                                <span className={`status-badge ${match.status}`}>
                                  {match.status === 'cancelled' && '❌ Abgesagt'}
                                  {match.status === 'postponed' && '🕒 Verschoben'}
                                  {match.status === 'retired' && '🏥 Aufgabe'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Match-Detailansicht */}
                {selectedMatch && (
                  <div className="match-detail-overlay">
                    <MatchDetailView
                      match={selectedMatch}
                      groupDetails={groupDetails}
                      onClose={() => setSelectedMatch(null)}
                      handleLoadMeetingDetails={handleLoadMeetingDetails}
                      loadMatchResults={loadMatchResults}
                      matchResultsData={matchResultsData}
                      handleCreateMissingPlayer={handleCreateMissingPlayer}
                      creatingPlayerKey={creatingPlayerKey}
                      teamById={teamById}
                      handleReassignMatchTeams={handleReassignMatchTeams}
                      meetingDetails={meetingDetails}
                      setMeetingDetails={setMeetingDetails}
                      loadDashboardData={loadDashboardData}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Match-Detailansicht Komponente
function MatchDetailView({
  match,
  groupDetails,
  onClose,
  handleLoadMeetingDetails,
  loadMatchResults,
  matchResultsData,
  handleCreateMissingPlayer,
  creatingPlayerKey,
  teamById,
  handleReassignMatchTeams,
  meetingDetails,
  setMeetingDetails,
  loadDashboardData
}) {
  const meetingData = meetingDetails[match.id];
  const resultsData = matchResultsData[match.id];

  // Spieler-Lookup nach Name (für Badges)
  const [playerLookupByName, setPlayerLookupByName] = React.useState(new Map());
  useEffect(() => {
    try {
      const map = new Map();

      // Priorität: Spieler aus den geladenen Match-Results (inkl. LK & Quelle)
      if (resultsData?.players) {
        Object.values(resultsData.players).forEach((player) => {
          if (!player?.name) return;
          map.set(player.name, player);
        });
      } else {
        // Fallback: baue Lookup aus bereits vorhandenen groupDetails
        const results = groupDetails?.matchResults || [];
        results.forEach((r) => {
          if (r?.player_name) {
            map.set(r.player_name, r);
          }
        });
      }

      setPlayerLookupByName(map);
    } catch (error) {
      console.warn('⚠️ Fehler beim Aufbau des Spieler-Lookups:', error);
      setPlayerLookupByName(new Map());
    }
  }, [groupDetails, resultsData]);
  const homeTeam = match.home_team || teamById?.get(match.home_team_id);
  const awayTeam = match.away_team || teamById?.get(match.away_team_id);
  const homeLabel = homeTeam
    ? `${homeTeam.club_name}${homeTeam.team_name ? ` ${homeTeam.team_name}` : ''}`.trim()
    : 'Unbekannt';
  const awayLabel = awayTeam
    ? `${awayTeam.club_name}${awayTeam.team_name ? ` ${awayTeam.team_name}` : ''}`.trim()
    : 'Unbekannt';

  const matchResultsForMatch = (groupDetails?.matchResults || []).filter(mr => mr.matchday_id === match.id);
  const hasResults = matchResultsForMatch.length > 0;
  const isFinished = FINISHED_STATUSES.includes(match.status) || (match.home_score !== null && match.away_score !== null);
  const needsResults = isFinished && !hasResults;

  // Lade Match-Results wenn Match geöffnet wird
  useEffect(() => {
    if (match?.id && hasResults && !resultsData) {
      loadMatchResults?.(match.id);
    }
  }, [match?.id, hasResults, resultsData, loadMatchResults]);

  const handleLoadResults = async () => {
    if (!handleLoadMeetingDetails) return;
    
    setMeetingDetails(prev => ({
      ...prev,
      [match.id]: { ...prev[match.id], loading: true }
    }));

    try {
      await handleLoadMeetingDetails(match, {
        homeLabel,
        awayLabel,
        applyImport: true
      });
      
      // Lade Match-Results neu
      if (loadMatchResults) {
        setTimeout(() => {
          loadMatchResults(match.id);
        }, 500);
      }
      
      // Reload Dashboard Data
      if (loadDashboardData) {
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
      }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Ergebnisse:', error);
        setMeetingDetails(prev => ({
          ...prev,
          [match.id]: { 
            ...prev[match.id], 
            loading: false,
            error: error.message || 'Fehler beim Laden der Ergebnisse'
          }
        }));
      }
    };

  return (
    <div className="match-detail-card">
      <div className="match-detail-header">
        <div>
          <h3 className="match-detail-title">{homeLabel} vs. {awayLabel}</h3>
          <div className="match-detail-meta">
            {match.match_date
              ? new Date(match.match_date).toLocaleString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Datum unbekannt'}
            {match.match_number && ` · Match ${match.match_number}`}
          </div>
        </div>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {needsResults && (
        <div className="match-detail-warning">
          <AlertCircle size={20} />
          <div>
            <p>Dieses Spiel ist abgeschlossen, aber es fehlen die Einzel/Doppel-Ergebnisse.</p>
            <button className="btn-load-results" onClick={handleLoadResults} disabled={meetingData?.loading}>
              {meetingData?.loading ? 'Lade Ergebnisse…' : 'Ergebnisse aus nuLiga laden'}
            </button>
          </div>
        </div>
      )}

      {meetingData?.error && (
        <div className="match-detail-error">
          <AlertCircle size={20} />
          <div>
            <p>{meetingData.error}</p>
            {(meetingData.errorCode === 'MEETING_ID_NOT_AVAILABLE' || 
              meetingData.error?.includes('noch keine Meeting-ID verfügbar')) && (
              <p className="error-hint">
                💡 Tipp: Das Spiel wurde möglicherweise noch nicht gespielt. Bitte versuche es später erneut, 
                nachdem das Spiel stattgefunden hat und die Ergebnisse in nuLiga eingetragen wurden.
              </p>
            )}
          </div>
        </div>
      )}

      {resultsData && (resultsData.singles?.length > 0 || resultsData.doubles?.length > 0) && (
        <div className="match-detail-results">
          <h4>Ergebnisse</h4>
          <div className="results-summary">
            {resultsData.singles?.length || 0} Einzel · {resultsData.doubles?.length || 0} Doppel
          </div>
          {resultsData.singles?.length > 0 && (
            <div className="results-section">
              <h5>Einzel</h5>
              <MatchResultsTable entries={resultsData.singles} playerLookupByName={playerLookupByName} />
            </div>
          )}
          {resultsData.doubles?.length > 0 && (
            <div className="results-section">
              <h5>Doppel</h5>
              <MatchResultsTable entries={resultsData.doubles} playerLookupByName={playerLookupByName} />
            </div>
          )}
        </div>
      )}

      {!hasResults && !needsResults && (
        <div className="match-detail-info">
          <p>Dieses Spiel ist noch nicht abgeschlossen.</p>
        </div>
      )}
    </div>
  );
}

// MatchResultsTable Komponente (vereinfacht)
function MatchResultsTable({ entries, playerLookupByName = new Map() }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="match-results-table">
      {entries.map((entry, idx) => (
        <div key={idx} className="match-result-row">
          <div className="result-players">
            <div className="result-home">
              {entry.homePlayers?.map((p, i) => {
                const name = p.name || 'Unbekannt';
                const player = playerLookupByName.get(name);
                const badge = player?.user_id ? 'App' : player ? 'DB' : 'Neu';
                return (
                  <span key={i} className="result-player-chip">
                    <span className={`player-badge ${badge === 'App' ? 'app' : badge === 'DB' ? 'db' : 'new'}`}>
                      {badge}
                    </span>
                    <span className="player-name">{name}</span>
                    {p.lk ? <span className="player-lk">LK {p.lk}</span> : null}
                  </span>
                );
              })}
            </div>
            <div className="result-separator">vs</div>
            <div className="result-away">
              {entry.awayPlayers?.map((p, i) => {
                const name = p.name || 'Unbekannt';
                const player = playerLookupByName.get(name);
                const badge = player?.user_id ? 'App' : player ? 'DB' : 'Neu';
                return (
                  <span key={i} className="result-player-chip">
                    <span className={`player-badge ${badge === 'App' ? 'app' : badge === 'DB' ? 'db' : 'new'}`}>
                      {badge}
                    </span>
                    <span className="player-name">{name}</span>
                    {p.lk ? <span className="player-lk">LK {p.lk}</span> : null}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="result-scores">
            {entry.setScores?.map((set, i) => (
              <span key={i} className="set-score">{set.raw}</span>
            ))}
            {entry.matchPoints && (
              <span className="match-points">{entry.matchPoints.raw}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupsTab;

