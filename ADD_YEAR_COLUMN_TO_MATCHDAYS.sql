-- Füge 'year' Spalte zu matchdays Tabelle hinzu

ALTER TABLE matchdays 
ADD COLUMN IF NOT EXISTS year VARCHAR(10);

-- Kommentar hinzufügen
COMMENT ON COLUMN matchdays.year IS 'Jahreszahl oder Jahresbereich für die Saison (z.B. "2025/26" für Winter oder "2026" für Sommer)';

-- Beispiel für bestehende Daten (optional):
-- UPDATE matchdays SET year = '2025/26' WHERE season = 'winter' AND EXTRACT(YEAR FROM match_date) = 2025;
-- UPDATE matchdays SET year = '2026' WHERE season = 'summer' AND EXTRACT(YEAR FROM match_date) = 2026;


