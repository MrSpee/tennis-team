-- SHOW_COMPLETE_MATCH_DATA.sql
-- Zeigt die kompletten Match-Daten

-- 1. Match-Übersicht
SELECT 
  'MATCH OVERVIEW' as info,
  m.id, m.opponent, m.location, m.match_date
FROM matches m
WHERE m.id = '3bf226c8-dcfb-4429-94ee-fe239fe52250';

-- 2. ALLE Match-Ergebnisse mit Spieler-Namen
SELECT 
  'MATCH RESULTS WITH NAMES' as info,
  mr.match_number, mr.match_type, mr.winner,
  mr.set1_home, mr.set1_guest, mr.set2_home, mr.set2_guest, mr.set3_home, mr.set3_guest,
  -- Home Spieler
  CASE 
    WHEN mr.match_type = 'Einzel' THEN pu_home.name
    WHEN mr.match_type = 'Doppel' THEN CONCAT(pu_home1.name, ' / ', pu_home2.name)
  END as home_players,
  -- Guest Spieler  
  CASE 
    WHEN mr.match_type = 'Einzel' THEN pu_guest.name
    WHEN mr.match_type = 'Doppel' THEN CONCAT(pu_guest1.name, ' / ', pu_guest2.name)
  END as guest_players
FROM match_results mr
LEFT JOIN players_unified pu_home ON mr.home_player_id = pu_home.id
LEFT JOIN players_unified pu_guest ON mr.guest_player_id = pu_guest.id
LEFT JOIN players_unified pu_home1 ON mr.home_player1_id = pu_home1.id
LEFT JOIN players_unified pu_home2 ON mr.home_player2_id = pu_home2.id
LEFT JOIN players_unified pu_guest1 ON mr.guest_player1_id = pu_guest1.id
LEFT JOIN players_unified pu_guest2 ON mr.guest_player2_id = pu_guest2.id
WHERE mr.match_id = '3bf226c8-dcfb-4429-94ee-fe239fe52250'
ORDER BY mr.match_number;

