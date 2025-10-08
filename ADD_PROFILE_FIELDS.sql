-- ========================================
-- PROFILE FIELDS ERWEITERN
-- ========================================
-- Fügt alle neuen Profile-Felder zur players Tabelle hinzu
-- SICHER: Kann mehrfach ausgeführt werden

-- ========================================
-- SCHRITT 1: Persönliche Felder hinzufügen
-- ========================================

-- Geburtsdatum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE players ADD COLUMN birth_date DATE;
    RAISE NOTICE '✅ birth_date Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ birth_date existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 2: Tennis-Identity Felder hinzufügen
-- ========================================

-- Tennis-Motto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'tennis_motto'
  ) THEN
    ALTER TABLE players ADD COLUMN tennis_motto TEXT;
    RAISE NOTICE '✅ tennis_motto Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ tennis_motto existiert bereits';
  END IF;
END $$;

-- Lieblingsschlag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'favorite_shot'
  ) THEN
    ALTER TABLE players ADD COLUMN favorite_shot TEXT;
    RAISE NOTICE '✅ favorite_shot Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ favorite_shot existiert bereits';
  END IF;
END $$;

-- Bester Tennis-Moment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'best_tennis_memory'
  ) THEN
    ALTER TABLE players ADD COLUMN best_tennis_memory TEXT;
    RAISE NOTICE '✅ best_tennis_memory Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ best_tennis_memory existiert bereits';
  END IF;
END $$;

-- Schlimmster Tennis-Moment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'worst_tennis_memory'
  ) THEN
    ALTER TABLE players ADD COLUMN worst_tennis_memory TEXT;
    RAISE NOTICE '✅ worst_tennis_memory Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ worst_tennis_memory existiert bereits';
  END IF;
END $$;

-- Lieblingsgegner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'favorite_opponent'
  ) THEN
    ALTER TABLE players ADD COLUMN favorite_opponent TEXT;
    RAISE NOTICE '✅ favorite_opponent Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ favorite_opponent existiert bereits';
  END IF;
END $$;

-- Traum-Match
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'dream_match'
  ) THEN
    ALTER TABLE players ADD COLUMN dream_match TEXT;
    RAISE NOTICE '✅ dream_match Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ dream_match existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 3: Fun & Aberglaube Felder hinzufügen
-- ========================================

-- Fun Fact
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'fun_fact'
  ) THEN
    ALTER TABLE players ADD COLUMN fun_fact TEXT;
    RAISE NOTICE '✅ fun_fact Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ fun_fact existiert bereits';
  END IF;
END $$;

-- Aberglaube
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'superstition'
  ) THEN
    ALTER TABLE players ADD COLUMN superstition TEXT;
    RAISE NOTICE '✅ superstition Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ superstition existiert bereits';
  END IF;
END $$;

-- Pre-Match Routine
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'pre_match_routine'
  ) THEN
    ALTER TABLE players ADD COLUMN pre_match_routine TEXT;
    RAISE NOTICE '✅ pre_match_routine Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ pre_match_routine existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 4: Kontakt & Notfall Felder hinzufügen
-- ========================================

-- Adresse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'address'
  ) THEN
    ALTER TABLE players ADD COLUMN address TEXT;
    RAISE NOTICE '✅ address Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ address existiert bereits';
  END IF;
END $$;

-- Notfallkontakt
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'emergency_contact'
  ) THEN
    ALTER TABLE players ADD COLUMN emergency_contact TEXT;
    RAISE NOTICE '✅ emergency_contact Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ emergency_contact existiert bereits';
  END IF;
END $$;

-- Notfall-Telefon
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'emergency_phone'
  ) THEN
    ALTER TABLE players ADD COLUMN emergency_phone TEXT;
    RAISE NOTICE '✅ emergency_phone Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ emergency_phone existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 5: Notizen hinzufügen
-- ========================================

-- Persönliche Notizen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'notes'
  ) THEN
    ALTER TABLE players ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ notes Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ notes existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 6: RLS Policies erweitern
-- ========================================

-- Stelle sicher, dass alle neuen Felder in RLS Policies enthalten sind
-- (Die bestehenden Policies sollten automatisch alle Spalten abdecken)

-- ========================================
-- SCHRITT 7: Zusammenfassung
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '🎉 PROFILE FIELDS SETUP ABGESCHLOSSEN!';
  RAISE NOTICE '📋 Hinzugefügte Felder:';
  RAISE NOTICE '   • Persönlich: birth_date';
  RAISE NOTICE '   • Tennis-Identity: tennis_motto, favorite_shot, best_tennis_memory, worst_tennis_memory, favorite_opponent, dream_match';
  RAISE NOTICE '   • Fun & Aberglaube: fun_fact, superstition, pre_match_routine';
  RAISE NOTICE '   • Kontakt & Notfall: address, emergency_contact, emergency_phone';
  RAISE NOTICE '   • Notizen: notes';
  RAISE NOTICE '✅ Alle Felder sind jetzt in der players Tabelle verfügbar!';
END $$;
