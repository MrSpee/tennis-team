-- Analysiere Attendance-Daten vom 25.10.2025
-- WICHTIG: Wir suchen nach dem TRAINING, das am 25.10.2025 STATTGEFUNDEN hat

-- 1. Finde alle Trainings am 25.10.2025
SELECT 
  id,
  title,
  date,
  type,
  organizer_id,
  round_robin_enabled,
  max_players,
  invited_players
FROM training_sessions
WHERE DATE(date) = '2025-10-25'
ORDER BY date;

-- 2. Finde alle Attendance-Daten mit response_date am 25.10.2025 UND das richtige Training
SELECT 
  ta.id,
  ta.session_id as WRONG_session_id,
  ta.player_id,
  ta.status,
  ta.response_date,
  ts.date as WRONG_training_date,
  ts.title as WRONG_training_title,
  (
    SELECT ts2.id 
    FROM training_sessions ts2 
    WHERE DATE(ts2.date) = '2025-10-25'
    LIMIT 1
  ) as CORRECT_session_id
FROM training_attendance ta
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
WHERE DATE(ta.response_date) = '2025-10-25'
ORDER BY ta.response_date;

-- 3. Finde mögliche falsche Zuordnungen
SELECT 
  ta.id,
  ta.session_id,
  ta.response_date,
  ts.date as training_date,
  (ts.date != DATE(ta.response_date)) as date_mismatch
FROM training_attendance ta
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
WHERE ta.response_date IS NOT NULL
  AND ts.date IS NOT NULL
  AND ABS(EXTRACT(DAY FROM (ts.date - ta.response_date))) > 1
ORDER BY ta.response_date DESC
LIMIT 20;

