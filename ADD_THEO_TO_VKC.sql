-- Add Theo Tester to VKC Köln Herren 40 1
-- =========================================

-- 1. Check Theo's player ID
SELECT 'Theo Player ID' as info, id, name, status, player_type
FROM players_unified
WHERE name = 'Theo Tester';

-- 2. Check if membership already exists
SELECT 'Existing Membership?' as info,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  ti.club_name,
  ti.team_name
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (
  SELECT id FROM players_unified WHERE name = 'Theo Tester'
)
AND tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80';

-- 3. Add membership (if not exists)
-- NOTE: Dies ausführen nur wenn Query 2 leer ist!
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season
)
SELECT 
  pu.id,
  '235fade5-0974-4f5b-a758-536f771a5e80'::uuid,
  'player',
  false,  -- Nicht primary (hat schon VKC Köln Herren 30)
  true,
  'winter_25_26'
FROM players_unified pu
WHERE pu.name = 'Theo Tester'
  AND NOT EXISTS (
    SELECT 1 
    FROM team_memberships tm 
    WHERE tm.player_id = pu.id 
      AND tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'::uuid
  )
RETURNING *;

-- 4. Verify the assignment
SELECT 'Verification' as info,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.role,
  tm.is_primary,
  tm.is_active,
  tm.season,
  ti.club_name,
  ti.team_name,
  ti.category,
  pu.name as player_name
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified pu ON tm.player_id = pu.id
WHERE pu.name = 'Theo Tester'
  AND ti.club_name = 'VKC Köln';


