-- Find all players with "Theo" in name
-- =====================================

-- Search for any player with "Theo" in name
SELECT 'Players with Theo' as info, id, name, email, status, player_type, current_lk
FROM players_unified
WHERE name ILIKE '%Theo%'
ORDER BY name;

-- Search for any player with "Tester" in name
SELECT 'Players with Tester' as info, id, name, email, status, player_type, current_lk
FROM players_unified
WHERE name ILIKE '%Tester%'
ORDER BY name;

-- Show first 10 players alphabetically to see naming pattern
SELECT 'First 10 Players' as info, id, name, email, status
FROM players_unified
ORDER BY name
LIMIT 10;

