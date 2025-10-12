-- ================================================================
-- MANUAL MERGE: Markus Wilwerscheid
-- ================================================================
-- Ziel: Nachträglicher Merge von imported_player → player
-- ================================================================

-- ============================================================
-- 1. Zeige aktuelle Situation
-- ============================================================
SELECT 
  '👤 Aktueller Player:' as info,
  id,
  name,
  email,
  current_lk
FROM players
WHERE name ILIKE '%markus%' AND email = 'markus@domrauschen.com';

SELECT 
  '⏳ Importierter Player:' as info,
  id,
  name,
  import_lk,
  status
FROM imported_players
WHERE name = 'Markus Wilwerscheid';

-- ============================================================
-- 2. Update Player-Name und LK
-- ============================================================
UPDATE players
SET 
  name = 'Markus Wilwerscheid',
  current_lk = 'LK 14.5',
  updated_at = NOW()
WHERE email = 'markus@domrauschen.com'
RETURNING id, name, email, current_lk;

-- ============================================================
-- 3. Merge imported_player
-- ============================================================
UPDATE imported_players
SET 
  status = 'merged',
  merged_to_player_id = (SELECT id FROM players WHERE email = 'markus@domrauschen.com'),
  merged_at = NOW()
WHERE name = 'Markus Wilwerscheid'
RETURNING id, name, status, merged_to_player_id;

-- ============================================================
-- 4. Übertrage Training-Einladungen
-- ============================================================
SELECT merge_training_invites_after_onboarding(
  'a83ff4ca-22f7-4d8f-a088-61c9f6edf6e6'::uuid,  -- imported_player_id
  (SELECT id FROM players WHERE email = 'markus@domrauschen.com')  -- new_player_id
);

-- ============================================================
-- 5. Bestätigung
-- ============================================================
SELECT 
  '✅ Merge abgeschlossen:' as info,
  p.id,
  p.name,
  p.current_lk,
  ip.status as imported_status,
  COUNT(ta.id) as training_count
FROM players p
LEFT JOIN imported_players ip ON ip.merged_to_player_id = p.id
LEFT JOIN training_attendance ta ON ta.player_id = p.id
WHERE p.email = 'markus@domrauschen.com'
GROUP BY p.id, p.name, p.current_lk, ip.status;

SELECT '✅ MANUAL_MERGE_MARKUS.sql abgeschlossen!' as status;
