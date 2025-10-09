-- CHECK_CHRIS_MATCHES.sql
-- Prüfe welche Matches Chris sieht und ob sie korrekt sind
-- ============================================

-- 1. Finde Chris in der Datenbank
SELECT 
  'STEP 1: Chris finden' as debug_step,
  p.id as player_id,
  p.user_id,
  p.name,
  p.email
FROM players p
WHERE p.email = 'mail@christianspee.de'
ORDER BY p.created_at DESC;

-- 2. Zeige Chris's Teams
SELECT 
  'STEP 2: Chris Teams' as debug_step,
  p.name as player_name,
  pt.team_id,
  pt.is_primary,
  pt.role,
  t.team_name,
  t.club_name,
  t.category,
  t.club_id,
  c.name as club_info_name
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE p.email = 'mail@christianspee.de'
ORDER BY pt.is_primary DESC;

-- 3. Zeige ALLE Matches für Chris's Teams
SELECT 
  'STEP 3: Matches für Chris Teams' as debug_step,
  m.id as match_id,
  m.opponent,
  m.match_date,
  m.location,
  m.team_id,
  t.team_name,
  t.club_name as team_club_name,
  c.name as club_info_name,
  c.id as club_id
FROM matches m
LEFT JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  INNER JOIN players p ON pt.player_id = p.id
  WHERE p.email = 'mail@christianspee.de'
)
ORDER BY m.match_date DESC;

-- 4. Prüfe ob es mehrere "Herren 40" Teams gibt!
SELECT 
  'STEP 4: Alle Herren 40 Teams' as debug_step,
  t.id as team_id,
  t.team_name,
  t.club_name,
  t.category,
  t.club_id,
  c.name as club_info_name,
  COUNT(m.id) as anzahl_matches
FROM team_info t
LEFT JOIN club_info c ON t.club_id = c.id
LEFT JOIN matches m ON m.team_id = t.id
WHERE t.team_name ILIKE '%Herren 40%' OR t.category = 'Herren 40'
GROUP BY t.id, t.team_name, t.club_name, t.category, t.club_id, c.name
ORDER BY anzahl_matches DESC;

-- 5. Zeige welche Vereine in den 17 Matches vorkommen
SELECT 
  'STEP 5: Vereine in Chris Matches' as debug_step,
  c.name as club_name,
  COUNT(DISTINCT m.id) as anzahl_matches,
  STRING_AGG(DISTINCT t.team_name, ', ') as teams,
  STRING_AGG(m.opponent, ', ' ORDER BY m.match_date) as gegner
FROM matches m
INNER JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  INNER JOIN players p ON pt.player_id = p.id
  WHERE p.email = 'mail@christianspee.de'
)
GROUP BY c.name
ORDER BY anzahl_matches DESC;

-- 6. PROBLEM-CHECK: Gibt es Matches mit falscher team_id?
SELECT 
  'STEP 6: Potentielle Fehler' as debug_step,
  m.id,
  m.opponent,
  m.match_date,
  m.team_id,
  t.team_name,
  t.club_name,
  c.name as club_info_name,
  CASE 
    WHEN c.name != 'SV Rot-Gelb Sürth' THEN '❌ FALSCHER VEREIN!'
    ELSE '✅ OK'
  END as check_result
FROM matches m
INNER JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  INNER JOIN players p ON pt.player_id = p.id
  WHERE p.email = 'mail@christianspee.de'
)
ORDER BY m.match_date DESC;

