-- ============================================
-- FIX COURT NUMBERS
-- ============================================
-- Korrigiert court_numbers basierend auf spezifischen TVM-Daten
-- Nutze dies NACH FINAL_VENUE_MAPPING.sql
-- ============================================

-- ANLEITUNG:
-- 1. Schaue im TVM Spielplan nach der Platz-Angabe
-- 2. Wenn "14+15" → setze court_number = 14
-- 3. Wenn "3+4" → setze court_number = 3
-- 4. usw.

DO $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 KORRIGIERE COURT NUMBERS';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- BEISPIEL: Marienburger SC Platz 14-15
  -- ====================================
  
  -- Falls du weißt, dass bestimmte Matches auf Platz 14+15 sind:
  /*
  UPDATE matchdays m
  SET court_number = 14
  FROM venues v
  WHERE m.venue_id = v.id
    AND v.name ILIKE '%Marienburger%'
    AND m.match_date = '2026-03-07'  -- Anpassen!
    AND m.court_number = 1;
  */
  
  -- ====================================
  -- BEISPIEL: KTC 71 Platz 3+4
  -- ====================================
  
  -- Falls KTC 71 Matches auf Platz 3+4:
  /*
  UPDATE matchdays m
  SET court_number = 3
  FROM venues v
  WHERE m.venue_id = v.id
    AND v.name ILIKE '%KTC%71%'
    AND m.court_number = 1;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ KTC 71: % matches updated to court 3', v_updated;
  */
  
  -- ====================================
  -- GLOBAL: Alle Tennishalle Köln-Rath auf Platz 3
  -- ====================================
  
  UPDATE matchdays m
  SET court_number = 3
  FROM venues v
  WHERE m.venue_id = v.id
    AND v.name ILIKE '%Tennishalle Köln-Rath%'
    AND m.court_number != 3;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ Tennishalle Köln-Rath: % matches updated to court 3', v_updated;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ COURT NUMBERS KORRIGIERT';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- HELPER: Finde Matches die Korrektur brauchen
-- ====================================

SELECT 
  '🔍 MATCHES DIE EVTL. KORREKTUR BRAUCHEN' as info,
  v.name as venue,
  m.match_date,
  m.court_number as current_court,
  t_home.club_name || ' ' || t_home.team_name as home,
  t_away.club_name || ' ' || t_away.team_name as away,
  m.league,
  m.group_name
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
WHERE v.name IN (
  'Marienburger SC',  -- Platz 14-15 = Asche!
  'Kölner THC Stadion Rot-Weiß',  -- Platz 1-2 = Laykold, 4-5 = Asche
  'TH Schloß Morsbroich'  -- Platz 1-4 = Teppich, 5-6 = Laykold
)
ORDER BY v.name, m.match_date;

-- ====================================
-- TEMPLATE FÜR BATCH-UPDATE
-- ====================================

/*
-- TEMPLATE: Update basierend auf Gruppe + Datum
UPDATE matchdays m
SET court_number = 14  -- ⚠️ Anpassen!
FROM venues v
WHERE m.venue_id = v.id
  AND v.name ILIKE '%Marienburger%'
  AND m.group_name = 'Gr. 046'  -- ⚠️ Anpassen!
  AND m.match_date BETWEEN '2026-03-01' AND '2026-03-31';  -- ⚠️ Anpassen!

-- TEMPLATE: Update für spezifisches Match
UPDATE matchdays 
SET court_number = 14  -- ⚠️ Anpassen!
WHERE id = 'MATCH_UUID_HIER';  -- ⚠️ UUID einfügen!
*/




