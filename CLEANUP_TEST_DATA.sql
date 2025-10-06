-- ========================================
-- CLEANUP TEST DATA
-- Lösche alle Test-Daten aus der Datenbank
-- ========================================
-- ACHTUNG: Nur ausführen wenn du die Test-Daten löschen willst!
-- Echte Produktions-Daten werden NICHT gelöscht
-- ========================================

-- ========================================
-- SCHRITT 1: Lösche TC Köln Demo-Match
-- ========================================
DELETE FROM match_results 
WHERE match_id IN (
  SELECT id FROM matches WHERE team_id IN (
    SELECT id FROM team_info WHERE club_name = 'TC Köln'
  )
);

DELETE FROM match_availability 
WHERE match_id IN (
  SELECT id FROM matches WHERE team_id IN (
    SELECT id FROM team_info WHERE club_name = 'TC Köln'
  )
);

DELETE FROM matches 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'TC Köln'
);

-- ========================================
-- SCHRITT 2: Lösche TC Köln Team
-- ========================================
DELETE FROM player_teams 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'TC Köln'
);

DELETE FROM team_info 
WHERE club_name = 'TC Köln';

-- ========================================
-- VERIFICATION: Prüfe was übrig bleibt
-- ========================================

-- Zeige alle Teams
SELECT 
  id,
  club_name,
  team_name,
  season,
  season_year
FROM team_info
ORDER BY created_at;

-- Zeige Theo's Teams
SELECT 
  p.name,
  ti.club_name,
  ti.team_name,
  pt.is_primary
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester';

-- Zeige alle Matches
SELECT 
  m.opponent,
  m.match_date,
  ti.club_name,
  ti.team_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

-- ========================================
-- FERTIG! 🎉
-- ========================================
-- Alle TC Köln Test-Daten wurden gelöscht
-- Echte Produktions-Daten bleiben erhalten
-- ========================================

