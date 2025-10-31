-- Debug: Warum werden Matchdays nicht angezeigt?

-- 1. Welche Teams hat Chris Spee?
SELECT 
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.role,
  ti.club_name,
  ti.team_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee' -- Chris Spee
  AND tm.is_active = true
ORDER BY tm.is_primary DESC, ti.club_name, ti.team_name;

-- 2. Welche Matchdays gibt es?
SELECT 
  id,
  home_team_id,
  away_team_id,
  match_date,
  home_team:home_team_id(club_name, team_name),
  away_team:away_team_id(club_name, team_name),
  season,
  status
FROM matchdays
ORDER BY match_date DESC
LIMIT 20;

-- 3. Prüfe ob die Matchdays zu den Teams von Chris passen
WITH player_teams AS (
  SELECT team_id 
  FROM team_memberships 
  WHERE player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee' 
    AND is_active = true
)
SELECT 
  m.id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  CASE 
    WHEN m.home_team_id IN (SELECT team_id FROM player_teams) THEN '✓ Home-Team matcht'
    WHEN m.away_team_id IN (SELECT team_id FROM player_teams) THEN '✓ Away-Team matcht'
    ELSE '✗ Kein Match'
  END as match_status
FROM matchdays m
ORDER BY m.match_date DESC;


