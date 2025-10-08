-- =====================================================
-- PHASE 2: TVM Starter-Set Import
-- =====================================================
-- Import von 50+ Tennis-Vereinen aus dem TVM-Bereich
-- (Tennis-Verband Mittelrhein)
-- Quelle: https://tvm-tennis.de/vereine/

BEGIN;

-- =====================================================
-- TVM Vereine - Raum Köln & Umgebung
-- =====================================================

INSERT INTO club_info (name, city, postal_code, federation, region, state, data_source, is_verified, verification_date)
VALUES
  -- Köln
  ('TC Rot-Weiss Köln', 'Köln', '50668', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('Kölner THC Stadion Rot-Weiss', 'Köln', '50933', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Grün-Weiss Köln', 'Köln', '50823', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('VKC Köln', 'Köln', '50937', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Blau-Weiss Köln', 'Köln', '50825', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Schwarz-Gelb Köln', 'Köln', '50997', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('Rochusclub Köln', 'Köln', '50996', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Köln-Weiden', 'Köln', '50996', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Porz', 'Köln', '51149', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Lindenthal', 'Köln', '50935', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Nippes', 'Köln', '50733', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Dellbrück', 'Köln', '51069', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('SV Rot-Gelb Sürth', 'Köln', '50999', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Mühlheim', 'Köln', '51063', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Zollstock', 'Köln', '50969', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Bonn
  ('TC Blau-Weiss Bonn', 'Bonn', '53113', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('Bonner THV', 'Bonn', '53115', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Schwarz-Rot Bonn', 'Bonn', '53119', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Bad Godesberg', 'Bonn', '53177', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Beuel', 'Bonn', '53225', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Rot-Weiss Bonn', 'Bonn', '53229', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Leverkusen
  ('Bayer 04 Leverkusen', 'Leverkusen', '51373', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Rot-Weiss Leverkusen', 'Leverkusen', '51375', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Opladen', 'Leverkusen', '51379', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Rheindorf', 'Leverkusen', '51371', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Bergisch Gladbach
  ('TC Grün-Weiss Refrath', 'Bergisch Gladbach', '51427', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Bergisch Gladbach', 'Bergisch Gladbach', '51465', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Bensberg', 'Bergisch Gladbach', '51429', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Hand', 'Bergisch Gladbach', '51469', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Hürth
  ('TC Hürth', 'Hürth', '50354', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Efferen', 'Hürth', '50354', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Hermülheim', 'Hürth', '50354', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Frechen
  ('TC Frechen', 'Frechen', '50226', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Königsdorf', 'Frechen', '50226', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Brühl
  ('TC Rot-Weiss Brühl', 'Brühl', '50321', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Badorf', 'Brühl', '50321', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Wesseling
  ('TC Wesseling', 'Wesseling', '50389', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Urfeld', 'Wesseling', '50389', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Pulheim
  ('TC Pulheim', 'Pulheim', '50259', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Stommeln', 'Pulheim', '50259', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Kerpen
  ('TC Kerpen', 'Kerpen', '50171', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Sindorf', 'Kerpen', '50171', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Troisdorf
  ('TC Troisdorf', 'Troisdorf', '53840', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Sieglar', 'Troisdorf', '53844', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Siegburg
  ('TC Siegburg', 'Siegburg', '53721', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Wolsdorf', 'Siegburg', '53721', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Sankt Augustin
  ('TC Sankt Augustin', 'Sankt Augustin', '53757', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Niederpleis', 'Sankt Augustin', '53757', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Niederkassel
  ('TC Niederkassel', 'Niederkassel', '53859', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Lülsdorf', 'Niederkassel', '53859', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Overath
  ('TC Overath', 'Overath', '51491', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Rösrath
  ('TC Rösrath', 'Rösrath', '51503', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  
  -- Erftstadt
  ('TC Erftstadt', 'Erftstadt', '50374', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW()),
  ('TC Lechenich', 'Erftstadt', '50374', 'TVM', 'Mittelrhein', 'NRW', 'tvm_import', true, NOW())
  
ON CONFLICT (normalized_name) DO NOTHING;

COMMIT;

-- =====================================================
-- Statistik ausgeben
-- =====================================================
DO $$
DECLARE
  club_count INTEGER;
  tvm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO club_count FROM club_info;
  SELECT COUNT(*) INTO tvm_count FROM club_info WHERE federation = 'TVM';
  
  RAISE NOTICE '✅ TVM Starter-Set erfolgreich importiert!';
  RAISE NOTICE '📊 Gesamt Vereine in Datenbank: %', club_count;
  RAISE NOTICE '🎾 TVM Vereine: %', tvm_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Nächster Schritt: OnboardingFlow.jsx mit Autocomplete erweitern';
END $$;

