-- CHECK_CHRIS_MATCHES_COMBINED.sql
-- Alle Ergebnisse in EINER Abfrage!
-- ============================================

-- SCHRITT 1: Hole Chris's team_id
WITH chris_teams AS (
  SELECT 
    p.id as player_id,
    p.name as player_name,
    p.email,
    pt.team_id,
    t.team_name,
    t.club_name,
    c.id as club_id,
    c.name as club_info_name
  FROM players p
  INNER JOIN player_teams pt ON p.id = pt.player_id
  INNER JOIN team_info t ON pt.team_id = t.id
  LEFT JOIN club_info c ON t.club_id = c.id
  WHERE p.email = 'mail@christianspee.de'
),

-- SCHRITT 2: Hole ALLE Matches für Chris's Teams
chris_matches AS (
  SELECT 
    m.id as match_id,
    m.opponent,
    m.match_date,
    m.location,
    m.team_id,
    t.team_name,
    t.club_name as team_club_name,
    c.id as club_id,
    c.name as club_info_name
  FROM matches m
  INNER JOIN team_info t ON m.team_id = t.id
  LEFT JOIN club_info c ON t.club_id = c.id
  WHERE m.team_id IN (SELECT team_id FROM chris_teams)
)

-- ERGEBNIS: Zeige alles zusammen!
SELECT 
  'Chris Spee' as player,
  (SELECT player_name FROM chris_teams LIMIT 1) as player_name,
  (SELECT team_id FROM chris_teams LIMIT 1) as chris_team_id,
  (SELECT team_name FROM chris_teams LIMIT 1) as chris_team_name,
  (SELECT club_info_name FROM chris_teams LIMIT 1) as chris_club,
  COUNT(DISTINCT cm.match_id) as total_matches_sichtbar,
  COUNT(DISTINCT CASE WHEN cm.club_info_name != (SELECT club_info_name FROM chris_teams LIMIT 1) THEN cm.match_id END) as matches_von_anderen_vereinen,
  STRING_AGG(DISTINCT cm.club_info_name, ', ' ORDER BY cm.club_info_name) as alle_vereine_in_matches,
  STRING_AGG(DISTINCT cm.opponent, ', ') FILTER (WHERE cm.club_info_name != (SELECT club_info_name FROM chris_teams LIMIT 1)) as gegner_anderer_vereine
FROM chris_matches cm;

-- Zusätzlich: Details aller Matches
SELECT 
  'DETAIL-ANSICHT' as typ,
  cm.opponent,
  cm.match_date,
  cm.team_id,
  cm.team_name,
  cm.club_info_name as verein,
  ct.club_info_name as chris_verein,
  CASE 
    WHEN cm.club_info_name = ct.club_info_name THEN '✅ KORREKT'
    ELSE '❌ FALSCHER VEREIN!'
  END as status
FROM chris_matches cm
CROSS JOIN chris_teams ct
ORDER BY cm.match_date DESC;

