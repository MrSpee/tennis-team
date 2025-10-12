-- ================================================================
-- CHECK MARKUS WILWERSCHEID MERGE STATUS
-- ================================================================
-- Prüfe ob der Merge von imported_players → players geklappt hat
-- ================================================================

-- ============================================================
-- 1. Suche in PLAYERS Tabelle (registriert?)
-- ============================================================
SELECT 
  '👤 PLAYERS Tabelle:' as info,
  id,
  user_id,
  name,
  email,
  current_lk,
  phone,
  created_at,
  updated_at
FROM players
WHERE name ILIKE '%Markus%' OR name ILIKE '%Wilwerscheid%'
ORDER BY created_at DESC;

-- ============================================================
-- 2. Suche in IMPORTED_PLAYERS Tabelle (Status?)
-- ============================================================
SELECT 
  '⏳ IMPORTED_PLAYERS Tabelle:' as info,
  id,
  name,
  import_lk,
  tvm_id_number,
  team_id,
  status,
  merged_to_player_id,
  merged_at,
  created_at
FROM imported_players
WHERE name ILIKE '%Markus%' OR name ILIKE '%Wilwerscheid%'
ORDER BY created_at DESC;

-- ============================================================
-- 3. Prüfe PLAYER_TEAMS Zuordnung
-- ============================================================
SELECT 
  '🏆 PLAYER_TEAMS Zuordnung:' as info,
  pt.id,
  pt.player_id,
  p.name as player_name,
  pt.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  pt.role,
  pt.is_primary
FROM player_teams pt
JOIN players p ON pt.player_id = p.id
LEFT JOIN team_info ti ON pt.team_id = ti.id
WHERE p.name ILIKE '%Markus%' OR p.name ILIKE '%Wilwerscheid%'
ORDER BY pt.created_at DESC;

-- ============================================================
-- 4. Prüfe TRAINING_ATTENDANCE (wurde übertragen?)
-- ============================================================
SELECT 
  '🎾 TRAINING_ATTENDANCE:' as info,
  ta.id,
  ta.session_id,
  ts.title as training_title,
  ts.date as training_date,
  p.name as player_name,
  ta.status,
  ta.created_at
FROM training_attendance ta
JOIN players p ON ta.player_id = p.id
JOIN training_sessions ts ON ta.session_id = ts.id
WHERE p.name ILIKE '%Markus%' OR p.name ILIKE '%Wilwerscheid%'
ORDER BY ta.created_at DESC;

-- ============================================================
-- 5. Prüfe EXTERNAL_PLAYERS in Trainings (noch vorhanden?)
-- ============================================================
SELECT 
  '📋 EXTERNAL_PLAYERS in Trainings:' as info,
  id as training_id,
  title,
  date,
  external_players
FROM training_sessions
WHERE external_players::text ILIKE '%Markus%' 
   OR external_players::text ILIKE '%Wilwerscheid%'
ORDER BY created_at DESC;

-- ============================================================
-- 6. ZUSAMMENFASSUNG
-- ============================================================
WITH player_check AS (
  SELECT 
    COUNT(*) as count,
    'players' as table_name
  FROM players
  WHERE name ILIKE '%Markus%' OR name ILIKE '%Wilwerscheid%'
),
imported_check AS (
  SELECT 
    COUNT(*) as count,
    'imported_players' as table_name,
    MAX(status) as status
  FROM imported_players
  WHERE name ILIKE '%Markus%' OR name ILIKE '%Wilwerscheid%'
),
attendance_check AS (
  SELECT 
    COUNT(*) as count,
    'training_attendance' as table_name
  FROM training_attendance ta
  JOIN players p ON ta.player_id = p.id
  WHERE p.name ILIKE '%Markus%' OR p.name ILIKE '%Wilwerscheid%'
)
SELECT 
  '📊 ZUSAMMENFASSUNG:' as info,
  CASE 
    WHEN (SELECT count FROM player_check) > 0 THEN '✅ In PLAYERS gefunden'
    ELSE '❌ NICHT in PLAYERS gefunden'
  END as player_status,
  CASE 
    WHEN (SELECT status FROM imported_check) = 'merged' THEN '✅ MERGED Status'
    WHEN (SELECT status FROM imported_check) = 'pending' THEN '⏳ PENDING Status'
    ELSE '❓ Unbekannter Status'
  END as imported_status,
  CASE 
    WHEN (SELECT count FROM attendance_check) > 0 THEN '✅ Training-Einladungen übertragen'
    ELSE '❌ KEINE Training-Einladungen'
  END as training_status;

SELECT '✅ CHECK_MARKUS_MERGE.sql abgeschlossen!' as status;
