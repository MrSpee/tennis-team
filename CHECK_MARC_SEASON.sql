-- ========================================
-- CHECK MARC'S TRAINING HISTORY
-- ========================================

-- 1. Zeige alle Trainings wo Marc (Markus Wilwerscheid) invited war
SELECT 
  ts.id,
  ts.date,
  ts.title,
  DATE(ts.date) as training_date_only,
  ta.status,
  ta.response_date,
  (CURRENT_DATE - DATE(ts.date)) as days_ago,
  CASE 
    WHEN DATE(ts.date) < '2025-10-18' THEN '❌ VOR Saisonstart'
    WHEN DATE(ts.date) >= '2025-10-18' THEN '✅ NACH Saisonstart'
  END as season_check
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ts.id = ta.session_id 
  AND ta.player_id = 'a869f4e3-6424-423f-9c92-a2895f3f0464'
WHERE 'a869f4e3-6424-423f-9c92-a2895f3f0464' = ANY(ts.invited_players)
  AND ts.type = 'private'
ORDER BY ts.date DESC;

-- 2. Zeige nur confirmed Trainings nach Saisonstart
SELECT 
  ts.id,
  ts.date,
  ts.title,
  ta.status,
  DATE(ts.date) as training_date_only,
  CURRENT_DATE - DATE(ts.date) as days_ago
FROM training_sessions ts
JOIN training_attendance ta ON ts.id = ta.session_id 
  AND ta.player_id = 'a869f4e3-6424-423f-9c92-a2895f3f0464'
WHERE ta.status = 'confirmed'
  AND DATE(ts.date) >= '2025-10-18' -- Saisonstart
  AND ts.type = 'private'
ORDER BY ts.date DESC;

-- 3. Berechne korrekte Tage seit letztem Training (nur nach Saisonstart)
SELECT 
  MAX(DATE(ts.date)) as last_training_date,
  CURRENT_DATE - MAX(DATE(ts.date)) as days_since_last_training
FROM training_sessions ts
JOIN training_attendance ta ON ts.id = ta.session_id 
  AND ta.player_id = 'a869f4e3-6424-423f-9c92-a2895f3f0464'
WHERE ta.status = 'confirmed'
  AND DATE(ts.date) >= '2025-10-18' -- Saisonstart
  AND DATE(ts.date) <= CURRENT_DATE -- Nur vergangene Trainings
  AND ts.type = 'private';






