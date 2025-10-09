-- ============================================
-- IMPORT: VKC Köln - Herren 40 Team
-- ============================================
-- Importiert neue Mannschaft mit Matches
-- Wiederverwendbares Template für Team-Imports

DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_season_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🏢 IMPORT: VKC Köln - Herren 40 Team';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- =====================================================
  -- 1. Hole Club-ID (club_info hat 'name', nicht 'club_name')
  -- =====================================================
  SELECT id INTO v_club_id
  FROM club_info
  WHERE name = 'VKC Köln'
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION '❌ Club "VKC Köln" nicht gefunden! Bitte zuerst Club anlegen.';
  END IF;

  RAISE NOTICE '✅ Club gefunden: VKC Köln (%) aus club_info.name', v_club_id;

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
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Herren 40 1',           -- Team-Name
    'VKC Köln',              -- Club-Name
    'Herren 40',             -- Kategorie
    'Mittelrhein',           -- Region
    v_club_id,               -- Club-ID
    NOW(),
    NOW()
  )
  RETURNING id INTO v_team_id;

  RAISE NOTICE '✅ Team erstellt: Herren 40 1 (%)' , v_team_id;

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
    'Winter 2025/26',        -- Saison
    '1. Bezirksliga',        -- Liga
    'Gr. 043',               -- Gruppe
    4,                       -- Team-Größe (4er)
    true,                    -- Aktiv
    NOW(),
    NOW()
  )
  RETURNING id INTO v_season_id;

  RAISE NOTICE '✅ Saison erstellt: Winter 2025/26 - 1. Bezirksliga Gr. 043';

  -- =====================================================
  -- 4. Importiere Matches
  -- =====================================================
  
  -- Match 1: 02.11.2025 - TV Dellbrück (Auswärts)
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    'TV Dellbrück 1',
    '2025-11-02 15:00:00+01',
    'Away',
    'TV Dellbrück',
    'winter',
    NOW()
  );

  -- Match 2: 15.11.2025 - KölnerTHC Stadion RW 2 (Heim)
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    'KölnerTHC Stadion RW 2',
    '2025-11-15 18:00:00+01',
    'Home',
    'Cologne Sportspark',
    'winter',
    NOW()
  );

  -- Match 3: 06.12.2025 - TG GW im DJK Bocklemünd 1 (Heim)
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    'TG GW im DJK Bocklemünd 1',
    '2025-12-06 18:00:00+01',
    'Home',
    'Cologne Sportspark',
    'winter',
    NOW()
  );

  -- Match 4: 15.03.2026 - TC Ford Köln 1 (Auswärts)
  INSERT INTO matches (
    id,
    team_id,
    opponent,
    match_date,
    location,
    venue,
    season,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_team_id,
    'TC Ford Köln 1',
    '2026-03-15 16:00:00+01',
    'Away',
    'TC Ford Köln',
    'winter',
    NOW()
  );

  RAISE NOTICE '✅ 4 Matches importiert';

  -- =====================================================
  -- 5. Zusammenfassung
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ IMPORT ABGESCHLOSSEN!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Importierte Daten:';
  RAISE NOTICE '   🏢 Club: VKC Köln';
  RAISE NOTICE '   👥 Team: Herren 40 1 (4er)';
  RAISE NOTICE '   🏆 Liga: 1. Bezirksliga Gr. 043';
  RAISE NOTICE '   📅 Saison: Winter 2025/26';
  RAISE NOTICE '   🎾 Matches: 4';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Team-ID: %', v_team_id;
  RAISE NOTICE '';

END $$;

-- =====================================================
-- VERIFY: Zeige importierte Daten
-- =====================================================

-- Teams des VKC Köln
SELECT 
  '🏢 VKC Köln Teams' as info,
  ti.id,
  ti.team_name,
  ti.category,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.season
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.is_active = true
WHERE ti.club_name = 'VKC Köln'
ORDER BY ti.category, ti.team_name;

-- Matches der Herren 40 1
SELECT 
  '🎾 Herren 40 1 Matches' as info,
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
WHERE ti.club_name = 'VKC Köln'
  AND ti.category = 'Herren 40'
ORDER BY m.match_date;

