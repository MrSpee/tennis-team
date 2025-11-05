-- ============================================
-- FIX VKC KÖLN HERREN 55 DUPLIKAT
-- ============================================
-- Problem: Zwei Teams wegen Leerzeichen in team_name
-- " 1" vs "1"
-- ============================================

-- 1️⃣ Zeige die beiden Teams
SELECT 
  '🔍 DUPLIKAT TEAMS' as info,
  id,
  club_name,
  team_name,
  length(team_name) as name_length,
  category,
  created_at
FROM team_info
WHERE club_name = 'VKC Köln'
  AND category = 'Herren 55'
ORDER BY created_at;

-- 2️⃣ Verschiebe alle Matches vom NEUEN Team zum ALTEN Team
UPDATE matchdays
SET home_team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
WHERE home_team_id = '92115e89-e71a-4ba0-9b1f-c14df16aaaf8';

UPDATE matchdays
SET away_team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
WHERE away_team_id = '92115e89-e71a-4ba0-9b1f-c14df16aaaf8';

-- 3️⃣ Verschiebe team_seasons
UPDATE team_seasons
SET team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
WHERE team_id = '92115e89-e71a-4ba0-9b1f-c14df16aaaf8';

-- 4️⃣ Lösche das NEUE (duplizierte) Team
DELETE FROM team_info
WHERE id = '92115e89-e71a-4ba0-9b1f-c14df16aaaf8';

-- 5️⃣ Fixe das Leerzeichen im ALT Team
UPDATE team_info
SET team_name = '1'
WHERE id = '3427d451-2665-43c5-ac70-f975934b7dac'
  AND team_name = ' 1';

-- 6️⃣ Verifiziere
SELECT 
  '✅ NACH FIX' as info,
  id,
  club_name,
  team_name,
  category,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = team_info.id OR away_team_id = team_info.id) as match_count
FROM team_info
WHERE club_name = 'VKC Köln'
  AND category = 'Herren 55';


