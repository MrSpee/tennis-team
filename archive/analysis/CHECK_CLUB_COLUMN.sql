-- Prüfe ob club_id Spalte in players_unified existiert
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'players_unified'
AND column_name LIKE '%club%'
ORDER BY column_name;

