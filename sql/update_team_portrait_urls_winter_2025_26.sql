-- Update Team-Portrait-URLs für Winter 2025/26
-- Basierend auf extrahierten URLs aus nuLiga

-- Update Team-Portrait-URLs für Winter 2025/26 - Gruppe 43 (Herren 40, 1. Bezirksliga)
-- Basierend auf extrahierten URLs aus nuLiga groupPage

-- VKC Köln 1 (nuLiga Team ID: 3471133)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%VKC%' 
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true;

-- TG GW im DJK Bocklemünd 1 (nuLiga Team ID: 3511412)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE (club_name ILIKE '%TG GW%' OR club_name ILIKE '%Bocklemünd%' OR club_name ILIKE '%DJK%')
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true;

-- KölnerTHC Stadion Rot-Weiss 2 (nuLiga Team ID: 3471569)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471569&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE (club_name ILIKE '%Rot-Weiss%' OR club_name ILIKE '%Stadion%' OR club_name ILIKE '%THC%')
    AND (team_name = '2' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true;

-- TC Ford Köln 1 (nuLiga Team ID: 3471572)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471572&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Ford%'
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true;

-- TV Dellbrück 1 (nuLiga Team ID: 3472117)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472117&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Dellbrück%'
    AND (team_name = '1' OR team_name IS NULL)
    AND category = 'Herren 40'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true;

-- Zeige aktualisierte Einträge
SELECT 
  ts.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.group_name,
  ts.source_url,
  ts.source_type
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.source_url IS NOT NULL
  AND ts.season ILIKE '%Winter 2025%'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

