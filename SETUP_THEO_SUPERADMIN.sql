-- Setup Theo Tester II as Super-Admin and add to VKC
-- ===================================================

-- 1. Set Theo as Super-Admin
UPDATE players_unified
SET 
  is_super_admin = true,
  updated_at = NOW()
WHERE id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
RETURNING id, name, email, is_super_admin;

-- 2. Add Theo to VKC Köln Herren 40 1 team
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season
)
VALUES (
  'faaf92cf-e050-421f-8d2b-5880d5f11a62'::uuid,
  '235fade5-0974-4f5b-a758-536f771a5e80'::uuid,
  'player',
  false,
  true,
  'winter_25_26'
)
ON CONFLICT (player_id, team_id) 
DO UPDATE SET 
  is_active = true,
  role = EXCLUDED.role
RETURNING *;

-- 3. Verify Super-Admin status
SELECT 'Super-Admin Check' as info, id, name, email, is_super_admin, status
FROM players_unified
WHERE id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62';

-- 4. Verify Team Membership
SELECT 'Team Membership Check' as info,
  pu.name,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.role,
  tm.is_primary,
  tm.is_active,
  tm.season
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified pu ON tm.player_id = pu.id
WHERE pu.id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND ti.club_name = 'VKC Köln'
ORDER BY tm.is_primary DESC;

