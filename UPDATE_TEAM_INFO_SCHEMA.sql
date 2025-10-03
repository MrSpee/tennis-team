-- ================================================
-- Team-Info Tabelle erweitern um Saison-Support
-- ================================================
-- Jedes Team kann pro Saison unterschiedlich sein:
-- - Winter 25/26: Herren 40, 1. Kreisliga, Gr. 046
-- - Sommer 2025: Herren 40, 2. Kreisliga, Gr. 023
-- ================================================

-- 1. Neue Spalten hinzufügen
-- ================================================

ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS season VARCHAR(10) NOT NULL DEFAULT 'winter';

ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS season_year VARCHAR(20) NOT NULL DEFAULT '24/25';

-- 2. Unique Constraint für Saison
-- ================================================
-- Nur ein Team-Eintrag pro Saison erlaubt

-- Alten Constraint löschen (falls vorhanden)
ALTER TABLE team_info 
DROP CONSTRAINT IF EXISTS team_info_unique_season;

-- Neuen Constraint erstellen
ALTER TABLE team_info
ADD CONSTRAINT team_info_unique_season 
UNIQUE (season, season_year);

-- 3. Index für schnellere Abfragen
-- ================================================

CREATE INDEX IF NOT EXISTS idx_team_info_season 
ON team_info(season, season_year);

-- ================================================
-- FERTIG!
-- ================================================
-- ✅ Jetzt können wir pro Saison separate Teams speichern:
--    - Winter 24/25: Herren 40, 1. Kreisliga, Gr. 046
--    - Sommer 2025:  Herren 40, 2. Kreisliga, Gr. 023
--    - Winter 25/26: Herren 50, 1. Kreisliga, Gr. 048
-- ================================================

-- Prüfe Ergebnis:
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;

-- Zeige aktuelle Einträge:
SELECT * FROM team_info;
