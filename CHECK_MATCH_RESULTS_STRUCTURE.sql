-- Prüfe aktuelle Struktur der match_results Tabelle
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'match_results'
ORDER BY ordinal_position;
