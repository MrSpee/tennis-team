-- FIX_HERREN_40_1_COMPLETE.sql
-- Vollständiger Fix für VKC Köln Herren 40 1 Team

-- 1. Prüfe alle Team-Mitgliedschaften für Herren 40 1
SELECT 
  'Team Memberships for Herren 40 1' as info,
  tm.player_id,
  tm.is_active,
  tm.is_primary,
  pu.name as player_name,
  pu.email
FROM team_memberships tm
JOIN players_unified pu ON tm.player_id = pu.id
WHERE tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
ORDER BY tm.is_primary DESC, pu.name;

-- 2. Prüfe ob team_seasons existiert
SELECT 
  'Existing team_seasons' as info,
  ts.*
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80';

-- 3. Erstelle team_seasons FALLS NICHT EXISTIERT
INSERT INTO team_seasons (
  team_id,
  season,
  league,
  group_name,
  team_size,
  is_active,
  created_at
)
SELECT
  '235fade5-0974-4f5b-a758-536f771a5e80'::uuid,
  'winter_25_26',
  '2. Bezirksliga',
  'Gr. 035',  -- Gleiche Gruppe wie Herren 30
  (
    SELECT COUNT(*)::int
    FROM team_memberships tm
    WHERE tm.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
      AND tm.is_active = true
  ),
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons 
  WHERE team_id = '235fade5-0974-4f5b-a758-536f771a5e80' 
    AND season = 'winter_25_26'
)
RETURNING 'team_seasons created' as status, *;

-- 4. Setze Hauptmannschaft: Herren 30 sollte PRIMARY sein
UPDATE team_memberships
SET is_primary = true
WHERE team_id = '6c38c710-28dd-41fe-b991-b7180ef23ca1'
  AND player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND is_active = true;

-- 5. Setze Herren 40 1 zu FALSE (nicht primary)
UPDATE team_memberships
SET is_primary = false
WHERE team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND is_active = true;

-- 6. FINAL VERIFICATION
SELECT 
  'FINAL VERIFICATION' as info,
  tm.team_id,
  ti.team_name,
  ti.club_name,
  tm.is_primary,
  tm.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  (
    SELECT COUNT(*)
    FROM team_memberships tmc
    WHERE tmc.team_id = tm.team_id AND tmc.is_active = true
  ) as actual_player_count
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
LEFT JOIN team_seasons ts ON tm.team_id = ts.team_id AND tm.season = ts.season AND ts.is_active = true
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
  AND tm.is_active = true
ORDER BY tm.is_primary DESC, ti.team_name;







