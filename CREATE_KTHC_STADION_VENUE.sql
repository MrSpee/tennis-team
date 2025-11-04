-- ============================================
-- ERSTELLE KÖLNER THC STADION ROT-WEISS VENUE
-- ============================================
-- VNR 2097: 6 Plätze (1+2 Laykold, 4+5 Asche)
-- ============================================

DO $$
DECLARE
  v_venue_id UUID;
  v_laykold_id UUID;
  v_asche_id UUID;
BEGIN
  -- Hole Surface Type IDs
  SELECT id INTO v_laykold_id FROM surface_types WHERE name = 'Laykold';
  SELECT id INTO v_asche_id FROM surface_types WHERE name = 'Asche';
  
  -- Erstelle Venue
  INSERT INTO venues (
    vnr,
    name,
    club_name,
    street,
    postal_code,
    city,
    email,
    court_count,
    indoor,
    is_verified
  ) VALUES (
    '2097',
    'Kölner THC Stadion Rot-Weiß',
    'Kölner THC Stadion Rot-Weiß',
    'Olympiaweg 9',
    '50933',
    'Köln',
    'karimi@rot-weiss-koeln.de',
    6,
    true, -- Indoor (Hallenplan)
    true
  )
  ON CONFLICT (vnr) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    street = EXCLUDED.street,
    postal_code = EXCLUDED.postal_code,
    city = EXCLUDED.city,
    email = EXCLUDED.email,
    court_count = EXCLUDED.court_count
  RETURNING id INTO v_venue_id;
  
  RAISE NOTICE '✅ Venue created: % (ID: %)', 'Kölner THC Stadion Rot-Weiß', v_venue_id;
  
  -- Erstelle venue_courts: Plätze 1+2 = Laykold
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
  VALUES 
    (v_venue_id, 1, v_laykold_id),
    (v_venue_id, 2, v_laykold_id)
  ON CONFLICT (venue_id, court_number) DO UPDATE
  SET surface_type_id = EXCLUDED.surface_type_id;
  
  RAISE NOTICE '✅ Courts 1-2: Laykold Gran Slam';
  
  -- Plätze 4+5 = Asche
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
  VALUES 
    (v_venue_id, 4, v_asche_id),
    (v_venue_id, 5, v_asche_id)
  ON CONFLICT (venue_id, court_number) DO UPDATE
  SET surface_type_id = EXCLUDED.surface_type_id;
  
  RAISE NOTICE '✅ Courts 4-5: Asche';
  
  -- Update Matchdays mit "KölnerTHC Stadion RW" Venue
  UPDATE matchdays
  SET venue_id = v_venue_id
  WHERE venue ILIKE '%KölnerTHC%Stadion%RW%'
    AND venue_id IS NULL
    AND created_at >= '2025-11-04T22:00:00';
  
  RAISE NOTICE '✅ Matchdays updated with venue_id (% rows)', FOUND;
  
END $$;

-- Verifiziere
SELECT 
  '✅ ERGEBNIS' as status,
  v.name as venue_name,
  vc.court_number,
  st.name as surface_name,
  st.shoe_recommendation
FROM venues v
JOIN venue_courts vc ON vc.venue_id = v.id
JOIN surface_types st ON st.id = vc.surface_type_id
WHERE v.vnr = '2097'
ORDER BY vc.court_number;

-- Check updated matches
SELECT 
  '✅ UPDATED MATCHES' as status,
  COUNT(*) as match_count,
  venue
FROM matchdays
WHERE venue ILIKE '%KölnerTHC%Stadion%RW%'
  AND created_at >= '2025-11-04T22:00:00'
GROUP BY venue;

