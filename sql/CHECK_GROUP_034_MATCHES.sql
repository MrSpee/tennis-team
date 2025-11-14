-- =====================================================
-- CHECK_GROUP_034_MATCHES.sql
-- Description: Prüft alle Matchdays und Ergebnisse für Gr. 034 (1. Bezirksliga, Winter 2025/26)
-- =====================================================

-- Schritt 1: Finde alle Teams in Gr. 034
SELECT 
  '=== TEAMS IN GR. 034 ===' as info,
  ts.team_id,
  ti.club_name,
  ti.team_name,
  CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label
FROM team_seasons ts
INNER JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Bezirksliga'
  AND ts.group_name = 'Gr. 034'
  AND ts.season = 'Winter 2025/26'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

-- Schritt 2: Finde alle Matchdays für diese Teams
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 034'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
)
SELECT 
  '=== ALLE MATCHDAYS IN GR. 034 (BEIDE TEAMS IN LIGA) ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.home_score,
  md.away_score,
  md.status,
  md.created_at,
  md.notes,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = md.id) as match_results_count,
  CASE 
    WHEN md.notes LIKE '%meeting#%' THEN 'HAT meetingId'
    ELSE 'KEIN meetingId'
  END as meeting_id_status
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
    AND ts.group_name = 'Gr. 034'
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
    AND ts.group_name = 'Gr. 034'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
)
SELECT 
  '=== MATCH RESULTS FÜR GR. 034 ===' as info,
  mr.id,
  mr.matchday_id,
  mr.match_number,
  mr.match_type,
  mr.status,
  mr.winner,
  mr.home_score,
  mr.away_score,
  md.match_date,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  pu_home.name as home_player_name,
  pu_guest.name as guest_player_name,
  pu_home1.name as home_player1_name,
  pu_home2.name as home_player2_name,
  pu_guest1.name as guest_player1_name,
  pu_guest2.name as guest_player2_name
FROM match_results mr
INNER JOIN matchdays md ON mr.matchday_id = md.id
INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
LEFT JOIN players_unified pu_home ON mr.home_player_id = pu_home.id
LEFT JOIN players_unified pu_guest ON mr.guest_player_id = pu_guest.id
LEFT JOIN players_unified pu_home1 ON mr.home_player1_id = pu_home1.id
LEFT JOIN players_unified pu_home2 ON mr.home_player2_id = pu_home2.id
LEFT JOIN players_unified pu_guest1 ON mr.guest_player1_id = pu_guest1.id
LEFT JOIN players_unified pu_guest2 ON mr.guest_player2_id = pu_guest2.id
WHERE md.season = 'Winter 2025/26'
ORDER BY md.match_date, mr.match_number;

-- Schritt 4: Matchdays OHNE match_results (aber mit completed status)
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 034'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
)
SELECT 
  '=== MATCHDAYS OHNE match_results (aber completed) ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.status,
  md.home_score,
  md.away_score,
  md.notes,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  CASE 
    WHEN md.notes LIKE '%meeting#%' THEN 'HAT meetingId'
    ELSE 'KEIN meetingId'
  END as meeting_id_status
FROM matchdays md
INNER JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
INNER JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
WHERE md.season = 'Winter 2025/26'
  AND md.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM match_results mr WHERE mr.matchday_id = md.id
  )
ORDER BY md.match_date, md.match_number;

-- Schritt 5: Zusammenfassung
WITH group_teams AS (
  SELECT DISTINCT ts.team_id
  FROM team_seasons ts
  WHERE ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 034'
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
)
SELECT 
  '=== ZUSAMMENFASSUNG GR. 034 ===' as info,
  COUNT(DISTINCT ts.team_id) as teams_count,
  COUNT(DISTINCT md.id) FILTER (WHERE gt_home.team_id IS NOT NULL AND gt_away.team_id IS NOT NULL) as matchdays_count,
  COUNT(DISTINCT mr.id) FILTER (WHERE gt_home.team_id IS NOT NULL AND gt_away.team_id IS NOT NULL) as match_results_count,
  COUNT(DISTINCT md.id) FILTER (WHERE gt_home.team_id IS NOT NULL AND gt_away.team_id IS NOT NULL AND md.status = 'completed') as completed_matchdays_count,
  COUNT(DISTINCT md.id) FILTER (
    WHERE gt_home.team_id IS NOT NULL 
    AND gt_away.team_id IS NOT NULL 
    AND md.status = 'completed'
    AND NOT EXISTS (SELECT 1 FROM match_results mr WHERE mr.matchday_id = md.id)
  ) as completed_matchdays_without_results
FROM team_seasons ts
LEFT JOIN matchdays md ON (md.home_team_id = ts.team_id OR md.away_team_id = ts.team_id) AND md.season = 'Winter 2025/26'
LEFT JOIN group_teams gt_home ON md.home_team_id = gt_home.team_id
LEFT JOIN group_teams gt_away ON md.away_team_id = gt_away.team_id
LEFT JOIN match_results mr ON mr.matchday_id = md.id
WHERE ts.league = '1. Bezirksliga'
  AND ts.group_name = 'Gr. 034'
  AND ts.season = 'Winter 2025/26'
  AND ts.is_active = true;

