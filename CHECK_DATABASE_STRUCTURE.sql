-- ========================================
-- DATABASE STRUCTURE CHECK
-- ========================================
-- Überprüft die Struktur der match_results Tabelle

-- Zeige Tabellen-Schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'match_results' 
ORDER BY ordinal_position;

-- Zeige Constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'match_results'::regclass;

-- Zeige Beispieldaten (falls vorhanden)
SELECT 
    id,
    match_id,
    match_number,
    match_type,
    home_player_id,
    guest_player_id,
    set1_home,
    set1_guest,
    status,
    winner,
    created_at
FROM match_results 
LIMIT 5;

-- ========================================
-- HILFE FÜR DEBUGGING
-- ========================================
-- Wenn UUID-Fehler auftreten:
-- 1. Prüfe ob alle UUID-Felder entweder gültige UUIDs oder NULL enthalten
-- 2. Leere Strings ("") sind nicht erlaubt für UUID-Felder
-- 3. Verwende NULL für fehlende Werte

