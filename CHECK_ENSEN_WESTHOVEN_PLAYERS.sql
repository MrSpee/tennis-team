-- Prüfe importierte Spieler von TV Ensen Westhoven

-- 1. Prüfe, ob es einen Verein "TV Ensen Westhoven" gibt
SELECT '=== VEREINE ===' as info;
SELECT id, name, city, region 
FROM club_info 
WHERE name ILIKE '%Ensen%' OR name ILIKE '%Westhoven%'
ORDER BY name;

-- 2. Prüfe Teams von TV Ensen Westhoven
SELECT '=== TEAMS ===' as info;
SELECT id, club_name, team_name, category 
FROM team_info 
WHERE club_name ILIKE '%Ensen%' OR club_name ILIKE '%Westhoven%'
ORDER BY club_name, team_name;

-- 3. Prüfe importierte Spieler (status='pending')
SELECT '=== IMPORTIERTE SPIELER (pending) ===' as info;
SELECT p.id, p.name, p.current_lk, p.status, p.import_source, p.tvm_id_number
FROM players_unified p
WHERE p.name ILIKE '%Ensen%' OR p.import_source = 'tvm_import'
ORDER BY p.name
LIMIT 20;

-- 4. Prüfe Team-Memberships für diese Spieler
SELECT '=== TEAM-MEMBERSHIPS ===' as info;
SELECT 
  tm.player_id,
  p.name as player_name,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  tm.is_active
FROM team_memberships tm
JOIN players_unified p ON p.id = tm.player_id
JOIN team_info ti ON ti.id = tm.team_id
WHERE p.name ILIKE '%Ensen%' 
   OR ti.club_name ILIKE '%Ensen%' 
   OR ti.club_name ILIKE '%Westhoven%'
ORDER BY p.name, ti.club_name;

-- 5. Prüfe alle Spieler ohne Team-Membership
SELECT '=== SPIELER OHNE TEAM ===' as info;
SELECT p.id, p.name, p.current_lk, p.status, p.import_source
FROM players_unified p
LEFT JOIN team_memberships tm ON tm.player_id = p.id AND tm.is_active = true
WHERE p.import_source = 'tvm_import'
  AND tm.id IS NULL
ORDER BY p.name;
