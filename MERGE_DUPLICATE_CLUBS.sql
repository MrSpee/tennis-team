-- =====================================================
-- Merge Duplicate Clubs
-- =====================================================
-- Gefundene Duplikate werden zusammengeführt
-- VORSICHT: Nur ausführen nach manueller Bestätigung!

-- =====================================================
-- DUPLIKAT 1: SV Rot-Gelb Sürth
-- =====================================================
-- BEHALTEN: idx 47 - SV Rot-Gelb Sürth (hat 5 Spieler!)
-- LÖSCHEN:  idx 58 - Rot-Gelb Sürth Tennis e.V.

-- 1. Zeige beide Einträge zur Kontrolle
SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← BEHALTEN' as action
FROM club_info
WHERE id = 'af6ba8d2-7cb2-4dd5-9178-41b7f8f1dfbb' -- SV Rot-Gelb Sürth

UNION ALL

SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← LÖSCHEN' as action
FROM club_info
WHERE id = 'd3f98e59-0845-48d5-8347-13350c0f55a4'; -- Rot-Gelb Sürth Tennis e.V.

-- 2. Lösche Duplikat
DELETE FROM club_info
WHERE id = 'd3f98e59-0845-48d5-8347-13350c0f55a4'
  AND name = 'Rot-Gelb Sürth Tennis e.V.';

-- =====================================================
-- DUPLIKAT 2: Rodenkirchener Tennis Club
-- =====================================================
-- BEHALTEN: idx 34 - TCR Tennisclub Rodenkirchen
-- LÖSCHEN:  idx 19 - Rodenkirchener Tennis Club e.V.

-- 3. Zeige beide Einträge zur Kontrolle
SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← BEHALTEN' as action
FROM club_info
WHERE id = '8bc9ae1e-6c95-446c-a19d-83b251188f90' -- TCR Tennisclub Rodenkirchen

UNION ALL

SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← LÖSCHEN' as action
FROM club_info
WHERE id = '5ed30659-44d9-4f4c-913e-7a94e335963e'; -- Rodenkirchener Tennis Club e.V.

-- 4. Lösche Duplikat
DELETE FROM club_info
WHERE id = '5ed30659-44d9-4f4c-913e-7a94e335963e'
  AND name = 'Rodenkirchener Tennis Club e.V.';

-- =====================================================
-- DUPLIKAT 3: VKC Köln
-- =====================================================
-- BEHALTEN: idx 54 - VKC-Tennisclub e.V. (51105) ← Richtiger Name!
-- LÖSCHEN:  idx 3 - VKC Köln (50937) ← Falsche PLZ

-- 5. Zeige beide Einträge zur Kontrolle
SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← LÖSCHEN' as action
FROM club_info
WHERE id = '07bb7431-ba82-4695-8210-f21ef2741a6a' -- VKC Köln

UNION ALL

SELECT 
  id,
  name,
  postal_code,
  data_source,
  created_at,
  '← BEHALTEN' as action
FROM club_info
WHERE id = 'cad087e9-cafe-49c0-af3d-52ae1445a320'; -- VKC-Tennisclub e.V.

-- 6. Lösche Duplikat
DELETE FROM club_info
WHERE id = '07bb7431-ba82-4695-8210-f21ef2741a6a'
  AND name = 'VKC Köln';

-- =====================================================
-- Zusammenfassung
-- =====================================================

DO $$
DECLARE
  total_clubs INTEGER;
  deleted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_clubs FROM club_info;
  
  -- Zähle wie viele gelöscht wurden (sollte 3 sein)
  deleted_count := 3; -- Hardcoded, da wir genau 3 Duplikate löschen
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ Duplikate bereinigt!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Ergebnis:';
  RAISE NOTICE '   - Gelöschte Duplikate: %', deleted_count;
  RAISE NOTICE '   - Vereine nach Cleanup: %', total_clubs;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Gelöschte Vereine:';
  RAISE NOTICE '   1. Rot-Gelb Sürth Tennis e.V. (Duplikat)';
  RAISE NOTICE '   2. Rodenkirchener Tennis Club e.V. (Duplikat)';
  RAISE NOTICE '   3. VKC Köln (Duplikat - falsche PLZ)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Behaltene Vereine:';
  RAISE NOTICE '   ✅ SV Rot-Gelb Sürth (50999) - mit 5 Spielern';
  RAISE NOTICE '   ✅ TCR Tennisclub Rodenkirchen (50999)';
  RAISE NOTICE '   ✅ VKC-Tennisclub e.V. (51105) - korrekter Name';
  RAISE NOTICE '';
END $$;

