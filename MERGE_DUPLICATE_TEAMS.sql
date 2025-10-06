-- ========================================
-- MERGE DOPPELTE SV ROT-GELB SÜRTH TEAMS
-- Problem: Theo ist Team A zugewiesen, Matches gehören zu Team B
-- Lösung: Verschiebe alle Matches zu Team A, lösche Team B
-- ========================================

-- ========================================
-- SCHRITT 1: Zeige aktuellen Zustand
-- ========================================

SELECT '📊 VORHER: Teams' as info;

SELECT 
  id,
  club_name,
  team_name,
  (SELECT COUNT(*) FROM matches WHERE team_id = team_info.id) as matches_count,
  (SELECT COUNT(*) FROM player_teams WHERE team_id = team_info.id) as players_count
FROM team_info
WHERE club_name LIKE '%Sürth%'
ORDER BY created_at;

-- ========================================
-- SCHRITT 2: Verschiebe ALLE Matches zum richtigen Team
-- ========================================

-- Verschiebe Matches von dd5478e8... (4 Matches) zu ff090c47... (Theos Team)
UPDATE matches
SET team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE team_id = 'dd5478e8-f694-4f3a-9e3b-28f3e8a0aaad';

SELECT '✅ Matches verschoben' as info, COUNT(*) as anzahl
FROM matches
WHERE team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- ========================================
-- SCHRITT 3: Verschiebe player_teams (falls vorhanden)
-- ========================================

UPDATE player_teams
SET team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE team_id = 'dd5478e8-f694-4f3a-9e3b-28f3e8a0aaad';

-- ========================================
-- SCHRITT 4: Lösche doppeltes Team
-- ========================================

DELETE FROM team_info
WHERE id = 'dd5478e8-f694-4f3a-9e3b-28f3e8a0aaad';

SELECT '✅ Doppeltes Team gelöscht' as info;

-- ========================================
-- SCHRITT 5: Zeige finalen Zustand
-- ========================================

SELECT '📊 NACHHER: Teams' as info;

SELECT 
  id,
  club_name,
  team_name,
  (SELECT COUNT(*) FROM matches WHERE team_id = team_info.id) as matches_count,
  (SELECT COUNT(*) FROM player_teams WHERE team_id = team_info.id) as players_count
FROM team_info
ORDER BY created_at;

-- ========================================
-- VERIFICATION
-- ========================================

-- Theos Teams (sollte nur noch 2 sein)
SELECT 
  '✅ THEOS TEAMS FINAL' as check_name,
  p.name,
  ti.club_name,
  ti.team_name,
  COUNT(m.id) as anzahl_matches
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
LEFT JOIN matches m ON m.team_id = ti.id
WHERE p.name = 'Theo Tester'
GROUP BY p.name, ti.club_name, ti.team_name, pt.is_primary
ORDER BY pt.is_primary DESC;

-- Keine doppelten SV Sürth Teams mehr
SELECT 
  '⚠️ DOPPELTE SÜRTH TEAMS' as check_name,
  COUNT(*) as anzahl
FROM team_info
WHERE club_name LIKE '%Sürth%';

-- Sollte nur noch 1 sein!

-- ========================================
-- ERWARTETES ERGEBNIS
-- ========================================
/*
📊 VORHER: 2 SV Sürth Teams
  - ff090c47... (0 Matches, 1 Player - Theo)
  - dd5478e8... (4 Matches, 0 Players)

✅ Matches verschoben: 4

📊 NACHHER: 1 SV Sürth Team
  - ff090c47... (4 Matches, 1 Player - Theo)

✅ THEOS TEAMS FINAL:
  - SV Rot-Gelb Sürth - Herren 40 (4 Matches)
  - TC Köln - Herren 1 (1 Match)

⚠️ DOPPELTE SÜRTH TEAMS: 1 (nur noch eins!)
*/

