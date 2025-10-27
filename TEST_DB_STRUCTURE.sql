-- ==========================================
-- EINFACHER TEST: DATENBANK-STRUKTUR CHECK
-- ==========================================
-- Führe zuerst nur diese 3 Queries aus!

-- 1. Welche Spalten hat players_unified?
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'players_unified'
ORDER BY ordinal_position;

-- 2. Gibt es club_id in team_info?
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'team_info'
AND column_name = 'club_id';

-- 3. Welche Vereine gibt es?
SELECT DISTINCT club_name, COUNT(*) as teams
FROM team_info
WHERE club_name IS NOT NULL
GROUP BY club_name
ORDER BY club_name;

