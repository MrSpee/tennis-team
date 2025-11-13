-- ===================================================
-- CLEANUP: Alle Matches in Gruppe 043 prüfen und ggf. löschen
-- ===================================================

-- 1️⃣ Zeige ALLE Matches in Gruppe 043
SELECT 
  m.id,
  m.match_date,
  m.start_time,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  m.venue,
  m.status,
  m.home_score,
  m.away_score,
  m.created_at
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
  AND m.group_name = 'Gr. 043'
ORDER BY m.match_date, m.start_time;


-- 2️⃣ Zeige Duplikate in Gruppe 043
SELECT 
  m.match_date,
  m.start_time,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  COUNT(*) as anzahl_duplikate,
  ARRAY_AGG(m.id ORDER BY m.created_at) as match_ids
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
  AND m.group_name = 'Gr. 043'
GROUP BY m.match_date, m.start_time, m.home_team_id, m.away_team_id, ht.club_name, ht.team_name, at.club_name, at.team_name
HAVING COUNT(*) > 1
ORDER BY m.match_date;


-- 3️⃣ LÖSCHE Duplikate (behalte ältestes Match)
-- ⚠️ Uncomment zum Ausführen:
/*
WITH duplicates AS (
  SELECT 
    m.id,
    m.match_date,
    m.home_team_id,
    m.away_team_id,
    ROW_NUMBER() OVER (
      PARTITION BY m.match_date, m.home_team_id, m.away_team_id 
      ORDER BY m.created_at ASC
    ) as rn
  FROM matchdays m
  WHERE m.season = 'Winter 2025/26'
    AND m.league = '1. Bezirksliga'
    AND m.group_name = 'Gr. 043'
)
DELETE FROM matchdays
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/


-- 4️⃣ Optional: ALLE Matches in Gruppe 043 löschen (wenn komplett neu importiert werden soll)
-- ⚠️⚠️ NUR AUSFÜHREN WENN DU SICHER BIST! ⚠️⚠️
-- DELETE FROM matchdays
-- WHERE season = 'Winter 2025/26'
--   AND league = '1. Bezirksliga'
--   AND group_name = 'Gr. 043';


-- 5️⃣ Verifikation
SELECT 
  'Gruppe 043 Matches übrig' as info,
  COUNT(*) as anzahl
FROM matchdays
WHERE season = 'Winter 2025/26'
  AND league = '1. Bezirksliga'
  AND group_name = 'Gr. 043';



