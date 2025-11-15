import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trophy, Users, Calendar, TrendingUp, ChevronRight, ChevronDown, Award, Target, RefreshCw, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { calculateSimilarity, normalizeString } from '../../services/matchdayImportService';
import './GroupsTab.css';

const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];

function GroupsTab({ teams, teamSeasons, matchdays, clubs, players, setTeams, setClubs }) {
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

  // Lade Details für eine Gruppe
  const loadGroupDetails = async (group) => {
    const groupKey = getGroupKey(group);
    if (selectedGroup && getGroupKey(selectedGroup) === groupKey) {
      setSelectedGroup(null);
      setGroupDetails(null);
      setShowComparison(false);
      setComparisonResult(null);
      setScraperData(null);
      return;
    }

    setLoadingDetails(true);
    setSelectedGroup(group);
    
    // Versuche vorhandenen Snapshot zu laden
    await loadScraperSnapshot(group);

    try {
      const teamIds = group.teams.map((t) => t.id);

      // Lade alle Matchdays für diese Gruppe
      const { data: groupMatchdays, error: matchdaysError } = await supabase
        .from('matchdays')
        .select(`
          *,
          home_team:team_info!matchdays_home_team_id_fkey(id, club_name, team_name, category),
          away_team:team_info!matchdays_away_team_id_fkey(id, club_name, team_name, category)
        `)
        .in('home_team_id', teamIds)
        .in('away_team_id', teamIds)
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

      // Berechne Tabelle
      const standings = calculateStandings(groupMatchdays || [], matchResults, teamIds);

      // Berechne Statistiken
      const stats = calculateGroupStats(groupMatchdays || [], matchResults, group.teams.length);

      setGroupDetails({
        matchdays: groupMatchdays || [],
        matchResults,
        standings,
        stats
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Gruppendetails:', error);
      setGroupDetails({ error: error.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Berechne Tabelle
  const calculateStandings = (matchdays, matchResults, teamIds) => {
    const teamStats = new Map();

    // Initialisiere alle Teams
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

      // Prüfe ob Match beendet ist
      const isFinished = FINISHED_STATUSES.includes(match.status) ||
        (match.home_score !== null && match.away_score !== null);

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
    const standingsArray = Array.from(teamStats.values())
      .map((stats) => {
        const team = teams.find((t) => t.id === stats.teamId);
        return {
          ...stats,
          team,
          teamName: team ? `${team.club_name} ${team.team_name || ''}`.trim() : 'Unbekannt',
          setsDiff: stats.setsWon - stats.setsLost,
          gamesDiff: stats.gamesWon - stats.gamesLost
        };
      })
      .filter((s) => s.team) // Nur Teams die existieren
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
      FINISHED_STATUSES.includes(m.status) ||
      (m.home_score !== null && m.away_score !== null)
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
      const groupData = details.find(
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

      // Speichere Snapshot in DB
      const groupKey = getGroupKey(group);
      await saveScraperSnapshot(groupKey, group, scrapedData);

      // Führe Vergleich durch
      const comparison = await compareScrapedWithDatabase(group, scrapedData);
      setComparisonResult(comparison);
      setShowComparison(true);

      // Aktualisiere Snapshot mit Vergleichsergebnis
      await updateScraperSnapshotComparison(groupKey, comparison);

    } catch (error) {
      console.error('❌ Fehler beim Scrapen der Gruppe:', error);
      alert(`Fehler beim Scrapen: ${error.message}`);
    } finally {
      setScraperLoading(false);
    }
  };

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
      matchdays: { total: 0, matched: 0, missing: 0, missingItems: [] },
      overallMatch: 0
    };

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

      // Suche Team in DB - ZUERST in der aktuellen Gruppe
      const teamKey = `${normalizeString(dbClub.name || '')}_${normalizeString(teamSuffix)}`;
      let dbTeam = groupTeamsByKey.get(teamKey);

      // Falls nicht in Gruppe gefunden, suche global (aber markiere als "nicht in Gruppe")
      if (!dbTeam) {
        dbTeam = teams.find((team) => {
          if (team.club_id !== dbClub.id) return false;
          const normalizedDbTeam = normalizeString(team.team_name || '');
          const normalizedScrapedSuffix = normalizeString(teamSuffix);
          return normalizedDbTeam === normalizedScrapedSuffix;
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

    scrapedMatches.forEach((scrapedMatch) => {
      const matchNumber = scrapedMatch.matchNumber || scrapedMatch.match_number;
      const homeTeam = scrapedMatch.homeTeam || '';
      const awayTeam = scrapedMatch.awayTeam || '';
      const matchDate = scrapedMatch.matchDateIso;

      // Suche Match in DB
      let found = false;
      
      if (matchNumber) {
        found = groupDetails?.matchdays?.some((match) => 
          String(match.match_number) === String(matchNumber)
        );
      }

      if (!found && matchDate) {
        const matchDateOnly = matchDate ? new Date(matchDate).toISOString().split('T')[0] : null;
        found = groupDetails?.matchdays?.some((match) => {
          if (!match.match_date) return false;
          const dbDateOnly = new Date(match.match_date).toISOString().split('T')[0];
          return dbDateOnly === matchDateOnly;
        });
      }

      if (found) {
        comparison.matchdays.matched += 1;
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

    // 4. Berechne prozentuale Übereinstimmung
    const totalItems = comparison.clubs.total + comparison.teams.total + comparison.matchdays.total;
    const totalMatched = comparison.clubs.matched + comparison.teams.matched + comparison.matchdays.matched;
    
    comparison.overallMatch = totalItems > 0 
      ? Math.round((totalMatched / totalItems) * 100) 
      : 100;

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
        
        alert(`✅ Club "${item.scrapedName}" wurde erstellt!`);
        
        // Lade Vergleich neu
        if (selectedGroup && scraperData) {
          const comparison = await compareScrapedWithDatabase(selectedGroup, scraperData);
          setComparisonResult(comparison);
        }
      } else if (type === 'team') {
        // Prüfe ob team_season hinzugefügt werden muss
        if (item.action === 'add_team_season' && item.existingTeamId) {
          // Team existiert bereits, füge nur team_season hinzu
          if (!selectedGroup) {
            alert('❌ Keine Gruppe ausgewählt!');
            return;
          }

          const { error: seasonError } = await supabase
            .from('team_seasons')
            .insert({
              team_id: item.existingTeamId,
              season: selectedGroup.season,
              league: selectedGroup.league,
              group_name: selectedGroup.groupName,
              team_size: 6,
              is_active: true
            });

          if (seasonError) {
            // Prüfe ob bereits vorhanden (Unique Constraint)
            if (seasonError.code === '23505') {
              // Aktualisiere bestehenden Eintrag
              const { error: updateError } = await supabase
                .from('team_seasons')
                .update({ is_active: true })
                .eq('team_id', item.existingTeamId)
                .eq('season', selectedGroup.season)
                .eq('league', selectedGroup.league)
                .eq('group_name', selectedGroup.groupName);

              if (updateError) throw updateError;
            } else {
              throw seasonError;
            }
          }

          alert(`✅ Team "${item.scrapedName}" wurde zur Gruppe hinzugefügt!`);
          
          // Lade Daten neu
          window.location.reload(); // Einfachste Lösung für jetzt
          return;
        }

        // Erstelle neues Team
        if (!item.suggestedClubId) {
          alert('❌ Club muss zuerst erstellt werden!');
          return;
        }

        const club = clubs.find(c => c.id === item.suggestedClubId);
        if (!club) {
          alert('❌ Club nicht gefunden!');
          return;
        }

        if (!selectedGroup) {
          alert('❌ Keine Gruppe ausgewählt!');
          return;
        }

        // Erstelle Team
        const { data: newTeam, error: teamError } = await supabase
          .from('team_info')
          .insert({
            club_id: item.suggestedClubId,
            club_name: club.name,
            team_name: item.scrapedSuffix || null,
            category: selectedGroup.category || null,
            region: null
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Erstelle team_season
        const { error: seasonError } = await supabase
          .from('team_seasons')
          .insert({
            team_id: newTeam.id,
            season: selectedGroup.season,
            league: selectedGroup.league,
            group_name: selectedGroup.groupName,
            team_size: 6,
            is_active: true
          });

        if (seasonError && seasonError.code !== '23505') {
          throw seasonError;
        }

        // Aktualisiere teams-Array
        setTeams((prev) => [...prev, newTeam]);

        alert(`✅ Team "${item.scrapedName}" wurde erstellt und zur Gruppe hinzugefügt!`);
        
        // Lade Daten neu
        window.location.reload(); // Einfachste Lösung für jetzt
      } else if (type === 'matchday') {
        // Erstelle Matchday
        if (!selectedGroup) {
          alert('❌ Keine Gruppe ausgewählt!');
          return;
        }

        // Finde Team-IDs für home und away
        const findTeamId = async (teamName) => {
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

          const dbTeam = teams.find((team) => {
            if (team.club_id !== dbClub.id) return false;
            const normalizedDbTeam = normalizeString(team.team_name || '');
            const normalizedScrapedSuffix = normalizeString(teamSuffix);
            return normalizedDbTeam === normalizedScrapedSuffix;
          });

          return dbTeam?.id || null;
        };

        const homeTeamId = await findTeamId(item.homeTeam);
        const awayTeamId = await findTeamId(item.awayTeam);

        if (!homeTeamId || !awayTeamId) {
          alert(`❌ Teams nicht gefunden: ${item.homeTeam} oder ${item.awayTeam}`);
          return;
        }

        const matchDate = item.matchDate ? new Date(item.matchDate).toISOString() : new Date().toISOString();

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

        if (matchdayError) throw matchdayError;

        alert(`✅ Matchday "${item.homeTeam} vs ${item.awayTeam}" wurde erstellt!`);
        
        // Lade Daten neu
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen:', error);
      alert(`Fehler: ${error.message}`);
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

                    {/* Alles passt */}
                    {comparisonResult.overallMatch === 100 && (
                      <div className="comparison-success">
                        <CheckCircle2 size={24} />
                        <p>Alle Daten sind synchron! 🎉</p>
                      </div>
                    )}
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
                        const isFinished = FINISHED_STATUSES.includes(match.status) ||
                          (match.home_score !== null && match.away_score !== null);
                        const score = isFinished
                          ? `${match.home_score ?? '–'}:${match.away_score ?? '–'}`
                          : '–:–';

                        return (
                          <div key={match.id} className={`matchday-item ${isFinished ? 'finished' : ''}`}>
                            <div className="matchday-date">
                              <div className="matchday-date-main">{matchDate}</div>
                              <div className="matchday-time">{matchTime}</div>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupsTab;

