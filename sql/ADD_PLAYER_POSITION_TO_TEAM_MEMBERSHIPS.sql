-- =====================================================
-- ADD_PLAYER_POSITION_TO_TEAM_MEMBERSHIPS.sql
-- Description: Fügt Spalte für Spieler-Position auf der Meldeliste hinzu
--              Die Position zeigt die Platzierung des Spielers auf der aktuellen
--              Meldeliste des Vereins (z.B. "Knollenborg, Leonard (13, LK10,8)" → Position: 13)
--              
--              WICHTIG: Die Position ist saison- und vereinsspezifisch:
--              - Wird am Anfang der Saison festgelegt
--              - Bleibt über die gesamte Saison konstant
--              - Wird in der nächsten Saison neu bestimmt basierend auf LK-Änderungen
--              - Nur für den eigenen Verein relevant (nicht für Gegner)
--              
--              Daher wird die Position in team_memberships gespeichert (pro Spieler, Team, Saison),
--              NICHT in match_results (da sie sich pro Match nicht ändert).
-- Date: 2025-01-XX
-- =====================================================

-- Prüfe ob Spalte bereits existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_memberships' AND column_name = 'meldeliste_position'
  ) THEN
    ALTER TABLE team_memberships 
    ADD COLUMN meldeliste_position INTEGER;
    
    COMMENT ON COLUMN team_memberships.meldeliste_position IS 
      'Position des Spielers auf der Meldeliste des Vereins für diese Saison. Wird am Saisonbeginn festgelegt und bleibt über die Saison konstant.';
    
    RAISE NOTICE '✅ Spalte meldeliste_position zu team_memberships hinzugefügt';
  ELSE
    RAISE NOTICE 'ℹ️  Spalte meldeliste_position existiert bereits';
  END IF;
END $$;

-- Zeige die aktualisierte Struktur
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_memberships' 
  AND column_name = 'meldeliste_position';

