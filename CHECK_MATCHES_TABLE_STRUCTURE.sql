-- CHECK MATCHES TABLE STRUCTURE
-- Schaue dir die tatsächliche Struktur der matches Tabelle an

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
ORDER BY ordinal_position;
