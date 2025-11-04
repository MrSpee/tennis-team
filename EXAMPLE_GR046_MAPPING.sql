-- ============================================
-- BEISPIEL: Gr. 046 VENUE MAPPING
-- ============================================
-- Zeigt wie TVM-Daten in unsere DB gemappt werden
-- Basierend auf deinem Beispiel-Spielplan
-- ============================================

/*
ORIGINAL TVM DATA (Gr. 046):
-----------------------------
570: TG Leverkusen, Platz 1+4  (= Plätze 1,2,3,4)
571: TG Leverkusen, Platz 1+4
572: KTC 71, Platz 3+4          (= Plätze 3,4)
573: TC Ford Köln, Platz 1+2    (= Plätze 1,2)
574: Tennishalle Köln-Rath, Platz 3+4
575: TC Ford Köln, Platz 1+2
576: Tennishalle Köln-Rath, Platz 3+4
577: Marienburger SC, Platz 14+15  (= Plätze 14,15 - ASCHE!)
578: Marienburger SC, Platz 14+15
579: KTC 71, Platz 3+4
*/

-- ====================================
-- 1. VENUES IN UNSERER DB PRÜFEN
-- ====================================

SELECT 
  '✅ VENUES AUS BEISPIEL IN DB' as info,
  v.name,
  v.vnr,
  v.city,
  v.court_count,
  v.club_name,
  (SELECT COUNT(*) FROM matchdays WHERE venue ILIKE '%' || v.name || '%') as matches_in_db
FROM venues v
WHERE 
  v.name ILIKE '%TG Leverkusen%' OR
  v.name ILIKE '%KTC%71%' OR
  v.name ILIKE '%TC Ford%' OR
  v.name ILIKE '%Rath%' OR
  v.name ILIKE '%Marienburger%'
ORDER BY v.name;

-- ====================================
-- 2. SURFACE TYPES FÜR DIESE VENUES
-- ====================================

SELECT 
  '🎾 BELÄGE DER VENUES' as info,
  v.name as venue,
  vc.court_number as platz,
  st.name as belag,
  st.icon_emoji,
  st.shoe_recommendation
FROM venues v
JOIN venue_courts vc ON vc.venue_id = v.id
JOIN surface_types st ON st.id = vc.surface_type_id
WHERE 
  v.name ILIKE '%TG Leverkusen%' OR
  v.name ILIKE '%KTC%71%' OR
  v.name ILIKE '%TC Ford%' OR
  v.name ILIKE '%Tennishalle Köln-Rath%' OR
  v.name ILIKE '%Marienburger%'
ORDER BY v.name, vc.court_number;

-- ====================================
-- 3. MAPPING-VORSCHLAG FÜR GR. 046
-- ====================================

WITH mapping_example AS (
  SELECT 
    '570' as nr,
    'TG Leverkusen' as tvm_venue,
    '1+4' as tvm_courts,
    1 as store_court_number,
    'Alle 4 Plätze (1-4) verfügbar' as comment
  UNION ALL
  SELECT '572', 'KTC 71', '3+4', 3, 'Nur Plätze 3-4 verfügbar'
  UNION ALL
  SELECT '573', 'TC Ford Köln', '1+2', 1, 'Nur Plätze 1-2 verfügbar'
  UNION ALL
  SELECT '574', 'Tennishalle Köln-Rath', '3+4', 3, 'Nur Plätze 3-4 verfügbar'
  UNION ALL
  SELECT '577', 'Marienburger SC', '14+15', 14, '⚠️ ASCHE! Plätze 14-15'
)
SELECT 
  '📋 MAPPING-VORSCHLAG' as info,
  me.nr,
  me.tvm_venue,
  me.tvm_courts as tvm_notation,
  v.name as db_venue,
  me.store_court_number as court_number_in_db,
  st.name as surface_type,
  st.shoe_recommendation,
  me.comment
FROM mapping_example me
LEFT JOIN venues v ON v.name ILIKE '%' || me.tvm_venue || '%'
LEFT JOIN venue_courts vc ON vc.venue_id = v.id AND vc.court_number = me.store_court_number
LEFT JOIN surface_types st ON st.id = vc.surface_type_id
ORDER BY me.nr;

-- ====================================
-- 4. WICHTIG: MARIENBURGER SC DETAILS
-- ====================================

SELECT 
  '⚠️ MARIENBURGER SC - GEMISCHTE BELÄGE!' as info,
  vc.court_number,
  st.name as belag,
  st.icon_emoji,
  st.shoe_recommendation,
  CASE 
    WHEN vc.court_number BETWEEN 1 AND 4 THEN '✅ Teppich (Plätze 1-4)'
    WHEN vc.court_number IN (14, 15) THEN '⚠️ ASCHE (Plätze 14-15)'
    ELSE 'Sonstiges'
  END as category
FROM venues v
JOIN venue_courts vc ON vc.venue_id = v.id
JOIN surface_types st ON st.id = vc.surface_type_id
WHERE v.name ILIKE '%Marienburger%'
ORDER BY vc.court_number;

-- ====================================
-- 5. VENUE MATCHING QUALITÄT
-- ====================================

SELECT 
  '🎯 MATCHING QUALITÄT' as info,
  'TG Leverkusen' as tvm_name,
  v.name as db_name,
  CASE 
    WHEN v.name ILIKE '%TG Leverkusen%' THEN '✅ Exakt'
    WHEN v.name ILIKE '%Leverkusen%' THEN '⚠️ Partial'
    ELSE '❌ Kein Match'
  END as match_quality
FROM venues v
WHERE v.name ILIKE '%Leverkusen%'
UNION ALL
SELECT 
  'KTC 71',
  v.name,
  CASE 
    WHEN v.name ILIKE '%KTC%71%' OR v.name ILIKE '%Kölner TC%71%' THEN '✅ Exakt'
    WHEN v.name ILIKE '%71%' THEN '⚠️ Partial'
    ELSE '❌ Kein Match'
  END
FROM venues v
WHERE v.name ILIKE '%71%'
UNION ALL
SELECT 
  'TC Ford Köln',
  v.name,
  CASE 
    WHEN v.name ILIKE '%TC Ford%' THEN '✅ Exakt'
    WHEN v.name ILIKE '%Ford%' THEN '⚠️ Partial'
    ELSE '❌ Kein Match'
  END
FROM venues v
WHERE v.name ILIKE '%Ford%'
UNION ALL
SELECT 
  'Tennishalle Köln-Rath',
  v.name,
  CASE 
    WHEN v.name ILIKE '%Tennishalle Köln-Rath%' THEN '✅ Exakt'
    WHEN v.name ILIKE '%Rath%' AND v.name NOT ILIKE '%Refrath%' THEN '⚠️ Partial'
    ELSE '❌ Kein Match'
  END
FROM venues v
WHERE v.name ILIKE '%Rath%' AND v.name NOT ILIKE '%Refrath%'
UNION ALL
SELECT 
  'Marienburger SC',
  v.name,
  CASE 
    WHEN v.name ILIKE '%Marienburger%' THEN '✅ Exakt'
    ELSE '❌ Kein Match'
  END
FROM venues v
WHERE v.name ILIKE '%Marienburger%';

-- ====================================
-- 6. SQL FÜR UPDATE SCRIPT
-- ====================================

SELECT '
════════════════════════════════════════════
📝 SQL CODE FÜR UPDATE_MATCHDAYS_WITH_VENUES.sql:
════════════════════════════════════════════

-- TG Leverkusen → Plätze 1+4 (= 1-4, speichern als 1)
SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%TG Leverkusen%'';
UPDATE matchdays SET venue_id = v_venue_id, court_number = 1
WHERE venue ILIKE ''%TG Leverkusen%'' AND venue_id IS NULL;

-- KTC 71 → Plätze 3+4 (= 3-4, speichern als 3)
SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%KTC%71%'';
UPDATE matchdays SET venue_id = v_venue_id, court_number = 3
WHERE venue ILIKE ''%KTC 71%'' AND venue_id IS NULL;

-- TC Ford Köln → Plätze 1+2 (= 1-2, speichern als 1)
SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%TC Ford%'';
UPDATE matchdays SET venue_id = v_venue_id, court_number = 1
WHERE venue ILIKE ''%Ford%'' AND venue_id IS NULL;

-- Tennishalle Köln-Rath → Plätze 3+4 (= 3-4, speichern als 3)
SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%Tennishalle Köln-Rath%'';
UPDATE matchdays SET venue_id = v_venue_id, court_number = 3
WHERE venue ILIKE ''%Rath%'' AND venue NOT ILIKE ''%Refrath%'' AND venue_id IS NULL;

-- Marienburger SC → Plätze 14+15 (= 14-15 ASCHE!, speichern als 14)
SELECT id INTO v_venue_id FROM venues WHERE name ILIKE ''%Marienburger%'';
UPDATE matchdays SET venue_id = v_venue_id, court_number = 14
WHERE venue ILIKE ''%Marienburger%'' AND venue_id IS NULL;

════════════════════════════════════════════
' as sql_code;


