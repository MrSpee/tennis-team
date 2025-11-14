-- =====================================================
-- FIND_DUPLICATE_MATCHDAYS.sql
-- Description: Findet Duplikate in der matchdays Tabelle
--              Duplikate sind Matches mit gleichem Datum, home_team_id und away_team_id
-- Date: 2025-01-XX
-- =====================================================

-- Schritt 0: Erstelle IMMUTABLE Funktion (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION match_date_only(match_date TIMESTAMP WITH TIME ZONE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (match_date AT TIME ZONE 'UTC')::DATE;
$$;

-- Schritt 1: Finde alle Duplikate (ALLE Matchdays, nicht nur eine Saison!)
-- Duplikate sind: gleiches Datum + gleiche Teams ODER gleiche match_number
WITH duplicate_groups_by_teams AS (
  SELECT 
    match_date_only(match_date) as match_date_only,
    home_team_id,
    away_team_id,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as matchday_ids,
    ARRAY_AGG(created_at ORDER BY created_at) as created_dates,
    'by_teams' as duplicate_type
  FROM matchdays
  GROUP BY match_date_only(match_date), home_team_id, away_team_id
  HAVING COUNT(*) > 1
),
duplicate_groups_by_match_number AS (
  SELECT 
    match_number,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as matchday_ids,
    ARRAY_AGG(created_at ORDER BY created_at) as created_dates,
    'by_match_number' as duplicate_type
  FROM matchdays
  WHERE match_number IS NOT NULL
  GROUP BY match_number
  HAVING COUNT(*) > 1
),
duplicate_groups AS (
  SELECT * FROM duplicate_groups_by_teams
  UNION ALL
  SELECT 
    NULL as match_date_only,
    NULL as home_team_id,
    NULL as away_team_id,
    duplicate_count,
    matchday_ids,
    created_dates,
    duplicate_type
  FROM duplicate_groups_by_match_number
)
SELECT 
  '=== DUPLIKATE GEFUNDEN ===' as info,
  dg.duplicate_type,
  dg.match_date_only,
  dg.duplicate_count,
  dg.matchday_ids,
  ti_home.club_name as home_club,
  ti_home.team_name as home_team,
  ti_away.club_name as away_club,
  ti_away.team_name as away_team,
  (SELECT match_number FROM matchdays WHERE id = dg.matchday_ids[1]) as match_number,
  dg.created_dates
FROM duplicate_groups dg
LEFT JOIN team_info ti_home ON dg.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON dg.away_team_id = ti_away.id
ORDER BY dg.duplicate_type, dg.match_date_only, dg.duplicate_count DESC;

-- Schritt 2: Zeige Details für jedes Duplikat
WITH duplicate_groups_by_teams AS (
  SELECT 
    match_date_only(match_date) as match_date_only,
    home_team_id,
    away_team_id,
    NULL::INTEGER as match_number,
    ARRAY_AGG(id ORDER BY created_at) as matchday_ids,
    'by_teams' as duplicate_type
  FROM matchdays
  GROUP BY match_date_only(match_date), home_team_id, away_team_id
  HAVING COUNT(*) > 1
),
duplicate_groups_by_match_number AS (
  SELECT 
    NULL::DATE as match_date_only,
    NULL::UUID as home_team_id,
    NULL::UUID as away_team_id,
    match_number,
    ARRAY_AGG(id ORDER BY created_at) as matchday_ids,
    'by_match_number' as duplicate_type
  FROM matchdays
  WHERE match_number IS NOT NULL
  GROUP BY match_number
  HAVING COUNT(*) > 1
),
duplicate_groups AS (
  SELECT * FROM duplicate_groups_by_teams
  UNION ALL
  SELECT * FROM duplicate_groups_by_match_number
)
SELECT 
  '=== DETAILS DER DUPLIKATE ===' as info,
  dg.duplicate_type,
  md.id,
  md.match_date,
  md.match_number,
  md.home_score,
  md.away_score,
  md.status,
  md.created_at,
  ti_home.club_name || ' ' || COALESCE(ti_home.team_name, '') as home_team_label,
  ti_away.club_name || ' ' || COALESCE(ti_away.team_name, '') as away_team_label,
  (SELECT COUNT(*) FROM match_results WHERE matchday_id = md.id) as match_results_count
FROM matchdays md
INNER JOIN duplicate_groups dg ON 
  (
    (dg.duplicate_type = 'by_teams' AND 
     match_date_only(md.match_date) = dg.match_date_only AND
     md.home_team_id = dg.home_team_id AND
     md.away_team_id = dg.away_team_id)
    OR
    (dg.duplicate_type = 'by_match_number' AND 
     md.match_number = dg.match_number)
  )
LEFT JOIN team_info ti_home ON md.home_team_id = ti_home.id
LEFT JOIN team_info ti_away ON md.away_team_id = ti_away.id
ORDER BY md.match_number, md.match_date, md.created_at;

