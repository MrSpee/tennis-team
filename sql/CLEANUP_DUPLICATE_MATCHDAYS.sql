-- =====================================================
-- CLEANUP_DUPLICATE_MATCHDAYS.sql
-- Description: Bereinigt Duplikate in der matchdays Tabelle
--              Behält das beste Match (mit den meisten Ergebnissen, neuestes Datum)
--              und löscht die anderen
-- Date: 2025-01-XX
-- =====================================================

-- WICHTIG: Führe zuerst FIND_DUPLICATE_MATCHDAYS.sql aus, um die Duplikate zu prüfen!

BEGIN;

-- Schritt 0: Erstelle IMMUTABLE Funktion (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION match_date_only(match_date TIMESTAMP WITH TIME ZONE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (match_date AT TIME ZONE 'UTC')::DATE;
$$;

-- Schritt 1: Identifiziere Duplikate und bestimme welches behalten werden soll
-- WICHTIG: Prüft ALLE Matchdays, nicht nur eine Saison!
-- Duplikate sind: gleiches Datum + gleiche Teams ODER gleiche match_number
WITH duplicate_groups_by_teams AS (
  SELECT 
    match_date_only(match_date) as match_date_only,
    home_team_id,
    away_team_id,
    NULL::INTEGER as match_number,
    ARRAY_AGG(id ORDER BY 
      -- Priorität 1: Match mit den meisten match_results
      (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
      -- Priorität 2: Hat match_number (wichtig: zeigt dass es aus nuLiga kommt)
      CASE WHEN match_number IS NOT NULL THEN 0 ELSE 1 END,
      -- Priorität 3: Hat Scores (komplettes Ergebnis)
      CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
      -- Priorität 4: Neuestes created_at (als letzter Tie-Breaker)
      created_at DESC
    ) as matchday_ids_ordered
  FROM matchdays
  GROUP BY match_date_only(match_date), home_team_id, away_team_id
  HAVING COUNT(*) > 1
),
duplicate_groups_by_match_number AS (
  SELECT 
    NULL::DATE as match_date_only,
    NULL::UUID as home_team_id,
    NULL::UUID as away_team_id,
    match_number,
    ARRAY_AGG(id ORDER BY 
      -- Priorität 1: Match mit den meisten match_results
      (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
      -- Priorität 2: Hat Scores (komplettes Ergebnis)
      CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
      -- Priorität 3: Neuestes created_at (als letzter Tie-Breaker)
      created_at DESC
    ) as matchday_ids_ordered
  FROM matchdays
  WHERE match_number IS NOT NULL
  GROUP BY match_number
  HAVING COUNT(*) > 1
),
duplicate_groups AS (
  SELECT * FROM duplicate_groups_by_teams
  UNION ALL
  SELECT * FROM duplicate_groups_by_match_number
),
-- Bestimme welche IDs behalten werden sollen (erste in der sortierten Liste)
keep_ids AS (
  SELECT matchday_ids_ordered[1] as keep_id
  FROM duplicate_groups
),
-- Bestimme welche IDs gelöscht werden sollen (alle außer dem ersten)
-- WICHTIG: DISTINCT, da ein Matchday in beiden Gruppen sein kann
delete_ids AS (
  SELECT DISTINCT unnest(matchday_ids_ordered[2:]) as delete_id
  FROM duplicate_groups
)
-- Schritt 2: Zeige was gelöscht wird (zur Kontrolle)
SELECT 
  '=== WIRD GELÖSCHT ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.home_score || ':' || md.away_score as score,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = md.id) as results_count,
  md.created_at
FROM matchdays md
INNER JOIN delete_ids di ON md.id = di.delete_id
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
ORDER BY md.match_date;

-- Schritt 3: Lösche match_results der zu löschenden Matchdays
DELETE FROM match_results
WHERE matchday_id IN (
  WITH duplicate_groups_by_teams AS (
    SELECT 
      ARRAY_AGG(id ORDER BY 
        (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
        CASE WHEN match_number IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
      ) as matchday_ids_ordered
    FROM matchdays
    GROUP BY match_date_only(match_date), home_team_id, away_team_id
    HAVING COUNT(*) > 1
  ),
  duplicate_groups_by_match_number AS (
    SELECT 
      ARRAY_AGG(id ORDER BY 
        (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
        CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
      ) as matchday_ids_ordered
    FROM matchdays
    WHERE match_number IS NOT NULL
    GROUP BY match_number
    HAVING COUNT(*) > 1
  ),
  all_duplicate_ids AS (
    SELECT DISTINCT unnest(matchday_ids_ordered[2:]) as delete_id FROM duplicate_groups_by_teams
    UNION
    SELECT DISTINCT unnest(matchday_ids_ordered[2:]) as delete_id FROM duplicate_groups_by_match_number
  )
  SELECT delete_id FROM all_duplicate_ids
);

-- Schritt 4: Lösche die duplizierten Matchdays
DELETE FROM matchdays
WHERE id IN (
  WITH duplicate_groups_by_teams AS (
    SELECT 
      ARRAY_AGG(id ORDER BY 
        (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
        CASE WHEN match_number IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
      ) as matchday_ids_ordered
    FROM matchdays
    GROUP BY match_date_only(match_date), home_team_id, away_team_id
    HAVING COUNT(*) > 1
  ),
  duplicate_groups_by_match_number AS (
    SELECT 
      ARRAY_AGG(id ORDER BY 
        (SELECT COUNT(*) FROM match_results WHERE matchday_id = matchdays.id) DESC,
        CASE WHEN home_score IS NOT NULL AND away_score IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
      ) as matchday_ids_ordered
    FROM matchdays
    WHERE match_number IS NOT NULL
    GROUP BY match_number
    HAVING COUNT(*) > 1
  ),
  all_duplicate_ids AS (
    SELECT DISTINCT unnest(matchday_ids_ordered[2:]) as delete_id FROM duplicate_groups_by_teams
    UNION
    SELECT DISTINCT unnest(matchday_ids_ordered[2:]) as delete_id FROM duplicate_groups_by_match_number
  )
  SELECT delete_id FROM all_duplicate_ids
);

-- Schritt 5: Zeige Zusammenfassung
SELECT 
  '=== CLEANUP ABGESCHLOSSEN ===' as info,
  COUNT(*) as total_matchdays
FROM matchdays;

-- Prüfe ob noch Duplikate vorhanden sind (ALLE Matchdays)
WITH duplicate_check_by_teams AS (
  SELECT COUNT(*) as count
  FROM (
    SELECT match_date_only(match_date), home_team_id, away_team_id
    FROM matchdays
    GROUP BY match_date_only(match_date), home_team_id, away_team_id
    HAVING COUNT(*) > 1
  ) dup
),
duplicate_check_by_match_number AS (
  SELECT COUNT(*) as count
  FROM (
    SELECT match_number
    FROM matchdays
    WHERE match_number IS NOT NULL
    GROUP BY match_number
    HAVING COUNT(*) > 1
  ) dup
)
SELECT 
  CASE 
    WHEN (SELECT count FROM duplicate_check_by_teams) = 0 
         AND (SELECT count FROM duplicate_check_by_match_number) = 0 
    THEN '✅ Keine Duplikate mehr vorhanden'
    ELSE '⚠️ ' || 
         COALESCE((SELECT count FROM duplicate_check_by_teams), 0)::TEXT || 
         ' Duplikat-Gruppen (nach Teams) und ' ||
         COALESCE((SELECT count FROM duplicate_check_by_match_number), 0)::TEXT ||
         ' Duplikat-Gruppen (nach match_number) noch vorhanden'
  END as status;

COMMIT;

