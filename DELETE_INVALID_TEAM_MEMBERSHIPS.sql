-- ============================================
-- DELETE INVALID TEAM MEMBERSHIPS
-- ============================================
-- Löscht team_memberships mit team_id = NULL
-- ============================================

-- ====================================
-- DETAILS DER ZU LÖSCHENDEN MEMBERSHIPS
-- ====================================

SELECT 
  '📋 DETAILS (vor DELETE)' as step,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.season,
  p.name as player_name,
  p.email
FROM team_memberships tm
LEFT JOIN players_unified p ON p.id = tm.player_id
WHERE tm.team_id IS NULL;

-- ====================================
-- DELETE AUSFÜHREN
-- ====================================

DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 LÖSCHE UNGÜLTIGE TEAM MEMBERSHIPS';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- Finde ungültige Memberships
  RAISE NOTICE '🔍 Suche nach ungültigen Memberships...';
  
  SELECT COUNT(*) INTO v_deleted
  FROM team_memberships
  WHERE team_id IS NULL;
  
  RAISE NOTICE '⚠️ Gefunden: % Memberships mit team_id = NULL', v_deleted;
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ LÖSCHE JETZT...';
  
  -- Lösche ungültige Memberships
  DELETE FROM team_memberships
  WHERE team_id IS NULL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ % UNGÜLTIGE MEMBERSHIPS GELÖSCHT!', v_deleted;
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION (nach DELETE)
-- ====================================

SELECT 
  '✅ VERIFICATION' as step,
  COUNT(*) as remaining_invalid_memberships
FROM team_memberships
WHERE team_id IS NULL;

