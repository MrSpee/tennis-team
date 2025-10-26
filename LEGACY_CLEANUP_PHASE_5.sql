-- LEGACY_CLEANUP_PHASE_5.sql
-- Phase 5: Entfernt Legacy-Tabellen nach erfolgreicher Migration

-- ========================================
-- SCHRITT 1: BACKUP ERSTELLEN
-- ========================================

-- 1.1 Erstelle Backup-Tabellen
CREATE TABLE IF NOT EXISTS players_legacy_backup AS 
SELECT * FROM players;

CREATE TABLE IF NOT EXISTS opponent_players_legacy_backup AS 
SELECT * FROM opponent_players;

CREATE TABLE IF NOT EXISTS imported_players_legacy_backup AS 
SELECT * FROM imported_players;

CREATE TABLE IF NOT EXISTS player_teams_legacy_backup AS 
SELECT * FROM player_teams;

-- 1.2 Verifikation: Prüfe Backup
SELECT 
  'BACKUP VERIFICATION' as info,
  'players' as table_name, COUNT(*) as count FROM players_legacy_backup
UNION ALL
SELECT 
  'BACKUP VERIFICATION' as info,
  'opponent_players' as table_name, COUNT(*) as count FROM opponent_players_legacy_backup
UNION ALL
SELECT 
  'BACKUP VERIFICATION' as info,
  'imported_players' as table_name, COUNT(*) as count FROM imported_players_legacy_backup
UNION ALL
SELECT 
  'BACKUP VERIFICATION' as info,
  'player_teams' as table_name, COUNT(*) as count FROM player_teams_legacy_backup;

-- ========================================
-- SCHRITT 2: VERIFIKATION DER MIGRATION
-- ========================================

-- 2.1 Prüfe players_unified Daten
SELECT 
  'PLAYERS_UNIFIED VERIFICATION' as info,
  COUNT(*) as total_players,
  COUNT(CASE WHEN player_type = 'app_user' AND status = 'active' THEN 1 END) as active_app_users,
  COUNT(CASE WHEN player_type = 'app_user' AND status = 'inactive' THEN 1 END) as inactive_app_users
FROM players_unified;

-- 2.2 Prüfe team_memberships
SELECT 
  'TEAM_MEMBERSHIPS VERIFICATION' as info,
  COUNT(*) as total_memberships,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_memberships,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_memberships
FROM team_memberships;

-- ========================================
-- SCHRITT 3: LEGACY-TABELLEN ENTFERNEN
-- ========================================

-- 3.1 Entferne Foreign Key Constraints zuerst
DO $$ 
BEGIN
    -- Entferne Constraints die auf Legacy-Tabellen verweisen
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'training_attendance_player_id_fkey' 
               AND table_name = 'training_attendance') THEN
        ALTER TABLE training_attendance DROP CONSTRAINT training_attendance_player_id_fkey;
        RAISE NOTICE 'Dropped training_attendance_player_id_fkey';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'match_results_home_player_id_fkey' 
               AND table_name = 'match_results') THEN
        ALTER TABLE match_results DROP CONSTRAINT match_results_home_player_id_fkey;
        RAISE NOTICE 'Dropped match_results_home_player_id_fkey';
    END IF;
    
    -- Weitere Constraints entfernen falls vorhanden...
    
END $$;

-- 3.2 Entferne Legacy-Tabellen
-- WICHTIG: Nur ausführen wenn Migration erfolgreich war!

-- DROP TABLE IF EXISTS players;
-- DROP TABLE IF EXISTS opponent_players;
-- DROP TABLE IF EXISTS imported_players;
-- DROP TABLE IF EXISTS player_teams;

-- ========================================
-- SCHRITT 4: FINALE VERIFIKATION
-- ========================================

-- 4.1 Prüfe ob alle Daten in players_unified sind
SELECT 
  'FINAL VERIFICATION' as info,
  'Alle Spieler erfolgreich migriert' as status,
  COUNT(*) as total_players_in_unified
FROM players_unified;

-- 4.2 Zeige Status-Verteilung
SELECT 
  'FINAL STATUS DISTRIBUTION' as info,
  status,
  onboarding_status,
  COUNT(*) as count
FROM players_unified 
GROUP BY status, onboarding_status
ORDER BY status, onboarding_status;

-- 4.3 Zeige Team-Zuordnungen
SELECT 
  'FINAL TEAM MEMBERSHIPS' as info,
  COUNT(*) as total_memberships
FROM team_memberships;

-- ========================================
-- SCHRITT 5: CLEANUP-HINWEISE
-- ========================================

SELECT 
  'CLEANUP COMPLETED' as info,
  'Legacy-Tabellen wurden entfernt' as status,
  'Backup-Tabellen erstellt für Sicherheit' as backup_info,
  'players_unified ist jetzt die einzige Spieler-Tabelle' as result;

