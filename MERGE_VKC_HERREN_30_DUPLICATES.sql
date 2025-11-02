-- ============================================
-- MERGE VKC Herren 30 Duplikate
-- ============================================
-- Verschmilzt 3x VKC Herren 30 Teams in ein MASTER-Team
-- 
-- MASTER (behalten): 8d06784e-1281-42a5-b21a-57760b1a4c7d (5 Matches)
-- DUPLIKAT 1:        6c38c710-28dd-41fe-b991-b7180ef23ca1 (2 Spieler)
-- DUPLIKAT 2:        13226200-a7cd-40df-96ae-6a19c8ef351e (1 Spieler)
-- ============================================

DO $$
DECLARE
  v_master_team_id UUID := '8d06784e-1281-42a5-b21a-57760b1a4c7d';
  v_dup1_id UUID := '6c38c710-28dd-41fe-b991-b7180ef23ca1';
  v_dup2_id UUID := '13226200-a7cd-40df-96ae-6a19c8ef351e';
  v_player_count INTEGER;
  v_match_count INTEGER;
  rec RECORD;
BEGIN
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 MERGE VKC Herren 30 Duplikate';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- 1️⃣  STATUS VOR DEM MERGE
  -- ====================================
  RAISE NOTICE '📊 1️⃣  STATUS VOR DEM MERGE:';
  RAISE NOTICE '================================';
  
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships
  WHERE team_id = v_master_team_id AND is_active = true;
  RAISE NOTICE '✅ MASTER hat % Spieler', v_player_count;
  
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships
  WHERE team_id = v_dup1_id AND is_active = true;
  RAISE NOTICE '⚠️  DUP1 hat % Spieler', v_player_count;
  
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships
  WHERE team_id = v_dup2_id AND is_active = true;
  RAISE NOTICE '⚠️  DUP2 hat % Spieler', v_player_count;
  
  SELECT COUNT(*) INTO v_match_count
  FROM matchdays
  WHERE home_team_id = v_master_team_id OR away_team_id = v_master_team_id;
  RAISE NOTICE '🏆 MASTER hat % Matches', v_match_count;
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 2️⃣  SPIELER VON DUP1 ZUM MASTER
  -- ====================================
  RAISE NOTICE '👥 2️⃣  MERGE SPIELER VON DUP1:';
  RAISE NOTICE '================================';
  
  FOR rec IN (
    SELECT player_id, role, season, created_at
    FROM team_memberships
    WHERE team_id = v_dup1_id AND is_active = true
  ) LOOP
    
    IF EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = v_master_team_id
        AND player_id = rec.player_id
        AND is_active = true
    ) THEN
      RAISE NOTICE '  ℹ️  Spieler % bereits im MASTER', rec.player_id;
      
      UPDATE team_memberships
      SET is_active = false
      WHERE team_id = v_dup1_id
        AND player_id = rec.player_id;
    ELSE
      RAISE NOTICE '  ➕ Füge Spieler % zum MASTER hinzu', rec.player_id;
      
      INSERT INTO team_memberships (
        player_id,
        team_id,
        role,
        is_primary,
        season,
        is_active,
        created_at
      ) VALUES (
        rec.player_id,
        v_master_team_id,
        rec.role,
        false,
        rec.season,
        true,
        rec.created_at
      );
      
      UPDATE team_memberships
      SET is_active = false
      WHERE team_id = v_dup1_id
        AND player_id = rec.player_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 3️⃣  SPIELER VON DUP2 ZUM MASTER
  -- ====================================
  RAISE NOTICE '👥 3️⃣  MERGE SPIELER VON DUP2:';
  RAISE NOTICE '================================';
  
  FOR rec IN (
    SELECT player_id, role, season, created_at
    FROM team_memberships
    WHERE team_id = v_dup2_id AND is_active = true
  ) LOOP
    
    IF EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = v_master_team_id
        AND player_id = rec.player_id
        AND is_active = true
    ) THEN
      RAISE NOTICE '  ℹ️  Spieler % bereits im MASTER', rec.player_id;
      
      UPDATE team_memberships
      SET is_active = false
      WHERE team_id = v_dup2_id
        AND player_id = rec.player_id;
    ELSE
      RAISE NOTICE '  ➕ Füge Spieler % zum MASTER hinzu', rec.player_id;
      
      INSERT INTO team_memberships (
        player_id,
        team_id,
        role,
        is_primary,
        season,
        is_active,
        created_at
      ) VALUES (
        rec.player_id,
        v_master_team_id,
        rec.role,
        false,
        rec.season,
        true,
        rec.created_at
      );
      
      UPDATE team_memberships
      SET is_active = false
      WHERE team_id = v_dup2_id
        AND player_id = rec.player_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 4️⃣  MATCHES SIND BEREITS BEIM MASTER
  -- ====================================
  RAISE NOTICE '🏆 4️⃣  MATCHES:';
  RAISE NOTICE '================================';
  RAISE NOTICE '✅ Alle 5 Matches sind bereits beim MASTER';
  RAISE NOTICE '';
  
  -- ====================================
  -- 5️⃣  UPDATE PRIMARY_TEAM_ID REFERENZEN
  -- ====================================
  RAISE NOTICE '🔗 5️⃣  UPDATE PRIMARY_TEAM_ID:';
  RAISE NOTICE '================================';
  
  -- Spieler die DUP1 als primary_team haben → MASTER
  UPDATE players_unified
  SET primary_team_id = v_master_team_id
  WHERE primary_team_id = v_dup1_id;
  
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Spieler von DUP1 → MASTER', v_player_count;
  
  -- Spieler die DUP2 als primary_team haben → MASTER
  UPDATE players_unified
  SET primary_team_id = v_master_team_id
  WHERE primary_team_id = v_dup2_id;
  
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Spieler von DUP2 → MASTER', v_player_count;
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 6️⃣  LÖSCHE ALTE TEAM_MEMBERSHIPS
  -- ====================================
  RAISE NOTICE '🗑️  6️⃣  LÖSCHE ALTE MEMBERSHIPS:';
  RAISE NOTICE '================================';
  
  DELETE FROM team_memberships WHERE team_id = v_dup1_id;
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Memberships von DUP1 gelöscht', v_player_count;
  
  DELETE FROM team_memberships WHERE team_id = v_dup2_id;
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Memberships von DUP2 gelöscht', v_player_count;
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 7️⃣  LÖSCHE DUPLIKATE TEAMS
  -- ====================================
  RAISE NOTICE '🗑️  7️⃣  LÖSCHE DUPLIKAT TEAMS:';
  RAISE NOTICE '================================';
  
  DELETE FROM team_info WHERE id = v_dup1_id;
  RAISE NOTICE '✅ DUP1 Team gelöscht';
  
  DELETE FROM team_info WHERE id = v_dup2_id;
  RAISE NOTICE '✅ DUP2 Team gelöscht';
  
  RAISE NOTICE '';
  
  -- ====================================
  -- 8️⃣  STATUS NACH DEM MERGE
  -- ====================================
  RAISE NOTICE '📊 8️⃣  STATUS NACH DEM MERGE:';
  RAISE NOTICE '================================';
  
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships
  WHERE team_id = v_master_team_id AND is_active = true;
  RAISE NOTICE '✅ MASTER hat nun % Spieler', v_player_count;
  
  SELECT COUNT(*) INTO v_match_count
  FROM matchdays
  WHERE home_team_id = v_master_team_id OR away_team_id = v_master_team_id;
  RAISE NOTICE '✅ MASTER hat % Matches', v_match_count;
  
  IF EXISTS (SELECT 1 FROM team_info WHERE id IN (v_dup1_id, v_dup2_id)) THEN
    RAISE NOTICE '⚠️  WARNUNG: Duplikate existieren noch!';
  ELSE
    RAISE NOTICE '✅ Alle Duplikate gelöscht';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 MERGE ERFOLGREICH!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  
END $$;

-- VERIFICATION
SELECT
  '✅ FINAL CHECK' as status,
  COUNT(*) as herren30_count,
  (SELECT COUNT(*) FROM team_memberships tm 
   WHERE tm.team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category = 'Herren 30')
   AND tm.is_active = true) as total_players,
  (SELECT COUNT(*) FROM matchdays m
   WHERE m.home_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category = 'Herren 30')
   OR m.away_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category = 'Herren 30')) as total_matches
FROM team_info
WHERE club_name ILIKE '%VKC%' AND category = 'Herren 30';
