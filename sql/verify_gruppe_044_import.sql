-- =====================================================
-- Verify Import für Gruppe 044 (2. Bezirksliga Herren 40)
-- =====================================================

-- 1. VEREINE aus Gruppe 044
SELECT 
  'VEREINE' as check_type,
  name,
  city,
  data_source,
  created_at::date as angelegt_am
FROM club_info
WHERE name IN (
  'TC Bayer Dormagen',
  'Rodenkirchener TC',
  'TC RS Neubrück',
  'Kölner TG BG',
  'TC Colonius',
  'TC Stammheim'
)
ORDER BY name;

-- 2. TEAMS aus Gruppe 044
SELECT 
  'TEAMS' as check_type,
  ci.name as verein,
  ti.team_name,
  ti.category,
  ts.league,
  ts.group_name,
  ts.season,
  ts.is_active
FROM team_info ti
JOIN club_info ci ON ti.club_id = ci.id
LEFT JOIN team_seasons ts ON ti.id = ts.team_id
WHERE ci.name IN (
  'TC Bayer Dormagen',
  'Rodenkirchener TC',
  'TC RS Neubrück',
  'Kölner TG BG',
  'TC Colonius',
  'TC Stammheim'
)
AND (ts.group_name = 'Gr. 044' OR ts.group_name IS NULL)
ORDER BY ci.name, ti.team_name;

-- 3. MEDENSPIELE aus Gruppe 044
SELECT 
  'MATCHES' as check_type,
  m.match_date::date as datum,
  m.start_time as uhrzeit,
  home.club_name || ' ' || home.team_name as heimteam,
  away.club_name || ' ' || away.team_name as gastteam,
  m.home_score,
  m.away_score,
  m.final_score,
  m.status,
  m.venue as austragungsort,
  m.season,
  m.group_name
FROM matchdays m
JOIN team_info home ON m.home_team_id = home.id
JOIN team_info away ON m.away_team_id = away.id
WHERE m.group_name = 'Gr. 044'
  AND m.season = 'Winter 2025/26'
ORDER BY m.match_date NULLS LAST, m.start_time;

-- 4. ZUSAMMENFASSUNG
SELECT 
  '=== ZUSAMMENFASSUNG ===' as info,
  (SELECT COUNT(*) FROM club_info WHERE name IN (
    'TC Bayer Dormagen', 'Rodenkirchener TC', 'TC RS Neubrück',
    'Kölner TG BG', 'TC Colonius', 'TC Stammheim'
  )) as vereine_gesamt,
  
  (SELECT COUNT(*) FROM team_info ti
   JOIN club_info ci ON ti.club_id = ci.id
   LEFT JOIN team_seasons ts ON ti.id = ts.team_id
   WHERE ci.name IN (
     'TC Bayer Dormagen', 'Rodenkirchener TC', 'TC RS Neubrück',
     'Kölner TG BG', 'TC Colonius', 'TC Stammheim'
   )
   AND (ts.group_name = 'Gr. 044' OR ts.group_name IS NULL)
  ) as teams_gesamt,
  
  (SELECT COUNT(*) FROM matchdays 
   WHERE group_name = 'Gr. 044' 
   AND season = 'Winter 2025/26'
  ) as matches_gesamt,
  
  (SELECT COUNT(*) FROM matchdays 
   WHERE group_name = 'Gr. 044' 
   AND season = 'Winter 2025/26'
   AND status = 'completed'
  ) as matches_beendet,
  
  (SELECT COUNT(*) FROM matchdays 
   WHERE group_name = 'Gr. 044' 
   AND season = 'Winter 2025/26'
   AND status = 'scheduled'
  ) as matches_geplant;

-- 5. FEHLENDE DATEN Check
SELECT 
  'FEHLENDE MATCHES' as issue,
  'Match ohne Datum' as problem,
  COUNT(*) as anzahl
FROM matchdays
WHERE group_name = 'Gr. 044'
  AND season = 'Winter 2025/26'
  AND match_date IS NULL;

