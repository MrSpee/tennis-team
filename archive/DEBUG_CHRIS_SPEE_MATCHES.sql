-- PRÜFE SPIELER-TEAMS UND MATCHES
-- Warum sieht Chris Spee 22 Spiele?

-- 1. Schaue dir Chris Spee's Teams an
SELECT 
  'CHRIS SPEE TEAMS:' as info,
  pt.player_id,
  p.name,
  pt.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM player_teams pt
JOIN players p ON pt.player_id = p.id
JOIN team_info ti ON pt.team_id = ti.id
WHERE p.name = 'Chris Spee';

-- 2. Schaue dir alle Matches an, die zu Chris Spee's Teams gehören
SELECT 
  'MATCHES FÜR CHRIS SPEE:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  JOIN players p ON pt.player_id = p.id
  WHERE p.name = 'Chris Spee'
)
ORDER BY m.match_date DESC;

-- 3. Zähle die Matches pro Team
SELECT 
  'MATCHES PRO TEAM:' as info,
  ti.club_name,
  ti.team_name,
  ti.category,
  COUNT(*) as match_count
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE m.team_id IN (
  SELECT pt.team_id 
  FROM player_teams pt
  JOIN players p ON pt.player_id = p.id
  WHERE p.name = 'Chris Spee'
)
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category
ORDER BY match_count DESC;
