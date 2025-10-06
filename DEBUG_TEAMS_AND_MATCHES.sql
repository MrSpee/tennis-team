-- ========================================
-- DEBUG: Teams, Player-Teams und Matches
-- ========================================

-- 1. ALLE TEAMS
SELECT 
  '✅ ALLE TEAMS' as check_name,
  id,
  club_name,
  team_name,
  category,
  league,
  season
FROM team_info
ORDER BY created_at;

-- 2. THEOS TEAMS
SELECT 
  '✅ THEOS TEAMS' as check_name,
  p.name as spieler,
  ti.club_name,
  ti.team_name,
  ti.id as team_id,
  pt.is_primary,
  pt.role
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester'
ORDER BY pt.is_primary DESC;

-- 3. ANZAHL MATCHES PRO TEAM
SELECT 
  '✅ MATCHES PRO TEAM' as check_name,
  ti.club_name || ' - ' || ti.team_name as team,
  ti.id as team_id,
  COUNT(m.id) as anzahl_matches
FROM team_info ti
LEFT JOIN matches m ON m.team_id = ti.id
GROUP BY ti.id, ti.club_name, ti.team_name
ORDER BY anzahl_matches DESC;

-- 4. ALLE MATCHES MIT TEAM-INFO
SELECT 
  '✅ ALLE MATCHES' as check_name,
  m.id as match_id,
  m.opponent,
  TO_CHAR(m.match_date, 'DD.MM.YYYY') as datum,
  m.location,
  m.season,
  m.team_id,
  ti.club_name || ' - ' || ti.team_name as team
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 20;

-- 5. MATCHES OHNE TEAM_ID (sollte 0 sein!)
SELECT 
  '⚠️ MATCHES OHNE TEAM_ID' as check_name,
  COUNT(*) as anzahl
FROM matches
WHERE team_id IS NULL;

-- 6. PLAYER_TEAMS DOPPELTE
SELECT 
  '⚠️ DOPPELTE PLAYER_TEAMS' as check_name,
  p.name as spieler,
  ti.club_name,
  COUNT(*) as anzahl
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
GROUP BY pt.player_id, pt.team_id, p.name, ti.club_name
HAVING COUNT(*) > 1;

