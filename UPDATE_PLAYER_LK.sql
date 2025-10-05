-- ============================================
-- SQL Script: Spieler-LK für Saison 2024/25
-- ============================================

-- Schritt 1: Neue Spalten hinzufügen
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS season_start_lk VARCHAR(10),
ADD COLUMN IF NOT EXISTS current_lk VARCHAR(10);

-- Schritt 2: Saison-Start LK setzen (Winter 2024/25)
-- Basis: TVM-Meldeliste + Jesko

-- Thomas Mengelkamp - LK 11.5
UPDATE players 
SET season_start_lk = 'LK 11.5', 
    current_lk = 'LK 11.5',
    ranking = 'LK 11.5'
WHERE name = 'Thomas Mengelkamp';

-- Chris Spee (Christian Spee in TVM) - LK 12.3
UPDATE players 
SET season_start_lk = 'LK 12.3', 
    current_lk = 'LK 12.3',
    ranking = 'LK 12.3'
WHERE name = 'Chris Spee';

-- Olivier Michel (Olivier Pol Michel in TVM) - LK 12.9
UPDATE players 
SET season_start_lk = 'LK 12.9', 
    current_lk = 'LK 12.9',
    ranking = 'LK 12.9'
WHERE name = 'Olivier Michel';

-- Robert Ellrich - LK 14.3
UPDATE players 
SET season_start_lk = 'LK 14.3', 
    current_lk = 'LK 14.3',
    ranking = 'LK 14.3'
WHERE name = 'Robert Ellrich';

-- Daniel Becher - LK 14.8
UPDATE players 
SET season_start_lk = 'LK 14.8', 
    current_lk = 'LK 14.8',
    ranking = 'LK 14.8'
WHERE name = 'Daniel Becher';

-- Frank Ritter - LK 16.9
UPDATE players 
SET season_start_lk = 'LK 16.9', 
    current_lk = 'LK 16.9',
    ranking = 'LK 16.9'
WHERE name = 'Frank Ritter';

-- Adrian (Adrian Tugui in TVM) - LK 17.1
UPDATE players 
SET season_start_lk = 'LK 17.1', 
    current_lk = 'LK 17.1',
    ranking = 'LK 17.1'
WHERE name = 'Adrian';

-- Jesko (nicht in TVM, aber aktiv) - LK 22
UPDATE players 
SET season_start_lk = 'LK 22', 
    current_lk = 'LK 22',
    ranking = 'LK 22'
WHERE name = 'Jesko';

-- Schritt 3: Verifizierung - Zeige alle aktualisierten Spieler
SELECT 
  name, 
  season_start_lk, 
  current_lk,
  ranking
FROM players 
WHERE is_active = true
ORDER BY 
  CAST(NULLIF(REGEXP_REPLACE(season_start_lk, '[^0-9.]', '', 'g'), '') AS DECIMAL) ASC;

-- ============================================
-- NOTIZEN:
-- ============================================
-- Spieler NICHT in DB (nur in TVM-Meldeliste):
--   - Marco Coltro (LK 8.4)
--   - Alexander Grebe (LK 16.3)
--   - Daniel Peters (LK 19.9)
--   - Michael Borgers (LK 23.3)
--   - Manuel Straub (LK 25)
--
-- Diese Spieler können später hinzugefügt werden wenn sie die App nutzen.
-- ============================================

