# 🖼️ Storage Bucket Fix - profile-images

## Problem
```
❌ Storage-Bucket nicht gefunden. Prüfen Sie den Bucket-Namen.
```

**ABER:** Bucket existiert! Beispiel-URL funktioniert:
```
https://fyvmyyfuxuconhdbiwoa.supabase.co/storage/v1/object/public/profile-images/12c44036-07b1-44de-939f-4a846c22d8e1_1759566215395.jpeg
```

---

## Root Cause

Der Bucket `profile-images` existiert, aber:
1. ❌ **RLS (Row Level Security) Policy** blockiert Upload
2. ❌ **Bucket ist nicht PUBLIC** für Uploads
3. ❌ **User hat keine Upload-Berechtigung**

---

## ✅ LÖSUNG - Supabase Storage Konfiguration

### **Schritt 1: Bucket-Einstellungen prüfen**

1. Öffne **Supabase Dashboard**
2. Navigiere zu: **Storage** → **Buckets**
3. Finde: `profile-images`
4. Klicke auf `profile-images`

**Prüfe:**
- ✅ Public Bucket: **JA** (sollte aktiviert sein)
- ✅ File size limit: **10 MB** (oder höher)
- ✅ Allowed MIME types: `image/*` (alle Bilder)

---

### **Schritt 2: RLS Policies überprüfen**

1. Klicke auf `profile-images` Bucket
2. Gehe zu **Policies** Tab
3. Prüfe vorhandene Policies

**Benötigte Policies:**

#### **Policy 1: Upload erlauben (INSERT)**
```sql
-- Name: "Users can upload their own profile images"
-- Operation: INSERT
-- Policy:

(bucket_id = 'profile-images'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

**Alternativ (EINFACHER):**
```sql
-- Name: "Authenticated users can upload"
-- Operation: INSERT
-- Policy:

bucket_id = 'profile-images'
```

#### **Policy 2: Lesen erlauben (SELECT)**
```sql
-- Name: "Public read access"
-- Operation: SELECT
-- Policy:

bucket_id = 'profile-images'
```

#### **Policy 3: Update/Delete erlauben (UPDATE/DELETE)**
```sql
-- Name: "Users can update/delete their own images"
-- Operation: UPDATE, DELETE
-- Policy:

(bucket_id = 'profile-images'::text) 
AND (auth.uid()::text = (storage.foldername(name))[1])
```

---

### **Schritt 3: Neue Policy erstellen (falls fehlt)**

**Im Supabase Dashboard:**

1. Storage → `profile-images` → Policies
2. Klicke **"New Policy"**
3. Wähle **"Custom"**

**INSERT Policy (Upload):**
```
Name: Allow authenticated uploads
Operation: INSERT
Target roles: authenticated
USING expression: true
WITH CHECK expression: bucket_id = 'profile-images'
```

**SELECT Policy (Download):**
```
Name: Public read access
Operation: SELECT
Target roles: authenticated, anon
USING expression: bucket_id = 'profile-images'
```

**UPDATE/DELETE Policy:**
```
Name: Users can manage their images
Operation: UPDATE, DELETE
Target roles: authenticated
USING expression: bucket_id = 'profile-images'
WITH CHECK expression: bucket_id = 'profile-images'
```

---

### **Schritt 4: SQL-Alternative (schneller)**

**Falls UI nicht funktioniert, führe SQL aus:**

```sql
-- STORAGE RLS POLICIES FÜR profile-images
-- ==========================================

-- 1. Policy für INSERT (Upload)
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
);

-- 2. Policy für SELECT (Download)
CREATE POLICY "Public read access for profile images"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'profile-images'
);

-- 3. Policy für UPDATE
CREATE POLICY "Users can update their profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
)
WITH CHECK (
  bucket_id = 'profile-images'
);

-- 4. Policy für DELETE
CREATE POLICY "Users can delete their profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
);
```

---

### **Schritt 5: Bucket erstellen (falls nicht vorhanden)**

**Falls der Bucket wirklich nicht existiert:**

```sql
-- Erstelle profile-images Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true);
```

**ABER:** Da die Beispiel-URL funktioniert, existiert der Bucket bereits! ✅

---

## 🧪 **Testing nach Fix**

### **Test 1: Upload testen**

1. App öffnen → Profil
2. "📷 Bild hochladen" klicken
3. Bild auswählen
4. **Erwartung:** 
   - ✅ Console: "✅ Upload successful, URL: https://..."
   - ✅ Console: "✅ Image URL saved to database"
   - ✅ Bild wird angezeigt
   - ❌ KEIN Error mehr!

### **Test 2: Bild nach Reload**

1. App neu laden (F5)
2. **Erwartung:**
   - ✅ Bild bleibt erhalten
   - ✅ Wird aus DB geladen

### **Test 3: Bild in Results**

1. Navigiere zu: Saison → Spieler-Ergebnisse
2. **Erwartung:**
   - ✅ Profilbild wird in Player-Cards angezeigt

---

## 🆘 **Troubleshooting**

### **Error: "Bucket not found"**

**Check 1:** Bucket-Name korrekt?
```
Supabase Storage → Buckets
→ Sollte "profile-images" zeigen (GENAU so geschrieben!)
```

**Check 2:** Bucket ist PUBLIC?
```
profile-images → Settings → Public: ON
```

### **Error: "new row violates row-level security policy"**

**Lösung:** RLS Policy fehlt!
- Führe SQL-Policies aus (siehe Schritt 4)
- Oder: Erstelle im Dashboard (Schritt 3)

### **Error: "unauthorized"**

**Check:** User ist eingeloggt?
```javascript
console.log('Current User:', currentUser);
// Sollte User-Object zeigen, nicht null
```

---

## 📊 **Aktuelle Konfiguration prüfen**

**SQL-Query zur Diagnose:**

```sql
-- Prüfe Bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-images';

-- Prüfe Policies
SELECT 
  policyname,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE
  qual,  -- USING expression
  with_check  -- WITH CHECK expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname ILIKE '%profile%';

-- Prüfe vorhandene Bilder
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ **Quick Fix (am schnellsten)**

**Führe diese SQL-Queries aus:**

```sql
-- 1. Stelle sicher dass Bucket PUBLIC ist
UPDATE storage.buckets
SET public = true
WHERE id = 'profile-images';

-- 2. Erstelle EINFACHE Upload-Policy (ohne UID-Check)
CREATE POLICY "Allow all authenticated uploads to profile-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- 3. Erstelle Public Read Policy
CREATE POLICY "Allow public read from profile-images"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'profile-images');
```

---

## 🎯 **Empfohlener Ablauf**

1. ✅ **Quick Fix SQL ausführen** (siehe oben)
2. ✅ **App neu laden** (F5)
3. ✅ **Upload testen**
4. ✅ **Verifizieren:** Bild sollte hochgeladen werden

**Falls IMMER NOCH Fehler:**
- Screenshot der Supabase Storage Policies senden
- Ich erstelle spezifische Fix-Queries

---

**Starte mit dem Quick Fix SQL!** 🚀



