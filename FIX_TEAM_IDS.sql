-- ========================================
-- FIX TEAM IDs - Stelle sicher dass alle Matches team_id haben
-- ========================================

-- Schritt 1: Prüfe aktuelle Situation
SELECT 
  'BEFORE FIX' as status,
  COUNT(*) as total_matches,
  COUNT(team_id) as matches_with_team_id,
  COUNT(*) - COUNT(team_id) as matches_without_team_id
FROM matches;

-- Schritt 2: Zeige Matches OHNE team_id
SELECT 
  id,
  opponent,
  match_date,
  season,
  team_id
FROM matches
WHERE team_id IS NULL
ORDER BY match_date DESC;

-- Schritt 3: Hole Haupt-Team ID (SV Rot-Gelb Sürth)
DO $$
DECLARE
  main_team_id UUID;
  updated_count INTEGER;
BEGIN
  -- Finde Haupt-Team
  SELECT id INTO main_team_id
  FROM team_info
  WHERE season = 'winter'
  AND season_year = '24/25'
  AND (club_name LIKE '%Sürth%' OR club_name LIKE '%Rot%Gelb%')
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF main_team_id IS NULL THEN
    RAISE EXCEPTION '❌ Haupt-Team nicht gefunden! Bitte team_info prüfen.';
  END IF;
  
  RAISE NOTICE '✅ Haupt-Team gefunden: %', main_team_id;
  
  -- Update alle Matches ohne team_id
  UPDATE matches
  SET team_id = main_team_id
  WHERE team_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % Matches mit team_id aktualisiert', updated_count;
END $$;

-- Schritt 4: Verification - Alle Matches sollten jetzt team_id haben
SELECT 
  'AFTER FIX' as status,
  COUNT(*) as total_matches,
  COUNT(team_id) as matches_with_team_id,
  COUNT(*) - COUNT(team_id) as matches_without_team_id
FROM matches;

-- Schritt 5: Zeige alle Matches mit Team-Info
SELECT 
  m.opponent,
  m.match_date,
  m.season,
  m.team_id,
  ti.club_name,
  ti.team_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

-- ========================================
-- ERWARTETES ERGEBNIS
-- ========================================
/*
BEFORE FIX:
- total_matches: X
- matches_with_team_id: 0 oder weniger als X
- matches_without_team_id: > 0

AFTER FIX:
- total_matches: X
- matches_with_team_id: X (alle!)
- matches_without_team_id: 0 (keine!)
*/

