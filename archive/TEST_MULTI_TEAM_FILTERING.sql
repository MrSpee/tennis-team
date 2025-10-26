-- FRONTEND UPDATE PLAN: Multi-Team Filtering
-- Erweitert DataContext.jsx für zukünftige Liga-Übersichten

-- 1. Teste die neue get_player_matches Funktion
SELECT * FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  false, -- Nur eigene Teams
  NULL   -- Keine spezifische Liga
);

-- 2. Teste Liga-Zugriff (für zukünftige Features)
SELECT * FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  true,  -- Inklusive Liga-Matches
  NULL   -- Alle Ligen
);

-- 3. Teste spezifische Liga (für Liga-Übersichten)
SELECT * FROM get_player_matches(
  '43427aa7-771f-4e47-8858-c8454a1b9fee'::UUID, -- Chris Spee's ID
  true,  -- Inklusive Liga-Matches
  '550e8400-e29b-41d4-a716-446655440000'::UUID  -- Kreisklasse Köln
);

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
