-- ADD_RTHC_BAYER_LEVERKUSEN.sql
-- Füge RTHC Bayer Leverkusen zu club_info und team_info hinzu
-- ================================================================

-- ================================================================
-- SCHRITT 1: PRÜFE OB CLUB BEREITS EXISTIERT
-- ================================================================
SELECT 
  '1️⃣ CLUB CHECK' as step,
  id,
  name,
  city,
  website
FROM club_info
WHERE name ILIKE '%RTHC%Bayer%Leverkusen%' OR name ILIKE '%RTHC Bayer%';

-- ================================================================
-- SCHRITT 2: ERSTELLE CLUB FALLS NICHT VORHANDEN
-- ================================================================
DO $$
DECLARE
  v_club_id UUID;
BEGIN
  -- Prüfe ob Club existiert
  SELECT id INTO v_club_id
  FROM club_info
  WHERE name = 'RTHC Bayer Leverkusen';

  IF v_club_id IS NULL THEN
    -- Club existiert nicht → Erstelle ihn
    INSERT INTO club_info (
      name,
      city,
      address,
      website,
      federation,
      is_verified
    ) VALUES (
      'RTHC Bayer Leverkusen',
      'Leverkusen',
      'Knochenbergsweg, 51373 Leverkusen',
      'http://www.rthc.de',
      'TVM',
      true  -- Admin-verifiziert
    )
    RETURNING id INTO v_club_id;

    RAISE NOTICE '✅ Club erstellt: RTHC Bayer Leverkusen (ID: %)', v_club_id;
  ELSE
    RAISE NOTICE '✅ Club existiert bereits: RTHC Bayer Leverkusen (ID: %)', v_club_id;
  END IF;
END $$;

-- ================================================================
-- SCHRITT 3: PRÜFE OB TEAM BEREITS EXISTIERT
-- ================================================================
SELECT 
  '3️⃣ TEAM CHECK' as step,
  ti.id,
  ti.club_name,
  ti.category,
  ti.team_name,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id AND is_active = true) as active_players
FROM team_info ti
WHERE ti.club_name = 'RTHC Bayer Leverkusen'
  AND ti.category = 'Herren 55';

-- ================================================================
-- SCHRITT 4: ERSTELLE TEAM FALLS NICHT VORHANDEN
-- ================================================================
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
BEGIN
  -- Hole Club-ID
  SELECT id INTO v_club_id
  FROM club_info
  WHERE name = 'RTHC Bayer Leverkusen';

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club RTHC Bayer Leverkusen nicht gefunden!';
  END IF;

  -- Prüfe ob Team existiert
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name = 'RTHC Bayer Leverkusen'
    AND category = 'Herren 55'
    AND team_name = '1';

  IF v_team_id IS NULL THEN
    -- Team existiert nicht → Erstelle es
    INSERT INTO team_info (
      club_name,
      category,
      team_name,
      club_id,
      region
    ) VALUES (
      'RTHC Bayer Leverkusen',
      'Herren 55',
      '1',
      v_club_id,
      'Mittelrhein'
    )
    RETURNING id INTO v_team_id;

    RAISE NOTICE '✅ Team erstellt: Herren 55 1 (ID: %)', v_team_id;
  ELSE
    RAISE NOTICE '✅ Team existiert bereits: Herren 55 1 (ID: %)', v_team_id;
  END IF;
END $$;

-- ================================================================
-- SCHRITT 5: ERSTELLE/UPDATE TEAM_SEASONS
-- ================================================================
DO $$
DECLARE
  v_team_id UUID;
  v_existing_season_id UUID;
BEGIN
  -- Hole Team-ID
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name = 'RTHC Bayer Leverkusen'
    AND category = 'Herren 55'
    AND team_name = '1';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team Herren 55 1 nicht gefunden!';
  END IF;

  -- Prüfe ob Saison existiert
  SELECT id INTO v_existing_season_id
  FROM team_seasons
  WHERE team_id = v_team_id
    AND season = 'Winter 2025/26';

  IF v_existing_season_id IS NULL THEN
    -- Erstelle Saison
    INSERT INTO team_seasons (
      team_id,
      season,
      league,
      group_name,
      team_size,
      is_active
    ) VALUES (
      v_team_id,
      'Winter 2025/26',
      '1. Kreisliga',
      'Gr. 063',
      4,
      true
    );

    RAISE NOTICE '✅ Saison-Daten erstellt für Herren 55';
  ELSE
    -- Update bestehende Saison
    UPDATE team_seasons
    SET league = '1. Kreisliga',
        group_name = 'Gr. 063',
        team_size = 4,
        is_active = true
    WHERE id = v_existing_season_id;

    RAISE NOTICE '✅ Saison-Daten aktualisiert für Herren 55';
  END IF;
END $$;

-- ================================================================
-- SCHRITT 6: VERIFIKATION
-- ================================================================
SELECT 
  '6️⃣ ✅ VERIFIKATION' as step,
  ci.id as club_id,
  ci.name as club_name,
  ci.city,
  ci.address,
  ci.website,
  ti.id as team_id,
  ti.category,
  ti.team_name,
  ts.league,
  ts.group_name,
  ts.team_size,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id AND is_active = true) as active_players
FROM club_info ci
LEFT JOIN team_info ti ON ti.club_id = ci.id AND ti.category = 'Herren 55'
LEFT JOIN team_seasons ts ON ts.team_id = ti.id AND ts.season = 'Winter 2025/26'
WHERE ci.name = 'RTHC Bayer Leverkusen';

-- ================================================================
-- ERWARTETES ERGEBNIS:
-- 
-- SCHRITT 1: Club Check
--   - Falls existiert: Zeige ID
--   - Falls nicht: Wird in Schritt 2 erstellt
-- 
-- SCHRITT 2: Club erstellt/existiert
--   - ✅ Club: RTHC Bayer Leverkusen
--   - Stadt: Leverkusen
--   - Adresse: Knochenbergsweg, 51373 Leverkusen
--   - Website: http://www.rthc.de
-- 
-- SCHRITT 3: Team Check
--   - Falls existiert: Zeige ID und Spieleranzahl
--   - Falls nicht: Wird in Schritt 4 erstellt
-- 
-- SCHRITT 4: Team erstellt/existiert
--   - ✅ Team: Herren 55 1
-- 
-- SCHRITT 5: Saison erstellt/aktualisiert
--   - ✅ Liga: 1. Kreisliga
--   - ✅ Gruppe: Gr. 063
--   - ✅ Teamgröße: 4
--   - ✅ Saison: Winter 2025/26
-- 
-- SCHRITT 6: VERIFIKATION
--   - Zeigt komplette Club- und Team-Daten
-- 
-- NÄCHSTER SCHRITT:
-- Jetzt kannst du den KI-Import verwenden:
-- 1. Kopiere die Meldeliste ins Import-Tool
-- 2. KI erkennt automatisch "RTHC Bayer Leverkusen"
-- 3. Fuzzy Matching findet den Club
-- 4. Team-Matching findet "Herren 55 1"
-- 5. Spieler werden importiert mit LK und TVM ID
-- 
-- WICHTIG:
-- Falls der Club/Team-Matching fehlschlägt:
-- → Manual Review im Import-Tool
-- → Club/Team aus Dropdown wählen
-- ================================================================

