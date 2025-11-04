-- =====================================================
-- Migration: Add bundesland column to club_info
-- Description: Fügt Bundesland-Spalte zur club_info Tabelle hinzu
--              für bessere Organisation deutscher Tennisvereine
-- Date: 2025-01-XX
-- =====================================================

-- Add bundesland column to club_info
ALTER TABLE club_info
ADD COLUMN IF NOT EXISTS bundesland TEXT;

-- Add comment to column
COMMENT ON COLUMN club_info.bundesland IS 'Bundesland des Vereins (basierend auf Tennisverband)';

-- Create index for faster filtering by bundesland
CREATE INDEX IF NOT EXISTS idx_club_info_bundesland 
ON club_info(bundesland);

-- Update existing clubs with bundesland based on federation
-- (Optional: Nur ausführen wenn bestehende Daten aktualisiert werden sollen)

-- Baden-Württemberg
UPDATE club_info 
SET bundesland = 'Baden-Württemberg' 
WHERE federation IN ('BTV-Baden', 'WTB') 
AND bundesland IS NULL;

-- Bayern
UPDATE club_info 
SET bundesland = 'Bayern' 
WHERE federation = 'BTV' 
AND bundesland IS NULL;

-- Berlin / Brandenburg
UPDATE club_info 
SET bundesland = 'Berlin/Brandenburg' 
WHERE federation = 'TVBB' 
AND bundesland IS NULL;

-- Hamburg
UPDATE club_info 
SET bundesland = 'Hamburg' 
WHERE federation = 'HTV-Hamburg' 
AND bundesland IS NULL;

-- Hessen
UPDATE club_info 
SET bundesland = 'Hessen' 
WHERE federation = 'HTV-Hessen' 
AND bundesland IS NULL;

-- Mecklenburg-Vorpommern
UPDATE club_info 
SET bundesland = 'Mecklenburg-Vorpommern' 
WHERE federation = 'TMV' 
AND bundesland IS NULL;

-- Niedersachsen / Bremen
UPDATE club_info 
SET bundesland = 'Niedersachsen/Bremen' 
WHERE federation = 'TNB' 
AND bundesland IS NULL;

-- Nordrhein-Westfalen
UPDATE club_info 
SET bundesland = 'Nordrhein-Westfalen' 
WHERE federation IN ('TVM', 'TVN', 'WTV') 
AND bundesland IS NULL;

-- Rheinland-Pfalz
UPDATE club_info 
SET bundesland = 'Rheinland-Pfalz' 
WHERE federation = 'TRP' 
AND bundesland IS NULL;

-- Saarland
UPDATE club_info 
SET bundesland = 'Saarland' 
WHERE federation = 'STB' 
AND bundesland IS NULL;

-- Sachsen
UPDATE club_info 
SET bundesland = 'Sachsen' 
WHERE federation = 'STV' 
AND bundesland IS NULL;

-- Sachsen-Anhalt
UPDATE club_info 
SET bundesland = 'Sachsen-Anhalt' 
WHERE federation = 'TSA' 
AND bundesland IS NULL;

-- Schleswig-Holstein
UPDATE club_info 
SET bundesland = 'Schleswig-Holstein' 
WHERE federation = 'TSH' 
AND bundesland IS NULL;

-- Thüringen
UPDATE club_info 
SET bundesland = 'Thüringen' 
WHERE federation = 'TTV' 
AND bundesland IS NULL;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check how many clubs have bundesland set
SELECT 
  bundesland,
  COUNT(*) as count
FROM club_info
GROUP BY bundesland
ORDER BY count DESC;

-- Check clubs without bundesland
SELECT 
  id,
  name,
  city,
  federation,
  bundesland
FROM club_info
WHERE bundesland IS NULL;


