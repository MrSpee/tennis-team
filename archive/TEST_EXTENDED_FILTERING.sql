-- TESTE DIE ERWEITERTE FILTERUNG
-- Prüfe alle Funktionen des neuen Systems

-- 1. Teste get_player_matches Funktion (nur eigene Teams)
SELECT 
  'TEST 1: Nur eigene Teams' as info,
  match_id,
  opponent,
  match_date,
  club_name,
  team_name,
  league_name,
  access_type
FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  false, -- Nur eigene Teams
  NULL   -- Keine spezifische Liga
)
ORDER BY match_date;

-- 2. Teste Liga-Zugriff (für zukünftige Features)
SELECT 
  'TEST 2: Mit Liga-Zugriff' as info,
  match_id,
  opponent,
  match_date,
  club_name,
  team_name,
  league_name,
  access_type
FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  true,  -- Inklusive Liga-Matches
  NULL   -- Alle Ligen
)
ORDER BY match_date;

-- 3. Teste spezifische Liga (für Liga-Übersichten)
SELECT 
  'TEST 3: Spezifische Liga' as info,
  match_id,
  opponent,
  match_date,
  club_name,
  team_name,
  league_name,
  access_type
FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  true,  -- Inklusive Liga-Matches
  '550e8400-e29b-41d4-a716-446655440000'::UUID  -- Kreisklasse Köln
)
ORDER BY match_date;

-- 4. Zeige alle verfügbaren Ligen
SELECT 
  'VERFÜGBARE LIGEN:' as info,
  l.id,
  l.name,
  l.region,
  l.level,
  l.season,
  COUNT(ti.id) as team_count
FROM leagues l
LEFT JOIN team_info ti ON ti.league_id = l.id
WHERE l.is_active = true
GROUP BY l.id, l.name, l.region, l.level, l.season
ORDER BY l.name;

-- 5. Zeige Liga-Mitgliedschaften
SELECT 
  'LIGA-MITGLIEDSCHAFTEN:' as info,
  l.name as league_name,
  ti.club_name,
  ti.team_name,
  lm.season,
  lm.is_active
FROM league_memberships lm
JOIN leagues l ON lm.league_id = l.id
JOIN team_info ti ON lm.team_id = ti.id
ORDER BY l.name, ti.club_name, ti.team_name;

-- 6. Teste die neue View
SELECT 
  'TEST VIEW: matches_with_league_info' as info,
  id,
  opponent,
  match_date,
  club_name,
  team_name,
  league_name,
  league_region,
  league_level
FROM matches_with_league_info
WHERE club_name = 'SV Rot-Gelb Sürth'
ORDER BY match_date;
