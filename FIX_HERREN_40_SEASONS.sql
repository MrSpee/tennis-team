-- ============================================
-- FIX_HERREN_40_SEASONS.sql
-- Fügt team_seasons Daten für "Herren 40" hinzu
-- ============================================

-- Überprüfe, ob das Team existiert
SELECT 
  id,
  club_name,
  team_name,
  category,
  region
FROM team_info
WHERE id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Lösche eventuell vorhandene Einträge für dieses Team
DELETE FROM team_seasons 
WHERE team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Erstelle team_seasons Eintrag für "Herren 40" (SV Rot-Gelb Sürth)
INSERT INTO team_seasons (
  team_id,
  season,
  league,
  group_name,
  team_size,
  is_active
) VALUES (
  'ff090c47-ff26-4df1-82fd-3e4358320d7f',  -- Herren 40 Team ID
  'Winter 2025/26',
  '1. Kreisliga',
  'Gr. 046',
  4,
  true
);

-- Überprüfe das Ergebnis
SELECT 
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ts.id as season_id
FROM team_info ti
INNER JOIN team_seasons ts ON ti.id = ts.team_id
WHERE ti.id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

