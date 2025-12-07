-- Script: Korrigiert falsche Spieler-IDs für Raoul in match_results
-- 
-- Problem: Raoul wurde möglicherweise mit unterschiedlichen IDs gespeichert
-- Lösung: Finde alle Raoul-Spieler, identifiziere die richtige ID, und korrigiere match_results

-- 1. Zeige alle Raoul-Spieler
SELECT 
  id,
  name,
  tvm_id,
  user_id,
  is_active,
  created_at
FROM players_unified
WHERE name ILIKE '%Raoul%' OR name ILIKE '%van Herwijnen%'
ORDER BY 
  CASE WHEN user_id IS NOT NULL THEN 1 ELSE 2 END, -- Priorität: user_id
  CASE WHEN is_active THEN 1 ELSE 2 END, -- Dann: is_active
  created_at DESC; -- Dann: neueste

-- 2. Identifiziere die richtige Raoul-ID (manuell anpassen!)
-- Ersetze 'CORRECT_RAOUL_ID' mit der richtigen ID aus Schritt 1
-- Ersetze 'WRONG_RAOUL_ID_1', 'WRONG_RAOUL_ID_2', etc. mit den falschen IDs

-- 3. Korrigiere match_results (FÜR JEDE FALSCHE ID EINZELN AUSFÜHREN)
-- Beispiel für home_player_id:
-- UPDATE match_results
-- SET home_player_id = 'CORRECT_RAOUL_ID'
-- WHERE home_player_id IN ('WRONG_RAOUL_ID_1', 'WRONG_RAOUL_ID_2');

-- Beispiel für guest_player_id:
-- UPDATE match_results
-- SET guest_player_id = 'CORRECT_RAOUL_ID'
-- WHERE guest_player_id IN ('WRONG_RAOUL_ID_1', 'WRONG_RAOUL_ID_2');

-- 4. Prüfe Ergebnisse nach Korrektur
-- SELECT 
--   id,
--   match_number,
--   match_type,
--   home_player_id,
--   guest_player_id,
--   home_player1_id,
--   home_player2_id,
--   guest_player1_id,
--   guest_player2_id
-- FROM match_results
-- WHERE home_player_id = 'CORRECT_RAOUL_ID'
--    OR guest_player_id = 'CORRECT_RAOUL_ID'
--    OR home_player1_id = 'CORRECT_RAOUL_ID'
--    OR home_player2_id = 'CORRECT_RAOUL_ID'
--    OR guest_player1_id = 'CORRECT_RAOUL_ID'
--    OR guest_player2_id = 'CORRECT_RAOUL_ID';

