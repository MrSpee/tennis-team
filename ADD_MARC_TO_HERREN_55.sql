-- ADD_MARC_TO_HERREN_55.sql
-- Füge Marc Stoppenbach zu VKC Köln Herren 55 hinzu
-- ==========================================

-- ==========================================
-- SCHRITT 1: PRÜFE AKTUELLEN STATUS
-- ==========================================
SELECT 
  '1️⃣ AKTUELLER STATUS' as step,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name as current_primary_club,
  ti.category as current_primary_category,
  ti.team_name as current_primary_team_name,
  (SELECT COUNT(*) FROM team_memberships WHERE player_id = p.id AND is_active = true) as active_memberships
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'marc@stoppenbach.de';

-- ==========================================
-- SCHRITT 2: PRÜFE OB HERREN 55 TEAM EXISTIERT
-- ==========================================
SELECT 
  '2️⃣ HERREN 55 TEAM CHECK' as step,
  id as team_id,
  club_name,
  category,
  team_name,
  region,
  tvm_link
FROM team_info
WHERE club_name = 'VKC Köln'
  AND category = 'Herren 55';

-- ==========================================
-- SCHRITT 3: ERSTELLE TEAM FALLS NICHT VORHANDEN
-- ==========================================
DO $$
DECLARE
  v_team_id UUID;
  v_club_id UUID;
BEGIN
  -- Hole club_id für VKC Köln
  SELECT id INTO v_club_id
  FROM club_info
  WHERE name = 'VKC Köln';

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club VKC Köln nicht gefunden!';
  END IF;

  -- Prüfe ob Team bereits existiert
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name = 'VKC Köln'
    AND category = 'Herren 55';

  IF v_team_id IS NULL THEN
    -- Team existiert nicht → Erstelle es
    INSERT INTO team_info (
      club_name,
      category,
      team_name,
      club_id,
      region
    ) VALUES (
      'VKC Köln',
      'Herren 55',
      ' 1',  -- 1. Mannschaft (mit Leerzeichen wie üblich)
      v_club_id,
      'Mittelrhein'
    )
    RETURNING id INTO v_team_id;

    RAISE NOTICE '✅ Neues Team erstellt: Herren 55 (ID: %)', v_team_id;
  ELSE
    RAISE NOTICE '✅ Team existiert bereits: Herren 55 (ID: %)', v_team_id;
  END IF;

  -- Gebe Team-ID zurück für nächsten Schritt
  RAISE NOTICE 'Team-ID für Herren 55: %', v_team_id;
END $$;

-- ==========================================
-- SCHRITT 4: ERSTELLE TEAM_SEASONS EINTRAG
-- ==========================================
DO $$
DECLARE
  v_team_id UUID;
  v_existing_season_id UUID;
BEGIN
  -- Hole Team-ID
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name = 'VKC Köln'
    AND category = 'Herren 55';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team Herren 55 nicht gefunden!';
  END IF;

  -- Prüfe ob Saison bereits existiert
  SELECT id INTO v_existing_season_id
  FROM team_seasons
  WHERE team_id = v_team_id
    AND season = 'Winter 2025/26';

  IF v_existing_season_id IS NULL THEN
    -- Erstelle neuen Saison-Eintrag
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
      4,  -- 4-er Team
      true
    );

    RAISE NOTICE '✅ Saison-Daten erstellt für Herren 55';
  ELSE
    -- Update bestehenden Eintrag
    UPDATE team_seasons
    SET league = '1. Kreisliga',
        group_name = 'Gr. 063',
        team_size = 4,
        is_active = true
    WHERE id = v_existing_season_id;

    RAISE NOTICE '✅ Saison-Daten aktualisiert für Herren 55';
  END IF;
END $$;

-- ==========================================
-- SCHRITT 5: FÜGE MARC ZUM TEAM HINZU
-- ==========================================
DO $$
DECLARE
  v_player_id UUID;
  v_team_id UUID;
  v_existing_membership_id UUID;
BEGIN
  -- Hole Player-ID
  SELECT id INTO v_player_id
  FROM players_unified
  WHERE email = 'marc@stoppenbach.de';

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Spieler Marc Stoppenbach nicht gefunden!';
  END IF;

  -- Hole Team-ID
  SELECT id INTO v_team_id
  FROM team_info
  WHERE club_name = 'VKC Köln'
    AND category = 'Herren 55';

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team Herren 55 nicht gefunden!';
  END IF;

  -- Prüfe ob Membership bereits existiert (auch wenn inaktiv)
  SELECT id INTO v_existing_membership_id
  FROM team_memberships
  WHERE player_id = v_player_id
    AND team_id = v_team_id;

  IF v_existing_membership_id IS NOT NULL THEN
    -- Membership existiert → Aktiviere
    UPDATE team_memberships
    SET is_active = true,
        season = 'winter_25_26'
    WHERE id = v_existing_membership_id;

    RAISE NOTICE '✅ Existing membership activated: %', v_existing_membership_id;
  ELSE
    -- Membership existiert nicht → Erstelle neu
    INSERT INTO team_memberships (
      player_id,
      team_id,
      role,
      is_primary,
      is_active,
      season
    ) VALUES (
      v_player_id,
      v_team_id,
      'player',
      false,  -- Nicht primary (behält Herren 50 als primary)
      true,
      'winter_25_26'
    );

    RAISE NOTICE '✅ New membership created for Herren 55';
  END IF;
END $$;

-- ==========================================
-- SCHRITT 6: VERIFIKATION
-- ==========================================
SELECT 
  '6️⃣ ✅ VERIFIKATION' as step,
  p.name,
  p.email,
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.league,
  ts.group_name,
  ts.team_size,
  tm.is_active as membership_active,
  tm.is_primary as membership_primary,
  CASE 
    WHEN tm.is_active = true THEN '✅ Marc ist jetzt in Herren 55!'
    ELSE '❌ Fehler - Membership nicht aktiv'
  END as status
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.season = 'Winter 2025/26'
WHERE p.email = 'marc@stoppenbach.de'
  AND ti.category = 'Herren 55'
  AND tm.is_active = true;

-- ==========================================
-- SCHRITT 7: ZEIGE ALLE TEAMS VON MARC
-- ==========================================
SELECT 
  '7️⃣ MARC''S TEAMS' as step,
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.league,
  ts.group_name,
  tm.is_primary,
  tm.is_active,
  CASE 
    WHEN tm.is_primary = true THEN '👑 Primary Team'
    ELSE 'Zusätzliches Team'
  END as team_role
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
LEFT JOIN team_seasons ts ON ti.id = ts.team_id AND ts.season = 'Winter 2025/26'
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'marc@stoppenbach.de')
  AND tm.is_active = true
ORDER BY tm.is_primary DESC;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- SCHRITT 1: Marc ist aktuell in Herren 50 (primary)
-- SCHRITT 2: Herren 55 existiert ODER wird erstellt
-- SCHRITT 3: Team erstellt/existiert
-- SCHRITT 4: Saison-Daten: 1. Kreisliga, Gr. 063, 4 Spieler
-- SCHRITT 5: Membership erstellt
-- SCHRITT 6: ✅ Marc ist jetzt in Herren 55!
-- SCHRITT 7: 
--   - Herren 50 (Primary) ✅
--   - Herren 55 (Zusätzlich) ✅
-- 
-- HINWEIS:
-- Marc behält Herren 50 als primary_team_id
-- Herren 55 wird als zusätzliches Team hinzugefügt
-- Er kann in beiden Teams spielen
-- 
-- NÄCHSTER SCHRITT:
-- Marc muss Logout + Login
-- Dann sieht er beide Teams im Dashboard
-- ==========================================






