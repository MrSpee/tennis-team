-- CHECK_PROFILE_IMAGE_COLUMN.sql
-- Prüfe ob profile_image Spalte in players_unified existiert und Daten enthält
-- ==========================================

-- SCHRITT 1: Prüfe ob Spalte existiert
-- ==========================================
SELECT 
  '🔍 Spalten-Check' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players_unified'
  AND column_name = 'profile_image';

-- SCHRITT 2: Zeige alle Spieler MIT profile_image
-- ==========================================
SELECT 
  '✅ Spieler MIT Profilbild' as info,
  id,
  name,
  email,
  profile_image,
  LENGTH(profile_image) as url_length
FROM players_unified
WHERE profile_image IS NOT NULL
  AND profile_image != ''
ORDER BY name;

-- SCHRITT 3: Zeige alle Spieler OHNE profile_image
-- ==========================================
SELECT 
  '⚠️ Spieler OHNE Profilbild' as info,
  id,
  name,
  email,
  user_id,
  player_type,
  is_active
FROM players_unified
WHERE (profile_image IS NULL OR profile_image = '')
  AND user_id IS NOT NULL
  AND player_type = 'app_user'
  AND is_active = true
ORDER BY name;

-- SCHRITT 4: Spezifisch Chris Spee prüfen
-- ==========================================
SELECT 
  '🔍 Chris Spee Profil' as info,
  id,
  user_id,
  name,
  email,
  profile_image,
  current_lk,
  created_at,
  updated_at
FROM players_unified
WHERE email = 'mail@christianspee.de';

-- SCHRITT 5: Falls profile_image Spalte NICHT existiert - erstellen
-- ==========================================
-- UNCOMMENT NUR WENN Spalte fehlt:
/*
ALTER TABLE players_unified
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Index für schnellere Queries
CREATE INDEX IF NOT EXISTS idx_players_unified_profile_image 
ON players_unified(profile_image) 
WHERE profile_image IS NOT NULL;
*/

-- HINWEISE:
-- ==========================================
-- Falls Spalte nicht existiert: UNCOMMENT Schritt 5 und ausführen
-- Falls Spalte existiert aber leer: Upload-Funktion prüfen
-- Falls Spalte existiert und gefüllt: Frontend-Anzeige prüfen

