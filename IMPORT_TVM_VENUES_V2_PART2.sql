-- ============================================
-- IMPORT TVM VENUES V2 - PART 2
-- ============================================
-- Importiert weitere 30+ Hallen
-- WICHTIG: Führe zuerst IMPORT_TVM_VENUES_V2.sql aus!
-- ============================================

DO $$
DECLARE
  v_venue_id UUID;
  v_teppich_id UUID;
  v_granulat_id UUID;
  v_asche_id UUID;
  v_laykold_id UUID;
  v_rebound_id UUID;
  v_struktur_id UUID;
  v_kunststoff_id UUID;
  v_imported_venues INTEGER := 0;
  v_imported_courts INTEGER := 0;
  i INTEGER;
  rec RECORD;
BEGIN
  
  -- Hole Surface Type IDs
  SELECT id INTO v_teppich_id FROM surface_types WHERE name = 'Teppich';
  SELECT id INTO v_granulat_id FROM surface_types WHERE name = 'Granulat';
  SELECT id INTO v_asche_id FROM surface_types WHERE name = 'Asche';
  SELECT id INTO v_laykold_id FROM surface_types WHERE name = 'Laykold';
  SELECT id INTO v_rebound_id FROM surface_types WHERE name = 'Rebound Ace';
  SELECT id INTO v_struktur_id FROM surface_types WHERE name = 'Strukturvelour';
  SELECT id INTO v_kunststoff_id FROM surface_types WHERE name = 'Kunststoff';
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 IMPORTIERE TVM VENUES - PART 2';
  RAISE NOTICE '🔧 Weitere 30+ Hallen';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- GEMISCHTE BELÄGE (spezielle Behandlung)
  -- ====================================
  
  -- 6407: Sportaktiv Rhein-Sieg - GEMISCHT! ⭐
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6407', 'Sportaktiv Rhein-Sieg', NULL, 'Reutherstr. 22', '53773', 'Hennef/Sieg', 'info@sportaktiv.de', '02242-9155155', 10, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Granulat
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_granulat_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 5+6: Plexi Pave (= Rebound Ace ähnlich)
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 5, v_rebound_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 6, v_rebound_id) ON CONFLICT DO NOTHING;
  
  -- Plätze 7-10: Unbekannt (nicht spezifiziert)
  FOR i IN 7..10 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) 
    VALUES (v_venue_id, i, (SELECT id FROM surface_types WHERE name = 'Unbekannt')) 
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: Sportaktiv Rhein-Sieg (GEMISCHT: 1-4 Granulat, 5-6 Plexi Pave, 7-10 Unbekannt)';
  
  -- 6312: Racket Arena Rhein-Erft - GEMISCHT! ⭐
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6312', 'Racket Arena Rhein-Erft', NULL, 'Zum Hubertusbusch', '50181', 'Kerpen', 'info@racketarena.de', '02237-4050', 7, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Alle Plätze 1-7: Rebound Ace
  FOR i IN 1..7 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_rebound_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: Racket Arena Rhein-Erft (7 Plätze Rebound Ace)';
  
  -- ====================================
  -- EINFACHE HALLEN (alle Plätze gleicher Belag)
  -- ====================================
  
  CREATE TEMP TABLE IF NOT EXISTS temp_part2_venues (
    vnr TEXT,
    name TEXT,
    club_name TEXT,
    street TEXT,
    postal_code TEXT,
    city TEXT,
    email TEXT,
    phone TEXT,
    court_count INTEGER,
    surface_type_id UUID
  );
  
  DELETE FROM temp_part2_venues;
  
  INSERT INTO temp_part2_venues VALUES
    -- GRANULAT-HALLEN
    ('6307', 'SportOase Berzdorf', NULL, 'Im kleinen Mölchen 36-40', '50389', 'Wesseling', 'kontakt@sport-oase.de', '02232-43018', 3, v_granulat_id),  -- Microgranulat
    ('6308', 'TH Bergheim', NULL, 'Sportparkstrasse 3', '50126', 'Bergheim', 'info@sport-centrum.de', '02272-999119', 3, v_granulat_id),
    ('6309', 'Aktivpark Hannes Kall', NULL, 'Auelstr. 40', '53925', 'Kall', 'info@aktivpark-kall.de', '02441-4747', 2, v_granulat_id),
    ('6311', 'TH Kaster', NULL, 'Stresemannstr. 4', '50181', 'Bedburg', 'tennishallekaster@sport-centrum.de', '02272-999119', 4, v_granulat_id),
    ('6313', 'Schäfer/Münstereifel', NULL, 'Im goldenen Tal 8', '53902', 'Bad Münstereifel', 'info@sportwelt-schaefer.de', '02253-7643', 3, v_asche_id),  -- Sand = Asche
    ('6314', 'Crosscort Bornheim', NULL, 'Wallraf-Str. 10', '53332', 'Bornheim', 'cross-court@t-online.de', '0171-6294277', 4, v_granulat_id),  -- Teppich mit Granulat = Granulat
    ('6402', 'TH Johanneshof/Mondorf', NULL, 'Johannesstr. 20', '53859', 'Niederkassel', 'tennishallemondorf@gmx.de', '0228-450097', 4, v_granulat_id),  -- Gummigranulat
    ('6404', 'Melli´s Borner Sporttreff', NULL, 'Bornbacher Str. 11', '42897', 'Remscheid', 'Info@borner-sporttreff.com', '02191-963636', 2, v_granulat_id),  -- Teppich mit Granulat
    ('6405', 'TH Frömmersbach Gummersbach', NULL, 'Am Sonnenberg 25', '51645', 'Gummersbach', NULL, '02261-52408', 3, v_granulat_id),  -- Teppich mit Granulat
    ('6418', 'Sportcenter Wipperfürth', NULL, 'Bahnstr. 31', '51688', 'Wipperfürth', 'guido.niederwipper@t-online.de', '0172-7145566', 3, v_granulat_id),  -- Teppich mit Granulat
    ('6420', 'THi.SaunaparkSiebengebirge', NULL, 'Dollendorfer Str. 106-110', '53639', 'Königswinter-Oberpl', 'info@saunapark-siebengebirge.de', '02244-92170', 3, v_granulat_id),  -- Teppich mit Granulat
    ('6423', 'THGummersbach-Windhagen', NULL, 'Hückeswagener Str. 111a', '51647', 'Gummersbach', 'hagen@stubsgmbh.de', '02261-6464', 4, v_granulat_id),
    
    -- TEPPICH-HALLEN
    ('6310', 'TH SportLife', NULL, 'Stommeler Str. 143', '50259', 'Pulheim-Sinnersdorf', 'matthias@sportlife-fitness.de', '02238-96514', 4, v_teppich_id),
    ('6315', 'TH Villeforst', NULL, 'Greinstr.', '50226', 'Frechen-Königsdorf', 'villeforst@gmail.com', '02234-600400', 3, v_teppich_id),
    ('6316', 'TH Königsdorf', NULL, 'Pfeilstr. 18 /Sportzentrum', '50226', 'Frechen-Königsdorf', 'haubold@tennishalle-koenigsdorf.de', '0172-3505268', 3, v_teppich_id),
    ('6317', 'Sportcenter Erftstadt', NULL, 'An der Schwarzau 5', '50374', 'Erftstadt', 'info@tennishalle-erftstadt.de', '02235-461333', 6, v_teppich_id),
    ('6403', 'Bergische Sportarena', NULL, 'Beltener Str. 48', '42929', 'Wermeskirchen', 'info@bergische-sportarena.de', '02196-1846', 2, v_teppich_id),
    ('6408', 'TH Niederpleis', NULL, 'Am Eichelkämpchen 5-7', '53757', 'St. Augustin', 'tlc-yonex-academy.de', '0151-18030557', 4, v_teppich_id),
    ('6412', 'Trans World Hotel Much', NULL, 'Bövingen 129', '53804', 'Much', 'nathalie.wisser@twhotels.eu', '02245-6080', 3, v_teppich_id),
    ('6413', 'Padelbox Bergisch Gladbach', NULL, 'Odenthaler Str. 278', '51467', 'Bergisch Gladbach', 'bergischgladbach@padelbox.de', NULL, 4, v_teppich_id),
    ('6414', 'TH Haus Rott', NULL, 'Kriegsdorfer Str. 71', '53844', 'Troisdorf', 'klaushass@t-online.de', '02241-47070', 3, v_teppich_id),
    ('6417', 'TH Oberberg/Ründeroth', NULL, 'Gartenstr. 52', '51766', 'Engelskirchen', 'info@th-oberberg.de', '01578-5547812', 4, v_teppich_id),
    ('6419', 'TopSpin Eitorf', NULL, 'Am Eichelkamp 7', '53783', 'Eitorf', 'info@tennishalle-eitorf.de', '02243-6680', 3, v_teppich_id),
    ('6421', 'TH Gut Buschhof', NULL, 'Zum Buschhof', '53639', 'Königswinter', 'info@gut-buschhof.com', '02244-1601', 4, v_teppich_id),
    ('6422', 'TZ Waldbröl', NULL, 'Am Mühlenteich 10', '51545', 'Waldbröl', 'isv-ug@web.de', '0171-270 39 74', 2, v_teppich_id),
    
    -- ASCHE-HALLEN
    ('6318', 'VTHC Frechen', 'VTHC Frechen', 'Fridjof-Nansen-Str. 70', '50226', 'Frechen', NULL, NULL, 3, v_asche_id),
    ('6411', 'THG Gronau', NULL, 'Ferdinandstr. 33', '51469', 'Bergisch Gladbach', 'info@tennishalle-gronau.de', '02202-959331', 3, v_asche_id),
    
    -- HARTPLATZ-HALLEN
    ('6406', 'SportCenterRheinbreitbach', NULL, 'Westerwaldstr. 15', '53619', 'Rheinbreitbach', 'info@tennishalle-rheinbreitbach.de', '02224-2552', 4, v_rebound_id),  -- Rebound Ace(Hartcort)
    ('6409', 'Tennis Center Overath', NULL, 'Cyriaxer Auel', '51491', 'Overath', 'tlc-yonex-academy.de', '015118030557', 4, v_laykold_id),  -- Greenset(Hartplatz)
    ('6416', 'TH Nümbrecht', NULL, 'Höhenstr. 40', '51588', 'Nümbrecht', 'sportpark@nuembrecht.com', '02293-303700', 6, v_granulat_id),
    ('6410', 'TH Troisdorf/Lahnstr.', NULL, 'Mendener Str. 4', '53840', 'Troisdorf', 'tennis-troisdorf@t-online.de', '0172-2902889', 4, v_granulat_id);
  
  RAISE NOTICE '📋 Importiere % einfache Venues...', (SELECT COUNT(*) FROM temp_part2_venues);
  
  -- Importiere alle einfachen Venues
  FOR rec IN SELECT * FROM temp_part2_venues LOOP
    INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
    VALUES (rec.vnr, rec.name, rec.club_name, rec.street, rec.postal_code, rec.city, rec.email, rec.phone, rec.court_count, true, true)
    ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_venue_id;
    
    -- Erstelle Courts (alle mit gleichem Belag)
    FOR i IN 1..rec.court_count LOOP
      INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
      VALUES (v_venue_id, i, rec.surface_type_id)
      ON CONFLICT (venue_id, court_number) DO NOTHING;
      
      v_imported_courts := v_imported_courts + 1;
    END LOOP;
    
    v_imported_venues := v_imported_venues + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Alle einfachen Venues importiert';
  
  -- Count totals
  SELECT COUNT(*) INTO v_imported_venues FROM venues;
  SELECT COUNT(*) INTO v_imported_courts FROM venue_courts;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ PART 2 IMPORT ABGESCHLOSSEN!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 GESAMT-STATISTIKEN:';
  RAISE NOTICE '   - Total Venues: %', v_imported_venues;
  RAISE NOTICE '   - Total Plätze: %', v_imported_courts;
  RAISE NOTICE '';
  RAISE NOTICE '📋 BELAG-VERTEILUNG:';
  RAISE NOTICE '   🟦 Teppich: % Plätze', (SELECT COUNT(*) FROM venue_courts WHERE surface_type_id = v_teppich_id);
  RAISE NOTICE '   🟨 Granulat: % Plätze', (SELECT COUNT(*) FROM venue_courts WHERE surface_type_id = v_granulat_id);
  RAISE NOTICE '   🟧 Asche: % Plätze', (SELECT COUNT(*) FROM venue_courts WHERE surface_type_id = v_asche_id);
  RAISE NOTICE '   💚 Laykold: % Plätze', (SELECT COUNT(*) FROM venue_courts WHERE surface_type_id = v_laykold_id);
  RAISE NOTICE '   💙 Rebound Ace: % Plätze', (SELECT COUNT(*) FROM venue_courts WHERE surface_type_id = v_rebound_id);
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: ALLE VENUES
-- ====================================

SELECT 
  '✅ ALLE IMPORTIERTEN VENUES' as info,
  COUNT(*) as total_venues,
  COUNT(DISTINCT city) as unique_cities,
  COUNT(*) FILTER (WHERE club_name IS NULL) as commercial_venues,
  COUNT(*) FILTER (WHERE club_name IS NOT NULL) as club_venues
FROM venues;

-- ====================================
-- VERIFICATION: BELAG-STATISTIK
-- ====================================

SELECT 
  '📊 BELAG-VERTEILUNG' as info,
  st.name as belag,
  st.icon_emoji,
  COUNT(*) as platz_count,
  COUNT(DISTINCT vc.venue_id) as venue_count
FROM venue_courts vc
JOIN surface_types st ON st.id = vc.surface_type_id
GROUP BY st.id, st.name, st.icon_emoji
ORDER BY platz_count DESC;

-- ====================================
-- VERIFICATION: STÄDTE-ÜBERSICHT
-- ====================================

SELECT 
  '🏙️ STÄDTE-ÜBERSICHT' as info,
  city,
  COUNT(*) as venue_count,
  SUM(court_count) as total_courts
FROM venues
GROUP BY city
ORDER BY venue_count DESC, city;


