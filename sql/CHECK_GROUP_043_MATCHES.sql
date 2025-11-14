-- =====================================================
-- CHECK_GROUP_043_MATCHES.sql
-- Description: Prüft alle Matchdays und Ergebnisse für Gr. 043 (1. Bezirksliga, Winter 2025/26)
-- =====================================================

-- Schritt 1: Finde alle Teams in Gr. 043
SELECT 
  '=== TEAMS IN GR. 043 ===' as info,
  ts.team_id,
  ti.club_name,
  ti.team_name,
  CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label
FROM team_seasons ts
INNER JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Bezirksliga'
  AND ts.group_name = 'Gr. 043'
  AND ts.season = 'Winter 2025/26'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

-- Schritt 2: Finde alle Matchdays für diese Teams
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 043'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
)
SELECT 
  '=== ALLE MATCHDAYS IN GR. 043 (BEIDE TEAMS IN LIGA) ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.home_score,
  md.away_score,
  md.status,
  md.created_at,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = md.id) as match_results_count
FROM matchdays md
INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
WHERE md.season = 'Winter 2025/26'
ORDER BY md.match_date, md.match_number;

-- Schritt 2b: Finde Matchdays mit match_results, aber bei denen EINES der Teams NICHT in der Liga ist
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 043'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
),
matchdays_with_results AS (
  SELECT DISTINCT matchday_id
  FROM match_results
  WHERE status = 'completed'
)
SELECT 
  '=== MATCHDAYS MIT ERGEBNISSEN, ABER TEAM NICHT IN LIGA ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.home_score,
  md.away_score,
  md.status,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  CASE WHEN gt_home.team_id IS NULL THEN 'NICHT IN LIGA' ELSE 'IN LIGA' END as home_team_status,
  CASE WHEN gt_away.team_id IS NULL THEN 'NICHT IN LIGA' ELSE 'IN LIGA' END as away_team_status,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = md.id AND status = 'completed') as match_results_count
FROM matchdays md
INNER JOIN matchdays_with_results mwr ON md.id = mwr.matchday_id
LEFT JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
LEFT JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
WHERE md.season = 'Winter 2025/26'
  AND (
    (gt_home.team_id IS NULL AND gt_away.team_id IS NOT NULL) OR
    (gt_home.team_id IS NOT NULL AND gt_away.team_id IS NULL)
  )
ORDER BY md.match_date, md.match_number;

-- Schritt 3: Zeige alle match_results für diese Matchdays
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 043'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
),
group_matchdays AS (
  SELECT md.id as matchday_id
  FROM matchdays md
  INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
  INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
)
SELECT 
  '=== MATCH RESULTS IN GR. 043 ===' as info,
  mr.id,
  mr.matchday_id,
  md.match_date,
  md.match_number,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  mr.match_type,
  mr.match_number as match_result_number,
  mr.home_score,
  mr.away_score,
  COALESCE(p_home1.name, 'Unbekannt') as home_player1_name,
  COALESCE(p_home2.name, '') as home_player2_name,
  COALESCE(p_guest1.name, 'Unbekannt') as guest_player1_name,
  COALESCE(p_guest2.name, '') as guest_player2_name,
  mr.set1_home || ':' || mr.set1_guest as set1,
  mr.set2_home || ':' || mr.set2_guest as set2,
  CASE WHEN mr.set3_home IS NOT NULL OR mr.set3_guest IS NOT NULL 
    THEN COALESCE(mr.set3_home::TEXT, '') || ':' || COALESCE(mr.set3_guest::TEXT, '') 
    ELSE NULL 
  END as set3,
  mr.winner
FROM match_results mr
INNER JOIN group_matchdays gmd ON mr.matchday_id = gmd.matchday_id
INNER JOIN matchdays md ON mr.matchday_id = md.id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
LEFT JOIN players_unified p_home1 ON mr.home_player_id = p_home1.id OR mr.home_player1_id = p_home1.id
LEFT JOIN players_unified p_home2 ON mr.home_player2_id = p_home2.id
LEFT JOIN players_unified p_guest1 ON mr.guest_player_id = p_guest1.id OR mr.guest_player1_id = p_guest1.id
LEFT JOIN players_unified p_guest2 ON mr.guest_player2_id = p_guest2.id
ORDER BY md.match_date, md.match_number, mr.match_number;

-- Schritt 4: Zusammenfassung - Standings-Berechnung
WITH group_teams AS (
  SELECT DISTINCT ts.team_id, ti.club_name, ti.team_name
  FROM team_seasons ts
  INNER JOIN team_info ti ON ts.team_id = ti.id
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 043'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
),
group_matchdays AS (
  SELECT md.id, md.home_team_id, md.away_team_id, md.home_score, md.away_score, md.status
  FROM matchdays md
  INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
  INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
),
team_stats AS (
  SELECT 
    gt.team_id,
    CONCAT(gt.club_name, ' ', COALESCE(gt.team_name, '')) as team_label,
    COUNT(DISTINCT CASE WHEN md.home_team_id = gt.team_id OR md.away_team_id = gt.team_id THEN md.id END) as matches_played,
    COUNT(DISTINCT CASE 
      WHEN (md.home_team_id = gt.team_id AND md.home_score > md.away_score) 
        OR (md.away_team_id = gt.team_id AND md.away_score > md.home_score) 
      THEN md.id 
    END) as matches_won,
    COUNT(DISTINCT CASE 
      WHEN md.home_team_id = gt.team_id AND md.home_score = md.away_score 
        OR md.away_team_id = gt.team_id AND md.away_score = md.home_score 
      THEN md.id 
    END) as matches_draw,
    COUNT(DISTINCT CASE 
      WHEN (md.home_team_id = gt.team_id AND md.home_score < md.away_score) 
        OR (md.away_team_id = gt.team_id AND md.away_score < md.home_score) 
      THEN md.id 
    END) as matches_lost,
    COALESCE(SUM(CASE WHEN md.home_team_id = gt.team_id THEN md.home_score ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN md.away_team_id = gt.team_id THEN md.away_score ELSE 0 END), 0) as match_points_for,
    COALESCE(SUM(CASE WHEN md.home_team_id = gt.team_id THEN md.away_score ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN md.away_team_id = gt.team_id THEN md.home_score ELSE 0 END), 0) as match_points_against
  FROM group_teams gt
  LEFT JOIN group_matchdays md ON md.home_team_id = gt.team_id OR md.away_team_id = gt.team_id
  GROUP BY gt.team_id, gt.club_name, gt.team_name
)
SELECT 
  '=== STANDINGS ZUSAMMENFASSUNG ===' as info,
  team_label,
  matches_played as "Sp",
  matches_won as "S",
  matches_draw as "U",
  matches_lost as "N",
  (matches_won * 2 + matches_draw) as "Tab.Pkt",
  CONCAT(match_points_for, ':', match_points_against) as "Matches"
FROM team_stats
ORDER BY (matches_won * 2 + matches_draw) DESC, (match_points_for - match_points_against) DESC;

