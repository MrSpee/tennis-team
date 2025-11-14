-- CLEANUP_RTHC_BAYER.sql
-- ============================================================
-- Migriert "RTHC Bayer" zu "RTHC Bayer Leverkusen" und löscht dann das Duplikat
-- ============================================================
-- WICHTIG: Führe zuerst CHECK_RTHC_BAYER_DATA.sql aus!
-- ============================================================

-- Club IDs
-- RTHC Bayer (zu löschen): f511aeb2-fed3-4010-97a2-1f73a0a5ef6c
-- RTHC Bayer Leverkusen (behalten): 712c0851-3561-43bc-8880-75bec643afde

-- ============================================================
-- CLEANUP: Migriere Daten und lösche dann "RTHC Bayer"
-- ============================================================
-- WICHTIG: Dieses Script kann EINMAL komplett ausgeführt werden!
-- Es ist in einer Transaktion, sodass bei Fehlern alles zurückgerollt wird.
-- ============================================================
-- ANLEITUNG:
-- 1. Führe zuerst CHECK_RTHC_BAYER_DATA.sql aus
-- 2. Prüfe die Ergebnisse
-- 3. Führe dann dieses Script aus (entferne Kommentare bei BEGIN/COMMIT)
-- ============================================================

-- BEGIN;

-- SCHRITT 1: Speichere Team-IDs vor der Migration (für alle nachfolgenden Schritte)
DO $$
DECLARE
  v_team_ids UUID[];
BEGIN
  -- Sammle Team-IDs VOR der Migration
  SELECT ARRAY_AGG(id) INTO v_team_ids
  FROM team_info
  WHERE club_name = 'RTHC Bayer';
  
  -- Lösche team_seasons für diese Teams
  DELETE FROM team_seasons
  WHERE team_id = ANY(v_team_ids);
  
  -- Lösche match_results für Matchdays mit diesen Teams
  DELETE FROM match_results
  WHERE matchday_id IN (
    SELECT m.id 
    FROM matchdays m
    WHERE m.home_team_id = ANY(v_team_ids) OR m.away_team_id = ANY(v_team_ids)
  );
  
  -- Lösche matchdays mit diesen Teams
  DELETE FROM matchdays
  WHERE home_team_id = ANY(v_team_ids) OR away_team_id = ANY(v_team_ids);
END $$;

-- SCHRITT 2: Aktualisiere Teams - ändere club_name und club_id zu "RTHC Bayer Leverkusen"
UPDATE team_info
SET 
  club_name = 'RTHC Bayer Leverkusen',
  club_id = (SELECT id FROM club_info WHERE name = 'RTHC Bayer Leverkusen' LIMIT 1),
  updated_at = NOW()
WHERE club_name = 'RTHC Bayer';

-- SCHRITT 5: Prüfe ob noch Teams mit "RTHC Bayer" existieren (sollten jetzt "RTHC Bayer Leverkusen" sein)
SELECT 
  '=== NACH MIGRATION: VERBLEIBENDE RTHC BAYER TEAMS ===' as info,
  COUNT(*) as count
FROM team_info
WHERE club_name = 'RTHC Bayer';

-- SCHRITT 6: Lösche RTHC Bayer Club (Teams wurden bereits migriert)
DELETE FROM club_info
WHERE name = 'RTHC Bayer';

-- SCHRITT 7: Verifiziere das Ergebnis
SELECT 
  '=== NACH CLEANUP: VERBLEIBENDE RTHC BAYER CLUBS ===' as info,
  COUNT(*) as count
FROM club_info
WHERE name = 'RTHC Bayer';

SELECT 
  '=== NACH CLEANUP: VERBLEIBENDE RTHC BAYER TEAMS ===' as info,
  COUNT(*) as count
FROM team_info
WHERE club_name = 'RTHC Bayer';

SELECT 
  '=== MIGRIERTE TEAMS ZU RTHC BAYER LEVERKUSEN ===' as info,
  COUNT(*) as count
FROM team_info
WHERE club_name = 'RTHC Bayer Leverkusen';

-- COMMIT;
-- ============================================================
-- HINWEIS: Wenn du die Änderungen rückgängig machen willst,
-- ersetze COMMIT; durch ROLLBACK; und führe das Script erneut aus
-- ============================================================

