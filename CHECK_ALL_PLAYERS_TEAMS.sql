-- CHECK_ALL_PLAYERS_TEAMS.sql
-- Prüfe ALLE Spieler und ihre Team/Vereins-Zuordnungen
-- ============================================

-- 1. ÜBERSICHT: Alle Spieler mit ihren Teams und Vereinen
SELECT 
  p.id as player_id,
  p.name as player_name,
  p.email,
  p.is_active,
  COALESCE(COUNT(DISTINCT pt.team_id), 0) as anzahl_teams,
  COALESCE(COUNT(DISTINCT t.club_id), 0) as anzahl_clubs,
  STRING_AGG(DISTINCT t.team_name, ', ' ORDER BY t.team_name) as teams,
  STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) as vereine,
  MAX(CASE WHEN pt.is_primary = true THEN t.team_name ELSE NULL END) as primary_team,
  MAX(CASE WHEN pt.role = 'captain' THEN '👑 Captain' ELSE '🎾 Spieler' END) as rolle
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
LEFT JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
GROUP BY p.id, p.name, p.email, p.is_active
ORDER BY p.is_active DESC, p.name;

-- 2. PROBLEM-ANALYSE: Spieler OHNE Teams
SELECT 
  p.id as player_id,
  p.name as player_name,
  p.email,
  p.is_active,
  p.created_at,
  '❌ KEIN TEAM ZUGEORDNET' as problem
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
WHERE pt.id IS NULL
ORDER BY p.is_active DESC, p.created_at DESC;

-- 3. PROBLEM-ANALYSE: Teams ohne club_id
SELECT 
  pt.player_id,
  p.name as player_name,
  pt.team_id,
  t.team_name,
  t.club_name as team_club_name,
  t.club_id,
  '⚠️ TEAM HAT KEINE CLUB_ID' as problem
FROM player_teams pt
INNER JOIN players p ON pt.player_id = p.id
INNER JOIN team_info t ON pt.team_id = t.id
WHERE t.club_id IS NULL
ORDER BY p.name;

-- 4. DETAIL-ANSICHT: Alle Team-Zuordnungen
SELECT 
  p.name as player_name,
  p.email,
  p.is_active as player_active,
  pt.is_primary,
  pt.role,
  t.id as team_id,
  t.team_name,
  t.category,
  t.club_id,
  c.id as club_info_id,
  c.name as club_name,
  c.normalized_name as club_normalized,
  c.city,
  c.region,
  -- Prüfungen
  CASE 
    WHEN t.club_id IS NULL THEN '⚠️ Team hat keine club_id'
    WHEN c.id IS NULL THEN '⚠️ club_id zeigt auf nicht-existierenden Club'
    ELSE '✅ OK'
  END as status
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN club_info c ON t.club_id = c.id
ORDER BY p.is_active DESC, p.name, pt.is_primary DESC;

-- 5. STATISTIK: Zusammenfassung
SELECT 
  label,
  count as wert
FROM (
  SELECT '1. Gesamt Spieler' as label, COUNT(*) as count FROM players
  UNION ALL
  SELECT '2. Aktive Spieler' as label, COUNT(*) as count FROM players WHERE is_active = true
  UNION ALL
  SELECT '3. Spieler MIT Teams' as label, COUNT(DISTINCT pt.player_id) as count 
    FROM player_teams pt
  UNION ALL
  SELECT '4. Spieler OHNE Teams' as label, COUNT(*) as count 
    FROM players p 
    LEFT JOIN player_teams pt ON p.id = pt.player_id 
    WHERE pt.id IS NULL
  UNION ALL
  SELECT '5. Gesamt Teams' as label, COUNT(*) as count FROM team_info
  UNION ALL
  SELECT '6. Teams MIT club_id' as label, COUNT(*) as count FROM team_info WHERE club_id IS NOT NULL
  UNION ALL
  SELECT '7. Teams OHNE club_id' as label, COUNT(*) as count FROM team_info WHERE club_id IS NULL
  UNION ALL
  SELECT '8. Gesamt Clubs' as label, COUNT(*) as count FROM club_info
  UNION ALL
  SELECT '9. player_teams Einträge' as label, COUNT(*) as count FROM player_teams
) stats
ORDER BY label;

-- 6. VEREINE-ÜBERSICHT: Welche Spieler in welchem Verein
SELECT 
  c.name as club_name,
  c.city,
  c.region,
  COUNT(DISTINCT t.id) as anzahl_teams,
  COUNT(DISTINCT pt.player_id) as anzahl_spieler,
  STRING_AGG(DISTINCT t.team_name, ', ' ORDER BY t.team_name) as teams,
  STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as spieler
FROM club_info c
LEFT JOIN team_info t ON c.id = t.club_id
LEFT JOIN player_teams pt ON t.id = pt.team_id
LEFT JOIN players p ON pt.player_id = p.id
GROUP BY c.id, c.name, c.city, c.region
ORDER BY anzahl_spieler DESC, c.name;

-- 7. MATCHES-ZUORDNUNG: Welche Spieler können welche Matches sehen
SELECT 
  p.name as player_name,
  COUNT(DISTINCT m.id) as anzahl_matches_sichtbar,
  STRING_AGG(DISTINCT t.team_name, ', ' ORDER BY t.team_name) as teams,
  STRING_AGG(DISTINCT m.opponent, ', ') FILTER (WHERE m.id IS NOT NULL) as gegner_sample
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN matches m ON m.team_id = t.id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY anzahl_matches_sichtbar DESC, p.name;

-- 8. TRAINING-ZUORDNUNG: Welche Spieler können welche Trainings sehen
SELECT 
  p.name as player_name,
  COUNT(DISTINCT ts.id) as anzahl_trainings_sichtbar,
  STRING_AGG(DISTINCT t.team_name, ', ' ORDER BY t.team_name) as teams,
  STRING_AGG(DISTINCT ts.title, ', ') FILTER (WHERE ts.id IS NOT NULL) as training_sample
FROM players p
INNER JOIN player_teams pt ON p.id = pt.player_id
INNER JOIN team_info t ON pt.team_id = t.id
LEFT JOIN training_sessions ts ON ts.team_id = t.id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY anzahl_trainings_sichtbar DESC, p.name;

-- 9. PROBLEM-REPORT: Was muss gefixt werden?
SELECT 
  'PROBLEM-REPORT' as kategorie,
  label,
  anzahl,
  CASE 
    WHEN anzahl > 0 THEN '❌ MUSS GEFIXT WERDEN'
    ELSE '✅ OK'
  END as status
FROM (
  SELECT 1 as sort_order, 'Spieler ohne Teams' as label, COUNT(*) as anzahl
    FROM players p 
    LEFT JOIN player_teams pt ON p.id = pt.player_id 
    WHERE pt.id IS NULL AND p.is_active = true
  UNION ALL
  SELECT 2, 'Teams ohne club_id' as label, COUNT(*) as anzahl
    FROM team_info WHERE club_id IS NULL
  UNION ALL
  SELECT 3, 'Matches ohne team_id' as label, COUNT(*) as anzahl
    FROM matches WHERE team_id IS NULL
  UNION ALL
  SELECT 4, 'Trainings ohne team_id' as label, COUNT(*) as anzahl
    FROM training_sessions WHERE team_id IS NULL
  UNION ALL
  SELECT 5, 'player_teams mit ungültigem team_id' as label, COUNT(*) as anzahl
    FROM player_teams pt
    LEFT JOIN team_info t ON pt.team_id = t.id
    WHERE t.id IS NULL
  UNION ALL
  SELECT 6, 'team_info mit ungültigem club_id' as label, COUNT(*) as anzahl
    FROM team_info t
    LEFT JOIN club_info c ON t.club_id = c.id
    WHERE t.club_id IS NOT NULL AND c.id IS NULL
) problems
ORDER BY sort_order;

