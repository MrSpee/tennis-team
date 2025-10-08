-- ============================================
-- MIGRATION_PHASE_3_CREATE_VIEWS.sql
-- Phase 3: Views für Rückwärts-Kompatibilität
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 MIGRATION PHASE 3: Views erstellen';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- 1️⃣ Erstelle View für Rückwärts-Kompatibilität
-- Diese View generiert club_name automatisch aus club_info
CREATE OR REPLACE VIEW team_info_legacy AS
SELECT 
  t.id,
  t.club_id,
  c.name as club_name,  -- ← Automatisch aus club_info generiert
  t.team_name,
  t.category,
  t.region,
  t.tvm_link,
  t.created_at,
  t.updated_at,
  -- Zusätzliche Club-Infos für erweiterte Queries
  c.normalized_name as club_normalized_name,
  c.city as club_city,
  c.region as club_region,
  c.website as club_website,
  c.is_verified as club_is_verified,
  c.data_source as club_data_source
FROM team_info t
LEFT JOIN club_info c ON t.club_id = c.id;

COMMENT ON VIEW team_info_legacy IS 
'Legacy View für Rückwärts-Kompatibilität. Generiert club_name aus club_info.name';

-- 2️⃣ Erstelle View mit vollständigen Club-Details
CREATE OR REPLACE VIEW team_info_with_club AS
SELECT 
  t.id as team_id,
  t.team_name,
  t.category,
  t.region as team_region,
  t.tvm_link,
  t.created_at as team_created_at,
  t.updated_at as team_updated_at,
  -- Club-Informationen
  c.id as club_id,
  c.name as club_name,
  c.normalized_name as club_normalized_name,
  c.city as club_city,
  c.postal_code as club_postal_code,
  c.region as club_region,
  c.state as club_state,
  c.address as club_address,
  c.phone as club_phone,
  c.email as club_email,
  c.website as club_website,
  c.federation as club_federation,
  c.is_verified as club_is_verified,
  c.data_source as club_data_source
FROM team_info t
INNER JOIN club_info c ON t.club_id = c.id;

COMMENT ON VIEW team_info_with_club IS 
'Vollständige Team-Informationen mit allen Club-Details';

-- 3️⃣ Erstelle View für Player-Teams mit Club-Info
CREATE OR REPLACE VIEW player_teams_with_club AS
SELECT 
  pt.id as player_team_id,
  pt.player_id,
  pt.team_id,
  pt.role,
  pt.is_primary,
  pt.created_at as joined_at,
  -- Team-Informationen
  t.team_name,
  t.category,
  t.tvm_link,
  -- Club-Informationen
  c.id as club_id,
  c.name as club_name,
  c.normalized_name as club_normalized_name,
  c.city as club_city,
  c.region as club_region,
  c.state as club_state,
  c.website as club_website,
  c.federation as club_federation
FROM player_teams pt
INNER JOIN team_info t ON pt.team_id = t.id
INNER JOIN club_info c ON t.club_id = c.id;

COMMENT ON VIEW player_teams_with_club IS 
'Player-Team-Zuordnungen mit vollständigen Club-Informationen';

-- 4️⃣ Erstelle materialisierte View für Performance (optional)
-- Kann für häufige Abfragen genutzt werden
CREATE MATERIALIZED VIEW IF NOT EXISTS club_stats AS
SELECT 
  c.id as club_id,
  c.name as club_name,
  c.normalized_name,
  c.city,
  c.region,
  c.state,
  c.federation,
  c.is_verified,
  c.data_source,
  COUNT(DISTINCT t.id) as team_count,
  COUNT(DISTINCT pt.player_id) as player_count,
  MAX(t.updated_at) as last_team_update
FROM club_info c
LEFT JOIN team_info t ON t.club_id = c.id
LEFT JOIN player_teams pt ON pt.team_id = t.id
GROUP BY c.id, c.name, c.normalized_name, c.city, c.region, c.state, c.federation, c.is_verified, c.data_source;

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_stats_club_id ON club_stats(club_id);

COMMENT ON MATERIALIZED VIEW club_stats IS 
'Aggregierte Statistiken pro Club (Team- und Spieler-Anzahl)';

-- Funktion zum Refresh der Materialized View
CREATE OR REPLACE FUNCTION refresh_club_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY club_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_club_stats IS 
'Aktualisiert die club_stats Materialized View';

-- 5️⃣ Zusammenfassung
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Views erfolgreich erstellt:';
  RAISE NOTICE '   1. team_info_legacy (Rückwärts-Kompatibilität)';
  RAISE NOTICE '   2. team_info_with_club (Vollständige Details)';
  RAISE NOTICE '   3. player_teams_with_club (Player-Teams mit Club)';
  RAISE NOTICE '   4. club_stats (Aggregierte Statistiken)';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Verwendung:';
  RAISE NOTICE '   -- Alt (deprecated):';
  RAISE NOTICE '   SELECT * FROM team_info WHERE club_name = ''TC Köln'';';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Neu (empfohlen):';
  RAISE NOTICE '   SELECT * FROM team_info_with_club WHERE club_name = ''TC Köln'';';
  RAISE NOTICE '';
  RAISE NOTICE '   -- View refreshen:';
  RAISE NOTICE '   SELECT refresh_club_stats();';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Nächster Schritt: Code-Anpassungen (Frontend)';
  RAISE NOTICE '';
END $$;

-- Test: Zeige einige Beispiel-Daten aus den Views
SELECT 
  'team_info_legacy' as view_name,
  COUNT(*) as row_count
FROM team_info_legacy
UNION ALL
SELECT 
  'team_info_with_club',
  COUNT(*)
FROM team_info_with_club
UNION ALL
SELECT 
  'player_teams_with_club',
  COUNT(*)
FROM player_teams_with_club
UNION ALL
SELECT 
  'club_stats',
  COUNT(*)
FROM club_stats;

-- Zeige Top 5 Clubs nach Spieler-Anzahl
SELECT 
  club_name,
  city,
  team_count,
  player_count,
  is_verified,
  data_source
FROM club_stats
ORDER BY player_count DESC
LIMIT 5;

