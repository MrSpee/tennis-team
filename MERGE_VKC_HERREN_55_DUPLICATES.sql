-- =====================================================
-- MERGE: VKC Köln Herren 55 Duplikate zusammenführen
-- Description: Es gibt 4x "VKC Köln Herren 55" Teams!
--              Diese müssen zu EINEM Team zusammengeführt werden
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- SCHRITT 1: Zeige das Problem
-- ========================================

SELECT 
  '❌ PROBLEM: Team-Duplikate' as info,
  id,
  club_name,
  team_name,
  category,
  created_at,
  (SELECT COUNT(*) FROM matchdays m 
   WHERE m.home_team_id = team_info.id 
      OR m.away_team_id = team_info.id) as match_count,
  (SELECT COUNT(*) FROM team_memberships tm 
   WHERE tm.team_id = team_info.id 
   AND tm.is_active = true) as member_count
FROM team_info
WHERE club_name ILIKE '%VKC%'
AND category = 'Herren 55'
ORDER BY created_at ASC;

-- ========================================
-- SCHRITT 2: Wähle das RICHTIGE (älteste) Team als Master
-- ========================================

DO $$
DECLARE
  v_master_team_id UUID;
  v_duplicate_ids UUID[];
  v_merged_count INTEGER := 0;
  v_theo_id UUID;
  rec RECORD;
BEGIN
  -- Wähle das ÄLTESTE Team als Master (hat wahrscheinlich die meisten Daten)
  SELECT id INTO v_master_team_id
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
  AND category = 'Herren 55'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_master_team_id IS NULL THEN
    RAISE NOTICE '❌ Kein VKC Herren 55 Team gefunden!';
    RETURN;
  END IF;
  
  -- Sammle alle Duplikat-IDs (außer Master)
  SELECT ARRAY_AGG(id) INTO v_duplicate_ids
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
  AND category = 'Herren 55'
  AND id != v_master_team_id;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE '🔧 MERGE VKC HERREN 55 DUPLIKATE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Master Team ID: %', v_master_team_id;
  RAISE NOTICE 'Duplikat IDs: %', v_duplicate_ids;
  RAISE NOTICE '';
  
  -- ========================================
  -- SCHRITT 3: Merge Matches
  -- ========================================
  
  RAISE NOTICE '📅 Merge Matches...';
  
  -- Update home_team_id
  UPDATE matchdays
  SET home_team_id = v_master_team_id
  WHERE home_team_id = ANY(v_duplicate_ids);
  
  GET DIAGNOSTICS v_merged_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Home-Matches umgeleitet', v_merged_count;
  
  -- Update away_team_id
  UPDATE matchdays
  SET away_team_id = v_master_team_id
  WHERE away_team_id = ANY(v_duplicate_ids);
  
  GET DIAGNOSTICS v_merged_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Away-Matches umgeleitet', v_merged_count;
  
  -- ========================================
  -- SCHRITT 4: Merge Team-Memberships
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE '👥 Merge Team-Memberships...';
  
  -- Update team_memberships (mit manueller Duplikat-Prüfung)
  FOR rec IN (
    SELECT DISTINCT
      tm.player_id,
      tm.role,
      tm.is_primary,
      tm.season
    FROM team_memberships tm
    WHERE tm.team_id = ANY(v_duplicate_ids)
    AND tm.is_active = true
  ) LOOP
    -- Prüfe ob bereits existiert
    IF EXISTS (
      SELECT 1 FROM team_memberships
      WHERE player_id = rec.player_id
      AND team_id = v_master_team_id
      AND is_active = true
    ) THEN
      -- Update existing
      UPDATE team_memberships
      SET 
        role = rec.role,
        season = COALESCE(rec.season, 'Winter 2025/26')
      WHERE player_id = rec.player_id
      AND team_id = v_master_team_id;
    ELSE
      -- Insert new
      INSERT INTO team_memberships (
        player_id,
        team_id,
        role,
        is_primary,
        is_active,
        season
      )
      VALUES (
        rec.player_id,
        v_master_team_id,
        rec.role,
        rec.is_primary,
        true,
        COALESCE(rec.season, 'Winter 2025/26')
      );
    END IF;
    
    v_merged_count := v_merged_count + 1;
  END LOOP;
  
  RAISE NOTICE '  ✅ % Memberships zusammengeführt', v_merged_count;
  
  -- ========================================
  -- SCHRITT 5: Deaktiviere Duplikat-Teams
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Deaktiviere alte Duplikate...';
  
  -- Lösche Duplikat-Teams (CASCADE löscht automatisch verwaiste Memberships)
  DELETE FROM team_info
  WHERE id = ANY(v_duplicate_ids);
  
  GET DIAGNOSTICS v_merged_count = ROW_COUNT;
  RAISE NOTICE '  ✅ % Duplikat-Teams gelöscht', v_merged_count;
  
  -- ========================================
  -- SCHRITT 6: Füge Theo zum Master-Team hinzu
  -- ========================================
  
  SELECT id INTO v_theo_id
  FROM players_unified
  WHERE LOWER(name) LIKE '%theo%tester%'
  LIMIT 1;
  
  IF v_theo_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '👤 Füge Theo Tester zum Master-Team hinzu...';
    
    -- Prüfe ob bereits existiert
    IF EXISTS (
      SELECT 1 FROM team_memberships
      WHERE player_id = v_theo_id
      AND team_id = v_master_team_id
      AND is_active = true
    ) THEN
      -- Update existing
      UPDATE team_memberships
      SET season = 'Winter 2025/26'
      WHERE player_id = v_theo_id
      AND team_id = v_master_team_id;
      
      RAISE NOTICE '  ✅ Theo war bereits im Team (aktualisiert)';
    ELSE
      -- Insert new
      INSERT INTO team_memberships (
        player_id,
        team_id,
        role,
        is_primary,
        is_active,
        season
      )
      VALUES (
        v_theo_id,
        v_master_team_id,
        'player',
        false,
        true,
        'Winter 2025/26'
      );
      
      RAISE NOTICE '  ✅ Theo wurde zum Team hinzugefügt!';
    END IF;
  END IF;
  
  -- ========================================
  -- VERIFICATION
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '📊 FINALE ÜBERSICHT';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  
  -- Zeige finales Team
  SELECT 
    id,
    club_name,
    team_name,
    category,
    created_at
  INTO rec
  FROM team_info
  WHERE id = v_master_team_id;
  
  RAISE NOTICE 'Master Team: % % (%) [ID: %]', 
    rec.club_name, 
    rec.team_name, 
    rec.category,
    SUBSTRING(rec.id::TEXT, 1, 8);
  
  -- Zähle Matches
  SELECT COUNT(*) INTO v_merged_count
  FROM matchdays
  WHERE home_team_id = v_master_team_id
     OR away_team_id = v_master_team_id;
  
  RAISE NOTICE 'Matches: %', v_merged_count;
  
  -- Zähle Members
  SELECT COUNT(*) INTO v_merged_count
  FROM team_memberships
  WHERE team_id = v_master_team_id
  AND is_active = true;
  
  RAISE NOTICE 'Mitglieder: %', v_merged_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ MERGE ABGESCHLOSSEN!';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NÄCHSTER SCHRITT:';
  RAISE NOTICE '   1. Browser Hard Refresh (Cmd+Shift+R)';
  RAISE NOTICE '   2. Matches sollten jetzt sichtbar sein';
  RAISE NOTICE '';
  
END $$;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Zeige finale Team-Struktur
SELECT 
  '✅ VKC Teams nach Merge' as info,
  id,
  club_name,
  team_name,
  category,
  (SELECT COUNT(*) FROM matchdays m 
   WHERE m.home_team_id = team_info.id 
      OR m.away_team_id = team_info.id) as match_count,
  (SELECT COUNT(*) FROM team_memberships tm 
   WHERE tm.team_id = team_info.id 
   AND tm.is_active = true) as member_count
FROM team_info
WHERE club_name ILIKE '%VKC%'
ORDER BY category, team_name;

-- Zeige Theo's Teams
SELECT 
  '✅ Theo Teams nach Merge' as info,
  t.club_name,
  t.team_name,
  t.category,
  tm.is_primary,
  tm.role
FROM team_memberships tm
JOIN team_info t ON t.id = tm.team_id
JOIN players_unified p ON p.id = tm.player_id
WHERE LOWER(p.name) LIKE '%theo%tester%'
AND tm.is_active = true
ORDER BY tm.is_primary DESC, t.category;

