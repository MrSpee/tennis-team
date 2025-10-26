-- UNIFIED PLAYER SYSTEM MIGRATION
-- Phase 2: Migriere Daten von Legacy-Tabellen

-- 0. Debug: Prüfe problematische Team-Referenzen
SELECT 
  'DEBUG: Invalid Team References' as info,
  op.id as opponent_player_id,
  op.name,
  op.team_id,
  CASE 
    WHEN ti.id IS NULL THEN 'MISSING'
    ELSE 'EXISTS'
  END as team_status
FROM opponent_players op
LEFT JOIN team_info ti ON op.team_id = ti.id
WHERE op.team_id IS NOT NULL
ORDER BY team_status DESC;

-- 1. Migriere App-User von players → players_unified
INSERT INTO players_unified (
  id,
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
  updated_at
)
SELECT 
  id,
  user_id,
  name,
  email,
  phone,
  current_lk,
  season_start_lk,
  ranking,
  points,
  'app_user' as player_type,
  is_active,
  created_at,
  updated_at
FROM players
WHERE user_id IS NOT NULL; -- Nur echte App-User

-- 2. Migriere externe Spieler von players → players_unified (ohne user_id)
INSERT INTO players_unified (
  id,
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
  updated_at
)
SELECT 
  id,
  NULL as user_id, -- Kein App-Account
  name,
  email,
  phone,
  current_lk,
  season_start_lk,
  ranking,
  points,
  'external' as player_type,
  is_active,
  created_at,
  updated_at
FROM players
WHERE user_id IS NULL; -- Externe Spieler ohne App-Account

-- 3. Migriere Gegner-Spieler von opponent_players → players_unified
INSERT INTO players_unified (
  id,
  user_id,
  name,
  email,
  phone,
  current_lk,
  season_start_lk,
  ranking,
  points,
  player_type,
  tvm_id,
  info,
  is_captain,
  nation,
  position,
  primary_team_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  op.id,
  NULL as user_id, -- Kein App-Account
  op.name,
  NULL as email, -- Gegner haben keine Email
  NULL as phone, -- Gegner haben keine Telefonnummer
  CASE 
    WHEN op.lk IS NOT NULL THEN 'LK ' || op.lk::text
    ELSE NULL
  END as current_lk, -- Konvertiere numeric zu VARCHAR
  CASE 
    WHEN op.lk IS NOT NULL THEN 'LK ' || op.lk::text
    ELSE NULL
  END as season_start_lk, -- Gleiche Logik
  CASE 
    WHEN op.lk IS NOT NULL THEN 'LK ' || op.lk::text
    ELSE NULL
  END as ranking, -- Gleiche Logik
  0 as points, -- Gegner haben keine Punkte
  'opponent' as player_type,
  op.tvm_id,
  op.info,
  COALESCE(op.is_captain, false) as is_captain,
  op.nation,
  op.position,
  op.team_id as primary_team_id, -- Nur wenn team_id in team_info existiert
  COALESCE(op.is_active, true) as is_active,
  COALESCE(op.created_at, NOW()) as created_at,
  COALESCE(op.updated_at, NOW()) as updated_at
FROM opponent_players op
LEFT JOIN team_info ti ON op.team_id = ti.id
WHERE ti.id IS NOT NULL; -- Nur Gegner mit gültigen Team-Referenzen

-- 4. Migriere Team-Zuordnungen von player_teams → team_memberships
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  season,
  is_active,
  approved_by,
  approved_at,
  created_at
)
SELECT 
  pt.player_id,
  pt.team_id,
  COALESCE(pt.role, 'player') as role,
  COALESCE(pt.is_primary, false) as is_primary,
  'winter_25_26' as season, -- Aktuelle Saison
  true as is_active, -- Alle aktiven Zuordnungen
  pt.approved_by,
  pt.approved_at,
  COALESCE(pt.created_at, NOW()) as created_at
FROM player_teams pt
WHERE pt.player_id IN (SELECT id FROM players_unified WHERE player_type = 'app_user');

-- 5. Migriere Team-Zuordnungen für Gegner-Spieler
INSERT INTO team_memberships (
  player_id,
  team_id,
  role,
  is_primary,
  season,
  is_active,
  created_at
)
SELECT 
  op.id as player_id,
  op.team_id,
  CASE 
    WHEN op.is_captain = true THEN 'captain'
    ELSE 'player'
  END as role,
  false as is_primary, -- Gegner sind nie Primary-Team
  'winter_25_26' as season, -- Aktuelle Saison
  COALESCE(op.is_active, true) as is_active,
  COALESCE(op.created_at, NOW()) as created_at
FROM opponent_players op
LEFT JOIN team_info ti ON op.team_id = ti.id
WHERE op.team_id IS NOT NULL 
  AND ti.id IS NOT NULL; -- Nur gültige Team-Referenzen

-- 6. Validiere Migration
SELECT 
  'MIGRATION VALIDATION:' as info,
  'App Users migrated' as type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'app_user'
UNION ALL
SELECT 
  'MIGRATION VALIDATION:' as info,
  'External Players migrated' as type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'external'
UNION ALL
SELECT 
  'MIGRATION VALIDATION:' as info,
  'Opponent Players migrated' as type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'opponent'
UNION ALL
SELECT 
  'MIGRATION VALIDATION:' as info,
  'Team Memberships created' as type,
  COUNT(*) as count
FROM team_memberships;

-- 7. Zeige Beispiel-Daten
SELECT 
  'SAMPLE MIGRATED DATA:' as info,
  player_type,
  name,
  current_lk,
  is_active
FROM players_unified
ORDER BY player_type, name
LIMIT 10;
