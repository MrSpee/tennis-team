-- ANALYSE: Warum werden keine Spieler in der Spieler-Ansicht angezeigt?
-- Problem: Spieler haben keine Team-Zuordnung und keine LK-Werte

-- 1. Prüfe alle Spieler aus Sürth-Team
SELECT 
  'SÜRTH SPIELER MIT TEAM-ZUORDNUNG:' as info,
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

-- 2. Prüfe alle Spieler ohne Team-Zuordnung
SELECT 
  'SPIELER OHNE TEAM-ZUORDNUNG:' as info,
  p.id,
  p.name,
  p.email,
  p.is_active,
  p.current_lk,
  p.season_start_lk,
  p.ranking
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
WHERE pt.player_id IS NULL
ORDER BY p.name;

-- 3. Prüfe alle Spieler ohne LK-Werte
SELECT 
  'SPIELER OHNE LK-WERTE:' as info,
  p.id,
  p.name,
  p.email,
  p.is_active,
  p.current_lk,
  p.season_start_lk,
  p.ranking
FROM players p
WHERE p.current_lk IS NULL AND p.season_start_lk IS NULL AND p.ranking IS NULL
ORDER BY p.name;

-- 4. Prüfe Georg Rolshoven spezifisch
SELECT 
  'GEORG ROLSHOVEN:' as info,
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
LEFT JOIN player_teams pt ON p.id = pt.player_id
LEFT JOIN team_info ti ON pt.team_id = ti.id
WHERE p.id = '3bacc047-a692-4d94-8659-6bbcb629d83c';

-- 5. Zähle Spieler nach verschiedenen Kriterien
SELECT 
  'SPIELER-STATISTIK:' as info,
  'Mit Team-Zuordnung' as category,
  COUNT(DISTINCT p.id) as count
FROM players p
JOIN player_teams pt ON p.id = pt.player_id
UNION ALL
SELECT 
  'SPIELER-STATISTIK:' as info,
  'Ohne Team-Zuordnung' as category,
  COUNT(DISTINCT p.id) as count
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
WHERE pt.player_id IS NULL
UNION ALL
SELECT 
  'SPIELER-STATISTIK:' as info,
  'Mit LK-Werten' as category,
  COUNT(DISTINCT p.id) as count
FROM players p
WHERE p.current_lk IS NOT NULL OR p.season_start_lk IS NOT NULL OR p.ranking IS NOT NULL
UNION ALL
SELECT 
  'SPIELER-STATISTIK:' as info,
  'Ohne LK-Werte' as category,
  COUNT(DISTINCT p.id) as count
FROM players p
WHERE p.current_lk IS NULL AND p.season_start_lk IS NULL AND p.ranking IS NULL;
