-- =====================================================
-- ADD_UNIQUE_CONSTRAINT_MATCHDAYS.sql
-- Description: Fügt eine UNIQUE-Constraint zu matchdays hinzu,
--              um zukünftige Duplikate zu verhindern
--              Constraint: (match_date, home_team_id, away_team_id)
-- Date: 2025-01-XX
-- =====================================================

-- WICHTIG: Führe zuerst CLEANUP_DUPLICATE_MATCHDAYS.sql aus, um bestehende Duplikate zu entfernen!

BEGIN;

-- Schritt 1: Erstelle eine IMMUTABLE Funktion für Datum-Extraktion
CREATE OR REPLACE FUNCTION match_date_only(match_date TIMESTAMP WITH TIME ZONE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (match_date AT TIME ZONE 'UTC')::DATE;
$$;

-- Schritt 2: Prüfe auf Duplikate BEVOR der Index erstellt wird
DO $$
DECLARE
  duplicate_count_teams INTEGER;
  duplicate_count_match_number INTEGER;
  duplicate_details TEXT;
BEGIN
  -- Prüfe ob Indizes bereits existieren
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'matchdays_unique_match_date_teams'
  ) AND EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'matchdays_unique_match_number'
  ) THEN
    RAISE NOTICE 'Indizes matchdays_unique_match_date_teams und matchdays_unique_match_number existieren bereits.';
    RETURN;
  END IF;
  
  -- Prüfe auf Duplikate nach Teams (ALLE Matchdays, nicht nur eine Saison!)
  SELECT COUNT(*) INTO duplicate_count_teams
  FROM (
    SELECT match_date_only(match_date), home_team_id, away_team_id
    FROM matchdays
    GROUP BY match_date_only(match_date), home_team_id, away_team_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Prüfe auch auf Duplikate nach match_number
  SELECT COUNT(*) INTO duplicate_count_match_number
  FROM (
    SELECT match_number
    FROM matchdays
    WHERE match_number IS NOT NULL
    GROUP BY match_number
    HAVING COUNT(*) > 1
  ) duplicates_by_match_number;
  
  IF duplicate_count_teams > 0 OR duplicate_count_match_number > 0 THEN
    -- Zeige Details der Duplikate (max. 5 für bessere Lesbarkeit)
    SELECT string_agg(
      'Datum: ' || match_date_only(match_date)::TEXT || 
      ', Teams: ' || home_team_id::TEXT || ' vs ' || away_team_id::TEXT ||
      ' (' || COUNT(*)::TEXT || 'x)',
      '; '
      ORDER BY match_date_only(match_date)
    ) INTO duplicate_details
    FROM (
      SELECT match_date_only(match_date), home_team_id, away_team_id, COUNT(*) as cnt
      FROM matchdays
      GROUP BY match_date_only(match_date), home_team_id, away_team_id
      HAVING COUNT(*) > 1
      ORDER BY match_date_only(match_date)
      LIMIT 5
    ) dup_limited;
    
    RAISE EXCEPTION '⚠️ Es sind noch % Duplikat-Gruppen (nach Teams) und % Duplikat-Gruppen (nach match_number) vorhanden. Bitte zuerst CLEANUP_DUPLICATE_MATCHDAYS.sql ausführen!', duplicate_count_teams, duplicate_count_match_number;
  END IF;
  
  -- Erstelle UNIQUE Index mit der IMMUTABLE Funktion (für Datum + Teams)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'matchdays_unique_match_date_teams'
  ) THEN
    CREATE UNIQUE INDEX matchdays_unique_match_date_teams
    ON matchdays (match_date_only(match_date), home_team_id, away_team_id);
    RAISE NOTICE '✅ UNIQUE Index matchdays_unique_match_date_teams wurde erstellt.';
  ELSE
    RAISE NOTICE 'Index matchdays_unique_match_date_teams existiert bereits.';
  END IF;
  
  -- Erstelle UNIQUE Index für match_number (partiell, nur wenn match_number IS NOT NULL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'matchdays_unique_match_number'
  ) THEN
    CREATE UNIQUE INDEX matchdays_unique_match_number
    ON matchdays (match_number)
    WHERE match_number IS NOT NULL;
    RAISE NOTICE '✅ UNIQUE Index matchdays_unique_match_number wurde erstellt.';
  ELSE
    RAISE NOTICE 'Index matchdays_unique_match_number existiert bereits.';
  END IF;
END $$;

-- Schritt 3: Zeige Constraint-Info
SELECT 
  '=== CONSTRAINT INFO ===' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'matchdays'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- Schritt 4: Teste ob Constraint funktioniert
DO $$
DECLARE
  duplicate_count_teams INTEGER;
  duplicate_count_match_number INTEGER;
BEGIN
  -- Prüfe Duplikate nach Teams
  SELECT COUNT(*) INTO duplicate_count_teams
  FROM (
    SELECT match_date_only(match_date), home_team_id, away_team_id
    FROM matchdays
    GROUP BY match_date_only(match_date), home_team_id, away_team_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Prüfe Duplikate nach match_number
  SELECT COUNT(*) INTO duplicate_count_match_number
  FROM (
    SELECT match_number
    FROM matchdays
    WHERE match_number IS NOT NULL
    GROUP BY match_number
    HAVING COUNT(*) > 1
  ) duplicates_by_match_number;
  
  IF duplicate_count_teams > 0 OR duplicate_count_match_number > 0 THEN
    RAISE WARNING '⚠️ Es sind noch % Duplikate (nach Teams) und % Duplikate (nach match_number) vorhanden. Constraint kann nicht erstellt werden. Bitte zuerst CLEANUP_DUPLICATE_MATCHDAYS.sql ausführen!', duplicate_count_teams, duplicate_count_match_number;
  ELSE
    RAISE NOTICE '✅ Keine Duplikate gefunden. Constraint sollte funktionieren.';
  END IF;
END $$;

COMMIT;

