-- ANALYSE: Daten-Mengen für Migration
-- Verstehe die Größe der zu migrierenden Daten

-- 1. Zähle alle Spieler-Typen
SELECT 
  'PLAYER COUNTS:' as info,
  'App Users (players)' as type,
  COUNT(*) as count
FROM players
UNION ALL
SELECT 
  'PLAYER COUNTS:' as info,
  'Team Memberships (player_teams)' as type,
  COUNT(*) as count
FROM player_teams
UNION ALL
SELECT 
  'PLAYER COUNTS:' as info,
  'Opponent Players (opponent_players)' as type,
  COUNT(*) as count
FROM opponent_players
UNION ALL
SELECT 
  'PLAYER COUNTS:' as info,
  'Opponent Teams (opponent_teams)' as type,
  COUNT(*) as count
FROM opponent_teams;

-- 2. Analysiere App-User Details
SELECT 
  'APP USERS ANALYSIS:' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_auth,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_auth,
  COUNT(CASE WHEN current_lk IS NOT NULL THEN 1 END) as with_lk,
  COUNT(CASE WHEN current_lk IS NULL THEN 1 END) as without_lk,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
FROM players;

-- 3. Analysiere Team-Zuordnungen
SELECT 
  'TEAM MEMBERSHIPS ANALYSIS:' as info,
  COUNT(*) as total_memberships,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT team_id) as unique_teams,
  COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_teams,
  COUNT(CASE WHEN is_primary = false THEN 1 END) as secondary_teams
FROM player_teams;

-- 4. Analysiere Gegner-Spieler
SELECT 
  'OPPONENT PLAYERS ANALYSIS:' as info,
  COUNT(*) as total_opponents,
  COUNT(CASE WHEN lk IS NOT NULL THEN 1 END) as with_lk,
  COUNT(CASE WHEN lk IS NULL THEN 1 END) as without_lk,
  COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as with_name,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as without_name
FROM opponent_players;

-- 5. Analysiere Match-Referenzen
SELECT 
  'MATCH REFERENCES ANALYSIS:' as info,
  'Matches' as table_name,
  COUNT(*) as count
FROM matches
UNION ALL
SELECT 
  'MATCH REFERENCES ANALYSIS:' as info,
  'Match Results' as table_name,
  COUNT(*) as count
FROM match_results;

-- 6. Prüfe auf Duplikate zwischen Tabellen
SELECT 
  'DUPLICATE CHECK:' as info,
  'Players with same name as opponents' as check_type,
  COUNT(*) as count
FROM players p
JOIN opponent_players op ON LOWER(p.name) = LOWER(op.name);

-- 7. Prüfe opponent_players Struktur (da email nicht existiert)
SELECT 
  'OPPONENT_PLAYERS COLUMNS:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'opponent_players' 
ORDER BY ordinal_position;
