-- CHECK_ACTUAL_COLUMNS.sql
-- Prüft welche Spalten tatsächlich in players_unified existieren
-- ==========================================

-- SCHRITT 1: Alle aktuellen Spalten anzeigen
-- ==========================================
SELECT 
  '📊 Alle Spalten in players_unified' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players_unified'
ORDER BY ordinal_position;

-- SCHRITT 2: Prüfe welche Profil-Spalten fehlen
-- ==========================================
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'profile_image',
    'birth_date',
    'address',
    'emergency_contact',
    'emergency_phone',
    'notes',
    'favorite_shot',
    'tennis_motto',
    'fun_fact',
    'worst_tennis_memory',
    'best_tennis_memory',
    'superstition',
    'pre_match_routine',
    'favorite_opponent',
    'dream_match'
  ]) as column_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'players_unified'
)
SELECT 
  '❌ Fehlende Spalten' as info,
  r.column_name
FROM required_columns r
LEFT JOIN existing_columns e ON r.column_name = e.column_name
WHERE e.column_name IS NULL
ORDER BY r.column_name;

-- SCHRITT 3: Prüfe welche bereits existieren
-- ==========================================
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'profile_image',
    'birth_date',
    'address',
    'emergency_contact',
    'emergency_phone',
    'notes',
    'favorite_shot',
    'tennis_motto',
    'fun_fact',
    'worst_tennis_memory',
    'best_tennis_memory',
    'superstition',
    'pre_match_routine',
    'favorite_opponent',
    'dream_match'
  ]) as column_name
)
SELECT 
  '✅ Bereits vorhanden' as info,
  c.column_name,
  c.data_type
FROM information_schema.columns c
INNER JOIN required_columns r ON c.column_name = r.column_name
WHERE c.table_schema = 'public'
  AND c.table_name = 'players_unified'
ORDER BY c.column_name;

