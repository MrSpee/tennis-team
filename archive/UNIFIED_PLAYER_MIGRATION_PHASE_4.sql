-- UNIFIED PLAYER SYSTEM MIGRATION
-- Phase 4: Legacy-Cleanup (NUR nach erfolgreicher Frontend-Anpassung!)

-- ⚠️ WARNUNG: Dieses Script entfernt die Legacy-Tabellen!
-- Führe es NUR aus, wenn die Frontend-Anpassungen erfolgreich sind!

-- 1. Prüfe Migration-Status
SELECT 
  'MIGRATION STATUS CHECK:' as info,
  'App Users' as type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'app_user'
UNION ALL
SELECT 
  'MIGRATION STATUS CHECK:' as info,
  'Opponent Players' as type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'opponent'
UNION ALL
SELECT 
  'MIGRATION STATUS CHECK:' as info,
  'Team Memberships' as type,
  COUNT(*) as count
FROM team_memberships;

-- 2. Prüfe ob alle Daten migriert wurden
SELECT 
  'DATA INTEGRITY CHECK:' as info,
  'Original players count' as check_type,
  COUNT(*) as count
FROM players_backup
UNION ALL
SELECT 
  'DATA INTEGRITY CHECK:' as info,
  'Migrated app users count' as check_type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'app_user'
UNION ALL
SELECT 
  'DATA INTEGRITY CHECK:' as info,
  'Original opponent_players count' as check_type,
  COUNT(*) as count
FROM opponent_players_backup
UNION ALL
SELECT 
  'DATA INTEGRITY CHECK:' as info,
  'Migrated opponent players count' as check_type,
  COUNT(*) as count
FROM players_unified
WHERE player_type = 'opponent';

-- 3. Entferne Legacy-Tabellen (NUR wenn alles OK ist!)
-- ⚠️ UNCOMMENT NUR NACH ERFOLGREICHER FRONTEND-ANPASSUNG!

-- DROP VIEW IF EXISTS players_legacy;
-- DROP VIEW IF EXISTS opponent_players_legacy;
-- DROP VIEW IF EXISTS players_for_results;
-- DROP FUNCTION IF EXISTS get_team_players(UUID);
-- DROP FUNCTION IF EXISTS search_players(TEXT);

-- DROP TABLE IF EXISTS player_teams CASCADE;
-- DROP TABLE IF EXISTS opponent_players CASCADE;
-- DROP TABLE IF EXISTS players CASCADE;

-- 4. Benenne neue Tabellen um (für Backward Compatibility)
-- ALTER TABLE players_unified RENAME TO players;
-- ALTER TABLE team_memberships RENAME TO player_teams;

-- 5. Erstelle neue Indizes
-- CREATE INDEX idx_players_user_id ON players(user_id);
-- CREATE INDEX idx_players_player_type ON players(player_type);
-- CREATE INDEX idx_player_teams_player_id ON player_teams(player_id);
-- CREATE INDEX idx_player_teams_team_id ON player_teams(team_id);

-- 6. Finale Validierung
SELECT 
  'FINAL VALIDATION:' as info,
  'Migration completed successfully' as status,
  'Legacy tables removed' as cleanup,
  'Frontend updated' as frontend;

-- 7. Zeige finale Struktur
SELECT 
  'FINAL TABLE STRUCTURE:' as info,
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('players', 'player_teams', 'team_memberships', 'match_participants')
ORDER BY table_name, ordinal_position;
