-- FIND_PLAYERS_MISSING_PRIMARY_TEAM.sql
-- Findet alle Spieler, die team_memberships haben aber kein primary_team_id
-- ==========================================

-- SCHRITT 1: Spieler mit NULL primary_team_id aber aktiven Memberships
-- ==========================================
SELECT 
  '❌ SPIELER OHNE PRIMARY TEAM (haben aber Memberships)' as info,
  p.id,
  p.name,
  p.email,
  p.primary_team_id,
  p.player_type,
  p.is_active,
  COUNT(tm.id) as active_memberships
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
WHERE p.primary_team_id IS NULL
  AND p.player_type = 'app_user'
  AND p.is_active = true
GROUP BY p.id, p.name, p.email, p.primary_team_id, p.player_type, p.is_active
HAVING COUNT(tm.id) > 0
ORDER BY p.name;

-- SCHRITT 2: Details zu den Memberships dieser Spieler
-- ==========================================
WITH missing_primary AS (
  SELECT p.id
  FROM players_unified p
  LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
  WHERE p.primary_team_id IS NULL
    AND p.player_type = 'app_user'
    AND p.is_active = true
  GROUP BY p.id
  HAVING COUNT(tm.id) > 0
)
SELECT 
  '🔍 IHRE TEAM-MEMBERSHIPS' as info,
  p.id as player_id,
  p.name as player_name,
  p.email,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_primary as is_primary_in_memberships
FROM players_unified p
JOIN missing_primary mp ON p.id = mp.id
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
ORDER BY p.name, tm.is_primary DESC, ti.club_name;

-- SCHRITT 3: Inkonsistenzen (primary_team_id stimmt nicht mit is_primary überein)
-- ==========================================
SELECT 
  '⚠️ INKONSISTENTE ZUORDNUNGEN' as info,
  p.id as player_id,
  p.name,
  p.email,
  p.primary_team_id as player_primary_team_id,
  (SELECT club_name FROM team_info WHERE id = p.primary_team_id) as current_primary_club,
  tm.team_id as membership_team_id,
  ti.club_name as membership_club,
  ti.category as membership_category,
  tm.is_primary as membership_is_primary,
  CASE 
    WHEN p.primary_team_id IS NULL THEN 'NULL primary_team_id'
    WHEN p.primary_team_id != tm.team_id AND tm.is_primary = true THEN 'Mismatch: primary_team_id != is_primary team'
    ELSE 'OK'
  END as issue
FROM players_unified p
JOIN team_memberships tm ON p.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE p.player_type = 'app_user'
  AND p.is_active = true
  AND tm.is_active = true
  AND (
    p.primary_team_id IS NULL 
    OR (p.primary_team_id != tm.team_id AND tm.is_primary = true)
  )
ORDER BY p.name;

-- SCHRITT 4: Zeige das erste Team in team_info (alphabetisch)
-- ==========================================
SELECT 
  '🔍 ERSTES TEAM IN DB (Fallback-Kandidat)' as info,
  id,
  club_name,
  team_name,
  category
FROM team_info
ORDER BY club_name, category
LIMIT 5;

-- HINWEIS:
-- ==========================================
-- Spieler mit NULL primary_team_id bekommen in DataContext.jsx
-- den Fallback auf .limit(1) aus team_info, was vermutlich
-- "TC Rot-Weiss Köln" ist (alphabetisch erstes Team).


