-- ============================================
-- MATCHDAYS COURT-SPALTEN ÜBERSICHT
-- ============================================
-- Zeigt alle Court-relevanten Spalten in matchdays
-- ============================================

-- 1️⃣ Zeige alle Spalten der matchdays Tabelle
SELECT 
  '📋 ALLE MATCHDAYS SPALTEN' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'matchdays'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2️⃣ Zeige nur Court-relevante Spalten
SELECT 
  '🎾 COURT-RELEVANTE SPALTEN' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'matchdays'
  AND table_schema = 'public'
  AND (column_name LIKE '%court%' OR column_name LIKE '%venue%')
ORDER BY column_name;

-- 3️⃣ Zeige Beispiel-Daten mit Court-Informationen
SELECT 
  '📊 BEISPIEL MATCHDAYS MIT COURTS' as info,
  id,
  match_date,
  venue,
  venue_id,
  court_number,
  court_number_end,
  season
FROM matchdays
WHERE court_number IS NOT NULL
   OR court_number_end IS NOT NULL
   OR venue IS NOT NULL
LIMIT 10;

-- 4️⃣ Statistik: Wie viele Matches haben Court-Infos?
SELECT 
  '📈 COURT DATEN STATISTIK' as info,
  COUNT(*) as total_matchdays,
  COUNT(venue) as has_venue_text,
  COUNT(venue_id) as has_venue_id,
  COUNT(court_number) as has_court_number,
  COUNT(court_number_end) as has_court_end,
  COUNT(*) FILTER (WHERE court_number IS NOT NULL AND court_number_end IS NOT NULL) as has_court_range
FROM matchdays;

