-- ================================================================
-- LÖSCHE NICHT MEHR GEBRAUCHTE TABELLEN
-- ================================================================
-- Ziel: Nur die essentiellen Tabellen behalten
-- ================================================================

-- =====================================================
-- SCHRITT 1: Zeige alle aktuellen Tabellen
-- =====================================================
SELECT 
  '📋 Aktuelle Tabellen:' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- =====================================================
-- SCHRITT 2: Lösche redundante Tabellen/Views
-- =====================================================

-- Lösche player_profiles (leer, redundant)
DROP TABLE IF EXISTS player_profiles CASCADE;
SELECT '✅ player_profiles gelöscht' as status;

-- Lösche public_player_profiles (redundant)
DROP VIEW IF EXISTS public_player_profiles CASCADE;
SELECT '✅ public_player_profiles gelöscht' as status;

-- Lösche player_teams_with_club (komplex, unnötig)
DROP VIEW IF EXISTS player_teams_with_club CASCADE;
SELECT '✅ player_teams_with_club gelöscht' as status;

-- =====================================================
-- SCHRITT 3: Prüfe ob weitere Tabellen gelöscht werden können
-- =====================================================

-- Prüfe club_info (falls leer oder redundant)
SELECT 
  '🏢 club_info Status:' as info,
  COUNT(*) as anzahl_clubs
FROM club_info;

-- Prüfe team_seasons (falls leer oder redundant)
SELECT 
  '📅 team_seasons Status:' as info,
  COUNT(*) as anzahl_seasons
FROM team_seasons;

-- Prüfe league_standings (falls leer oder redundant)
SELECT 
  '🏆 league_standings Status:' as info,
  COUNT(*) as anzahl_standings
FROM league_standings;

-- =====================================================
-- SCHRITT 4: Zeige finale Tabellen-Struktur
-- =====================================================
SELECT 
  '📋 Finale Tabellen:' as info,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- =====================================================
-- SCHRITT 5: Prüfe players Tabelle
-- =====================================================
SELECT 
  '👥 Players Tabelle:' as info,
  COUNT(*) as total_players,
  COUNT(current_lk) as players_with_current_lk,
  COUNT(season_start_lk) as players_with_season_lk
FROM players;

-- =====================================================
-- ERFOLG
-- =====================================================
SELECT '✅ Cleanup abgeschlossen!' as status;
