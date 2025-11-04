-- ============================================
-- IMPORT TVM VENUES V2 - GRANULAR
-- ============================================
-- Importiert Hallen MIT einzelnen Plätzen
-- Jeder Platz hat spezifischen Belag!
-- ============================================

-- WICHTIG: Führe zuerst CREATE_VENUES_SURFACE_SYSTEM_V2.sql aus!

DO $$
DECLARE
  v_venue_id UUID;
  v_teppich_id UUID;
  v_granulat_id UUID;
  v_asche_id UUID;
  v_laykold_id UUID;
  v_rebound_id UUID;
  v_struktur_id UUID;
  v_hartcourt_id UUID;
  v_imported_venues INTEGER := 0;
  v_imported_courts INTEGER := 0;
  i INTEGER;
  rec RECORD;  -- ✅ FÜR FOR-LOOP
BEGIN
  
  -- Hole Surface Type IDs
  SELECT id INTO v_teppich_id FROM surface_types WHERE name = 'Teppich';
  SELECT id INTO v_granulat_id FROM surface_types WHERE name = 'Granulat';
  SELECT id INTO v_asche_id FROM surface_types WHERE name = 'Asche';
  SELECT id INTO v_laykold_id FROM surface_types WHERE name = 'Laykold';
  SELECT id INTO v_rebound_id FROM surface_types WHERE name = 'Rebound Ace';
  SELECT id INTO v_struktur_id FROM surface_types WHERE name = 'Strukturvelour';
  
  -- Fallbacks
  IF v_struktur_id IS NULL THEN
    SELECT id INTO v_struktur_id FROM surface_types WHERE name = 'Kunststoff';
  END IF;
  
  -- Neue Surface Types (falls aus Daten erkannt)
  -- "Greenset" Varianten = Laykold-ähnlich
  -- "Plexi Pave" = Hartplatz
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 IMPORTIERE TVM MITTELRHEIN VENUES V2';
  RAISE NOTICE '🔧 Mit granularer Platz-Speicherung!';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- 1002: PTSV Aachen - 4 Plätze Hartcourt
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('1002', 'PTSV Aachen', 'PTSV Aachen', 'Eulersweg 15', '52070', 'Aachen', 'kontakt@ptsv-aachen.de', '0241-911903', 4, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Hartcourt (Rebound Ace als Approximation)
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
    VALUES (v_venue_id, i, v_rebound_id)
    ON CONFLICT (venue_id, court_number) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: PTSV Aachen (4 Plätze Hartcourt)';
  
  -- ====================================
  -- 1004: TK Blau-Weiss Aachen - 2 Plätze Asche
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('1004', 'TK Blau-Weiss Aachen', 'TK Blau-Weiss Aachen', 'Luxemburger Ring 62', '52066', 'Aachen', 'kontakt@blau-weiss-aachen.de', '0241-62502', 2, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  FOR i IN 1..2 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
    VALUES (v_venue_id, i, v_asche_id)
    ON CONFLICT (venue_id, court_number) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: TK Blau-Weiss Aachen (2 Plätze Asche)';
  
  -- ====================================
  -- 1006: TC Grün-Weiß Aachen - 6 Plätze Rebound Ace
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('1006', 'TC Grün-Weiß Aachen', 'TC Grün-Weiß Aachen', 'Brüsseler Ring 60', '52074', 'Aachen', 'info@tc-gruen-weiss.de', '0241-77879', 6, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  FOR i IN 1..6 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
    VALUES (v_venue_id, i, v_rebound_id)
    ON CONFLICT (venue_id, court_number) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: TC Grün-Weiß Aachen (6 Plätze Rebound Ace)';
  
  -- ====================================
  -- 2097: Kölner THC Stadion RW - GEMISCHT! ⭐
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('2097', 'Kölner THC Stadion Rot-Weiß', 'KölnerTHC Stadion RW', 'Olympiaweg 9', '50933', 'Köln', 'karimi@rot-weiss-koeln.de', NULL, 6, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1+2: Laykold
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 1, v_laykold_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 2, v_laykold_id) ON CONFLICT DO NOTHING;
  
  -- Plätze 4+5: Asche (Platz 3 fehlt in der Angabe!)
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 4, v_asche_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 5, v_asche_id) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: Kölner THC Stadion RW (GEMISCHT: 1-2 Laykold, 4-5 Asche)';
  
  -- ====================================
  -- 2098: Marienburger SC - GEMISCHT! ⭐
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('2098', 'Marienburger SC', 'Marienburger SC', 'Schillingsrotter Str. 99', '50996', 'Köln', 'sekretariat@msc-koeln.de', NULL, 4, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Teppich
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 14-15: Asche
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 14, v_asche_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 15, v_asche_id) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: Marienburger SC (GEMISCHT: 1-4 Teppich, 14-15 Asche)';
  
  -- ====================================
  -- 2129: RTHC Bayer Leverkusen - GEMISCHT! ⭐
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('2129', 'TH Schloß Morsbroich', 'RTHC Bayer Leverkusen', 'Knochenbergsweg', '51373', 'Leverkusen', 'tennis@rthc.de', '0214-32620', 7, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Teppich
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 5+6: Laykold
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 5, v_laykold_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 6, v_laykold_id) ON CONFLICT DO NOTHING;
  
  -- Platz 7: Unbekannt (nicht in Angabe, aber court_count = 7)
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) 
  VALUES (v_venue_id, 7, (SELECT id FROM surface_types WHERE name = 'Unbekannt')) 
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: TH Schloß Morsbroich (GEMISCHT: 1-4 Teppich, 5-6 Laykold)';
  
  -- ====================================
  -- 6101: TH Rurbenden - GEMISCHT! ⭐
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6101', 'TH Rurbenden', NULL, 'Rurbenden 8', '52382', 'Niederzier', 'info@tennishalle-rurbenden.de', '0170-1891891', 6, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Teppich
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 5+6: Rebound Ace
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 5, v_rebound_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 6, v_rebound_id) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: TH Rurbenden (GEMISCHT: 1-4 Teppich, 5-6 Rebound Ace)';
  
  -- ====================================
  -- 6105: Sportforum Alsdorf - GEMISCHT! ⭐
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6105', 'Sportforum Alsdorf', NULL, 'Eschweilerstr. 168', '52477', 'Alsdorf', 'info@sport-forum-alsdorf.de', '02404-97070', 7, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-4: Teppich
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 5+6: Rebound Ace
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 5, v_rebound_id) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, 6, v_rebound_id) ON CONFLICT DO NOTHING;
  
  -- Platz 7: Unbekannt
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) 
  VALUES (v_venue_id, 7, (SELECT id FROM surface_types WHERE name = 'Unbekannt')) 
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: Sportforum Alsdorf (GEMISCHT: 1-4 Teppich, 5-6 Rebound Ace)';
  
  -- ====================================
  -- 6102: Tennishalle Vaals (NL) - Teppich
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6102', 'Tennishalle Vaals', NULL, 'Sneeuwberglaan 1d', '6291 HB', 'Vaals (NL)', 'tennishalle.vaals@gmail.com', '0176-380955', 4, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: Tennishalle Vaals (4 Plätze Teppich)';
  
  -- ====================================
  -- 6207: TH La MKG - Greenset Laykold (= Laykold)
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6207', 'TH La MKG', NULL, 'Grossrotterweg 1', '50997', 'Köln', 'info@mkgoellner.de', NULL, 5, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  FOR i IN 1..5 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_laykold_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Imported: TH La MKG (5 Plätze Greenset Laykold)';
  
  -- ====================================
  -- 6209: Tennisverband Mittelrhein - Plexi Pave (Hartplatz)
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6209', 'Tennisverband Mittelrhein', 'TVM', 'Merianstr. 2-4', '50769', 'Köln', 'info@tvm-tennis.de', '0221-7895560', 4, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  FOR i IN 1..4 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_rebound_id) ON CONFLICT DO NOTHING;  -- Plexi Pave = Rebound Ace ähnlich
  END LOOP;
  
  RAISE NOTICE '✅ Imported: TVM Halle (4 Plätze Plexi Pave)';
  
  -- ====================================
  -- 6205: Padelbox Weiden - Teilweise Teppich (1-5 von 7)
  -- ====================================
  
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
  VALUES ('6205', 'Padelbox Weiden', NULL, 'Kronstätterstr. 167', '50858', 'Köln', 'richard@walls.de', '02234-927886', 7, true, true)
  ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_venue_id;
  
  -- Plätze 1-5: Teppich
  FOR i IN 1..5 LOOP
    INSERT INTO venue_courts (venue_id, court_number, surface_type_id) VALUES (v_venue_id, i, v_teppich_id) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Plätze 6-7: Unbekannt (vermutlich Padel-Plätze, kein Tennis?)
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) 
  VALUES (v_venue_id, 6, (SELECT id FROM surface_types WHERE name = 'Unbekannt')) ON CONFLICT DO NOTHING;
  INSERT INTO venue_courts (venue_id, court_number, surface_type_id) 
  VALUES (v_venue_id, 7, (SELECT id FROM surface_types WHERE name = 'Unbekannt')) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Imported: Padelbox Weiden (1-5 Teppich, 6-7 Unbekannt/Padel)';
  
  -- ====================================
  -- REST: Einfache Hallen (alle Plätze gleicher Belag)
  -- ====================================
  
  -- Temporäre Tabelle für Batch-Import
  CREATE TEMP TABLE IF NOT EXISTS temp_simple_venues (
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
  
  -- Lösche alte Daten falls vorhanden
  DELETE FROM temp_simple_venues;
  
  INSERT INTO temp_simple_venues VALUES
    -- AACHEN REGION
    ('1015', 'Baesweiler TC', 'Baesweiler TC', 'Parkstr./Sportpark', '52499', 'Baesweiler', 'info@baesweiler-tennis-club.de', '02401-4000', 4, v_struktur_id),
    ('1049', 'TG Rot-Weiß Düren', 'TG Rot-Weiß Düren', 'An der Kuhbrücke 18', '52355', 'Düren', 'tennis@rot-weiss.info', '02421-53868', 3, v_teppich_id),
    ('1083', 'TV Blau-Weiß Jülich', 'TV Blau-Weiß Jülich', 'Stadionweg', '52428', 'Jülich', 'm.meurer@blau-weiss-juelich.de', '02461 343025', 3, v_teppich_id),
    ('1166', 'VfR Übach-Palenberg', 'VfR Übach-Palenberg', 'Am Bucksberg', '52531', 'Übach-Palenberg', 'info@tc-uebach-palenberg.de', '02451-45454', 3, v_teppich_id),
    ('1257', 'TC Aachen-Brand', 'TC Aachen-Brand', 'Rombachstr. 109', '52078', 'Aachen', 'info@tc-aachen-brand.de', '0241-528130', 4, v_teppich_id),
    ('1275', 'Aachen-Laurensberger TC', 'Aachen-Laurensberger TC', 'Schlottfelderstr. 7', '52074', 'Aachen', 'vorstand@altc.de', '0241-176778', 2, v_asche_id),
    
    -- KÖLN REGION
    ('2091', 'Kölner HTC BW', 'Kölner HTC BW', 'Neuenhöfer Allee 69', '50935', 'Köln', 'info@blau-weiss-koeln.de', '0221-433567', 2, v_asche_id),
    ('2092', 'Kölner KHT Schwarz-Weiss', 'Kölner KHT SW', 'Kuhweg 20', '50735', 'Köln', 'buero@kkht.de', '0221-976221', 3, v_teppich_id),
    ('2093', 'Kölner TC''71', 'Kölner TC''71', 'Merianstr. 2-4', '50769', 'Köln', 'ktc71@online.de', NULL, 4, v_teppich_id),
    ('2095', 'KTC Weidenpescher Park', 'KTC Weidenpescher Park', 'Rennbahnstr. 56', '50737', 'Köln', 'sportwart@weidenpescher-park.de', '0221-743958', 3, v_teppich_id),
    ('2102', 'TC Köln-Worringen', 'TC Köln-Worringen', 'Further Weg 21', '50769', 'Köln', 'tcworringen@t-online.de', '0221-786828', 3, v_teppich_id),
    ('2106', 'TC Ford Köln', 'TC Ford Köln', 'Scheibenstr. 23', '50737', 'Köln', 'tcfk@netcologne.de', '0221-3907570', 3, v_teppich_id),
    ('2120', 'TV Dellbrück', 'TV Dellbrück', 'Mielenforster Str. 40', '51069', 'Köln', 'info@tv-dellbrueck.de', '0221-6800555', 3, v_asche_id),
    ('2132', 'TG Leverkusen', 'TG Leverkusen', 'von-Diergardt-Str. 25', '51375', 'Leverkusen', 'tgleverkusen@gmx.de', '0214-55247', 4, v_struktur_id),
    
    -- BONN REGION
    ('3029', 'Bonner THV', 'Bonner THV', 'Christian-Miesen-Str. 1', '53129', 'Bonn', 'info@bthv.de', NULL, 8, v_teppich_id),  -- ⚠️ GEMISCHT
    ('3032', 'HTC Schwarz-Weiss Bonn', 'HTC Schwarz-Weiss Bonn', 'Saalestr. 30', '53127', 'Bonn', 'gst@htc-bonn.de', '0228-284090', 3, v_teppich_id),
    ('3036', 'TC Blau-Gold Bonn', 'TC Blau-Gold Bonn', 'Hohe Str. 21', '53119', 'Bonn', 'info@tcblaugoldbonn.de', '0228-665478', 3, v_granulat_id),
    ('3038', 'TC Blau-Weiss Duisdorf', 'TC Blau-Weiss Duisdorf', 'Wesselheideweg 77', '53123', 'Bonn', 'info@tennis-bonn.de', '0228-646614', 2, v_teppich_id),
    ('3040', 'TC Röttgen', 'TC Röttgen', 'Am Katzenlochbach 15', '53125', 'Bonn', 'tc-roettgen@t-online.de', '0228-25355', 2, v_asche_id),
    ('3041', 'THC Brühl', 'THC Brühl', 'Liblarer Str. 154', '50321', 'Brühl', 'kontakt@thcbruehl.de', '02232-25737', 4, v_teppich_id),
    ('3042', 'TC Bayer Dormagen', 'TC Bayer Dormagen', 'Holzweg 63', '41540', 'Dormagen', 'info@TC-Bayer-Dormagen.de', '02133-82451', 6, v_teppich_id),
    ('3301', 'TTC Brauweiler', 'TTC Brauweiler', 'Donatusstr. 45', '50259', 'Pulheim', 'tc-brauweiler@t-online.de', NULL, 4, v_laykold_id),  -- Laykold-Hartplatz
    ('3386', 'TC Grün-Weiß Brüser Berg', 'TC Grün-Weiß Brüser Berg', 'An der Haeschmaar 22', '53125', 'Bonn', 'hallen@tcgwbrueserberg.de', '0176-83404817', 2, v_asche_id),
    ('4018', 'SV Refrath/Frankenforst', 'SV Refrath/Frankenforst', 'Heuweg 7', '51427', 'Bergisch Gladbach', 'tvm@svrtennis.de', '02204-65515', 2, v_asche_id),  -- Sand/Traglufthalle
    ('4146', 'WSV Blau-Weiß Rheidt', 'WSV Blau-Weiß Rheidt', 'Im Auel 17', '53859', 'Niederkassel', 'wsv-rheidt@t-online.de', NULL, 2, v_granulat_id),  -- Granulat-Velourboden
    ('4232', 'SV Blau-Weiss Hand', 'SV Blau-Weiss Hand', 'Franz-Heider-Str. 25', '51469', 'Bergisch Gladbach', 'tennis@blau-weiss-hand.de', '02202-57037', 4, v_laykold_id),  -- Greenset Hardcourt → Laykold
    ('4456', 'TH Moitzfeld', NULL, 'Platzer Höhenweg', '51429', 'Bergisch Gladbach', 'nhebborn@aol.com', '02204-82141', 4, v_teppich_id),  -- ✅ KEINE Vereins-Zugehörigkeit
    
    -- HEINSBERG/WEGBERG REGION
    ('6103', 'Tennistreff Heinsberg', NULL, 'Horster Weg 43', '52525', 'Heinsberg', 'kontakt@tennistreff-Heinsberg.de', '02452-88177', 7, v_teppich_id),  -- ✅ Kommerziell
    ('6104', 'TH Wegberg', NULL, 'Große Riet 3', '41811', 'Wegberg', 'guenter.bennemann@t-online.de', '02434-661', 6, v_teppich_id),  -- ✅ Kommerziell
    ('6106', 'Tennishalle Kreuzau', NULL, 'Friedenau 15', '52372', 'Kreuzau', 'TFK-GmbH@gmx.de', '02422-6026', 3, v_teppich_id),  -- ✅ Kommerziell
    ('6107', 'Sportpark Loherhof', NULL, 'Pater-Bries-Weg 85', '52511', 'Geilenkirchen', 'r.freialdenhoven@web.de', '02451-1234', 4, v_teppich_id),  -- ✅ Kommerziell
    ('6108', 'TH Rurberg/Rursee', NULL, 'In den Brüchen 45', '52152', 'Simmerath-Rurberg', 'info@ferienpark-rursee.de', '02473-4512', 3, v_teppich_id),  -- ✅ Ferienpark
    
    -- KÖLN KOMMERZIELLE HALLEN
    ('6201', 'Tenniscentrum Immendorf', NULL, 'Berzdorfer Str. 29', '50997', 'Köln', 'kontakt@tennishalle-immendorf.de', NULL, 4, v_teppich_id),  -- ✅ Kommerziell
    ('6202', 'Sportsfactory Köln', NULL, 'Neubrücker Ring 48', '51109', 'Köln', 'info@sportsfactory-acr.de', '0221-8902001', 4, v_teppich_id),  -- ✅ Kommerziell
    ('6203', 'TH Schloss Morsbroich', 'RTHC Bayer Leverkusen', 'Hemmelrather Weg 269', '51377', 'Leverkusen', 'info@tbc-leverkusen.de', '0214-78666', 7, v_teppich_id),  -- ✅ Gehört zu RTHC (aber andere Adresse als VNR 2129!)
    ('6204', 'Tennishalle Köln-Rath', 'TC Rath', 'An der Rather Burg 4', '51107', 'Köln', 'tennishalle@burg-rath.de', '0221-8379456', 4, v_teppich_id),  -- Teppich mit Granulat = Teppich primary
    ('6206', 'TH West I', 'TC Widdersdorf', 'Rath-Mengenicher Weg 3', '50859', 'Köln', 'info@tc-widdersdorf.de', '0221-501290', 4, v_teppich_id),
    ('6208', 'Cologne Sportspark Poll', NULL, 'Poller Weg 1', '51149', 'Köln', 'mail@cologne-sportspark.de', '0221-2401031', 3, v_teppich_id),  -- ✅ Kommerziell
    
    -- RHEIN-ERFT/BRÜHL REGION
    ('6301', 'BTV Sportpark Brühl', 'Brühler TV', 'Steingasse 2', '50321', 'Brühl', 'tennisabteilungsleiter@btvonline.de', '02232-93218', 2, v_teppich_id),
    ('6302', 'Sportpark Stommeln', NULL, 'In den Benden', '50259', 'Pulheim', 'sean@tenniskonzept.com', '02238-3226', 3, v_teppich_id),  -- ✅ Kommerziell
    ('6303', 'Robinson WellFit Bonn', NULL, 'Mallwitzstr. 24', '53177', 'Bonn', 'office@robinson-wellfit-bonn.de', '0228-333000', 4, v_teppich_id),  -- ✅ Fitness-Center
    ('6304', 'Fischer/Sportpark Rheinbach', NULL, 'Schornbuschweg 1', '53359', 'Rheinbach', 'Fischer@Sportpark-Rheinbach.de', '02226-14544', 4, v_granulat_id),  -- ✅ Kommerziell
    ('6305', 'TC Knapsack', 'TC Knapsack', 'Industriestrasse 222', '50354', 'Hürth', 'g.fricker@mul-services.de', '0178-4209559', 4, v_teppich_id),  -- Teppich mit Granulat
    ('6306', 'TH Niederaussem', NULL, 'Dormagener Str. 11', '50129', 'Bergheim', 'herbert.kraus-tennis@web.de', '02271-75747', 2, v_granulat_id);  -- ✅ Kommerziell
  
  -- Importiere alle einfachen Venues
  FOR rec IN SELECT * FROM temp_simple_venues LOOP
    INSERT INTO venues (vnr, name, club_name, street, postal_code, city, email, phone, court_count, indoor, is_verified)
    VALUES (rec.vnr, rec.name, rec.club_name, rec.street, rec.postal_code, rec.city, rec.email, rec.phone, rec.court_count, true, true)
    ON CONFLICT (vnr) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_venue_id;
    
    -- Erstelle Courts (alle mit gleichem Belag)
    FOR i IN 1..rec.court_count LOOP
      INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
      VALUES (v_venue_id, i, rec.surface_type_id)
      ON CONFLICT (venue_id, court_number) DO NOTHING;
    END LOOP;
    
    v_imported_venues := v_imported_venues + 1;
  END LOOP;
  
  -- SPECIAL: 3029 Bonner THV - GEMISCHT (1-4 Teppich, 5-8 Asche)
  SELECT id INTO v_venue_id FROM venues WHERE vnr = '3029';
  IF v_venue_id IS NOT NULL THEN
    -- Überschreibe Plätze 5-8 mit Asche
    FOR i IN 5..8 LOOP
      INSERT INTO venue_courts (venue_id, court_number, surface_type_id)
      VALUES (v_venue_id, i, v_asche_id)
      ON CONFLICT (venue_id, court_number) DO UPDATE SET surface_type_id = v_asche_id;
    END LOOP;
    RAISE NOTICE '✅ Bonner THV: Plätze 5-8 auf Asche geändert';
  END IF;
  
  SELECT COUNT(*) INTO v_imported_venues FROM venues;
  SELECT COUNT(*) INTO v_imported_courts FROM venue_courts;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ IMPORT ABGESCHLOSSEN!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIKEN:';
  RAISE NOTICE '   - Venues importiert: %', v_imported_venues;
  RAISE NOTICE '   - Plätze erstellt: %', v_imported_courts;
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION: Gemischte Beläge
-- ====================================

SELECT 
  '🎯 HALLEN MIT GEMISCHTEN BELÄGEN' as info,
  v.vnr,
  v.name,
  v.club_name,
  v.city,
  STRING_AGG(st.name || ' (' || st.icon_emoji || ')', ', ') as belaege,
  v.court_count as total_courts
FROM venues v
JOIN venue_courts vc ON vc.venue_id = v.id
JOIN surface_types st ON st.id = vc.surface_type_id
GROUP BY v.id, v.vnr, v.name, v.club_name, v.city, v.court_count
HAVING COUNT(DISTINCT vc.surface_type_id) > 1
ORDER BY v.city, v.name;

-- ====================================
-- VERIFICATION: Platz-Details
-- ====================================

SELECT 
  '📋 BEISPIEL: RTHC BAYER PLÄTZE' as info,
  v.name as venue,
  vc.court_number as platz,
  st.name as belag,
  st.icon_emoji as icon,
  st.shoe_recommendation
FROM venues v
JOIN venue_courts vc ON vc.venue_id = v.id
JOIN surface_types st ON st.id = vc.surface_type_id
WHERE v.vnr = '2129'  -- RTHC Bayer
ORDER BY vc.court_number;

