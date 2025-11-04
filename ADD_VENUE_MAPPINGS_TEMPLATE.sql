-- ============================================
-- TEMPLATE: NEUE VENUE MAPPINGS HINZUFÜGEN
-- ============================================
-- Kopiere dieses Template und füge deine Venues ein
-- ============================================

DO $$
DECLARE
  v_venue_id UUID;
  v_updated_count INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 FÜGE NEUE VENUE MAPPINGS HINZU';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- BEISPIEL 1: Einfaches Mapping (Platz 1)
  -- ====================================
  /*
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%VENUE_NAME%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TVM_VENUE_TEXT%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ VENUE_NAME: % matches updated (Platz 1)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ VENUE_NAME nicht in DB gefunden!';
  END IF;
  */
  
  -- ====================================
  -- BEISPIEL 2: Spezifischer Platz (z.B. Platz 3)
  -- ====================================
  /*
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%VENUE_NAME%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3  -- ⚠️ Anpassen!
    WHERE venue ILIKE '%TVM_VENUE_TEXT%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ VENUE_NAME: % matches updated (Platz 3)', v_updated_count;
  ELSE
    RAISE NOTICE '❌ VENUE_NAME nicht in DB gefunden!';
  END IF;
  */
  
  -- ====================================
  -- BEISPIEL 3: Venue mit VNR (eindeutig!)
  -- ====================================
  /*
  SELECT id INTO v_venue_id FROM venues WHERE vnr = '6204' LIMIT 1;  -- ⚠️ VNR anpassen!
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TVM_VENUE_TEXT%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ VENUE (VNR 6204): % matches updated', v_updated_count;
  ELSE
    RAISE NOTICE '❌ VNR 6204 nicht in DB gefunden!';
  END IF;
  */
  
  -- ====================================
  -- FÜGE HIER DEINE MAPPINGS EIN ⬇️
  -- ====================================
  
  -- Beispiel: TC Colonius (falls in DB vorhanden)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Colonius%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3
    WHERE venue ILIKE '%Colonius%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ TC Colonius: % matches updated (Platz 3)', v_updated_count;
  ELSE
    RAISE NOTICE '⚠️ TC Colonius nicht in DB - muss angelegt werden!';
  END IF;
  
  -- Beispiel: TV Ensen Westhoven (falls in DB vorhanden)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Ensen%' OR name ILIKE '%Westhoven%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE (venue ILIKE '%Ensen%' OR venue ILIKE '%Westhoven%')
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ TV Ensen Westhoven: % matches updated (Platz 1)', v_updated_count;
  ELSE
    RAISE NOTICE '⚠️ TV Ensen Westhoven nicht in DB - muss angelegt werden!';
  END IF;
  
  -- Beispiel: SV RG Sürth (falls in DB vorhanden)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Sürth%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%Sürth%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE '✅ SV RG Sürth: % matches updated (Platz 1)', v_updated_count;
  ELSE
    RAISE NOTICE '⚠️ SV RG Sürth nicht in DB - muss angelegt werden!';
  END IF;
  
  -- ====================================
  -- FÜGE WEITERE MAPPINGS HIER EIN ⬆️
  -- ====================================
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ TOTAL: % matches updated', v_total_updated;
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION
-- ====================================

SELECT 
  '📊 AKTUELLER STATUS' as info,
  COUNT(*) as total_matchdays,
  COUNT(*) FILTER (WHERE venue_id IS NOT NULL) as mapped,
  COUNT(*) FILTER (WHERE venue_id IS NULL AND venue IS NOT NULL) as unmapped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE venue_id IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as percent_mapped
FROM matchdays;

-- Noch nicht gemappte Venues anzeigen
SELECT 
  '⚠️ NOCH NICHT GEMAPPT' as info,
  venue,
  COUNT(*) as match_count
FROM matchdays
WHERE venue_id IS NULL 
  AND venue IS NOT NULL
GROUP BY venue
ORDER BY match_count DESC
LIMIT 20;

/*
════════════════════════════════════════════
📝 ANLEITUNG:
════════════════════════════════════════════

1️⃣ UNBEKANNTE VENUES FINDEN:
   → Führe DEBUG_UNKNOWN_VENUES.sql aus
   → Liste der Venues ohne Match

2️⃣ VENUES IN DB PRÜFEN:
   → Sind die Venues bereits in venues Tabelle?
   → Falls JA: Mapping hinzufügen (siehe Beispiele oben)
   → Falls NEIN: Erst in venues einfügen!

3️⃣ PLATZ-NUMMER BESTIMMEN:
   → TVM Notation: "1+4" = Plätze 1-4 → speichere 1
   → TVM Notation: "3+4" = Plätze 3-4 → speichere 3
   → TVM Notation: "14+15" = Plätze 14-15 → speichere 14

4️⃣ MAPPING PATTERN:
   SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%NAME%';
   UPDATE matchdays SET venue_id = v_venue_id, court_number = X
   WHERE venue ILIKE '%TVM_TEXT%' AND venue_id IS NULL;

5️⃣ WICHTIG BEI GEMISCHTEN BELÄGEN:
   → Marienburger SC Platz 14-15 = ASCHE (nicht Teppich!)
   → Court_number muss exakt sein für Schuhempfehlung!

6️⃣ SCRIPT AUSFÜHREN:
   psql -d <database> -f ADD_VENUE_MAPPINGS_TEMPLATE.sql

════════════════════════════════════════════
*/

