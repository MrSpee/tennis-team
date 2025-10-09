-- ============================================
-- TEMPLATE: Team Import
-- ============================================
-- Wiederverwendbares Template für Team-Imports
-- 
-- ANLEITUNG:
-- 1. Ersetze die Platzhalter mit echten Daten
-- 2. Führe das Script in Supabase aus
-- 3. Verifiziere die importierten Daten

DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_season_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🏢 IMPORT: [CLUB_NAME] - [TEAM_NAME]';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- =====================================================
  -- 1. Hole Club-ID (oder erstelle Club falls nicht vorhanden)
  -- =====================================================
  SELECT id INTO v_club_id
  FROM club_info
  WHERE club_name = '[CLUB_NAME]'  -- z.B. 'VKC Köln'
  LIMIT 1;

  IF v_club_id IS NULL THEN
    -- Club existiert noch nicht - erstelle ihn
    INSERT INTO club_info (
      id,
      club_name,
      region,
      created_at
    ) VALUES (
      gen_random_uuid(),
      '[CLUB_NAME]',       -- z.B. 'VKC Köln'
      '[REGION]',          -- z.B. 'Mittelrhein'
      NOW()
    )
    RETURNING id INTO v_club_id;
    
    RAISE NOTICE '✅ Club erstellt: [CLUB_NAME] (%)', v_club_id;
  ELSE
    RAISE NOTICE '✅ Club gefunden: [CLUB_NAME] (%)', v_club_id;
  END IF;

  -- =====================================================
  -- 2. Erstelle Team in team_info
  -- =====================================================
  INSERT INTO team_info (
    id,
    team_name,
    club_name,
    category,
    region,
    club_id,
    tvm_link,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '[TEAM_NAME]',           -- z.B. 'Herren 40 1' oder NULL
    '[CLUB_NAME]',           -- z.B. 'VKC Köln'
    '[CATEGORY]',            -- z.B. 'Herren 40'
    '[REGION]',              -- z.B. 'Mittelrhein'
    v_club_id,
    '[TVM_LINK]',            -- Optional: Link zur TVM-Seite oder NULL
    NOW(),
    NOW()
  )
  RETURNING id INTO v_team_id;

  RAISE NOTICE '✅ Team erstellt: [TEAM_NAME] (%)', v_team_id;

  -- =====================================================
  -- 3. Erstelle Saison in team_seasons
  -- =====================================================
  INSERT INTO team_seasons (
    id,
    team_id,
    season,
    league,
    group_name,
    team_size,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    '[SEASON]',              -- z.B. 'Winter 2025/26'
    '[LEAGUE]',              -- z.B. '1. Bezirksliga'
    '[GROUP]',               -- z.B. 'Gr. 043'
    [TEAM_SIZE],             -- z.B. 4 oder 6
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_season_id;

  RAISE NOTICE '✅ Saison erstellt: [SEASON] - [LEAGUE] [GROUP]';

  -- =====================================================
  -- 4. Importiere Matches
  -- =====================================================
  
  -- Match 1
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    '[OPPONENT_1]',              -- z.B. 'TV Dellbrück 1'
    '[DATE_1]'::timestamptz,     -- z.B. '2025-11-02 15:00:00+01'
    '[LOCATION_1]',              -- 'Home' oder 'Away'
    '[VENUE_1]',                 -- z.B. 'TV Dellbrück' oder 'Cologne Sportspark'
    '[SEASON_TYPE]',             -- 'winter' oder 'summer'
    'scheduled',
    NOW()
  );

  -- Match 2
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    '[OPPONENT_2]',
    '[DATE_2]'::timestamptz,
    '[LOCATION_2]',
    '[VENUE_2]',
    '[SEASON_TYPE]',
    'scheduled',
    NOW()
  );

  -- Füge weitere Matches nach Bedarf hinzu...

  RAISE NOTICE '✅ Matches importiert';

  -- =====================================================
  -- 5. Zusammenfassung
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ IMPORT ABGESCHLOSSEN!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Importierte Daten:';
  RAISE NOTICE '   🏢 Club: [CLUB_NAME]';
  RAISE NOTICE '   👥 Team: [TEAM_NAME]';
  RAISE NOTICE '   🏆 Liga: [LEAGUE] [GROUP]';
  RAISE NOTICE '   📅 Saison: [SEASON]';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Team-ID: %', v_team_id;
  RAISE NOTICE '';

END $$;

-- =====================================================
-- VERIFY: Zeige importierte Daten
-- =====================================================

-- Teams
SELECT 
  '🏢 Teams' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.season
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.is_active = true
WHERE ti.club_name = '[CLUB_NAME]'
ORDER BY ti.category, ti.team_name;

-- Matches
SELECT 
  '🎾 Matches' as info,
  m.match_date::date as datum,
  m.match_date::time as uhrzeit,
  CASE 
    WHEN m.location = 'Home' THEN '🏠 Heim'
    ELSE '✈️ Auswärts'
  END as location,
  m.opponent as gegner,
  m.venue as spielort
FROM matches m
INNER JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = '[CLUB_NAME]'
  AND ti.category = '[CATEGORY]'
ORDER BY m.match_date;

-- =====================================================
-- PLATZHALTER ZUM ERSETZEN:
-- =====================================================
-- [CLUB_NAME]     - Name des Vereins (z.B. 'VKC Köln')
-- [TEAM_NAME]     - Name des Teams (z.B. 'Herren 40 1' oder NULL)
-- [CATEGORY]      - Kategorie (z.B. 'Herren 40', 'Damen', 'Herren 30')
-- [REGION]        - Region (z.B. 'Mittelrhein', 'Niederrhein')
-- [TVM_LINK]      - Link zur TVM-Seite oder NULL
-- [SEASON]        - Saison (z.B. 'Winter 2025/26', 'Sommer 2025')
-- [LEAGUE]        - Liga (z.B. '1. Bezirksliga', '2. Kreisliga')
-- [GROUP]         - Gruppe (z.B. 'Gr. 043', 'Gr. A')
-- [TEAM_SIZE]     - Anzahl Spieler (z.B. 4, 6, 8)
-- [SEASON_TYPE]   - 'winter' oder 'summer'
-- [OPPONENT_X]    - Name des Gegners
-- [DATE_X]        - Datum/Uhrzeit (Format: '2025-11-02 15:00:00+01')
-- [LOCATION_X]    - 'Home' oder 'Away'
-- [VENUE_X]       - Spielort (z.B. 'Cologne Sportspark')


