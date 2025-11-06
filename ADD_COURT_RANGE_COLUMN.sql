-- ============================================
-- ADD COURT RANGE COLUMN
-- ============================================
-- Fügt court_number_end hinzu für Platz-Bereiche
-- z.B. "3+4" → court_number=3, court_number_end=4
-- ============================================

-- Füge Spalte hinzu
ALTER TABLE matchdays 
ADD COLUMN IF NOT EXISTS court_number_end INTEGER;

-- Kommentar
COMMENT ON COLUMN matchdays.court_number_end IS 'End of court range for matches using multiple courts (e.g. courts 3-4)';

-- Zeige aktuellen Status
SELECT 
  '✅ SPALTE HINZUGEFÜGT' as info,
  COUNT(*) as total_matchdays,
  COUNT(court_number) as has_court_start,
  COUNT(court_number_end) as has_court_end
FROM matchdays;





