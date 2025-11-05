-- ==========================================
-- DEBUG: Games-Berechnung für Sürth vs. Leverkusen
-- ==========================================

-- Zeige alle Einzelergebnisse mit Games-Berechnung
SELECT 
  mr.match_number,
  mr.winner,
  mr.set1_home,
  mr.set1_guest,
  mr.set2_home,
  mr.set2_guest,
  mr.set3_home,
  mr.set3_guest,
  
  -- Games pro Match
  (COALESCE(mr.set1_home, 0) + COALESCE(mr.set2_home, 0) + COALESCE(mr.set3_home, 0)) as home_games,
  (COALESCE(mr.set1_guest, 0) + COALESCE(mr.set2_guest, 0) + COALESCE(mr.set3_guest, 0)) as guest_games,
  
  -- Gewonnene Sätze
  CASE WHEN mr.set1_home > mr.set1_guest THEN 1 ELSE 0 END +
  CASE WHEN mr.set2_home > mr.set2_guest THEN 1 ELSE 0 END +
  CASE WHEN mr.set3_home > 0 AND mr.set3_home > mr.set3_guest THEN 1 ELSE 0 END as home_sets,
  
  CASE WHEN mr.set1_guest > mr.set1_home THEN 1 ELSE 0 END +
  CASE WHEN mr.set2_guest > mr.set2_home THEN 1 ELSE 0 END +
  CASE WHEN mr.set3_guest > 0 AND mr.set3_guest > mr.set3_home THEN 1 ELSE 0 END as guest_sets

FROM match_results mr
WHERE mr.matchday_id = '897c24df-51d7-4ba3-a652-c0016a5f2d65'
ORDER BY mr.match_number;

-- Summen
SELECT 
  'TOTAL' as info,
  SUM(COALESCE(mr.set1_home, 0) + COALESCE(mr.set2_home, 0) + COALESCE(mr.set3_home, 0)) as home_games_total,
  SUM(COALESCE(mr.set1_guest, 0) + COALESCE(mr.set2_guest, 0) + COALESCE(mr.set3_guest, 0)) as guest_games_total
FROM match_results mr
WHERE mr.matchday_id = '897c24df-51d7-4ba3-a652-c0016a5f2d65';

