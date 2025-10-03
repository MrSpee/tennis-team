-- Spalte "venue" zur matches Tabelle hinzufügen

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS venue TEXT;

-- Prüfe ob Spalte hinzugefügt wurde
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND table_schema = 'public'
ORDER BY ordinal_position;
