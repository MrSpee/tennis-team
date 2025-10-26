-- ============================================================
-- 🧪 TEST-DATEN: Teilnahme-Statistiken generieren
-- ============================================================
-- Simuliert verschiedene Teilnahme-Muster für Testing
-- ============================================================

-- ============================================================
-- STEP 1: Setze realistische Teilnahme-Statistiken
-- ============================================================

-- Alexander Elwert: Mittelmäßige Teilnahme (70%)
UPDATE players 
SET attendance_stats = '{
  "total_invites": 20,
  "confirmed": 14,
  "declined": 6,
  "no_show": 0,
  "last_updated": "2025-10-21T15:00:00Z"
}'::jsonb
WHERE email = 'mail@kopf-an-kopf.com';

-- Chris Spee: Gute Teilnahme (85%)
UPDATE players 
SET attendance_stats = '{
  "total_invites": 20,
  "confirmed": 17,
  "declined": 3,
  "no_show": 0,
  "last_updated": "2025-10-21T15:00:00Z"
}'::jsonb
WHERE email = 'mail@christianspee.de';

-- Markus Wilwerscheid: Schlechte Teilnahme (30%)
UPDATE players 
SET attendance_stats = '{
  "total_invites": 15,
  "confirmed": 5,
  "declined": 8,
  "no_show": 2,
  "last_updated": "2025-10-21T15:00:00Z"
}'::jsonb
WHERE email = 'markus@domrauschen.com';

-- Raoul van Herwijnen: Sehr gute Teilnahme (95%)
UPDATE players 
SET attendance_stats = '{
  "total_invites": 20,
  "confirmed": 19,
  "declined": 1,
  "no_show": 0,
  "last_updated": "2025-10-21T15:00:00Z"
}'::jsonb
WHERE email = 'konsti60313@gmail.com';

-- Marc Stoppenbach: Mittelmäßige Teilnahme (60%)
UPDATE players 
SET attendance_stats = '{
  "total_invites": 18,
  "confirmed": 11,
  "declined": 6,
  "no_show": 1,
  "last_updated": "2025-10-21T15:00:00Z"
}'::jsonb
WHERE email = 'marc@stoppenbach.de';

-- ============================================================
-- STEP 2: Setze Prio-Training Status
-- ============================================================

-- Alexander braucht Prio-Training (Medenspiel-Vorbereitung)
UPDATE players 
SET 
  needs_prio_training = true,
  prio_reason = 'Wichtiges Medenspiel nächste Woche'
WHERE email = 'mail@kopf-an-kopf.com';

-- Markus braucht auch Prio-Training
UPDATE players 
SET 
  needs_prio_training = true,
  prio_reason = 'Turnier-Vorbereitung'
WHERE email = 'markus@domrauschen.com';

-- ============================================================
-- STEP 3: Erstelle Test-Training mit Überbuchung
-- ============================================================

-- Erstelle ein Prio-Training mit nur 3 Plätzen
INSERT INTO training_sessions (
  id,
  date,
  start_time,
  end_time,
  duration,
  location,
  venue,
  type,
  team_id,
  is_public,
  organizer_id,
  max_players,
  target_players,
  needs_substitute,
  weather_dependent,
  title,
  notes,
  status,
  is_prio_training,
  prio_reason,
  auto_manage_overbooking,
  waitlist_enabled
) VALUES (
  gen_random_uuid(),
  '2025-10-25 14:00:00',
  '14:00:00',
  '16:00:00',
  120,
  'Draußen',
  'Sportcenter Kautz',
  'private',
  NULL,
  false,
  (SELECT id FROM players WHERE email = 'mail@christianspee.de'),
  3, -- Nur 3 Plätze!
  3,
  false,
  true,
  '🎯 Medenspiel-Vorbereitung (PRIO)',
  'Wichtiges Training für das Medenspiel nächste Woche',
  'scheduled',
  true, -- Prio-Training!
  'Medenspiel-Vorbereitung',
  true, -- Auto-Management aktiviert
  true  -- Warteliste aktiviert
);

-- ============================================================
-- STEP 4: Lade alle 5 Spieler für das Test-Training ein
-- ============================================================

-- Hole die Training-ID
WITH test_training AS (
  SELECT id FROM training_sessions 
  WHERE title = '🎯 Medenspiel-Vorbereitung (PRIO)'
  ORDER BY created_at DESC 
  LIMIT 1
)

-- Erstelle Attendance-Einträge für alle 5 Spieler
INSERT INTO training_attendance (
  session_id,
  player_id,
  status,
  response_date,
  comment,
  priority_score,
  status_detail
)
SELECT 
  tt.id,
  p.id,
  'pending', -- Alle starten als pending
  NULL,
  'Test-Einladung für Round-Robin System',
  0, -- Wird automatisch berechnet
  'manual'
FROM test_training tt
CROSS JOIN players p
WHERE p.email IN (
  'mail@kopf-an-kopf.com',
  'mail@christianspee.de', 
  'markus@domrauschen.com',
  'konsti60313@gmail.com',
  'marc@stoppenbach.de'
);

-- ============================================================
-- STEP 5: Teste das Auto-Management System
-- ============================================================

-- Hole die Training-ID für den Test
WITH test_training AS (
  SELECT id FROM training_sessions 
  WHERE title = '🎯 Medenspiel-Vorbereitung (PRIO)'
  ORDER BY created_at DESC 
  LIMIT 1
)

-- Führe Auto-Management aus
SELECT * FROM auto_manage_training_overbooking(
  (SELECT id FROM test_training)
);

-- ============================================================
-- VERIFICATION: Zeige Ergebnisse
-- ============================================================

-- Zeige Teilnahme-Statistiken
SELECT 
  '📊 ATTENDANCE STATISTICS' as section,
  name as player_name,
  email,
  round_robin_position as rr_position,
  needs_prio_training as needs_prio,
  prio_reason,
  attendance_stats->>'total_invites' as total_invites,
  attendance_stats->>'confirmed' as confirmed,
  attendance_stats->>'declined' as declined,
  ROUND(
    (attendance_stats->>'confirmed')::DECIMAL / 
    NULLIF((attendance_stats->>'total_invites')::DECIMAL, 0) * 100
  ) as attendance_rate
FROM players 
WHERE email IN (
  'mail@kopf-an-kopf.com',
  'mail@christianspee.de', 
  'markus@domrauschen.com',
  'konsti60313@gmail.com',
  'marc@stoppenbach.de'
)
ORDER BY round_robin_position;

-- Zeige Test-Training Ergebnisse
SELECT 
  '🎯 TEST TRAINING RESULTS' as section,
  ts.title,
  ts.max_players,
  ta.status,
  ta.waitlist_position,
  ta.priority_score,
  ta.decline_reason,
  p.name as player_name,
  p.email
FROM training_sessions ts
JOIN training_attendance ta ON ta.session_id = ts.id
JOIN players p ON p.id = ta.player_id
WHERE ts.title = '🎯 Medenspiel-Vorbereitung (PRIO)'
ORDER BY 
  CASE ta.status 
    WHEN 'confirmed' THEN 1
    WHEN 'waitlist' THEN 2
    WHEN 'declined' THEN 3
    ELSE 4
  END,
  ta.waitlist_position NULLS LAST,
  ta.priority_score DESC;

-- ============================================================
-- 💡 ERWARTETE ERGEBNISSE:
-- ============================================================
-- 
-- 1. 📊 Teilnahme-Statistiken zeigen verschiedene Muster
-- 2. 🎯 Test-Training hat 3 Plätze, 5 Anmeldungen
-- 3. 🤖 Auto-Management wählt die 3 besten Spieler aus
-- 4. 📋 2 Spieler kommen auf Warteliste
-- 5. 🏆 Prio-Training Bonus wird berücksichtigt
-- 
-- ============================================================

