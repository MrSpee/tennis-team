-- Automatisch generiertes SQL-Script
-- Aktualisiert Team-Portrait-URLs für Winter 2025/26
-- Generiert am: 2025-12-06T20:38:37.862Z
-- Championship: Köln-Leverkusen Winter 2025/2026


-- ========================================
-- Gruppe 001 (5 Teams)
-- ========================================

-- SC Holweide 1 (nuLiga ID: 3471630)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471630&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=1',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%001%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 2 (nuLiga ID: 3470770)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470770&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=1',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%001%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 3 (nuLiga ID: 3471055)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471055&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=1',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%001%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Königsforst 1 (nuLiga ID: 3470914)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470914&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=1',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%001%'
AND is_active = true
AND source_url IS NULL;

-- TC Rath 1 (nuLiga ID: 3470699)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470699&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=1',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%001%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 002 (5 Teams)
-- ========================================

-- Kölner TG BG 1 (nuLiga ID: 3472459)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472459&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=2',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%002%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 2 (nuLiga ID: 3472553)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472553&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=2',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%002%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 1 (nuLiga ID: 3471013)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471013&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=2',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%002%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 1 (nuLiga ID: 3471542)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471542&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=2',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%002%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 3 (nuLiga ID: 3471499)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471499&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=2',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%002%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 003 (5 Teams)
-- ========================================

-- TC Ford Köln 4 (nuLiga ID: 3472063)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472063&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=3',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%003%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 2 (nuLiga ID: 3471059)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471059&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=3',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%003%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3472498)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472498&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=3',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%003%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3471327)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471327&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=3',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%003%'
AND is_active = true
AND source_url IS NULL;

-- TC Köln-Worringen 1 (nuLiga ID: 3471075)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471075&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=3',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%003%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 004 (5 Teams)
-- ========================================

-- TC Viktoria 1 (nuLiga ID: 3471297)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471297&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=4',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%004%'
AND is_active = true
AND source_url IS NULL;

-- TC RS Neubrück 1 (nuLiga ID: 3471560)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471560&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=4',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%004%'
AND is_active = true
AND source_url IS NULL;

-- RTK Germania Köln 1 (nuLiga ID: 3472642)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472642&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=4',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%004%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Königsforst 2 (nuLiga ID: 3471502)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471502&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=4',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%004%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 2 (nuLiga ID: 3471401)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471401&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=4',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%004%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 005 (6 Teams)
-- ========================================

-- Kölner TG BG 2 (nuLiga ID: 3471107)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471107&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 4 (nuLiga ID: 3471421)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471421&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 2 (nuLiga ID: 3472682)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472682&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 1 (nuLiga ID: 3471768)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471768&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 1 (nuLiga ID: 3488221)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3488221&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 1 (nuLiga ID: 3471649)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471649&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=5',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%005%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 006 (6 Teams)
-- ========================================

-- TV Dellbrück 3 (nuLiga ID: 3488238)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3488238&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;

-- SC Holweide 2 (nuLiga ID: 3470953)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470953&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;

-- TC Weiden 3 (nuLiga ID: 3470850)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470850&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 3 (nuLiga ID: 3484710)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484710&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;

-- TK GG Köln 1 (nuLiga ID: 3470708)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470708&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;

-- ESV Olympia 1 (nuLiga ID: 3481255)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3481255&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=6',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%006%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 007 (6 Teams)
-- ========================================

-- TC Colonius 1 (nuLiga ID: 3472408)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472408&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Grossrotter Hof 1 (nuLiga ID: 3476094)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3476094&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 1 (nuLiga ID: 3471073)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471073&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;

-- SC Holweide 3 (nuLiga ID: 3483253)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3483253&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 1 (nuLiga ID: 3472676)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472676&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 4 (nuLiga ID: 3484177)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484177&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=7',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%007%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 008 (5 Teams)
-- ========================================

-- TV Dellbrück 1 (nuLiga ID: 3470684)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470684&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=8',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%008%'
AND is_active = true
AND source_url IS NULL;

-- ESV Olympia 1 (nuLiga ID: 3472031)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472031&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=8',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%008%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 1 (nuLiga ID: 3471115)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471115&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=8',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%008%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 2 (nuLiga ID: 3471831)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471831&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=8',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%008%'
AND is_active = true
AND source_url IS NULL;

-- VKC Köln 1 (nuLiga ID: 3476450)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3476450&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=8',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%008%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 009 (6 Teams)
-- ========================================

-- TC Viktoria 1 (nuLiga ID: 3472179)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472179&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 2 (nuLiga ID: 3470812)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470812&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3472318)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472318&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 1 (nuLiga ID: 3471406)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471406&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;

-- TC Weiden 2 (nuLiga ID: 3484678)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484678&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;

-- SC Holweide 2 (nuLiga ID: 3472062)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472062&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=9',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%009%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 011 (7 Teams)
-- ========================================

-- KTC Weidenpescher Park 1 (nuLiga ID: 3471882)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471882&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- TC Lese GW Köln 1 (nuLiga ID: 3471959)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471959&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 2 (nuLiga ID: 3471084)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471084&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 1 (nuLiga ID: 3472055)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472055&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- TC Lese GW Köln 2 (nuLiga ID: 3508967)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508967&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- Kölner HTC BW 2 (nuLiga ID: 3472393)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472393&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;

-- TC Rath 1 (nuLiga ID: 3471422)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471422&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=11',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%011%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 012 (5 Teams)
-- ========================================

-- TV Dellbrück 1 (nuLiga ID: 3471064)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471064&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=12',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%012%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 1 (nuLiga ID: 3470990)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470990&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=12',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%012%'
AND is_active = true
AND source_url IS NULL;

-- Rodenkirchener TC 1 (nuLiga ID: 3470892)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470892&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=12',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%012%'
AND is_active = true
AND source_url IS NULL;

-- Marienburger SC 1 (nuLiga ID: 3472555)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472555&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=12',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Marienburger%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%012%'
AND is_active = true
AND source_url IS NULL;

-- TC RS Neubrück 1 (nuLiga ID: 3471486)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471486&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=12',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%012%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 013 (5 Teams)
-- ========================================

-- TG Leverkusen 3 (nuLiga ID: 3471804)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471804&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=13',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%013%'
AND is_active = true
AND source_url IS NULL;

-- TC BW Zündorf 1 (nuLiga ID: 3472563)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472563&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=13',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%013%'
AND is_active = true
AND source_url IS NULL;

-- Kölner HTC BW 3 (nuLiga ID: 3471113)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471113&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=13',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%013%'
AND is_active = true
AND source_url IS NULL;

-- KölnerTHC Stadion RW 1 (nuLiga ID: 3471144)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471144&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=13',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KölnerTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%013%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Leverkusen 1 (nuLiga ID: 3508970)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508970&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=13',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%013%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 014 (5 Teams)
-- ========================================

-- Kölner KHT SW 2 (nuLiga ID: 3470754)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470754&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=14',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%014%'
AND is_active = true
AND source_url IS NULL;

-- ESV Olympia 1 (nuLiga ID: 3471473)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471473&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=14',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%014%'
AND is_active = true
AND source_url IS NULL;

-- KölnerTHC Stadion RW 2 (nuLiga ID: 3471175)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471175&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=14',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KölnerTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%014%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 1 (nuLiga ID: 3471444)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471444&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=14',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%014%'
AND is_active = true
AND source_url IS NULL;

-- TC Arnoldshöhe 1986 1 (nuLiga ID: 3471161)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471161&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=14',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%014%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 015 (5 Teams)
-- ========================================

-- TC GW Grossrotter Hof 1 (nuLiga ID: 3472025)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472025&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=15',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%015%'
AND is_active = true
AND source_url IS NULL;

-- Kölner HTC BW 4 (nuLiga ID: 3470712)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470712&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=15',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%015%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 2 (nuLiga ID: 3508965)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508965&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=15',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%015%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 1 (nuLiga ID: 3471355)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471355&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=15',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%015%'
AND is_active = true
AND source_url IS NULL;

-- Dünnwalder TV 1905 1 (nuLiga ID: 3470691)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470691&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=15',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Dünnwalder%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%015%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 016 (6 Teams)
-- ========================================

-- RTK Germania Köln 2 (nuLiga ID: 3471264)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471264&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;

-- TC Weiden 1 (nuLiga ID: 3471921)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471921&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3520730)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3520730&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;

-- TPSK 1925 Köln 1 (nuLiga ID: 3511430)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511430&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TPSK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 3 (nuLiga ID: 3470736)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470736&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 1 (nuLiga ID: 3471636)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471636&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=16',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%016%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 017 (5 Teams)
-- ========================================

-- KTC Weidenpescher Park 2 (nuLiga ID: 3470863)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470863&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=17',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%017%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 1 (nuLiga ID: 3472551)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472551&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=17',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%017%'
AND is_active = true
AND source_url IS NULL;

-- TC Stammheim 1 (nuLiga ID: 3471247)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471247&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=17',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%017%'
AND is_active = true
AND source_url IS NULL;

-- SV Blau-Weiß-Rot 1 (nuLiga ID: 3477970)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3477970&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=17',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%017%'
AND is_active = true
AND source_url IS NULL;

-- TC Köln-Worringen 1 (nuLiga ID: 3471290)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471290&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=17',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%017%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 018 (4 Teams)
-- ========================================

-- TC Ford Köln 1 (nuLiga ID: 3472486)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472486&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=18',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%018%'
AND is_active = true
AND source_url IS NULL;

-- Rodenkirchener TC 2 (nuLiga ID: 3470868)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470868&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=18',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%018%'
AND is_active = true
AND source_url IS NULL;

-- TK GG Köln 1 (nuLiga ID: 3471005)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471005&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=18',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%018%'
AND is_active = true
AND source_url IS NULL;

-- MTV Köln 1 (nuLiga ID: 3471370)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471370&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=18',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%MTV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%018%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 019 (5 Teams)
-- ========================================

-- ESV Olympia 1 (nuLiga ID: 3472338)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472338&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=19',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%019%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3471453)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471453&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=19',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%019%'
AND is_active = true
AND source_url IS NULL;

-- RTK Germania Köln 1 (nuLiga ID: 3472099)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472099&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=19',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%019%'
AND is_active = true
AND source_url IS NULL;

-- TC Köln-Worringen 1 (nuLiga ID: 3471754)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471754&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=19',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%019%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 2 (nuLiga ID: 3471143)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471143&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=19',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%019%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 020 (5 Teams)
-- ========================================

-- TC Bayer Dormagen 1 (nuLiga ID: 3471568)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471568&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=20',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%020%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 1 (nuLiga ID: 3471332)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471332&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=20',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%020%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Dellbrück 1 (nuLiga ID: 3472445)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472445&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=20',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%020%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 4 (nuLiga ID: 3472075)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472075&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=20',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%020%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3470741)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470741&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=20',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%020%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 021 (6 Teams)
-- ========================================

-- RTK Germania Köln 3 (nuLiga ID: 3508969)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508969&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;

-- KölnerTHC Stadion RW 1 (nuLiga ID: 3471530)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471530&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KölnerTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;

-- Marienburger SC 2 (nuLiga ID: 3478130)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478130&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Marienburger%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 2 (nuLiga ID: 3472066)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472066&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 1 (nuLiga ID: 3472114)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472114&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 3 (nuLiga ID: 3471685)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471685&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=21',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%021%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 022 (5 Teams)
-- ========================================

-- TG Leverkusen 4 (nuLiga ID: 3471359)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471359&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=22',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%022%'
AND is_active = true
AND source_url IS NULL;

-- TC Lese GW Köln 1 (nuLiga ID: 3470886)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470886&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=22',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%022%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 1 (nuLiga ID: 3470843)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470843&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=22',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%022%'
AND is_active = true
AND source_url IS NULL;

-- RTK Germania Köln 2 (nuLiga ID: 3508968)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508968&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=22',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%022%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 5 (nuLiga ID: 3472094)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472094&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=22',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%022%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 023 (5 Teams)
-- ========================================

-- Kölner HTC BW 3 (nuLiga ID: 3470984)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470984&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=23',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%023%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Königsforst 2 (nuLiga ID: 3471214)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471214&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=23',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%023%'
AND is_active = true
AND source_url IS NULL;

-- TC Weiden 2 (nuLiga ID: 3508971)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508971&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=23',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%023%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 2 (nuLiga ID: 3471380)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471380&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=23',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%023%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 1 (nuLiga ID: 3472162)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472162&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=23',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%023%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 024 (5 Teams)
-- ========================================

-- TC Viktoria 2 (nuLiga ID: 3471918)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471918&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=24',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%024%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 2 (nuLiga ID: 3471008)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471008&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=24',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%024%'
AND is_active = true
AND source_url IS NULL;

-- RTK Germania Köln 1 (nuLiga ID: 3471508)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471508&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=24',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%024%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 1 (nuLiga ID: 3472613)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472613&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=24',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%024%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 1 (nuLiga ID: 3471124)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471124&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=24',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%024%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 025 (6 Teams)
-- ========================================

-- TC RW Leverkusen 1 (nuLiga ID: 3472366)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472366&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 3 (nuLiga ID: 3472309)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472309&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 3 (nuLiga ID: 3470911)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470911&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 2 (nuLiga ID: 3472522)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472522&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 1 (nuLiga ID: 3471599)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471599&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 2 (nuLiga ID: 3471886)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471886&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=25',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%025%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 026 (6 Teams)
-- ========================================

-- Rodenkirchener TC 1 (nuLiga ID: 3472291)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472291&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 1 (nuLiga ID: 3470870)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470870&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 4 (nuLiga ID: 3472189)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472189&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3472369)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472369&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;

-- TCR e.V. 3 (nuLiga ID: 3471363)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471363&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TCR%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;

-- TC Weiden 3 (nuLiga ID: 3472407)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472407&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=26',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%026%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 027 (6 Teams)
-- ========================================

-- TK GG Köln 1 (nuLiga ID: 3470730)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470730&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 2 (nuLiga ID: 3472651)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472651&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;

-- SSZ Wahn 1 (nuLiga ID: 3471345)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471345&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SSZ%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 2 (nuLiga ID: 3471970)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471970&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 2 (nuLiga ID: 3471615)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471615&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;

-- TC RS Neubrück 1 (nuLiga ID: 3472268)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472268&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=27',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%027%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 028 (6 Teams)
-- ========================================

-- TC Köln-Worringen 1 (nuLiga ID: 3470894)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470894&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 2 (nuLiga ID: 3470773)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470773&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Leverkusen 1 (nuLiga ID: 3471279)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471279&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3470696)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470696&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;

-- TPSK 1925 Köln 1 (nuLiga ID: 3472421)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472421&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TPSK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;

-- TG Leverkusen 1 (nuLiga ID: 3470928)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470928&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=28',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%028%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 029 (6 Teams)
-- ========================================

-- Kölner HTC BW 4 (nuLiga ID: 3472755)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472755&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 4 (nuLiga ID: 3472148)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472148&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;

-- TC Arnoldshöhe 1986 1 (nuLiga ID: 3471068)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471068&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 1 (nuLiga ID: 3481092)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3481092&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 1 (nuLiga ID: 3471469)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471469&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 3 (nuLiga ID: 3472058)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472058&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=29',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%029%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 030 (6 Teams)
-- ========================================

-- Kölner KHT SW 5 (nuLiga ID: 3476331)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3476331&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;

-- ESV Gremberghoven 1 (nuLiga ID: 3471299)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471299&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 1 (nuLiga ID: 3470724)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470724&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;

-- Rodenkirchener TC 2 (nuLiga ID: 3478491)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478491&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 3 (nuLiga ID: 3472097)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472097&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;

-- Dünnwalder TV 1905 1 (nuLiga ID: 3470857)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470857&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=30',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Dünnwalder%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%030%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 031 (5 Teams)
-- ========================================

-- MTV Köln 1 (nuLiga ID: 3470826)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470826&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=31',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%MTV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%031%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 4 (nuLiga ID: 3481197)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3481197&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=31',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%031%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 2 (nuLiga ID: 3471454)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471454&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=31',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%031%'
AND is_active = true
AND source_url IS NULL;

-- TC Stammheim 1 (nuLiga ID: 3471432)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471432&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=31',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%031%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 4 (nuLiga ID: 3483951)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3483951&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=31',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%031%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 032 (5 Teams)
-- ========================================

-- RTHC Bayer Leverkusen 3 (nuLiga ID: 3470743)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470743&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=32',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%032%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Leverkusen 2 (nuLiga ID: 3480514)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3480514&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=32',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%032%'
AND is_active = true
AND source_url IS NULL;

-- TC Arnoldshöhe 1986 2 (nuLiga ID: 3478392)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478392&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=32',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%032%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 3 (nuLiga ID: 3471223)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471223&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=32',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%032%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Dellbrück 1 (nuLiga ID: 3471741)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471741&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=32',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%032%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 034 (7 Teams)
-- ========================================

-- TC GW Königsforst 1 (nuLiga ID: 3508972)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508972&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- TTVG GW 1928 Porz-Eil 1 (nuLiga ID: 3471693)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471693&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TTVG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 2 (nuLiga ID: 3470864)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470864&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 1 (nuLiga ID: 3470803)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470803&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- TG Leverkusen 1 (nuLiga ID: 3472546)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472546&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 1 (nuLiga ID: 3472417)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472417&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 3 (nuLiga ID: 3471447)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471447&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=34',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%034%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 035 (6 Teams)
-- ========================================

-- TC Weiden 2 (nuLiga ID: 3484680)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484680&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;

-- ESV Olympia 1 (nuLiga ID: 3471805)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471805&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3472305)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472305&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 2 (nuLiga ID: 3472106)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472106&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;

-- TC BW Zündorf 1 (nuLiga ID: 3471004)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471004&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;

-- VKC Köln 1 (nuLiga ID: 3478330)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478330&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=35',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%035%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 036 (5 Teams)
-- ========================================

-- TC Arnoldshöhe 1986 1 (nuLiga ID: 3471895)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471895&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=36',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%036%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 2 (nuLiga ID: 3471829)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471829&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=36',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%036%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 1 (nuLiga ID: 3484151)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484151&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=36',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%036%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 1 (nuLiga ID: 3472348)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472348&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=36',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%036%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 2 (nuLiga ID: 3472226)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472226&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=36',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%036%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 037 (6 Teams)
-- ========================================

-- TV Dellbrück 2 (nuLiga ID: 3471232)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471232&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;

-- RTHC Bayer Leverkusen 1 (nuLiga ID: 3484293)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484293&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;

-- TC Viktoria 3 (nuLiga ID: 3471813)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471813&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 2 (nuLiga ID: 3471294)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471294&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 1 (nuLiga ID: 3471948)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471948&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 1 (nuLiga ID: 3472171)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472171&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=37',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%037%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 038 (6 Teams)
-- ========================================

-- TG Leverkusen 2 (nuLiga ID: 3472183)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472183&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;

-- Dünnwalder TV 1905 1 (nuLiga ID: 3471960)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471960&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Dünnwalder%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;

-- TC Stammheim 1 (nuLiga ID: 3471189)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471189&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 1 (nuLiga ID: 3472037)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472037&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;

-- SV Blau-Weiß-Rot 1 (nuLiga ID: 3471934)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471934&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;

-- TG Deckstein 1 (nuLiga ID: 3470993)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470993&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=38',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%038%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 039 (6 Teams)
-- ========================================

-- KTC Weidenpescher Park 3 (nuLiga ID: 3472538)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472538&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;

-- TC Arnoldshöhe 1986 2 (nuLiga ID: 3472564)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472564&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;

-- TC RW Porz 3 (nuLiga ID: 3471412)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;

-- TG Deckstein 2 (nuLiga ID: 3488202)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3488202&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Grossrotter Hof 1 (nuLiga ID: 3471553)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471553&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;

-- SC Meschenich 1923 1 (nuLiga ID: 3472352)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472352&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=39',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%039%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 040 (5 Teams)
-- ========================================

-- TC RW Porz 2 (nuLiga ID: 3471742)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471742&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=40',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%040%'
AND is_active = true
AND source_url IS NULL;

-- TC RS Neubrück 1 (nuLiga ID: 3472264)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472264&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=40',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%040%'
AND is_active = true
AND source_url IS NULL;

-- TC Arnoldshöhe 1986 3 (nuLiga ID: 3472469)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472469&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=40',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%040%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3472609)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472609&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=40',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%040%'
AND is_active = true
AND source_url IS NULL;

-- Rodenkirchener TC 1 (nuLiga ID: 3470986)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470986&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=40',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%040%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 041 (5 Teams)
-- ========================================

-- TG GW im DJK Bocklemünd 2 (nuLiga ID: 3511411)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511411&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=41',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%041%'
AND is_active = true
AND source_url IS NULL;

-- TK GG Köln 1 (nuLiga ID: 3483874)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3483874&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=41',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%041%'
AND is_active = true
AND source_url IS NULL;

-- TC Lese GW Köln 2 (nuLiga ID: 3471659)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471659&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=41',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%041%'
AND is_active = true
AND source_url IS NULL;

-- TV Dellbrück 3 (nuLiga ID: 3484150)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484150&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=41',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%041%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 3 (nuLiga ID: 3472376)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472376&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=41',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%041%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 042 (5 Teams)
-- ========================================

-- TC RW Leverkusen 1 (nuLiga ID: 3508975)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508975&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=42',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%042%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Königsforst 1 (nuLiga ID: 3508974)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3508974&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=42',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%042%'
AND is_active = true
AND source_url IS NULL;

-- TC Lese GW Köln 1 (nuLiga ID: 3470703)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470703&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=42',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%042%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 1 (nuLiga ID: 3472269)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472269&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=42',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%042%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 2 (nuLiga ID: 3471076)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471076&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=42',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%042%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 043 (5 Teams)
-- ========================================

-- TV Dellbrück 1 (nuLiga ID: 3472117)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472117&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true
AND source_url IS NULL;

-- TC Ford Köln 1 (nuLiga ID: 3471572)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471572&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true
AND source_url IS NULL;

-- KölnerTHC Stadion RW 2 (nuLiga ID: 3471569)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471569&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KölnerTHC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true
AND source_url IS NULL;

-- TG GW im DJK Bocklemünd 1 (nuLiga ID: 3511412)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3511412&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true
AND source_url IS NULL;

-- VKC Köln 1 (nuLiga ID: 3471133)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%043%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 044 (6 Teams)
-- ========================================

-- TC Bayer Dormagen 2 (nuLiga ID: 3472271)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472271&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;

-- TC Stammheim 1 (nuLiga ID: 3471313)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471313&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 2 (nuLiga ID: 3472466)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472466&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 2 (nuLiga ID: 3472635)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472635&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;

-- TC RS Neubrück 1 (nuLiga ID: 3472370)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472370&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;

-- Rodenkirchener TC 1 (nuLiga ID: 3470869)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470869&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=44',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Rodenkirchener%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%044%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 045 (5 Teams)
-- ========================================

-- TC Arnoldshöhe 1986 1 (nuLiga ID: 3471399)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471399&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=45',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%045%'
AND is_active = true
AND source_url IS NULL;

-- TK GG Köln 1 (nuLiga ID: 3472517)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472517&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=45',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%045%'
AND is_active = true
AND source_url IS NULL;

-- Marienburger SC 2 (nuLiga ID: 3471083)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471083&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=45',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Marienburger%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%045%'
AND is_active = true
AND source_url IS NULL;

-- Kölner KHT SW 3 (nuLiga ID: 3472607)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472607&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=45',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%045%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 1 (nuLiga ID: 3472248)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472248&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=45',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%045%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 046 (5 Teams)
-- ========================================

-- TC Ford Köln 2 (nuLiga ID: 3472266)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472266&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=46',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%046%'
AND is_active = true
AND source_url IS NULL;

-- SV RG Sürth 1 (nuLiga ID: 3472127)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472127&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=46',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%SV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%046%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 1 (nuLiga ID: 3472684)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472684&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=46',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%046%'
AND is_active = true
AND source_url IS NULL;

-- TC Colonius 3 (nuLiga ID: 3470674)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470674&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=46',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%046%'
AND is_active = true
AND source_url IS NULL;

-- TG Leverkusen 2 (nuLiga ID: 3472666)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472666&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=46',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%046%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 047 (5 Teams)
-- ========================================

-- TC GW Königsforst 2 (nuLiga ID: 3472423)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472423&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=47',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%047%'
AND is_active = true
AND source_url IS NULL;

-- TC GWR Marienburg 1 (nuLiga ID: 3472044)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472044&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=47',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%047%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 1 (nuLiga ID: 3471065)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471065&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=47',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%047%'
AND is_active = true
AND source_url IS NULL;

-- ESV Olympia 1 (nuLiga ID: 3471833)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471833&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=47',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%ESV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%047%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Grossrotter Hof 3 (nuLiga ID: 3472068)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472068&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=47',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%047%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 048 (5 Teams)
-- ========================================

-- TC GW Grossrotter Hof 2 (nuLiga ID: 3471372)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471372&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=48',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%048%'
AND is_active = true
AND source_url IS NULL;

-- RTK Germania Köln 1 (nuLiga ID: 3471265)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471265&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=48',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%RTK%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%048%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 1 (nuLiga ID: 3471308)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471308&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=48',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%048%'
AND is_active = true
AND source_url IS NULL;

-- TV Ensen Westhoven 2 (nuLiga ID: 3471394)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471394&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=48',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%048%'
AND is_active = true
AND source_url IS NULL;

-- TC GW Leverkusen 1 (nuLiga ID: 3472322)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3472322&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=48',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%048%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 049 (5 Teams)
-- ========================================

-- TC Weiden 2 (nuLiga ID: 3484679)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3484679&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=49',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%049%'
AND is_active = true
AND source_url IS NULL;

-- MTV Köln 1 (nuLiga ID: 3471687)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471687&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=49',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%MTV%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%049%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TC GW 1 (nuLiga ID: 3471464)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471464&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=49',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%049%'
AND is_active = true
AND source_url IS NULL;

-- TC Bayer Dormagen 3 (nuLiga ID: 3471459)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471459&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=49',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%049%'
AND is_active = true
AND source_url IS NULL;

-- TC Köln-Worringen 1 (nuLiga ID: 3470753)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470753&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=49',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%049%'
AND is_active = true
AND source_url IS NULL;


-- ========================================
-- Gruppe 050 (5 Teams)
-- ========================================

-- TG Leverkusen 3 (nuLiga ID: 3470792)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470792&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=50',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TG%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%050%'
AND is_active = true
AND source_url IS NULL;

-- Kölner TG BG 3 (nuLiga ID: 3470748)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470748&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=50',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%Kölner%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%050%'
AND is_active = true
AND source_url IS NULL;

-- KTC Weidenpescher Park 2 (nuLiga ID: 3470794)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3470794&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=50',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%050%'
AND is_active = true
AND source_url IS NULL;

-- TC Rondorf 2 (nuLiga ID: 3481351)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3481351&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=50',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%TC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%050%'
AND is_active = true
AND source_url IS NULL;

-- KTC  71 2 (nuLiga ID: 3481950)
UPDATE team_seasons
SET source_url = 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3481950&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=50',
    source_type = 'nuliga'
WHERE team_id IN (
  SELECT id FROM team_info 
  WHERE club_name ILIKE '%KTC%'
    AND category ILIKE '%40%'
)
AND season ILIKE '%Winter 2025%'
AND group_name ILIKE '%050%'
AND is_active = true
AND source_url IS NULL;


-- Zeige alle aktualisierten Einträge
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
ORDER BY ts.group_name, ti.club_name, ti.team_name;
