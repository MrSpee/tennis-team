-- ADD_HERREN_40_1_SEASON.sql
-- Fügt die fehlende team_seasons für VKC Köln Herren 40 1 hinzu

-- 1. Check ob team_seasons bereits existiert
SELECT 
  'Check existing' as info,
  ts.*
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND ts.season = 'winter_25_26';

-- 2. Füge team_seasons hinzu (FALLS NICHT EXISTIERT)
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
  'Gr. 035',  -- Gleiche Gruppe wie Herren 30 (vorübergehend)
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
RETURNING *;

-- 3. Verification
SELECT 
  'Verification' as info,
  ts.*,
  ti.team_name,
  ti.club_name
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ti.id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND ts.season = 'winter_25_26';
