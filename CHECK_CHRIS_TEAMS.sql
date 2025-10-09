-- CHECK_CHRIS_TEAMS.sql
-- Prüfe welche Teams/Vereine Chris Spee zugeordnet ist
-- ============================================

-- Chris Spee's Player-ID
-- id: 43427aa7-771f-4e47-8858-c8454a1b9fee
-- user_id: bb04dcc9-1e1d-4e3a-9f1b-ca324f643784

-- 1. Zeige Chris Spee's Teams und Vereine
SELECT 
  p.id as player_id,
  p.name as player_name,
  p.email,
  pt.team_id,
  pt.is_primary,
  pt.role,
  t.team_name,
  t.category,
  t.club_id,
  c.id as club_info_id,
  c.name as club_name,
  c.normalized_name as club_normalized_name,
  c.city,
  c.region
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE p.id = '43427aa7-771f-4e47-8858-c8454a1b9fee'
ORDER BY pt.is_primary DESC, t.team_name;

-- 2. Zeige ALLE player_teams Einträge für Chris
SELECT 
  pt.*,
  t.team_name,
  t.club_name as team_club_name,
  t.club_id
FROM player_teams pt
LEFT JOIN team_info t ON pt.team_id = t.id
WHERE pt.player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee';

-- 3. Zeige Matches für Chris's Teams
SELECT 
  m.id,
  m.opponent,
  m.match_date,
  m.team_id,
  t.team_name,
  t.club_name as team_club_name,
  c.name as club_info_name
FROM matches m
LEFT JOIN team_info t ON m.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE m.team_id IN (
  SELECT team_id FROM player_teams WHERE player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee'
)
ORDER BY m.match_date DESC
LIMIT 10;

-- 4. Zusammenfassung
SELECT 
  'Chris Spee' as player,
  COUNT(DISTINCT pt.team_id) as anzahl_teams,
  COUNT(DISTINCT t.club_id) as anzahl_clubs,
  STRING_AGG(DISTINCT c.name, ', ') as vereine
FROM player_teams pt
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
WHERE pt.player_id = '43427aa7-771f-4e47-8858-c8454a1b9fee';

