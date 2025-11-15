-- ==============================================================================
-- FIX: Fehlende Match-Numbers in matchdays
-- ==============================================================================
-- Problem: Alte Matchdays wurden ohne match_number importiert
-- Lösung: Ergänze match_number aus nuLiga-Scraper-Daten
-- ==============================================================================

-- Schritt 1: Finde alle Matchdays ohne match_number
SELECT 
  id,
  match_date::date as date,
  home_team_id,
  away_team_id,
  season,
  league,
  group_name,
  status,
  (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.home_team_id) as home_team,
  (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.away_team_id) as away_team
FROM matchdays
WHERE match_number IS NULL
  AND group_name IS NOT NULL
ORDER BY match_date, group_name;

-- ==============================================================================
-- Schritt 2: Manuelles Update für bekannte Matches
-- ==============================================================================

-- WICHTIG: Diese Werte müssen aus dem nuLiga-Scraper kommen!
-- Beispiel für Match #536 (VKC Köln 1 vs. KölnerTHC Stadion RW 2)

-- Finde das Match in der DB:
DO $$
DECLARE
  target_match_id UUID;
  vkc_team_id UUID;
  kthc_team_id UUID;
BEGIN
  -- Hole Team-IDs
  SELECT id INTO vkc_team_id FROM team_info 
  WHERE LOWER(club_name) LIKE '%vkc%' 
    AND LOWER(club_name) LIKE '%köln%'
    AND team_name = '1'
  LIMIT 1;
  
  SELECT id INTO kthc_team_id FROM team_info 
  WHERE LOWER(club_name) LIKE '%kölnerthc%' 
    AND LOWER(club_name) LIKE '%stadion%'
    AND team_name = '2'
  LIMIT 1;
  
  RAISE NOTICE 'VKC Team ID: %', vkc_team_id;
  RAISE NOTICE 'KTHC Team ID: %', kthc_team_id;
  
  -- Finde Match ohne match_number
  SELECT id INTO target_match_id FROM matchdays
  WHERE home_team_id = vkc_team_id
    AND away_team_id = kthc_team_id
    AND match_date::date = '2025-11-15'
    AND match_number IS NULL
  LIMIT 1;
  
  IF target_match_id IS NOT NULL THEN
    RAISE NOTICE 'Match gefunden: %', target_match_id;
    
    -- Update match_number
    UPDATE matchdays
    SET match_number = 536
    WHERE id = target_match_id;
    
    RAISE NOTICE '✅ Match-Nummer 536 gesetzt für Match %', target_match_id;
  ELSE
    RAISE NOTICE '⚠️ Match nicht gefunden!';
  END IF;
END $$;

-- ==============================================================================
-- Schritt 3: Automatisches Update für ALLE Matches ohne match_number
-- ==============================================================================
-- ACHTUNG: Dieser Schritt erfordert einen Re-Import über den Scraper!
-- Alternativ: Manuelle Zuordnung über nuLiga-Daten

-- Zeige alle Matches ohne match_number gruppiert nach Gruppe
SELECT 
  group_name,
  COUNT(*) as missing_count,
  STRING_AGG(
    (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.home_team_id) || 
    ' vs ' || 
    (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.away_team_id),
    '; '
  ) as matches
FROM matchdays
WHERE match_number IS NULL
  AND group_name IS NOT NULL
GROUP BY group_name
ORDER BY group_name;

-- ==============================================================================
-- EMPFEHLUNG: Re-Import über Scraper
-- ==============================================================================
-- 1. Gehe zum Super Admin Dashboard → Scraper Tab
-- 2. Lade Gruppe 43: "43" eingeben und "Daten laden"
-- 3. Klicke "Matches importieren"
-- 4. Der Scraper wird:
--    a) Bestehende Matches per Datum+Teams finden
--    b) Die fehlende match_number ergänzen
--    c) Keine Duplikate erstellen (dank unique constraint)

-- ==============================================================================
-- CHANGELOG
-- ==============================================================================
-- 2025-01-15: Script erstellt für Migration fehlender match_numbers

