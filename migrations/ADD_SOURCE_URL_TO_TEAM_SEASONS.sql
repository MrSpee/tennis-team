-- Migration: Füge source_url und source_type zu team_seasons hinzu
-- Diese Felder speichern die nuLiga-URL, von der die Gruppe stammt

-- 1. Füge source_url Spalte hinzu
ALTER TABLE team_seasons
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 2. Füge source_type Spalte hinzu
ALTER TABLE team_seasons
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'nuliga';

-- 3. Kommentare hinzufügen
COMMENT ON COLUMN team_seasons.source_url IS 'URL der nuLiga-Übersichtsseite oder Gruppen-URL, von der diese Gruppe stammt';
COMMENT ON COLUMN team_seasons.source_type IS 'Typ der Quelle: nuliga, tvm, manual, etc.';

-- 4. Optional: Migriere bestehende source_url Werte von matchdays zu team_seasons
-- (nur wenn matchdays.source_url gesetzt ist, aber team_seasons.source_url noch NULL ist)
UPDATE team_seasons ts
SET source_url = (
  SELECT DISTINCT md.source_url
  FROM matchdays md
  WHERE md.group_name = ts.group_name
    AND md.season = ts.season
    AND md.league = ts.league
    AND md.source_url IS NOT NULL
  LIMIT 1
),
source_type = COALESCE(
  (
    SELECT DISTINCT md.source_type
    FROM matchdays md
    WHERE md.group_name = ts.group_name
      AND md.season = ts.season
      AND md.league = ts.league
      AND md.source_type IS NOT NULL
    LIMIT 1
  ),
  'nuliga'
)
WHERE ts.source_url IS NULL
  AND EXISTS (
    SELECT 1
    FROM matchdays md
    WHERE md.group_name = ts.group_name
      AND md.season = ts.season
      AND md.league = ts.league
      AND md.source_url IS NOT NULL
  );

