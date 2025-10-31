-- Check Team Duplikate & Inkonsistenzen
-- =====================================

-- SCHRITT 1: Identifiziere Duplikate nach club_name + category
-- ============================================================
SELECT 
  '=== DUPIKATE ANALYSE ===' as info;

SELECT 
  club_name,
  category,
  COUNT(*) as anzahl_teams,
  STRING_AGG(id::TEXT, ', ') as team_ids,
  STRING_AGG(team_name, ', ') as team_names
FROM team_info
WHERE club_name IS NOT NULL
GROUP BY club_name, category
HAVING COUNT(*) > 1
ORDER BY anzahl_teams DESC, club_name;

-- SCHRITT 2: Problem-Teams identifizieren
-- ============================================================

-- Problem 1: "SV Rot-Gelb Sürth" hat 2 Teams
SELECT 
  'SV Rot-Gelb Sürth - Duplikat!' as problem,
  id,
  team_name,
  category,
  club_name,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id) as spieler,
  (SELECT COUNT(*) FROM matches WHERE team_id = team_info.id) as matches
FROM team_info
WHERE club_name = 'SV Rot-Gelb Sürth' 
  AND category = 'Herren 40'
ORDER BY created_at;

-- Problem 2: Teams mit "Herren XX" in team_name
SELECT 
  'Teams mit falschem team_name Format' as problem,
  id,
  team_name,
  category,
  club_name
FROM team_info
WHERE team_name LIKE 'Herren %'
  OR team_name LIKE '%Herren%'
ORDER BY club_name, team_name;

-- Problem 3: Teams ohne team_name
SELECT 
  'Teams ohne team_name' as problem,
  id,
  team_name,
  category,
  club_name
FROM team_info
WHERE team_name IS NULL OR team_name = '';

-- SCHRITT 3: Detail-Ansicht für potenzielle Merge-Kandidaten
-- ============================================================

-- SV Rot-Gelb Sürth Teams
SELECT 
  'TEAM 1 (Herren 40 1):' as info,
  id,
  team_name,
  created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id) as spieler,
  (SELECT COUNT(*) FROM matches WHERE team_id = team_info.id) as matches
FROM team_info
WHERE id = '4fd8e7c2-2290-458e-b810-fe0bb11e0094';

SELECT 
  'TEAM 2 (Herren 40):' as info,
  id,
  team_name,
  created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id) as spieler,
  (SELECT COUNT(*) FROM matches WHERE team_id = team_info.id) as matches
FROM team_info
WHERE id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Zeige Spieler beider Teams
SELECT 
  'Spieler in Team 1 (Herren 40 1):' as info,
  p.name,
  p.current_lk,
  tm.role
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = '4fd8e7c2-2290-458e-b810-fe0bb11e0094';

SELECT 
  'Spieler in Team 2 (Herren 40):' as info,
  p.name,
  p.current_lk,
  tm.role
FROM team_memberships tm
JOIN players_unified p ON tm.player_id = p.id
WHERE tm.team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- Problem-Team ohne team_name (VKC Köln)
SELECT 
  'Team ohne team_name:' as info,
  id,
  team_name,
  category,
  club_name,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id) as spieler
FROM team_info
WHERE id = '6c38c710-28dd-41fe-b991-b7180ef23ca1';



