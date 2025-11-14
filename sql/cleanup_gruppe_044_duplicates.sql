-- =====================================================
-- CLEANUP: Entferne Duplikate aus Gruppe 044
-- =====================================================

-- ⚠️ WICHTIG: Vor dem Ausführen ein Backup machen!

-- Schritt 1: Zeige die Duplikate
SELECT 
  match_date,
  home_team_id,
  away_team_id,
  final_score,
  COUNT(*) as anzahl_duplikate,
  ARRAY_AGG(id) as alle_ids
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26'
GROUP BY match_date, home_team_id, away_team_id, final_score
HAVING COUNT(*) > 1
ORDER BY match_date, anzahl_duplikate DESC;

-- Schritt 2: Lösche Duplikate, behalte nur den ÄLTESTEN Eintrag
-- (Der erste Import ist der richtige)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY match_date, home_team_id, away_team_id 
      ORDER BY created_at ASC -- Behalte den ÄLTESTEN
    ) as rn
  FROM matchdays
  WHERE group_name = 'Gr. 044'
    AND season = 'Winter 2025/26'
)
DELETE FROM matchdays
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING 
  id, 
  match_date, 
  final_score,
  'GELÖSCHT' as status;

-- Schritt 3: Zeige verbleibende Matches
SELECT 
  match_date::date,
  final_score,
  status,
  venue,
  created_at::timestamp as angelegt_am
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26'
ORDER BY match_date NULLS LAST;

-- Schritt 4: Zusammenfassung
SELECT 
  'Nach Cleanup:' as info,
  COUNT(*) as verbleibende_matches,
  COUNT(*) FILTER (WHERE status = 'completed') as beendet,
  COUNT(*) FILTER (WHERE status = 'scheduled') as geplant
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26';





