-- CHECK_STORAGE_POLICIES.sql
-- Prüft welche Storage Policies aktuell existieren
-- ==========================================

-- SCHRITT 1: Prüfe Bucket
-- ==========================================
SELECT 
  '🔍 BUCKET STATUS' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-images';

-- SCHRITT 2: Prüfe alle Storage Policies
-- ==========================================
SELECT 
  '📋 ALLE STORAGE POLICIES' as info,
  policyname,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE, ALL
  roles,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- SCHRITT 3: Prüfe speziell profile-images Policies
-- ==========================================
SELECT 
  '🎯 PROFILE-IMAGES POLICIES' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname ILIKE '%profile%' 
    OR qual::text ILIKE '%profile-images%'
  )
ORDER BY cmd, policyname;

-- SCHRITT 4: Zähle vorhandene Bilder im Bucket
-- ==========================================
SELECT 
  '📊 VORHANDENE BILDER' as info,
  COUNT(*) as total_files,
  COUNT(DISTINCT owner) as unique_owners,
  MAX(created_at) as latest_upload,
  pg_size_pretty(SUM(COALESCE((metadata->>'size')::bigint, 0))) as total_size
FROM storage.objects
WHERE bucket_id = 'profile-images';

-- SCHRITT 5: Zeige neueste 5 Uploads
-- ==========================================
SELECT 
  '🖼️ NEUESTE UPLOADS' as info,
  name,
  owner,
  created_at,
  updated_at,
  pg_size_pretty(COALESCE((metadata->>'size')::bigint, 0)) as file_size
FROM storage.objects
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- INTERPRETATION:
-- 
-- Falls SCHRITT 3 leer ist (keine Policies):
-- → QUICK_FIX_STORAGE_POLICIES.sql ausführen!
-- 
-- Falls Policies existieren aber Upload nicht klappt:
-- → Policy-Expressions prüfen (zu restriktiv?)
-- 
-- Falls Bucket nicht existiert:
-- → Bucket erstellen (im Dashboard oder SQL)
-- ==========================================



