-- ================================================
-- SICHERES PROFIL-SYSTEM SETUP (OHNE KONFLIKTE)
-- ================================================
-- Dieses Script kann mehrfach ausgeführt werden
-- ohne Fehler bei bereits existierenden Objekten
-- ================================================

-- 1. ERWEITERE PLAYERS TABELLE UM ALLE PROFIL-FELDER
-- ================================================

-- Neue Spalten für erweiterte Profile hinzufügen (IF NOT EXISTS)
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

-- 2. STORAGE BUCKET FÜR PROFILBILDER ERSTELLEN
-- ================================================

-- Bucket erstellen (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS POLICIES FÜR STORAGE (SICHER)
-- ================================================

-- Lösche ALLE bestehenden Policies für profile-images Bucket
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Lösche alle Policies die 'profile-images' enthalten
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%profile%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Erstelle neue Policies für profile-images Bucket
DO $$
BEGIN
    -- Öffentlicher Zugriff auf Profilbilder
    BEGIN
        CREATE POLICY "Public read access for profile images"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'profile-images');
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;

    -- Upload für authentifizierte User (nur eigene Bilder)
    BEGIN
        CREATE POLICY "Authenticated users can upload profile images"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'profile-images' 
            AND auth.role() = 'authenticated'
            AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
          );
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;

    -- Update für eigene Bilder
    BEGIN
        CREATE POLICY "Users can update own profile images"
          ON storage.objects FOR UPDATE
          USING (
            bucket_id = 'profile-images' 
            AND auth.role() = 'authenticated'
            AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
          );
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;

    -- Delete für eigene Bilder
    BEGIN
        CREATE POLICY "Users can delete own profile images"
          ON storage.objects FOR DELETE
          USING (
            bucket_id = 'profile-images' 
            AND auth.role() = 'authenticated'
            AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
          );
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;
END $$;

-- 4. RLS POLICIES FÜR PLAYERS TABELLE (SICHER)
-- ================================================

-- Lösche alle bestehenden Policies für players Tabelle
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'players' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.players', policy_record.policyname);
    END LOOP;
END $$;

-- Erstelle neue Policies für players Tabelle
DO $$
BEGIN
    -- SELECT: ÖFFENTLICHER ZUGRIFF AUF ALLE SPIELER-PROFILE
    BEGIN
        CREATE POLICY "Public read access to player profiles"
          ON public.players FOR SELECT
          USING (true);
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;

    -- UPDATE: NUR EIGENES PROFIL BEARBEITEN
    BEGIN
        CREATE POLICY "Users can update own profile"
          ON public.players FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy existiert bereits, ignoriere Fehler
    END;
END $$;

-- 5. INDEXES FÜR BESSERE PERFORMANCE (SICHER)
-- ================================================

CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_email ON public.players(email);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON public.players(is_active);

-- 6. FUNKTION FÜR SPIELER-SUCHE (SICHER)
-- ================================================

-- Lösche Funktion falls vorhanden
DROP FUNCTION IF EXISTS public.search_players(TEXT);

-- Funktion für Suche nach Spieler-Namen
CREATE FUNCTION public.search_players(search_term TEXT)
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
-- FERTIG! SICHERES PROFIL-SYSTEM ERSTELLT
-- ================================================

-- ✅ Alle Profilfelder hinzugefügt (ohne Fehler)
-- ✅ Storage für Profilbilder eingerichtet
-- ✅ Öffentliche RLS Policies für Profile
-- ✅ Performance-Indexes
-- ✅ Suchfunktion für Spieler
-- ✅ Kann mehrfach ausgeführt werden

-- NÄCHSTE SCHRITTE:
-- 1. Dieses Script in Supabase ausführen
-- 2. Profilbild-Upload testen
-- 3. Spieler-Profile testen

-- ================================================
