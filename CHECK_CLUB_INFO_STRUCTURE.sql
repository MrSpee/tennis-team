-- ============================================
-- CHECK_CLUB_INFO_STRUCTURE.sql
-- Überprüfe die aktuelle Struktur der club_info Tabelle
-- ============================================

-- Zeige alle Spalten der club_info Tabelle
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'club_info'
ORDER BY ordinal_position;

-- Zeige ein Beispiel-Eintrag
SELECT * FROM club_info LIMIT 1;

