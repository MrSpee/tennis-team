# 🔧 Storage Debugging - Schritt für Schritt

## 🚨 **Problem:**
```
Keine Storage-Buckets verfügbar. Prüfen Sie die Supabase-Konfiguration.
```

## 🔍 **Debugging-Schritte:**

### **1. Debug-Tool verwenden**

1. **Gehe zu `/profile`** in der App
2. **Schaue nach der Debug-Box** oben auf der Seite
3. **Klicke "Test Storage Configuration"**
4. **Schaue dir die Ergebnisse an**

### **2. Mögliche Ergebnisse interpretieren:**

#### **✅ Alles OK:**
```json
{
  "supabaseClient": true,
  "buckets": [{"name": "public"}],
  "bucketError": null,
  "user": "user@example.com",
  "dbConnection": true
}
```

#### **❌ Keine Buckets:**
```json
{
  "supabaseClient": true,
  "buckets": [],
  "bucketError": null,
  "user": "user@example.com"
}
```
**Lösung:** SQL-Script ausführen

#### **❌ Auth-Problem:**
```json
{
  "supabaseClient": true,
  "buckets": [],
  "user": "Not authenticated",
  "authError": "JWT expired"
}
```
**Lösung:** Neu einloggen

#### **❌ Supabase-Config-Problem:**
```json
{
  "supabaseClient": false,
  "error": "Cannot read properties of undefined"
}
```
**Lösung:** .env Datei prüfen

---

## 🛠️ **Häufige Probleme und Lösungen:**

### **Problem 1: Keine Buckets**
```bash
✅ Lösung: QUICK_BUCKET_FIX.sql ausführen
```

### **Problem 2: Falsche Supabase-URL/Key**
```bash
❌ Check .env Datei:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Problem 3: Storage nicht aktiviert**
```bash
✅ Supabase Dashboard → Settings → API
✅ Storage aktiviert?
```

### **Problem 4: RLS Policies blockieren**
```bash
✅ SQL-Script ausführen für Policies
```

---

## 🚀 **Schnelle Lösungen:**

### **Lösung A: SQL ausführen**
```sql
-- QUICK_BUCKET_FIX.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;
```

### **Lösung B: .env prüfen**
```bash
# .env Datei
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **Lösung C: Supabase Dashboard prüfen**
```bash
1. Dashboard → Storage
2. Buckets vorhanden?
3. Settings → API → Keys korrekt?
```

---

## 🎯 **Erwartetes Verhalten nach Fix:**

### **Debug-Tool sollte zeigen:**
```json
{
  "supabaseClient": true,
  "buckets": [
    {"name": "public"},
    {"name": "profile-images"}
  ],
  "bucketError": null,
  "user": "user@example.com",
  "dbConnection": true
}
```

### **Upload sollte funktionieren:**
1. **Bild auswählen** → Validierung OK
2. **Console zeigt** → "Using bucket: profile-images"
3. **Upload erfolgreich** → "Upload successful"
4. **Bild erscheint** → In der Vorschau

---

## 🆘 **Falls nichts funktioniert:**

### **Manueller Test in Browser-Console:**
```javascript
// Test 1: Supabase Client
console.log('Supabase:', supabase);

// Test 2: Buckets
supabase.storage.listBuckets().then(console.log);

// Test 3: Auth
supabase.auth.getUser().then(console.log);

// Test 4: Database
supabase.from('players').select('id').limit(1).then(console.log);
```

### **Erwartete Console-Ausgabe:**
```
Supabase: SupabaseClient {url: "https://...", key: "..."}
Buckets: {data: [{name: "public"}], error: null}
User: {data: {user: {email: "..."}}, error: null}
Database: {data: [{id: "..."}], error: null}
```

---

## 🎉 **Nach erfolgreichem Debug:**

**Entfernen Sie die Debug-Komponente:**
```javascript
// In SupabaseProfile.jsx
// <StorageDebug /> ← Diese Zeile entfernen
```

**Der Upload sollte dann einwandfrei funktionieren! 🎾✨**
