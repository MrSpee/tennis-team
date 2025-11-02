import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ExternalLink, Edit, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { parseLK } from '../lib/lkUtils';
import { supabase } from '../lib/supabaseClient';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, player } = useAuth();
  const { 
    matches, 
    teamInfo, 
    playerTeams
  } = useData();
  
  // Debug: Prüfe was geladen wurde (nur bei signifikanten Änderungen)
  useEffect(() => {
    console.log('🔍 Dashboard State Changed:', {
      playerTeamsLength: playerTeams?.length,
      hasTeamInfo: !!teamInfo,
      hasPlayer: !!player,
      totalMatches: matches.length
    });
  }, [playerTeams?.length, !!teamInfo, !!player, matches.length]);
  
  // State für Live-Timer
  const [currentTime, setCurrentTime] = useState(new Date());

  // State für Team-Edit Modal
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({ league: '', group_name: '' });
  const [savingTeam, setSavingTeam] = useState(false);

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
        seasonMatches: m.season === currentSeason
      })));
    }
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
        (data || []).forEach(r => {
          if (!counts[r.matchday_id]) {
            counts[r.matchday_id] = { total: 0, completed: 0 };
          }
          counts[r.matchday_id].total++;
          if (r.status === 'completed' && r.winner) {
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
      return status === 'live' && m.season === currentSeason;
    })
    .sort((a, b) => a.date - b.date);
  
  // Kommende Spiele (noch nicht begonnen)
  const upcomingMatches = matches
    .filter(m => {
      const status = getMatchStatus(m);
      return status === 'upcoming' && m.season === currentSeason;
    })
    .sort((a, b) => a.date - b.date);

  // Beendete Spiele der aktuellen Saison
  const recentlyFinishedMatches = matches
    .filter(m => {
      const status = getMatchStatus(m);
      return status === 'finished' && m.season === currentSeason;
    })
    .sort((a, b) => b.date - a.date); // Neueste zuerst

  // console.log('🔵 Upcoming matches for', currentSeason, ':', upcomingMatches.length);
  // console.log('🔵 Finished matches for', currentSeason, ':', recentlyFinishedMatches.length);

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

    // 🔧 Bestimme "HEUTE" basierend auf 06:00 Uhr als Tag-Start
    const getTodayAt6AM = () => {
      const today = new Date();
      today.setHours(6, 0, 0, 0);
      return today;
    };

    const getTomorrowAt6AM = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return tomorrow;
    };

    const todayStart = getTodayAt6AM();
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

  // Motivationsspruch basierend auf Countdown (nur für ZUKÜNFTIGE Spiele)
  // 🔧 Nutzt gleiche 06:00 Uhr Logik wie getNextMatchCountdown
  const getMotivationQuote = () => {
    if (!nextMatchAnySeason) return '';
    
    const diffTime = nextMatchAnySeason.date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    // 🔧 Bestimme "HEUTE" und "MORGEN" basierend auf 06:00 Uhr als Tag-Start
    const getTodayAt6AM = () => {
      const today = new Date();
      today.setHours(6, 0, 0, 0);
      return today;
    };

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
                    <div className="match-preview-location">{match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}</div>
                    <div className="match-preview-venue">{match.venue}</div>
                  </div>
                );
              })}
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

          {/* Nächstes Spiel - NUR anzeigen wenn < 24h */}
          {nextMatchAnySeason ? (() => {
            const diffTime = nextMatchAnySeason.date - now;
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isSoon = diffDays <= 7;
            
            // 🔧 NUR anzeigen wenn < 24 Stunden
            if (diffHours >= 24) {
              return null;
            }
            
            // Verfügbare Spieler
        const availablePlayers = Object.entries(nextMatchAnySeason.availability || {})
          .filter(([, data]) => data.status === 'available')
          .map(([, data]) => data.playerName)
          .filter(name => name && name !== 'Unbekannt');

        return (
              <div className="next-match-card">
                <div className="next-match-label">NÄCHSTES SPIEL</div>
                <div className="next-match-countdown">{getNextMatchCountdown()}</div>
                
                {/* Motivationsspruch bei Spielen < 7 Tage */}
                {isSoon && (
                  <div className="motivation-quote">
                    {getMotivationQuote()}
              </div>
                )}
                
                <div className="next-match-opponent">
                  <div className="opponent-label">Gegner:</div>
                  <div className="opponent-name">{nextMatchAnySeason.opponent}</div>
                </div>
                
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
                </div>
            );
          })() : (
            <div className="next-match-card empty">
              <div className="next-match-label">NÄCHSTES SPIEL</div>
              <div className="next-match-countdown">📅 Der Spielplan ist noch leer</div>
            </div>
          )}
          
          {/* Kommende Spiele (nur echte zukünftige, nicht live) */}
          {upcomingMatches.length > 0 && (
            <div className="season-matches">
              <div className="season-matches-label">Kommende Spiele</div>
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
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName}
                    </div>
                  )}
                  
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                      </div>
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
              <div className="season-matches-label">Beendete Spiele</div>
              {recentlyFinishedMatches.map((match) => {
                // Hole Match-Ergebnis aus DB (später über API)
                // Für jetzt: Mock-Daten (erster Match = Sieg, zweiter = Niederlage)
                const matchResult = match.id.includes('test') 
                  ? 'draw' 
                  : recentlyFinishedMatches.indexOf(match) === 0 
                    ? 'win' 
                    : 'loss';
                
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
                      🏢 {match.teamInfo.clubName} - {match.teamInfo.teamName}
                    </div>
                  )}
                  
                  <div className="match-preview-type">
                    {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                  </div>
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
