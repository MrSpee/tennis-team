-- =====================================================
-- Fix: Fehlende Teams erstellen und Matchday-Zuordnungen korrigieren
-- Datum: 2025-01-XX
-- =====================================================

-- =====================================================
-- SCHRITT 1: Fehlende Teams erstellen
-- =====================================================

-- 1.1 TC Viktoria 3 (Herren 30)
-- Prüfe ob Team bereits existiert
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30';
BEGIN
  -- Finde Club
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TC Viktoria' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TC Viktoria nicht gefunden!';
  END IF;
  
  -- Prüfe ob Team bereits existiert
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '3' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    -- Hole club_name für team_info
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '3',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TC Viktoria 3 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TC Viktoria 3 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.2 TC Arnoldshöhe 1986 2 (Herren 30)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TC Arnoldshöhe 1986' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TC Arnoldshöhe 1986 nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '2' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '2',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TC Arnoldshöhe 1986 2 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TC Arnoldshöhe 1986 2 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.3 TC Arnoldshöhe 1986 3 (Herren 30)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TC Arnoldshöhe 1986' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TC Arnoldshöhe 1986 nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '3' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '3',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TC Arnoldshöhe 1986 3 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TC Arnoldshöhe 1986 3 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.4 KTC Weidenpescher Park 3 (Herren 30)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'KTC Weidenpescher Park' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club KTC Weidenpescher Park nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '3' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '3',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team KTC Weidenpescher Park 3 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team KTC Weidenpescher Park 3 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.5 Kölner KHT SW 3 (Herren 50 - basierend auf vorhandenem Team 2)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 50';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'Kölner KHT SW' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club Kölner KHT SW nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '3' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '3',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team Kölner KHT SW 3 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team Kölner KHT SW 3 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.6 TG GW im DJK Bocklemünd 2 (Herren 40)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 40';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TG GW im DJK Bocklemünd' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TG GW im DJK Bocklemünd nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '2' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '2',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TG GW im DJK Bocklemünd 2 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TG GW im DJK Bocklemünd 2 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.7 TC Lese GW Köln 2 (Herren 40)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 40';
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TC Lese GW Köln' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TC Lese GW Köln nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '2' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '2',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TC Lese GW Köln 2 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TC Lese GW Köln 2 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.8 TC Colonius 3 (Kategorie muss aus Matchdays abgeleitet werden - vorerst Herren 30)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30'; -- Default, sollte aus Matchdays abgeleitet werden
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TC Colonius' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TC Colonius nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '3' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '3',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TC Colonius 3 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TC Colonius 3 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- 1.9 TV Ensen Westhoven 1 (Kategorie muss aus Matchdays abgeleitet werden)
DO $$
DECLARE
  v_club_id UUID;
  v_team_id UUID;
  v_category TEXT := 'Herren 30'; -- Default, sollte aus Matchdays abgeleitet werden
BEGIN
  SELECT id INTO v_club_id FROM club_info WHERE name = 'TV Ensen Westhoven' LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TV Ensen Westhoven nicht gefunden!';
  END IF;
  
  SELECT id INTO v_team_id 
  FROM team_info 
  WHERE club_id = v_club_id 
    AND team_name = '1' 
    AND category = v_category;
  
  IF v_team_id IS NULL THEN
    INSERT INTO team_info (club_id, club_name, team_name, category, region)
    SELECT 
      v_club_id,
      ci.name,
      '1',
      v_category,
      'Mittelrhein'
    FROM club_info ci
    WHERE ci.id = v_club_id
    RETURNING id INTO v_team_id;
    
    RAISE NOTICE '✅ Team TV Ensen Westhoven 1 erstellt: %', v_team_id;
  ELSE
    RAISE NOTICE 'ℹ️ Team TV Ensen Westhoven 1 existiert bereits: %', v_team_id;
  END IF;
END $$;

-- =====================================================
-- SCHRITT 2: Matchday-Team-Zuordnungen korrigieren
-- =====================================================

-- 2.1 Matchday 28f272a8-c902-45db-a847-05ec532e4ea5
-- Korrigiere: TC Viktoria 3 statt TV Dellbrück 3 (Heim)
DO $$
DECLARE
  v_correct_team_id UUID;
  v_matchday_id UUID := '28f272a8-c902-45db-a847-05ec532e4ea5';
BEGIN
  -- Finde TC Viktoria 3
  SELECT ti.id INTO v_correct_team_id
  FROM team_info ti
  JOIN club_info ci ON ti.club_id = ci.id
  WHERE ci.name = 'TC Viktoria'
    AND ti.team_name = '3'
    AND ti.category = 'Herren 30'
  LIMIT 1;
  
  IF v_correct_team_id IS NULL THEN
    RAISE EXCEPTION 'TC Viktoria 3 nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Update Matchday
  UPDATE matchdays
  SET home_team_id = v_correct_team_id
  WHERE id = v_matchday_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Matchday % korrigiert: home_team_id = % (TC Viktoria 3)', v_matchday_id, v_correct_team_id;
  ELSE
    RAISE WARNING '⚠️ Matchday % nicht gefunden!', v_matchday_id;
  END IF;
END $$;

-- 2.2 Matchday eb16037c-7f0f-4b30-824e-a53c75cfbed6
-- Korrigiere: TV Ensen Westhoven 1 statt TG Deckstein 1 (Heim)
DO $$
DECLARE
  v_correct_team_id UUID;
  v_matchday_id UUID := 'eb16037c-7f0f-4b30-824e-a53c75cfbed6';
BEGIN
  -- Finde TV Ensen Westhoven 1
  SELECT ti.id INTO v_correct_team_id
  FROM team_info ti
  JOIN club_info ci ON ti.club_id = ci.id
  WHERE ci.name = 'TV Ensen Westhoven'
    AND ti.team_name = '1'
  LIMIT 1;
  
  IF v_correct_team_id IS NULL THEN
    RAISE EXCEPTION 'TV Ensen Westhoven 1 nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Update Matchday
  UPDATE matchdays
  SET home_team_id = v_correct_team_id
  WHERE id = v_matchday_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Matchday % korrigiert: home_team_id = % (TV Ensen Westhoven 1)', v_matchday_id, v_correct_team_id;
  ELSE
    RAISE WARNING '⚠️ Matchday % nicht gefunden!', v_matchday_id;
  END IF;
END $$;

-- 2.3 Matchday 872937ea-a269-4e7d-be89-7c4fd1f622e0
-- Korrigiere: TC Arnoldshöhe 1986 2 statt TV Dellbrück 2 (Gast)
DO $$
DECLARE
  v_correct_team_id UUID;
  v_matchday_id UUID := '872937ea-a269-4e7d-be89-7c4fd1f622e0';
BEGIN
  -- Finde TC Arnoldshöhe 1986 2
  SELECT ti.id INTO v_correct_team_id
  FROM team_info ti
  JOIN club_info ci ON ti.club_id = ci.id
  WHERE ci.name = 'TC Arnoldshöhe 1986'
    AND ti.team_name = '2'
    AND ti.category = 'Herren 30'
  LIMIT 1;
  
  IF v_correct_team_id IS NULL THEN
    RAISE EXCEPTION 'TC Arnoldshöhe 1986 2 nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Update Matchday
  UPDATE matchdays
  SET away_team_id = v_correct_team_id
  WHERE id = v_matchday_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Matchday % korrigiert: away_team_id = % (TC Arnoldshöhe 1986 2)', v_matchday_id, v_correct_team_id;
  ELSE
    RAISE WARNING '⚠️ Matchday % nicht gefunden!', v_matchday_id;
  END IF;
END $$;

-- 2.4 Matchday 8c2886e0-1d60-457b-8bd7-f82e1f6b02a6
-- Korrigiere: KTC Weidenpescher Park 3 statt TV Dellbrück 3 (Heim)
DO $$
DECLARE
  v_correct_team_id UUID;
  v_matchday_id UUID := '8c2886e0-1d60-457b-8bd7-f82e1f6b02a6';
BEGIN
  -- Finde KTC Weidenpescher Park 3
  SELECT ti.id INTO v_correct_team_id
  FROM team_info ti
  JOIN club_info ci ON ti.club_id = ci.id
  WHERE ci.name = 'KTC Weidenpescher Park'
    AND ti.team_name = '3'
    AND ti.category = 'Herren 30'
  LIMIT 1;
  
  IF v_correct_team_id IS NULL THEN
    RAISE EXCEPTION 'KTC Weidenpescher Park 3 nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Update Matchday
  UPDATE matchdays
  SET home_team_id = v_correct_team_id
  WHERE id = v_matchday_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Matchday % korrigiert: home_team_id = % (KTC Weidenpescher Park 3)', v_matchday_id, v_correct_team_id;
  ELSE
    RAISE WARNING '⚠️ Matchday % nicht gefunden!', v_matchday_id;
  END IF;
END $$;

-- 2.5 Matchday bce5754f-c1a8-40b6-83e0-b72ed6361071
-- Korrigiere: TC Arnoldshöhe 1986 3 statt TV Dellbrück 3 (Heim)
DO $$
DECLARE
  v_correct_team_id UUID;
  v_matchday_id UUID := 'bce5754f-c1a8-40b6-83e0-b72ed6361071';
BEGIN
  -- Finde TC Arnoldshöhe 1986 3
  SELECT ti.id INTO v_correct_team_id
  FROM team_info ti
  JOIN club_info ci ON ti.club_id = ci.id
  WHERE ci.name = 'TC Arnoldshöhe 1986'
    AND ti.team_name = '3'
    AND ti.category = 'Herren 30'
  LIMIT 1;
  
  IF v_correct_team_id IS NULL THEN
    RAISE EXCEPTION 'TC Arnoldshöhe 1986 3 nicht gefunden! Bitte zuerst Team erstellen.';
  END IF;
  
  -- Update Matchday
  UPDATE matchdays
  SET home_team_id = v_correct_team_id
  WHERE id = v_matchday_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Matchday % korrigiert: home_team_id = % (TC Arnoldshöhe 1986 3)', v_matchday_id, v_correct_team_id;
  ELSE
    RAISE WARNING '⚠️ Matchday % nicht gefunden!', v_matchday_id;
  END IF;
END $$;

-- =====================================================
-- SCHRITT 3: Team-Seasons für neue Teams erstellen
-- =====================================================

-- Erstelle team_seasons für alle neuen Teams (wenn noch nicht vorhanden)
INSERT INTO team_seasons (team_id, season, league, group_name, is_active, team_size)
SELECT 
  ti.id,
  'Winter 2025/26',
  COALESCE(
    (SELECT DISTINCT md.league FROM matchdays md WHERE md.home_team_id = ti.id OR md.away_team_id = ti.id LIMIT 1),
    'Unbekannt'
  ),
  COALESCE(
    (SELECT DISTINCT md.group_name FROM matchdays md WHERE md.home_team_id = ti.id OR md.away_team_id = ti.id LIMIT 1),
    'Unbekannt'
  ),
  true,
  6
FROM team_info ti
WHERE ti.id IN (
  SELECT id FROM team_info 
  WHERE (club_name = 'TC Viktoria' AND team_name = '3' AND category = 'Herren 30')
     OR (club_name = 'TC Arnoldshöhe 1986' AND team_name IN ('2', '3') AND category = 'Herren 30')
     OR (club_name = 'KTC Weidenpescher Park' AND team_name = '3' AND category = 'Herren 30')
     OR (club_name = 'Kölner KHT SW' AND team_name = '3' AND category = 'Herren 50')
     OR (club_name = 'TG GW im DJK Bocklemünd' AND team_name = '2' AND category = 'Herren 40')
     OR (club_name = 'TC Lese GW Köln' AND team_name = '2' AND category = 'Herren 40')
     OR (club_name = 'TC Colonius' AND team_name = '3' AND category = 'Herren 30')
     OR (club_name = 'TV Ensen Westhoven' AND team_name = '1')
)
AND NOT EXISTS (
  SELECT 1 FROM team_seasons ts 
  WHERE ts.team_id = ti.id 
    AND ts.season = 'Winter 2025/26'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Zusammenfassung
-- =====================================================

SELECT 
  '✅ Script abgeschlossen!' as status,
  COUNT(*) FILTER (WHERE team_name IN ('2', '3') OR (club_name = 'TV Ensen Westhoven' AND team_name = '1')) as neue_teams_erstellt
FROM team_info
WHERE (club_name = 'TC Viktoria' AND team_name = '3' AND category = 'Herren 30')
   OR (club_name = 'TC Arnoldshöhe 1986' AND team_name IN ('2', '3') AND category = 'Herren 30')
   OR (club_name = 'KTC Weidenpescher Park' AND team_name = '3' AND category = 'Herren 30')
   OR (club_name = 'Kölner KHT SW' AND team_name = '3' AND category = 'Herren 50')
   OR (club_name = 'TG GW im DJK Bocklemünd' AND team_name = '2' AND category = 'Herren 40')
   OR (club_name = 'TC Lese GW Köln' AND team_name = '2' AND category = 'Herren 40')
   OR (club_name = 'TC Colonius' AND team_name = '3' AND category = 'Herren 30')
   OR (club_name = 'TV Ensen Westhoven' AND team_name = '1');

