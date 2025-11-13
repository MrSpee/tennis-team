-- =====================================================
-- KOMPLETTE ANALYSE: Gruppe 044 Import
-- Kopiere das KOMPLETT in Supabase SQL Editor
-- =====================================================

-- 1. VEREINE ZÄHLEN
SELECT '=== 1. VEREINE GESAMT ===' as step;
SELECT COUNT(*) as total_clubs FROM club_info;

-- 2. MATCHES IN GRUPPE 044
SELECT '=== 2. MATCHES GR.044 ===' as step;
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as beendet,
  COUNT(*) FILTER (WHERE status = 'scheduled') as geplant
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26';

-- 3. DUPLIKATE ANALYSE
SELECT '=== 3. DUPLIKATE ===' as step;
SELECT 
  match_date::date,
  final_score,
  COUNT(*) as wie_oft,
  MIN(created_at)::timestamp as erstes,
  MAX(created_at)::timestamp as letztes
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26'
GROUP BY match_date, home_team_id, away_team_id, final_score
HAVING COUNT(*) > 1
ORDER BY match_date;

-- 4. WIE VIELE WÜRDEN GELÖSCHT?
SELECT '=== 4. CLEANUP SIMULATION ===' as step;
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY match_date, home_team_id, away_team_id 
      ORDER BY created_at ASC
    ) as rn
  FROM matchdays
  WHERE group_name = 'Gr. 044'
    AND season = 'Winter 2025/26'
)
SELECT 
  COUNT(*) as wurden_geloescht,
  (SELECT COUNT(*) FROM matchdays WHERE group_name = 'Gr. 044' AND season = 'Winter 2025/26') as vorher,
  (SELECT COUNT(*) FROM matchdays WHERE group_name = 'Gr. 044' AND season = 'Winter 2025/26') - COUNT(*) as nachher
FROM duplicates 
WHERE rn > 1;

-- 5. FINALE ZUSAMMENFASSUNG
SELECT '=== 5. ZUSAMMENFASSUNG ===' as step;
SELECT 
  (SELECT COUNT(*) FROM club_info) as vereine_total,
  (SELECT COUNT(*) FROM matchdays WHERE group_name = 'Gr. 044' AND season = 'Winter 2025/26') as matches_gr044,
  (SELECT COUNT(DISTINCT (match_date, home_team_id, away_team_id)) FROM matchdays WHERE group_name = 'Gr. 044' AND season = 'Winter 2025/26') as einzigartige_matches;


