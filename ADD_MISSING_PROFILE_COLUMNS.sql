-- ADD_MISSING_PROFILE_COLUMNS.sql
-- Fügt ALLE fehlenden Profil-Spalten zu players_unified hinzu
-- ==========================================

BEGIN;

-- HINWEIS: profile_image existiert bereits in deiner DB!
-- Wir fügen nur die FEHLENDEN Spalten hinzu

-- SCHRITT 1: Basis-Spalten
-- ==========================================

-- birth_date (Geburtsdatum)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- address (Adresse)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS address TEXT;

-- emergency_contact (Notfallkontakt Name)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- emergency_phone (Notfallkontakt Telefon)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- notes (Freitext-Notizen)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS notes TEXT;


-- SCHRITT 2: Tennis-Persönlichkeit Spalten
-- ==========================================

-- favorite_shot (Lieblingsschlag)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS favorite_shot TEXT;

-- tennis_motto (Tennis-Motto)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS tennis_motto TEXT;

-- fun_fact (Lustige Tatsache)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS fun_fact TEXT;

-- worst_tennis_memory (Schlimmste Tennis-Erinnerung)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS worst_tennis_memory TEXT;

-- best_tennis_memory (Beste Tennis-Erinnerung)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS best_tennis_memory TEXT;

-- superstition (Aberglaube)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS superstition TEXT;

-- pre_match_routine (Vor-Spiel Routine)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS pre_match_routine TEXT;

-- favorite_opponent (Lieblingsgegner)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS favorite_opponent TEXT;

-- dream_match (Traum-Match)
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS dream_match TEXT;


-- SCHRITT 3: Indices für Performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_players_unified_profile_image 
ON players_unified(profile_image) 
WHERE profile_image IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_unified_birth_date 
ON players_unified(birth_date) 
WHERE birth_date IS NOT NULL;


-- SCHRITT 4: Verifizierung
-- ==========================================
SELECT 
  '✅ Spalten erfolgreich hinzugefügt' as info,
  COUNT(*) as spalten_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players_unified'
  AND column_name IN (
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
  );

-- Detaillierte Liste
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players_unified'
  AND column_name IN (
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
  )
ORDER BY column_name;

COMMIT;

-- ==========================================
-- HINWEIS: Führe dieses Script in Supabase SQL Editor aus
-- Nach dem Ausführen sollten alle Profil-Spalten existieren
-- ==========================================

