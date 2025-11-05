-- ADD_PROFILE_IMAGE_COLUMN.sql
-- Fügt die profile_image Spalte zu players_unified hinzu
-- ==========================================

BEGIN;

-- Schritt 1: Spalte hinzufügen
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Schritt 2: Index für Performance
CREATE INDEX IF NOT EXISTS idx_players_unified_profile_image 
ON players_unified(profile_image) 
WHERE profile_image IS NOT NULL;

-- Schritt 3: Verifizierung
SELECT 
  '✅ Spalte erfolgreich hinzugefügt' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players_unified'
  AND column_name = 'profile_image';

COMMIT;

-- ==========================================
-- HINWEIS: Führe dieses Script in Supabase SQL Editor aus
-- Nach dem Ausführen sollte die Spalte profile_image existieren
-- ==========================================




