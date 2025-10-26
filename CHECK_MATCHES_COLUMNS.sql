-- CHECK_MATCHES_COLUMNS.sql
-- Analysiert die Spalten der matches Tabelle

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'matches'
  AND table_schema = 'public'
ORDER BY ordinal_position;
