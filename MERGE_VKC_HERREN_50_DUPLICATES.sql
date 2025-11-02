-- ============================================
-- MERGE VKC Herren 50 Duplikate
-- ============================================
-- MASTER: 498f29ff-2a53-4c55-afd0-6f7112654153 (5 Matches)
-- DUP1:   a0759456-07fb-4536-953b-2a9d823bb8ef (2 Spieler)
-- ============================================

DO $$
DECLARE
  v_master_team_id UUID := '498f29ff-2a53-4c55-afd0-6f7112654153';
  v_dup1_id UUID := 'a0759456-07fb-4536-953b-2a9d823bb8ef';
  v_player_count INTEGER;
  v_match_count INTEGER;
  rec RECORD;
BEGIN
  
  RAISE NOTICE '🔧 MERGE VKC Herren 50 Duplikate';
  RAISE NOTICE '';
  
  -- STATUS VOR MERGE
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships WHERE team_id = v_master_team_id AND is_active = true;
  RAISE NOTICE '📊 MASTER hat % Spieler', v_player_count;
  
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships WHERE team_id = v_dup1_id AND is_active = true;
  RAISE NOTICE '📊 DUP1 hat % Spieler', v_player_count;
  
  RAISE NOTICE '';
  
  -- SPIELER VON DUP1 ZUM MASTER
  RAISE NOTICE '👥 MERGE SPIELER:';
  
  FOR rec IN (
    SELECT player_id, role, season, created_at
    FROM team_memberships
    WHERE team_id = v_dup1_id AND is_active = true
  ) LOOP
    
    IF EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = v_master_team_id AND player_id = rec.player_id AND is_active = true
    ) THEN
      RAISE NOTICE '  ℹ️  Spieler % bereits im MASTER', rec.player_id;
    ELSE
      RAISE NOTICE '  ➕ Füge Spieler % zum MASTER', rec.player_id;
      
      INSERT INTO team_memberships (
        player_id, team_id, role, is_primary, season, is_active, created_at
      ) VALUES (
        rec.player_id, v_master_team_id, rec.role, false, rec.season, true, rec.created_at
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- UPDATE PRIMARY_TEAM_ID
  RAISE NOTICE '🔗 UPDATE PRIMARY_TEAM_ID:';
  
  UPDATE players_unified
  SET primary_team_id = v_master_team_id
  WHERE primary_team_id = v_dup1_id;
  
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Spieler updated', v_player_count;
  
  RAISE NOTICE '';
  
  -- LÖSCHE ALTE MEMBERSHIPS
  RAISE NOTICE '🗑️  LÖSCHE ALTE MEMBERSHIPS:';
  
  DELETE FROM team_memberships WHERE team_id = v_dup1_id;
  GET DIAGNOSTICS v_player_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Memberships gelöscht', v_player_count;
  
  RAISE NOTICE '';
  
  -- LÖSCHE DUPLIKAT TEAM
  RAISE NOTICE '🗑️  LÖSCHE DUPLIKAT TEAM:';
  
  DELETE FROM team_info WHERE id = v_dup1_id;
  RAISE NOTICE '  ✅ Team gelöscht';
  
  RAISE NOTICE '';
  
  -- STATUS NACH MERGE
  SELECT COUNT(*) INTO v_player_count
  FROM team_memberships WHERE team_id = v_master_team_id AND is_active = true;
  
  SELECT COUNT(*) INTO v_match_count
  FROM matchdays WHERE home_team_id = v_master_team_id OR away_team_id = v_master_team_id;
  
  RAISE NOTICE '📊 FINAL: MASTER hat % Spieler, % Matches', v_player_count, v_match_count;
  RAISE NOTICE '🎉 MERGE ERFOLGREICH!';
  RAISE NOTICE '';
  
END $$;

-- VERIFICATION
SELECT
  '✅ CHECK' as status,
  COUNT(*) as herren50_count,
  (SELECT COUNT(*) FROM team_memberships tm 
   WHERE tm.team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category ILIKE '%Herren 50%')
   AND tm.is_active = true) as total_players,
  (SELECT COUNT(*) FROM matchdays m
   WHERE m.home_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category ILIKE '%Herren 50%')
   OR m.away_team_id IN (SELECT id FROM team_info WHERE club_name ILIKE '%VKC%' AND category ILIKE '%Herren 50%')) as total_matches
FROM team_info
WHERE club_name ILIKE '%VKC%' AND category ILIKE '%Herren 50%';

