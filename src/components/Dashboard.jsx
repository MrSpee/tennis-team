import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { parseLK } from '../lib/lkUtils';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, player } = useAuth();
  const { 
    matches, 
    teamInfo, 
    playerTeams
  } = useData();
  
  // Debug: Prüfe was geladen wurde
  console.log('🔍 Dashboard Debug:', {
    playerTeams: playerTeams,
    playerTeamsLength: playerTeams?.length,
    teamInfo: teamInfo,
    player: player
  });
  
  // State für Live-Timer
  const [currentTime, setCurrentTime] = useState(new Date());

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
      // Sep-Dez: Winter 24/25 (aktuelles Jahr / nächstes Jahr)
      const nextYear = currentYear + 1;
      seasonDisplay = `Winter ${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}`;
    } else {
      // Jan-Apr: Winter 24/25 (vorheriges Jahr / aktuelles Jahr)
      const prevYear = currentYear - 1;
      seasonDisplay = `Winter ${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}`;
    }
  }
  
  // Debug: Zeige was geladen wurde
  console.log('🔵 Dashboard Debug:', {
    totalMatches: matches.length,
    currentSeason,
    seasonDisplay,
    currentMonth,
    currentTime: now.toLocaleString('de-DE'),
    allMatches: matches.map(m => ({ 
      opponent: m.opponent, 
      date: m.date.toLocaleString('de-DE'),
      dateISO: m.date.toISOString(),
      season: m.season,
      hoursSinceStart: ((now - m.date) / (1000 * 60 * 60)).toFixed(2),
      isFuture: m.date > now
    }))
  });
  
  // Kommende Spiele (noch nicht begonnen)
  const upcomingMatches = matches
    .filter(m => {
      return m.date > now && m.season === currentSeason;
    })
    .sort((a, b) => a.date - b.date);

  // Beendete Spiele der aktuellen Saison (bereits begonnen, OHNE Zeitlimit)
  const recentlyFinishedMatches = matches
    .filter(m => {
      return m.date < now && m.season === currentSeason;
    })
    .sort((a, b) => b.date - a.date); // Neueste zuerst

  console.log('🔵 Upcoming matches for', currentSeason, ':', upcomingMatches.length);
  console.log('🔵 Finished matches for', currentSeason, ':', recentlyFinishedMatches.length);

  // Für Countdown: Das allernächste ZUKÜNFTIGE Spiel (egal welche Saison)
  // Nur Spiele die noch nicht begonnen haben
  const nextMatchAnySeason = matches
    .filter(m => m.date > now)
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
    
    console.log('🔵 Greeting debug:', { 
      playerName: player?.name, 
      userMetadata: currentUser?.user_metadata?.name,
      email: currentUser?.email,
      finalName: playerName,
      firstName 
    });
    
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
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    // Heute: Weniger als 24 Stunden
    if (diffHours < 24) {
        if (diffHours === 0) {
          return `🔥 In ${diffMinutes}m ${diffSeconds}s - HEUTE!`;
        }
        return `🔥 In ${diffHours}h ${diffMinutes}m - HEUTE!`;
    }

    // Morgen: Zwischen 24 und 48 Stunden
    if (diffHours < 48) {
        return `⚡ In ${diffHours}h ${diffMinutes}m - MORGEN!`;
    }

    // Für mehr als 2 Tage: Zeige Tage
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return `⏰ In ${diffDays} Tagen`;
    if (diffDays <= 7) return `📅 In ${diffDays} Tagen`;
    return `📆 In ${diffDays} Tagen`;
  };
  
  // Motivationsspruch basierend auf Countdown (nur für ZUKÜNFTIGE Spiele)
  const getMotivationQuote = () => {
    if (!nextMatchAnySeason) return '';
    
    const diffTime = nextMatchAnySeason.date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    // Spiel steht bevor
    if (diffHours < 2) {
      return '💪 Gleich geht\'s los! Gebt alles!';
    } else if (diffHours < 12) {
      return '🎯 Heute zeigen wir, was wir drauf haben!';
    } else if (diffHours < 24) {
      return '🔥 Noch heute ist der große Tag!';
    } else if (diffHours < 48) {
      return '⚡ Morgen wird es ernst - bereitet euch vor!';
    } else if (diffHours < 72) {
      return '🎾 Bald ist Spieltag - mentale Vorbereitung läuft!';
    } else if (diffHours < 168) { // < 1 Woche
      return '📅 Das nächste Match rückt näher!';
    } else {
      return '🌟 Vorfreude auf das nächste Match!';
    }
  };

  // Debug Player Data
  console.log('🔍 Dashboard Player Data:', {
    player,
    hasCurrentLK: !!player?.current_lk,
    currentLK: player?.current_lk,
    startLK: player?.start_lk,
    seasonImprovement: player?.season_improvement,
    ranking: player?.ranking
  });

  return (
    <div className="dashboard container">
      {/* 1. Persönliche Begrüßung - ganz oben */}
      <div className="fade-in" style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">
          {getGreeting()}
        </h1>
        
        {/* LK-Card mit Formkurve */}
        {(player?.current_lk || player?.ranking) && (
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
                {player.current_lk && (() => {
                  // Nutze gemeinsame parseLK Funktion aus lkUtils
                  const startLK = parseLK(player.start_lk || player.season_start_lk || player.current_lk);
                  const currentLKValue = parseLK(player.current_lk);
                  const improvement = player.season_improvement || 0;
                  
                  // Dynamische Monate basierend auf heutigem Datum
                  const now = new Date();
                  const currentMonth = now.getMonth(); // 0=Jan, 11=Dez
                  const currentYear = now.getFullYear();
                  const seasonStartDate = new Date('2025-09-01');
                  const weeksSinceStart = Math.max(0, (now - seasonStartDate) / (7 * 24 * 60 * 60 * 1000));
                  
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
                  
                  console.log('📊 Monthly Sparkline Data:', {
                    currentMonth: monthNames[currentMonth],
                    weeksSinceStart,
                    startLK,
                    currentLKValue,
                    improvement,
                    monthlyData
                  });
                  
                  return (
                    <div className="sparkline-container">
                      <svg className="spark-large" width="100%" height="140" viewBox="0 0 320 140" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.4 }} />
                            <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.05 }} />
                          </linearGradient>
                          {/* Schraffur-Pattern für Prognose - SICHTBAR */}
                          <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'var(--accent)', strokeWidth: 1.5, opacity: 0.4 }} />
                          </pattern>
                          {/* Gestrichelte Linie für Prognose */}
                          <linearGradient id="gradForecast" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.25 }} />
                            <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.1 }} />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const points = monthlyData.map(d => d.lk);
                          
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
                          
                          // Pfad für Prognose-Area (Okt-Nov, schraffiert)
                          const forecastPath = `M${svgPoints[2].x},${svgPoints[2].y} L${svgPoints[3].x},${svgPoints[3].y} L${svgPoints[3].x},105 L${svgPoints[2].x},105 Z`;
                          
                          // Linien-Pfad für Vergangenheit (durchgezogen)
                          const historicalLine = `M${svgPoints[0].x},${svgPoints[0].y} L${svgPoints[1].x},${svgPoints[1].y} L${svgPoints[2].x},${svgPoints[2].y}`;
                          
                          // Linien-Pfad für Prognose (gestrichelt)
                          const forecastLine = `M${svgPoints[2].x},${svgPoints[2].y} L${svgPoints[3].x},${svgPoints[3].y}`;
                          
                          return (
                            <>
                              {/* Normale Area (Aug-Sep-Okt) mit Gradient */}
                              <path className="area" d={historicalPath} fill="url(#grad)" />
                              
                              {/* Schraffierte Prognose-Area (Okt-Nov) - DEUTLICH SICHTBAR */}
                              <path className="area-forecast" d={forecastPath} fill="url(#diagonalHatch)" opacity="0.8" />
                              
                              {/* Durchgezogene Linie für Vergangenheit */}
                              <path className="line" d={historicalLine} strokeDasharray="none" />
                              
                              {/* GESTRICHELTE Linie für Prognose */}
                              <path className="line-forecast" d={forecastLine} strokeDasharray="8,4" opacity="0.7" />
                              
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
        )}
      </div>

      {/* 2. Training-Teaser Card - ENTFERNT (war hardcoded) */}
      {/* TODO: Dynamische Training-Anzeige implementieren */}

      {/* 3. Aktuelle Saison Card */}
      <div className="fade-in lk-card-full">
        <div className="formkurve-header">
          <div className="formkurve-title">Aktuelle Saison</div>
      </div>

        <div className="season-content">
          {/* Season Display mit TVM Link */}
          <div className="season-display">
            <div className="season-icon">❄️</div>
            <div className="season-name">{seasonDisplay}</div>
          {teamInfo?.tvmLink && (
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

          {/* Nächstes Spiel */}
          {nextMatchAnySeason ? (() => {
            const diffTime = nextMatchAnySeason.date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isSoon = diffDays <= 7;
            
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
          
          {/* Alle Spiele der laufenden Saison */}
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
                    {clubTeams.map((team) => (
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
                              {team.team_name || team.category}
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
                              🏆 {team.league || '2. Bezirksliga'}
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
                              👥 {team.player_count || 'N/A'} Spieler
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
    </div>
  );
}

export default Dashboard;
