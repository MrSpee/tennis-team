-- ==========================================
-- BERECHNE LIGA-TABELLE AUS MATCH_RESULTS
-- Winter 2025/26 - 1. Kreisliga Gr. 046
-- ==========================================

WITH league_teams AS (
  -- 1. Hole alle Teams in der Liga
  SELECT 
    ti.id as team_id,
    ti.club_name,
    ti.team_name,
    CONCAT(ti.club_name, ' ', ti.team_name) as full_name
  FROM team_seasons ts
  JOIN team_info ti ON ts.team_id = ti.id
  WHERE ts.league = '1. Kreisliga'
    AND ts.group_name = 'Gr. 046'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
),
league_matches AS (
  -- 2. Hole alle Matches zwischen diesen Teams
  SELECT 
    m.id as matchday_id,
    m.home_team_id,
    m.away_team_id,
    m.home_score,
    m.away_score
  FROM matchdays m
  WHERE m.home_team_id IN (SELECT team_id FROM league_teams)
    AND m.away_team_id IN (SELECT team_id FROM league_teams)
    AND m.status = 'completed'
),
match_details AS (
  -- 3. Berechne Details für jedes Match aus match_results
  SELECT 
    lm.matchday_id,
    lm.home_team_id,
    lm.away_team_id,
    
    -- Matchpunkte (Anzahl gewonnener Einzelspiele)
    COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as home_match_points,
    COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as away_match_points,
    
    -- Sätze zählen
    SUM(CASE 
      WHEN mr.set1_home > mr.set1_guest THEN 1 
      ELSE 0 
    END) +
    SUM(CASE 
      WHEN mr.set2_home > mr.set2_guest THEN 1 
      ELSE 0 
    END) +
    SUM(CASE 
      WHEN mr.set3_home > 0 AND mr.set3_home > mr.set3_guest THEN 1 
      ELSE 0 
    END) as home_sets,
    
    SUM(CASE 
      WHEN mr.set1_guest > mr.set1_home THEN 1 
      ELSE 0 
    END) +
    SUM(CASE 
      WHEN mr.set2_guest > mr.set2_home THEN 1 
      ELSE 0 
    END) +
    SUM(CASE 
      WHEN mr.set3_guest > 0 AND mr.set3_guest > mr.set3_home THEN 1 
      ELSE 0 
    END) as away_sets,
    
    -- Games zählen (alle Sätze summieren)
    SUM(COALESCE(mr.set1_home, 0) + COALESCE(mr.set2_home, 0) + COALESCE(mr.set3_home, 0)) as home_games,
    SUM(COALESCE(mr.set1_guest, 0) + COALESCE(mr.set2_guest, 0) + COALESCE(mr.set3_guest, 0)) as away_games
    
  FROM league_matches lm
  LEFT JOIN match_results mr ON mr.matchday_id = lm.matchday_id
  WHERE mr.status = 'completed'
  GROUP BY lm.matchday_id, lm.home_team_id, lm.away_team_id
),
team_stats AS (
  -- 4. Berechne Statistiken für jedes Team
  SELECT 
    lt.team_id,
    lt.full_name,
    
    -- Begegnungen
    COUNT(DISTINCT md.matchday_id) as played,
    
    -- Siege/Unentschieden/Niederlagen
    COUNT(CASE 
      WHEN (md.home_team_id = lt.team_id AND md.home_match_points > md.away_match_points) OR
           (md.away_team_id = lt.team_id AND md.away_match_points > md.home_match_points)
      THEN 1 
    END) as won,
    
    COUNT(CASE 
      WHEN md.home_match_points = md.away_match_points
      THEN 1 
    END) as draw,
    
    COUNT(CASE 
      WHEN (md.home_team_id = lt.team_id AND md.home_match_points < md.away_match_points) OR
           (md.away_team_id = lt.team_id AND md.away_match_points < md.home_match_points)
      THEN 1 
    END) as lost,
    
    -- Tabellenpunkte (2 für Sieg, 1 für Unentschieden)
    SUM(CASE 
      WHEN (md.home_team_id = lt.team_id AND md.home_match_points > md.away_match_points) OR
           (md.away_team_id = lt.team_id AND md.away_match_points > md.home_match_points)
      THEN 2
      WHEN md.home_match_points = md.away_match_points
      THEN 1
      ELSE 0
    END) as tab_points,
    
    -- Matchpunkte (gewonnene Einzelspiele)
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.home_match_points 
      ELSE md.away_match_points 
    END) as match_points_for,
    
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.away_match_points 
      ELSE md.home_match_points 
    END) as match_points_against,
    
    -- Sätze
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.home_sets 
      ELSE md.away_sets 
    END) as sets_for,
    
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.away_sets 
      ELSE md.home_sets 
    END) as sets_against,
    
    -- Games
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.home_games 
      ELSE md.away_games 
    END) as games_for,
    
    SUM(CASE 
      WHEN md.home_team_id = lt.team_id THEN md.away_games 
      ELSE md.home_games 
    END) as games_against
    
  FROM league_teams lt
  LEFT JOIN match_details md ON (md.home_team_id = lt.team_id OR md.away_team_id = lt.team_id)
  GROUP BY lt.team_id, lt.full_name
)
-- 5. Finale Tabelle mit Sortierung
SELECT 
  ROW_NUMBER() OVER (
    ORDER BY 
      tab_points DESC,
      (match_points_for - match_points_against) DESC,
      (sets_for - sets_against) DESC,
      (games_for - games_against) DESC
  ) as position,
  full_name as mannschaft,
  played as begegnungen,
  won as siege,
  draw as unentschieden,
  lost as niederlagen,
  tab_points as tabellenpunkte,
  CONCAT(match_points_for, ':', match_points_against) as matchpunkte,
  CONCAT(sets_for, ':', sets_against) as sätze,
  CONCAT(games_for, ':', games_against) as spiele
FROM team_stats
ORDER BY position;

