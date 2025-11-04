-- ============================================
-- UPDATE MATCHDAYS WITH VENUE INFO
-- ============================================
-- Verknüpft existierende matchdays mit venues und court_numbers
-- Basierend auf TVM Spielplan-Daten
-- ============================================

/*
PLATZ-NOTATION:
---------------
TVM zeigt "1+4" = bedeutet Plätze 1,2,3,4 (NICHT nur 1 und 4!)
TVM zeigt "3+4" = bedeutet Plätze 3,4
TVM zeigt "14+15" = bedeutet Plätze 14,15

SPEICHERUNG:
------------
matchdays.court_number = INTEGER (nur ein Wert möglich)
→ Wir speichern den ERSTEN Platz als Referenz
→ Wichtig bei gemischten Belägen (z.B. Marienburger SC Platz 14-15 = ASCHE!)
*/

DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_venue_id UUID;
  v_court_num INTEGER;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 UPDATE MATCHDAYS MIT VENUE INFO';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PLATZ-NOTATION: "1+4" = Plätze 1-4, "3+4" = Plätze 3-4';
  RAISE NOTICE '💾 Speichern: Nur ersten Platz als court_number';
  RAISE NOTICE '';
  
  -- ====================================
  -- MAPPING: VENUE-NAME → VENUE-ID
  -- ====================================
  
  -- TG Leverkusen → Plätze 1+4 (wir nehmen den ersten)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%TG Leverkusen%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TG Leverkusen%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ TG Leverkusen: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- TC Ford Köln → Plätze 1+2
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%TC Ford Köln%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TC Ford%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ TC Ford Köln: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- Tennishalle Köln-Rath → Plätze 3+4
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Tennishalle Köln-Rath%' OR name ILIKE '%Rath%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3
    WHERE venue ILIKE '%Rath%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Tennishalle Köln-Rath: % matches updated (Platz 3)', v_updated_count;
  END IF;
  
  -- Marienburger SC → Plätze 14+15 (Asche!)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Marienburger%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 14
    WHERE venue ILIKE '%Marienburger%' 
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Marienburger SC: % matches updated (Platz 14 - ASCHE!)', v_updated_count;
  END IF;
  
  -- KTC 71 / Kölner TC'71 → Plätze 3+4
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%KTC%71%' OR name ILIKE '%Kölner TC%71%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 3
    WHERE (venue ILIKE '%KTC 71%' OR venue ILIKE '%Kölner TC%71%')
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ KTC 71: % matches updated (Platz 3)', v_updated_count;
  END IF;
  
  -- ====================================
  -- WEITERE HÄUFIGE VENUES
  -- ====================================
  
  -- RTHC Bayer Leverkusen / TH Schloß Morsbroich
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Schloß Morsbroich%' OR name ILIKE '%RTHC%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE (venue ILIKE '%Morsbroich%' OR venue ILIKE '%RTHC%')
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ RTHC Bayer/Morsbroich: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- Kölner THC Stadion RW
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Stadion Rot-Weiß%' OR name ILIKE '%Stadion RW%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%Stadion%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Kölner THC Stadion RW: % matches updated (Platz 1 - LAYKOLD!)', v_updated_count;
  END IF;
  
  -- TV Dellbrück
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Dellbrück%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%Dellbrück%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ TV Dellbrück: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- Cologne Sportspark Poll
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Cologne Sportspark%' OR name ILIKE '%Sportspark%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%Sportspark%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Cologne Sportspark: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- Bonner THV
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%Bonner THV%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%Bonner THV%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Bonner THV: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- TC Rath (andere Schreibweise)
  SELECT id INTO v_venue_id FROM venues WHERE name ILIKE '%TC Rath%' AND name NOT ILIKE '%Refrath%' LIMIT 1;
  IF v_venue_id IS NOT NULL THEN
    UPDATE matchdays 
    SET venue_id = v_venue_id, court_number = 1
    WHERE venue ILIKE '%TC Rath%' AND venue NOT ILIKE '%Refrath%'
      AND venue_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ TC Rath: % matches updated (Platz 1)', v_updated_count;
  END IF;
  
  -- TC Colonius (falls nicht in DB, generisches Mapping)
  -- TV Ensen Westhoven (falls nicht in DB, generisches Mapping)
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ UPDATE ABGESCHLOSSEN!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: VENUE ASSIGNMENTS
-- ====================================

SELECT 
  '📊 MATCHDAYS MIT VENUE INFO' as info,
  COUNT(*) as total_matchdays,
  COUNT(*) FILTER (WHERE venue_id IS NOT NULL) as with_venue,
  COUNT(*) FILTER (WHERE venue_id IS NULL) as without_venue,
  COUNT(*) FILTER (WHERE court_number IS NOT NULL) as with_court_number
FROM matchdays;

-- ====================================
-- VERIFICATION: TOP VENUES
-- ====================================

SELECT 
  '🏟️ TOP VENUES' as info,
  v.name,
  v.city,
  COUNT(m.id) as match_count,
  ARRAY_AGG(DISTINCT m.court_number ORDER BY m.court_number) as used_courts
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
GROUP BY v.id, v.name, v.city
ORDER BY match_count DESC
LIMIT 10;

-- ====================================
-- VERIFICATION: BEISPIEL SHOE RECOMMENDATIONS
-- ====================================

SELECT 
  '👟 BEISPIEL SHOE RECOMMENDATIONS' as info,
  m.match_date,
  t_home.team_name || ' vs ' || t_away.team_name as match,
  v.name as venue,
  m.court_number,
  st.name as surface,
  st.icon_emoji,
  st.shoe_recommendation
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
JOIN surface_types st ON st.id = vc.surface_type_id
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
WHERE m.venue_id IS NOT NULL 
  AND m.court_number IS NOT NULL
ORDER BY m.match_date
LIMIT 10;

-- ====================================
-- VERIFICATION: MATCHES OHNE VENUE
-- ====================================

SELECT 
  '⚠️ MATCHES OHNE VENUE' as info,
  m.match_date,
  m.venue,
  t_home.team_name as home_team,
  t_away.team_name as away_team
FROM matchdays m
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
WHERE m.venue_id IS NULL
ORDER BY m.match_date
LIMIT 20;

