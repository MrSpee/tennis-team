-- PRÜFE: Alle Match-Results auf falsche Winner-Einträge prüfen
-- Suche nach Einträgen wo der berechnete Winner nicht mit dem gespeicherten Winner übereinstimmt

WITH calculated_winners AS (
  SELECT 
    id,
    match_id,
    match_type,
    set1_home, set1_guest,
    set2_home, set2_guest,
    set3_home, set3_guest,
    winner as stored_winner,
    status,
    -- Berechne Winner basierend auf Sätzen
    CASE 
      WHEN (set1_home > set1_guest AND set2_home > set2_guest) OR
           (set1_home > set1_guest AND set3_home > set3_guest) OR
           (set2_home > set2_guest AND set3_home > set3_guest) THEN 'home'
      WHEN (set1_guest > set1_home AND set2_guest > set2_home) OR
           (set1_guest > set1_home AND set3_guest > set3_home) OR
           (set2_guest > set2_home AND set3_guest > set3_home) THEN 'guest'
      ELSE NULL
    END as calculated_winner
  FROM match_results 
  WHERE status = 'completed' 
    AND (set1_home > 0 OR set1_guest > 0)
    AND (set2_home > 0 OR set2_guest > 0)
)
SELECT 
  id,
  match_id,
  match_type,
  CONCAT(set1_home, ':', set1_guest, ' ', set2_home, ':', set2_guest, ' ', set3_home, ':', set3_guest) as score,
  stored_winner,
  calculated_winner,
  CASE 
    WHEN stored_winner != calculated_winner THEN '❌ FEHLER'
    ELSE '✅ OK'
  END as status_check
FROM calculated_winners
WHERE calculated_winner IS NOT NULL
ORDER BY 
  CASE WHEN stored_winner != calculated_winner THEN 0 ELSE 1 END,
  match_id;

