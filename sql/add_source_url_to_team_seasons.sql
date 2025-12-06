-- Füge source_url und source_type Spalten zu team_seasons hinzu (falls nicht vorhanden)
-- Diese Spalten speichern die Team-Portrait-URL für automatisches Laden von Meldelisten

-- Prüfe ob Spalten bereits existieren und füge sie hinzu falls nicht
DO $$
BEGIN
  -- Füge source_url Spalte hinzu falls nicht vorhanden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_seasons' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE team_seasons ADD COLUMN source_url TEXT;
    RAISE NOTICE '✅ Spalte source_url zu team_seasons hinzugefügt';
  ELSE
    RAISE NOTICE 'ℹ️  Spalte source_url existiert bereits in team_seasons';
  END IF;

  -- Füge source_type Spalte hinzu falls nicht vorhanden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_seasons' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE team_seasons ADD COLUMN source_type TEXT;
    RAISE NOTICE '✅ Spalte source_type zu team_seasons hinzugefügt';
  ELSE
    RAISE NOTICE 'ℹ️  Spalte source_type existiert bereits in team_seasons';
  END IF;
END $$;

-- Index für schnelle Suche nach source_url
CREATE INDEX IF NOT EXISTS idx_team_seasons_source_url ON team_seasons(source_url) WHERE source_url IS NOT NULL;

-- Kommentare
COMMENT ON COLUMN team_seasons.source_url IS 'URL zur nuLiga Team-Portrait-Seite für automatisches Laden von Meldelisten';
COMMENT ON COLUMN team_seasons.source_type IS 'Typ der Quelle (z.B. "nuliga")';

