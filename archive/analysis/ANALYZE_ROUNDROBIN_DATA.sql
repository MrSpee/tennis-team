-- ========================================
-- ANALYZE ROUND-ROBIN ATTENDANCE DATA
-- ========================================
-- Check attendance data for the trainings shown

-- 1. Show all attendance for these two trainings
SELECT 
  ta.id,
  ta.session_id,
  ta.player_id,
  pu.name as player_name,
  ta.status,
  ta.response_date,
  ta.created_at,
  ts.date as training_date,
  ts.title as training_title
FROM training_attendance ta
JOIN players_unified pu ON ta.player_id = pu.id
JOIN training_sessions ts ON ta.session_id = ts.id
WHERE ta.session_id IN (
  '5cfd8987-aa6e-45b0-808f-0295cc71f473', -- 18.10.
  '6ce1db8a-56cd-4e32-8954-b43794204941'  -- 25.10.
)
ORDER BY ts.date DESC, ta.response_date DESC;

-- 2. Show Chris Spee's attendance specifically
SELECT 
  ta.session_id,
  ta.status,
  ta.response_date,
  ts.date as training_date,
  ts.title,
  DATE(ts.date) as training_date_only,
  CURRENT_DATE as today,
  CURRENT_DATE - DATE(ts.date) as days_ago
FROM training_attendance ta
JOIN players_unified pu ON ta.player_id = pu.id
JOIN training_sessions ts ON ta.session_id = ts.id
WHERE pu.name = 'Chris Spee'
  AND ta.status = 'confirmed'
  AND DATE(ts.date) <= CURRENT_DATE -- Nur vergangene Trainings!
ORDER BY ts.date DESC;

-- 3. Show all past trainings where Chris Spee was invited
SELECT 
  ts.id,
  ts.date as training_date,
  ts.title,
  ts.invited_players,
  ta.status as chris_status,
  ta.response_date,
  (CURRENT_DATE - DATE(ts.date)) as days_ago
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ts.id = ta.session_id 
  AND ta.player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee'
WHERE '43427aa7-771f-4e47-8858-c8454a1b9fee' = ANY(ts.invited_players)
  AND DATE(ts.date) <= CURRENT_DATE
ORDER BY ts.date DESC
LIMIT 10;




