-- ANALYSIERE DATENBANKSTRUKTUR
-- =============================

-- 1. Welche Spalten hat die 'matches' Tabelle?
SELECT 'matches' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- 2. Welche Spalten hat die 'team_info' Tabelle?
SELECT 'team_info' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;

-- 3. Welche Spalten hat die 'team_memberships' Tabelle?
SELECT 'team_memberships' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_memberships'
ORDER BY ordinal_position;

-- 4. Welche Spalten hat die 'players_unified' Tabelle?
SELECT 'players_unified' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players_unified'
ORDER BY ordinal_position;
