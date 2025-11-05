-- FIX_MISSING_TEAMS_EXECUTE.sql
-- AUSFÜHRBARES Script zum Reparieren fehlender Team-Zuordnungen

-- Spieler-IDs:
-- Raoul van Herwijnen: 319d0946-bbc8-4746-a300-372a99ddcc44
-- Alexander Elwert: 71d0bcd9-1da4-406d-88c2-f3ccc25938df
-- Markus Wilwerscheid: a869f4e3-6424-423f-9c92-a2895f3f0464
-- Marc Stoppenbach: a18c5c2a-2d6b-4e09-89f1-3802238c215e

-- Bekannte VKC Team-IDs:
-- VKC Köln Herren 30: 6c38c710-28dd-41fe-b991-b7180ef23ca1
-- VKC Köln Herren 40 1: 235fade5-0974-4f5b-a758-536f771a5e80

-- ==========================================
-- SCHRITT 1: Prüfe aktuelle Situation
-- ==========================================

SELECT 
  'STEP 1: Aktuelle Situation' as info,
  pu.id,
  pu.name,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  ti.club_name,
  ti.team_name,
  ti.category
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
ORDER BY pu.name;

-- ==========================================
-- SCHRITT 2: Erstelle Team-Mitgliedschaften für Spieler ohne Team
-- ==========================================

-- OPTION A: Ordne alle dem Herren 30 Team zu (Default)
INSERT INTO team_memberships (
  player_id,
  team_id,
  season,
  is_active,
  is_primary,
  role,
  created_at
)
SELECT 
  pu.id,
  '6c38c710-28dd-41fe-b991-b7180ef23ca1'::uuid, -- VKC Herren 30
  'winter_25_26',
  true,
  true, -- Primär-Team
  'player',
  NOW()
FROM players_unified pu
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
AND NOT EXISTS (
  -- Nur wenn noch keine aktive Mitgliedschaft existiert
  SELECT 1 FROM team_memberships tm 
  WHERE tm.player_id = pu.id 
  AND tm.is_active = true
)
RETURNING 'Neue Mitgliedschaft erstellt' as status, *;

-- ==========================================
-- SCHRITT 3: Aktualisiere primary_team_id in players_unified
-- ==========================================

UPDATE players_unified pu
SET primary_team_id = tm.team_id,
    updated_at = NOW()
FROM team_memberships tm
WHERE tm.player_id = pu.id
  AND tm.is_primary = true
  AND tm.is_active = true
  AND pu.id IN (
    '319d0946-bbc8-4746-a300-372a99ddcc44',
    '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
    'a869f4e3-6424-423f-9c92-a2895f3f0464',
    'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
  )
  AND (pu.primary_team_id IS NULL OR pu.primary_team_id != tm.team_id)
RETURNING 'primary_team_id aktualisiert' as status, pu.id, pu.name, pu.primary_team_id;

-- ==========================================
-- SCHRITT 4: VERIFIKATION
-- ==========================================

-- Zeige finale Team-Zuordnungen
SELECT 
  'STEP 4: FINALE VERIFIKATION' as info,
  pu.id,
  pu.name as player_name,
  pu.email,
  tm.team_id,
  tm.is_primary,
  tm.is_active,
  ti.club_name,
  ti.team_name,
  ti.category,
  pu.primary_team_id,
  CASE 
    WHEN tm.team_id IS NULL THEN '❌ KEIN TEAM'
    WHEN pu.primary_team_id IS NULL THEN '⚠️ TEAM OHNE PRIMARY'
    ELSE '✅ OK'
  END as status
FROM players_unified pu
LEFT JOIN team_memberships tm ON pu.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE pu.id IN (
  '319d0946-bbc8-4746-a300-372a99ddcc44',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df',
  'a869f4e3-6424-423f-9c92-a2895f3f0464',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e'
)
ORDER BY pu.name;

-- ==========================================
-- HINWEISE:
-- ==========================================
-- 1. Dieses Script ordnet ALLE genannten Spieler dem VKC Herren 30 Team zu
-- 2. Falls einzelne Spieler andere Teams haben sollen, müssen die Team-IDs in Schritt 2 angepasst werden
-- 3. Der primary_team_id wird automatisch auf das is_primary=true Team gesetzt
-- 4. Nach dem Ausführen sollten alle Spieler ein Team haben




