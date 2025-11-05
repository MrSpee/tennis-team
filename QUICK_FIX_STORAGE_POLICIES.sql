-- QUICK_FIX_STORAGE_POLICIES.sql
-- Erstellt RLS Policies für profile-images Bucket
-- ==========================================

-- SCHRITT 1: Prüfe aktuellen Bucket-Status
-- ==========================================
SELECT 
  '🔍 Bucket Status' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-images';

-- SCHRITT 2: Stelle sicher dass Bucket PUBLIC ist
-- ==========================================
UPDATE storage.buckets
SET public = true
WHERE id = 'profile-images';

SELECT 
  '✅ Bucket auf PUBLIC gesetzt' as info,
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'profile-images';

-- SCHRITT 3: Lösche alte/fehlerhafte Policies (falls vorhanden)
-- ==========================================
DROP POLICY IF EXISTS "Allow all authenticated uploads to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile images" ON storage.objects;

-- SCHRITT 4: Erstelle NEUE, EINFACHE Policies
-- ==========================================

-- Policy 1: INSERT (Upload) für authentifizierte User
CREATE POLICY "Allow authenticated uploads to profile-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
);

-- Policy 2: SELECT (Download) für alle
CREATE POLICY "Allow public read from profile-images"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'profile-images'
);

-- Policy 3: UPDATE für authentifizierte User
CREATE POLICY "Allow authenticated updates to profile-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
)
WITH CHECK (
  bucket_id = 'profile-images'
);

-- Policy 4: DELETE für authentifizierte User
CREATE POLICY "Allow authenticated deletes from profile-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
);

-- SCHRITT 5: Verifizierung
-- ==========================================
SELECT 
  '✅ Policies erstellt' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname ILIKE '%profile-images%'
ORDER BY policyname;

-- SCHRITT 6: Test-Upload simulieren (Berechtigungen prüfen)
-- ==========================================
-- Zeige ob aktueller User Upload-Rechte hat
SELECT 
  '🔍 User kann uploaden?' as info,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ User ist authentifiziert'
    ELSE '❌ User ist NICHT authentifiziert'
  END as auth_status;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- ✅ Bucket ist PUBLIC
-- ✅ 4 Policies erstellt (INSERT, SELECT, UPDATE, DELETE)
-- ✅ User ist authentifiziert
-- 
-- DANACH: Upload sollte funktionieren!
-- ==========================================




