-- Prüfe Chris Spee's Teilnahme am Training vom 25.10.2025

-- 1. Finde das Training am 25.10.2025
WITH oct_25_training AS (
  SELECT id, title, date
  FROM training_sessions
  WHERE DATE(date) = '2025-10-25'
  LIMIT 1
)

-- 2. Wer hat am 25.10. Training teilgenommen?
SELECT 
  p.name as spieler,
  ta.status,
  ta.response_date,
  ts.date as training_datum,
  ts.title as training_titel
FROM training_attendance ta
JOIN players_unified p ON ta.player_id = p.id
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
JOIN oct_25_training ot ON ta.session_id = ot.id
WHERE ta.status = 'confirmed'
ORDER BY p.name;

-- 3. Alle Attendance-Records für das Training vom 25.10.
SELECT 
  p.name as spieler,
  ta.status,
  ta.response_date
FROM training_attendance ta
JOIN players_unified p ON ta.player_id = p.id
WHERE ta.session_id = (SELECT id FROM training_sessions WHERE DATE(date) = '2025-10-25' LIMIT 1)
ORDER BY p.name;

-- 4. Hat Chris Spee überhaupt eine Antwort für das 25.10. Training?
SELECT 
  ta.id,
  p.name as spieler,
  ta.status,
  ta.response_date,
  ts.date as training_datum
FROM training_attendance ta
JOIN players_unified p ON ta.player_id = p.id
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
WHERE p.id = '43427aa7-771f-4e47-8858-c8454a1b9fee' -- Chris Spee
  AND ts.date = '2025-10-25 12:00:00+00'
ORDER BY ta.response_date;


