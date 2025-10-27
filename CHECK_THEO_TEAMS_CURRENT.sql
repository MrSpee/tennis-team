-- CHECK_THEO_TEAMS_CURRENT.sql
-- Prüft aktuell welche Teams Theo zugeordnet sind

-- 1. Theo's Team-Mitgliedschaften
SELECT 
  'Theo Memberships' as info,
  tm.id as membership_id,
  tm.team_id,
  tm.is_primary,
  tm.role,
  tm.is_active,
  tm.season as membership_season,
  ti.team_name,
  ti.club_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND tm.is_active = true
ORDER BY tm.is_primary DESC, ti.team_name;

-- 2. Die zugehörigen team_seasons für Theo's Teams
SELECT 
  'Theo team_seasons' as info,
  tm.team_id,
  ti.team_name,
  ti.category,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
LEFT JOIN team_seasons ts ON tm.team_id = ts.team_id AND ts.is_active = true
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND tm.is_active = true
ORDER BY tm.is_primary DESC;

