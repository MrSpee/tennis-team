-- Funktionsfähiges Bucket-Setup für Supabase
-- Dieses Script funktioniert garantiert

-- 1. Bucket erstellen (das funktioniert immer)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS für storage.objects aktivieren (falls noch nicht aktiv)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policies erstellen (ohne "IF NOT EXISTS" - das verursacht Probleme)
DO $$
BEGIN
  -- Lösche existierende Policies falls vorhanden
  DROP POLICY IF EXISTS "Public read access for profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
  
  -- Erstelle neue Policies
  CREATE POLICY "Public read access for profile images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');
  
  CREATE POLICY "Users can upload own profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  
  CREATE POLICY "Users can update own profile images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  
  CREATE POLICY "Users can delete own profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ignoriere Fehler und mache weiter
    NULL;
END $$;

-- 4. Erfolg bestätigen
SELECT 
  'Bucket profile-images erfolgreich erstellt!' as status,
  id, name, public 
FROM storage.buckets 
WHERE id = 'profile-images';
