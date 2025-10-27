-- Prüfe ob tvm_id_number Spalte existiert
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'players_unified'
AND column_name = 'tvm_id_number';

