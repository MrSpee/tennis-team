-- Prüfe exakte Spaltennamen in team_info
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_info'
  AND table_schema = 'public'
ORDER BY ordinal_position;
