-- Upsert Team-Portrait-URLs für Gruppe 43 (Herren 40, 1. Bezirksliga)
-- Erstellt team_seasons Einträge falls nicht vorhanden, oder updated source_url

-- VKC Köln 1 (nuLiga Team ID: 3471133)
-- Zuerst UPDATE falls vorhanden
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga',
    group_name = COALESCE(team_seasons.group_name, 'Gr. 043'),
    league = COALESCE(team_seasons.league, '1. Bezirksliga')
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%VKC%' 
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season = 'Winter 2025/26';

-- Dann INSERT falls nicht vorhanden
INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)
SELECT 
  id,
  'Winter 2025/26',
  'Gr. 043',
  '1. Bezirksliga',
  6,
  true,
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
  'nuliga'
FROM team_info
WHERE club_name ILIKE '%VKC%' 
  AND (team_name = '1' OR team_name IS NULL)
  AND category = 'Herren 40'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = team_info.id 
      AND season = 'Winter 2025/26'
  );

-- TG GW im DJK Bocklemünd 1 (nuLiga Team ID: 3511412)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga',
    group_name = COALESCE(team_seasons.group_name, 'Gr. 043'),
    league = COALESCE(team_seasons.league, '1. Bezirksliga')
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE (club_name ILIKE '%TG GW%' OR club_name ILIKE '%Bocklemünd%' OR club_name ILIKE '%DJK%')
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season = 'Winter 2025/26';

INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)
SELECT 
  id,
  'Winter 2025/26',
  'Gr. 043',
  '1. Bezirksliga',
  6,
  true,
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
  'nuliga'
FROM team_info
WHERE (club_name ILIKE '%TG GW%' OR club_name ILIKE '%Bocklemünd%' OR club_name ILIKE '%DJK%')
  AND (team_name = '1' OR team_name IS NULL)
  AND category = 'Herren 40'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = team_info.id 
      AND season = 'Winter 2025/26'
  );

-- KölnerTHC Stadion Rot-Weiss 2 (nuLiga Team ID: 3471569)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471569&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga',
    group_name = COALESCE(team_seasons.group_name, 'Gr. 043'),
    league = COALESCE(team_seasons.league, '1. Bezirksliga')
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE (club_name ILIKE '%Rot-Weiss%' OR club_name ILIKE '%Stadion%' OR club_name ILIKE '%THC%')
    AND (team_name = '2' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season = 'Winter 2025/26';

INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)
SELECT 
  id,
  'Winter 2025/26',
  'Gr. 043',
  '1. Bezirksliga',
  6,
  true,
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471569&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
  'nuliga'
FROM team_info
WHERE (club_name ILIKE '%Rot-Weiss%' OR club_name ILIKE '%Stadion%' OR club_name ILIKE '%THC%')
  AND (team_name = '2' OR team_name IS NULL)
  AND category = 'Herren 40'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = team_info.id 
      AND season = 'Winter 2025/26'
  );

-- TC Ford Köln 1 (nuLiga Team ID: 3471572)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471572&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga',
    group_name = COALESCE(team_seasons.group_name, 'Gr. 043'),
    league = COALESCE(team_seasons.league, '1. Bezirksliga')
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Ford%'
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season = 'Winter 2025/26';

INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)
SELECT 
  id,
  'Winter 2025/26',
  'Gr. 043',
  '1. Bezirksliga',
  6,
  true,
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471572&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
  'nuliga'
FROM team_info
WHERE club_name ILIKE '%Ford%'
  AND (team_name = '1' OR team_name IS NULL)
  AND category = 'Herren 40'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = team_info.id 
      AND season = 'Winter 2025/26'
  );

-- TV Dellbrück 1 (nuLiga Team ID: 3472117)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472117&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga',
    group_name = COALESCE(team_seasons.group_name, 'Gr. 043'),
    league = COALESCE(team_seasons.league, '1. Bezirksliga')
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Dellbrück%'
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season = 'Winter 2025/26';

INSERT INTO team_seasons (team_id, season, group_name, league, team_size, is_active, source_url, source_type)
SELECT 
  id,
  'Winter 2025/26',
  'Gr. 043',
  '1. Bezirksliga',
  6,
  true,
  'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472117&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
  'nuliga'
FROM team_info
WHERE club_name ILIKE '%Dellbrück%'
  AND (team_name = '1' OR team_name IS NULL)
  AND category = 'Herren 40'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons 
    WHERE team_id = team_info.id 
      AND season = 'Winter 2025/26'
  );

-- Zeige aktualisierte/erstellte Einträge
SELECT 
  ts.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.group_name,
  ts.league,
  ts.source_url,
  ts.source_type
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.season = 'Winter 2025/26'
  AND ts.group_name = 'Gr. 043'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

