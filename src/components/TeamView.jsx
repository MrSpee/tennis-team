import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import computeStandings from '../utils/standings';
import './Dashboard.css';
import './Results.css';

const TeamView = ({ 
  teamId, 
  matches = [], 
  leagueMatches = [],
  leagueMeta,
  playerTeamIds = [],
  display = '',
  activeTab = 'spiele', // ✅ NEU: Tab von außen steuerbar
  onTabChange = null // ✅ NEU: Callback für Tab-Änderungen
}) => {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab || 'spiele');
  
  // Verwende externen Tab wenn vorhanden, sonst internen
  const currentTab = activeTab !== undefined ? activeTab : internalActiveTab;
  const setCurrentTab = onTabChange || setInternalActiveTab;
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const playerTeamIdSet = useMemo(() => new Set(playerTeamIds), [playerTeamIds]);

  const sortedLeagueMatches = useMemo(() => {
    if (!leagueMatches || leagueMatches.length === 0) return [];
    return [...leagueMatches].sort((a, b) => {
      const aTime = a.date instanceof Date ? a.date.getTime() : (a.date ? new Date(a.date).getTime() : 0);
      const bTime = b.date instanceof Date ? b.date.getTime() : (b.date ? new Date(b.date).getTime() : 0);
      return aTime - bTime;
    });
  }, [leagueMatches]);

  // Wenn playerTeamIds leer ist (fremdes Team), zeige alle Matches ohne Trennung
  const ownLeagueMatches = useMemo(
    () => {
      if (playerTeamIds.length === 0) {
        // Für fremde Teams: keine "Unsere Begegnungen" Sektion
        return [];
      }
      return sortedLeagueMatches.filter(match => match.involvesPlayerTeam);
    },
    [sortedLeagueMatches, playerTeamIds]
  );

  const otherLeagueMatches = useMemo(
    () => {
      if (playerTeamIds.length === 0) {
        // Für fremde Teams: zeige alle Matches als "Weitere Begegnungen"
        return sortedLeagueMatches;
      }
      return sortedLeagueMatches.filter(match => !match.involvesPlayerTeam);
    },
    [sortedLeagueMatches, playerTeamIds]
  );

  // Lade leagueMeta direkt aus team_seasons, wenn teamId gesetzt ist
  const [localLeagueMeta, setLocalLeagueMeta] = useState(null);
  
  useEffect(() => {
    if (!teamId) {
      setLocalLeagueMeta(null);
      return;
    }
    
    const loadLeagueMeta = async () => {
      try {
        const currentSeason = 'Winter 2025/26';
        const { data: teamSeason } = await supabase
          .from('team_seasons')
          .select('league, group_name, season, team_info!inner(category)')
          .eq('team_id', teamId)
          .eq('is_active', true)
          .eq('season', currentSeason)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (teamSeason) {
          setLocalLeagueMeta({
            league: teamSeason.league,
            group: teamSeason.group_name,
            season: teamSeason.season
          });
          console.log('✅ Local LeagueMeta loaded for teamId:', teamId, {
            category: teamSeason.team_info?.category,
            league: teamSeason.league,
            group: teamSeason.group_name
          });
        } else {
          console.warn('⚠️ No team_season found for teamId:', teamId);
          setLocalLeagueMeta(null);
        }
      } catch (error) {
        console.error('❌ Error loading local league meta:', error);
        setLocalLeagueMeta(null);
      }
    };
    
    loadLeagueMeta();
  }, [teamId]);
  
  const leagueSubtitle = useMemo(() => {
    // Priorisiere localLeagueMeta über leagueMeta aus Context
    const meta = localLeagueMeta || leagueMeta;
    if (meta && (meta.league || meta.group || meta.season)) {
      return [meta.league, meta.group, meta.season].filter(Boolean).join(' • ');
    }
    return display || 'Liga-Spielplan';
  }, [localLeagueMeta, leagueMeta, display]);

  const hasLeagueMatches = sortedLeagueMatches.length > 0;

  const formatMatchDate = (date) => {
    if (!date) return 'Termin offen';
    const safeDate = date instanceof Date ? date : new Date(date);
    return format(safeDate, 'EEE, dd. MMM', { locale: de });
  };

  const formatMatchTime = (time) => {
    if (!time) return null;
    if (typeof time === 'string') {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]} Uhr`;
      }
      return `${time} Uhr`;
    }
    return null;
  };

  const getStatusLabel = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'finished':
        return 'Beendet';
      case 'completed':
        return 'Beendet';
      case 'live':
        return 'Live';
      case 'cancelled':
        return 'Abgesagt';
      default:
        return 'Geplant';
    }
  };

  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'finished':
      case 'completed':
        return 'finished';
      case 'live':
        return 'live';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  };

  const determineDerivedStatus = (match, matchDate) => {
    const baseStatus = (match.status || '').toLowerCase();
    const completedMatches = match.completedMatches || 0;
    const expectedMatches = match.expectedMatches || 0;
    const hasMatchPoints = (match.homeMatchPoints ?? null) !== null || (match.awayMatchPoints ?? null) !== null;
    const scoredMatches = (match.homeMatchPoints || 0) + (match.awayMatchPoints || 0);

    if (baseStatus === 'cancelled') {
      return 'cancelled';
    }

    if (baseStatus === 'finished' || baseStatus === 'completed') {
      return 'finished';
    }

    if (completedMatches > 0 && expectedMatches > 0 && completedMatches >= expectedMatches && scoredMatches > 0) {
      return 'finished';
    }

    if (scoredMatches > 0 && completedMatches > 0) {
      return 'live';
    }

    if (hasMatchPoints && scoredMatches > 0 && matchDate && matchDate < new Date()) {
      return 'finished';
    }

    return baseStatus || 'scheduled';
  };

  const renderMatchCard = (match) => {
    const matchDate = match.date instanceof Date ? match.date : (match.date ? new Date(match.date) : null);
    const derivedStatus = determineDerivedStatus(match, matchDate);
    const statusClass = getStatusClass(derivedStatus);
    const statusLabel = getStatusLabel(derivedStatus);
    const timeLabel = formatMatchTime(match.start_time);
    const scoreLabel = match.displayScore || '–:–';
    const subScoreLabel = (match.homeSets || match.awaySets) ? `Sätze ${match.homeSets}:${match.awaySets}` : null;
    const gamesLabel = (match.homeGames || match.awayGames) ? `Games ${match.homeGames}:${match.awayGames}` : null;
    const progressLabel = match.completedMatches > 0 && match.expectedMatches
      ? `${match.completedMatches}/${match.expectedMatches} Matches`
      : null;

    const homeName = match.homeTeam?.displayName || 'Heimteam';
    const awayName = match.awayTeam?.displayName || 'Gastteam';
    const highlight = Boolean(match.involvesPlayerTeam);

    const showParticipationCTA = (match.isPlayerHomeTeam || match.isPlayerAwayTeam) && (statusClass === 'upcoming' || statusClass === 'live');

    return (
      <div
        key={match.id}
        className={`league-match-card ${statusClass} ${highlight ? 'highlight' : ''}`}
      >
        <div className="league-match-header">
          <div className="league-match-date">{formatMatchDate(matchDate)}</div>
          <div className={`league-match-status ${statusClass}`}>{statusLabel}</div>
        </div>

        <div className="league-match-teams">
          <span className={`league-team ${match.isPlayerHomeTeam ? 'player-team' : ''}`}>{homeName}</span>
          <span className="league-match-score">{scoreLabel}</span>
          <span className={`league-team ${match.isPlayerAwayTeam ? 'player-team' : ''}`}>{awayName}</span>
        </div>

        {(timeLabel || match.venue) && (
          <div className="league-match-meta">
            {timeLabel && <span>🕒 {timeLabel}</span>}
            {match.venue && <span>📍 {match.venue}</span>}
          </div>
        )}

        {(subScoreLabel || gamesLabel) && (
          <div className="league-match-subscore">
            {[subScoreLabel, gamesLabel].filter(Boolean).join(' • ')}
          </div>
        )}

        {progressLabel && (
          <div className="league-match-progress">
            📊 {progressLabel}
          </div>
        )}

        <div className="league-match-actions">
          <button
            type="button"
            className="league-match-button"
            onClick={() => navigate(`/ergebnisse/${match.id}`)}
          >
            Details
          </button>
          {showParticipationCTA && (
            <button
              type="button"
              className="league-match-button secondary"
              onClick={() => navigate(`/matches?match=${match.id}`)}
            >
              Teilnahme
            </button>
          )}
        </div>
      </div>
    );
  };

  // Lade Tabelle
  const loadStandings = async (tid) => {
    if (!tid) return;
    
    setLoadingStandings(true);
    try {
      console.log('📊 Loading standings for team:', tid);
      
      // 1. Hole Team-Season Info für Liga/Gruppe (mit aktuelle Saison)
      // WICHTIG: Filtere auch nach season, um sicherzustellen, dass wir die richtige Saison laden
      const currentSeason = 'Winter 2025/26';
      const { data: teamSeasons, error: seasonError } = await supabase
        .from('team_seasons')
        .select(`
          league,
          group_name,
          season,
          team_id,
          team_info!team_seasons_team_id_fkey(id, team_name, club_name, category)
        `)
        .eq('team_id', tid)
        .eq('is_active', true)
        .eq('season', currentSeason)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 Team Seasons Query:', { tid, currentSeason, teamSeasons });
      
      if (seasonError) {
        console.error('❌ Error loading team seasons:', seasonError);
        throw seasonError;
      }
      
      if (!teamSeasons || teamSeasons.length === 0) {
        console.warn('❌ Team-Season nicht gefunden - league/group_name fehlen', { tid, currentSeason });
        setStandings([]);
        return;
      }
      
      const teamSeason = teamSeasons[0];
      const teamInfo = teamSeason.team_info;
      
      console.log('🏆 Team Season Info:', {
        teamId: tid,
        teamName: teamInfo?.team_name,
        category: teamInfo?.category,
        league: teamSeason.league,
        group_name: teamSeason.group_name,
        season: teamSeason.season
      });
      
      if (!teamSeason.league || !teamSeason.group_name) {
        console.warn('❌ league oder group_name sind NULL:', teamSeason);
        setStandings([]);
        return;
      }
      
      // 2. Finde alle Teams in der gleichen Liga/Gruppe/Saison (über team_seasons)
      const { data: leagueTeamSeasons, error: teamsError } = await supabase
        .from('team_seasons')
        .select(`
          team_id,
          team_info!team_seasons_team_id_fkey(id, team_name, club_name)
        `)
        .eq('league', teamSeason.league)
        .eq('group_name', teamSeason.group_name)
        .eq('season', teamSeason.season)
        .eq('is_active', true);
      
      if (teamsError) throw teamsError;
      
      console.log('🔍 Raw leagueTeamSeasons:', leagueTeamSeasons?.length || 0, leagueTeamSeasons);
      
      // Dedupliziere Teams - es kann mehrere team_seasons Einträge für das gleiche Team geben
      // WICHTIG: Teams mit unterschiedlichen Kategorien (z.B. Herren 40 vs Herren 55) sind NICHT Duplikate!
      const uniqueTeamsMap = new Map(); // Nach ID
      const duplicateTeams = [];
      
      leagueTeamSeasons?.forEach(ts => {
        const teamInfo = ts.team_info;
        if (teamInfo && teamInfo.id) {
          // Prüfe auf Duplikat nach ID (gleiche Team-ID = definitiv das gleiche Team)
          if (uniqueTeamsMap.has(teamInfo.id)) {
            duplicateTeams.push({
              teamId: teamInfo.id,
              teamName: `${teamInfo.club_name} ${teamInfo.team_name}`.trim()
            });
            return; // Skip, bereits vorhanden
          }
          
          // Neues Team - hinzufügen (keine weitere Deduplizierung nach Namen!)
          // Unterschiedliche IDs = unterschiedliche Teams, auch wenn Namen ähnlich sind
          uniqueTeamsMap.set(teamInfo.id, teamInfo);
        }
      });
      
      if (duplicateTeams.length > 0) {
        console.warn('⚠️ Duplicate team_seasons found (same team_id appeared multiple times):', duplicateTeams);
      }
      
      const leagueTeams = Array.from(uniqueTeamsMap.values());
      
      if (!leagueTeams || leagueTeams.length === 0) {
        console.warn('No teams found in league');
        setStandings([]);
        return;
      }
      
      console.log('👥 Found teams in league:', leagueTeams.length, 'unique teams (deduplicated from', leagueTeamSeasons?.length || 0, 'team_seasons entries)');
      console.log('👥 Team names with IDs:', leagueTeams.map(t => ({
        id: t.id,
        name: `${t.club_name} ${t.team_name}`.trim()
      })));
      
      const teamIds = leagueTeams.map(t => t.id);
      const teamIdsSet = new Set(teamIds);
      
      // 3. Lade alle Matches dieser Teams (nur Liga-interne Spiele der aktuellen Saison UND Gruppe)
      // WICHTIG: Lade ALLE Matches, bei denen EINES der Teams in der Liga ist
      // Wir filtern dann später, um nur Matches zu behalten, bei denen BEIDE Teams in der Liga sind
      const { data: allMatchesRaw, error: matchesError} = await supabase
        .from('matchdays')
        .select('id, home_team_id, away_team_id, match_date, status, season, league, group_name, home_score, away_score')
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
        .eq('season', teamSeason.season)
        .eq('league', teamSeason.league)
        .eq('group_name', teamSeason.group_name) // WICHTIG: Filtere auch nach Gruppe!
        .order('match_date');
      
      if (matchesError) throw matchesError;
      
      // Filtere: Nur Matches, bei denen BEIDE Teams in der Liga sind
      const allMatches = (allMatchesRaw || []).filter(match => 
        teamIdsSet.has(match.home_team_id) && teamIdsSet.has(match.away_team_id)
      );
      
      console.log('🎾 Found matches (raw):', allMatchesRaw?.length || 0);
      console.log('🎾 Found matches (filtered - beide Teams in Liga):', allMatches?.length || 0);
      console.log('🔍 Match IDs:', allMatches?.map(m => m.id) || []);
      
      // 4. Lade alle match_results für diese Matches (nur completed)
      const matchIds = (allMatches || []).map(m => m.id);
      
      if (matchIds.length === 0) {
        console.warn('⚠️ Keine Matchday-IDs gefunden, setze Standings auf leer');
        setStandings([]);
        setLoadingStandings(false);
        return;
      }
      
      const { data: allResults, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .in('matchday_id', matchIds)
        .eq('status', 'completed'); // Nur abgeschlossene Ergebnisse zählen
      
      if (resultsError) throw resultsError;
      
      console.log('🔍 Match IDs für match_results Abfrage:', matchIds);
      console.log('📊 Found match results:', allResults?.length || 0);
      
      // Debug: Zeige Details der match_results
      if (allResults && allResults.length > 0) {
        console.log('🔍 Match results details:', allResults.map(r => ({
          matchday_id: r.matchday_id,
          status: r.status,
          winner: r.winner,
          match_type: r.match_type,
          match_number: r.match_number
        })));
        
        // Gruppiere nach matchday_id
        const resultsByMatchday = allResults.reduce((acc, r) => {
          if (!acc[r.matchday_id]) acc[r.matchday_id] = [];
          acc[r.matchday_id].push(r);
          return acc;
        }, {});
        
        // Alle abgeschlossenen Match-Status
        const FINISHED_STATUSES = ['completed', 'retired', 'walkover', 'disqualified', 'defaulted'];
        
        console.log('🔍 Results grouped by matchday:', Object.keys(resultsByMatchday).map(matchdayId => {
          const match = allMatches?.find(m => m.id === matchdayId);
          const homeTeamInLeague = match ? leagueTeams.find(t => t.id === match.home_team_id) : null;
          const awayTeamInLeague = match ? leagueTeams.find(t => t.id === match.away_team_id) : null;
          return {
            matchday_id: matchdayId,
            count: resultsByMatchday[matchdayId].length,
            finished: resultsByMatchday[matchdayId].filter(r => FINISHED_STATUSES.includes(r.status) && r.winner).length,
            with_winner: resultsByMatchday[matchdayId].filter(r => r.winner).length,
            match_found_in_allMatches: !!match,
            match_home_team_id: match?.home_team_id,
            match_away_team_id: match?.away_team_id,
            home_team_in_league: !!homeTeamInLeague,
            away_team_in_league: !!awayTeamInLeague,
            home_team_name: homeTeamInLeague ? `${homeTeamInLeague.club_name} ${homeTeamInLeague.team_name}`.trim() : 'NICHT IN LIGA',
            away_team_name: awayTeamInLeague ? `${awayTeamInLeague.club_name} ${awayTeamInLeague.team_name}`.trim() : 'NICHT IN LIGA'
          };
        }));
        
        // Prüfe ob alle matchday_ids auch in allMatches sind
        const matchdayIdsWithResults = Object.keys(resultsByMatchday);
        const matchIds = (allMatches || []).map(m => m.id);
        const missingMatches = matchdayIdsWithResults.filter(id => !matchIds.includes(id));
        if (missingMatches.length > 0) {
          console.warn('⚠️ Matchdays mit match_results, aber nicht in allMatches gefunden:', missingMatches);
        }
        
        // Prüfe ob alle Matches in allMatches auch Teams in leagueTeams haben
        allMatches?.forEach(match => {
          const homeTeamInLeague = leagueTeams.find(t => t.id === match.home_team_id);
          const awayTeamInLeague = leagueTeams.find(t => t.id === match.away_team_id);
          if (!homeTeamInLeague || !awayTeamInLeague) {
            console.warn(`⚠️ Match ${match.id} hat Teams, die nicht in leagueTeams sind:`, {
              match_id: match.id,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              home_in_league: !!homeTeamInLeague,
              away_in_league: !!awayTeamInLeague
            });
          }
        });
      }
      
      const standings = computeStandings(
        leagueTeams,
        allMatches || [],
        allResults || []
      );
      
      // Markiere eigenes Team
      const standingsWithOwnTeam = standings.map(s => ({
        ...s,
        is_own_team: s.team_id === tid
      }));
      
      console.log('✅ Standings calculated:', standingsWithOwnTeam.length, 'teams');
      console.log('✅ Standings details:', standingsWithOwnTeam.map(s => ({
        position: s.position,
        team_name: s.team_name,
        team_id: s.team_id,
        is_own_team: s.is_own_team
      })));
      
      setStandings(standingsWithOwnTeam);
      
    } catch (error) {
      console.error('Error loading standings:', error);
      setStandings([]);
    } finally {
      setLoadingStandings(false);
    }
  };

  useEffect(() => {
    if (!teamId) return;
    
    if (currentTab === 'tabelle') {
      loadStandings(teamId);
    }
  }, [currentTab, teamId]);

  return (
    <>
      {/* Tab-Navigation wird jetzt von Results.jsx gerendert */}
      {/* Tab: Spiele */}
      {currentTab === 'spiele' && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Liga-Spielplan</div>
            <div className="match-count-badge">
              {hasLeagueMatches ? `${sortedLeagueMatches.length} Begegnung${sortedLeagueMatches.length === 1 ? '' : 'en'}` : 'Keine Daten'}
            </div>
          </div>
          <div className="season-content">
            <div className="league-meta-banner">
              {leagueSubtitle}
            </div>

            {!hasLeagueMatches ? (
              <div className="no-results">
                <div style={{ fontSize: '3rem' }}>📅</div>
                <h3>Keine Liga-Spiele gefunden</h3>
                <p>
                  Für diese Liga wurden noch keine Begegnungen geladen. Prüfe später erneut
                  oder kontaktiere deinen Captain.
                </p>
              </div>
            ) : (
              <div className="league-match-sections">
                {ownLeagueMatches.length > 0 && (
                  <div className="league-match-section">
                    <h3>Unsere Begegnungen</h3>
                    <div className="league-match-grid">
                      {ownLeagueMatches.map(renderMatchCard)}
                    </div>
                  </div>
                )}

                {otherLeagueMatches.length > 0 && (
                  <div className="league-match-section">
                    <h3>{playerTeamIds.length === 0 ? 'Liga-Spiele' : 'Weitere Begegnungen in der Liga'}</h3>
                    <div className="league-match-grid">
                      {otherLeagueMatches.map(renderMatchCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tabelle */}
      {currentTab === 'tabelle' && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Tabelle - Saison {leagueMeta?.season}</div>
            {standings.find(s => s.is_own_team) && (
              <div className="improvement-badge-top neutral" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: '2px solid #059669'
              }}>
                <span className="badge-icon">🏆</span>
                <span className="badge-value">{standings.find(s => s.is_own_team)?.position}.</span>
              </div>
            )}
          </div>
          
          <div className="season-content" style={{ padding: 0 }}>
            {loadingStandings ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>⏳</div>
                <div>Lade Tabelle...</div>
              </div>
            ) : standings.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>📊</div>
                <h3>Keine Tabelle verfügbar</h3>
                <p>Für diese Mannschaft ist noch keine Tabelle verfügbar.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Mannschaft</th>
                        <th>Sp</th>
                        <th>S</th>
                        <th>U</th>
                        <th>N</th>
                        <th>Tab.Pkt</th>
                        <th>Matches</th>
                        <th>Sätze</th>
                        <th>Games</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, idx) => (
                        <tr 
                          key={team.team_id || team.teamId || `team-${idx}`}
                          className={team.is_own_team ? 'own-team' : ''}
                          style={team.is_own_team ? {
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            fontWeight: '700',
                            border: '2px solid #3b82f6'
                          } : {}}
                        >
                          <td>{team.position}.</td>
                          <td>{team.is_own_team ? '🎾 ' : ''}{team.team_name}</td>
                          <td>{team.played}</td>
                          <td>{team.won}</td>
                          <td>{team.draw}</td>
                          <td>{team.lost}</td>
                          <td className="points" style={{ fontWeight: '700', color: '#059669', fontSize: '1rem' }}>
                            {team.tab_points}
                          </td>
                          <td>{team.match_points}</td>
                          <td>{team.sets}</td>
                          <td>{team.games}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ padding: '1rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Sp</strong> = Begegnungen • <strong>S</strong> = Siege • <strong>U</strong> = Unentschieden • <strong>N</strong> = Niederlagen
                  </div>
                  <div>
                    <strong>Tab.Pkt</strong> = Tabellenpunkte • <strong>Matches</strong> = Einzelspiele • <strong>Sätze</strong> = Sätze • <strong>Games</strong> = Games
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default TeamView;

