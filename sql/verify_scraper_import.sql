-- ===================================================
-- VERIFICATION QUERIES FÜR SCRAPER-IMPORT
-- Nutze diese Queries um zu prüfen ob Daten importiert wurden
-- ===================================================

-- 1️⃣ VEREINE PRÜFEN
-- Zeigt alle Vereine aus dem JSON (Winter 2025/26, 1. Bezirksliga Gr. 042)
SELECT 
  id,
  name,
  city,
  region,
  normalized_name,
  data_source,
  created_at
FROM club_info
WHERE normalized_name IN (
  'tcgwkonigsforst',      -- TC GW Königsforst
  'kolnertgbg',           -- Kölner TG BG
  'tcrwleverkusen',       -- TC RW Leverkusen
  'tclesegwkoln',         -- TC Lese GW Köln
  'kolnerkhtsw'           -- Kölner KHT SW
)
ORDER BY name;

-- Erwartete Ergebnisse: 5 Vereine


-- 2️⃣ MANNSCHAFTEN PRÜFEN
-- Zeigt alle Teams der Vereine
SELECT 
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.region,
  ci.id as club_id,
  ci.normalized_name as club_normalized
FROM team_info ti
JOIN club_info ci ON ti.club_id = ci.id
WHERE ci.normalized_name IN (
  'tcgwkonigsforst',
  'kolnertgbg',
  'tcrwleverkusen',
  'tclesegwkoln',
  'kolnerkhtsw'
)
ORDER BY ti.club_name, ti.team_name;

-- Erwartete Ergebnisse: 
-- TC GW Königsforst 1
-- Kölner TG BG 1
-- TC RW Leverkusen 1
-- TC Lese GW Köln 1
-- Kölner KHT SW 2


-- 3️⃣ TEAM-SAISONS PRÜFEN
-- Zeigt ob Saison-Verknüpfungen existieren
SELECT 
  ts.id,
  ti.club_name,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
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
AND ts.league = '1. Bezirksliga'
AND ts.group_name = 'Gr. 042'
ORDER BY ti.club_name, ti.team_name;

-- Erwartete Ergebnisse: 5 Team-Saisons (eine pro Team)


-- 4️⃣ MATCHDAYS PRÜFEN
-- Zeigt alle importierten Matches
SELECT 
  m.id,
  m.match_date,
  m.start_time,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  m.venue,
  m.court_number,
  m.court_number_end,
  m.season,
  m.league,
  m.group_name,
  m.status,
  m.home_score,
  m.away_score,
  m.final_score,
  m.created_at
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
  AND m.group_name = 'Gr. 042'
ORDER BY m.match_date, m.start_time;

-- Erwartete Ergebnisse: 10 Matches
-- 1 completed (05.10.2025: Kölner TG BG vs TC GW Königsforst, 3:3)
-- 9 scheduled


-- 5️⃣ MATCHES MIT SCORES ABER OHNE RESULTS
-- Zeigt Matches die einen Score haben, aber keine match_results
SELECT 
  m.id,
  m.match_date,
  ht.club_name || ' ' || ht.team_name as home_team,
  at.club_name || ' ' || at.team_name as away_team,
  m.final_score,
  m.status,
  COUNT(mr.id) as result_count
FROM matchdays m
JOIN team_info ht ON m.home_team_id = ht.id
JOIN team_info at ON m.away_team_id = at.id
LEFT JOIN match_results mr ON m.id = mr.matchday_id
WHERE m.season = 'Winter 2025/26'
  AND m.league = '1. Bezirksliga'
  AND m.group_name = 'Gr. 042'
  AND m.status = 'completed'
GROUP BY m.id, m.match_date, ht.club_name, ht.team_name, at.club_name, at.team_name, m.final_score, m.status
HAVING COUNT(mr.id) = 0;

-- Erwartete Ergebnisse: 1 Match (05.10.2025, 3:3) wenn keine Einzelergebnisse erfasst


-- 6️⃣ ZUSAMMENFASSUNG
-- Schnelle Übersicht
SELECT 
  'Vereine' as typ,
  COUNT(*) as anzahl
FROM club_info
WHERE normalized_name IN ('tcgwkonigsforst', 'kolnertgbg', 'tcrwleverkusen', 'tclesegwkoln', 'kolnerkhtsw')

UNION ALL

SELECT 
  'Teams' as typ,
  COUNT(*) as anzahl
FROM team_info ti
JOIN club_info ci ON ti.club_id = ci.id
WHERE ci.normalized_name IN ('tcgwkonigsforst', 'kolnertgbg', 'tcrwleverkusen', 'tclesegwkoln', 'kolnerkhtsw')

UNION ALL

SELECT 
  'Team-Saisons' as typ,
  COUNT(*) as anzahl
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
JOIN club_info ci ON ti.club_id = ci.id
WHERE ci.normalized_name IN ('tcgwkonigsforst', 'kolnertgbg', 'tcrwleverkusen', 'tclesegwkoln', 'kolnerkhtsw')
  AND ts.season = 'Winter 2025/26'

UNION ALL

SELECT 
  'Matches' as typ,
  COUNT(*) as anzahl
FROM matchdays
WHERE season = 'Winter 2025/26'
  AND league = '1. Bezirksliga'
  AND group_name = 'Gr. 042';

-- Erwartete Ergebnisse:
-- Vereine: 5
-- Teams: 5
-- Team-Saisons: 5
-- Matches: 10









