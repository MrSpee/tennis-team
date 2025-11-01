-- CHECK_ROBERT_STEP_BY_STEP.sql
-- Führe jeden Schritt einzeln aus!
-- ==========================================

-- ============================================
-- SCHRITT 1: Grunddaten von Robert
-- ============================================
SELECT 
  'SCHRITT 1: Spieler-Daten' as info,
  id,
  user_id,
  name,
  email,
  primary_team_id,
  player_type,
  is_active
FROM players_unified
WHERE email = 'robert.ellrich@icloud.com';

-- ============================================
-- SCHRITT 2: Team-Memberships von Robert
-- ============================================
SELECT 
  'SCHRITT 2: Team-Memberships' as info,
  tm.id as membership_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  ti.club_name,
  ti.team_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = (SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com')
ORDER BY tm.is_primary DESC;

-- ============================================
-- SCHRITT 3: Primary Team aufgelöst
-- ============================================
SELECT 
  'SCHRITT 3: Primary Team' as info,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- ============================================
-- SCHRITT 4: Rot-Gelb Sürth Team-ID
-- ============================================
SELECT 
  'SCHRITT 4: Rot-Gelb Sürth Teams' as info,
  id as team_id,
  club_name,
  team_name,
  category
FROM team_info
WHERE club_name ILIKE '%sürth%'
   OR club_name ILIKE '%suerth%'
ORDER BY category;

