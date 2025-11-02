-- =====================================================
-- Fix: Update Herren 55 Matches Season
-- Description: Setzt die richtige Saison für VKC Herren 55 Matches
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- SCHRITT 1: Finde VKC Herren 55 Team
-- ========================================

DO $$
DECLARE
  v_team_id UUID;
  v_updated_count INTEGER;
  rec RECORD;
BEGIN
  -- Hole Team ID
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
  AND category ILIKE '%Herren 55%'
  LIMIT 1;
  
  IF v_team_id IS NULL THEN
    RAISE NOTICE '❌ VKC Herren 55 Team nicht gefunden!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'VKC Herren 55 Team ID: %', v_team_id;
  
  -- ========================================
  -- SCHRITT 2: Update Matches auf aktuelle Saison
  -- ========================================
  
  -- Prüfe aktuelle Matches
  RAISE NOTICE '';
  RAISE NOTICE '📊 Aktuelle Matches:';
  FOR rec IN (
    SELECT 
      id,
      match_date,
      season,
      status
    FROM matchdays
    WHERE home_team_id = v_team_id
       OR away_team_id = v_team_id
    ORDER BY match_date DESC
  ) LOOP
    RAISE NOTICE '  Match: % | Datum: % | Saison: % | Status: %', 
      rec.id, rec.match_date, rec.season, rec.status;
  END LOOP;
  
  -- Update auf Winter 2025/26
  UPDATE matchdays
  SET season = 'winter_25_26'
  WHERE (home_team_id = v_team_id OR away_team_id = v_team_id)
  AND season = 'winter';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ % Matches auf Saison "winter_25_26" aktualisiert', v_updated_count;
  
  -- ========================================
  -- SCHRITT 3: Prüfe auch team_seasons
  -- ========================================
  
  -- Existiert team_seasons Eintrag für Herren 55?
  IF NOT EXISTS (
    SELECT 1 FROM team_seasons
    WHERE team_id = v_team_id
    AND season = 'winter_25_26'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Kein team_seasons Eintrag für winter_25_26 gefunden!';
    RAISE NOTICE '➕ Erstelle team_seasons Eintrag...';
    
    INSERT INTO team_seasons (
      team_id,
      season,
      league,
      group_name,
      team_size,
      is_active
    )
    VALUES (
      v_team_id,
      'winter_25_26',
      'Bezirksliga',  -- Anpassen falls anders
      'Gruppe A',     -- Anpassen falls anders
      6,              -- Standard Team-Größe
      true
    );
    
    RAISE NOTICE '✅ team_seasons Eintrag erstellt';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ team_seasons Eintrag existiert bereits';
  END IF;
  
  -- ========================================
  -- VERIFICATION
  -- ========================================
  
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '📊 FINALE ÜBERSICHT';
  RAISE NOTICE '===========================================';
  
  FOR rec IN (
    SELECT 
      m.id,
      m.match_date,
      m.season,
      ht.club_name || ' vs ' || at.club_name as matchup
    FROM matchdays m
    LEFT JOIN team_info ht ON ht.id = m.home_team_id
    LEFT JOIN team_info at ON at.id = m.away_team_id
    WHERE m.home_team_id = v_team_id
       OR m.away_team_id = v_team_id
    ORDER BY m.match_date DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE '  % | % | Saison: %', 
      TO_CHAR(rec.match_date, 'DD.MM.YYYY'),
      rec.matchup,
      rec.season;
  END LOOP;
  
END $$;

-- ========================================
-- ALTERNATIVE: Manuelle Updates
-- ========================================

-- Falls das Script Fehler hat, kannst du auch direkt ausführen:

/*
-- Update Saison für alle VKC Herren 55 Matches
UPDATE matchdays
SET season = 'winter_25_26'
WHERE home_team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%VKC%' 
    AND category ILIKE '%Herren 55%'
  )
  OR away_team_id IN (
    SELECT id FROM team_info 
    WHERE club_name ILIKE '%VKC%' 
    AND category ILIKE '%Herren 55%'
  );

-- Erstelle team_seasons falls nicht vorhanden
INSERT INTO team_seasons (team_id, season, league, group_name, team_size, is_active)
SELECT 
  id,
  'winter_25_26',
  'Bezirksliga',
  'Gruppe A',
  6,
  true
FROM team_info
WHERE club_name ILIKE '%VKC%'
AND category ILIKE '%Herren 55%'
ON CONFLICT (team_id, season) DO NOTHING;
*/

