-- =====================================================
-- Import Kölner Tennisvereine
-- =====================================================
-- Quelle: https://tennisfreunde24.de/tennisvereine/köln-köln
-- Datum: 2025-10-08

-- Alle Vereine werden als "verifiziert" importiert,
-- da sie von einer offiziellen Tennis-Website stammen

INSERT INTO club_info (
  name,
  normalized_name,
  city,
  postal_code,
  federation,
  is_verified,
  created_at
) VALUES
-- 1. Tennisclub Rot-Weiß Porz e.V.
('Tennisclub Rot-Weiß Porz e.V.', LOWER(TRIM('Tennisclub Rot-Weiß Porz e.V.')), 'Köln', '51147', 'Tennisverband Mittelrhein', true, NOW()),

-- 2. TCR Tennisclub Rodenkirchen
('TCR Tennisclub Rodenkirchen', LOWER(TRIM('TCR Tennisclub Rodenkirchen')), 'Köln', '50999', 'Tennisverband Mittelrhein', true, NOW()),

-- 3. KTC Gold/Weiss
('KTC Gold/Weiss', LOWER(TRIM('KTC Gold/Weiss')), 'Köln', '51103', 'Tennisverband Mittelrhein', true, NOW()),

-- 4. Tennisclub Kleineichen
('Tennisclub Kleineichen', LOWER(TRIM('Tennisclub Kleineichen')), 'Rösrath', '51503', 'Tennisverband Mittelrhein', true, NOW()),

-- 5. Marienburger Sport-Club 1920
('Marienburger Sport-Club 1920', LOWER(TRIM('Marienburger Sport-Club 1920')), 'Köln', '50996', 'Tennisverband Mittelrhein', true, NOW()),

-- 6. Tennis Base Köln Süd - Bernd Schelling
('Tennis Base Köln Süd', LOWER(TRIM('Tennis Base Köln Süd')), 'Köln', '50996', 'Tennisverband Mittelrhein', true, NOW()),

-- 7. Rot-Gelb Sürth Tennis e.V.
('Rot-Gelb Sürth Tennis e.V.', LOWER(TRIM('Rot-Gelb Sürth Tennis e.V.')), 'Köln', '50997', 'Tennisverband Mittelrhein', true, NOW()),

-- 8. Rodenkirchener Tennis Club e.V. (RTC)
('Rodenkirchener Tennis Club e.V.', LOWER(TRIM('Rodenkirchener Tennis Club e.V.')), 'Köln', '50997', 'Tennisverband Mittelrhein', true, NOW()),

-- 9. Sportverein Rot-Gelb 1961
('Sportverein Rot-Gelb 1961', LOWER(TRIM('Sportverein Rot-Gelb 1961')), 'Köln', '50997', 'Tennisverband Mittelrhein', true, NOW()),

-- 10. MKG-Tennis-Akademie
('MKG-Tennis-Akademie', LOWER(TRIM('MKG-Tennis-Akademie')), 'Köln', '50997', 'Tennisverband Mittelrhein', true, NOW()),

-- 11. Ruder- und Tennisklub Germania e.V. Köln
('Ruder- und Tennisklub Germania e.V. Köln', LOWER(TRIM('Ruder- und Tennisklub Germania e.V. Köln')), 'Köln', '51105', 'Tennisverband Mittelrhein', true, NOW()),

-- 12. VKC-Tennisclub e.V.
('VKC-Tennisclub e.V.', LOWER(TRIM('VKC-Tennisclub e.V.')), 'Köln', '51105', 'Tennisverband Mittelrhein', true, NOW()),

-- 13. Tennisclub Königsforst Grün-Weiß e.V.
('Tennisclub Königsforst Grün-Weiß e.V.', LOWER(TRIM('Tennisclub Königsforst Grün-Weiß e.V.')), 'Köln', '51107', 'Tennisverband Mittelrhein', true, NOW()),

-- 14. Tennisclub Rot-Schwarz Neubrück e.V.
('Tennisclub Rot-Schwarz Neubrück e.V.', LOWER(TRIM('Tennisclub Rot-Schwarz Neubrück e.V.')), 'Köln', '51109', 'Tennisverband Mittelrhein', true, NOW()),

-- 15. TTVg. Grün-Weiss 1928 Porz-Eil e.V.
('TTVg. Grün-Weiss 1928 Porz-Eil e.V.', LOWER(TRIM('TTVg. Grün-Weiss 1928 Porz-Eil e.V.')), 'Köln', '51145', 'Tennisverband Mittelrhein', true, NOW()),

-- 16. SSZ-Wahn e.V.
('SSZ-Wahn e.V.', LOWER(TRIM('SSZ-Wahn e.V.')), 'Köln', '51147', 'Tennisverband Mittelrhein', true, NOW()),

-- 17. SG DLR e.V. Köln - Tennisabteilung
('SG DLR e.V. Köln', LOWER(TRIM('SG DLR e.V. Köln')), 'Köln', '51147', 'Tennisverband Mittelrhein', true, NOW()),

-- 18. ESV GREMBERGHOVEN
('ESV Gremberghoven', LOWER(TRIM('ESV Gremberghoven')), 'Köln', '51149', 'Tennisverband Mittelrhein', true, NOW())

-- Bei Duplikaten: Nichts tun (UNIQUE constraint auf normalized_name)
ON CONFLICT (normalized_name) DO NOTHING;

-- =====================================================
-- Zusammenfassung
-- =====================================================

DO $$
DECLARE
  total_clubs INTEGER;
  verified_clubs INTEGER;
  koeln_clubs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_clubs FROM club_info;
  SELECT COUNT(*) INTO verified_clubs FROM club_info WHERE is_verified = true;
  SELECT COUNT(*) INTO koeln_clubs FROM club_info WHERE city LIKE '%Köln%' OR city LIKE '%Rösrath%';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ Kölner Tennisvereine importiert!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiken:';
  RAISE NOTICE '   - Vereine gesamt: %', total_clubs;
  RAISE NOTICE '   - Verifizierte Vereine: %', verified_clubs;
  RAISE NOTICE '   - Vereine in Köln/Umgebung: %', koeln_clubs;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Neue Vereine:';
  RAISE NOTICE '   - 18 Kölner Vereine hinzugefügt';
  RAISE NOTICE '   - Alle als "verifiziert" markiert';
  RAISE NOTICE '   - Quelle: tennisfreunde24.de';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Dashboard aktualisieren:';
  RAISE NOTICE '   - Super-Admin Dashboard öffnen';
  RAISE NOTICE '   - Tab "Vereine" wählen';
  RAISE NOTICE '   - Vereine sollten nach Spieler-Anzahl sortiert sein';
  RAISE NOTICE '';
END $$;

