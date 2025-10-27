-- Verify Theo Tester's Team Assignments
-- =======================================

-- 1. Check if Theo Tester exists in players_unified
SELECT 'Theo Player Check' as info, id, name, status, player_type, email
FROM players_unified
WHERE name ILIKE '%Theo%' OR name ILIKE '%Tester%';

-- 2. Check ALL of Theo's team memberships (if exists)
SELECT 'Theo All Memberships' as info,
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
WHERE pu.name ILIKE '%Theo%' OR pu.name ILIKE '%Tester%'
ORDER BY tm.is_primary DESC, ti.club_name, ti.category;

-- 3. Check VKC Köln teams specifically
SELECT 'VKC Teams Check' as info, id, club_name, team_name, category
FROM team_info
WHERE club_name = 'VKC Köln'
ORDER BY team_name, category;


