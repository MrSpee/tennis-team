-- ============================================================
-- 🔍 DEBUG: TRAINING VISIBILITY PROBLEM
-- ============================================================
-- Ziel: Verstehe, warum Spieler ihre privaten Trainings nicht sehen
-- ============================================================

-- ============================================================
-- WICHTIG: Im Supabase SQL Editor "No limit" auswählen!
-- ============================================================

-- ============================================================
-- STEP 1: ALLE TRAININGS OVERVIEW
-- ============================================================

SELECT 
  '📊 ALLE TRAININGS' as section,
  id,
  title,
  type,
  team_id,
  organizer_id,
  is_public,
  date::date as training_date,
  invited_players,
  external_players
FROM training_sessions
WHERE date >= CURRENT_DATE

UNION ALL

-- ============================================================
-- STEP 2: INVITED_PLAYERS ANALYSE
-- ============================================================

SELECT 
  '👥 INVITED PLAYERS CHECK' as section,
  t.id,
  t.title,
  t.type,
  COALESCE(array_length(t.invited_players, 1), 0)::text as invited_count,
  CASE 
    WHEN t.invited_players IS NULL THEN 'NULL'
    WHEN array_length(t.invited_players, 1) = 0 THEN 'EMPTY ARRAY'
    ELSE array_to_string(t.invited_players, ', ')
  END as invited_player_ids,
  NULL::text as training_date,
  NULL::uuid[] as invited_players,
  NULL::jsonb as external_players
FROM training_sessions t
WHERE t.date >= CURRENT_DATE AND t.type = 'private'

UNION ALL

-- ============================================================
-- STEP 3: EXTERNAL_PLAYERS ANALYSE
-- ============================================================

SELECT 
  '🌍 EXTERNAL PLAYERS CHECK' as section,
  t.id,
  t.title,
  t.type,
  CASE 
    WHEN t.external_players IS NULL THEN 'NULL'
    WHEN jsonb_array_length(t.external_players) = 0 THEN 'EMPTY'
    ELSE jsonb_array_length(t.external_players)::text
  END as external_count,
  CASE 
    WHEN t.external_players IS NOT NULL THEN t.external_players::text
    ELSE 'NULL'
  END as external_data,
  NULL::text as training_date,
  NULL::uuid[] as invited_players,
  NULL::jsonb as external_players
FROM training_sessions t
WHERE t.date >= CURRENT_DATE AND t.type = 'private'

UNION ALL

-- ============================================================
-- STEP 4: TRAINING_ATTENDANCE CHECK
-- ============================================================

SELECT 
  '✅ ATTENDANCE RECORDS' as section,
  ta.session_id::text as id,
  p.name as title,
  ta.status as type,
  NULL::text as invited_count,
  ta.player_id::text as invited_player_ids,
  NULL::text as training_date,
  NULL::uuid[] as invited_players,
  NULL::jsonb as external_players
FROM training_attendance ta
JOIN players p ON p.id = ta.player_id
WHERE ta.session_id IN (
  SELECT id FROM training_sessions WHERE date >= CURRENT_DATE
)

UNION ALL

-- ============================================================
-- STEP 5: SPIELER MIT TEAMS
-- ============================================================

SELECT 
  '🎾 SPIELER TEAMS' as section,
  p.id::text as id,
  p.name as title,
  string_agg(DISTINCT t.team_name, ', ') as type,
  string_agg(DISTINCT t.id::text, ', ') as invited_count,
  NULL as invited_player_ids,
  NULL::text as training_date,
  NULL::uuid[] as invited_players,
  NULL::jsonb as external_players
FROM players p
LEFT JOIN player_teams pt ON pt.player_id = p.id
LEFT JOIN team_info t ON t.id = pt.team_id
WHERE p.is_active = true
GROUP BY p.id, p.name

ORDER BY section DESC, id;

-- ============================================================
-- 💡 WAS ZU PRÜFEN IST:
-- ============================================================
-- 
-- 1. INVITED_PLAYERS:
--    ✅ Sind die UUIDs korrekt?
--    ✅ Ist das Array NULL oder leer?
--    ✅ Stimmen die IDs mit players.id überein?
-- 
-- 2. EXTERNAL_PLAYERS:
--    ✅ Ist es NULL oder ein leeres Array?
--    ✅ Enthält es imported_player_id?
--    ✅ Sind die Daten korrekt formatiert?
-- 
-- 3. TRAINING_ATTENDANCE:
--    ✅ Wurden Einträge für invited_players erstellt?
--    ✅ Fehlen Einträge?
-- 
-- 4. TEAM ZUORDNUNG:
--    ✅ Haben alle Spieler Teams?
--    ✅ Stimmen die Team-IDs?
-- 
-- ============================================================

