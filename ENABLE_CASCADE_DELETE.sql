-- ================================================
-- CASCADE DELETE für matches aktivieren
-- ================================================
-- Optional: Automatisches Löschen von match_availability
-- wenn ein Match gelöscht wird (Datenbank-Ebene)
-- ================================================

-- 1. Foreign Key Constraint mit CASCADE DELETE hinzufügen
-- ================================================

-- Prüfe bestehende Foreign Keys
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    confdeltype AS delete_action
FROM pg_constraint
WHERE contype = 'f' 
  AND conrelid::regclass::text = 'match_availability';

-- Falls bereits CASCADE vorhanden, nichts tun
-- Falls nicht, Foreign Key neu erstellen:

-- Schritt 1: Alten Foreign Key löschen (falls vorhanden)
ALTER TABLE match_availability 
DROP CONSTRAINT IF EXISTS match_availability_match_id_fkey;

-- Schritt 2: Neuen Foreign Key mit CASCADE DELETE erstellen
ALTER TABLE match_availability
ADD CONSTRAINT match_availability_match_id_fkey 
FOREIGN KEY (match_id) 
REFERENCES matches(id) 
ON DELETE CASCADE;

-- Gleiches für match_results (falls Tabelle existiert)
ALTER TABLE match_results 
DROP CONSTRAINT IF EXISTS match_results_match_id_fkey;

ALTER TABLE match_results
ADD CONSTRAINT match_results_match_id_fkey 
FOREIGN KEY (match_id) 
REFERENCES matches(id) 
ON DELETE CASCADE;

-- ================================================
-- FERTIG! 
-- ================================================
-- ✅ Wenn ein Match gelöscht wird, werden automatisch:
--    - Alle match_availability Einträge gelöscht
--    - Alle match_results Einträge gelöscht
--
-- Dies ist ein BACKUP zur App-Logik!
-- ================================================

-- Prüfe Ergebnis:
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS delete_action
FROM pg_constraint
WHERE contype = 'f' 
  AND (conrelid::regclass::text = 'match_availability' 
       OR conrelid::regclass::text = 'match_results')
  AND confrelid::regclass::text = 'matches';
