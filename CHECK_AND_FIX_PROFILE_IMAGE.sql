-- CHECK_AND_FIX_PROFILE_IMAGE.sql
-- Überprüfe und fixe Profilbild-Anzeige für Chris Spee
-- ==========================================

-- ==========================================
-- SCHRITT 1: PRÜFE OB profile_image SPALTE EXISTIERT
-- ==========================================
SELECT 
  '1️⃣ SPALTEN-CHECK' as check_category,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'players_unified'
  AND column_name = 'profile_image';

-- ==========================================
-- SCHRITT 2: PRÜFE CHRIS SPEE's PROFIL-DATEN
-- ==========================================
SELECT 
  '2️⃣ CHRIS SPEE PROFIL-DATEN' as check_category,
  id,
  name,
  email,
  profile_image,
  CASE 
    WHEN profile_image IS NULL THEN '❌ NULL'
    WHEN profile_image = '' THEN '❌ LEER'
    WHEN profile_image LIKE '%profile-images%' THEN '✅ KORREKT'
    ELSE '⚠️ UNBEKANNT: ' || profile_image
  END as profile_image_status,
  LENGTH(profile_image) as url_length
FROM players_unified
WHERE email = 'mail@christianspee.de';

-- ==========================================
-- SCHRITT 3: PRÜFE STORAGE BUCKET
-- ==========================================
SELECT 
  '3️⃣ STORAGE BUCKET CHECK' as check_category,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'profile-images';

-- ==========================================
-- SCHRITT 4: ZÄHLE HOCHGELADENE BILDER
-- ==========================================
SELECT 
  '4️⃣ HOCHGELADENE BILDER' as check_category,
  COUNT(*) as total_files,
  COUNT(DISTINCT owner) as unique_users,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_size_mb
FROM storage.objects
WHERE bucket_id = 'profile-images';

-- ==========================================
-- SCHRITT 5: CHRIS's HOCHGELADENE BILDER
-- ==========================================
SELECT 
  '5️⃣ CHRIS BILDER IM STORAGE' as check_category,
  name,
  owner,
  created_at,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'profile-images'
  AND owner = (SELECT user_id FROM players_unified WHERE email = 'mail@christianspee.de')
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- SCHRITT 6: FINALE DIAGNOSE
-- ==========================================
WITH chris_data AS (
  SELECT 
    p.id,
    p.name,
    p.email,
    p.user_id,
    p.profile_image,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'profile-images' AND owner = p.user_id) as uploaded_images
  FROM players_unified p
  WHERE p.email = 'mail@christianspee.de'
)
SELECT 
  '6️⃣ ✅ FINALE DIAGNOSE' as check_category,
  cd.name,
  cd.email,
  CASE 
    WHEN cd.profile_image IS NOT NULL AND cd.profile_image LIKE '%profile-images%' THEN '✅ Profilbild ist gesetzt'
    WHEN cd.uploaded_images > 0 AND cd.profile_image IS NULL THEN '⚠️ Bild hochgeladen, aber nicht in DB gespeichert'
    WHEN cd.uploaded_images = 0 THEN '❌ Noch kein Bild hochgeladen'
    ELSE '⚠️ Unbekannter Status'
  END as status,
  cd.uploaded_images as "Hochgeladene Bilder",
  cd.profile_image as "Aktueller profile_image Wert",
  CASE 
    WHEN cd.profile_image IS NOT NULL AND cd.profile_image LIKE '%profile-images%' THEN '👍 ALLES OK - Zeig mir Screenshot vom Results-View'
    WHEN cd.uploaded_images > 0 AND cd.profile_image IS NULL THEN '🔧 FIX BENÖTIGT: UPDATE players_unified SET profile_image = (SELECT name FROM storage.objects WHERE bucket_id = ''profile-images'' AND owner = ''' || cd.user_id || ''' ORDER BY created_at DESC LIMIT 1)'
    WHEN cd.uploaded_images = 0 THEN '📸 AKTION: Bitte Profilbild im Profil hochladen'
    ELSE '❓ UNBEKANNT'
  END as "NÄCHSTER SCHRITT"
FROM chris_data cd;

-- ==========================================
-- ERWARTETES ERGEBNIS:
-- 
-- 1️⃣ SPALTEN-CHECK: profile_image existiert (text/varchar)
-- 2️⃣ CHRIS PROFIL-DATEN: ✅ KORREKT (URL mit profile-images)
-- 3️⃣ STORAGE BUCKET: profile-images existiert, public=true
-- 4️⃣ HOCHGELADENE BILDER: Mindestens 1 Bild
-- 5️⃣ CHRIS BILDER: Liste der hochgeladenen Bilder
-- 6️⃣ DIAGNOSE: "✅ Profilbild ist gesetzt" ODER "🔧 FIX BENÖTIGT"
-- 
-- WENN 6️⃣ = "🔧 FIX BENÖTIGT":
-- → Kopiere den UPDATE-Befehl aus "NÄCHSTER SCHRITT"
-- → Führe ihn aus
-- → Reload App
-- 
-- WENN 6️⃣ = "📸 AKTION":
-- → Gehe zu /profil
-- → Lade ein Profilbild hoch
-- → Warte auf Success-Meldung
-- → Reload Results-View
-- ==========================================

