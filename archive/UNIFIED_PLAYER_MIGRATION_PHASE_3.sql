-- UNIFIED PLAYER SYSTEM MIGRATION
-- Phase 3: Frontend-Anpassungen und Legacy-Cleanup

-- 1. Erstelle temporäre Backup-Tabellen (für Rollback)
CREATE TABLE players_backup AS SELECT * FROM players;
CREATE TABLE player_teams_backup AS SELECT * FROM player_teams;
CREATE TABLE opponent_players_backup AS SELECT * FROM opponent_players;

-- 2. Aktualisiere match_results Referenzen (falls nötig)
-- Prüfe ob match_results player_id Referenzen hat
SELECT 
  'MATCH_RESULTS ANALYSIS:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'match_results' 
  AND column_name LIKE '%player%'
ORDER BY ordinal_position;

-- 3. Erstelle neue Funktionen für Frontend-Kompatibilität
-- Lösche existierende Funktion zuerst
DROP FUNCTION IF EXISTS get_team_players(UUID);
CREATE FUNCTION get_team_players(team_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  current_lk TEXT,
  player_type TEXT,
  role TEXT,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    p.email::TEXT,
    p.current_lk::TEXT,
    p.player_type::TEXT,
    tm.role::TEXT,
    tm.is_primary
  FROM players_unified p
  JOIN team_memberships tm ON p.id = tm.player_id
  WHERE tm.team_id = team_id_param
    AND tm.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 4. Erstelle Funktion für Spieler-Suche (Frontend)
-- Lösche existierende Funktion zuerst
DROP FUNCTION IF EXISTS search_players(TEXT);
CREATE FUNCTION search_players(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  current_lk TEXT,
  player_type TEXT,
  team_name TEXT,
  club_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name::TEXT,
    p.email::TEXT,
    p.current_lk::TEXT,
    p.player_type::TEXT,
    ti.team_name::TEXT,
    ti.club_name::TEXT
  FROM players_unified p
  LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
  LEFT JOIN team_info ti ON tm.team_id = ti.id
  WHERE 
    LOWER(p.name) LIKE LOWER('%' || search_term || '%')
    OR LOWER(p.email) LIKE LOWER('%' || search_term || '%')
    OR LOWER(ti.team_name) LIKE LOWER('%' || search_term || '%')
    OR LOWER(ti.club_name) LIKE LOWER('%' || search_term || '%')
  ORDER BY p.player_type, p.name;
END;
$$ LANGUAGE plpgsql;

-- 5. Erstelle View für Results.jsx Kompatibilität
CREATE OR REPLACE VIEW players_for_results AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.current_lk,
  p.season_start_lk,
  p.ranking,
  NULL as profile_image, -- Feld existiert nicht in players_unified
  p.player_type,
  tm.team_id,
  ti.club_name,
  ti.team_name,
  tm.role,
  tm.is_primary
FROM players_unified p
LEFT JOIN team_memberships tm ON p.id = tm.player_id AND tm.is_active = true
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE p.is_active = true;

-- 6. Teste neue Funktionen
SELECT 
  'TEST: get_team_players' as info,
  id,
  name,
  current_lk,
  player_type,
  role
FROM get_team_players('ff090c47-ff26-4df1-82fd-3e4358320d7f'::UUID) -- Sürth Team
LIMIT 5;

-- 7. Teste Spieler-Suche
SELECT 
  'TEST: search_players' as info,
  id,
  name,
  current_lk,
  player_type,
  team_name,
  club_name
FROM search_players('Chris')
LIMIT 5;

-- 8. Zeige Migration-Status
SELECT 
  'MIGRATION STATUS:' as info,
  'Legacy tables backed up' as status,
  'Ready for frontend update' as next_step;
