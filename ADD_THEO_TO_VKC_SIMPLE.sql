-- Simple Add Theo to VKC Köln Herren 40 1
-- =========================================

-- Step 1: Find Theo's player ID
SELECT 'Step 1 - Theo ID' as step, id, name, email, status
FROM players_unified
WHERE name = 'Theo Tester'
LIMIT 1;

-- Step 2: Insert membership (execute after checking Step 1 result)
-- UNCOMMENT THIS TO EXECUTE:
/*
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season
)
VALUES (
  (SELECT id FROM players_unified WHERE name = 'Theo Tester'),
  '235fade5-0974-4f5b-a758-536f771a5e80'::uuid,
  'player',
  false,
  true,
  'winter_25_26'
)
ON CONFLICT (player_id, team_id) DO NOTHING
RETURNING *;
*/

-- Step 3: Verify (execute after Step 2)
SELECT 'Step 3 - Verification' as step,
  pu.name,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.role,
  tm.is_primary,
  tm.is_active
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified pu ON tm.player_id = pu.id
WHERE pu.name = 'Theo Tester'
  AND ti.club_name = 'VKC Köln'
ORDER BY tm.is_primary DESC;

