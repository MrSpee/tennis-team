import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Dashboard.css';
import './Results.css';

const TeamView = ({ 
  teamId, 
  matches, 
  matchScores, 
  display,
  getMatchStatus,
  calculatePlayerPerspectiveScore
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('spiele');
  const [standings, setStandings] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Lade Tabelle
  const loadStandings = async (tid) => {
    if (!tid) return;
    
    setLoadingStandings(true);
    try {
      console.log('📊 Loading standings for team:', tid);
      
      // 1. Hole Team-Season Info für Liga/Gruppe (mit aktuelle Saison)
      const { data: teamSeasons, error: seasonError } = await supabase
        .from('team_seasons')
        .select(`
          league,
          group_name,
          season,
          team_id,
          team_info!team_seasons_team_id_fkey(id, team_name, club_name)
        `)
        .eq('team_id', tid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (seasonError) throw seasonError;
      if (!teamSeasons || teamSeasons.length === 0) {
        console.warn('❌ Team-Season nicht gefunden - league/group_name fehlen');
        setStandings([]);
        return;
      }
      
      const teamSeason = teamSeasons[0];
      const teamInfo = teamSeason.team_info;
      
      if (!teamSeason.league || !teamSeason.group_name) {
        console.warn('❌ league oder group_name sind NULL:', teamSeason);
        setStandings([]);
        return;
      }
      
      console.log('🏆 Team Season Info:', teamSeason);
      
      // 2. Finde alle Teams in der gleichen Liga/Gruppe (über team_seasons)
      const { data: leagueTeamSeasons, error: teamsError } = await supabase
        .from('team_seasons')
        .select(`
          team_id,
          team_info!team_seasons_team_id_fkey(id, team_name, club_name)
        `)
        .eq('league', teamSeason.league)
        .eq('group_name', teamSeason.group_name)
        .eq('is_active', true);
      
      if (teamsError) throw teamsError;
      
      const leagueTeams = leagueTeamSeasons
        ?.map(ts => ts.team_info)
        .filter(Boolean) || [];
      
      if (!leagueTeams || leagueTeams.length === 0) {
        console.warn('No teams found in league');
        setStandings([]);
        return;
      }
      
      console.log('👥 Found teams in league:', leagueTeams.length);
      
      const teamIds = leagueTeams.map(t => t.id);
      
      // 3. Lade alle Matches dieser Teams (nur Liga-interne Spiele)
      const { data: allMatches, error: matchesError } = await supabase
        .from('matchdays')
        .select('id, home_team_id, away_team_id, match_date, status')
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
        .order('match_date');
      
      if (matchesError) throw matchesError;
      
      console.log('🎾 Found matches:', allMatches?.length || 0);
      
      // 4. Lade alle match_results für diese Matches
      const matchIds = (allMatches || []).map(m => m.id);
      
      const { data: allResults, error: resultsError } = await supabase
        .from('match_results')
        .select('*')
        .in('matchday_id', matchIds);
      
      if (resultsError) throw resultsError;
      
      console.log('📊 Found match results:', allResults?.length || 0);
      
      // 5. Berechne Statistiken für jedes Team
      const teamStats = {};
      
      leagueTeams.forEach(team => {
        teamStats[team.id] = {
          team_id: team.id,
          team_name: `${team.club_name} ${team.team_name}`,
          played: 0,        // Begegnungen
          won: 0,           // Siege
          draw: 0,          // Unentschieden
          lost: 0,          // Niederlagen
          tab_points: 0,    // Tabellenpunkte (2:1:0)
          match_points_for: 0,    // Gewonnene Einzelspiele
          match_points_against: 0, // Verlorene Einzelspiele
          sets_for: 0,      // Gewonnene Sätze
          sets_against: 0,  // Verlorene Sätze
          games_for: 0,     // Gewonnene Games
          games_against: 0, // Verlorene Games
          is_own_team: team.id === tid
        };
      });
      
      // 6. Verarbeite jedes Match
      (allMatches || []).forEach(match => {
        const homeTeamId = match.home_team_id;
        const awayTeamId = match.away_team_id;
        
        // Nur Matches zwischen Teams in dieser Liga zählen
        if (!teamStats[homeTeamId] || !teamStats[awayTeamId]) return;
        
        // Hole alle Ergebnisse für dieses Match
        const matchResults = (allResults || []).filter(r => r.matchday_id === match.id);
        
        if (matchResults.length === 0) return; // Match noch nicht gespielt
        
        // Zähle gewonnene Einzelspiele
        let homeMatchPoints = 0;
        let awayMatchPoints = 0;
        let homeSets = 0;
        let awaySets = 0;
        let homeGames = 0;
        let awayGames = 0;
        
        matchResults.forEach(result => {
          if (result.status !== 'completed' || !result.winner) return;
          
          // Matchpunkte
          if (result.winner === 'home') {
            homeMatchPoints++;
          } else if (result.winner === 'guest') {
            awayMatchPoints++;
          }
          
          // Sätze zählen
          const set1Home = parseInt(result.set1_home) || 0;
          const set1Guest = parseInt(result.set1_guest) || 0;
          const set2Home = parseInt(result.set2_home) || 0;
          const set2Guest = parseInt(result.set2_guest) || 0;
          const set3Home = parseInt(result.set3_home) || 0;
          const set3Guest = parseInt(result.set3_guest) || 0;
          
          // Set 1
          if (set1Home > set1Guest) homeSets++;
          else if (set1Guest > set1Home) awaySets++;
          homeGames += set1Home;
          awayGames += set1Guest;
          
          // Set 2
          if (set2Home > set2Guest) homeSets++;
          else if (set2Guest > set2Home) awaySets++;
          homeGames += set2Home;
          awayGames += set2Guest;
          
          // Set 3 (falls gespielt)
          if (set3Home > 0 || set3Guest > 0) {
            if (set3Home > set3Guest) homeSets++;
            else if (set3Guest > set3Home) awaySets++;
            
            // ✅ CHAMPIONS TIE-BREAK: Nur 1:0 Games für Gewinner (wenn >= 10 Punkte bei einem der beiden)
            const isChampionsTiebreak = set3Home >= 10 || set3Guest >= 10;
            
            if (isChampionsTiebreak) {
              // Tie-Break: Gewinner bekommt 1 Game, Verlierer 0
              // Beispiele: 10:8 → 1:0, 12:10 → 1:0, 7:10 → 0:1, 12:14 → 0:1
              if (set3Home > set3Guest) {
                homeGames += 1;  // Home gewinnt
                awayGames += 0;  // Away verliert
              } else if (set3Guest > set3Home) {
                homeGames += 0;  // Home verliert
                awayGames += 1;  // Away gewinnt
              }
              // Bei Gleichstand (sollte nicht vorkommen) werden keine Games gezählt
            } else {
              // Normaler 3. Satz: Games wie üblich zählen (z.B. 6:4)
              homeGames += set3Home;
              awayGames += set3Guest;
            }
          }
        });
        
        // Nur wenn mindestens ein Ergebnis vorhanden
        if (homeMatchPoints + awayMatchPoints === 0) return;
        
        // Aktualisiere Team-Statistiken
        teamStats[homeTeamId].played++;
        teamStats[awayTeamId].played++;
        
        teamStats[homeTeamId].match_points_for += homeMatchPoints;
        teamStats[homeTeamId].match_points_against += awayMatchPoints;
        teamStats[awayTeamId].match_points_for += awayMatchPoints;
        teamStats[awayTeamId].match_points_against += homeMatchPoints;
        
        teamStats[homeTeamId].sets_for += homeSets;
        teamStats[homeTeamId].sets_against += awaySets;
        teamStats[awayTeamId].sets_for += awaySets;
        teamStats[awayTeamId].sets_against += homeSets;
        
        teamStats[homeTeamId].games_for += homeGames;
        teamStats[homeTeamId].games_against += awayGames;
        teamStats[awayTeamId].games_for += awayGames;
        teamStats[awayTeamId].games_against += homeGames;
        
        // Bestimme Sieger der Begegnung (wer mehr Matchpunkte hat)
        if (homeMatchPoints > awayMatchPoints) {
          teamStats[homeTeamId].won++;
          teamStats[homeTeamId].tab_points += 2;
          teamStats[awayTeamId].lost++;
        } else if (awayMatchPoints > homeMatchPoints) {
          teamStats[awayTeamId].won++;
          teamStats[awayTeamId].tab_points += 2;
          teamStats[homeTeamId].lost++;
        } else {
          // Unentschieden
          teamStats[homeTeamId].draw++;
          teamStats[homeTeamId].tab_points += 1;
          teamStats[awayTeamId].draw++;
          teamStats[awayTeamId].tab_points += 1;
        }
      });
      
      // 7. Sortiere nach Tabellenpunkten (dann Matchpunkte, dann Sätze, dann Games)
      const sortedStandings = Object.values(teamStats)
        .sort((a, b) => {
          // Primär: Tabellenpunkte
          if (b.tab_points !== a.tab_points) return b.tab_points - a.tab_points;
          
          // Sekundär: Matchpunkte-Differenz
          const aMatchDiff = a.match_points_for - a.match_points_against;
          const bMatchDiff = b.match_points_for - b.match_points_against;
          if (bMatchDiff !== aMatchDiff) return bMatchDiff - aMatchDiff;
          
          // Tertiär: Satz-Differenz
          const aSetDiff = a.sets_for - a.sets_against;
          const bSetDiff = b.sets_for - b.sets_against;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          
          // Quartär: Game-Differenz
          const aGameDiff = a.games_for - a.games_against;
          const bGameDiff = b.games_for - b.games_against;
          return bGameDiff - aGameDiff;
        })
        .map((team, index) => ({
          position: index + 1,
          team_name: team.team_name,
          played: team.played,
          won: team.won,
          draw: team.draw,
          lost: team.lost,
          tab_points: team.tab_points,
          match_points: `${team.match_points_for}:${team.match_points_against}`,
          sets: `${team.sets_for}:${team.sets_against}`,
          games: `${team.games_for}:${team.games_against}`,
          is_own_team: team.is_own_team
        }));
      
      console.log('✅ Standings calculated:', sortedStandings);
      setStandings(sortedStandings);
      
    } catch (error) {
      console.error('Error loading standings:', error);
      setStandings([]);
    } finally {
      setLoadingStandings(false);
    }
  };

  // Lade Kader
  const loadTeamPlayers = async (tid) => {
    if (!tid) return;
    
    setLoadingPlayers(true);
    try {
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          position,
          is_captain,
          players_unified!team_memberships_player_id_fkey(
            id,
            name,
            current_lk,
            season_start_lk,
            profile_image,
            player_type
          )
        `)
        .eq('team_id', tid)
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      const playerIds = data?.map(d => d.players_unified?.id).filter(Boolean) || [];
      
      const { data: teamCounts } = await supabase
        .from('team_memberships')
        .select('player_id')
        .in('player_id', playerIds)
        .eq('is_active', true);
      
      const teamCountMap = {};
      teamCounts?.forEach(tc => {
        teamCountMap[tc.player_id] = (teamCountMap[tc.player_id] || 0) + 1;
      });
      
      const players = data?.map(d => ({
        ...d.players_unified,
        position: d.position,
        is_captain: d.is_captain,
        team_count: teamCountMap[d.players_unified?.id] || 1
      })).filter(p => p.id) || [];
      
      setTeamPlayers(players);
    } catch (error) {
      console.error('Error loading team players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    if (!teamId) return;
    
    if (activeTab === 'tabelle') {
      loadStandings(teamId);
    } else if (activeTab === 'kader') {
      loadTeamPlayers(teamId);
    }
  }, [activeTab, teamId]);

  return (
    <>
      {/* Tab-Navigation */}
      <div className="fade-in" style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'white',
          padding: '0.5rem',
          borderRadius: '12px',
          border: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('spiele')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'spiele' 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                : 'white',
              color: activeTab === 'spiele' ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            📊 Spiele
          </button>
          <button
            onClick={() => setActiveTab('tabelle')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'tabelle' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'white',
              color: activeTab === 'tabelle' ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            📈 Tabelle
          </button>
          <button
            onClick={() => setActiveTab('kader')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'kader' 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                : 'white',
              color: activeTab === 'kader' ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            👥 Kader
          </button>
        </div>
      </div>

      {/* Tab: Spiele */}
      {activeTab === 'spiele' && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Alle Spiele</div>
            <div className="match-count-badge">
              {matches.length} {matches.length === 1 ? 'Spiel' : 'Spiele'}
            </div>
          </div>
          <div className="season-content">
            {matches.length === 0 ? (
              <div className="no-results">
                <div style={{ fontSize: '3rem' }}>🎾</div>
                <h3>Keine Spiele gefunden</h3>
                <p>Für die aktuelle Saison {display} sind noch keine Spiele geplant.</p>
              </div>
            ) : (
              <div>
                {/* Matches würden hier angezeigt */}
                <p>Spiele-Liste wird hier angezeigt...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tabelle */}
      {activeTab === 'tabelle' && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Tabelle - Saison {display}</div>
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
                          key={idx}
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

      {/* Tab: Kader */}
      {activeTab === 'kader' && (
        <div className="fade-in lk-card-full">
          <div className="formkurve-header">
            <div className="formkurve-title">Mannschaftskader</div>
            <div className="match-count-badge">{teamPlayers.length} Spieler</div>
          </div>
          
          <div className="season-content">
            {loadingPlayers ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>⏳</div>
                <div>Lade Spieler...</div>
              </div>
            ) : teamPlayers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>👥</div>
                <h3>Keine Spieler gefunden</h3>
                <p>Für diese Mannschaft sind noch keine Spieler registriert.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {teamPlayers.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: p.is_captain 
                        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                        : 'white',
                      border: p.is_captain ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {p.profile_image ? (
                      <img 
                        src={p.profile_image} 
                        alt={p.name}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #e5e7eb'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        🎾
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                        {p.name}
                        {p.is_captain && ' 👑'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        LK {p.current_lk || p.season_start_lk || '?'}
                        {p.team_count > 1 && ` • ${p.team_count} Teams`}
                      </div>
                    </div>
                    
                    {p.position && (
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Pos. {p.position}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TeamView;

