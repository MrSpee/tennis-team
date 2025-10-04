# 🔧 Profilbild-Upload Debugging

## 🚨 **Problem:**
Profilbilder können nicht hochgeladen werden

## ✅ **Lösungsschritte:**

### **1. SQL-Script ausführen (wichtigste Ursache)**

Das SQL-Script muss ausgeführt werden, um den Storage-Bucket zu erstellen:

```sql
-- Aus COMPLETE_PROFILE_SYSTEM_FIXED.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;
```

**Ohne diesen Bucket funktioniert der Upload nicht!**

### **2. Debugging im Browser**

1. **Öffne Browser-Entwicklertools** (F12)
2. **Gehe zu Console**
3. **Versuche Profilbild hochzuladen**
4. **Schaue nach Fehlermeldungen:**

#### **Mögliche Fehler:**

**❌ "Storage Bucket profile-images existiert nicht"**
```bash
Lösung: SQL-Script ausführen
```

**❌ "new row violates row-level security policy"**
```bash
Lösung: RLS Policies im SQL-Script ausführen
```

**❌ "Failed to fetch"**
```bash
Lösung: Supabase URL/Key prüfen
```

### **3. Supabase Dashboard prüfen**

#### **Storage Buckets:**
1. **Supabase Dashboard** → **Storage**
2. **Prüfe ob `profile-images` Bucket existiert**
3. **Falls nicht** → SQL-Script ausführen

#### **RLS Policies:**
1. **Supabase Dashboard** → **Storage** → **Policies**
2. **Prüfe Policies für `storage.objects`:**
   - ✅ `Public read access for profile images`
   - ✅ `Authenticated users can upload profile images`
   - ✅ `Users can update own profile images`
   - ✅ `Users can delete own profile images`

### **4. Manueller Test**

#### **Teste Storage direkt:**
```javascript
// In Browser Console
const { data, error } = await supabase.storage.listBuckets();
console.log('Buckets:', data);
```

#### **Teste Upload:**
```javascript
// In Browser Console
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('profile-images')
  .upload('test.txt', file);
console.log('Upload result:', { data, error });
```

---

## 🔍 **Häufige Probleme:**

### **Problem 1: Bucket existiert nicht**
```bash
❌ Error: Bucket 'profile-images' not found
✅ Lösung: SQL-Script ausführen
```

### **Problem 2: RLS Policy Fehler**
```bash
❌ Error: new row violates row-level security policy
✅ Lösung: RLS Policies im SQL-Script ausführen
```

### **Problem 3: Falscher Bucket-Name**
```bash
❌ Code verwendet 'public' statt 'profile-images'
✅ Lösung: Korrigiert in SupabaseProfile.jsx
```

### **Problem 4: Authentifizierung**
```bash
❌ Error: JWT expired
✅ Lösung: Neu einloggen
```

---

## 🚀 **Schnelle Lösung:**

### **Falls Upload nicht funktioniert:**

1. **Führe SQL-Script aus:**
```sql
-- Nur die wichtigsten Teile
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
CREATE POLICY "Public read access for profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
    AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
  );
```

2. **Teste Upload** → Sollte jetzt funktionieren

3. **Falls immer noch Probleme** → Browser-Console prüfen

---

## 🎯 **Erwartetes Verhalten:**

### **Nach SQL-Script:**
1. **Datei auswählen** → Validierung (Typ, Größe)
2. **Upload startet** → Console zeigt "Starting upload"
3. **Upload erfolgreich** → Console zeigt "Upload successful"
4. **URL generiert** → Console zeigt "Public URL"
5. **Bild angezeigt** → Profilbild erscheint in der Vorschau

### **Console-Ausgabe:**
```
🔄 Starting upload: {fileName: "user123_1234567890.jpg", filePath: "profile-images/user123_1234567890.jpg", fileSize: 123456}
✅ Upload successful, getting public URL...
✅ Public URL: https://xxx.supabase.co/storage/v1/object/public/profile-images/user123_1234567890.jpg
```

---

## 🆘 **Falls nichts funktioniert:**

1. **Prüfe Supabase-Konfiguration** in `.env`
2. **Teste mit kleiner Datei** (< 1MB)
3. **Prüfe Browser-Konsole** auf Fehlermeldungen
4. **Teste in anderem Browser** (Inkognito-Modus)

**Der Upload sollte nach dem SQL-Script definitiv funktionieren! 🎾✨**
