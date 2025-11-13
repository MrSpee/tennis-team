-- =====================================================
-- CHECK: Analysiere Duplikate in Gruppe 044
-- (SAFE - nur SELECT, keine Änderungen)
-- =====================================================

-- 1. Übersicht: Wie viele Duplikate gibt es?
SELECT 
  '=== DUPLIKATE ANALYSE ===' as info;

SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT (match_date, home_team_id, away_team_id)) as einzigartige_matches,
  COUNT(*) - COUNT(DISTINCT (match_date, home_team_id, away_team_id)) as duplikate_anzahl
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26';

-- 2. Details: Welche Matches sind dupliziert?
SELECT 
  match_date::date,
  final_score,
  venue,
  COUNT(*) as wie_oft,
  STRING_AGG(id::text, ', ') as alle_ids,
  MIN(created_at) as erstes_erstellt,
  MAX(created_at) as letztes_erstellt
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26'
GROUP BY match_date, home_team_id, away_team_id, final_score, venue
HAVING COUNT(*) > 1
ORDER BY match_date, COUNT(*) DESC;

-- 3. Wie viele IDs würden gelöscht?
WITH duplicates AS (
  SELECT 
    id,
    match_date,
    ROW_NUMBER() OVER (
      PARTITION BY match_date, home_team_id, away_team_id 
      ORDER BY created_at ASC
    ) as rn
  FROM matchdays
  WHERE group_name = 'Gr. 044'
    AND season = 'Winter 2025/26'
)
SELECT 
  'Würden gelöscht werden:' as info,
  COUNT(*) as anzahl
FROM duplicates 
WHERE rn > 1;

-- 4. Erwartetes Ergebnis nach Cleanup
SELECT 
  'Nach Cleanup erwartete Matches:' as info,
  COUNT(DISTINCT (match_date, home_team_id, away_team_id)) as matches
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26';

