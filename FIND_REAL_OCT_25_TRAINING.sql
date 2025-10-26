-- Finde das ECHTE Training vom 25.10.2025

-- 1. Zeige ALLE Trainings vom Oktober 2025
SELECT 
  id,
  title,
  date,
  type,
  organizer_id,
  max_players,
  invited_players,
  status
FROM training_sessions
WHERE DATE(date) BETWEEN '2025-10-01' AND '2025-10-31'
ORDER BY date;

-- 2. Zeige Training Attendance vom 25.10. mit RICHTIGER Session-ID
SELECT 
  p.name as spieler,
  ta.status,
  ta.response_date,
  ts.date as training_datum,
  ts.title as training_title,
  (ts.date - ta.response_date::timestamp) as tage_differenz
FROM training_attendance ta
JOIN players_unified p ON ta.player_id = p.id
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
WHERE DATE(ta.response_date) = '2025-10-25'
ORDER BY ta.response_date;

-- 3. Finde das Training, wo die Attendance-Daten hinsollen
-- (basierend auf invited_players und Datum)
SELECT 
  ts.id,
  ts.title,
  ts.date,
  ts.invited_players,
  COUNT(ta.id) as anzahl_responses_vom_25_10
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ts.id = ta.session_id AND DATE(ta.response_date) = '2025-10-25'
WHERE ts.invited_players && ARRAY['43427aa7-771f-4e47-8858-c8454a1b9fee'::uuid] -- Chris Spee
GROUP BY ts.id, ts.title, ts.date, ts.invited_players
ORDER BY ts.date
LIMIT 10;

