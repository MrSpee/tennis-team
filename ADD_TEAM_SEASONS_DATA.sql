-- ============================================
-- ADD_TEAM_SEASONS_DATA.sql
-- Fügt team_seasons Daten für bestehende Teams hinzu
-- ============================================

-- 1️⃣ Finde alle Teams ohne team_seasons Einträge
DO $$
DECLARE
  team_record RECORD;
  new_season_id UUID;
BEGIN
  RAISE NOTICE '🔍 Suche Teams ohne team_seasons Einträge...';
  
  FOR team_record IN 
    SELECT ti.id, ti.team_name, ti.club_name, ti.category, ti.region
    FROM team_info ti
    LEFT JOIN team_seasons ts ON ti.id = ts.team_id
    WHERE ts.id IS NULL
  LOOP
    RAISE NOTICE '➕ Erstelle team_seasons für: % - % (%)', 
      team_record.club_name, 
      team_record.team_name, 
      team_record.category;
    
    -- Erstelle Standard-Season für dieses Team
    INSERT INTO team_seasons (
      team_id,
      season,
      league,
      group_name,
      team_size,
      is_active
    ) VALUES (
      team_record.id,
      'Winter 2025/26',
      'Kreisliga',  -- Standardwert, bitte anpassen
      '',
      4,  -- 4 Spieler für Winter
      true
    )
    RETURNING id INTO new_season_id;
    
    RAISE NOTICE '✅ Season erstellt: %', new_season_id;
  END LOOP;
  
  RAISE NOTICE '✅ Fertig! Alle Teams haben jetzt team_seasons Einträge.';
END $$;

-- 2️⃣ Zeige alle Teams mit ihren Seasons
SELECT 
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ts.id as season_id,
  ti.id as team_id
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id
ORDER BY ti.club_name, ti.team_name, ts.is_active DESC;

-- 3️⃣ Info: Manuelle Anpassungen
RAISE NOTICE '';
RAISE NOTICE '📝 WICHTIG: Bitte passe die League-Daten manuell an!';
RAISE NOTICE '';
RAISE NOTICE '   UPDATE team_seasons';
RAISE NOTICE '   SET league = ''2. Bezirksliga'',';
RAISE NOTICE '       group_name = ''Gr. 035'',';
RAISE NOTICE '       team_size = 4';
RAISE NOTICE '   WHERE team_id = ''ff090c47-ff26-4df1-82fd-3e4358320d7f'';';
RAISE NOTICE '';

