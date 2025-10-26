-- ANALYZE_MATCH_STRUCTURE.sql
-- Analysiert die Datenbank-Struktur richtig

-- 1. Prüfe das Match und alle Ergebnisse
SELECT 
  'MATCH OVERVIEW' as info,
  m.id, m.opponent, m.location, m.match_date
FROM matches m
WHERE m.id = '3bf226c8-dcfb-4429-94ee-fe239fe52250';

-- 2. Prüfe ALLE Match-Ergebnisse für dieses Match
SELECT 
  'ALL MATCH RESULTS' as info,
  mr.match_number, mr.match_type, mr.winner,
  mr.home_player_id, mr.guest_player_id, 
  mr.home_player1_id, mr.home_player2_id,
  mr.guest_player1_id, mr.guest_player2_id,
  mr.set1_home, mr.set1_guest, mr.set2_home, mr.set2_guest, mr.set3_home, mr.set3_guest
FROM match_results mr
WHERE mr.match_id = '3bf226c8-dcfb-4429-94ee-fe239fe52250'
ORDER BY mr.match_number;

-- 3. Prüfe die Spieler-Namen
SELECT 
  'PLAYER NAMES' as info,
  id, name, player_type
FROM players_unified 
WHERE id IN (
  '76df607d-30cb-4f2c-b143-2cb805c80060', -- Robert Ellrich
  '8e11ac3b-56cf-412d-be8f-2a02af744f34', -- Frank Ritter
  '3641863f-323f-45f6-a6d4-67eed87109de', -- Gegner 1
  '01ee443d-82d8-4e84-9884-95f645ac6b6e'  -- Gegner 2
);

