-- Direkter Bucket-Erstellung für Profile Images
-- Dieses Script erstellt den Bucket und die notwendigen Policies

-- 1. Bucket erstellen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5MB Limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS für storage.objects aktivieren
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy für öffentliches Lesen aller Profile-Bilder
CREATE POLICY "Public read access for profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-images');

-- 4. Policy für authentifizierte Benutzer zum Hochladen eigener Bilder
CREATE POLICY "Users can upload own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Policy für authentifizierte Benutzer zum Aktualisieren eigener Bilder
CREATE POLICY "Users can update own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Policy für authentifizierte Benutzer zum Löschen eigener Bilder
CREATE POLICY "Users can delete own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. Bucket-Liste für authentifizierte Benutzer sichtbar machen
CREATE POLICY "Authenticated users can view buckets" ON storage.buckets
FOR SELECT USING (auth.role() = 'authenticated');

-- Erfolg bestätigen
SELECT 'Bucket profile-images erfolgreich erstellt!' as status;
