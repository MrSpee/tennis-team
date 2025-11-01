-- CHECK_ROBERT_ELLRICH.sql
-- Detaillierte Analyse für robert.ellrich@icloud.com
-- ==========================================

-- SCHRITT 1: Spieler-Daten prüfen
-- ==========================================
SELECT 
  '🔍 SPIELER-DATEN' as info,
  id,
  user_id,
  name,
  email,
  current_lk,
  primary_team_id,
  player_type,
  is_active,
  onboarding_status,
  created_at,
  updated_at
FROM players_unified
WHERE email = 'robert.ellrich@icloud.com'
ORDER BY created_at DESC;

-- SCHRITT 2: Team-Zuordnungen prüfen
-- ==========================================
SELECT 
  '🏆 TEAM-ZUORDNUNGEN' as info,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.role,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.created_at,
  tm.season
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id IN (
  SELECT id FROM players_unified WHERE email = 'robert.ellrich@icloud.com'
)
ORDER BY tm.is_primary DESC, tm.created_at DESC;

-- SCHRITT 3: Primary Team prüfen
-- ==========================================
SELECT 
  '⭐ PRIMARY TEAM' as info,
  p.id as player_id,
  p.name as player_name,
  p.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- SCHRITT 4: Alle Teams mit "Rot-Gelb" oder "Rot-Weiss" im Namen
-- ==========================================
SELECT 
  '🔍 VERFÜGBARE TEAMS (Rot-Gelb vs Rot-Weiss)' as info,
  id,
  club_name,
  team_name,
  category,
  region
FROM team_info
WHERE club_name ILIKE '%rot%'
ORDER BY club_name, category;

-- SCHRITT 5: Prüfe welche Spieler in Rot-Gelb Sürth sind
-- ==========================================
SELECT 
  '👥 SPIELER IN ROT-GELB SÜRTH' as info,
  p.id,
  p.name,
  p.email,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_primary
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
JOIN team_info ti ON tm.team_id = ti.id
WHERE ti.club_name ILIKE '%rot-gelb%sürth%'
  AND tm.is_active = true
ORDER BY ti.category, p.name;

-- SCHRITT 6: Prüfe welche Spieler in TC Rot-Weiss Köln sind
-- ==========================================
SELECT 
  '👥 SPIELER IN TC ROT-WEISS KÖLN' as info,
  p.id,
  p.name,
  p.email,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_primary
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
JOIN team_info ti ON tm.team_id = ti.id
WHERE ti.club_name ILIKE '%rot-weiss%köln%'
  AND tm.is_active = true
ORDER BY ti.category, p.name;

-- SCHRITT 7: User-ID zu Email-Mapping
-- ==========================================
SELECT 
  '🔑 USER-ID CHECK' as info,
  user_id,
  COUNT(*) as player_count,
  STRING_AGG(name, ', ') as player_names
FROM players_unified
WHERE email = 'robert.ellrich@icloud.com'
GROUP BY user_id;

