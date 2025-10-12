-- ================================================================
-- MANUAL MERGE: Markus Wilwerscheid + VKC Köln Team
-- ================================================================
-- Ziel: Nachträglicher Merge von imported_player → player
--       + Team-Zuordnung zu VKC Köln
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
  team_id,
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
-- 3. Hole Team-ID von importiertem Spieler (VKC Köln)
-- ============================================================
SELECT 
  '🏆 Team-Info von imported_player:' as info,
  ip.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM imported_players ip
JOIN team_info ti ON ip.team_id = ti.id
WHERE ip.name = 'Markus Wilwerscheid';

-- ============================================================
-- 4. Erstelle player_teams Eintrag
-- ============================================================
WITH player_info AS (
  SELECT id FROM players WHERE email = 'markus@domrauschen.com'
),
team_info AS (
  SELECT team_id FROM imported_players WHERE name = 'Markus Wilwerscheid'
)
INSERT INTO player_teams (player_id, team_id, role, is_primary)
SELECT 
  p.id,
  t.team_id,
  'player',
  true  -- Primäres Team
FROM player_info p, team_info t
ON CONFLICT (player_id, team_id) DO NOTHING
RETURNING 
  player_id,
  team_id,
  role,
  is_primary;

-- ============================================================
-- 5. Merge imported_player
-- ============================================================
UPDATE imported_players
SET 
  status = 'merged',
  merged_to_player_id = (SELECT id FROM players WHERE email = 'markus@domrauschen.com'),
  merged_at = NOW()
WHERE name = 'Markus Wilwerscheid'
RETURNING id, name, status, merged_to_player_id;

-- ============================================================
-- 6. Übertrage Training-Einladungen
-- ============================================================
SELECT merge_training_invites_after_onboarding(
  'a83ff4ca-22f7-4d8f-a088-61c9f6edf6e6'::uuid,  -- imported_player_id
  (SELECT id FROM players WHERE email = 'markus@domrauschen.com')  -- new_player_id
);

-- ============================================================
-- 7. Bestätigung - Komplette Übersicht
-- ============================================================
SELECT 
  '✅ Merge abgeschlossen - Player:' as info,
  p.id,
  p.name,
  p.email,
  p.current_lk
FROM players p
WHERE p.email = 'markus@domrauschen.com';

SELECT 
  '✅ Team-Zuordnung:' as info,
  pt.id,
  p.name as player_name,
  ti.club_name,
  ti.team_name,
  ti.category,
  pt.role,
  pt.is_primary
FROM player_teams pt
JOIN players p ON pt.player_id = p.id
JOIN team_info ti ON pt.team_id = ti.id
WHERE p.email = 'markus@domrauschen.com';

SELECT 
  '✅ Training-Einladungen:' as info,
  COUNT(ta.id) as training_count,
  COUNT(CASE WHEN ta.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN ta.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN ta.status = 'declined' THEN 1 END) as declined_count
FROM training_attendance ta
JOIN players p ON ta.player_id = p.id
WHERE p.email = 'markus@domrauschen.com';

SELECT 
  '✅ Imported Player Status:' as info,
  ip.name,
  ip.status,
  ip.merged_to_player_id,
  ip.merged_at
FROM imported_players ip
WHERE ip.name = 'Markus Wilwerscheid';

SELECT '🎾 MANUAL_MERGE_MARKUS_WITH_TEAM.sql abgeschlossen!' as status;
