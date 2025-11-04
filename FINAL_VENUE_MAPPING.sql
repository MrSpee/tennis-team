-- ============================================
-- FINAL VENUE MAPPING
-- ============================================
-- Mappt alle matchdays zu venues mit korrekten court_numbers
-- Basierend auf automatischer Analyse
-- ============================================

DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 FINAL VENUE MAPPING - AUTOMATISCH';
  RAISE NOTICE '🔧 Extrahiert venue_id + court_number';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- EXAKTE MATCHES (Priority 1)
  -- ====================================
  
  -- Marienburger SC
  -- ⚠️ WICHTIG: Wenn Platz 14+15 im TVM → court_number = 14 (ASCHE!)
  -- ⚠️ Wenn Platz 1-4 im TVM → court_number = 1 (Teppich)
  -- Wir setzen erstmal 1, später manuell anpassen falls Asche-Plätze
  UPDATE matchdays 
  SET venue_id = 'aa285c7e-f7e9-4fc2-9e9b-17ae5520d52b'::uuid, 
      court_number = 1  -- ⚠️ Falls Platz 14+15: Manuell auf 14 ändern!
  WHERE venue ILIKE '%Marienburger SC%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ Marienburger SC: % matches updated', v_updated_count;
  
  -- PadelBox Weiden
  UPDATE matchdays 
  SET venue_id = '59706647-e889-47eb-8cb7-99547efc510c'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%PadelBox Weiden%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ PadelBox Weiden: % matches updated', v_updated_count;
  
  -- TC Bayer Dormagen
  UPDATE matchdays 
  SET venue_id = '845d3385-4962-418d-bc6e-c6a444729e50'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%TC Bayer Dormagen%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ TC Bayer Dormagen: % matches updated', v_updated_count;
  
  -- TC Ford Köln
  -- Typisch: Platz 1+2 → court_number = 1
  UPDATE matchdays 
  SET venue_id = '2fc18121-0f25-4719-9e60-9244868da60e'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%TC Ford Köln%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ TC Ford Köln: % matches updated', v_updated_count;
  
  -- Tennishalle Köln-Rath
  -- Typisch: Platz 3+4 → court_number = 3
  UPDATE matchdays 
  SET venue_id = 'f7b79517-5ff9-4391-8250-5000f8ea72d7'::uuid, 
      court_number = 3  -- ⚠️ Rath nutzt oft Plätze 3+4!
  WHERE venue ILIKE '%Tennishalle Köln-Rath%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ Tennishalle Köln-Rath: % matches updated (Platz 3)', v_updated_count;
  
  -- TG Leverkusen
  -- Typisch: Platz 1+4 → court_number = 1
  UPDATE matchdays 
  SET venue_id = '282d28d0-460b-4c69-b5cd-4b126391e09f'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%TG Leverkusen%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ TG Leverkusen: % matches updated', v_updated_count;
  
  -- TH Schloß Morsbroich (RTHC Bayer)
  UPDATE matchdays 
  SET venue_id = '7a0d9168-de69-47e0-b05e-9e5201c92418'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%TH Schloß Morsbroich%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ TH Schloß Morsbroich: % matches updated', v_updated_count;
  
  -- TV Dellbrück
  UPDATE matchdays 
  SET venue_id = '14428ab9-a879-41bc-8d60-86bb284a7905'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%TV Dellbrück%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ TV Dellbrück: % matches updated', v_updated_count;
  
  -- ====================================
  -- PARTIAL MATCHES (Priority 2-4)
  -- ====================================
  
  -- Cologne Sportspark (Priority 2)
  UPDATE matchdays 
  SET venue_id = '769c6cc3-e4c3-4315-9cdf-f866176d6dc0'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%Cologne Sportspark%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ Cologne Sportspark: % matches updated', v_updated_count;
  
  -- KölnerTHC Stadion RW (Priority 4 - via club_name)
  -- ⚠️ WICHTIG: Gemischte Beläge! Platz 1-2 = Laykold, Platz 4-5 = Asche
  UPDATE matchdays 
  SET venue_id = '83b28af2-ff9f-4ba5-ae47-ceeffbe335e0'::uuid, 
      court_number = 1  -- Laykold (falls Asche-Plätze: 4 oder 5)
  WHERE venue ILIKE '%KölnerTHC Stadion RW%' 
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ KölnerTHC Stadion RW: % matches updated (Platz 1 - LAYKOLD)', v_updated_count;
  
  -- RTHC Bayer Leverkusen (Priority 4 - gemappt zu TH Schloss Morsbroich)
  -- Das ist die zweite Venue mit VNR 6203
  UPDATE matchdays 
  SET venue_id = 'fd500fb0-0c63-43c2-a9b9-38a8b02290d5'::uuid, 
      court_number = 1
  WHERE venue ILIKE '%RTHC Bayer Leverkusen%' 
    AND venue NOT ILIKE '%Schloß Morsbroich%'
    AND venue_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated_count;
  RAISE NOTICE '✅ RTHC Bayer Leverkusen (VNR 6203): % matches updated', v_updated_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ TOTAL: % matches updated', v_total_updated;
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- SPECIAL: Marienburger SC Asche-Plätze
  -- ====================================
  RAISE NOTICE '⚠️ ACHTUNG: Marienburger SC hat GEMISCHTE BELÄGE!';
  RAISE NOTICE '   - Plätze 1-4: Teppich';
  RAISE NOTICE '   - Plätze 14-15: ASCHE';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Wenn ein Match auf Plätzen 14+15 stattfindet,';
  RAISE NOTICE '   muss court_number manuell auf 14 geändert werden!';
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: MAPPING RESULTS
-- ====================================

SELECT 
  '📊 MAPPING RESULTS' as info,
  COUNT(*) as total_matchdays,
  COUNT(*) FILTER (WHERE venue IS NOT NULL) as has_venue_text,
  COUNT(*) FILTER (WHERE venue_id IS NOT NULL) as mapped_count,
  COUNT(*) FILTER (WHERE venue IS NOT NULL AND venue_id IS NULL) as still_unmapped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE venue_id IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE venue IS NOT NULL), 0), 1) as percent_mapped
FROM matchdays;

-- ====================================
-- VERIFICATION: MAPPED VENUES
-- ====================================

SELECT 
  '✅ ERFOLGREICH GEMAPPT' as info,
  v.name as venue,
  v.vnr,
  v.city,
  COUNT(DISTINCT m.court_number) as different_courts_used,
  COUNT(*) as match_count,
  ARRAY_AGG(DISTINCT m.court_number ORDER BY m.court_number) as court_numbers
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
GROUP BY v.id, v.name, v.vnr, v.city
ORDER BY match_count DESC;

-- ====================================
-- VERIFICATION: SHOE RECOMMENDATIONS
-- ====================================

SELECT 
  '👟 SHOE RECOMMENDATIONS (Beispiele)' as info,
  m.match_date,
  v.name as venue,
  m.court_number as platz,
  st.name as belag,
  st.icon_emoji,
  st.shoe_recommendation,
  t_home.club_name || ' ' || t_home.team_name || ' vs ' || 
  t_away.club_name || ' ' || t_away.team_name as match
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
JOIN surface_types st ON st.id = vc.surface_type_id
LEFT JOIN team_info t_home ON t_home.id = m.home_team_id
LEFT JOIN team_info t_away ON t_away.id = m.away_team_id
WHERE m.match_date >= CURRENT_DATE
ORDER BY m.match_date
LIMIT 20;

-- ====================================
-- WARNUNG: Noch nicht gemappte Matches
-- ====================================

SELECT 
  '⚠️ NOCH NICHT GEMAPPT' as info,
  m.venue,
  COUNT(*) as match_count
FROM matchdays m
WHERE m.venue IS NOT NULL 
  AND m.venue_id IS NULL
GROUP BY m.venue
ORDER BY match_count DESC;

-- ====================================
-- SPECIAL CHECK: Marienburger SC
-- ====================================

SELECT 
  '🔍 MARIENBURGER SC CHECK' as info,
  m.match_date,
  m.venue as original_text,
  m.court_number as assigned_court,
  st.name as surface_will_be,
  st.shoe_recommendation,
  CASE 
    WHEN m.court_number BETWEEN 1 AND 4 THEN '✅ Teppich (OK)'
    WHEN m.court_number IN (14, 15) THEN '⚠️ ASCHE (korrekt wenn TVM 14+15 zeigt)'
    ELSE '❓ Unbekannt'
  END as court_status
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
LEFT JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = m.court_number
LEFT JOIN surface_types st ON st.id = vc.surface_type_id
WHERE v.name ILIKE '%Marienburger%'
ORDER BY m.match_date;

