-- Check Theo's Matches for Herren 30
-- ===================================

-- 1. Alle Matches für Theo's Team (VKC Köln Herren 30)
SELECT 'Matches for Theo Team' as info, m.*
FROM matches m
WHERE m.team_id = '6c38c710-28dd-41fe-b991-b7180ef23ca1'
ORDER BY m.match_date DESC;

-- 2. Gibt es überhaupt Matches für dieses Team?
SELECT 'Matches Count' as info, COUNT(*) as total_matches
FROM matches m
WHERE m.team_id = '6c38c710-28dd-41fe-b991-b7180ef23ca1';

-- 3. Alle Matches die irgendwie mit VKC Köln zu tun haben
SELECT 'All VKC Matches' as info, m.*, ti.club_name, ti.category
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'VKC Köln'
ORDER BY m.match_date DESC
LIMIT 10;
