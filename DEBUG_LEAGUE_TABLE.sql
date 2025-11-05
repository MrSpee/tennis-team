-- ==========================================
-- DEBUG: Warum werden match_results nicht gefunden?
-- ==========================================

-- 1. Prüfe League Teams
SELECT 
  'STEP 1: League Teams' as step,
  ti.id as team_id,
  ti.club_name,
  ti.team_name
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Kreisliga'
  AND ts.group_name = 'Gr. 046'
  AND ts.is_active = true;

-- 2. Prüfe Matchdays zwischen diesen Teams
SELECT 
  'STEP 2: Matchdays' as step,
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.match_date,
  m.status,
  m.home_score,
  m.away_score,
  home_team.club_name as home_club,
  away_team.club_name as away_club
FROM matchdays m
JOIN team_info home_team ON m.home_team_id = home_team.id
JOIN team_info away_team ON m.away_team_id = away_team.id
WHERE (
  home_team.club_name ILIKE '%sürth%' OR
  home_team.club_name ILIKE '%ford%' OR
  home_team.club_name ILIKE '%colonius%' OR
  home_team.club_name ILIKE '%ensen%' OR
  home_team.club_name ILIKE '%leverkusen%'
)
AND (
  away_team.club_name ILIKE '%sürth%' OR
  away_team.club_name ILIKE '%ford%' OR
  away_team.club_name ILIKE '%colonius%' OR
  away_team.club_name ILIKE '%ensen%' OR
  away_team.club_name ILIKE '%leverkusen%'
)
ORDER BY m.match_date DESC;

-- 3. Prüfe match_results für diese Matchdays
SELECT 
  'STEP 3: Match Results' as step,
  mr.matchday_id,
  mr.match_number,
  mr.winner,
  mr.set1_home,
  mr.set1_guest,
  mr.set2_home,
  mr.set2_guest,
  mr.set3_home,
  mr.set3_guest,
  mr.status
FROM match_results mr
WHERE mr.matchday_id IN (
  SELECT m.id
  FROM matchdays m
  JOIN team_info home_team ON m.home_team_id = home_team.id
  JOIN team_info away_team ON m.away_team_id = away_team.id
  WHERE (home_team.club_name ILIKE '%sürth%' OR away_team.club_name ILIKE '%sürth%')
    AND (home_team.club_name ILIKE '%leverkusen%' OR away_team.club_name ILIKE '%leverkusen%')
)
ORDER BY mr.match_number;

-- 4. ZÄHLE match_results pro Matchday
SELECT 
  'STEP 4: Results Count' as step,
  m.id as matchday_id,
  home_team.club_name as home,
  away_team.club_name as away,
  COUNT(mr.id) as result_count,
  COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as home_wins,
  COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as guest_wins
FROM matchdays m
JOIN team_info home_team ON m.home_team_id = home_team.id
JOIN team_info away_team ON m.away_team_id = away_team.id
LEFT JOIN match_results mr ON mr.matchday_id = m.id
WHERE (home_team.club_name ILIKE '%sürth%' OR away_team.club_name ILIKE '%sürth%')
  AND (home_team.club_name ILIKE '%leverkusen%' OR away_team.club_name ILIKE '%leverkusen%')
GROUP BY m.id, home_team.club_name, away_team.club_name;

