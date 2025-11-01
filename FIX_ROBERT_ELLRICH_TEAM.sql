-- FIX_ROBERT_ELLRICH_TEAM.sql
-- Füge Robert Ellrich zu SV Rot-Gelb Sürth Herren 40 (Team "1") hinzu
-- ==========================================

-- SCHRITT 1: Prüfe Robert Ellrich
-- ==========================================
SELECT 
  '🔍 Robert Ellrich Status' as info,
  id,
  user_id,
  name,
  email,
  current_lk,
  primary_team_id,
  is_active,
  onboarding_status
FROM players_unified
WHERE email = 'robert.ellrich@icloud.com';

-- SCHRITT 2: Finde SV Rot-Gelb Sürth Herren 40 Team "1"
-- ==========================================
SELECT 
  '🏢 SV Rot-Gelb Sürth Herren 40 Teams' as info,
  id as team_id,
  club_name,
  team_name,
  category,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.team_id = ti.id AND tm.is_active = true
  ) as active_player_count
FROM team_info ti
WHERE club_name ILIKE '%Sürth%'
  AND category = 'Herren 40'
ORDER BY team_name;

-- SCHRITT 3: Prüfe bestehende Team-Zuordnungen für Robert
-- ==========================================
SELECT 
  '⚠️ Roberts aktuelle Team-Zuordnungen' as info,
  tm.id as membership_id,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active,
  tm.is_primary,
  tm.season
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified pu ON tm.player_id = pu.id
WHERE pu.email = 'robert.ellrich@icloud.com'
ORDER BY tm.is_active DESC, tm.is_primary DESC;

-- SCHRITT 4: FIX - Füge Robert zu SV Rot-Gelb Sürth Herren 40 hinzu
-- ==========================================

BEGIN;

DO $$
DECLARE
  v_robert_id UUID;
  v_suerth_team_id UUID;
BEGIN
  -- Hole Roberts ID
  SELECT id INTO v_robert_id
  FROM players_unified
  WHERE email = 'robert.ellrich@icloud.com';

  IF v_robert_id IS NULL THEN
    RAISE EXCEPTION '❌ Robert Ellrich nicht in players_unified gefunden!';
  END IF;

  -- Hole Team-ID für SV Rot-Gelb Sürth Herren 40 Team "1"
  SELECT id INTO v_suerth_team_id
  FROM team_info
  WHERE club_name = 'SV Rot-Gelb Sürth'
    AND category = 'Herren 40'
    AND team_name = ' 1'
  LIMIT 1;

  IF v_suerth_team_id IS NULL THEN
    RAISE EXCEPTION '❌ SV Rot-Gelb Sürth Herren 40 Team "1" nicht gefunden!';
  END IF;

  RAISE NOTICE '✅ Robert ID: %', v_robert_id;
  RAISE NOTICE '✅ Team ID: %', v_suerth_team_id;

  -- Prüfe ob bereits Team-Zuordnung existiert
  IF EXISTS (
    SELECT 1 
    FROM team_memberships 
    WHERE player_id = v_robert_id 
      AND team_id = v_suerth_team_id
  ) THEN
    -- Update bestehende Zuordnung
    UPDATE team_memberships
    SET 
      is_active = true,
      is_primary = true,
      season = 'Winter 2025/26',
      role = 'player'
    WHERE player_id = v_robert_id
      AND team_id = v_suerth_team_id;
    
    RAISE NOTICE '✅ Bestehende Team-Zuordnung aktualisiert';
  ELSE
    -- Erstelle neue Team-Zuordnung
    INSERT INTO team_memberships (
      player_id,
      team_id,
      role,
      is_primary,
      is_active,
      season,
      created_at
    ) VALUES (
      v_robert_id,
      v_suerth_team_id,
      'player',
      true,
      true,
      'Winter 2025/26',
      NOW()
    );
    
    RAISE NOTICE '✅ Neue Team-Zuordnung erstellt';
  END IF;

  -- Update primary_team_id in players_unified
  UPDATE players_unified
  SET primary_team_id = v_suerth_team_id
  WHERE id = v_robert_id;
  
  RAISE NOTICE '✅ primary_team_id gesetzt';
  
END $$;

COMMIT;

-- SCHRITT 5: VERIFICATION - Prüfe Robert nach dem Fix
-- ==========================================
SELECT 
  '✅ Robert Ellrich nach Fix' as info,
  pu.id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active,
  tm.is_primary,
  tm.season,
  tm.role
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.email = 'robert.ellrich@icloud.com'
  AND tm.is_active = true;

-- SCHRITT 6: Zeige alle Sürth Herren 40 Spieler (zur Überprüfung)
-- ==========================================
SELECT 
  '📋 Alle Sürth Herren 40 Spieler' as info,
  pu.name,
  pu.current_lk,
  pu.email,
  tm.is_primary,
  tm.role
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
JOIN team_info ti ON tm.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND ti.category = 'Herren 40'
  AND ti.team_name = ' 1'
ORDER BY 
  CASE 
    WHEN pu.current_lk ~ '^LK [0-9]+\.?[0-9]*$' THEN
      CAST(SUBSTRING(pu.current_lk FROM 'LK ([0-9]+\.?[0-9]*)') AS numeric)
    ELSE 999
  END ASC;

