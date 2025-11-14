const parseIntSafe = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const buildTeamLabel = (team = {}) => {
  const parts = [team.club_name, team.team_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : team.team_name || team.club_name || 'Unbekanntes Team';
};

export const computeStandings = (leagueTeams = [], matches = [], matchResults = []) => {
  if (!Array.isArray(leagueTeams) || leagueTeams.length === 0) {
    return [];
  }

  const teamStats = {};

  leagueTeams.forEach((team) => {
    if (!team || !team.id) return;

    const label = buildTeamLabel(team);

    teamStats[team.id] = {
      teamId: team.id,
      team,
      teamLabel: label,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      tab_points: 0,
      match_points_for: 0,
      match_points_against: 0,
      sets_for: 0,
      sets_against: 0,
      games_for: 0,
      games_against: 0
    };
  });

  const resultsByMatchId = matchResults.reduce((acc, result) => {
    if (!result || !result.matchday_id) return acc;
    if (!acc[result.matchday_id]) {
      acc[result.matchday_id] = [];
    }
    acc[result.matchday_id].push(result);
    return acc;
  }, {});
  
  // Debug: Log resultsByMatchId
  if (Object.keys(resultsByMatchId).length > 0) {
    console.log('🔍 [computeStandings] Results grouped by matchday_id:', Object.keys(resultsByMatchId).length, 'matchdays');
    Object.keys(resultsByMatchId).forEach(matchdayId => {
      const results = resultsByMatchId[matchdayId];
      const completed = results.filter(r => r.status === 'completed' && r.winner);
      console.log(`  Matchday ${matchdayId}: ${results.length} results, ${completed.length} completed with winner`);
    });
  }

  (matches || []).forEach((match) => {
    if (!match) return;

    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;

    if (!teamStats[homeTeamId] || !teamStats[awayTeamId]) {
      return;
    }

    const matchResultsForGame = resultsByMatchId[match.id] || [];

    if (matchResultsForGame.length === 0) {
      console.log(`⚠️ [computeStandings] Match ${match.id} hat keine match_results`);
      return;
    }
    
    console.log(`✅ [computeStandings] Match ${match.id} hat ${matchResultsForGame.length} match_results`);

    let homeMatchPoints = 0;
    let awayMatchPoints = 0;
    let homeSets = 0;
    let awaySets = 0;
    let homeGames = 0;
    let awayGames = 0;

    let skippedResults = 0;
    matchResultsForGame.forEach((result) => {
      if (result.status !== 'completed' || !result.winner) {
        skippedResults++;
        return;
      }

      if (result.winner === 'home') {
        homeMatchPoints += 1;
      } else if (result.winner === 'guest' || result.winner === 'away') {
        awayMatchPoints += 1;
      }

      const set1Home = parseIntSafe(result.set1_home);
      const set1Guest = parseIntSafe(result.set1_guest);
      const set2Home = parseIntSafe(result.set2_home);
      const set2Guest = parseIntSafe(result.set2_guest);
      const set3Home = parseIntSafe(result.set3_home);
      const set3Guest = parseIntSafe(result.set3_guest);

      if (set1Home > set1Guest) homeSets += 1;
      else if (set1Guest > set1Home) awaySets += 1;
      homeGames += set1Home;
      awayGames += set1Guest;

      if (set2Home > set2Guest) homeSets += 1;
      else if (set2Guest > set2Home) awaySets += 1;
      homeGames += set2Home;
      awayGames += set2Guest;

      if (set3Home > 0 || set3Guest > 0) {
        if (set3Home > set3Guest) homeSets += 1;
        else if (set3Guest > set3Home) awaySets += 1;

        const isChampionsTiebreak = set3Home >= 10 || set3Guest >= 10;

        if (isChampionsTiebreak) {
          if (set3Home > set3Guest) {
            homeGames += 1;
          } else if (set3Guest > set3Home) {
            awayGames += 1;
          }
        } else {
          homeGames += set3Home;
          awayGames += set3Guest;
        }
      }
    });

    if (homeMatchPoints + awayMatchPoints === 0) {
      console.log(`⚠️ [computeStandings] Match ${match.id}: Keine Match-Punkte (${skippedResults} results übersprungen)`);
      return;
    }
    
    console.log(`✅ [computeStandings] Match ${match.id}: ${homeMatchPoints}:${awayMatchPoints} (${matchResultsForGame.length - skippedResults} results gezählt)`);

    const homeStats = teamStats[homeTeamId];
    const awayStats = teamStats[awayTeamId];

    homeStats.played += 1;
    awayStats.played += 1;

    homeStats.match_points_for += homeMatchPoints;
    homeStats.match_points_against += awayMatchPoints;
    awayStats.match_points_for += awayMatchPoints;
    awayStats.match_points_against += homeMatchPoints;

    homeStats.sets_for += homeSets;
    homeStats.sets_against += awaySets;
    awayStats.sets_for += awaySets;
    awayStats.sets_against += homeSets;

    homeStats.games_for += homeGames;
    homeStats.games_against += awayGames;
    awayStats.games_for += awayGames;
    awayStats.games_against += homeGames;

    if (homeMatchPoints > awayMatchPoints) {
      homeStats.won += 1;
      homeStats.tab_points += 2;
      awayStats.lost += 1;
    } else if (awayMatchPoints > homeMatchPoints) {
      awayStats.won += 1;
      awayStats.tab_points += 2;
      homeStats.lost += 1;
    } else {
      homeStats.draw += 1;
      awayStats.draw += 1;
      homeStats.tab_points += 1;
      awayStats.tab_points += 1;
    }
  });

  const standings = Object.values(teamStats)
    .sort((a, b) => {
      if (b.tab_points !== a.tab_points) return b.tab_points - a.tab_points;

      const aMatchDiff = a.match_points_for - a.match_points_against;
      const bMatchDiff = b.match_points_for - b.match_points_against;
      if (bMatchDiff !== aMatchDiff) return bMatchDiff - aMatchDiff;

      const aSetDiff = a.sets_for - a.sets_against;
      const bSetDiff = b.sets_for - b.sets_against;
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;

      const aGameDiff = a.games_for - a.games_against;
      const bGameDiff = b.games_for - b.games_against;
      return bGameDiff - aGameDiff;
    })
    .map((team, index) => ({
      position: index + 1,
      team_id: team.teamId,
      team: team.teamLabel,
      team_name: team.teamLabel,
      club_name: team.team?.club_name || null,
      matches: team.played,
      won: team.won,
      draw: team.draw,
      lost: team.lost,
      points: team.tab_points,
      tab_points: team.tab_points,
      match_points: `${team.match_points_for}:${team.match_points_against}`,
      match_points_for: team.match_points_for,
      match_points_against: team.match_points_against,
      sets: `${team.sets_for}:${team.sets_against}`,
      games: `${team.games_for}:${team.games_against}`,
      sets_for: team.sets_for,
      sets_against: team.sets_against,
      games_for: team.games_for,
      games_against: team.games_against
    }));

  return standings;
};

export default computeStandings;

