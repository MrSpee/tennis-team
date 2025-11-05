-- ==========================================
-- SETUP HERREN 40 LIGA TABELLE
-- Winter 2025/26 - 1. Kreisliga Gr. 046
-- ==========================================

-- 1. PRÜFE WELCHE TEAMS EXISTIEREN
SELECT 
  id,
  team_name,
  club_name,
  category
FROM team_info
WHERE 
  (club_name ILIKE '%sürth%' OR club_name ILIKE '%suerth%') OR
  (club_name ILIKE '%ford%' AND club_name ILIKE '%köln%') OR
  (club_name ILIKE '%colonius%') OR
  (club_name ILIKE '%ensen%' AND club_name ILIKE '%westhoven%') OR
  (club_name ILIKE '%leverkusen%')
ORDER BY club_name, team_name;

-- ==========================================
-- 2. FINDE EXAKTE TEAM IDs
-- ==========================================

DO $$
DECLARE
  v_suerth_id UUID;
  v_ford_id UUID;
  v_colonius_id UUID;
  v_ensen_id UUID;
  v_leverkusen_id UUID;
  v_season TEXT := 'Winter 2025/26';
  v_league TEXT := '1. Kreisliga';
  v_group TEXT := 'Gr. 046';
BEGIN
  
  RAISE NOTICE '🔍 Suche Teams...';
  
  -- SV RG Sürth 1
  SELECT id INTO v_suerth_id
  FROM team_info
  WHERE (club_name ILIKE '%sürth%' OR club_name ILIKE '%suerth%')
    AND category ILIKE '%herren%40%'
  LIMIT 1;
  
  -- TC Ford Köln 2
  SELECT id INTO v_ford_id
  FROM team_info
  WHERE club_name ILIKE '%ford%'
    AND club_name ILIKE '%köln%'
    AND category ILIKE '%herren%40%'
  LIMIT 1;
  
  -- TC Colonius 3
  SELECT id INTO v_colonius_id
  FROM team_info
  WHERE club_name ILIKE '%colonius%'
    AND category ILIKE '%herren%40%'
  LIMIT 1;
  
  -- TV Ensen Westhoven 1
  SELECT id INTO v_ensen_id
  FROM team_info
  WHERE club_name ILIKE '%ensen%'
    AND club_name ILIKE '%westhoven%'
    AND category ILIKE '%herren%40%'
  LIMIT 1;
  
  -- TG Leverkusen 2
  SELECT id INTO v_leverkusen_id
  FROM team_info
  WHERE club_name ILIKE '%leverkusen%'
    AND category ILIKE '%herren%40%'
  LIMIT 1;
  
  RAISE NOTICE '📋 Gefundene Teams:';
  RAISE NOTICE '  SV RG Sürth: %', v_suerth_id;
  RAISE NOTICE '  TC Ford Köln: %', v_ford_id;
  RAISE NOTICE '  TC Colonius: %', v_colonius_id;
  RAISE NOTICE '  TV Ensen Westhoven: %', v_ensen_id;
  RAISE NOTICE '  TG Leverkusen: %', v_leverkusen_id;
  
  -- ==========================================
  -- 3. ERSTELLE/UPDATE TEAM_SEASONS EINTRÄGE
  -- ==========================================
  
  -- Helper Function: Upsert team_season
  CREATE OR REPLACE FUNCTION upsert_team_season(
    p_team_id UUID,
    p_season TEXT,
    p_league TEXT,
    p_group TEXT
  ) RETURNS VOID AS $func$
  BEGIN
    -- Prüfe ob Eintrag existiert
    IF EXISTS (
      SELECT 1 FROM team_seasons 
      WHERE team_id = p_team_id 
        AND season = p_season
    ) THEN
      -- UPDATE
      UPDATE team_seasons
      SET 
        league = p_league,
        group_name = p_group,
        is_active = true,
        updated_at = NOW()
      WHERE team_id = p_team_id
        AND season = p_season;
      
      RAISE NOTICE '✅ Updated: %', p_team_id;
    ELSE
      -- INSERT
      INSERT INTO team_seasons (team_id, season, league, group_name, team_size, is_active)
      VALUES (p_team_id, p_season, p_league, p_group, 6, true);
      
      RAISE NOTICE '✨ Created: %', p_team_id;
    END IF;
  END;
  $func$ LANGUAGE plpgsql;
  
  -- Führe Upserts durch
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Erstelle/Aktualisiere team_seasons Einträge...';
  
  IF v_suerth_id IS NOT NULL THEN
    PERFORM upsert_team_season(v_suerth_id, v_season, v_league, v_group);
  END IF;
  
  IF v_ford_id IS NOT NULL THEN
    PERFORM upsert_team_season(v_ford_id, v_season, v_league, v_group);
  END IF;
  
  IF v_colonius_id IS NOT NULL THEN
    PERFORM upsert_team_season(v_colonius_id, v_season, v_league, v_group);
  END IF;
  
  IF v_ensen_id IS NOT NULL THEN
    PERFORM upsert_team_season(v_ensen_id, v_season, v_league, v_group);
  END IF;
  
  IF v_leverkusen_id IS NOT NULL THEN
    PERFORM upsert_team_season(v_leverkusen_id, v_season, v_league, v_group);
  END IF;
  
  -- Cleanup
  DROP FUNCTION upsert_team_season(UUID, TEXT, TEXT, TEXT);
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ FERTIG! Teams in Liga eingetragen.';
  
END $$;

-- ==========================================
-- 4. VERIFIZIERE EINTRÄGE
-- ==========================================

SELECT 
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.league,
  ts.group_name,
  ts.season,
  ts.is_active
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Kreisliga'
  AND ts.group_name = 'Gr. 046'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

