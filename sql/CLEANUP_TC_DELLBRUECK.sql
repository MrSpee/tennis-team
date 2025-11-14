-- CLEANUP: Entferne falsche "TC Dellbrück" Einträge
-- ============================================================
-- Problem: Es gibt einen falschen Club "TC Dellbrück" 
-- Korrekt: Es sollte nur "TV Dellbrück" geben
-- ============================================================

-- SCHRITT 1: Identifiziere alle "TC Dellbrück" Clubs
-- ============================================================
SELECT 
  '=== TC DELLBRUECK CLUBS (FALSCH) ===' as info,
  ci.id,
  ci.name,
  ci.normalized_name,
  ci.created_at
FROM club_info ci
WHERE ci.name ILIKE '%TC Dellbrück%' OR ci.name ILIKE '%TC%' AND ci.name ILIKE '%Dellbrück%'
ORDER BY ci.created_at;

-- SCHRITT 2: Identifiziere alle "TV Dellbrück" Clubs (KORREKT)
-- ============================================================
SELECT 
  '=== TV DELLBRUECK CLUBS (KORREKT) ===' as info,
  ci.id,
  ci.name,
  ci.normalized_name,
  ci.created_at
FROM club_info ci
WHERE ci.name ILIKE '%TV Dellbrück%'
ORDER BY ci.created_at;

-- SCHRITT 3: Identifiziere alle Teams mit "TC Dellbrück"
-- ============================================================
SELECT 
  '=== TC DELLBRUECK TEAMS (FALSCH) ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.club_id,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id) as memberships_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = ti.id OR away_team_id = ti.id) as matchdays_count,
  (SELECT COUNT(*) FROM team_seasons WHERE team_id = ti.id) as seasons_count
FROM team_info ti
WHERE ti.club_name ILIKE '%TC Dellbrück%'
ORDER BY ti.created_at;

-- SCHRITT 4: Identifiziere alle Teams mit "TV Dellbrück" (KORREKT)
-- ============================================================
SELECT 
  '=== TV DELLBRUECK TEAMS (KORREKT) ===' as info,
  ti.id,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.club_id,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = ti.id) as memberships_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = ti.id OR away_team_id = ti.id) as matchdays_count,
  (SELECT COUNT(*) FROM team_seasons WHERE team_id = ti.id) as seasons_count
FROM team_info ti
WHERE ti.club_name ILIKE '%TV Dellbrück%'
ORDER BY ti.created_at;

-- SCHRITT 5: Prüfe ob "TC Dellbrück" Teams in Matchdays verwendet werden
-- ============================================================
SELECT 
  '=== MATCHDAYS MIT TC DELLBRUECK ===' as info,
  m.id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  hti.club_name as home_club,
  hti.team_name as home_team,
  ati.club_name as away_club,
  ati.team_name as away_team
FROM matchdays m
JOIN team_info hti ON m.home_team_id = hti.id
JOIN team_info ati ON m.away_team_id = ati.id
WHERE hti.club_name ILIKE '%TC Dellbrück%' OR ati.club_name ILIKE '%TC Dellbrück%'
ORDER BY m.match_date;

-- ============================================================
-- CLEANUP: Lösche alle "TC Dellbrück" Einträge
-- ============================================================
-- WICHTIG: Dieses Script kann EINMAL komplett ausgeführt werden!
-- Es ist in einer Transaktion, sodass bei Fehlern alles zurückgerollt wird.
-- ============================================================
-- ANLEITUNG:
-- 1. Führe zuerst die SCHRITTE 1-4 aus (nur SELECT, keine Änderungen)
-- 2. Prüfe die Ergebnisse
-- 3. Führe dann SCHRITT 5 aus (CLEANUP mit BEGIN/COMMIT)
-- ============================================================

-- ============================================================
-- SCHRITT 5: CLEANUP (AUSFÜHREN NACH PRÜFUNG DER SCHRITTE 1-4)
-- ============================================================
-- Entferne die Kommentare bei BEGIN und COMMIT, um auszuführen
-- ============================================================

-- BEGIN;

-- 5.1: Lösche team_seasons für TC Dellbrück Teams
DELETE FROM team_seasons
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
);

-- 5.2: Lösche team_memberships für TC Dellbrück Teams
DELETE FROM team_memberships
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
);

-- 5.3: Lösche matchdays mit TC Dellbrück Teams
-- WICHTIG: Prüfe vorher in SCHRITT 4, ob diese Matches wichtig sind!
DELETE FROM matchdays
WHERE home_team_id IN (
  SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
) OR away_team_id IN (
  SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
);

-- 5.4: Lösche match_results für gelöschte matchdays
-- (Wird automatisch durch CASCADE gelöscht, aber zur Sicherheit explizit)
DELETE FROM match_results
WHERE matchday_id IN (
  SELECT id FROM matchdays
  WHERE home_team_id IN (
    SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
  ) OR away_team_id IN (
    SELECT id FROM team_info WHERE club_name ILIKE '%TC Dellbrück%'
  )
);

-- 5.5: Lösche TC Dellbrück Teams
DELETE FROM team_info
WHERE club_name ILIKE '%TC Dellbrück%';

-- 5.6: Lösche TC Dellbrück Clubs
DELETE FROM club_info
WHERE name ILIKE '%TC Dellbrück%' OR (name ILIKE '%TC%' AND name ILIKE '%Dellbrück%');

-- 5.7: Verifiziere das Ergebnis
SELECT 
  '=== NACH CLEANUP: VERBLEIBENDE TC DELLBRUECK CLUBS ===' as info,
  COUNT(*) as count
FROM club_info
WHERE name ILIKE '%TC Dellbrück%';

SELECT 
  '=== NACH CLEANUP: VERBLEIBENDE TC DELLBRUECK TEAMS ===' as info,
  COUNT(*) as count
FROM team_info
WHERE club_name ILIKE '%TC Dellbrück%';

-- COMMIT;
-- ============================================================
-- HINWEIS: Wenn du die Änderungen rückgängig machen willst,
-- ersetze COMMIT; durch ROLLBACK; und führe das Script erneut aus
-- ============================================================

