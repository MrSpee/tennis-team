-- DEBUG_ROBERT_MATCHES.sql
-- Debuggt Robert Ellrich's Match-Daten genau

-- 1. Robert Ellrich's Match-Ergebnisse
SELECT 
  'ROBERT MATCHES' as info,
  mr.match_id, mr.match_number, mr.match_type, mr.winner,
  mr.home_player_id, mr.guest_player_id, mr.home_player1_id, mr.home_player2_id,
  mr.guest_player1_id, mr.guest_player2_id,
  m.opponent, m.location, m.match_date
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE mr.home_player_id = '76df607d-30cb-4f2c-b143-2cb805c80060'
   OR mr.home_player1_id = '76df607d-30cb-4f2c-b143-2cb805c80060'
   OR mr.home_player2_id = '76df607d-30cb-4f2c-b143-2cb805c80060'
ORDER BY mr.match_number;

-- 2. Prüfe die Gegner-Daten
SELECT 
  'OPPONENT DATA' as info,
  id, name, player_type, current_lk
FROM players_unified 
WHERE id IN (
  '3641863f-323f-45f6-a6d4-67eed87109de',
  '01ee443d-82d8-4e84-9884-95f645ac6b6e'
);

-- 3. Prüfe die Match-Location
SELECT 
  'MATCH LOCATION' as info,
  id, opponent, location, match_date
FROM matches 
WHERE id = '3bf226c8-dcfb-4429-94ee-fe239fe52250';

