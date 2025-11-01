-- CHECK_MISSING_PLAYERS_AND_MIGRATE.sql
-- Prüfe welche Spieler noch nicht in players_unified sind oder keine Team-Zuordnung haben
-- ==========================================

-- SCHRITT 1: Prüfe Robert Ellrich
-- ==========================================
SELECT 
  '🔍 Robert Ellrich Status' as info,
  pu.id,
  pu.user_id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.player_type,
  pu.is_active,
  pu.primary_team_id,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.player_id = pu.id AND tm.is_active = true
  ) as active_team_count
FROM players_unified pu
WHERE pu.email = 'robert.ellrich@icloud.com';

-- SCHRITT 2: Prüfe alle Spieler OHNE Team-Zuordnung
-- ==========================================
SELECT 
  '⚠️ Spieler OHNE Team-Zuordnung' as info,
  pu.id,
  pu.user_id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.player_type,
  pu.is_active,
  pu.onboarding_status,
  pu.created_at
FROM players_unified pu
WHERE pu.is_active = true
  AND pu.user_id IS NOT NULL -- Nur registrierte Spieler
  AND NOT EXISTS (
    SELECT 1 
    FROM team_memberships tm 
    WHERE tm.player_id = pu.id 
      AND tm.is_active = true
  )
ORDER BY pu.created_at DESC;

-- SCHRITT 3: Prüfe Raoul van Herwijnen
-- ==========================================
SELECT 
  '🔍 Raoul van Herwijnen Status' as info,
  pu.id,
  pu.user_id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.player_type,
  pu.is_active,
  pu.primary_team_id
FROM players_unified pu
WHERE pu.name ILIKE '%Raoul%' OR pu.email ILIKE '%raoul%';

-- SCHRITT 4: Zeige Team-Zuordnungen für Raoul
-- ==========================================
SELECT 
  '🔍 Raoul Team-Zuordnungen' as info,
  tm.id as membership_id,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active,
  tm.is_primary,
  tm.season,
  tm.role
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
JOIN players_unified pu ON tm.player_id = pu.id
WHERE pu.name ILIKE '%Raoul%'
ORDER BY tm.is_active DESC, tm.is_primary DESC;

-- SCHRITT 5: Finde alle VKC Köln Teams
-- ==========================================
SELECT 
  '🏢 VKC Köln Teams' as info,
  ti.id as team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.team_id = ti.id AND tm.is_active = true
  ) as active_player_count
FROM team_info ti
WHERE ti.club_name ILIKE '%VKC%' 
  OR ti.club_name ILIKE '%Köln%'
ORDER BY ti.category, ti.team_name;

-- SCHRITT 6: FIX - Füge Robert Ellrich zu seinem Team hinzu (MANUELL ANPASSEN!)
-- ==========================================
-- WICHTIG: Team-ID basierend auf obigen Ergebnissen anpassen!

-- Beispiel: VKC Köln Herren 30 1 (ID aus FIX_PLAYER_TEAMS_COMPLETE.sql: 13226200-a7cd-40df-96ae-6a19c8ef351e)

BEGIN;

-- Finde Robert Ellrich
DO $$
DECLARE
  v_robert_id UUID;
  v_vkc_herren_30_id UUID := '13226200-a7cd-40df-96ae-6a19c8ef351e'::uuid;
  v_vkc_herren_40_id UUID := '235fade5-0974-4f5b-a758-536f771a5e80'::uuid;
BEGIN
  -- Hole Robert's ID
  SELECT id INTO v_robert_id
  FROM players_unified
  WHERE email = 'robert.ellrich@icloud.com';

  IF v_robert_id IS NULL THEN
    RAISE NOTICE '❌ Robert Ellrich nicht gefunden!';
  ELSE
    RAISE NOTICE '✅ Robert Ellrich gefunden: %', v_robert_id;
    
    -- Prüfe ob bereits Team-Zuordnung existiert
    IF EXISTS (
      SELECT 1 
      FROM team_memberships 
      WHERE player_id = v_robert_id AND is_active = true
    ) THEN
      RAISE NOTICE '⚠️ Robert hat bereits eine Team-Zuordnung';
    ELSE
      -- Füge zu VKC Köln Herren 40 1 hinzu (basierend auf seiner LK 13.9)
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
        v_vkc_herren_40_id,
        'player',
        true,
        true,
        'Winter 2025/26',
        NOW()
      );
      
      -- Update primary_team_id
      UPDATE players_unified
      SET primary_team_id = v_vkc_herren_40_id
      WHERE id = v_robert_id;
      
      RAISE NOTICE '✅ Robert Ellrich zu VKC Köln Herren 40 1 hinzugefügt';
    END IF;
  END IF;
END $$;

COMMIT;

-- SCHRITT 7: VERIFICATION - Prüfe Robert nach der Migration
-- ==========================================
SELECT 
  '✅ Robert Ellrich nach Migration' as info,
  pu.id,
  pu.name,
  pu.email,
  pu.current_lk,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_primary,
  tm.is_active
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.email = 'robert.ellrich@icloud.com';

-- SCHRITT 8: Zeige ALLE VKC-Spieler (zur Überprüfung der Sortierung)
-- ==========================================
SELECT 
  '📋 Alle VKC-Spieler (sortiert nach LK)' as info,
  pu.name,
  pu.current_lk,
  pu.email,
  ti.category as team
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
JOIN team_info ti ON tm.team_id = ti.id
WHERE ti.club_name ILIKE '%VKC%'
ORDER BY 
  CASE 
    WHEN pu.current_lk ~ '^LK [0-9]+\.?[0-9]*$' THEN
      CAST(SUBSTRING(pu.current_lk FROM 'LK ([0-9]+\.?[0-9]*)') AS numeric)
    ELSE 999
  END ASC;

-- SCHRITT 9: Prüfe ob es eine alte "players" Tabelle gibt
-- ==========================================
SELECT 
  '🔍 Alte Tabellen Check' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('players', 'player_teams', 'opponent_players')
ORDER BY table_name;

-- SCHRITT 10: Falls alte "players" Tabelle existiert, zeige Unterschiede
-- ==========================================
-- UNCOMMENT NUR WENN "players" Tabelle existiert:
/*
SELECT 
  '⚠️ Spieler in OLD players aber NICHT in players_unified' as info,
  p.id,
  p.name,
  p.email,
  p.ranking as old_lk
FROM players p
WHERE NOT EXISTS (
  SELECT 1 
  FROM players_unified pu 
  WHERE pu.email = p.email
)
ORDER BY p.name;
*/

