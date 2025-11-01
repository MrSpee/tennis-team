-- VERIFY_STORAGE_POLICIES.sql
-- Prüft existierende Storage Policies (erstellt KEINE neuen!)
-- ==========================================

-- SCHRITT 1: Prüfe Bucket-Status
-- ==========================================
SELECT 
  '🔍 BUCKET STATUS' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN public = true THEN '✅ PUBLIC'
    ELSE '❌ NICHT PUBLIC'
  END as public_status
FROM storage.buckets
WHERE id = 'profile-images';

-- SCHRITT 2: Zeige ALLE existierenden Policies für profile-images
-- ==========================================
SELECT 
  '📋 EXISTIERENDE POLICIES' as info,
  policyname,
  cmd,
  roles::text,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname ILIKE '%profile-images%'
ORDER BY cmd, policyname;

-- SCHRITT 3: Prüfe ob ALLE benötigten Policies existieren
-- ==========================================
WITH required_policies AS (
  SELECT unnest(ARRAY[
    'Allow authenticated uploads to profile-images',
    'Allow public read from profile-images',
    'Allow authenticated updates to profile-images',
    'Allow authenticated deletes from profile-images'
  ]) as policy_name,
  unnest(ARRAY['INSERT', 'SELECT', 'UPDATE', 'DELETE']) as operation
),
existing_policies AS (
  SELECT policyname, cmd
  FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname ILIKE '%profile-images%'
)
SELECT 
  '🔍 POLICY CHECK' as info,
  r.policy_name,
  r.operation,
  CASE 
    WHEN e.policyname IS NOT NULL THEN '✅ EXISTIERT'
    ELSE '❌ FEHLT'
  END as status
FROM required_policies r
LEFT JOIN existing_policies e ON e.policyname = r.policy_name
ORDER BY r.operation;

-- SCHRITT 4: Zähle Bilder im Bucket
-- ==========================================
SELECT 
  '📊 BILDER IM BUCKET' as info,
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
  pg_size_pretty(COALESCE((metadata->>'size')::bigint, 0)) as file_size
FROM storage.objects
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- INTERPRETATION DER ERGEBNISSE:
-- 
-- SCHRITT 1: Bucket sollte public=true sein
-- SCHRITT 2: Sollte 4 Policies zeigen
-- SCHRITT 3: Alle 4 sollten "✅ EXISTIERT" sein
-- SCHRITT 4: Zeigt wie viele Bilder schon hochgeladen wurden
-- SCHRITT 5: Zeigt letzte Uploads (sollte funktionieren!)
-- 
-- WENN ALLE ✅:
-- → Storage ist korrekt konfiguriert!
-- → Upload-Error hat andere Ursache (siehe unten)
-- 
-- MÖGLICHE PROBLEME:
-- 1. Bucket nicht PUBLIC → UPDATE storage.buckets SET public=true
-- 2. Policies zu restriktiv → Prüfe qual/with_check Expressions
-- 3. User nicht authentifiziert → Login-Problem im Frontend
-- ==========================================

