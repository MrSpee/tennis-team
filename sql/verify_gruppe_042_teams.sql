-- ===================================================
-- VERIFY: Teams für Gruppe 042 (aus JSON)
-- ===================================================

-- Teams die im JSON sind (Gruppe 042):
-- - TC GW Königsforst 1
-- - Kölner TG BG 1
-- - TC RW Leverkusen 1
-- - TC Lese GW Köln 1
-- - Kölner KHT SW 2

-- 1️⃣ Prüfe ob diese Teams in der DB existieren
SELECT 
  ti.id as team_id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ci.id as club_id,
  ci.name as club_full_name,
  ci.normalized_name
FROM team_info ti
JOIN club_info ci ON ti.club_id = ci.id
WHERE ci.normalized_name IN (
  'tcgwkonigsforst',
  'kolnertgbg',
  'tcrwleverkusen',
  'tclesegwkoln',
  'kolnerkhtsw'
)
AND ti.category = 'Herren 40'
ORDER BY ti.club_name, ti.team_name;


-- 2️⃣ Prüfe Team-Seasons für diese Teams (Winter 2025/26)
SELECT 
  ts.id as season_id,
  ti.club_name,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.is_active
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
JOIN club_info ci ON ti.club_id = ci.id
WHERE ci.normalized_name IN (
  'tcgwkonigsforst',
  'kolnertgbg',
  'tcrwleverkusen',
  'tclesegwkoln',
  'kolnerkhtsw'
)
AND ts.season = 'Winter 2025/26'
AND ti.category = 'Herren 40'
ORDER BY ti.club_name;


-- 3️⃣ Prüfe ob Gruppe 042 Matches bereits existieren
SELECT 
  m.id,
  m.match_date,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  m.venue,
  m.status
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
  AND m.group_name = 'Gr. 042'
ORDER BY m.match_date;

-- Erwartung: 0 Matches (oder nur korrekte, falls schon importiert)






