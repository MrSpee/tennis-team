-- Add is_super_admin column to players_unified
-- =============================================

-- 1. Add column
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 2. Set Chris Spee as Super-Admin (existing user)
UPDATE players_unified
SET is_super_admin = true
WHERE email = 'mail@christianspee.de'
RETURNING id, name, email, is_super_admin;

-- 3. Set Theo Tester II as Super-Admin
UPDATE players_unified
SET is_super_admin = true
WHERE id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
RETURNING id, name, email, is_super_admin;

-- 4. Check if Theo is already in VKC Herren 40
SELECT 'Theo Existing Membership' as info,
  tm.id,
  tm.player_id,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'::uuid
  AND ti.id = '235fade5-0974-4f5b-a758-536f771a5e80'::uuid;

-- 5. Add Theo to VKC Köln Herren 40 1 (if not exists)
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season
)
SELECT 
  'faaf92cf-e050-421f-8d2b-5880d5f11a62'::uuid,
  '235fade5-0974-4f5b-a758-536f771a5e80'::uuid,
  'player',
  false,
  true,
  'winter_25_26'
WHERE NOT EXISTS (
  SELECT 1 
  FROM team_memberships 
  WHERE player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'::uuid
    AND team_id = '235fade5-0974-4f5b-a758-536f771a5e80'::uuid
)
RETURNING *;

-- 6. Verify all
SELECT 'Verification' as info,
  pu.id,
  pu.name,
  pu.email,
  pu.is_super_admin,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified pu
LEFT JOIN team_memberships tm ON tm.player_id = pu.id AND tm.is_active = true
LEFT JOIN team_info ti ON ti.id = tm.team_id
WHERE pu.email = 'jorzig@gmail.com' OR pu.email = 'mail@christianspee.de'
ORDER BY pu.is_super_admin DESC, pu.name;

