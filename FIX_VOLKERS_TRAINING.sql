-- ================================================================
-- FIX VOLKERS TRAINING: target_players von 2 auf 4 ändern
-- ================================================================

-- Zeige aktuelle Werte
SELECT 
  '📊 Aktuelle Volkers Training Werte:' as info,
  id,
  title,
  target_players,
  max_players,
  type,
  organizer_id
FROM training_sessions
WHERE title ILIKE '%volker%' OR title ILIKE '%hallenhelden%';

-- Update target_players auf 4
UPDATE training_sessions 
SET target_players = 4
WHERE title ILIKE '%volker%' OR title ILIKE '%hallenhelden%';

-- Update max_players auf 8 (falls noch nicht gesetzt)
UPDATE training_sessions 
SET max_players = 8
WHERE (title ILIKE '%volker%' OR title ILIKE '%hallenhelden%') 
  AND (max_players IS NULL OR max_players < 4);

-- Zeige Ergebnis
SELECT 
  '✅ Nach Update:' as info,
  id,
  title,
  target_players,
  max_players,
  type
FROM training_sessions
WHERE title ILIKE '%volker%' OR title ILIKE '%hallenhelden%';

-- Update ALLE Trainings mit target_players < 4
UPDATE training_sessions 
SET target_players = 4
WHERE target_players IS NULL OR target_players < 4;

-- Update ALLE Trainings mit max_players < 8
UPDATE training_sessions 
SET max_players = 8
WHERE max_players IS NULL OR max_players < 8;

-- Zeige finale Werte
SELECT 
  '📋 Alle Trainings nach Fix:' as info,
  title,
  target_players,
  max_players,
  type,
  COUNT(*) as anzahl
FROM training_sessions
GROUP BY title, target_players, max_players, type
ORDER BY title;

SELECT '✅ Volkers Training Fix abgeschlossen!' as status;
