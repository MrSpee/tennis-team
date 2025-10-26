-- DEBUG: Prüfe warum keine Spieler in der Spieler-Ansicht angezeigt werden
-- Das Problem könnte sein, dass Spieler nicht als 'is_active' markiert sind

-- 1. Prüfe alle Spieler und ihren is_active Status
SELECT 
  'ALLE SPIELER:' as info,
  id,
  name,
  email,
  is_active,
  current_lk,
  season_start_lk,
  ranking
FROM players
ORDER BY name;

-- 2. Prüfe nur aktive Spieler (die sollten in der App angezeigt werden)
SELECT 
  'AKTIVE SPIELER:' as info,
  id,
  name,
  email,
  is_active,
  current_lk,
  season_start_lk,
  ranking
FROM players
WHERE is_active = true
ORDER BY name;

-- 3. Prüfe Spieler aus Sürth-Team
SELECT 
  'SÜRTH SPIELER:' as info,
  p.id,
  p.name,
  p.email,
  p.is_active,
  p.current_lk,
  p.season_start_lk,
  p.ranking,
  pt.team_id,
  ti.club_name,
  ti.team_name
FROM players p
JOIN player_teams pt ON p.id = pt.player_id
JOIN team_info ti ON pt.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY p.name;

-- 4. Zähle Spieler nach is_active Status
SELECT 
  'SPIELER-STATISTIK:' as info,
  is_active,
  COUNT(*) as count
FROM players
GROUP BY is_active
ORDER BY is_active;
