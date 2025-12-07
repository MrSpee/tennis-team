-- Füge club_number Spalte zu team_info hinzu
-- Diese Spalte speichert die nuLiga Club-Nummer (z.B. 36154 für VKC Köln)

-- Prüfe ob Spalte bereits existiert und füge sie hinzu falls nicht
DO $$
BEGIN
  -- Füge club_number Spalte hinzu falls nicht vorhanden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_info' AND column_name = 'club_number'
  ) THEN
    ALTER TABLE team_info ADD COLUMN club_number TEXT;
    RAISE NOTICE '✅ Spalte club_number zu team_info hinzugefügt';
  ELSE
    RAISE NOTICE 'ℹ️  Spalte club_number existiert bereits in team_info';
  END IF;
END $$;

-- Index für schnelle Suche nach club_number
CREATE INDEX IF NOT EXISTS idx_team_info_club_number ON team_info(club_number) WHERE club_number IS NOT NULL;

-- Kommentar
COMMENT ON COLUMN team_info.club_number IS 'nuLiga Club-Nummer (z.B. 36154) - wird aus clubPools-URL extrahiert';

