-- ================================================================
-- EINFACHES DATABASE CLEANUP
-- ================================================================
-- Ziel: Nur players Tabelle behalten, alles andere löschen
-- ================================================================

-- =====================================================
-- SCHRITT 1: Lösche redundante Tabellen/Views
-- =====================================================

-- Lösche player_profiles (leer)
DROP TABLE IF EXISTS player_profiles CASCADE;

-- Lösche public_player_profiles (redundant)
DROP VIEW IF EXISTS public_player_profiles CASCADE;

-- Lösche player_teams_with_club View (falls vorhanden)  
DROP VIEW IF EXISTS player_teams_with_club CASCADE;

-- =====================================================
-- SCHRITT 2: Stelle player_teams als Tabelle sicher
-- =====================================================

-- Erstelle player_teams Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS player_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES team_info(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  role VARCHAR(50) DEFAULT 'player',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, team_id)
);

-- Erstelle Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_player_teams_player_id ON player_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_team_id ON player_teams(team_id);

-- =====================================================
-- SCHRITT 3: Prüfe finale Struktur
-- =====================================================

-- Zeige alle verbleibenden Tabellen
SELECT 
  '📋 Tabellen' as typ,
  table_name as name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Zeige alle verbleibenden Views
SELECT 
  '👁️ Views' as typ,
  table_name as name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- SCHRITT 4: Prüfe players Tabelle
-- =====================================================

-- Zeige Spalten der players Tabelle
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'players'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Zeige Anzahl Spieler
SELECT 
  COUNT(*) as total_players,
  COUNT(current_lk) as players_with_current_lk,
  COUNT(season_start_lk) as players_with_season_lk
FROM players;

-- =====================================================
-- ERFOLG
-- =====================================================

SELECT '✅ Database Cleanup abgeschlossen!' as status;
