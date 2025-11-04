-- ============================================
-- ERSTELLE RTHC BAYER LEVERKUSEN VENUE
-- ============================================
-- VNR 2129: 7 Plätze (1-4 Teppich, 5-6 Laykold)
-- ============================================

DO $$
DECLARE
  v_venue_id UUID;
  v_teppich_id UUID;
  v_laykold_id UUID;
BEGIN
  -- Hole Surface Type IDs
  SELECT id INTO v_teppich_id FROM surface_types WHERE name = 'Teppich';
  SELECT id INTO v_laykold_id FROM surface_types WHERE name = 'Laykold';
  
  -- Erstelle Venue
  INSERT INTO venues (
    vnr,
    name,
    street,
    postal_code,
    city,
    email,
    phone,
    court_count,
    indoor,
    is_verified
  ) VALUES (
    '2129',
    'RTHC Bayer Leverkusen',
    'Knochenbergsweg',
    '51373',
    'Leverkusen',
    'tennis@rthc.de',
    '0214-32620',
    7,
    true,
    true
  )
  ON CONFLICT (vnr) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    street = EXCLUDED.street,
    postal_code = EXCLUDED.postal_code,
    city = EXCLUDED.city,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    court_count = EXCLUDED.court_count
  RETURNING id INTO v_venue_id;
  
  RAISE NOTICE '✅ Venue created: % (ID: %)', 'RTHC Bayer Leverkusen', v_venue_id;
  
  -- Erstelle venue_courts: Plätze 1-4 = Teppich
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
    VALUES (v_venue_id, i, v_teppich_id)
    ON CONFLICT (venue_id, court_number) DO UPDATE
    SET surface_type_id = EXCLUDED.surface_type_id;
  END LOOP;
  
  RAISE NOTICE '✅ Courts 1-4: Teppich';
  
  -- Plätze 5-6 = Laykold
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
  VALUES 
    (v_venue_id, 5, v_laykold_id),
    (v_venue_id, 6, v_laykold_id)
  ON CONFLICT (venue_id, court_number) DO UPDATE
  SET surface_type_id = EXCLUDED.surface_type_id;
  
  RAISE NOTICE '✅ Courts 5-6: Laykold';
  
  -- Update alle Matchdays mit "RTHC Bayer Leverkusen" Venue
  UPDATE matchdays
  SET venue_id = v_venue_id
  WHERE venue ILIKE '%RTHC%Bayer%Leverkusen%'
    AND venue_id IS NULL;
  
  RAISE NOTICE '✅ Matchdays updated with venue_id';
  
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
WHERE v.vnr = '2129'
ORDER BY vc.court_number;

