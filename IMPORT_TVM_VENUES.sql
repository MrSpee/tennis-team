-- ============================================
-- IMPORT TVM MITTELRHEIN VENUES
-- ============================================
-- Importiert Hallen aus TVM Hallenplan
-- Basierend auf: hallenplan-tennisverband-mittelrhein-wintersaison-2024-2025.pdf
-- ============================================

-- WICHTIG: Führe zuerst CREATE_VENUES_SURFACE_SYSTEM.sql aus!

DO $$
DECLARE
  v_teppich_id UUID;
  v_granulat_id UUID;
  v_asche_id UUID;
  v_laykold_id UUID;
  v_rebound_id UUID;
  v_struktur_id UUID;
  v_hartcourt_id UUID;
  v_imported INTEGER := 0;
BEGIN
  
  -- Hole Surface Type IDs
  SELECT id INTO v_teppich_id FROM surface_types WHERE name = 'Teppich';
  SELECT id INTO v_granulat_id FROM surface_types WHERE name = 'Granulat';
  SELECT id INTO v_asche_id FROM surface_types WHERE name = 'Asche';
  SELECT id INTO v_laykold_id FROM surface_types WHERE name = 'Laykold';
  SELECT id INTO v_rebound_id FROM surface_types WHERE name = 'Rebound Ace';
  
  -- Struktur = Kunststoff
  SELECT id INTO v_struktur_id FROM surface_types WHERE name = 'Kunststoff';
  
  -- Hartcourt = DecoTurf oder create new
  SELECT id INTO v_hartcourt_id FROM surface_types WHERE name ILIKE '%hartcourt%';
  IF v_hartcourt_id IS NULL THEN
    v_hartcourt_id := v_rebound_id;  -- Fallback
  END IF;
  
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '🔧 IMPORTIERE TVM MITTELRHEIN VENUES';
  RAISE NOTICE '🔧 ============================================';
  RAISE NOTICE '';
  
  -- ====================================
  -- REGION: AACHEN
  -- ====================================
  
  -- 1002: PTSV Aachen
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1002',
    'PTSV Aachen',
    'PTSV Aachen',
    'Eulersweg 15',
    '52070',
    'Aachen',
    'Mittelrhein',
    'kontakt@ptsv-aachen.de',
    '0241-911903',
    4,
    (SELECT id FROM surface_types WHERE name ILIKE '%Kunststoff%' OR name = 'Rebound Ace' LIMIT 1),  -- Hartcort=SCHÖPP®-Proflex® Elite
    'Hartcort=SCHÖPP®-Proflex® Elite',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1004: TK Blau-Weiss Aachen
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1004',
    'TK Blau-Weiss Aachen',
    'TK Blau-Weiss Aachen',
    'Luxemburger Ring 62',
    '52066',
    'Aachen',
    'Mittelrhein',
    'kontakt@blau-weiss-aachen.de',
    '0241-62502',
    2,
    v_asche_id,
    'Asche/Traglufthalle',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1006: TC Grün-Weiß Aachen
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1006',
    'TC Grün-Weiß Aachen',
    'TC Grün-Weiß Aachen',
    'Brüsseler Ring 60',
    '52074',
    'Aachen',
    'Mittelrhein',
    'info@tc-gruen-weiss.de',
    '0241-77879',
    6,
    v_rebound_id,
    'Rebound Ace',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1015: Baesweiler TC
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1015',
    'Baesweiler TC',
    'Baesweiler TC',
    'Parkstr./Sportpark',
    '52499',
    'Baesweiler',
    'Mittelrhein',
    'info@baesweiler-tennis-club.de',
    '02401-4000',
    4,
    v_struktur_id,
    'Strukturvelour Teppichboden',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1049: TG Rot-Weiß Düren
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1049',
    'TG Rot-Weiß Düren',
    'TG Rot-Weiß Düren',
    'An der Kuhbrücke 18',
    '52355',
    'Düren',
    'Mittelrhein',
    'tennis@rot-weiss.info',
    '02421-53868',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1083: TV Blau-Weiß Jülich
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1083',
    'TV Blau-Weiß Jülich',
    'TV Blau-Weiß Jülich',
    'Stadionweg',
    '52428',
    'Jülich',
    'Mittelrhein',
    'm.meurer@blau-weiss-juelich.de',
    '02461 343025',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1166: VfR Übach-Palenberg
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1166',
    'VfR Übach-Palenberg',
    'VfR Übach-Palenberg',
    'Am Bucksberg',
    '52531',
    'Übach-Palenberg',
    'Mittelrhein',
    'info@tc-uebach-palenberg.de',
    '02451-45454',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1257: TC Aachen-Brand
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1257',
    'TC Aachen-Brand',
    'TC Aachen-Brand',
    'Rombachstr. 109',
    '52078',
    'Aachen',
    'Mittelrhein',
    'info@tc-aachen-brand.de',
    '0241-528130',
    4,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 1275: Aachen-Laurensberger TC
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '1275',
    'Aachen-Laurensberger TC',
    'Aachen-Laurensberger TC',
    'Schlottfelderstr. 7',
    '52074',
    'Aachen',
    'Mittelrhein',
    'vorstand@altc.de',
    '0241-176778',
    2,
    v_asche_id,
    'Asche/Traglufthalle',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- ====================================
  -- REGION: KÖLN
  -- ====================================
  
  -- 2091: Kölner HTC BW
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2091',
    'Kölner HTC BW',
    'Kölner HTC BW',
    'Neuenhöfer Allee 69',
    '50935',
    'Köln',
    'Mittelrhein',
    'info@blau-weiss-koeln.de',
    '0221-433567',
    2,
    v_asche_id,
    'Asche/Traglufthalle',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2092: Kölner KHT Schwarz-Weiss
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2092',
    'Kölner KHT Schwarz-Weiss',
    'Kölner KHT SW',
    'Kuhweg 20',
    '50735',
    'Köln',
    'Mittelrhein',
    'buero@kkht.de',
    '0221-976221',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2093: Kölner TC'71
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2093',
    'Kölner TC''71',
    'Kölner TC''71',
    'Merianstr. 2-4',
    '50769',
    'Köln',
    'Mittelrhein',
    'ktc71@online.de',
    NULL,
    4,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2095: KTC Weidenpescher Park
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2095',
    'KTC Weidenpescher Park',
    'KTC Weidenpescher Park',
    'Rennbahnstr. 56',
    '50737',
    'Köln',
    'Mittelrhein',
    'sportwart@weidenpescher-park.de',
    '0221-743958',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2097: Kölner THC Stadion Rot-Weiß (GEMISCHT!)
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2097',
    'Kölner THC Stadion Rot-Weiß',
    'KölnerTHC Stadion RW',
    'Olympiaweg 9',
    '50933',
    'Köln',
    'Mittelrhein',
    'karimi@rot-weiss-koeln.de',
    NULL,
    6,
    v_laykold_id,
    '1+2 Laykold Gran Slam, 4+5 Asche',  -- ✅ GEMISCHT!
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2098: Marienburger SC (GEMISCHT!)
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2098',
    'Marienburger SC',
    'Marienburger SC',
    'Schillingsrotter Str. 99',
    '50996',
    'Köln',
    'Mittelrhein',
    'sekretariat@msc-koeln.de',
    NULL,
    4,
    v_teppich_id,
    'Teppich 1-4, Asche 14-15',  -- ✅ GEMISCHT!
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2102: TC Köln-Worringen
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2102',
    'TC Köln-Worringen',
    'TC Köln-Worringen',
    'Further Weg 21',
    '50769',
    'Köln',
    'Mittelrhein',
    'tcworringen@t-online.de',
    '0221-786828',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2106: TC Ford Köln
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2106',
    'TC Ford Köln',
    'TC Ford Köln',
    'Scheibenstr. 23',
    '50737',
    'Köln',
    'Mittelrhein',
    'tcfk@netcologne.de',
    '0221-3907570',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2120: TV Dellbrück
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2120',
    'TV Dellbrück',
    'TV Dellbrück',
    'Mielenforster Str. 40',
    '51069',
    'Köln',
    'Mittelrhein',
    'info@tv-dellbrueck.de',
    '0221-6800555',
    3,
    v_asche_id,
    '1-3 Asche(Tragluft)',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- ====================================
  -- REGION: LEVERKUSEN
  -- ====================================
  
  -- 2129: RTHC Bayer Leverkusen (GEMISCHT!)
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2129',
    'TH Schloß Morsbroich',
    'RTHC Bayer Leverkusen',
    'Knochenbergsweg',
    '51373',
    'Leverkusen',
    'Mittelrhein',
    'tennis@rthc.de',
    '0214-32620',
    7,
    v_teppich_id,
    '1-4 Teppich, 5+6 Laykold Gran Slam',  -- ✅ GEMISCHT!
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 2132: TG Leverkusen
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '2132',
    'TG Leverkusen',
    'TG Leverkusen',
    'von-Diergardt-Str. 25',
    '51375',
    'Leverkusen',
    'Mittelrhein',
    'tgleverkusen@gmx.de',
    '0214-55247',
    4,
    v_struktur_id,
    'Strukturvelour Teppichboden',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- ====================================
  -- REGION: BONN
  -- ====================================
  
  -- 3029: Bonner THV (GEMISCHT!)
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '3029',
    'Bonner THV',
    'Bonner THV',
    'Christian-Miesen-Str. 1',
    '53129',
    'Bonn',
    'Mittelrhein',
    'info@bthv.de',
    NULL,
    8,
    v_teppich_id,
    '1-4 Teppich; 5-8 Asche(Traglufthalle)',  -- ✅ GEMISCHT!
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  -- 3032: HTC Schwarz-Weiss Bonn
  INSERT INTO venues (vnr, name, club_name, street, postal_code, city, region, email, phone, court_count, primary_surface_id, surface_details, indoor, is_verified)
  VALUES (
    '3032',
    'HTC Schwarz-Weiss Bonn',
    'HTC Schwarz-Weiss Bonn',
    'Saalestr. 30',
    '53127',
    'Bonn',
    'Mittelrhein',
    'gst@htc-bonn.de',
    '0228-284090',
    3,
    v_teppich_id,
    'Teppich',
    true,
    true
  ) ON CONFLICT (vnr) DO NOTHING;
  
  GET DIAGNOSTICS v_imported = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ % VENUES IMPORTIERT!', v_imported;
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 BELAG-VERTEILUNG:';
  RAISE NOTICE '   🟦 Teppich: % Hallen', (SELECT COUNT(*) FROM venues WHERE primary_surface_id = v_teppich_id);
  RAISE NOTICE '   🟨 Granulat: % Hallen', (SELECT COUNT(*) FROM venues WHERE primary_surface_id = v_granulat_id);
  RAISE NOTICE '   🟧 Asche: % Hallen', (SELECT COUNT(*) FROM venues WHERE primary_surface_id = v_asche_id);
  RAISE NOTICE '   💚 Laykold: % Hallen', (SELECT COUNT(*) FROM venues WHERE primary_surface_id = v_laykold_id);
  RAISE NOTICE '   💙 Rebound Ace: % Hallen', (SELECT COUNT(*) FROM venues WHERE primary_surface_id = v_rebound_id);
  RAISE NOTICE '';
  
END $$;

-- ====================================
-- VERIFICATION
-- ====================================

SELECT 
  '✅ IMPORTIERTE VENUES' as check_type,
  v.vnr,
  v.name,
  v.club_name,
  v.city,
  st.name as surface,
  st.icon_emoji,
  v.surface_details,
  v.court_count
FROM venues v
LEFT JOIN surface_types st ON st.id = v.primary_surface_id
ORDER BY v.city, v.name;

