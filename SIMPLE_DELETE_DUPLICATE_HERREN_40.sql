-- SIMPLE_DELETE_DUPLICATE_HERREN_40.sql
-- Löscht den älteren Duplikat für Herren 40 1

-- 1. Zeige beide Einträge
SELECT 
  'CURRENT ENTRIES' as status,
  ts.id,
  ts.created_at,
  ts.updated_at,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND ts.is_active = true
ORDER BY ts.created_at ASC;

-- 2. LÖSCHE den älteren Eintrag (ID: e31ddcc9-e8e1-4fbe-b599-99ae43d1d170, created: 2025-10-08)
DELETE FROM team_seasons
WHERE id = 'e31ddcc9-e8e1-4fbe-b599-99ae43d1d170'
RETURNING 'DELETED OLDER ENTRY' as status, id, created_at, league, group_name;

-- 3. Verification - es sollte nur noch 1 Eintrag geben
SELECT 
  'VERIFICATION - Only 1 entry should remain' as status,
  ts.id,
  ts.created_at,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND ts.is_active = true;

