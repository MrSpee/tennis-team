-- FIX_LOCATION_VALUES.sql
-- Korrigiert location-Werte von 'heim'/'auswärts' zu 'Home'/'Away'

-- 1. Zeige aktuelle location-Werte
SELECT 
  'Current location values' as info,
  m.id,
  m.opponent,
  m.location,
  m.venue,
  ti.club_name,
  ti.team_name
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE m.location IN ('heim', 'auswärts')
ORDER BY m.match_date DESC
LIMIT 20;

-- 2. Update 'heim' zu 'Home'
UPDATE matches
SET location = 'Home'
WHERE location = 'heim'
RETURNING 'Updated heim to Home' as status, id, opponent, location;

-- 3. Update 'auswärts' zu 'Away'
UPDATE matches
SET location = 'Away'
WHERE location = 'auswärts'
RETURNING 'Updated auswärts to Away' as status, id, opponent, location;

-- 4. Verification
SELECT 
  'Verification - should only have Home/Away now' as info,
  m.id,
  m.opponent,
  m.location,
  ti.club_name
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
ORDER BY m.match_date DESC
LIMIT 20;





