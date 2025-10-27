-- Prüfe aktuelle Struktur der matches Tabelle
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;
