-- ============================================
-- EXECUTE VENUE MAPPING WITH COURT NUMBERS
-- ============================================
-- Mappt TVM-Daten zu venues und extrahiert court_numbers
-- Basierend auf Spielplan Gr. 046
-- ============================================

DO $$
DECLARE
  v_venue_id UUID;
  v_updated_count INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 VENUE MAPPING MIT COURT NUMBERS';
  RAISE NOTICE '🔧 Spielplan Gr. 046';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- TG Leverkusen - Platz 1+4 → court_number = 1
  -- ====================================
  
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%TG Leverkusen%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TG Leverkusen%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ TG Leverkusen: % matches updated (Platz 1)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ TG Leverkusen nicht in venues gefunden!';
  END IF;
  
  -- ====================================
  -- KTC 71 - Platz 3+4 → court_number = 3
  -- ====================================
  
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%KTC%71%' OR name ILIKE '%Kölner TC%71%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3
    WHERE venue ILIKE '%KTC 71%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ KTC 71: % matches updated (Platz 3)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ KTC 71 nicht in venues gefunden!';
  END IF;
  
  -- ====================================
  -- TC Ford Köln - Platz 1+2 → court_number = 1
  -- ====================================
  
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%TC Ford%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TC Ford%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ TC Ford Köln: % matches updated (Platz 1)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ TC Ford Köln nicht in venues gefunden!';
  END IF;
  
  -- ====================================
  -- Tennishalle Köln-Rath - Platz 3+4 → court_number = 3
  -- ====================================
  
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Tennishalle Köln-Rath%' OR name ILIKE '%Rath%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3
    WHERE venue ILIKE '%Tennishalle Köln-Rath%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ Tennishalle Köln-Rath: % matches updated (Platz 3)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ Tennishalle Köln-Rath nicht in venues gefunden!';
  END IF;
  
  -- ====================================
  -- Marienburger SC - Platz 14+15 → court_number = 14 (ASCHE!)
  -- ====================================
  
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Marienburger%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 14
    WHERE venue ILIKE '%Marienburger%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ Marienburger SC: % matches updated (Platz 14 - ASCHE!)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ Marienburger SC nicht in venues gefunden!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ TOTAL: % matches updated', v_total_updated;
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: Zeige gemappte Matches
-- ====================================

SELECT 
  '✅ GEMAPPTE MATCHES' as info,
  m.match_date,
  m.venue as original_venue_text,
  v.name as mapped_venue,
  m.court_number,
  st.name as surface_type,
  st.icon_emoji,
  st.shoe_recommendation
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
LEFT JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
LEFT JOIN surface_types st ON st.id = vc.surface_type_id
WHERE m.match_date BETWEEN '2025-10-01' AND '2026-04-01'
ORDER BY m.match_date;

-- ====================================
-- VERIFICATION: Shoe Recommendations verfügbar?
-- ====================================

SELECT 
  '👟 SHOE RECOMMENDATIONS VERFÜGBAR' as info,
  COUNT(*) as total_matches,
  COUNT(*) FILTER (WHERE v.id IS NOT NULL) as has_venue,
  COUNT(*) FILTER (WHERE vc.id IS NOT NULL) as has_court_info,
  COUNT(*) FILTER (WHERE st.shoe_recommendation IS NOT NULL) as has_shoe_rec
FROM matchdays m
LEFT JOIN venues v ON v.id = m.venue_id
LEFT JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
LEFT JOIN surface_types st ON st.id = vc.surface_type_id
WHERE m.match_date BETWEEN '2025-10-01' AND '2026-04-01';

