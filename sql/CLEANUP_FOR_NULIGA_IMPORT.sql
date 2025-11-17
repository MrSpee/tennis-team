-- ============================================================================
-- CLEANUP SCRIPT: Vorbereitung für sauberen nuLiga-Import
-- ============================================================================
-- 
-- ZWECK: Entfernt alte/inkonsistente Daten, behält nur:
--   - Aktive App-Nutzer (players_unified mit user_id)
--   - Deren Team-Memberships
--   - Vereine (club_info) - werden neu gemappt
--
-- WICHTIG: Führe ein BACKUP aus, bevor du dieses Script ausführst!
-- 
-- ============================================================================

-- ============================================================================
-- PHASE 1: ANALYSE - Zeige was gelöscht wird (DRY-RUN)
-- ============================================================================

-- 1.1 Zeige aktive App-Nutzer (werden BEHALTEN)
SELECT 
  'AKTIVE APP-NUTZER (BEHALTEN)' as info,
  COUNT(*) as anzahl,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 10) as beispiel_namen
FROM players_unified
WHERE user_id IS NOT NULL 
  AND (is_active = true OR is_active IS NULL)
  AND player_type = 'app_user';

-- 1.2 Zeige Spieler die gelöscht werden
SELECT 
  'SPIELER ZUM LÖSCHEN' as info,
  COUNT(*) as anzahl,
  COUNT(CASE WHEN player_type = 'external' THEN 1 END) as external,
  COUNT(CASE WHEN player_type = 'opponent' THEN 1 END) as opponent,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as ohne_user_id
FROM players_unified
WHERE user_id IS NULL 
   OR is_active = false
   OR player_type IN ('external', 'opponent');

-- 1.3 Zeige Teams die gelöscht werden
SELECT 
  'TEAMS ZUM LÖSCHEN' as info,
  COUNT(*) as anzahl,
  STRING_AGG(club_name || ' ' || COALESCE(team_name, ''), ', ' ORDER BY club_name LIMIT 10) as beispiel_teams
FROM team_info;

-- 1.4 Zeige Matches die gelöscht werden
SELECT 
  'MATCHES ZUM LÖSCHEN' as info,
  COUNT(*) as anzahl,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled
FROM matchdays;

-- 1.5 Zeige Match-Results die gelöscht werden
SELECT 
  'MATCH-RESULTS ZUM LÖSCHEN' as info,
  COUNT(*) as anzahl
FROM match_results;

-- ============================================================================
-- PHASE 2: BACKUP (Optional - für Sicherheit)
-- ============================================================================
-- Erstelle Backup-Tabellen (optional, falls du später etwas wiederherstellen willst)

-- CREATE TABLE players_unified_backup AS SELECT * FROM players_unified;
-- CREATE TABLE team_info_backup AS SELECT * FROM team_info;
-- CREATE TABLE matchdays_backup AS SELECT * FROM matchdays;
-- CREATE TABLE match_results_backup AS SELECT * FROM match_results;
-- CREATE TABLE team_seasons_backup AS SELECT * FROM team_seasons;
-- CREATE TABLE team_memberships_backup AS SELECT * FROM team_memberships;

-- ============================================================================
-- PHASE 3: CLEANUP - Lösche in richtiger Reihenfolge (Foreign Keys beachten!)
-- ============================================================================

BEGIN;

-- 3.1 Lösche Match-Results (abhängig von matchdays)
DELETE FROM match_results;
-- Ergebnis: Alle Match-Ergebnisse gelöscht

-- 3.2 Lösche Matchdays (abhängig von teams)
DELETE FROM matchdays;
-- Ergebnis: Alle Matches gelöscht

-- 3.3 Lösche Team-Seasons (abhängig von teams)
DELETE FROM team_seasons;
-- Ergebnis: Alle Saison-Zuordnungen gelöscht

-- 3.4 Lösche Team-Memberships für nicht-aktive Spieler
-- BEHALTE nur Memberships für aktive App-Nutzer
DELETE FROM team_memberships
WHERE player_id NOT IN (
  SELECT id FROM players_unified 
  WHERE user_id IS NOT NULL 
    AND (is_active = true OR is_active IS NULL)
    AND player_type = 'app_user'
);
-- Ergebnis: Nur Memberships für aktive App-Nutzer bleiben erhalten

-- 3.5 Lösche Teams (team_info)
-- WICHTIG: Teams werden komplett gelöscht, da sie aus nuLiga neu importiert werden
DELETE FROM team_info;
-- Ergebnis: Alle Teams gelöscht (werden aus nuLiga neu importiert)

-- 3.6 Lösche Spieler die NICHT aktive App-Nutzer sind
DELETE FROM players_unified
WHERE user_id IS NULL 
   OR is_active = false
   OR player_type IN ('external', 'opponent');
-- Ergebnis: Nur aktive App-Nutzer bleiben erhalten

-- 3.7 OPTIONAL: Lösche auch Vereine (club_info)
-- UNKOMMENTIERE NUR wenn du auch Vereine neu importieren willst!
-- DELETE FROM club_info;
-- Ergebnis: Alle Vereine gelöscht (werden aus nuLiga neu importiert)

-- 3.8 OPTIONAL: Lösche Activity-Logs (optional, falls zu viele)
-- UNKOMMENTIERE NUR wenn du auch Logs löschen willst!
-- DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '30 days';

COMMIT;

-- ============================================================================
-- PHASE 4: VERIFIKATION - Prüfe Ergebnis
-- ============================================================================

-- 4.1 Verbleibende Spieler
SELECT 
  'VERBLEIBENDE SPIELER' as info,
  COUNT(*) as anzahl,
  STRING_AGG(name, ', ' ORDER BY name) as namen
FROM players_unified;

-- 4.2 Verbleibende Teams (sollte 0 sein)
SELECT 
  'VERBLEIBENDE TEAMS' as info,
  COUNT(*) as anzahl
FROM team_info;

-- 4.3 Verbleibende Matches (sollte 0 sein)
SELECT 
  'VERBLEIBENDE MATCHES' as info,
  COUNT(*) as anzahl
FROM matchdays;

-- 4.4 Verbleibende Match-Results (sollte 0 sein)
SELECT 
  'VERBLEIBENDE MATCH-RESULTS' as info,
  COUNT(*) as anzahl
FROM match_results;

-- ============================================================================
-- PHASE 5: NACHBEREITUNG - Setze Referenzen zurück
-- ============================================================================

BEGIN;

-- 5.1 Setze primary_team_id bei verbleibenden Spielern zurück (falls vorhanden)
UPDATE players_unified
SET primary_team_id = NULL
WHERE primary_team_id IS NOT NULL
  AND primary_team_id NOT IN (SELECT id FROM team_info);
-- Ergebnis: Ungültige Team-Referenzen entfernt

COMMIT;

-- ============================================================================
-- FERTIG!
-- ============================================================================
-- 
-- NÄCHSTE SCHRITTE:
-- 1. Gehe ins SuperAdmin-Dashboard → Scraper-Tab
-- 2. Lade nuLiga-Daten für deine Gruppen
-- 3. Mappe Clubs/Teams manuell oder lass sie automatisch anlegen
-- 4. Importiere Matches
-- 5. Importiere Match-Results über Meeting-Reports
--
-- ============================================================================


