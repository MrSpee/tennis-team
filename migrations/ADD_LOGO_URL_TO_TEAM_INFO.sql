-- ============================================================
-- 🎨 LOGO_URL SPALTE ZU CLUB_INFO HINZUFÜGEN
-- ============================================================
-- Fügt logo_url Feld hinzu, um Vereins-Logos zu speichern
-- Logos werden auf Vereinsebene gespeichert, nicht pro Team
-- ============================================================

-- Füge logo_url Spalte zu club_info hinzu (falls nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'club_info' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE club_info 
    ADD COLUMN logo_url TEXT;
    
    RAISE NOTICE '✅ Spalte logo_url zu club_info hinzugefügt';
  ELSE
    RAISE NOTICE 'ℹ️  Spalte logo_url existiert bereits in club_info';
  END IF;
END $$;

-- Kommentar zur Spalte hinzufügen
COMMENT ON COLUMN club_info.logo_url IS 'URL zum Vereins-Logo (Supabase Storage URL oder externe URL)';

-- Optional: Index für Performance (wenn nach Logos gesucht wird)
-- CREATE INDEX IF NOT EXISTS idx_club_info_logo_url ON club_info(logo_url) WHERE logo_url IS NOT NULL;

SELECT '✅ logo_url Spalte erfolgreich zu club_info hinzugefügt.' as status;

