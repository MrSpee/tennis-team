-- ===================================================
-- CLEANUP: Falsche Duplikate aus Scraper-Import
-- ===================================================

-- 1️⃣ Zeige alle Matches wo Heim = Gast (sich selbst spielen)
SELECT 
  m.id,
  m.match_date,
  m.start_time,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  m.venue,
  m.created_at
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.home_team_id = m.away_team_id
  AND m.season = 'Winter 2025/26'
ORDER BY m.match_date;

-- Erwartung: Mehrere Matches wo "TC Dellbrück 1" gegen "TC Dellbrück 1" spielt


-- 2️⃣ Zeige Duplikate (gleiches Datum, gleiche Teams)
SELECT 
  m.match_date,
  m.start_time,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(m.id ORDER BY m.created_at) as match_ids,
  MIN(m.created_at) as first_created,
  MAX(m.created_at) as last_created
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
GROUP BY m.match_date, m.start_time, m.home_team_id, m.away_team_id, ht.club_name, ht.team_name, at.club_name, at.team_name
HAVING COUNT(*) > 1
ORDER BY m.match_date;


-- ⚠️ VOR DEM LÖSCHEN: Backup erstellen!
-- Uncomment zum Ausführen:

-- 3️⃣ LÖSCHE alle Matches wo Heim = Gast
-- DELETE FROM matchdays
-- WHERE home_team_id = away_team_id
--   AND season = 'Winter 2025/26'
--   AND league = '1. Bezirksliga';


-- 4️⃣ LÖSCHE Duplikate (behalte ältestes)
-- WITH duplicates AS (
--   SELECT 
--     m.id,
--     ROW_NUMBER() OVER (
--       PARTITION BY m.match_date, m.home_team_id, m.away_team_id 
--       ORDER BY m.created_at ASC
--     ) as rn
--   FROM matchdays m
--   WHERE m.season = 'Winter 2025/26'
--     AND m.league = '1. Bezirksliga'
-- )
-- DELETE FROM matchdays
-- WHERE id IN (
--   SELECT id FROM duplicates WHERE rn > 1
-- );


-- 5️⃣ VERIFIKATION nach Cleanup
SELECT 
  'Fehlerhafte Matches (Heim=Gast)' as check_type,
  COUNT(*) as anzahl
FROM matchdays
WHERE home_team_id = away_team_id
  AND season = 'Winter 2025/26'

UNION ALL

SELECT 
  'Duplikate' as check_type,
  COUNT(*) as anzahl
FROM (
  SELECT 
    match_date, home_team_id, away_team_id, COUNT(*) as cnt
  FROM matchdays
  WHERE season = 'Winter 2025/26'
  GROUP BY match_date, home_team_id, away_team_id
  HAVING COUNT(*) > 1
) sub;

-- Erwartung nach Cleanup: Beide = 0


