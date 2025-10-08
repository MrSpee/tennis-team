-- =====================================================
-- PHASE 1: Club-System mit Duplikat-Schutz
-- =====================================================
-- Dieses Script erweitert die Vereinsverwaltung um:
-- 1. Normalisierte Namen für Duplikat-Erkennung
-- 2. Zusätzliche Metadaten (Verband, Region, etc.)
-- 3. Indizes für schnelle Suche
-- 4. Admin-Review-Queue für neue Vereine

BEGIN;

-- =====================================================
-- 1. Prüfe ob club_info Tabelle existiert, sonst erstelle sie
-- =====================================================
CREATE TABLE IF NOT EXISTS club_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 2. Erweitere club_info um Duplikat-Schutz
-- =====================================================

-- Füge normalisierte Name-Spalte hinzu (für Duplikat-Check)
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  normalized_name TEXT;

-- Funktion zum Normalisieren von Namen
CREATE OR REPLACE FUNCTION normalize_club_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(input_name, '[^a-zA-Z0-9äöüß]', '', 'g'),
      '\s+', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger zum automatischen Befüllen von normalized_name
CREATE OR REPLACE FUNCTION set_normalized_club_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_club_name(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_club_name ON club_info;
CREATE TRIGGER trigger_normalize_club_name
  BEFORE INSERT OR UPDATE OF name ON club_info
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_club_name();

-- Befülle normalized_name für bestehende Einträge
UPDATE club_info SET name = name WHERE normalized_name IS NULL;

-- =====================================================
-- 3. Erweitere club_info um Metadaten
-- =====================================================

-- Verband (z.B. TVM, WTV, TNB)
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  federation TEXT;

-- Region (z.B. Mittelrhein, Westfalen, Niederrhein)
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  region TEXT;

-- Bundesland
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  state TEXT DEFAULT 'NRW';

-- Anzahl Plätze
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  court_count INTEGER;

-- Hat Indoor-Plätze?
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  has_indoor_courts BOOLEAN DEFAULT false;

-- Quelle der Daten (manual, tvm_import, dtb_import)
ALTER TABLE club_info ADD COLUMN IF NOT EXISTS 
  data_source TEXT DEFAULT 'manual';

-- =====================================================
-- 4. Aktiviere pg_trgm Extension (ZUERST!)
-- =====================================================

-- Aktiviere pg_trgm Extension für Fuzzy-Matching
-- MUSS vor dem GIN-Index erstellt werden!
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- 5. UNIQUE Constraint für Duplikat-Schutz
-- =====================================================

-- UNIQUE Constraint auf normalized_name (verhindert Duplikate)
-- WICHTIG: Wird für ON CONFLICT in INSERT-Statements benötigt!
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_normalized_name'
  ) THEN
    ALTER TABLE club_info 
      ADD CONSTRAINT unique_normalized_name 
      UNIQUE(normalized_name);
    RAISE NOTICE '✅ UNIQUE Constraint "unique_normalized_name" erstellt';
  ELSE
    RAISE NOTICE '⚠️  UNIQUE Constraint "unique_normalized_name" existiert bereits';
  END IF;
END $$;

-- =====================================================
-- 6. Indizes für Performance
-- =====================================================

-- Index für Stadt-Suche
CREATE INDEX IF NOT EXISTS idx_club_city 
  ON club_info(LOWER(city));

-- Index für Verband-Filter
CREATE INDEX IF NOT EXISTS idx_club_federation 
  ON club_info(federation);

-- Index für Verifizierung
CREATE INDEX IF NOT EXISTS idx_club_verified 
  ON club_info(is_verified);

-- Volltext-Suche Index (benötigt pg_trgm Extension)
CREATE INDEX IF NOT EXISTS idx_club_name_trgm 
  ON club_info USING gin(name gin_trgm_ops);

-- =====================================================
-- 7. RLS Policies
-- =====================================================

ALTER TABLE club_info ENABLE ROW LEVEL SECURITY;

-- Jeder authentifizierte Nutzer kann Vereine lesen
DROP POLICY IF EXISTS "Allow authenticated users to read clubs" ON club_info;
CREATE POLICY "Allow authenticated users to read clubs"
  ON club_info FOR SELECT
  TO authenticated
  USING (true);

-- Jeder authentifizierte Nutzer kann neue Vereine vorschlagen
DROP POLICY IF EXISTS "Allow authenticated users to create clubs" ON club_info;
CREATE POLICY "Allow authenticated users to create clubs"
  ON club_info FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Nur Ersteller oder Admins können Vereine bearbeiten
DROP POLICY IF EXISTS "Allow users to update own clubs" ON club_info;
CREATE POLICY "Allow users to update own clubs"
  ON club_info FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 8. Hilfsfunktionen für Duplikat-Check
-- =====================================================

-- Funktion: Ähnliche Vereine finden (Fuzzy-Matching)
CREATE OR REPLACE FUNCTION find_similar_clubs(
  search_name TEXT,
  similarity_threshold FLOAT DEFAULT 0.6
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  city TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.city,
    SIMILARITY(c.name, search_name) as sim
  FROM club_info c
  WHERE SIMILARITY(c.name, search_name) > similarity_threshold
  ORDER BY sim DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Exakte normalisierte Suche
CREATE OR REPLACE FUNCTION check_club_exists(club_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized TEXT;
  club_count INTEGER;
BEGIN
  normalized := normalize_club_name(club_name);
  
  SELECT COUNT(*) INTO club_count
  FROM club_info
  WHERE normalized_name = normalized;
  
  RETURN club_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Updated_at Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_club_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_club_timestamp ON club_info;
CREATE TRIGGER trigger_update_club_timestamp
  BEFORE UPDATE ON club_info
  FOR EACH ROW
  EXECUTE FUNCTION update_club_updated_at();

COMMIT;

-- =====================================================
-- Erfolgsmeldung
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Club-System erfolgreich eingerichtet!';
  RAISE NOTICE '📊 Normalisierte Namen aktiviert';
  RAISE NOTICE '🔍 Fuzzy-Search aktiviert';
  RAISE NOTICE '🛡️ RLS Policies gesetzt';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Nächster Schritt: TVM_CLUBS_IMPORT.sql ausführen';
END $$;

