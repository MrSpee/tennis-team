-- ==============================================================================
-- QUICK FIX: Match #536 (VKC Köln 1 vs. KölnerTHC Stadion RW 2)
-- ==============================================================================
-- Problem: Match wurde ohne match_number importiert
-- Lösung: Setze match_number = 536 für korrektes Meeting-Report Matching
-- ==============================================================================

DO $$
DECLARE
  target_match_id UUID;
  vkc_team_id UUID;
  kthc_team_id UUID;
  existing_536 UUID;
BEGIN
  -- Schritt 1: Prüfe ob match_number 536 bereits vergeben ist
  SELECT id INTO existing_536 FROM matchdays WHERE match_number = 536;
  
  IF existing_536 IS NOT NULL THEN
    RAISE NOTICE '⚠️ Match-Nummer 536 ist bereits vergeben an Match-ID: %', existing_536;
    RAISE NOTICE 'Bitte prüfen ob das das richtige Match ist!';
    
    -- Zeige Details des bestehenden Matches
    RAISE NOTICE 'Bestehendes Match Details:';
    PERFORM (
      SELECT 
        'Match: ' || 
        (SELECT club_name FROM team_info WHERE id = matchdays.home_team_id) || ' vs ' ||
        (SELECT club_name FROM team_info WHERE id = matchdays.away_team_id) || 
        ' am ' || match_date::date
      FROM matchdays WHERE id = existing_536
    );
    RETURN;
  END IF;
  
  -- Schritt 2: Hole Team-IDs
  SELECT id INTO vkc_team_id FROM team_info 
  WHERE LOWER(REPLACE(club_name, ' ', '')) LIKE '%vkcköln%'
    AND (team_name = '1' OR team_name IS NULL)
    AND category LIKE '%Herren 40%'
  LIMIT 1;
  
  SELECT id INTO kthc_team_id FROM team_info 
  WHERE LOWER(REPLACE(club_name, ' ', '')) LIKE '%kölnerthcstadionrw%'
    AND team_name = '2'
  LIMIT 1;
  
  IF vkc_team_id IS NULL THEN
    RAISE EXCEPTION '❌ VKC Köln 1 Team nicht gefunden!';
  END IF;
  
  IF kthc_team_id IS NULL THEN
    RAISE EXCEPTION '❌ KölnerTHC Stadion RW 2 Team nicht gefunden!';
  END IF;
  
  RAISE NOTICE '✅ Teams gefunden:';
  RAISE NOTICE '   VKC Team ID: %', vkc_team_id;
  RAISE NOTICE '   KTHC Team ID: %', kthc_team_id;
  
  -- Schritt 3: Finde Match ohne match_number
  SELECT id INTO target_match_id FROM matchdays
  WHERE home_team_id = vkc_team_id
    AND away_team_id = kthc_team_id
    AND match_date::date = '2025-11-15'
    AND (match_number IS NULL OR match_number = 536)
  LIMIT 1;
  
  IF target_match_id IS NULL THEN
    RAISE EXCEPTION '❌ Match nicht gefunden! (VKC vs KTHC am 15.11.2025)';
  END IF;
  
  RAISE NOTICE '✅ Match gefunden: %', target_match_id;
  
  -- Schritt 4: Update match_number
  UPDATE matchdays
  SET 
    match_number = 536,
    updated_at = NOW()
  WHERE id = target_match_id;
  
  RAISE NOTICE '🎉 SUCCESS: Match-Nummer 536 gesetzt!';
  RAISE NOTICE 'Match-ID: %', target_match_id;
  RAISE NOTICE 'Du kannst jetzt die Meeting-Details laden.';
  
END $$;

-- Verifizierung: Zeige das aktualisierte Match
SELECT 
  id,
  match_number,
  match_date,
  (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.home_team_id) as home_team,
  (SELECT club_name || ' ' || COALESCE(team_name, '') FROM team_info WHERE id = matchdays.away_team_id) as away_team,
  status,
  group_name
FROM matchdays
WHERE match_number = 536;

