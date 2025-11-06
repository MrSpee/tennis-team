-- ============================================
-- FIX: Erstelle team_seasons für VKC Herren 30
-- ============================================
-- Nach dem Merge fehlt der team_seasons Eintrag
-- ============================================

-- Prüfe ob Herren 30 team_seasons hat
SELECT 
  'VORHER' as status,
  ti.id as team_id,
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.id as season_id,
  ts.season,
  ts.league,
  ts.group_name
FROM team_info ti
LEFT JOIN team_seasons ts ON ts.team_id = ti.id AND ts.is_active = true
WHERE ti.club_name ILIKE '%VKC%'
  AND ti.category = 'Herren 30';

-- Erstelle team_seasons Eintrag
INSERT INTO team_seasons (
  team_id,
  season,
  league,
  group_name,
  team_size,
  is_active
)
SELECT 
  '8d06784e-1281-42a5-b21a-57760b1a4c7d'::uuid,
  'Winter 2025/26',
  '2. Bezirksliga', -- Standard für Herren 30
  'Gr. 054',        -- Beispiel, anpassen falls bekannt
  4,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons 
  WHERE team_id = '8d06784e-1281-42a5-b21a-57760b1a4c7d'
    AND season = 'Winter 2025/26'
);

-- Verification
SELECT 
  'NACHHER' as status,
  ti.id as team_id,
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.id as season_id,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size
FROM team_info ti
LEFT JOIN team_seasons ts ON ts.team_id = ti.id AND ts.is_active = true
WHERE ti.club_name ILIKE '%VKC%'
  AND ti.category = 'Herren 30';





