-- ================================================
-- VOLLSTÄNDIGES PROFIL-SYSTEM SETUP
-- ================================================
-- Dieses Script erstellt ein komplettes Profil-System
-- mit öffentlichen Spieler-Profilen und allen Features
-- ================================================

-- 1. ERWEITERE PLAYERS TABELLE UM ALLE PROFIL-FELDER
-- ================================================

-- Neue Spalten für erweiterte Profile hinzufügen
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS favorite_shot TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS tennis_motto TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS fun_fact TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS worst_tennis_memory TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS best_tennis_memory TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS superstition TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS pre_match_routine TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS favorite_opponent TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS dream_match TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. KOMMENTARE FÜR DIE NEUEN SPALTEN
-- ================================================
COMMENT ON COLUMN public.players.profile_image IS 'URL zum Profilbild im Storage';
COMMENT ON COLUMN public.players.favorite_shot IS 'Lieblingsschlag des Spielers';
COMMENT ON COLUMN public.players.tennis_motto IS 'Tennis-Motto des Spielers';
COMMENT ON COLUMN public.players.fun_fact IS 'Lustiger Fakt über den Spieler';
COMMENT ON COLUMN public.players.worst_tennis_memory IS 'Peinlichster Tennis-Moment';
COMMENT ON COLUMN public.players.best_tennis_memory IS 'Bester Tennis-Moment';
COMMENT ON COLUMN public.players.superstition IS 'Tennis-Aberglaube';
COMMENT ON COLUMN public.players.pre_match_routine IS 'Pre-Match Routine';
COMMENT ON COLUMN public.players.favorite_opponent IS 'Lieblingsgegner';
COMMENT ON COLUMN public.players.dream_match IS 'Traum-Match';
COMMENT ON COLUMN public.players.birth_date IS 'Geburtsdatum';
COMMENT ON COLUMN public.players.address IS 'Adresse';
COMMENT ON COLUMN public.players.emergency_contact IS 'Notfallkontakt';
COMMENT ON COLUMN public.players.emergency_phone IS 'Notfalltelefon';
COMMENT ON COLUMN public.players.notes IS 'Notizen';

-- 3. STORAGE BUCKET FÜR PROFILBILDER ERSTELLEN
-- ================================================

-- Bucket erstellen (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS POLICIES FÜR STORAGE
-- ================================================

-- Lösche bestehende Policies falls vorhanden
DROP POLICY IF EXISTS "Public read access for profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

-- Öffentlicher Zugriff auf Profilbilder
CREATE POLICY "Public read access for profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- Upload für authentifizierte User (nur eigene Bilder)
CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
    AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
  );

-- Update für eigene Bilder
CREATE POLICY "Users can update own profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
    AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
  );

-- Delete für eigene Bilder
CREATE POLICY "Users can delete own profile images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
    AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
  );

-- 5. RLS POLICIES FÜR PLAYERS TABELLE AKTUALISIEREN
-- ================================================

-- Alle bestehenden Policies löschen
DROP POLICY IF EXISTS "players_select_policy" ON public.players;
DROP POLICY IF EXISTS "players_insert_policy" ON public.players;
DROP POLICY IF EXISTS "players_update_policy" ON public.players;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
DROP POLICY IF EXISTS "Users can create their own player profile" ON public.players;
DROP POLICY IF EXISTS "Captains can manage all players" ON public.players;
DROP POLICY IF EXISTS "enable_read_access_for_all_users" ON public.players;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON public.players;

-- NEUE POLICIES FÜR VOLLSTÄNDIGES PROFIL-SYSTEM
-- ================================================

-- 1. SELECT: ÖFFENTLICHER ZUGRIFF AUF ALLE SPIELER-PROFILE
-- Jeder kann alle Spieler-Profile sehen (auch ohne Login)
CREATE POLICY "Public read access to player profiles"
  ON public.players FOR SELECT
  USING (true);

-- 2. INSERT: NUR ÜBER TRIGGER (bei Registrierung)
-- Keine INSERT Policy nötig - wird über Trigger gemacht

-- 3. UPDATE: NUR EIGENES PROFIL BEARBEITEN
CREATE POLICY "Users can update own profile"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: NUR ADMINS (über Supabase Dashboard)
-- Keine DELETE Policy - nur über Supabase Dashboard

-- 6. TRIGGER FÜR AUTOMATISCHE PLAYER-ERSTELLUNG
-- ================================================

-- Funktion für neuen User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.players (
    user_id,
    email,
    name,
    role,
    points,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Neuer Spieler'),
    'player',
    0,
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger löschen falls vorhanden
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger erstellen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 7. INDEXES FÜR BESSERE PERFORMANCE
-- ================================================

-- Index für schnelle Suche nach Spieler-Namen
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_email ON public.players(email);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON public.players(is_active);

-- 8. VIEW FÜR ÖFFENTLICHE SPIELER-PROFILE
-- ================================================

-- Lösche View falls vorhanden
DROP VIEW IF EXISTS public.public_player_profiles;

-- View für öffentliche Spieler-Profile (ohne sensitive Daten)
CREATE VIEW public.public_player_profiles AS
SELECT 
  id,
  name,
  ranking,
  points,
  profile_image,
  favorite_shot,
  tennis_motto,
  fun_fact,
  worst_tennis_memory,
  best_tennis_memory,
  superstition,
  pre_match_routine,
  favorite_opponent,
  dream_match,
  birth_date,
  is_active,
  created_at,
  updated_at
FROM public.players
WHERE is_active = true;

-- 9. FUNKTION FÜR SPIELER-SUCHE
-- ================================================

-- Funktion für Suche nach Spieler-Namen
CREATE OR REPLACE FUNCTION public.search_players(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  ranking TEXT,
  points INTEGER,
  profile_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.ranking,
    p.points,
    p.profile_image
  FROM public.players p
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%' || search_term || '%'
      OR p.ranking ILIKE '%' || search_term || '%'
    )
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FERTIG! VOLLSTÄNDIGES PROFIL-SYSTEM ERSTELLT
-- ================================================

-- ✅ Alle Profilfelder hinzugefügt
-- ✅ Storage für Profilbilder eingerichtet
-- ✅ Öffentliche RLS Policies für Profile
-- ✅ Trigger für automatische Player-Erstellung
-- ✅ Performance-Indexes
-- ✅ Public View für Spieler-Profile
-- ✅ Suchfunktion für Spieler

-- NÄCHSTE SCHRITTE:
-- 1. Führe dieses Script in Supabase aus
-- 2. Erstelle dedizierte Profil-Komponenten
-- 3. Implementiere /player/:name Routen
-- 4. Teste das komplette System

-- ================================================
