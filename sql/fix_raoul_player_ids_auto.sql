-- Script: Korrigiert automatisch falsche Spieler-IDs für Raoul in match_results
-- 
-- Problem: Raoul wurde möglicherweise mit unterschiedlichen IDs gespeichert
-- Lösung: Finde alle Raoul-Spieler, identifiziere die richtige ID, und korrigiere match_results

-- Schritt 1: Zeige alle Raoul-Spieler zur Analyse
DO $$
DECLARE
  correct_raoul_id UUID;
  wrong_raoul_ids UUID[];
  updated_count INTEGER;
BEGIN
  -- Finde die richtige Raoul-ID (Priorität: user_id > is_active > neueste)
  SELECT id INTO correct_raoul_id
  FROM players_unified
  WHERE (name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
    AND user_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Fallback: Aktiver Spieler
  IF correct_raoul_id IS NULL THEN
    SELECT id INTO correct_raoul_id
    FROM players_unified
    WHERE (name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Fallback: Neuester Spieler
  IF correct_raoul_id IS NULL THEN
    SELECT id INTO correct_raoul_id
    FROM players_unified
    WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF correct_raoul_id IS NULL THEN
    RAISE NOTICE '❌ Kein Raoul gefunden!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Richtige Raoul-ID: %', correct_raoul_id;
  
  -- Sammle alle falschen Raoul-IDs
  SELECT ARRAY_AGG(id) INTO wrong_raoul_ids
  FROM players_unified
  WHERE (name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
    AND id != correct_raoul_id;
  
  IF wrong_raoul_ids IS NULL OR array_length(wrong_raoul_ids, 1) IS NULL THEN
    RAISE NOTICE '✅ Keine falschen Raoul-IDs gefunden!';
    RETURN;
  END IF;
  
  RAISE NOTICE '⚠️ Falsche Raoul-IDs: %', array_to_string(wrong_raoul_ids, ', ');
  
  -- Korrigiere match_results
  -- home_player_id
  UPDATE match_results
  SET home_player_id = correct_raoul_id
  WHERE home_player_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in home_player_id', updated_count;
  END IF;
  
  -- home_player1_id
  UPDATE match_results
  SET home_player1_id = correct_raoul_id
  WHERE home_player1_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in home_player1_id', updated_count;
  END IF;
  
  -- home_player2_id
  UPDATE match_results
  SET home_player2_id = correct_raoul_id
  WHERE home_player2_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in home_player2_id', updated_count;
  END IF;
  
  -- guest_player_id
  UPDATE match_results
  SET guest_player_id = correct_raoul_id
  WHERE guest_player_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in guest_player_id', updated_count;
  END IF;
  
  -- guest_player1_id
  UPDATE match_results
  SET guest_player1_id = correct_raoul_id
  WHERE guest_player1_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in guest_player1_id', updated_count;
  END IF;
  
  -- guest_player2_id
  UPDATE match_results
  SET guest_player2_id = correct_raoul_id
  WHERE guest_player2_id = ANY(wrong_raoul_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Korrigiert: % Ergebnisse in guest_player2_id', updated_count;
  END IF;
  
  RAISE NOTICE '✅ Fertig! Alle Raoul-IDs wurden korrigiert.';
  
END $$;

-- Schritt 2: Zeige alle Raoul-Spieler zur Verifizierung
SELECT 
  id,
  name,
  tvm_id,
  user_id,
  is_active,
  created_at,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ RICHTIG (hat user_id)'
    WHEN is_active THEN '⚠️ Möglicherweise richtig (aktiv)'
    ELSE '❌ FALSCH (inaktiv, kein user_id)'
  END as status
FROM players_unified
WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%'
ORDER BY 
  CASE WHEN user_id IS NOT NULL THEN 1 ELSE 2 END,
  CASE WHEN is_active THEN 1 ELSE 2 END,
  created_at DESC;

-- Schritt 3: Zeige alle match_results mit Raoul (nach Korrektur)
SELECT 
  mr.id,
  mr.match_number,
  mr.match_type,
  mr.matchday_id,
  md.match_date,
  CASE 
    WHEN mr.home_player_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'home_player_id'
    WHEN mr.home_player1_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'home_player1_id'
    WHEN mr.home_player2_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'home_player2_id'
    WHEN mr.guest_player_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'guest_player_id'
    WHEN mr.guest_player1_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'guest_player1_id'
    WHEN mr.guest_player2_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%') THEN 'guest_player2_id'
  END as raoul_field,
  mr.home_player_id,
  mr.guest_player_id,
  mr.home_player1_id,
  mr.home_player2_id,
  mr.guest_player1_id,
  mr.guest_player2_id
FROM match_results mr
LEFT JOIN matchdays md ON mr.matchday_id = md.id
WHERE mr.home_player_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
   OR mr.guest_player_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
   OR mr.home_player1_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
   OR mr.home_player2_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
   OR mr.guest_player1_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
   OR mr.guest_player2_id IN (SELECT id FROM players_unified WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%')
ORDER BY md.match_date DESC, mr.match_number;

