-- ================================================
-- TVM Link zur team_info Tabelle hinzufügen
-- ================================================

-- Neue Spalte für TVM Spielbetrieb Link
ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS tvm_link TEXT;

-- Kommentar zur Spalte
COMMENT ON COLUMN team_info.tvm_link IS 'Link zur TVM Spielbetrieb-Seite für diese Mannschaft/Saison';

-- ================================================
-- FERTIG!
-- ================================================
-- ✅ Jetzt kann pro Saison ein TVM-Link gespeichert werden
-- Beispiel: https://tvm-tennis.de/spielbetrieb/mannschaft/3472127-sv-rg-suerth-1
-- ================================================

-- Prüfe Ergebnis:
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'team_info' 
AND column_name = 'tvm_link';
