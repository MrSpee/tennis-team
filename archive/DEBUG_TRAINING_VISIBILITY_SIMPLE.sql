-- ============================================================
-- 🔍 SIMPLE DEBUG: TRAINING VISIBILITY (ohne UNION)
-- ============================================================
-- Führe diese Queries EINZELN aus (Schritt für Schritt)
-- ============================================================

-- ============================================================
-- QUERY 1: Alle kommenden Trainings
-- ============================================================

SELECT 
  id,
  title,
  type,
  team_id,
  organizer_id,
  is_public,
  date::date as training_date,
  COALESCE(array_length(invited_players, 1), 0) as invited_count,
  invited_players,
  CASE 
    WHEN external_players IS NULL THEN 0
    ELSE jsonb_array_length(external_players)
  END as external_count,
  external_players
FROM training_sessions
WHERE date >= CURRENT_DATE
ORDER BY date;

-- ============================================================
-- QUERY 2: Training Attendance Übersicht
-- ============================================================

SELECT 
  ts.id as training_id,
  ts.title,
  ts.type,
  COUNT(ta.id) as attendance_records,
  string_agg(p.name, ', ' ORDER BY p.name) as invited_players_names
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ta.session_id = ts.id
LEFT JOIN players p ON p.id = ta.player_id
WHERE ts.date >= CURRENT_DATE
GROUP BY ts.id, ts.title, ts.type
ORDER BY ts.date;

-- ============================================================
-- QUERY 3: Spieler mit Teams
-- ============================================================

SELECT 
  p.id as player_id,
  p.name,
  p.email,
  string_agg(DISTINCT t.team_name, ', ') as teams,
  string_agg(DISTINCT t.id::text, ', ') as team_ids
FROM players p
LEFT JOIN player_teams pt ON pt.player_id = p.id
LEFT JOIN team_info t ON t.id = pt.team_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.email
ORDER BY p.name;

-- ============================================================
-- QUERY 4: Problem-Check - Trainings OHNE Attendance
-- ============================================================

SELECT 
  ts.id,
  ts.title,
  ts.type,
  ts.organizer_id,
  COALESCE(array_length(ts.invited_players, 1), 0) as should_have,
  COUNT(ta.id) as actually_has,
  COALESCE(array_length(ts.invited_players, 1), 0) - COUNT(ta.id) as missing
FROM training_sessions ts
LEFT JOIN training_attendance ta ON ta.session_id = ts.id
WHERE ts.date >= CURRENT_DATE
GROUP BY ts.id, ts.title, ts.type, ts.organizer_id, ts.invited_players
HAVING COALESCE(array_length(ts.invited_players, 1), 0) != COUNT(ta.id)
ORDER BY missing DESC;

-- ============================================================
-- 💡 SO INTERPRETIERST DU DIE ERGEBNISSE:
-- ============================================================
-- 
-- QUERY 1: 
--   ✅ Gibt es private Trainings?
--   ✅ Ist invited_count > 0?
--   ✅ Sind die UUIDs in invited_players korrekt?
-- 
-- QUERY 2:
--   ✅ Stimmen attendance_records mit invited_count überein?
--   ✅ Werden die Spielernamen korrekt angezeigt?
-- 
-- QUERY 3:
--   ✅ Haben alle Spieler Teams?
--   ✅ Spieler OHNE Teams sehen keine Trainings!
-- 
-- QUERY 4:
--   ⚠️  Zeigt Trainings mit FEHLENDEN attendance Einträgen
--   ⚠️  Wenn "missing" > 0 → HIER IST DAS PROBLEM!
-- 
-- ============================================================

