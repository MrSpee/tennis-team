-- ============================================
-- COMPLETE SEASON NORMALIZATION
-- ============================================
-- Löst Daten-Redundanz und Inkonsistenzen
-- Macht team_seasons zur Single Source of Truth
-- ============================================

DO $$
DECLARE
  v_teams_fixed INTEGER := 0;
  v_matchdays_fixed INTEGER := 0;
  v_memberships_fixed INTEGER := 0;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 SEASON NORMALIZATION SCRIPT';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- 1️⃣  NORMALISIERE matchdays.season
  -- ====================================
  RAISE NOTICE '📅 1️⃣  NORMALISIERE matchdays.season:';
  RAISE NOTICE '========================================';
  
  UPDATE matchdays 
  SET season = 'Winter 2025/26'
  WHERE season IN ('winter', 'winter_25_26', 'Winter', 'winter_2025_26');
  
  GET DIAGNOSTICS v_matchdays_fixed = ROW_COUNT;
  RAISE NOTICE '  ✅ % matchdays normalisiert', v_matchdays_fixed;
  RAISE NOTICE '';
  
  -- ====================================
  -- 2️⃣  BEREINIGE DUPLIKATE IN team_memberships
  -- ====================================
  RAISE NOTICE '👥 2️⃣  BEREINIGE DUPLIKATE IN team_memberships:';
  RAISE NOTICE '========================================';
  
  -- Finde und lösche ältere Duplikate (behalte neueste pro player_id + team_id)
  DELETE FROM team_memberships tm1
  WHERE EXISTS (
    SELECT 1 FROM team_memberships tm2
    WHERE tm2.player_id = tm1.player_id
      AND tm2.team_id = tm1.team_id
      AND tm2.season IN ('Winter 2025/26', 'Winter', 'winter', 'winter_25_26')
      AND tm1.season IN ('Winter 2025/26', 'Winter', 'winter', 'winter_25_26')
      AND tm2.season != tm1.season
      AND (
        -- Behalte 'Winter 2025/26' wenn vorhanden
        (tm2.season = 'Winter 2025/26' AND tm1.season != 'Winter 2025/26')
        OR
        -- Sonst behalte das neuere
        (tm2.season != 'Winter 2025/26' AND tm1.season != 'Winter 2025/26' AND tm2.created_at > tm1.created_at)
      )
  );
  
  GET DIAGNOSTICS v_memberships_fixed = ROW_COUNT;
  RAISE NOTICE '  ✅ % duplikate memberships gelöscht', v_memberships_fixed;
  
  -- Jetzt normalisiere die verbleibenden
  UPDATE team_memberships 
  SET season = 'Winter 2025/26'
  WHERE season IN ('Winter', 'winter', 'winter_25_26') OR season IS NULL;
  
  GET DIAGNOSTICS v_memberships_fixed = ROW_COUNT;
  RAISE NOTICE '  ✅ % memberships normalisiert', v_memberships_fixed;
  RAISE NOTICE '';
  
  -- ====================================
  -- 3️⃣  ERSTELLE FEHLENDE team_seasons
  -- ====================================
  RAISE NOTICE '🏆 3️⃣  ERSTELLE FEHLENDE team_seasons:';
  RAISE NOTICE '========================================';
  
  -- Für jedes Team ohne team_seasons
  INSERT INTO team_seasons (team_id, season, league, group_name, team_size, is_active)
  SELECT 
    ti.id as team_id,
    'Winter 2025/26',
    COALESCE(
      (SELECT ts2.league FROM team_seasons ts2 WHERE ts2.team_id = ti.id ORDER BY ts2.created_at DESC LIMIT 1),
      '2. Bezirksliga'
    ) as league,
    COALESCE(
      (SELECT ts2.group_name FROM team_seasons ts2 WHERE ts2.team_id = ti.id ORDER BY ts2.created_at DESC LIMIT 1),
      ''
    ) as group_name,
    4 as team_size,
    true
  FROM team_info ti
  WHERE NOT EXISTS (
    SELECT 1 FROM team_seasons ts
    WHERE ts.team_id = ti.id
      AND ts.season = 'Winter 2025/26'
      AND ts.is_active = true
  );
  
  GET DIAGNOSTICS v_teams_fixed = ROW_COUNT;
  RAISE NOTICE '  ✅ % teams bekamen neue team_seasons', v_teams_fixed;
  RAISE NOTICE '';
  
  -- ====================================
  -- 4️⃣  DEAKTIVIERE ALTE SEASONS
  -- ====================================
  RAISE NOTICE '🗄️  4️⃣  DEAKTIVIERE ALTE SEASONS:';
  RAISE NOTICE '========================================';
  
  UPDATE team_seasons 
  SET is_active = false
  WHERE season != 'Winter 2025/26'
    AND is_active = true;
  
  GET DIAGNOSTICS v_teams_fixed = ROW_COUNT;
  RAISE NOTICE '  ✅ % alte seasons deaktiviert', v_teams_fixed;
  RAISE NOTICE '';
  
  -- ====================================
  -- 5️⃣  SUMMARY
  -- ====================================
  RAISE NOTICE '📊 5️⃣  ZUSAMMENFASSUNG:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Matchdays normalisiert: %', v_matchdays_fixed;
  RAISE NOTICE '  Memberships normalisiert: %', v_memberships_fixed;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 NORMALISIERUNG ABGESCHLOSSEN!';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: Alle VKC Teams
-- ====================================

SELECT 
  '✅ VKC TEAMS VERIFICATION' as check_type,
  ti.id,
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = ti.id AND tm.is_active = true) as active_players,
  (SELECT COUNT(*) FROM matchdays m WHERE m.home_team_id = ti.id OR m.away_team_id = ti.id) as total_matches
FROM team_info ti
LEFT JOIN team_seasons ts ON ts.team_id = ti.id AND ts.is_active = true
WHERE ti.club_name ILIKE '%VKC%'
ORDER BY ti.category;

-- ====================================
-- ALLE TEAMS CHECK
-- ====================================

SELECT 
  '⚠️ TEAMS OHNE SEASON' as issue,
  COUNT(*) as team_count
FROM team_info ti
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons ts
  WHERE ts.team_id = ti.id
    AND ts.is_active = true
);

