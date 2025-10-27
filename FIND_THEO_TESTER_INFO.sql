-- Finde Theo Tester Info
-- ======================

-- 1. Theo Tester finden
SELECT 'Theo Player Info' as info, id, name, email, primary_team_id, status
FROM players_unified
WHERE name ILIKE '%Theo%Tester%' OR email = 'jorzig@gmail.com';

-- 2. Theo's Team Memberships
SELECT 'Theo Teams' as info, 
  tm.id as membership_id,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  tm.season,
  tm.role,
  ti.*
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'jorzig@gmail.com' LIMIT 1);

-- 3. Matches für alle Theo's Teams (ohne spezifische Spalten zu benennen)
SELECT 'Theo Matches' as info, m.*
FROM matches m
WHERE m.team_id IN (
  SELECT tm.team_id 
  FROM team_memberships tm 
  WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'jorzig@gmail.com' LIMIT 1)
);

