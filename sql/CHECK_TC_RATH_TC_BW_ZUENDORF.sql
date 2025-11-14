-- =====================================================
-- CHECK_TC_RATH_TC_BW_ZUENDORF.sql
-- Description: Prüft ob die Teams "TC Rath 1" und "TC BW Zündorf 1" in der Datenbank existieren
-- =====================================================

-- Schritt 1: Suche nach "TC Rath"
SELECT 
  '=== TC RATH TEAMS ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label,
  ti.category
FROM team_info ti
WHERE LOWER(ti.club_name) LIKE '%rath%'
ORDER BY ti.club_name, ti.team_name;

-- Schritt 2: Suche nach "TC BW Zündorf"
SELECT 
  '=== TC BW ZÜNDORF TEAMS ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label,
  ti.category
FROM team_info ti
WHERE LOWER(ti.club_name) LIKE '%zündorf%' OR LOWER(ti.club_name) LIKE '%zuendorf%'
ORDER BY ti.club_name, ti.team_name;

-- Schritt 3: Prüfe ob diese Teams in team_seasons für Gr. 034 sind
SELECT 
  '=== TEAMS IN GR. 034 ===' as info,
  ts.team_id,
  ti.club_name,
  ti.team_name,
  CONCAT(ti.club_name, ' ', COALESCE(ti.team_name, '')) as team_label,
  ts.league,
  ts.group_name,
  ts.season
FROM team_seasons ts
INNER JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.league = '1. Bezirksliga'
  AND ts.group_name = 'Gr. 034'
  AND ts.season = 'Winter 2025/26'
  AND ts.is_active = true
ORDER BY ti.club_name, ti.team_name;

-- Schritt 4: Prüfe ob es bereits ein Matchday für dieses Spiel gibt
SELECT 
  '=== EXISTIERENDE MATCHDAYS FÜR TC RATH 1 vs TC BW ZÜNDORF 1 ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.status,
  md.home_score,
  md.away_score,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team
FROM matchdays md
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
WHERE (
  (LOWER(ti_home.club_name) LIKE '%rath%' AND COALESCE(ti_home.team_name, '') = '1')
  AND (LOWER(ti_away.club_name) LIKE '%zündorf%' OR LOWER(ti_away.club_name) LIKE '%zuendorf%')
  AND COALESCE(ti_away.team_name, '') = '1'
)
OR (
  (LOWER(ti_away.club_name) LIKE '%rath%' AND COALESCE(ti_away.team_name, '') = '1')
  AND (LOWER(ti_home.club_name) LIKE '%zündorf%' OR LOWER(ti_home.club_name) LIKE '%zuendorf%')
  AND COALESCE(ti_home.team_name, '') = '1'
)
ORDER BY md.match_date;

-- Schritt 5: Prüfe Match-Nummer 776
SELECT 
  '=== MATCHDAYS MIT MATCH-NUMMER 776 ===' as info,
  md.id,
  md.match_date,
  md.match_number,
  md.status,
  md.home_score,
  md.away_score,
  md.home_team_id,
  md.away_team_id,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team,
  CASE 
    WHEN md.home_team_id IS NULL THEN '❌ Heimteam fehlt'
    WHEN ti_home.id IS NULL THEN '❌ Heimteam nicht gefunden'
    ELSE '✅ Heimteam OK'
  END as home_team_status,
  CASE 
    WHEN md.away_team_id IS NULL THEN '❌ Gastteam fehlt'
    WHEN ti_away.id IS NULL THEN '❌ Gastteam nicht gefunden'
    ELSE '✅ Gastteam OK'
  END as away_team_status
FROM matchdays md
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
WHERE md.match_number = 776
ORDER BY md.match_date;

-- Schritt 6: Suche nach ähnlichen Team-Namen (für Matching-Analyse)
SELECT 
  '=== ÄHNLICHE TEAM-NAMEN FÜR "TC Rath 1" ===' as info,
  ti.id,
  ti.club_name || ' ' || COALESCE(ti.team_name, '') as team_label,
  CASE 
    WHEN LOWER(ti.club_name || ' ' || COALESCE(ti.team_name, '')) = LOWER('TC Rath 1') THEN '✅ Exakt'
    WHEN LOWER(ti.club_name) LIKE LOWER('%rath%') AND COALESCE(ti.team_name, '') = '1' THEN '🟡 Ähnlich (Rath + 1)'
    WHEN LOWER(ti.club_name) LIKE LOWER('%rath%') THEN '🟡 Ähnlich (Rath)'
    ELSE '❌ Kein Match'
  END as match_status
FROM team_info ti
WHERE LOWER(ti.club_name) LIKE LOWER('%rath%')
   OR LOWER(COALESCE(ti.team_name, '')) LIKE LOWER('%rath%')
ORDER BY match_status DESC, ti.club_name;

SELECT 
  '=== ÄHNLICHE TEAM-NAMEN FÜR "TC BW Zündorf 1" ===' as info,
  ti.id,
  ti.club_name || ' ' || COALESCE(ti.team_name, '') as team_label,
  CASE 
    WHEN LOWER(ti.club_name || ' ' || COALESCE(ti.team_name, '')) = LOWER('TC BW Zündorf 1') THEN '✅ Exakt'
    WHEN LOWER(ti.club_name) LIKE LOWER('%zündorf%') AND COALESCE(ti.team_name, '') = '1' THEN '🟡 Ähnlich (Zündorf + 1)'
    WHEN LOWER(ti.club_name) LIKE LOWER('%zündorf%') THEN '🟡 Ähnlich (Zündorf)'
    WHEN LOWER(ti.club_name) LIKE LOWER('%bw%') AND LOWER(ti.club_name) LIKE LOWER('%zündorf%') THEN '🟡 Ähnlich (BW + Zündorf)'
    ELSE '❌ Kein Match'
  END as match_status
FROM team_info ti
WHERE LOWER(ti.club_name) LIKE LOWER('%zündorf%')
   OR LOWER(ti.club_name) LIKE LOWER('%zuendorf%')
   OR LOWER(ti.club_name) LIKE LOWER('%bw%')
   OR LOWER(COALESCE(ti.team_name, '')) LIKE LOWER('%zündorf%')
ORDER BY match_status DESC, ti.club_name;

-- Schritt 7: Zusammenfassung
SELECT 
  '=== ZUSAMMENFASSUNG ===' as info,
  (SELECT COUNT(*) FROM team_info WHERE LOWER(club_name) LIKE LOWER('%rath%')) as rath_teams_count,
  (SELECT COUNT(*) FROM team_info WHERE LOWER(club_name) LIKE LOWER('%zündorf%') OR LOWER(club_name) LIKE LOWER('%zuendorf%')) as zuendorf_teams_count,
  (SELECT COUNT(*) FROM matchdays WHERE match_number = 776) as matchdays_with_776_count,
  (SELECT COUNT(*) FROM matchdays WHERE match_number = 776 AND (home_team_id IS NULL OR away_team_id IS NULL)) as matchdays_with_missing_teams;

