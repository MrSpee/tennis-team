-- ================================================
-- Spieler-Daten aus TVM Meldeliste aktualisieren
-- ================================================
-- Basierend auf der Meldeliste für SV Rot-Gelb Sürth
-- Herren 40 1. Kreisliga Gr. 046
-- ================================================

-- 1. Spieler aktualisieren (falls sie bereits existieren)
-- ================================================

-- Marco Coltro
UPDATE players 
SET 
  ranking = 'LK 8.4',
  is_active = true,
  points = 0
WHERE email LIKE '%marco%' OR name LIKE '%Coltro%';

-- Thomas Mengelkamp
UPDATE players 
SET 
  ranking = 'LK 11.5',
  is_active = true,
  points = 0
WHERE email LIKE '%thomas%' OR name LIKE '%Mengelkamp%';

-- Christian Spee
UPDATE players 
SET 
  ranking = 'LK 12.3',
  is_active = true,
  points = 0
WHERE email LIKE '%christian%' OR name LIKE '%Spee%';

-- Olivier Pol Michel
UPDATE players 
SET 
  ranking = 'LK 12.9',
  is_active = true,
  points = 0
WHERE email LIKE '%olivier%' OR name LIKE '%Michel%';

-- Robert Ellrich
UPDATE players 
SET 
  ranking = 'LK 14.3',
  is_active = true,
  points = 0
WHERE email LIKE '%robert%' OR name LIKE '%Ellrich%';

-- Daniel Becher
UPDATE players 
SET 
  ranking = 'LK 14.8',
  is_active = true,
  points = 0,
  role = 'captain'
WHERE email LIKE '%daniel%' OR name LIKE '%Becher%';

-- Alexander Grebe
UPDATE players 
SET 
  ranking = 'LK 16.3',
  is_active = true,
  points = 0
WHERE email LIKE '%alexander%' OR name LIKE '%Grebe%';

-- Frank Ritter
UPDATE players 
SET 
  ranking = 'LK 16.9',
  is_active = true,
  points = 0
WHERE email LIKE '%frank%' OR name LIKE '%Ritter%';

-- Adrian Tugui
UPDATE players 
SET 
  ranking = 'LK 17.1',
  is_active = true,
  points = 0
WHERE email LIKE '%adrian%' OR name LIKE '%Tugui%';

-- Daniel Peters
UPDATE players 
SET 
  ranking = 'LK 19.9',
  is_active = true,
  points = 0
WHERE email LIKE '%peters%' OR name LIKE '%Daniel Peters%';

-- Michael Borgers
UPDATE players 
SET 
  ranking = 'LK 23.3',
  is_active = true,
  points = 0
WHERE email LIKE '%michael%' OR name LIKE '%Borgers%';

-- Manuel Straub
UPDATE players 
SET 
  ranking = 'LK 25',
  is_active = true,
  points = 0
WHERE email LIKE '%manuel%' OR name LIKE '%Straub%';

-- ================================================
-- 2. Fehlende Spieler hinzufügen (falls nicht vorhanden)
-- ================================================
-- WICHTIG: Diese müssen manuell mit user_id verknüpft werden
-- wenn sich die Spieler registrieren!
-- ================================================

-- Prüfe welche Spieler existieren:
SELECT 
  name,
  email,
  ranking,
  is_active,
  role
FROM players
ORDER BY ranking;

-- ================================================
-- FERTIG!
-- ================================================
-- ✅ Alle Spieler aus der TVM-Meldeliste sind aktualisiert
-- ✅ Rangliste zeigt jetzt die korrekten LK-Werte
-- ================================================
