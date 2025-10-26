-- ANALYSE: Aktuelle Tabellen-Strukturen für Migration
-- Sammle alle relevanten Informationen für die Migration

-- 1. Aktuelle players Tabelle Struktur
SELECT 
  'PLAYERS TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position;

-- 2. Aktuelle player_teams Tabelle Struktur
SELECT 
  'PLAYER_TEAMS TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'player_teams' 
ORDER BY ordinal_position;

-- 3. Aktuelle opponent_players Tabelle Struktur
SELECT 
  'OPPONENT_PLAYERS TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'opponent_players' 
ORDER BY ordinal_position;

-- 4. Aktuelle opponent_teams Tabelle Struktur (falls vorhanden)
SELECT 
  'OPPONENT_TEAMS TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'opponent_teams' 
ORDER BY ordinal_position;

-- 5. Aktuelle team_info Tabelle Struktur
SELECT 
  'TEAM_INFO TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'team_info' 
ORDER BY ordinal_position;

-- 6. Aktuelle matches Tabelle Struktur (für Referenzen)
SELECT 
  'MATCHES TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'matches' 
ORDER BY ordinal_position;

-- 7. Aktuelle match_results Tabelle Struktur (für Referenzen)
SELECT 
  'MATCH_RESULTS TABLE STRUCTURE:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'match_results' 
ORDER BY ordinal_position;

-- 8. Foreign Key Constraints analysieren
SELECT 
  'FOREIGN KEY CONSTRAINTS:' as info,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('players', 'player_teams', 'opponent_players', 'opponent_teams', 'team_info', 'matches', 'match_results')
ORDER BY tc.table_name, tc.constraint_name;
