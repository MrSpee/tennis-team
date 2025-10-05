import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../context/DataContext';
import './Results.css';

const Results = () => {
  console.log('🟣 Results Component MOUNTED');
  
  const navigate = useNavigate();
  const { teamInfo } = useData();
  const [matches, setMatches] = useState([]);
  const [matchScores, setMatchScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(new Date());
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    console.log('🔵 Results useEffect triggered, hasLoaded:', hasLoaded);
    
    // Verhindere doppeltes Laden (React Strict Mode)
    if (hasLoaded) {
      console.log('⚠️ Already loaded, skipping...');
      return;
    }
    
    setHasLoaded(true);
    loadMatchesAndResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktuelle Saison bestimmen
  const getCurrentSeason = () => {
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    
    if (currentMonth >= 4 && currentMonth <= 7) {
      return { season: 'summer', display: `Sommer ${currentYear}` };
    } else {
      if (currentMonth >= 8) {
        const nextYear = currentYear + 1;
        return { season: 'winter', display: `Winter ${String(currentYear).slice(-2)}/${String(nextYear).slice(-2)}` };
      } else {
        const prevYear = currentYear - 1;
        return { season: 'winter', display: `Winter ${String(prevYear).slice(-2)}/${String(currentYear).slice(-2)}` };
      }
    }
  };

  const loadMatchesAndResults = async () => {
    console.log('🟢 loadMatchesAndResults STARTED');
    
    try {
      setLoading(true);
      console.log('⏳ Loading set to TRUE');
      
      const { season } = getCurrentSeason();
      console.log('📅 Current season:', season);

      // Lade alle Matches der aktuellen Saison (chronologisch aufsteigend)
      console.log('🔍 Fetching matches from Supabase...');
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('season', season)
        .order('match_date', { ascending: true });

      console.log('📦 Matches data received:', {
        count: matchesData?.length || 0,
        hasError: !!matchesError,
        error: matchesError
      });

      if (matchesError) {
        console.error('❌ Error loading matches:', matchesError);
        setLoading(false);
        return;
      }

      if (!matchesData || matchesData.length === 0) {
        console.warn('⚠️ No matches found for season:', season);
        setMatches([]);
        setMatchScores({});
        setLoading(false);
        return;
      }

      // Konvertiere Datum-Strings zu Date-Objekten
      const processedMatches = matchesData.map(match => ({
        ...match,
        date: new Date(match.match_date)
      }));

      console.log('✅ Processed matches:', processedMatches.length);
      console.log('📋 First match:', processedMatches[0]);

      // Lade Ergebnisse für alle Matches parallel (viel schneller!)
      console.log('🔍 Fetching match results for', processedMatches.length, 'matches...');
      
      const scoresPromises = processedMatches.map(async (match, index) => {
        console.log(`  📊 Fetching results for match ${index + 1}:`, match.opponent);
        
        const { data: resultsData, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .eq('match_id', match.id);

        console.log(`  ✅ Results for match ${index + 1}:`, {
          count: resultsData?.length || 0,
          hasError: !!resultsError,
          data: resultsData
        });

        return {
          matchId: match.id,
          score: (!resultsError && resultsData) ? calculateMatchScore(resultsData, match.season) : null
        };
      });

      const scoresResults = await Promise.all(scoresPromises);
      console.log('✅ All scores fetched:', scoresResults.length);
      
      // Baue scores-Objekt
      const scores = {};
      scoresResults.forEach((result, index) => {
        if (result.score) {
          scores[result.matchId] = result.score;
          console.log(`  💯 Score ${index + 1}:`, result.score);
        }
      });

      console.log('📊 Final scores object:', scores);
      console.log('🎯 Setting state with', processedMatches.length, 'matches and', Object.keys(scores).length, 'scores');

      // Setze BEIDE States auf einmal → nur ein Re-Render!
      setMatches(processedMatches);
      setMatchScores(scores);
      
      console.log('✅ State set successfully!');
      
    } catch (error) {
      console.error('❌ FATAL ERROR in loadMatchesAndResults:', error);
    } finally {
      setLoading(false);
      console.log('✅ Loading set to FALSE - DONE!');
    }
  };

  // Tennis Match Logic
  const calculateSetWinner = (home, guest, isChampionsTiebreak = false) => {
    if (isChampionsTiebreak) {
      if (home >= 10 && home >= guest + 2) return 'home';
      if (guest >= 10 && guest >= home + 2) return 'guest';
      return null;
    } else {
      // Tiebreak-Sieg: 7:6 oder 6:7
      if ((home === 7 && guest === 6) || (guest === 7 && home === 6)) {
        return home > guest ? 'home' : 'guest';
      }
      
      // Normaler Satzgewinn ohne Tiebreak: 7:5 oder besser
      if ((home === 7 && guest <= 5) || (guest === 7 && home <= 5)) {
        return home > guest ? 'home' : 'guest';
      }
      
      // Normaler Satz gewonnen (6:0, 6:1, 6:2, 6:3, 6:4)
      if (home >= 6 && home >= guest + 2) return 'home';
      if (guest >= 6 && guest >= home + 2) return 'guest';
      
      // Tiebreak wird gerade gespielt (6:6)
      if (home === 6 && guest === 6) return null;
      
      return null;
    }
  };

  const calculateMatchWinner = (result) => {
    let homeSetsWon = 0;
    let guestSetsWon = 0;
    
    const sets = [
      { home: result.set1_home, guest: result.set1_guest },
      { home: result.set2_home, guest: result.set2_guest },
      { home: result.set3_home, guest: result.set3_guest }
    ];
    
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const home = parseInt(set.home) || 0;
      const guest = parseInt(set.guest) || 0;
      
      if (home === 0 && guest === 0) continue;
      
      const setWinner = calculateSetWinner(home, guest, i === 2);
      
      if (setWinner === 'home') homeSetsWon++;
      else if (setWinner === 'guest') guestSetsWon++;
    }
    
    if (homeSetsWon >= 2) return 'home';
    if (guestSetsWon >= 2) return 'guest';
    return null;
  };

  const calculateMatchScore = (results, matchSeason) => {
    let homeScore = 0;
    let guestScore = 0;
    let completedMatches = 0;

    // Erwartete Anzahl Spiele je nach Saison
    const expectedTotal = matchSeason === 'summer' ? 9 : 6; // Sommer: 9, Winter: 6

    results.forEach(result => {
      // Prüfe ob das Match tatsächlich gespielt wurde (mindestens ein Set hat Werte)
      const hasScores = (result.set1_home > 0 || result.set1_guest > 0 || 
                        result.set2_home > 0 || result.set2_guest > 0 ||
                        result.set3_home > 0 || result.set3_guest > 0);
      
      if (!hasScores) {
        // Match wurde noch nicht gespielt, nicht als completed zählen
        return;
      }

      if (result.status === 'completed' && result.winner) {
        completedMatches++;
        if (result.winner === 'home') homeScore++;
        else if (result.winner === 'guest') guestScore++;
      } else {
        const matchWinner = calculateMatchWinner(result);
        if (matchWinner === 'home') {
          completedMatches++;
          homeScore++;
        } else if (matchWinner === 'guest') {
          completedMatches++;
          guestScore++;
        }
      }
    });

    console.log('📊 Score Calculation:', { 
      homeScore, 
      guestScore, 
      completedMatches, 
      expectedTotal,
      actualEntriesInDB: results.length,
      season: matchSeason
    });

    return { home: homeScore, guest: guestScore, completed: completedMatches, total: expectedTotal };
  };

  const getMatchStatus = (match) => {
    const score = matchScores[match.id];
    const now = new Date();
    const matchDate = new Date(match.date);
    const hoursSinceMatch = (now - matchDate) / (1000 * 60 * 60);

    // Kein Ergebnis eingetragen
    if (!score || score.completed === 0) {
      // Spiel liegt mehr als 24 Stunden zurück ohne Ergebnis
      if (hoursSinceMatch > 24) {
        return 'finished-no-result';
      }
      // Spiel ist heute oder hat vor kurzem begonnen (bis 12 Stunden nach Start)
      // → LIVE/In Progress
      if (hoursSinceMatch >= -2 && hoursSinceMatch <= 12) {
        return 'live';
      }
      // Ansonsten: noch geplant (zukünftig)
      return 'upcoming';
    }

    // Teilweise Ergebnisse vorhanden (1-5 von 6 Matches)
    if (score.completed < score.total) {
      return 'in-progress';
    }

    // Alle 6 Matches abgeschlossen
    return 'completed';
  };

  const getStatusBadge = (match) => {
    const status = getMatchStatus(match);
    
    switch (status) {
      case 'completed':
        return <span className="mr-pill mr-status">✅ Abgeschlossen</span>;
      case 'in-progress':
        return <span className="mr-pill mr-status-progress">⏳ Läuft</span>;
      case 'live':
        return <span className="mr-pill mr-status-live">🔴 LIVE</span>;
      case 'upcoming':
        return <span className="mr-pill mr-status-upcoming">📅 Geplant</span>;
      case 'finished-no-result':
        return <span className="mr-pill mr-status-no-result">❓ Kein Ergebnis</span>;
      default:
        return null;
    }
  };

  const getResultDisplay = (match) => {
    const score = matchScores[match.id];
    
    if (!score || score.completed === 0) {
      return <span className="result-text no-result">-:-</span>;
    }

    const homeWins = score.home > score.guest;
    const guestWins = score.guest > score.home;
    const isTie = score.home === score.guest;

    return (
      <div className="result-display">
        <span className={`result-score ${homeWins ? 'winner' : ''}`}>
          {score.home}
        </span>
        <span className="result-separator">:</span>
        <span className={`result-score ${guestWins ? 'winner' : ''}`}>
          {score.guest}
        </span>
        {score.completed < score.total && (
          <span className="result-info">({score.completed}/{score.total})</span>
        )}
      </div>
    );
  };

  const { season, display } = getCurrentSeason();

  console.log('🎨 Rendering Results, loading:', loading, 'matches:', matches.length);

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Ergebnisse...</p>
          <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
            Debug: Loading state = {loading ? 'true' : 'false'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🏆 Spielergebnisse</h1>
        </div>
        <p className="season-info">{display}</p>
      </div>

      <div className="results-container">
        {matches.length === 0 ? (
          <div className="no-matches">
            <div className="no-matches-icon">🎾</div>
            <h3>Keine Spiele gefunden</h3>
            <p>Für die aktuelle Saison {display} sind noch keine Spiele geplant.</p>
          </div>
        ) : (
          <div className="matches-list">
            {matches.map((match, matchIndex) => {
              const score = matchScores[match.id];
              const status = getMatchStatus(match);
              
              // Prüfe ob das Medenspiel komplett abgeschlossen ist (alle 6 bzw. 9 Spiele)
              const expectedTotal = match.season === 'summer' ? 9 : 6;
              const isMedenspieleCompleted = score && score.completed >= expectedTotal;
              
              // Outcome basierend auf Medenspiel-Status
              let outcome, outcomeClass, outcomeLabel;
              
              if (!score || score.completed === 0) {
                // Keine Ergebnisse
                outcome = status === 'live' ? 'live' : 'upcoming';
                outcomeClass = outcome === 'live' ? 'result-live' : 'result-upcoming';
                outcomeLabel = '';
              } else if (isMedenspieleCompleted) {
                // ALLE Spiele abgeschlossen → Finaler Sieger
                if (score.home > score.guest) {
                  outcome = 'win';
                  outcomeClass = 'result-win';
                  outcomeLabel = '🏆 Sieg';
                } else if (score.home < score.guest) {
                  outcome = 'loss';
                  outcomeClass = 'result-loss';
                  outcomeLabel = '🏆 Niederlage';
                } else {
                  outcome = 'draw';
                  outcomeClass = 'result-draw';
                  outcomeLabel = '🏆 Remis';
                }
              } else {
                // Spiel läuft noch (1-5 Spiele bei Winter, 1-8 bei Sommer)
                if (score.home > score.guest) {
                  outcome = 'leading';
                  outcomeClass = 'result-leading';
                  outcomeLabel = '🏠 Heim führt';
                } else if (score.home < score.guest) {
                  outcome = 'trailing';
                  outcomeClass = 'result-trailing';
                  outcomeLabel = '✈️ Gast führt';
                } else {
                  outcome = 'tied';
                  outcomeClass = 'result-tied';
                  outcomeLabel = '⚖️ Unentschieden';
                }
              }

              return (
                <article 
                  key={match.id} 
                  className={`mr-card ${outcomeClass}`}
                  onClick={() => navigate(`/ergebnisse/${match.id}`)}
                >
                  <div className="mr-accent" aria-hidden="true"></div>

                  <header className="mr-head">
                    <span className="mr-pill mr-match-number">
                      🎾 Spiel {matchIndex + 1}
                    </span>
                    <span className="mr-pill mr-date">
                      📅 {match.date.toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="mr-pill mr-time">
                      ⏰ {match.date.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} Uhr
                    </span>
                    <span className={`mr-pill ${match.location === 'Home' ? 'mr-location-home' : 'mr-location-away'}`}>
                      {match.location === 'Home' ? '🏠 Heimspiel' : '✈️ Auswärtsspiel'}
                    </span>
                    {getStatusBadge(match)}
                  </header>

                  <hr className="mr-divider" />

                  <section className="mr-body">
                    <div className="mr-team-row">
                      <div className="mr-team">
                        <span className="mr-emoji" aria-hidden="true">🏠</span>
                        <span className="mr-team-name">{teamInfo?.teamName || 'Unser Team'}</span>
                      </div>
                    </div>

                    <div className="mr-score-wrap">
                      {score && score.completed > 0 ? (
                        <div className="mr-score-box">
                          <span className="mr-score">{score.home}</span>
                          <span className="mr-sep">:</span>
                          <span className="mr-score">{score.guest}</span>
                        </div>
                      ) : (
                        <div className="mr-score-box upcoming">
                          <span className="result-text no-result">-:-</span>
                        </div>
                      )}
                    </div>

                    {outcome !== 'upcoming' && (
                      <div className={`mr-outcome ${outcome}`}>
                        <span>{outcomeLabel}</span>
                      </div>
                    )}

                    <div className="mr-team-row">
                      <div className="mr-team">
                        <span className="mr-team-name">{match.opponent}</span>
                        <span className="mr-emoji" aria-hidden="true">✈️</span>
                      </div>
                    </div>
                  </section>

                  <footer className="mr-foot">
                    <span className="view-details-link">
                      Details ansehen <ChevronRight size={16} />
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;

