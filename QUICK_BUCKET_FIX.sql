-- ================================================
-- SCHNELLE LÖSUNG: PROFILE-IMAGES BUCKET ERSTELLEN
-- ================================================
-- Führen Sie nur diesen kleinen Teil aus
-- ================================================

-- 1. BUCKET ERSTELLEN
-- ================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS POLICIES FÜR BUCKET
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

-- Upload für authentifizierte User
CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );

-- Update für eigene Bilder
CREATE POLICY "Users can update own profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );

-- Delete für eigene Bilder
CREATE POLICY "Users can delete own profile images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );

-- ================================================
-- FERTIG! BUCKET UND POLICIES ERSTELLT
-- ================================================

-- Testen Sie jetzt den Profilbild-Upload
-- ================================================
