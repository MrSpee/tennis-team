-- ================================================================
-- FIX EXISTING TRAINING - Move imported_players to external_players
-- ================================================================
-- Ziel: Repariere das bestehende "Volkers Hallenhelden" Training
--       Trenne registrierte Spieler von importierten Spielern
-- ================================================================

-- Zeige aktuelles Training
SELECT 
  '📊 Aktuelles Training:' as info,
  id,
  title,
  type,
  organizer_id,
  invited_players,
  external_players,
  array_length(invited_players, 1) as invited_count
FROM training_sessions
WHERE title = 'Volkers Hallenhelden'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================
-- SCHRITT 1: Identifiziere welche IDs in invited_players
--            registrierte Spieler vs. imported_players sind
-- ============================================================

WITH current_training AS (
  SELECT 
    id,
    title,
    invited_players,
    external_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  ORDER BY created_at DESC
  LIMIT 1
),
invited_breakdown AS (
  SELECT 
    ct.id as training_id,
    unnest(ct.invited_players) as player_id
  FROM current_training ct
),
player_check AS (
  SELECT 
    ib.training_id,
    ib.player_id,
    p.id as is_registered,
    ip.id as is_imported,
    COALESCE(p.name, ip.name) as player_name,
    COALESCE(p.current_lk, ip.import_lk) as player_lk
  FROM invited_breakdown ib
  LEFT JOIN players p ON ib.player_id = p.id
  LEFT JOIN imported_players ip ON ib.player_id = ip.id
)
SELECT 
  '📊 Breakdown der eingeladenen Spieler:' as info,
  player_id,
  player_name,
  player_lk,
  CASE 
    WHEN is_registered IS NOT NULL THEN '✅ Registriert'
    WHEN is_imported IS NOT NULL THEN '⏳ Importiert (noch nicht registriert)'
    ELSE '❌ Unbekannt'
  END as status
FROM player_check;

-- ============================================================
-- SCHRITT 2: Erstelle neue invited_players Liste (nur registrierte)
--            und neue external_players Liste (importierte + alte externe)
-- ============================================================

WITH current_training AS (
  SELECT 
    id,
    title,
    invited_players,
    external_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  ORDER BY created_at DESC
  LIMIT 1
),
invited_breakdown AS (
  SELECT 
    ct.id as training_id,
    unnest(ct.invited_players) as player_id
  FROM current_training ct
),
player_classification AS (
  SELECT 
    ib.training_id,
    ib.player_id,
    p.id as is_registered,
    ip.id as is_imported,
    ip.name as imported_name,
    ip.import_lk as imported_lk
  FROM invited_breakdown ib
  LEFT JOIN players p ON ib.player_id = p.id
  LEFT JOIN imported_players ip ON ib.player_id = ip.id
),
registered_players AS (
  SELECT 
    training_id,
    array_agg(player_id) as registered_ids
  FROM player_classification
  WHERE is_registered IS NOT NULL
  GROUP BY training_id
),
imported_to_external AS (
  SELECT 
    training_id,
    jsonb_agg(
      jsonb_build_object(
        'name', imported_name,
        'lk', imported_lk,
        'club', 'Wartet auf Registrierung',
        'email', NULL,
        'phone', NULL,
        'imported_player_id', player_id
      )
    ) as imported_as_external
  FROM player_classification
  WHERE is_imported IS NOT NULL
  GROUP BY training_id
)
SELECT 
  '📊 Neue Struktur:' as info,
  rp.registered_ids as neue_invited_players,
  ite.imported_as_external as neue_external_players_from_imported
FROM registered_players rp
LEFT JOIN imported_to_external ite ON rp.training_id = ite.training_id;

-- ============================================================
-- SCHRITT 3: UPDATE das Training
-- ============================================================

WITH current_training AS (
  SELECT 
    id,
    title,
    invited_players,
    external_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  ORDER BY created_at DESC
  LIMIT 1
),
invited_breakdown AS (
  SELECT 
    ct.id as training_id,
    unnest(ct.invited_players) as player_id
  FROM current_training ct
),
player_classification AS (
  SELECT 
    ib.training_id,
    ib.player_id,
    p.id as is_registered,
    ip.id as is_imported,
    ip.name as imported_name,
    ip.import_lk as imported_lk
  FROM invited_breakdown ib
  LEFT JOIN players p ON ib.player_id = p.id
  LEFT JOIN imported_players ip ON ib.player_id = ip.id
),
registered_players AS (
  SELECT 
    training_id,
    array_agg(player_id) as registered_ids
  FROM player_classification
  WHERE is_registered IS NOT NULL
  GROUP BY training_id
),
imported_to_external AS (
  SELECT 
    training_id,
    jsonb_agg(
      jsonb_build_object(
        'name', imported_name,
        'lk', imported_lk,
        'club', 'Wartet auf Registrierung',
        'email', NULL,
        'phone', NULL,
        'imported_player_id', player_id
      )
    ) as imported_as_external
  FROM player_classification
  WHERE is_imported IS NOT NULL
  GROUP BY training_id
),
merged_external AS (
  SELECT 
    ct.id as training_id,
    -- Merge alte external_players mit neuen imported_as_external
    COALESCE(ct.external_players, '[]'::jsonb) || COALESCE(ite.imported_as_external, '[]'::jsonb) as new_external_players
  FROM current_training ct
  LEFT JOIN imported_to_external ite ON ct.id = ite.training_id
)
UPDATE training_sessions ts
SET 
  invited_players = rp.registered_ids,
  external_players = me.new_external_players
FROM registered_players rp
JOIN merged_external me ON rp.training_id = me.training_id
WHERE ts.id = rp.training_id;

SELECT '✅ Training aktualisiert!' as status;

-- ============================================================
-- SCHRITT 4: Erstelle training_attendance für registrierte Spieler
-- ============================================================

WITH current_training AS (
  SELECT 
    id,
    invited_players
  FROM training_sessions
  WHERE title = 'Volkers Hallenhelden'
  ORDER BY created_at DESC
  LIMIT 1
),
attendance_to_create AS (
  SELECT 
    ct.id as session_id,
    unnest(ct.invited_players) as player_id,
    'pending' as status,
    NULL::timestamp as response_date,
    NOW() as created_at
  FROM current_training ct
)
INSERT INTO training_attendance (session_id, player_id, status, response_date, created_at)
SELECT session_id, player_id, status, response_date, created_at
FROM attendance_to_create
ON CONFLICT (session_id, player_id) DO NOTHING;

SELECT '✅ Training attendance erstellt!' as status;

-- ============================================================
-- FINAL: Zeige repariertes Training
-- ============================================================

SELECT 
  '📊 Repariertes Training:' as info,
  id,
  title,
  invited_players,
  array_length(invited_players, 1) as invited_count,
  external_players,
  jsonb_array_length(external_players) as external_count
FROM training_sessions
WHERE title = 'Volkers Hallenhelden'
ORDER BY created_at DESC
LIMIT 1;

SELECT 
  '📊 Training Attendance:' as info,
  ta.session_id,
  p.name as player_name,
  ta.status
FROM training_attendance ta
JOIN players p ON ta.player_id = p.id
JOIN training_sessions ts ON ta.session_id = ts.id
WHERE ts.title = 'Volkers Hallenhelden';

SELECT '✅ FIX_EXISTING_TRAINING.sql abgeschlossen!' as status;
