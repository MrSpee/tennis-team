-- AUTO-FIX: Korrigiere alle falschen Winner-Einträge automatisch
-- Basierend auf den tatsächlichen Satzergebnissen

WITH calculated_winners AS (
  SELECT 
    id,
    match_id,
    match_type,
    set1_home, set1_guest,
    set2_home, set2_guest,
    set3_home, set3_guest,
    winner as stored_winner,
    -- Berechne korrekten Winner basierend auf Sätzen
    CASE 
      WHEN (set1_home > set1_guest AND set2_home > set2_guest) OR
           (set1_home > set1_guest AND set3_home > set3_guest) OR
           (set2_home > set2_guest AND set3_home > set3_home) THEN 'home'
      WHEN (set1_guest > set1_home AND set2_guest > set2_home) OR
           (set1_guest > set1_home AND set3_guest > set3_home) OR
           (set2_guest > set2_home AND set3_guest > set3_home) THEN 'guest'
      ELSE NULL
    END as correct_winner
  FROM match_results 
  WHERE status = 'completed' 
    AND (set1_home > 0 OR set1_guest > 0)
    AND (set2_home > 0 OR set2_guest > 0)
    AND (set3_home > 0 OR set3_guest > 0)
)
-- Zeige alle zu korrigierenden Einträge
SELECT 
  'UPDATE match_results SET winner = ''' || correct_winner || ''' WHERE id = ''' || id || ''';' as fix_sql,
  id,
  match_id,
  CONCAT(set1_home, ':', set1_guest, ' ', set2_home, ':', set2_guest, ' ', set3_home, ':', set3_guest) as score,
  stored_winner as old_winner,
  correct_winner as new_winner
FROM calculated_winners
WHERE correct_winner IS NOT NULL 
  AND stored_winner != correct_winner
ORDER BY match_id;



