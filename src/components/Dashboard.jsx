import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ExternalLink, Edit, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { parseLK } from '../lib/lkUtils';
import { supabase } from '../lib/supabaseClient';
import SurfaceInfo from './SurfaceInfo';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, player } = useAuth();
  const { 
    matches, 
    teamInfo, 
    playerTeams,
    leagueStandings
  } = useData();
  
  // Debug: Prüfe was geladen wurde (nur bei signifikanten Änderungen)
  useEffect(() => {
    console.log('🔍 Dashboard State Changed:', {
      playerTeamsLength: playerTeams?.length,
      hasTeamInfo: !!teamInfo,
      hasPlayer: !!player,
      totalMatches: matches.length
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerTeams?.length, matches.length]);
  
  // State für Live-Timer
  const [currentTime, setCurrentTime] = useState(new Date());

  // State für Team-Edit Modal
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({ league: '', group_name: '' });
  const [savingTeam, setSavingTeam] = useState(false);
  
  // 🎾 State für Social Stats (Tennismates)
  const [socialStats, setSocialStats] = useState({
    tennismatesCount: 0,      // Wie viele mir folgen
    followingCount: 0,         // Wie vielen ich folge
    totalConnections: 0,       // Einzigartige Vernetzungen (keine Duplikate)
    newThisWeek: 0,            // Neue Tennismates letzte 7 Tage
    mutualCount: 0             // Freunde (gegenseitig)
  });

  // 🎾 State für Social Feed
  const [socialFeed, setSocialFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Timer für Live-Updates (alle 30 Sekunden)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Aktualisiert alle 30 Sekunden

    return () => clearInterval(interval);
  }, []);

  const now = currentTime;
  
  // Aktuelle Saison bestimmen (Winter: Sep-Apr, Sommer: Mai-Aug)
  // Winter läuft von September bis April (überspannt Jahreswechsel)
  // Sommer läuft von Mai bis August
  const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
  const currentYear = now.getFullYear();
  
  let currentSeason = 'winter';
  let seasonDisplay = '';
  
  if (currentMonth >= 4 && currentMonth <= 7) {
    // Mai (4) bis August (7) = Sommer
    currentSeason = 'summer';
    seasonDisplay = `Sommer ${currentYear}`;
  } else {
    // September bis April = Winter (überspannt Jahreswechsel)
    currentSeason = 'winter';
    if (currentMonth >= 8) {
      // Sep-Dez: Winter 2024/25 (aktuelles Jahr / nächstes Jahr)
      const nextYear = currentYear + 1;
      seasonDisplay = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
    } else {
      // Jan-Apr: Winter 2024/25 (vorheriges Jahr / aktuelles Jahr)
      const prevYear = currentYear - 1;
      seasonDisplay = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
    }
  }
  
  // ✅ HELPER: Check if match belongs to current season (flexible)
  const isCurrentSeason = (matchSeason) => {
    if (!matchSeason) return false;
    const lowerSeason = matchSeason.toLowerCase();
    
    if (currentSeason === 'winter') {
      // Akzeptiere: 'winter', 'Winter', 'Winter 2025/26', 'winter_25_26', etc.
      return lowerSeason.includes('winter');
    } else {
      // Akzeptiere: 'summer', 'Sommer', 'Sommer 2025', etc.
      return lowerSeason.includes('sommer') || lowerSeason.includes('summer');
    }
  };
  
  // Debug: Zeige was geladen wurde (nur bei Änderungen)
  useEffect(() => {
    console.log('🔵 Dashboard Data:', {
      totalMatches: matches.length,
      currentSeason,
      seasonDisplay
    });
    
    // Debug: Zeige Details zu allen Matches
    if (matches.length > 0) {
      console.log('📋 All matches:', matches.map(m => ({
        id: m.id,
        date: m.date?.toISOString?.() || m.date,
        opponent: m.opponent,
        season: m.season,
        isAfterNow: m.date > now,
        seasonMatches: isCurrentSeason(m.season)
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, currentSeason, seasonDisplay, now]);
  
  // 🔧 NEU: Lade match_results Counts für Live-Status
  const [matchResultCounts, setMatchResultCounts] = useState({});
  
  useEffect(() => {
    const loadMatchResults = async () => {
      if (matches.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('match_results')
          .select('matchday_id, status, winner')
          .in('matchday_id', matches.map(m => m.id));
        
        if (error) {
          console.error('Error loading match results:', error);
          return;
        }
        
        // Zähle completed results pro matchday
        const counts = {};
        // Alle abgeschlossenen Match-Status (nicht nur 'completed')
        const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
        
        (data || []).forEach(r => {
          if (!counts[r.matchday_id]) {
            counts[r.matchday_id] = { total: 0, completed: 0 };
          }
          counts[r.matchday_id].total++;
          if (FINISHED_STATUSES.includes(r.status) && r.winner) {
            counts[r.matchday_id].completed++;
          }
        });
        
        setMatchResultCounts(counts);
        console.log('✅ Match result counts loaded:', counts);
      } catch (error) {
        console.error('Error loading match result counts:', error);
      }
    };
    
    loadMatchResults();
  }, [matches]);
  
  // 🎾 Lade Social Stats (Tennismates) und Feed
  useEffect(() => {
    const loadSocialStats = async () => {
      if (!player?.id) return;
      
      try {
        // Lade alle Follow-Beziehungen
        const { data: followData, error } = await supabase
          .from('player_followers')
          .select('*')
          .or(`follower_id.eq.${player.id},following_id.eq.${player.id}`);
        
        if (error) throw error;
        
        // Berechne Stats
        const tennismates = followData?.filter(f => f.following_id === player.id) || [];
        const following = followData?.filter(f => f.follower_id === player.id) || [];
        const mutual = tennismates.filter(t => following.some(f => f.following_id === t.follower_id));
        
        // ✅ EINZIGARTIGE Vernetzungen (keine Duplikate!)
        const uniqueConnections = new Set([
          ...tennismates.map(t => t.follower_id),
          ...following.map(f => f.following_id)
        ]);
        const totalUniqueConnections = uniqueConnections.size;
        
        // Neue Tennismates letzte 7 Tage
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newThisWeek = tennismates.filter(t => new Date(t.created_at) > weekAgo).length;
        
        setSocialStats({
          tennismatesCount: tennismates.length,
          followingCount: following.length,
          totalConnections: totalUniqueConnections,  // ✅ NEU: Einzigartige Vernetzungen
          newThisWeek,
          mutualCount: mutual.length
        });
        
        console.log('🎾 Social stats loaded:', {
          tennismates: tennismates.length,
          following: following.length,
          uniqueConnections: totalUniqueConnections,
          newThisWeek,
          mutual: mutual.length,
          calculation: `${tennismates.length} Mates + ${following.length} Folge = ${totalUniqueConnections} einzigartige Personen`
        });

        // 🎾 Lade Social Feed für befreundete Spieler (mutual)
        if (mutual.length > 0) {
          await loadSocialFeed(mutual.map(m => m.follower_id));
        }
        
      } catch (error) {
        console.error('Error loading social stats:', error);
      }
    };
    
    loadSocialStats();
  }, [player?.id]);

  // 🎾 Lade Social Feed für befreundete Spieler
  const loadSocialFeed = async (friendIds) => {
    if (!friendIds || friendIds.length === 0) return;
    
    setLoadingFeed(true);
    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const feedItems = [];

      // 1. Lade Spieler-Infos
      const { data: players, error: playersError } = await supabase
        .from('players_unified')
        .select('id, name, current_lk, updated_at')
        .in('id', friendIds);
      
      if (playersError) throw playersError;

      // 2. Lade Match-Ergebnisse der letzten 2 Wochen
      const { data: matchResults, error: resultsError } = await supabase
        .from('match_results')
        .select(`
          id,
          matchday_id,
          match_number,
          match_type,
          home_score,
          away_score,
          winner,
          status,
          created_at,
          updated_at,
          home_player_id,
          guest_player_id,
          home_player1_id,
          home_player2_id,
          guest_player1_id,
          guest_player2_id
        `)
        .or(`home_player_id.in.(${friendIds.join(',')}),guest_player_id.in.(${friendIds.join(',')}),home_player1_id.in.(${friendIds.join(',')}),home_player2_id.in.(${friendIds.join(',')}),guest_player1_id.in.(${friendIds.join(',')}),guest_player2_id.in.(${friendIds.join(',')})`)
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      // Lade Matchday-Infos separat
      const matchdayIds = matchResults ? [...new Set(matchResults.map(mr => mr.matchday_id).filter(Boolean))] : [];
      let matchdaysMap = {};
      
      if (matchdayIds.length > 0) {
        const { data: matchdays, error: matchdaysError } = await supabase
          .from('matchdays')
          .select(`
            id,
            match_date,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            team_info!matchdays_home_team_id_fkey(club_name, team_name),
            team_info!matchdays_away_team_id_fkey(club_name, team_name)
          `)
          .in('id', matchdayIds);

        if (!matchdaysError && matchdays) {
          matchdays.forEach(md => {
            matchdaysMap[md.id] = md;
          });
        }
      }

      if (!resultsError && matchResults) {
        matchResults.forEach(result => {
          // Finde beteiligte Spieler
          const involvedPlayers = [];
          if (result.home_player_id && friendIds.includes(result.home_player_id)) {
            involvedPlayers.push(result.home_player_id);
          }
          if (result.guest_player_id && friendIds.includes(result.guest_player_id)) {
            involvedPlayers.push(result.guest_player_id);
          }
          if (result.home_player1_id && friendIds.includes(result.home_player1_id)) {
            involvedPlayers.push(result.home_player1_id);
          }
          if (result.home_player2_id && friendIds.includes(result.home_player2_id)) {
            involvedPlayers.push(result.home_player2_id);
          }
          if (result.guest_player1_id && friendIds.includes(result.guest_player1_id)) {
            involvedPlayers.push(result.guest_player1_id);
          }
          if (result.guest_player2_id && friendIds.includes(result.guest_player2_id)) {
            involvedPlayers.push(result.guest_player2_id);
          }

          involvedPlayers.forEach(playerId => {
            const playerInfo = players.find(p => p.id === playerId);
            if (!playerInfo) return;

            const matchday = matchdaysMap[result.matchday_id];
            if (!matchday) return; // Skip if matchday not found

            const isHome = result.home_player_id === playerId || 
                          result.home_player1_id === playerId || 
                          result.home_player2_id === playerId;
            const won = (isHome && result.winner === 'home') || 
                       (!isHome && (result.winner === 'guest' || result.winner === 'away'));

            const opponent = isHome 
              ? (matchday.team_info_away_team_id_fkey?.club_name || '') + ' ' + (matchday.team_info_away_team_id_fkey?.team_name || '')
              : (matchday.team_info_home_team_id_fkey?.club_name || '') + ' ' + (matchday.team_info_home_team_id_fkey?.team_name || '');

            feedItems.push({
              type: 'match_result',
              playerId: playerId,
              playerName: playerInfo.name,
              timestamp: new Date(result.created_at || result.updated_at),
              data: {
                matchType: result.match_type,
                won,
                homeScore: result.home_score,
                awayScore: result.away_score,
                opponent: opponent.trim(),
                matchDate: matchday.match_date
              }
            });
          });
        });
      }

      // 3. Lade neue Matches (Matchdays) der letzten 2 Wochen für Teams befreundeter Spieler
      // Zuerst: Finde Teams der befreundeten Spieler
      const { data: friendTeams, error: teamsError } = await supabase
        .from('team_memberships')
        .select('team_id, player_id')
        .in('player_id', friendIds)
        .eq('is_active', true);

      if (!teamsError && friendTeams && friendTeams.length > 0) {
        const teamIds = [...new Set(friendTeams.map(ft => ft.team_id))];
        
        const { data: newMatches, error: matchesError } = await supabase
          .from('matchdays')
          .select(`
            id,
            match_number,
            match_date,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            team_info!matchdays_home_team_id_fkey(club_name, team_name),
            team_info!matchdays_away_team_id_fkey(club_name, team_name)
          `)
          .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
          .gte('match_date', twoWeeksAgo.toISOString())
          .order('match_date', { ascending: false })
          .limit(20);

        if (!matchesError && newMatches) {
          newMatches.forEach(match => {
            // Finde befreundete Spieler in diesem Match
            const homeTeamMembers = friendTeams
              .filter(ft => ft.team_id === match.home_team_id)
              .map(ft => ft.player_id);
            
            const awayTeamMembers = friendTeams
              .filter(ft => ft.team_id === match.away_team_id)
              .map(ft => ft.player_id);

            [...homeTeamMembers, ...awayTeamMembers].forEach(playerId => {
              const playerInfo = players.find(p => p.id === playerId);
              if (!playerInfo) return;

              const isHome = homeTeamMembers.includes(playerId);
              const opponent = isHome
                ? (match.team_info_away_team_id_fkey?.club_name || '') + ' ' + (match.team_info_away_team_id_fkey?.team_name || '')
                : (match.team_info_home_team_id_fkey?.club_name || '') + ' ' + (match.team_info_home_team_id_fkey?.team_name || '');

              feedItems.push({
                type: 'new_match',
                playerId: playerId,
                playerName: playerInfo.name,
                timestamp: new Date(match.match_date),
                data: {
                  opponent: opponent.trim(),
                  matchDate: match.match_date,
                  isHome
                }
              });
            });
          });
        }
      }

      // Dedupliziere: Entferne doppelte Einträge (gleicher Spieler, gleicher Typ, gleicher Tag)
      const uniqueFeedItems = [];
      const seen = new Set();
      
      feedItems.forEach(item => {
        const key = `${item.type}-${item.playerId}-${item.timestamp.toDateString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFeedItems.push(item);
        }
      });

      // Sortiere nach Timestamp (neueste zuerst)
      uniqueFeedItems.sort((a, b) => b.timestamp - a.timestamp);

      // Limitiere auf 10 neueste Items
      setSocialFeed(uniqueFeedItems.slice(0, 10));
      
      console.log('🎾 Social feed loaded:', feedItems.length, 'items');
    } catch (error) {
      console.error('Error loading social feed:', error);
    } finally {
      setLoadingFeed(false);
    }
  };
  
  // Helper: Bestimme Match-Status (live, upcoming, finished)
  const getMatchStatus = (match) => {
    const timeSinceStart = (now - match.date) / (1000 * 60 * 60); // Stunden
    const resultCount = matchResultCounts[match.id]?.completed || 0;
    const expectedResults = match.season === 'summer' ? 9 : 6; // Sommer: 9, Winter: 6
    
    // Beendet: Alle Ergebnisse eingetragen ODER > 7h her
    if (resultCount >= expectedResults || timeSinceStart > 7) {
      return 'finished';
    }
    
    // Live: Begonnen (< 7h her) aber nicht alle Ergebnisse
    if (timeSinceStart > 0 && timeSinceStart <= 7) {
      return 'live';
    }
    
    // Upcoming: Noch nicht begonnen
    return 'upcoming';
  };
  
  // Live-Spiele (gerade laufend)
  const liveMatches = matches
    .filter(m => {
      const status = getMatchStatus(m);
      return status === 'live' && isCurrentSeason(m.season);
    })
    .sort((a, b) => a.date - b.date);
  
  // Kommende Spiele (noch nicht begonnen)
  const upcomingMatches = matches
    .filter(m => {
      const status = getMatchStatus(m);
      return status === 'upcoming' && isCurrentSeason(m.season);
    })
    .sort((a, b) => a.date - b.date);

  // Beendete Spiele der aktuellen Saison (NUR mit Ergebnis!)
  const recentlyFinishedMatches = matches
    .filter(m => {
      const status = getMatchStatus(m);
      const hasResult = (m.home_score > 0 || m.away_score > 0);
      // ✅ NUR finished Spiele MIT echtem Ergebnis
      return status === 'finished' && hasResult && isCurrentSeason(m.season);
    })
    .sort((a, b) => b.date - a.date); // Neueste zuerst

  // ✅ NEU: Vergangene Spiele OHNE Ergebnis (brauchen dringend Eingabe!)
  const pastMatchesWithoutResult = matches
    .filter(m => {
      const matchDate = new Date(m.date);
      // ✅ Ein Match hat NUR ein Ergebnis wenn home_score ODER away_score > 0
      const hasResult = (m.home_score > 0 || m.away_score > 0);
      // Vergangen UND kein Ergebnis UND aktuelle Saison
      return matchDate < now && !hasResult && isCurrentSeason(m.season);
    })
    .sort((a, b) => a.date - b.date); // Älteste zuerst (dringendste)

  console.log('🔵 Dashboard Matches Debug:', {
    totalMatches: matches.length,
    currentSeason,
    seasonDisplay,
    matchSeasons: [...new Set(matches.map(m => m.season))],
    upcomingMatches: upcomingMatches.length,
    finishedMatches: recentlyFinishedMatches.length,
    pastWithoutResult: pastMatchesWithoutResult.length
  });

  // Für Countdown: Das allernächste ZUKÜNFTIGE Spiel (egal welche Saison)
  // Nur Spiele die noch nicht begonnen haben UND nicht live sind
  const nextMatchAnySeason = matches
    .filter(m => {
      const status = getMatchStatus(m);
      return status === 'upcoming'; // Nur echte zukünftige Spiele
    })
    .sort((a, b) => a.date - b.date)[0];

  // Tageszeit-abhängige Begrüßung
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    // Korrekte Namens-Abfrage für Supabase
    let playerName = player?.name;
    if (!playerName && currentUser) {
      playerName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Spieler';
    }
    
    const firstName = (playerName || 'Spieler').split(' ')[0];
    
    // console.log('🔵 Greeting debug:', { playerName, firstName });
    
    if (hour < 6) return `Gute Nacht, ${firstName}! 🌙`;
    if (hour < 11) return `Guten Morgen, ${firstName}! ☀️`;
    if (hour < 14) return `Guten Tag, ${firstName}! 👋`;
    if (hour < 18) return `Moin, ${firstName}! 🎾`;
    if (hour < 22) return `Guten Abend, ${firstName}! 🌆`;
    return `Gute Nacht, ${firstName}! 🌙`;
  };

  // Countdown bis nächstes Spiel (nur ZUKÜNFTIGE Spiele)
  const getNextMatchCountdown = () => {
    if (!nextMatchAnySeason) {
      const funnyMessages = [
        '🏖️ Zeit für ein bisschen Urlaub!',
        '🎾 Perfekt für Trainingseinheiten!',
        '☕ Entspannt zurücklehnen...',
        '🌴 Keine Spiele = Mehr Freizeit!',
        '⏰ Wartet auf den nächsten Gegner...',
        '🎯 Bereit für neue Herausforderungen!',
        '🏃 Zeit zum Fitnesstraining!',
        '📅 Der Spielplan ist noch leer'
      ];
      return funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    }

    const now = new Date();
    const diffTime = nextMatchAnySeason.date - now;
    
    // 🔧 LIVE-SPIEL: Wenn bereits begonnen (diffTime < 0)
    if (diffTime < 0) {
      const timeSinceStart = Math.abs(diffTime) / (1000 * 60 * 60); // Positive Stunden
      const hours = Math.floor(timeSinceStart);
      const minutes = Math.floor((timeSinceStart % 1) * 60);
      return `🔴 Läuft seit ${hours}h ${minutes}m`;
    }
    
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    // 🔧 Bestimme "HEUTE" und "MORGEN" basierend auf 06:00 Uhr als Tag-Start
    const getTomorrowAt6AM = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return tomorrow;
    };

    const tomorrowStart = getTomorrowAt6AM();

    // Heute: Match ist zwischen jetzt und morgen 06:00 Uhr
    if (nextMatchAnySeason.date >= now && nextMatchAnySeason.date < tomorrowStart) {
      if (diffHours === 0) {
        return `🔥 In ${diffMinutes}m ${diffSeconds}s - HEUTE!`;
      }
      return `🔥 In ${diffHours}h ${diffMinutes}m - HEUTE!`;
    }

    // Morgen: Match ist zwischen morgen 06:00 Uhr und übermorgen 06:00 Uhr
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);
    
    if (nextMatchAnySeason.date >= tomorrowStart && nextMatchAnySeason.date < dayAfterTomorrowStart) {
      return `⚡ In ${diffHours}h ${diffMinutes}m - MORGEN!`;
    }

    // Für mehr als 2 Tage: Zeige Tage
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return `⏰ In ${diffDays} Tagen`;
    if (diffDays <= 7) return `📅 In ${diffDays} Tagen`;
    return `📆 In ${diffDays} Tagen`;
  };
  
  // Team-Edit Funktionen
  const openEditTeam = (team) => {
    setEditingTeam(team);
    setEditForm({
      league: team.league || '',
      group_name: team.group_name || ''
    });
  };

  const closeEditTeam = () => {
    setEditingTeam(null);
    setEditForm({ league: '', group_name: '' });
  };

  const saveTeamChanges = async () => {
    if (!editingTeam) return;
    
    setSavingTeam(true);
    try {
      // Finde team_seasons entry für dieses Team
      // WICHTIG: Verwende gleiches Format wie DataContext ('Winter 2024/25')
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      let currentSeason;
      if (currentMonth >= 4 && currentMonth <= 7) {
        currentSeason = `Sommer ${currentYear}`;
      } else {
        if (currentMonth >= 8) {
          const nextYear = currentYear + 1;
          currentSeason = `Winter ${currentYear}/${String(nextYear).slice(-2)}`;
        } else {
          const prevYear = currentYear - 1;
          currentSeason = `Winter ${prevYear}/${String(currentYear).slice(-2)}`;
        }
      }

      // Prüfe ob team_seasons Eintrag existiert
      const { data: existingSeason } = await supabase
        .from('team_seasons')
        .select('id')
        .eq('team_id', editingTeam.id)
        .eq('season', currentSeason)
        .maybeSingle();

      if (existingSeason) {
        // Update existierende Season
        await supabase
          .from('team_seasons')
          .update({
            league: editForm.league || null,
            group_name: editForm.group_name || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSeason.id);
        
        console.log('✅ Team season updated');
      } else {
        // Erstelle neuen Season Eintrag
        await supabase
          .from('team_seasons')
          .insert({
            team_id: editingTeam.id,
            season: currentSeason,
            league: editForm.league || null,
            group_name: editForm.group_name || null,
            team_size: 6,
            is_active: true
          });
        
        console.log('✅ Team season created');
      }

      // Trigger reload
      window.dispatchEvent(new CustomEvent('reloadTeams', { 
        detail: { playerId: player?.id } 
      }));

      alert('✅ Team-Daten erfolgreich gespeichert!');
      closeEditTeam();
    } catch (error) {
      console.error('Error saving team changes:', error);
      alert('❌ Fehler beim Speichern: ' + error.message);
    } finally {
      setSavingTeam(false);
    }
  };

  // Stabiler Zufallsgenerator basierend auf Match-ID (ändert sich nicht bei Reload)
  const getStableRandomIndex = (matchId, arrayLength) => {
    if (!matchId) return 0;
    // Erzeuge Hash aus Match-ID
    let hash = 0;
    const idString = matchId.toString();
    for (let i = 0; i < idString.length; i++) {
      hash = ((hash << 5) - hash) + idString.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % arrayLength;
  };

  // Team-Status mit humorvollen Sprüchen
  const getTeamStatusMessage = (match) => {
    if (!match) return null;
    
    // Zähle verfügbare Spieler
    const availableCount = Object.values(match.availability || {})
      .filter(a => a.status === 'available')
      .length;
    
    // Bestimme benötigte Spieleranzahl (Winter: 4, Sommer: 6)
    const requiredPlayers = match.playersNeeded
      ? match.playersNeeded
      : (match.season?.toLowerCase().includes('sommer') || 
         match.season?.toLowerCase().includes('summer') ? 6 : 4);
    
    const missing = requiredPlayers - availableCount;
    
    // Sprüche für verschiedene Situationen
    const completeMessages = [
      '🎉 Team ist komplett! Zeit für die Taktikbesprechung!',
      '✅ Wir sind startklar! Alle Mann an Bord!',
      '💪 Das Dream-Team steht! Let\'s gooo!',
      '🔥 Volle Mannschaft voraus! Bereit für den Sieg!',
      '⭐ Team komplett - jetzt kann nichts mehr schiefgehen!',
      '🚀 Aufstellung perfekt! Die Gegner zittern schon!',
      '🎾 Alle dabei! Das wird legendär!',
      '👥 Komplettes Team = Doppelte Power!'
    ];
    
    const overfilledMessages = [
      `🤩 ${availableCount} Zusagen! Wir haben die Qual der Wahl!`,
      `💎 ${availableCount} motivierte Spieler! Captain, entscheide weise!`,
      `🌟 ${availableCount} wollen spielen! Luxusproblem!`,
      `🎯 ${availableCount} Zusagen - so viel Enthusiasmus!`,
      `🔥 ${availableCount} Spieler ready! Das nennt man Teamspirit!`,
      `⚡ ${availableCount} sind dabei - welch eine Auswahl!`
    ];
    
    const oneMissingMessages = [
      '🤔 Noch 1 Spieler fehlt! Wer traut sich?',
      '🎾 Fast komplett! Ein mutiger Held wird gesucht!',
      '⚡ 1 Platz frei! Greif zu, bevor es zu spät ist!',
      '🔔 Einer fehlt noch! Deine Chance zu glänzen!',
      '🌟 Ein Plätzchen frei! Perfect Match für dich?',
      '💪 Noch 1 Krieger gesucht! Bist du bereit?',
      '🚀 Ein Ticket übrig! All aboard!',
      '🎯 Der letzte Platz wartet auf dich!'
    ];
    
    const twoMissingMessages = [
      '🤝 Noch 2 Plätze frei – wer schnappt sie sich?',
      '🎾 Fast vollzählig! Zwei Zusagen fehlen noch.',
      '⚡ Zwei fehlende Zusagen – meldet euch jetzt!',
      '💪 Zwei freie Spots für Matchhelden!',
      '🌟 Noch zwei Spieler gesucht – jetzt zusagen!',
      '🚀 Zwei Tickets offen – wer kommt mit?',
      '📢 Zwei Zusagen fehlen – Team braucht euch!',
      '🔥 Nur noch zwei Plätze bis zum Dream-Team!'
    ];
    
    const multipleMissingMessages = [
      `😅 Noch ${missing} Spieler fehlen! Wer hat Bock?`,
      `🆘 ${missing} Plätze frei! Team, wo seid ihr?`,
      `📢 ${missing} gesucht! Zeit für Engagement!`,
      `🎾 ${missing} fehlen noch! Meldet euch zahlreich!`,
      `💪 ${missing} Helden gebraucht! Los geht's!`,
      `⚡ ${missing} Spots verfügbar! Greift zu!`,
      `🔔 Alarm: Noch ${missing} benötigt!`,
      `🚨 ${missing} fehlen! Captain braucht Verstärkung!`
    ];
    
    const emptyMessages = [
      `🤯 Noch ${requiredPlayers} Zusagen nötig! Wer macht den Anfang?`,
      `📣 Das Team wartet auf dich! Sei der Erste!`,
      `🎾 Leere Spielerliste! Zeit, das zu ändern!`,
      `⚡ Jemand muss anfangen! Trau dich!`,
      `💪 ${requiredPlayers} mutige Spieler gesucht! Macht mit!`,
      `🌟 Die Bühne ist leer! Wer betritt sie zuerst?`,
      `🔥 Noch niemand dabei? Das ändern wir jetzt!`,
      `🚀 ${requiredPlayers} Plätze warten auf Helden!`
    ];
    
    // Wähle passende Nachricht basierend auf Status
    let messages;
    let icon = '👥';
    
    if (availableCount === 0) {
      messages = emptyMessages;
      icon = '📣';
    } else if (availableCount >= requiredPlayers) {
      messages = availableCount > requiredPlayers ? overfilledMessages : completeMessages;
      icon = '✅';
    } else if (missing === 1) {
      messages = oneMissingMessages;
      icon = '🎯';
    } else if (missing === 2) {
      messages = twoMissingMessages;
      icon = '👥';
    } else {
      messages = multipleMissingMessages;
      icon = '🆘';
    }
    
    // Stabiler Zufallsindex basierend auf Match-ID
    const randomIndex = getStableRandomIndex(match.id, messages.length);
    const message = messages[randomIndex];
    
    return {
      icon,
      count: availableCount,
      required: requiredPlayers,
      missing: Math.max(0, missing),
      message,
      isComplete: availableCount >= requiredPlayers
    };
  };

  // Motivationsspruch basierend auf Countdown (nur für ZUKÜNFTIGE Spiele)
  // 🔧 Nutzt gleiche 06:00 Uhr Logik wie getNextMatchCountdown
  const getMotivationQuote = () => {
    if (!nextMatchAnySeason) return '';
    
    const diffTime = nextMatchAnySeason.date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    const getTomorrowAt6AM = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return tomorrow;
    };

    const tomorrowStart = getTomorrowAt6AM();
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

    // Spiel steht bevor (< 2h)
    if (diffHours < 2) {
      return '💪 Gleich geht\'s los! Gebt alles!';
    }
    
    // Spiel ist HEUTE (vor morgen 06:00 Uhr)
    if (nextMatchAnySeason.date < tomorrowStart) {
      if (diffHours < 12) {
        return '🎯 Heute zeigen wir, was wir drauf haben!';
      }
      return '🔥 Noch heute ist der große Tag!';
    }
    
    // Spiel ist MORGEN (zwischen morgen 06:00 und übermorgen 06:00)
    if (nextMatchAnySeason.date >= tomorrowStart && nextMatchAnySeason.date < dayAfterTomorrowStart) {
      return '⚡ Morgen wird es ernst - bereitet euch vor!';
    }
    
    // Übermorgen oder später
    if (diffHours < 72) {
      return '🎾 Bald ist Spieltag - mentale Vorbereitung läuft!';
    } else if (diffHours < 168) { // < 1 Woche
      return '📅 Das nächste Match rückt näher!';
    } else {
      return '🌟 Vorfreude auf das nächste Match!';
    }
  };

  // Debug Player Data (reduziert)
  // console.log('🔍 Dashboard Player Data:', { hasCurrentLK: !!player?.current_lk, currentLK: player?.current_lk });

  const normalizeTeamName = (name = '') => {
    return name
      ?.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const getOpponentStanding = (match) => {
    if (!match || !leagueStandings || leagueStandings.length === 0) {
      return null;
    }

    const target = normalizeTeamName(match.opponent);
    if (!target) return null;

    const directHit = leagueStandings.find((entry) => normalizeTeamName(entry.team) === target);
    if (directHit) return directHit;

    const partialHit = leagueStandings.find((entry) => {
      const normalized = normalizeTeamName(entry.team);
      return normalized.includes(target) || target.includes(normalized);
    });

    return partialHit || null;
  };

  const formatStandingText = (standing) => {
    if (!standing?.position) return null;
    const ordinal = `${standing.position}. Platz`;
    if (standing.points !== undefined) {
      return `${ordinal} • ${standing.points} Punkte`;
    }
    return ordinal;
  };

  return (
    <div className="dashboard container">
      {/* 1. Persönliche Begrüßung - ganz oben */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          {getGreeting()}
        </h1>
      </div>
      
      {/* 2. LK-Card mit Formkurve - IMMER ANZEIGEN */}
      {player && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">Deine Formkurve</div>
              {/* Verbesserungs-Badge oben rechts */}
              {player.season_improvement !== undefined && player.season_improvement !== null && (
                <div className={`improvement-badge-top ${player.season_improvement < -0.1 ? 'positive' : player.season_improvement > 0.1 ? 'negative' : 'neutral'}`}>
                  <span className="badge-icon">
                    {player.season_improvement < -0.1 ? '▼' : player.season_improvement > 0.1 ? '▲' : '■'}
                  </span>
                  <span className="badge-value">
                    {player.season_improvement > 0 ? '+' : ''}{player.season_improvement.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Große Sparkline mit Monatslabels */}
                {(() => {
                  // 🔧 Nutze current_lk, season_start_lk ODER Fallback zu LK 12.0
                  const currentLkString = player.current_lk || player.season_start_lk || player.ranking || 'LK 12.0';
                  // Nutze gemeinsame parseLK Funktion aus lkUtils
                  const startLK = parseLK(player.start_lk || player.season_start_lk || currentLkString);
                  const currentLKValue = parseLK(currentLkString);
                  
                  // Dynamische Monate basierend auf heutigem Datum
                  const now = new Date();
                  const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
                  const currentYear = now.getFullYear();
                  
                  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
                  const monthlyData = [];
                  
                  // Erstelle 4 Monate: 2 zurück, aktuell, 1 voraus
                  for (let offset = -2; offset <= 1; offset++) {
                    let monthIndex = currentMonth + offset;
                    let year = currentYear;
                    
                    // Handle Jahreswechsel
                    if (monthIndex < 0) {
                      monthIndex += 12;
                      year -= 1;
                    } else if (monthIndex > 11) {
                      monthIndex -= 12;
                      year += 1;
                    }
                    
                    const monthName = monthNames[monthIndex];
                    const isCurrent = offset === 0;
                    const isFuture = offset > 0;
                    
                    let lkValue;
                    
                    if (isFuture) {
                      // PROGNOSE für nächsten Monat
                      // Berechne Wochen bis Ende des nächsten Monats
                      const endOfNextMonth = new Date(year, monthIndex + 1, 0); // Letzter Tag des Monats
                      const weeksUntilEnd = Math.max(1, (endOfNextMonth - now) / (7 * 24 * 60 * 60 * 1000));
                      
                      // Wöchentlicher Abbau: +0.025 LK pro Woche ohne Spiel (schlechter!)
                      const weeklyDecay = 0.025;
                      const expectedDecay = weeksUntilEnd * weeklyDecay;
                      
                      // Erwartete Verbesserung durch Spiele (konservativ)
                      // Annahme: 0-1 Spiele im nächsten Monat
                      const expectedImprovement = -0.05; // Kleine Verbesserung
                      
                      // Prognose = Aktuelle LK + Abbau (schlechter) + Verbesserung (besser)
                      lkValue = currentLKValue + expectedDecay + expectedImprovement;
                      
                    } else if (isCurrent) {
                      // AKTUELLER MONAT: Nutze current_lk aus DB
                      lkValue = currentLKValue;
                      
                    } else {
                      // VERGANGENE MONATE: Interpoliere von Start-LK zu aktuell
                      const monthsSinceStart = (currentYear - 2025) * 12 + (currentMonth - 8); // Sept 2025 = Index 8
                      const thisMonthIndex = (year - 2025) * 12 + (monthIndex - 8);
                      
                      if (thisMonthIndex < 0) {
                        // Vor Saison-Start: Flat
                        lkValue = startLK;
                      } else {
                        // Interpoliere linear
                        const progress = monthsSinceStart > 0 ? thisMonthIndex / monthsSinceStart : 0;
                        lkValue = startLK + (currentLKValue - startLK) * progress;
                      }
                    }
                    
                    monthlyData.push({
                      month: monthName,
                      lk: lkValue,
                      isFuture,
                      isCurrent
                    });
                  }
                  
                  // console.log('📊 Monthly Sparkline Data:', { currentMonth: monthNames[currentMonth], startLK, currentLKValue });
                  
                  return (
                    <div className="sparkline-container">
                      <svg className="spark-large" width="100%" height="140" viewBox="0 0 320 140" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.4 }} />
                            <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.05 }} />
                          </linearGradient>
                          
                          {/* Grüne Schraffur für Verbesserung (LK sinkt) */}
                          <pattern id="diagonalHatchGreen" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: '#059669', strokeWidth: 1.5, opacity: 0.5 }} />
                          </pattern>
                          
                          {/* Rote Schraffur für Verschlechterung (LK steigt) */}
                          <pattern id="diagonalHatchRed" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: '#dc2626', strokeWidth: 1.5, opacity: 0.5 }} />
                          </pattern>
                        </defs>
                        {(() => {
                          const points = monthlyData.map(d => d.lk);
                          
                          // Bestimme ob LK verbessert oder verschlechtert
                          const currentLK = points[2]; // Okt (aktuell)
                          const forecastLK = points[3]; // Nov (Prognose)
                          const lkChange = forecastLK - currentLK;
                          
                          // LK wird BESSER wenn sie NIEDRIGER wird (sinkt)
                          // LK wird SCHLECHTER wenn sie HÖHER wird (steigt)
                          const isImprovement = lkChange < 0; // LK sinkt = Besser
                          const forecastClass = isImprovement ? 'improvement' : 'decline';
                          
                          // Normalisiere auf SVG-Koordinaten
                          const minLK = Math.min(...points);
                          const maxLK = Math.max(...points);
                          const range = maxLK - minLK || 1;
                          
                          const svgPoints = points.map((lk, i) => {
                            const x = 40 + (i * 80); // 40, 120, 200, 280
                            const y = 30 + (70 - ((lk - minLK) / range) * 60); // Mehr Platz oben für Text
                            return { x, y };
                          });
                          
                          // Pfade für normale Area (Aug-Sep-Okt)
                          const historicalPath = `M${svgPoints[0].x},${svgPoints[0].y} L${svgPoints[1].x},${svgPoints[1].y} L${svgPoints[2].x},${svgPoints[2].y} L${svgPoints[2].x},105 L${svgPoints[0].x},105 Z`;
                          
                          // Pfad für Prognose-Area (Okt-Nov, schraffiert mit Farbe)
                          const forecastPath = `M${svgPoints[2].x},${svgPoints[2].y} L${svgPoints[3].x},${svgPoints[3].y} L${svgPoints[3].x},105 L${svgPoints[2].x},105 Z`;
                          
                          // Linien-Pfad für Vergangenheit (durchgezogen)
                          const historicalLine = `M${svgPoints[0].x},${svgPoints[0].y} L${svgPoints[1].x},${svgPoints[1].y} L${svgPoints[2].x},${svgPoints[2].y}`;
                          
                          // Linien-Pfad für Prognose (gestrichelt mit Farbe)
                          const forecastLine = `M${svgPoints[2].x},${svgPoints[2].y} L${svgPoints[3].x},${svgPoints[3].y}`;
                          
                          return (
                            <>
                              {/* Normale Area (Aug-Sep-Okt) mit Gradient */}
                              <path className="area" d={historicalPath} fill="url(#grad)" />
                              
                              {/* Schraffierte Prognose-Area (Okt-Nov) - FARBIG */}
                              <path className={`area-forecast ${forecastClass}`} d={forecastPath} opacity="0.8" />
                              
                              {/* Durchgezogene Linie für Vergangenheit */}
                              <path className="line" d={historicalLine} strokeDasharray="none" />
                              
                              {/* GESTRICHELTE Linie für Prognose - FARBIG */}
                              <path className={`line-forecast ${forecastClass}`} d={forecastLine} strokeDasharray="8,4" opacity="0.9" strokeWidth="3" />
                              
                              {/* Punkte */}
                              {svgPoints.map((p, i) => (
                                <circle 
                                  key={i} 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={monthlyData[i].isCurrent ? 6 : monthlyData[i].isFuture ? 4 : 5}
            style={{ 
                                    opacity: monthlyData[i].isFuture ? 0.6 : 1 
                                  }}
                                />
                              ))}
                              
                              {/* "Prognose" Text über November */}
                              <text
                                x={svgPoints[3].x}
                                y={15}
                                fontSize="10"
                                fill="var(--slate-500)"
                                fontWeight="600"
                                textAnchor="middle"
                                fontStyle="italic"
                              >
                                Prognose
                              </text>
                            </>
                          );
                        })()}
                      </svg>
                      
                      {/* Monatslabels unter der Grafik */}
                      <div className="month-labels">
                        {monthlyData.map((d, i) => (
                          <div 
                            key={i} 
                            className={`month-label ${d.isCurrent ? 'current' : ''} ${d.isFuture ? 'future' : ''}`}
                          >
                            <div className="month-name">{d.month}</div>
                            <div className="month-lk">LK {d.lk.toFixed(1)}</div>
                          </div>
                        ))}
                      </div>
            </div>
                  );
                })()}
          </div>
        </div>
      )}

      {/* 🔴 LIVE-SPIELE (gerade laufend) - DIREKT NACH FORMKURVE */}
      {liveMatches.length > 0 && (
        <div className="fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title" style={{ color: '#ef4444' }}>
                🔴 Live-Spiele
              </div>
              <div className="match-count-badge" style={{
                background: '#ef4444',
                color: 'white',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                {liveMatches.length}
              </div>
            </div>
            <div className="season-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {liveMatches.map((match) => {
                const resultCount = matchResultCounts[match.id]?.completed || 0;
                const expectedResults = match.season === 'summer' ? 9 : 6;
                const timeSinceStart = (now - match.date) / (1000 * 60 * 60); // Stunden
                
                return (
                  <div 
                    key={match.id} 
                    className="match-preview-card"
                    onClick={() => navigate(`/ergebnisse/${match.id}`)}
                    style={{ 
                      cursor: 'pointer',
                      border: '2px solid #ef4444',
                      background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
                      margin: 0
                    }}
                  >
                    <div className="match-preview-header">
                      <div className="match-preview-date" style={{ color: '#ef4444', fontWeight: '700' }}>
                        🔴 LIVE - {format(match.date, 'EEE, dd. MMM', { locale: de })}
                      </div>
                      <div className="match-preview-time" style={{ 
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {Math.floor(timeSinceStart)}h {Math.floor((timeSinceStart % 1) * 60)}m
                      </div>
                    </div>
                    <div className="match-preview-opponent">{match.opponent}</div>
                    
                    {/* Heimspiel/Auswärtsspiel - NACH OBEN */}
                    <div className="match-preview-location">{match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}</div>
                    
                    {/* Venue - NACH OBEN */}
                    <div className="match-preview-venue">{match.venue}</div>
                    
                    {/* 🎾 BELAG + SCHUHEMPFEHLUNG - NACH UNTEN */}
                    <SurfaceInfo matchdayId={match.id} compact={true} />
                    
                    {/* Status - GANZ UNTEN */}
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: resultCount > 0 ? '#dcfce7' : '#fef3c7',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: resultCount > 0 ? '#15803d' : '#92400e',
                      textAlign: 'center'
                    }}>
                      {resultCount > 0 
                        ? `✅ ${resultCount}/${expectedResults} Ergebnisse eingetragen`
                        : '⏳ Ergebnisse noch nicht eingetragen'
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🎾 3. Social Stats Card (Tennismates) */}
      {player && (
        <div 
          className="fade-in" 
          style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
          onClick={() => navigate('/profile?tab=tennismates')}
        >
          <div className="lk-card-full">
            <div className="formkurve-header">
              <div className="formkurve-title">Deine Tennismates</div>
              {/* Vernetzungs-Badge oben rechts - wie improvement-badge */}
              <div className="improvement-badge-top neutral" style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: '2px solid #7c3aed'
              }}>
                <span className="badge-icon">🤝</span>
                <span className="badge-value">{socialStats.totalConnections}</span>
              </div>
            </div>
            
            <div className="sparkline-container">
              {/* Stats Grid - SEHR KOMPAKT */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: socialStats.newThisWeek > 0 || socialStats.mutualCount > 0 
                  ? 'repeat(auto-fit, minmax(90px, 1fr))' 
                  : 'repeat(2, 1fr)',
                gap: '0.5rem',
                marginBottom: socialFeed.length > 0 ? '1rem' : '0'
              }}>
                {/* Tennismates */}
                <div style={{
                  padding: '0.5rem',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                    {socialStats.tennismatesCount}
                  </div>
                  <div style={{ fontSize: '0.55rem', fontWeight: '600', color: '#047857', textTransform: 'uppercase' }}>
                    Mates
                  </div>
                </div>
                
                {/* Following */}
                <div style={{
                  padding: '0.5rem',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb' }}>
                    {socialStats.followingCount}
                  </div>
                  <div style={{ fontSize: '0.55rem', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase' }}>
                    Folge
                  </div>
                </div>
                
                {/* Neu diese Woche */}
                {socialStats.newThisWeek > 0 && (
                  <div style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '6px',
                    textAlign: 'center',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>
                      +{socialStats.newThisWeek}
                    </div>
                    <div style={{ fontSize: '0.55rem', fontWeight: '600', color: '#92400e', textTransform: 'uppercase' }}>
                      Neu ✨
                    </div>
                  </div>
                )}
                
                {/* Freunde (Mutual) */}
                {socialStats.mutualCount > 0 && (
                  <div style={{
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                    border: '2px solid #ec4899',
                    borderRadius: '6px',
                    textAlign: 'center',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#db2777' }}>
                      {socialStats.mutualCount}
                    </div>
                    <div style={{ fontSize: '0.55rem', fontWeight: '600', color: '#9f1239', textTransform: 'uppercase' }}>
                      Freunde ❤️
                    </div>
                  </div>
                )}
              </div>

              {/* 🎾 Social Feed - Aktivitäten befreundeter Spieler */}
              {socialFeed.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '2px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: 'rgb(107, 114, 128)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📰</span>
                    <span>Aktivitäten deiner Freunde</span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {socialFeed.map((item, index) => {
                      const timeAgo = Math.floor((now - item.timestamp) / (1000 * 60 * 60)); // Stunden
                      const daysAgo = Math.floor(timeAgo / 24);
                      
                      let timeLabel = '';
                      if (timeAgo < 1) timeLabel = 'vor weniger als 1h';
                      else if (timeAgo < 24) timeLabel = `vor ${timeAgo}h`;
                      else if (daysAgo === 1) timeLabel = 'gestern';
                      else timeLabel = `vor ${daysAgo} Tagen`;

                      if (item.type === 'match_result') {
                        return (
                          <div
                            key={`${item.type}-${item.playerId}-${index}`}
                            style={{
                              padding: '0.75rem',
                              background: item.data.won 
                                ? 'linear-gradient(135deg, rgb(236, 253, 245) 0%, rgb(209, 250, 229) 100%)'
                                : 'linear-gradient(135deg, rgb(254, 242, 242) 0%, rgb(254, 226, 226) 100%)',
                              border: `2px solid ${item.data.won ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => navigate(`/player/${encodeURIComponent(item.playerName)}`)}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                fontSize: '1.5rem',
                                lineHeight: '1'
                              }}>
                                {item.data.won ? '🏆' : '😔'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '700',
                                  color: 'rgb(31, 41, 55)',
                                  marginBottom: '0.25rem'
                                }}>
                                  {item.playerName}
                                </div>
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: 'rgb(107, 114, 128)',
                                  marginBottom: '0.25rem'
                                }}>
                                  {item.data.won ? 'hat gewonnen' : 'hat verloren'} • {item.data.matchType}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'rgb(156, 163, 175)',
                                  fontWeight: '600'
                                }}>
                                  vs {item.data.opponent} • {timeLabel}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === 'new_match') {
                        return (
                          <div
                            key={`${item.type}-${item.playerId}-${index}`}
                            style={{
                              padding: '0.75rem',
                              background: 'linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(219, 234, 254) 100%)',
                              border: '2px solid rgb(59, 130, 246)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => navigate(`/player/${encodeURIComponent(item.playerName)}`)}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem'
                            }}>
                              <div style={{
                                fontSize: '1.5rem',
                                lineHeight: '1'
                              }}>
                                🎾
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '700',
                                  color: 'rgb(31, 41, 55)',
                                  marginBottom: '0.25rem'
                                }}>
                                  {item.playerName}
                                </div>
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: 'rgb(107, 114, 128)',
                                  marginBottom: '0.25rem'
                                }}>
                                  hat ein neues Match
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'rgb(156, 163, 175)',
                                  fontWeight: '600'
                                }}>
                                  vs {item.data.opponent} • {timeLabel}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {loadingFeed && (
                    <div style={{
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'rgb(107, 114, 128)',
                      fontSize: '0.875rem'
                    }}>
                      ⏳ Lade Aktivitäten...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Aktuelle Saison Card */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Aktuelle Saison</div>
      </div>

        <div className="season-content">
          {/* Season Display mit TVM Link */}
          <div className="season-display">
            <div className="season-icon">❄️</div>
            <div className="season-name">{seasonDisplay}</div>
          {teamInfo?.tvmLink && !teamInfo.tvmLink.includes('rotgelbsuerth') && (
            <a
              href={teamInfo.tvmLink}
              target="_blank"
              rel="noopener noreferrer"
                className="tvm-link-small"
                title="Zur TVM Seite"
              >
                TVM
                <ExternalLink size={12} style={{ marginLeft: '4px' }} />
            </a>
          )}
      </div>

          {/* Nächstes Spiel - IMMER anzeigen (Countdown) */}
          {nextMatchAnySeason ? (() => {
            const diffTime = nextMatchAnySeason.date - now;
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isSoon = diffDays <= 7;
            
            // Verfügbare Spieler
        const availablePlayers = Object.entries(nextMatchAnySeason.availability || {})
          .filter(([, data]) => data.status === 'available')
          .map(([, data]) => data.playerName)
          .filter(name => name && name !== 'Unbekannt');

            // Team-Status mit humorvoller Nachricht
            const teamStatus = getTeamStatusMessage(nextMatchAnySeason);

            const opponentStanding = getOpponentStanding(nextMatchAnySeason);
            const matchLocationLabel = (() => {
              const loc = (nextMatchAnySeason.location || '').toString().toLowerCase();
              if (loc === 'home') return '🏠 Heimspiel';
              if (loc === 'away') return '✈️ Auswärtsspiel';
              return nextMatchAnySeason.location || null;
            })();

            return (
              <div
                className="next-match-card clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/matches?match=${nextMatchAnySeason.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/matches?match=${nextMatchAnySeason.id}`);
                  }
                }}
              >
                <div className="next-match-label">NÄCHSTES SPIEL</div>
                <div className="next-match-countdown">{getNextMatchCountdown()}</div>
                
                {/* Team-Status mit Zusagen */}
                {teamStatus && (
                  <div className={`team-status-card ${teamStatus.isComplete ? 'complete' : 'open'}`}>
                    <div className="team-status-heading">
                      <span className="team-status-icon">{teamStatus.icon}</span>
                      <span className="team-status-text">
                        {teamStatus.count} / {teamStatus.required} Zusagen
                      </span>
                    </div>
                    <div className="team-status-message">{teamStatus.message}</div>
                  </div>
                )}
                
                <div className="opponent-summary">
                  <div className="opponent-label">Gegner</div>
                  <div className="opponent-name">{nextMatchAnySeason.opponent}</div>
                  {matchLocationLabel && (
                    <div className="opponent-location">{matchLocationLabel}</div>
                  )}
                  {formatStandingText(opponentStanding) ? (
                    <div className="opponent-standing with-data">
                      <span className="standing-icon">📊</span>
                      <span>{formatStandingText(opponentStanding)}</span>
                    </div>
                  ) : (
                    <div className="opponent-standing unknown">
                      <span className="standing-icon">📊</span>
                      <span>Tabellenplatz aktuell unbekannt</span>
                    </div>
                  )}
                </div>
                
                {/* Motivationsspruch bei Spielen < 7 Tage */}
                {isSoon && (
                  <div className="motivation-quote">
                    {getMotivationQuote()}
              </div>
                )}
                
                {/* Spieler-Liste bei Spielen < 7 Tage */}
                {isSoon && availablePlayers.length > 0 && (
                  <div className="available-players">
                    <div className="opponent-label">Es spielen:</div>
                <div className="player-badges">
                  {availablePlayers.map((playerName, index) => (
                    <span 
                      key={index} 
                          className="player-badge-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/player/${encodeURIComponent(playerName)}`);
                          }}
                          title={`Profil von ${playerName}`}
                    >
                      {playerName}
                    </span>
                  ))}
                </div>
              </div>
            )}

                <div className="next-match-cta">
                  <span>➡️ Verfügbarkeit jetzt aktualisieren</span>
                </div>
              </div>
            );
          })() : (
            <div className="next-match-card empty">
              <div className="next-match-label">NÄCHSTES SPIEL</div>
              <div className="next-match-countdown">📅 Der Spielplan ist noch leer</div>
            </div>
          )}
          
          {/* ⚠️ NEU: Vergangene Spiele OHNE Ergebnis - OFFEN */}
          {pastMatchesWithoutResult.length > 0 && (
            <div className="season-matches" style={{ 
              marginTop: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div className="season-matches-label" style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                color: '#92400e',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                border: '2px solid #f59e0b',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
              }}>
                ⚠️ OFFEN - Bitte Ergebnisse eintragen ({pastMatchesWithoutResult.length})
              </div>
              {pastMatchesWithoutResult.map((match) => (
                <div 
                  key={match.id} 
                  className="match-preview-card"
                  onClick={() => navigate(`/ergebnisse/${match.id}`)}
                  style={{ 
                    cursor: 'pointer',
                    border: '2px solid #f59e0b',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                  }}
                >
                  <div className="match-preview-header">
                    <div className="match-preview-date">
                      {format(match.date, 'EEE, dd. MMM', { locale: de })}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f59e0b',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      ⚠️ OFFEN
                    </div>
                  </div>
                  <div className="match-preview-opponent">{match.opponent}</div>
                  
                  {/* Team-Badge (wenn Multi-Team) */}
                  {match.teamInfo && playerTeams.length > 1 && (
                    <div className="match-team-badge">
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName} ({match.teamInfo.category})
                    </div>
                  )}
                  
                  {/* Heimspiel/Auswärtsspiel - NACH OBEN */}
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                  </div>
                  
                  {/* Venue - NACH OBEN */}
                  {match.venue && (
                    <div className="match-preview-location-simple">
                      <span className="location-icon">📍</span>
                      <span className="location-text">{match.venue}</span>
                    </div>
                  )}
                  
                  {/* 🎾 BELAG + SCHUHEMPFEHLUNG - NACH UNTEN */}
                  <SurfaceInfo matchdayId={match.id} compact={true} />
                  
                  <button 
                    className="btn-participation"
                    style={{
                      background: '#f59e0b',
                      borderColor: '#f59e0b'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ergebnisse/${match.id}`);
                    }}
                  >
                    ✏️ Ergebnis eintragen
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {upcomingMatches.length > 0 && (
            <div className="matches-divider tennis-divider">
              <div className="divider-line"></div>
              <div className="divider-icon">🎾</div>
              <div className="divider-line"></div>
            </div>
          )}
          
          {/* Kommende Spiele (nur echte zukünftige, nicht live) */}
          {upcomingMatches.length > 0 && (
            <div className="season-matches fade-in" style={{ marginTop: '1rem' }}>
              <div className="season-matches-label">
                Kommende Spiele ({upcomingMatches.length})
              </div>
              {upcomingMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="match-preview-card"
                  onClick={() => navigate(`/ergebnisse/${match.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="match-preview-header">
                    <div className="match-preview-date">
                      {format(match.date, 'EEE, dd. MMM', { locale: de })}
                      </div>
                    <div className="match-preview-time">
                      {format(match.date, 'HH:mm', { locale: de })} Uhr
                    </div>
                      </div>
                  <div className="match-preview-opponent">{match.opponent}</div>
                  
                  {/* Team-Badge (wenn Multi-Team) */}
                  {match.teamInfo && playerTeams.length > 1 && (
                    <div className="match-team-badge">
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName} ({match.teamInfo.category})
                    </div>
                  )}
                  
                  {/* Heimspiel/Auswärtsspiel - NACH OBEN */}
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                  </div>
                  
                  {/* Location mit Maps Link - NACH OBEN */}
                  {match.venue && (
                    <div className="match-preview-location">
                      <span className="location-icon">📍</span>
                      <span className="location-text">{match.venue}</span>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="maps-link-button"
                        onClick={(e) => e.stopPropagation()}
                        title="In Google Maps öffnen"
                      >
                        Karte
                        <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                      </a>
                    </div>
                  )}
                  
                  {/* Court-Nummern anzeigen */}
                  {(match.court_number || match.court_number_end) && (
                    <div style={{
                      padding: '0.5rem',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginTop: '0.5rem'
                    }}>
                      🎾 Plätze: {match.court_number}{match.court_number_end ? `–${match.court_number_end}` : ''}
                    </div>
                  )}
                  
                  {/* 🎾 BELAG + SCHUHEMPFEHLUNG - JETZT NACH UNTEN */}
                  <SurfaceInfo matchdayId={match.id} compact={false} />
                  
                  {/* Meine Teilnahme Button */}
                  <button 
                    className="btn-participation"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/matches?match=${match.id}`);
                    }}
                  >
                    Meine Teilnahme
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Visueller Trenner zwischen Kommenden und Beendeten Spielen */}
          {upcomingMatches.length > 0 && recentlyFinishedMatches.length > 0 && (
            <div className="matches-divider">
              <div className="divider-line"></div>
              <div className="divider-icon">⏱️</div>
              <div className="divider-line"></div>
            </div>
          )}
          
          {/* Beendete Spiele */}
          {recentlyFinishedMatches.length > 0 && (
            <div className="season-matches">
              <div className="season-matches-label">
                Beendete Spiele ({recentlyFinishedMatches.length})
              </div>
              {recentlyFinishedMatches.map((match) => {
                // ✅ RICHTIGE Logik: Berechne Sieg/Niederlage aus DB-Daten
                let matchResult = null;
                
                // ✅ Prüfe ob ECHTES Ergebnis (nicht nur 0:0)
                const hasRealResult = (match.home_score > 0 || match.away_score > 0);
                
                if (hasRealResult) {
                  // Schritt 1: Bestimme "mein Team" Punkte basierend auf location
                  let myScore, opponentScore;
                  
                  if (match.location === 'Away') {
                    // Mein Team spielt auswärts → Ich bin GUEST
                    myScore = match.away_score;
                    opponentScore = match.home_score;
                  } else {
                    // Mein Team spielt zu Hause → Ich bin HOME
                    myScore = match.home_score;
                    opponentScore = match.away_score;
                  }
                  
                  // Schritt 2: Vergleiche Punkte aus MEINER Sicht
                  if (myScore > opponentScore) {
                    matchResult = 'win';
                  } else if (myScore < opponentScore) {
                    matchResult = 'loss';
                  } else {
                    matchResult = 'draw';
                  }
                  
                  // Debug Log
                  console.log(`🎾 Match ${match.opponent}:`, {
                    location: match.location,
                    home_score: match.home_score,
                    away_score: match.away_score,
                    myScore,
                    opponentScore,
                    result: matchResult
                  });
                } else {
                  console.warn('⚠️ Match vergangen aber ohne Ergebnis:', match.opponent);
                }
                
                return (
                  <div 
                    key={match.id} 
                    className="match-preview-card finished"
                    onClick={() => navigate(`/ergebnisse/${match.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="match-preview-header">
                      <div className="match-preview-date">
                        {format(match.date, 'EEE, dd. MMM', { locale: de })}
                      </div>
                      <div className="match-preview-header-right">
                        {matchResult === 'win' && (
                          <div className="match-result-badge win">Sieg</div>
                        )}
                        {matchResult === 'loss' && (
                          <div className="match-result-badge loss">Niederlage</div>
                        )}
                        {matchResult === 'draw' && (
                          <div className="match-result-badge draw">Draw</div>
                        )}
                        <div className="match-preview-badge">Beendet</div>
                      </div>
                    </div>
                  <div className="match-preview-opponent">{match.opponent}</div>
                  
                  {/* Team-Badge (wenn Multi-Team) */}
                  {match.teamInfo && playerTeams.length > 1 && (
                    <div className="match-team-badge">
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName} ({match.teamInfo.category})
                    </div>
                  )}
                  
                  {/* Heimspiel/Auswärtsspiel - NACH OBEN */}
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                  </div>
                  
                  {/* Venue - NACH OBEN */}
                  {match.venue && (
                    <div className="match-preview-location-simple">
                      <span className="location-icon">📍</span>
                      <span className="location-text">{match.venue}</span>
                  </div>
                  )}
                  
                  {/* Ergebnisse anzeigen Button */}
                  <button
                    className="btn-participation"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ergebnisse/${match.id}`);
                    }}
                  >
                    Ergebnisse anzeigen
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* 3. Meine Vereine & Mannschaften - Detaillierte Ansicht */}
      <div className="fade-in lk-card-full" style={{ marginTop: '1rem' }}>
        <div className="formkurve-header">
          <div className="formkurve-title">Meine Vereine &amp; Mannschaften</div>
          <div className="match-count-badge">
            {playerTeams.length > 0 
              ? `${new Set(playerTeams.map(t => t.club_name)).size} Verein${new Set(playerTeams.map(t => t.club_name)).size !== 1 ? 'e' : ''}`
              : '1 Verein'
            }
          </div>
        </div>
        
        <div className="season-content">
          {playerTeams.length > 0 ? (
            (() => {
              // Gruppiere Teams nach Verein
              const teamsByClub = playerTeams.reduce((acc, team) => {
                const clubName = team.club_name || 'Unbekannter Verein';
                if (!acc[clubName]) acc[clubName] = [];
                acc[clubName].push(team);
                return acc;
              }, {});

              return Object.entries(teamsByClub).map(([clubName, clubTeams]) => (
                <div key={clubName} className="club-section" style={{ marginBottom: '1.5rem' }}>
                  {/* Club Header */}
                  <div 
                    className="club-header" 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, rgb(240, 249, 255) 0%, rgb(224, 242, 254) 100%)',
                      borderRadius: '8px',
                      border: '1px solid rgb(186, 230, 253)'
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#0369a1" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      style={{ marginRight: '0.5rem' }}
                    >
                      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
                      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
                      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
                      <path d="M10 6h4"></path>
                      <path d="M10 10h4"></path>
                      <path d="M10 14h4"></path>
                      <path d="M10 18h4"></path>
                    </svg>
                    <h3 style={{ margin: 0, color: 'rgb(3, 105, 161)', fontSize: '1.1rem', fontWeight: '600' }}>
                      {clubName}
                    </h3>
                  </div>

                  {/* Teams Grid */}
                  <div 
                    className="teams-grid" 
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
                    }}
                  >
                    {clubTeams.map((team) => {
                      console.log('🔍 Rendering team:', team.team_name || team.category, {
                        league: team.league,
                        group_name: team.group_name,
                        team_size: team.team_size,
                        season: team.season
                      });
                      return (
                      <div 
                        key={team.id} 
                        className="team-card" 
                        style={{
                          padding: '1.5rem',
                          border: team.is_primary ? '2px solid rgb(245, 158, 11)' : '2px solid rgb(209, 213, 219)',
                          borderRadius: '12px',
                          background: team.is_primary 
                            ? 'linear-gradient(135deg, rgb(254, 243, 199) 0%, rgb(253, 230, 138) 100%)'
                            : 'linear-gradient(135deg, rgb(249, 250, 251) 0%, rgb(243, 244, 246) 100%)',
                          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 2px 4px',
                          transition: '0.2s'
                        }}
                      >
                        {/* Team Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '1rem',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          <div style={{ flex: '1 1 0%', minWidth: '200px' }}>
                            <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                              {team.category && team.team_name && team.team_name.trim() !== '' 
                                ? `${team.category} - ${team.team_name}. Mannschaft`
                                : team.category || team.team_name}
                            </h4>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {team.is_primary && (
                              <span style={{
                                background: 'linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%)',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                boxShadow: 'rgba(245, 158, 11, 0.3) 0px 2px 4px'
                              }}>
                                ⭐ Hauptmannschaft
                              </span>
                            )}
                            <span style={{
                              background: team.role === 'captain' 
                                ? 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)'
                                : 'linear-gradient(135deg, rgb(107, 114, 128) 0%, rgb(75, 85, 99) 100%)',
                              color: 'white',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              boxShadow: team.role === 'captain'
                                ? 'rgba(239, 68, 68, 0.3) 0px 2px 4px'
                                : 'rgba(107, 114, 128, 0.3) 0px 2px 4px'
                            }}>
                              {team.role === 'captain' ? '👑 Kapitän' : '🎾 Spieler'}
                            </span>
                          </div>
                        </div>

                        {/* Team Info Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: '0.75rem',
                          marginBottom: '1rem',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.6)',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.7rem',
                              color: 'rgb(107, 114, 128)',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.25rem'
                            }}>Liga</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                              🏆 {team.league || 'N/A'}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.7rem',
                              color: 'rgb(107, 114, 128)',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.25rem'
                            }}>Gruppe</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                              📋 {team.group_name || 'N/A'}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.7rem',
                              color: 'rgb(107, 114, 128)',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.25rem'
                            }}>Saison</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                              📅 {seasonDisplay}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '0.7rem',
                              color: 'rgb(107, 114, 128)',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '0.25rem'
                            }}>Team</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                              👥 {team.team_size || 'N/A'} Spieler
                            </div>
                          </div>
                        </div>

                        {/* Edit Button */}
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditTeam(team)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 2px 4px'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          >
                            <Edit size={16} />
                            Daten ändern
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          ) : teamInfo ? (
            // Fallback für alte teamInfo Struktur
            <div className="club-section" style={{ marginBottom: '1.5rem' }}>
              <div 
                className="club-header" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, rgb(240, 249, 255) 0%, rgb(224, 242, 254) 100%)',
                  borderRadius: '8px',
                  border: '1px solid rgb(186, 230, 253)'
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#0369a1" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ marginRight: '0.5rem' }}
                >
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
                  <path d="M10 6h4"></path>
                  <path d="M10 10h4"></path>
                  <path d="M10 14h4"></path>
                  <path d="M10 18h4"></path>
                </svg>
                <h3 style={{ margin: 0, color: 'rgb(3, 105, 161)', fontSize: '1.1rem', fontWeight: '600' }}>
                  {teamInfo.clubName}
                </h3>
              </div>
              
              <div style={{
                padding: '1.5rem',
                border: '2px solid rgb(245, 158, 11)',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgb(254, 243, 199) 0%, rgb(253, 230, 138) 100%)',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 2px 4px'
              }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: '700', color: 'rgb(31, 41, 55)' }}>
                  {teamInfo.category}
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgb(107, 114, 128)' }}>
                  {teamInfo.league} {teamInfo.group}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Team Edit Modal */}
      {editingTeam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                Team-Daten bearbeiten
              </h3>
              <button
                onClick={closeEditTeam}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                padding: '0.75rem', 
                background: '#f3f4f6', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Team</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                  {editingTeam.club_name} - {editingTeam.category || editingTeam.team_name}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Liga
              </label>
              <input
                type="text"
                value={editForm.league}
                onChange={(e) => setEditForm({ ...editForm, league: e.target.value })}
                placeholder="z.B. 2. Bezirksliga"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Gruppe
              </label>
              <input
                type="text"
                value={editForm.group_name}
                onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
                placeholder="z.B. Gruppe A"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeEditTeam}
                disabled={savingTeam}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: savingTeam ? 'not-allowed' : 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={saveTeamChanges}
                disabled={savingTeam}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: savingTeam ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: savingTeam ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {savingTeam ? '⏳ Speichere...' : '✅ Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

