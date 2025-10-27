-- Check VKC Köln Team and Theo Tester
-- ====================================

-- 1. Prüfe ob VKC Köln Team existiert
SELECT 'VKC Teams Check' as info, id, club_name, team_name, category
FROM team_info
WHERE club_name = 'VKC Köln'
  AND category = 'Herren 40'
ORDER BY team_name;

-- 2. Check Theo Tester's current teams
SELECT 'Theo Current Teams' as info, 
  tm.id as membership_id,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  tm.season,
  ti.club_name,
  ti.team_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (
  SELECT id FROM players_unified WHERE name = 'Theo Tester'
);

-- 3. Check if Theo exists and get his ID
SELECT 'Theo Player Check' as info, id, name, status, player_type
FROM players_unified
WHERE name = 'Theo Tester';


