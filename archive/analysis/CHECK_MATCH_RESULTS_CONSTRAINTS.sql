-- Prüfe Constraints auf match_results
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    string_agg(a.attname, ', ' ORDER BY a.attnum) AS columns
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS c(attnum, ord) ON true
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = c.attnum
WHERE rel.relname = 'match_results'
GROUP BY con.conname, con.contype
ORDER BY con.contype DESC;

-- Zeige auch Tabellenstruktur
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'match_results'
ORDER BY ordinal_position;

