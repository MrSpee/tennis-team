-- Check if is_super_admin column exists in players_unified
-- =========================================================

-- 1. List all columns in players_unified
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'players_unified'
ORDER BY ordinal_position;

