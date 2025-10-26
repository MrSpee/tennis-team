-- CHECK_OPPONENT_PLAYERS.sql
-- Prüft, ob Gegner-Spieler in players_unified existieren

-- 1. Prüfe alle player_type in players_unified
SELECT 
  'PLAYER TYPES' as info,
  player_type, COUNT(*) as count
FROM players_unified 
GROUP BY player_type;

-- 2. Prüfe spezifische Gegner-IDs aus den Fehlern
SELECT 
  'OPPONENT CHECK' as info,
  id, name, player_type, current_lk
FROM players_unified 
WHERE id IN (
  '3641863f-323f-45f6-a6d4-67eed87109de',
  '01ee443d-82d8-4e84-9884-95f645ac6b6e',
  '2eb20288-569d-4fae-8984-06991ce61ad7',
  'e00ad920-effa-402b-ae1b-cfcc34f74c0c'
);

-- 3. Prüfe match_results für diese IDs
SELECT 
  'MATCH RESULTS CHECK' as info,
  mr.match_id, mr.match_type, mr.home_player_id, mr.guest_player_id,
  mr.home_player1_id, mr.home_player2_id, mr.guest_player1_id, mr.guest_player2_id,
  m.opponent, m.location
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE mr.match_id = '3bf226c8-dcfb-4429-94ee-fe239fe52250'
ORDER BY mr.match_number;

