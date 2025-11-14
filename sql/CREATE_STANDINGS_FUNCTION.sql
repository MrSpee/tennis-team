-- =====================================================
-- CREATE_STANDINGS_FUNCTION.sql
-- Description: Erstellt eine generische SQL-Funktion zur Berechnung der Standings
--              für jede Gruppe basierend auf match_results (wie computeStandings.js)
-- =====================================================

-- Schritt 1: Erstelle Funktion zur Berechnung der Standings
CREATE OR REPLACE FUNCTION compute_standings(
  p_league TEXT,
  p_group_name TEXT,
  p_season TEXT
)
RETURNS TABLE (
  position INTEGER,
  team_id UUID,
  team_label TEXT,
  matches_played INTEGER,
  matches_won INTEGER,
  matches_draw INTEGER,
  matches_lost INTEGER,
  tab_points INTEGER,
  match_points_for INTEGER,
  match_points_against INTEGER,
  sets_for INTEGER,
  sets_against INTEGER,
  games_for INTEGER,
  games_against INTEGER,
  match_points TEXT,
  sets TEXT,
  games TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH group_teams AS (
    -- Finde alle Teams in der Gruppe
    SELECT DISTINCT 
      ts.team_id,
      ti.club_name,
      ti.team_name,
      CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label
    FROM team_seasons ts
    INNER JOIN team_info ti ON ts.team_id = ti.id
    WHERE ts.league = p_league
      AND ts.group_name = p_group_name
      AND ts.season = p_season
      AND ts.is_active = true
  ),
  group_matchdays AS (
    -- Finde alle Matchdays für diese Teams
    SELECT md.id, md.home_team_id, md.away_team_id
    FROM matchdays md
    INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
    INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
  ),
  match_results_with_stats AS (
    -- Berechne Statistiken für jedes Match basierend auf match_results
    SELECT 
      md.id as matchday_id,
      md.home_team_id,
      md.away_team_id,
      -- Match-Punkte (gewonnene Einzel/Doppel)
      COUNT(CASE WHEN mr.winner = 'home' AND mr.status = 'completed' THEN 1 END)::INTEGER as home_match_points,
      COUNT(CASE WHEN mr.winner IN ('guest', 'away') AND mr.status = 'completed' THEN 1 END)::INTEGER as away_match_points,
      -- Sätze
      SUM(
        CASE WHEN mr.set1_home > mr.set1_guest THEN 1 ELSE 0 END +
        CASE WHEN mr.set2_home > mr.set2_guest THEN 1 ELSE 0 END +
        CASE WHEN mr.set3_home IS NOT NULL AND mr.set3_guest IS NOT NULL AND mr.set3_home > mr.set3_guest THEN 1 ELSE 0 END
      )::INTEGER as home_sets,
      SUM(
        CASE WHEN mr.set1_guest > mr.set1_home THEN 1 ELSE 0 END +
        CASE WHEN mr.set2_guest > mr.set2_home THEN 1 ELSE 0 END +
        CASE WHEN mr.set3_home IS NOT NULL AND mr.set3_guest IS NOT NULL AND mr.set3_guest > mr.set3_home THEN 1 ELSE 0 END
      )::INTEGER as away_sets,
      -- Games
      SUM(
        COALESCE(mr.set1_home, 0) + 
        COALESCE(mr.set2_home, 0) + 
        CASE 
          WHEN mr.set3_home IS NOT NULL AND mr.set3_guest IS NOT NULL AND (mr.set3_home >= 10 OR mr.set3_guest >= 10) 
          THEN CASE WHEN mr.set3_home > mr.set3_guest THEN 1 ELSE 0 END
          ELSE COALESCE(mr.set3_home, 0)
        END
      )::INTEGER as home_games,
      SUM(
        COALESCE(mr.set1_guest, 0) + 
        COALESCE(mr.set2_guest, 0) + 
        CASE 
          WHEN mr.set3_home IS NOT NULL AND mr.set3_guest IS NOT NULL AND (mr.set3_home >= 10 OR mr.set3_guest >= 10) 
          THEN CASE WHEN mr.set3_guest > mr.set3_home THEN 1 ELSE 0 END
          ELSE COALESCE(mr.set3_guest, 0)
        END
      )::INTEGER as away_games
    FROM group_matchdays md
    INNER JOIN match_results mr ON md.id = mr.matchday_id
    WHERE mr.status = 'completed'
    GROUP BY md.id, md.home_team_id, md.away_team_id
    HAVING COUNT(CASE WHEN mr.status = 'completed' AND mr.winner IS NOT NULL THEN 1 END) > 0
  ),
  team_stats AS (
    -- Aggregiere Statistiken pro Team
    SELECT 
      gt.team_id,
      gt.team_label,
      COUNT(DISTINCT mrs.matchday_id)::INTEGER as matches_played,
      COUNT(DISTINCT CASE 
        WHEN mrs.home_team_id = gt.team_id AND mrs.home_match_points > mrs.away_match_points THEN mrs.matchday_id
        WHEN mrs.away_team_id = gt.team_id AND mrs.away_match_points > mrs.home_match_points THEN mrs.matchday_id
      END)::INTEGER as matches_won,
      COUNT(DISTINCT CASE 
        WHEN mrs.home_team_id = gt.team_id AND mrs.home_match_points = mrs.away_match_points THEN mrs.matchday_id
        WHEN mrs.away_team_id = gt.team_id AND mrs.home_match_points = mrs.away_match_points THEN mrs.matchday_id
      END)::INTEGER as matches_draw,
      COUNT(DISTINCT CASE 
        WHEN mrs.home_team_id = gt.team_id AND mrs.home_match_points < mrs.away_match_points THEN mrs.matchday_id
        WHEN mrs.away_team_id = gt.team_id AND mrs.away_match_points < mrs.home_match_points THEN mrs.matchday_id
      END)::INTEGER as matches_lost,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.home_match_points ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.away_match_points ELSE 0 END), 0)::INTEGER as match_points_for,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.away_match_points ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.home_match_points ELSE 0 END), 0)::INTEGER as match_points_against,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.home_sets ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.away_sets ELSE 0 END), 0)::INTEGER as sets_for,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.away_sets ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.home_sets ELSE 0 END), 0)::INTEGER as sets_against,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.home_games ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.away_games ELSE 0 END), 0)::INTEGER as games_for,
      COALESCE(SUM(CASE WHEN mrs.home_team_id = gt.team_id THEN mrs.away_games ELSE 0 END), 0)::INTEGER +
      COALESCE(SUM(CASE WHEN mrs.away_team_id = gt.team_id THEN mrs.home_games ELSE 0 END), 0)::INTEGER as games_against
    FROM group_teams gt
    LEFT JOIN match_results_with_stats mrs ON mrs.home_team_id = gt.team_id OR mrs.away_team_id = gt.team_id
    GROUP BY gt.team_id, gt.team_label
  ),
  standings_with_points AS (
    SELECT 
      team_id,
      team_label,
      matches_played,
      matches_won,
      matches_draw,
      matches_lost,
      (matches_won * 2 + matches_draw)::INTEGER as tab_points,
      match_points_for,
      match_points_against,
      sets_for,
      sets_against,
      games_for,
      games_against
    FROM team_stats
  )
  SELECT 
    ROW_NUMBER() OVER (
      ORDER BY 
        tab_points DESC,
        (match_points_for - match_points_against) DESC,
        (sets_for - sets_against) DESC,
        (games_for - games_against) DESC
    )::INTEGER as position,
    team_id,
    team_label,
    matches_played,
    matches_won,
    matches_draw,
    matches_lost,
    tab_points,
    match_points_for,
    match_points_against,
    sets_for,
    sets_against,
    games_for,
    games_against,
    CONCAT(match_points_for, ':', match_points_against) as match_points,
    CONCAT(sets_for, ':', sets_against) as sets,
    CONCAT(games_for, ':', games_against) as games
  FROM standings_with_points
  ORDER BY position;
END;
$$ LANGUAGE plpgsql;

-- Schritt 2: Teste die Funktion für Gr. 043
SELECT 
  '=== TEST: STANDINGS FÜR GR. 043 ===' as info,
  position,
  team_label,
  matches_played as "Sp",
  matches_won as "S",
  matches_draw as "U",
  matches_lost as "N",
  tab_points as "Tab.Pkt",
  match_points as "Matches",
  sets as "Sätze",
  games as "Games"
FROM compute_standings('1. Bezirksliga', 'Gr. 043', 'Winter 2025/26')
ORDER BY position;

-- Schritt 3: Zeige alle verfügbaren Gruppen
SELECT 
  '=== VERFÜGBARE GRUPPEN ===' as info,
  league,
  group_name,
  season,
  COUNT(DISTINCT team_id) as team_count
FROM team_seasons
WHERE is_active = true
GROUP BY league, group_name, season
ORDER BY season, league, group_name;

