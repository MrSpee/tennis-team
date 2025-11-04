-- FIX_MARKUS_TEAM.sql
-- Verschiebe Markus Wilwerscheid zu VKC Köln Herren 40 - 1. Mannschaft
-- Gleiches Team wie Raoul (hat 4 Matches)
-- ==========================================

-- ==========================================
-- SCHRITT 1: PRÜFE AKTUELLEN STATUS
-- ==========================================
SELECT 
  '1️⃣ AKTUELLER STATUS' as step,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name as current_club,
  ti.category as current_category,
  ti.team_name as current_team_name,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = p.primary_team_id OR away_team_id = p.primary_team_id) as current_team_matches
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'markus@domrauschen.com';

-- ==========================================
-- SCHRITT 2: FINDE ZIEL-TEAM (VKC Köln Herren 40 - 1)
-- ==========================================
SELECT 
  '2️⃣ ZIEL-TEAM' as step,
  ti.id as target_team_id,
  ti.club_name,
  ti.category,
  ti.team_name,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = ti.id OR away_team_id = ti.id) as team_matches,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id AND is_active = true) as active_members
FROM team_info ti
WHERE ti.club_name = 'VKC Köln'
  AND ti.category = 'Herren 40'
  AND ti.team_name = ' 1';

-- ==========================================
-- SCHRITT 3: UPDATE TEAM MEMBERSHIP
-- ==========================================
-- Deaktiviere alte Memberships
UPDATE team_memberships
SET is_active = false,
    is_primary = false
WHERE player_id = (SELECT id FROM players_unified WHERE email = 'markus@domrauschen.com')
  AND is_active = true;

-- Erstelle oder aktiviere neue Membership für VKC Köln Herren 40 - 1
DO $$
DECLARE
  v_player_id UUID;
  v_target_team_id UUID;
  v_existing_membership_id UUID;
BEGIN
  -- Hole Player ID
  SELECT id INTO v_player_id 
  FROM players_unified 
  WHERE email = 'markus@domrauschen.com';

  -- Hole Target Team ID (VKC Köln Herren 40 - 1)
  SELECT id INTO v_target_team_id
  FROM team_info
  WHERE club_name = 'VKC Köln'
    AND category = 'Herren 40'
    AND team_name = ' 1';

  -- Prüfe ob Membership bereits existiert (auch wenn inaktiv)
  SELECT id INTO v_existing_membership_id
  FROM team_memberships
  WHERE player_id = v_player_id
    AND team_id = v_target_team_id;

  IF v_existing_membership_id IS NOT NULL THEN
    -- Membership existiert → Aktiviere und setze als PRIMARY
    UPDATE team_memberships
    SET is_active = true,
        is_primary = true,
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
      v_target_team_id,
      'player',
      true,
      true,
      'winter_25_26'
    );

    RAISE NOTICE '✅ New membership created for team: %', v_target_team_id;
  END IF;
END $$;

-- ==========================================
-- SCHRITT 4: UPDATE PRIMARY TEAM IN PLAYERS_UNIFIED
-- ==========================================
UPDATE players_unified
SET primary_team_id = (
  SELECT id 
  FROM team_info 
  WHERE club_name = 'VKC Köln' 
    AND category = 'Herren 40' 
    AND team_name = ' 1'
)
WHERE email = 'markus@domrauschen.com';

-- ==========================================
-- SCHRITT 5: VERIFIKATION
-- ==========================================
SELECT 
  '5️⃣ ✅ VERIFIKATION' as step,
  p.name,
  p.email,
  p.primary_team_id,
  ti.club_name as new_club,
  ti.category as new_category,
  ti.team_name as new_team_name,
  tm.is_active as membership_active,
  tm.is_primary as membership_primary,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = p.primary_team_id OR away_team_id = p.primary_team_id) as available_matches,
  CASE 
    WHEN p.primary_team_id = tm.team_id AND tm.is_active = true AND tm.is_primary = true 
      AND (SELECT COUNT(*) FROM matchdays WHERE home_team_id = p.primary_team_id OR away_team_id = p.primary_team_id) > 0
    THEN '🎉 PERFEKT! Markus sollte jetzt Matches sehen!'
    ELSE '⚠️ Prüfe Details'
  END as status
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true AND tm.is_primary = true
JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'markus@domrauschen.com';

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- SCHRITT 1 (AKTUELL):
-- - current_club: VKC Köln
-- - current_category: Herren 30
-- - current_team_matches: 0 ❌
-- 
-- SCHRITT 2 (ZIEL):
-- - target_team_id: 235fade5-0974-4f5b-a758-536f771a5e80
-- - club_name: VKC Köln
-- - category: Herren 40
-- - team_name:  1
-- - team_matches: 4 ✅
-- 
-- SCHRITT 5 (VERIFIKATION):
-- - new_club: VKC Köln
-- - new_category: Herren 40
-- - membership_active: true
-- - membership_primary: true
-- - available_matches: 4
-- - status: 🎉 PERFEKT! Markus sollte jetzt Matches sehen!
-- 
-- NÄCHSTER SCHRITT:
-- → Markus muss Logout + Login
-- → Sollte dann 4 Matches sehen (wie Raoul)
-- ==========================================



