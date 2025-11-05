-- MIGRATE_OLD_PLAYERS_TO_UNIFIED.sql
-- Migriere Spieler aus alter "players" Tabelle in "players_unified"
-- ==========================================

-- SCHRITT 1: Prüfe ob alte "players" Tabelle existiert
-- ==========================================
SELECT 
  '🔍 Prüfe alte Tabellen' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('players', 'player_teams', 'opponent_players')
ORDER BY table_name;

-- SCHRITT 2: Zeige alle Spieler aus "players" die NICHT in "players_unified" sind
-- ==========================================
-- WICHTIG: Nur ausführen wenn "players" Tabelle existiert!

SELECT 
  '⚠️ Spieler in OLD players aber NICHT in players_unified' as info,
  p.id as old_id,
  p.user_id,
  p.name,
  p.email,
  p.phone,
  p.ranking as old_lk,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  p.profile_image,
  p.favorite_shot,
  p.tennis_motto,
  p.fun_fact,
  p.worst_tennis_memory,
  p.best_tennis_memory,
  p.superstition,
  p.pre_match_routine,
  p.favorite_opponent,
  p.dream_match,
  p.birth_date,
  p.address,
  p.emergency_contact,
  p.emergency_phone,
  p.notes,
  p.season_start_lk,
  p.current_lk as new_current_lk,
  p.season_improvement,
  p.last_lk_update
FROM players p
WHERE NOT EXISTS (
  SELECT 1 
  FROM players_unified pu 
  WHERE pu.user_id = p.user_id
    OR pu.email = p.email
)
ORDER BY p.created_at DESC;

-- SCHRITT 3: MIGRATION - Kopiere fehlende Spieler in players_unified
-- ==========================================

BEGIN;

-- Migriere alle Spieler aus "players" die noch nicht in "players_unified" sind
INSERT INTO players_unified (
  id,                    -- Behalte alte ID
  user_id,
  name,
  email,
  phone,
  current_lk,
  season_start_lk,
  ranking,
  points,
  player_type,
  is_active,
  created_at,
  updated_at,
  status,
  onboarding_status,
  profile_image,
  favorite_shot,
  tennis_motto,
  fun_fact,
  worst_tennis_memory,
  best_tennis_memory,
  superstition,
  pre_match_routine,
  favorite_opponent,
  dream_match,
  birth_date,
  address,
  emergency_contact,
  emergency_phone,
  notes,
  season_improvement,
  last_lk_update,
  is_super_admin,
  admin_permissions,
  training_stats
)
SELECT 
  p.id,                    -- Behalte alte ID
  p.user_id,
  p.name,
  p.email,
  p.phone,
  -- Konvertiere ranking/current_lk zu VARCHAR
  CASE 
    WHEN p.current_lk IS NOT NULL THEN p.current_lk
    WHEN p.ranking IS NOT NULL AND p.ranking != '' THEN p.ranking
    ELSE NULL
  END as current_lk,
  CASE 
    WHEN p.season_start_lk IS NOT NULL THEN p.season_start_lk
    WHEN p.ranking IS NOT NULL AND p.ranking != '' THEN p.ranking
    ELSE NULL
  END as season_start_lk,
  CASE 
    WHEN p.ranking IS NOT NULL AND p.ranking != '' THEN p.ranking
    ELSE NULL
  END as ranking,
  COALESCE(p.points, 0) as points,
  'app_user' as player_type,
  COALESCE(p.is_active, true) as is_active,
  p.created_at,
  p.updated_at,
  CASE 
    WHEN p.is_active THEN 'active'
    ELSE 'inactive'
  END as status,
  CASE 
    WHEN p.user_id IS NOT NULL THEN 'completed'
    ELSE 'not_started'
  END as onboarding_status,
  p.profile_image,
  p.favorite_shot,
  p.tennis_motto,
  p.fun_fact,
  p.worst_tennis_memory,
  p.best_tennis_memory,
  p.superstition,
  p.pre_match_routine,
  p.favorite_opponent,
  p.dream_match,
  p.birth_date,
  p.address,
  p.emergency_contact,
  p.emergency_phone,
  p.notes,
  p.season_improvement,
  p.last_lk_update,
  COALESCE(p.is_super_admin, false) as is_super_admin,
  COALESCE(p.admin_permissions, '{}'::jsonb) as admin_permissions,
  COALESCE(p.training_stats, '{"last_attended": null, "total_invites": 0, "total_attended": 0, "total_declined": 0, "attendance_rate": 0.0, "consecutive_declines": 0}'::jsonb) as training_stats
FROM players p
WHERE NOT EXISTS (
  SELECT 1 
  FROM players_unified pu 
  WHERE pu.user_id = p.user_id
    OR pu.email = p.email
)
AND p.is_active = true; -- Nur aktive Spieler migrieren

-- Zähle migrierte Spieler
SELECT 
  '✅ Migration abgeschlossen' as info,
  COUNT(*) as migrated_players
FROM players p
WHERE NOT EXISTS (
  SELECT 1 
  FROM players_unified pu 
  WHERE pu.user_id = p.user_id
    OR pu.email = p.email
)
AND p.is_active = true;

COMMIT;

-- SCHRITT 4: Migriere player_teams zu team_memberships
-- ==========================================
-- WICHTIG: Nur ausführen wenn "player_teams" Tabelle existiert!

BEGIN;

INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  is_active,
  season,
  created_at
)
SELECT 
  pt.player_id,
  pt.team_id,
  COALESCE(p.role, 'player') as role,
  true as is_primary, -- Alle als Primary (kann später angepasst werden)
  pt.is_active,
  'Winter 2025/26' as season, -- Default-Saison
  pt.joined_at
FROM player_teams pt
JOIN players p ON pt.player_id = p.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM team_memberships tm 
  WHERE tm.player_id = pt.player_id 
    AND tm.team_id = pt.team_id
)
AND pt.is_active = true;

-- Zähle migrierte Team-Zuordnungen
SELECT 
  '✅ Team-Zuordnungen migriert' as info,
  COUNT(*) as migrated_memberships
FROM player_teams pt
WHERE NOT EXISTS (
  SELECT 1 
  FROM team_memberships tm 
  WHERE tm.player_id = pt.player_id 
    AND tm.team_id = pt.team_id
)
AND pt.is_active = true;

COMMIT;

-- SCHRITT 5: Update primary_team_id in players_unified
-- ==========================================

BEGIN;

UPDATE players_unified pu
SET primary_team_id = (
  SELECT tm.team_id
  FROM team_memberships tm
  WHERE tm.player_id = pu.id
    AND tm.is_active = true
  ORDER BY tm.is_primary DESC, tm.created_at ASC
  LIMIT 1
)
WHERE pu.primary_team_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM team_memberships tm
    WHERE tm.player_id = pu.id
      AND tm.is_active = true
  );

-- Zähle aktualisierte Spieler
SELECT 
  '✅ primary_team_id gesetzt' as info,
  COUNT(*) as updated_players
FROM players_unified pu
WHERE pu.primary_team_id IS NOT NULL
  AND pu.user_id IS NOT NULL;

COMMIT;

-- SCHRITT 6: VERIFICATION - Zeige alle migrierten Spieler
-- ==========================================
SELECT 
  '✅ Migrierte Spieler mit Teams' as info,
  pu.id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  (
    SELECT COUNT(*)
    FROM team_memberships tm
    WHERE tm.player_id = pu.id AND tm.is_active = true
  ) as team_count
FROM players_unified pu
LEFT JOIN team_info ti ON pu.primary_team_id = ti.id
WHERE pu.user_id IS NOT NULL
  AND pu.player_type = 'app_user'
ORDER BY pu.name;

-- SCHRITT 7: Spezifisch Robert Ellrich prüfen
-- ==========================================
SELECT 
  '🔍 Robert Ellrich nach Migration' as info,
  pu.id,
  pu.user_id,
  pu.name,
  pu.email,
  pu.current_lk,
  pu.primary_team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  tm.is_active as membership_active,
  tm.is_primary as is_primary_team
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.email = 'robert.ellrich@icloud.com';

-- SCHRITT 8: Zeige VKC-Spieler sortiert nach LK (zur Überprüfung)
-- ==========================================
SELECT 
  '📋 Alle VKC-Spieler (sortiert nach LK)' as info,
  pu.name,
  pu.current_lk,
  pu.email,
  ti.category as team,
  ti.team_name
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
JOIN team_info ti ON tm.team_id = ti.id
WHERE ti.club_name ILIKE '%VKC%'
ORDER BY 
  CASE 
    WHEN pu.current_lk ~ '^LK [0-9]+\.?[0-9]*$' THEN
      CAST(SUBSTRING(pu.current_lk FROM 'LK ([0-9]+\.?[0-9]*)') AS numeric)
    ELSE 999
  END ASC,
  pu.name;

-- HINWEISE:
-- ==========================================
-- 1. Dieses Script prüft zuerst die Situation
-- 2. Dann migriert es automatisch fehlende Spieler
-- 3. Prüft Robert Ellrich spezifisch
-- 4. Zeigt alle VKC-Spieler zur Überprüfung
-- 
-- WICHTIG: 
-- - Falls "players" Tabelle nicht existiert, werden nur die CHECK-Queries ausgeführt
-- - Migration erfolgt nur wenn alte Daten vorhanden sind
-- - Team-Zuordnungen werden aus "player_teams" übernommen (falls vorhanden)




