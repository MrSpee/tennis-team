# 🏆 Club-System mit Duplikat-Schutz

## 📋 **Überblick**

Das neue Club-System bietet:
- ✅ **Duplikat-Prävention** durch normalisierte Namen
- 🔍 **Fuzzy-Search** für intelligente Vereinssuche
- 📊 **50+ TVM Starter-Vereine** aus Köln & Umgebung
- 🎯 **Autocomplete** im Onboarding
- 🛡️ **Admin-Verification** für neue Vereine

---

## 🚀 **Installation (3 Schritte)**

### **1. Datenbank-Schema erweitern**
```bash
# In Supabase SQL Editor ausführen:
```
📄 `CLUB_SYSTEM_SETUP.sql`

**Was passiert:**
- ✅ `club_info` Tabelle wird erweitert
- ✅ Normalisierte Namen für Duplikat-Check
- ✅ Fuzzy-Matching Funktionen
- ✅ RLS Policies

### **2. TVM Vereine importieren**
```bash
# In Supabase SQL Editor ausführen:
```
📄 `TVM_CLUBS_IMPORT.sql`

**Was passiert:**
- ✅ 50+ Vereine aus Köln & Umgebung
- ✅ Alle verifiziert und mit Metadaten
- ✅ Normalisierte Namen automatisch gesetzt

### **3. Frontend mit Autocomplete**
```bash
# Wird automatisch in OnboardingFlow.jsx integriert
```

---

## 🎯 **Features**

### **1. Duplikat-Erkennung**

**Normalisierung:**
```
"TC Rot-Weiss Köln"  → "tcrotweisskoeln"
"TC Rot Weiss Köln"  → "tcrotweisskoeln"
"T.C. Rot-Weiß Köln" → "tcrotweisskoeln"
```

**Resultat:** Alle drei Namen werden als Duplikat erkannt ✅

### **2. Fuzzy-Matching**

**Suche:** `"Kölner THC"`
**Findet:**
- ✅ Kölner THC Stadion Rot-Weiss (100%)
- ✅ TC Köln-Weiden (72%)
- ✅ TC Köln (68%)

### **3. Autocomplete im Onboarding**

**User Experience:**
```
1. User tippt: "TC Rot"
2. Dropdown zeigt:
   - TC Rot-Weiss Köln ⭐ (verifiziert)
   - TC Rot-Weiss Bonn ⭐
   - TC Rot-Weiss Brühl ⭐
   
3. User wählt aus oder klickt "Verein nicht gefunden?"
4. Bei neuem Verein: Duplikat-Check vor Speichern
```

---

## 📊 **Datenbank-Struktur**

### **club_info Tabelle**

```sql
club_info {
  id UUID PRIMARY KEY
  name TEXT NOT NULL
  normalized_name TEXT (auto-generated)
  
  -- Adresse
  city TEXT
  postal_code TEXT
  address TEXT
  
  -- Kontakt
  phone TEXT
  email TEXT
  website TEXT
  
  -- Metadaten
  federation TEXT (TVM, WTV, TNB, etc.)
  region TEXT (Mittelrhein, Westfalen, etc.)
  state TEXT (NRW, Bayern, etc.)
  
  -- Anlagen
  court_count INTEGER
  has_indoor_courts BOOLEAN
  
  -- Verifizierung
  is_verified BOOLEAN
  verification_date TIMESTAMPTZ
  verified_by UUID
  
  -- Audit
  data_source TEXT (manual, tvm_import, dtb_import)
  created_at TIMESTAMPTZ
  created_by UUID
  updated_at TIMESTAMPTZ
}
```

---

## 🔧 **SQL-Funktionen**

### **1. Ähnliche Vereine finden**
```sql
SELECT * FROM find_similar_clubs('TC Köln', 0.6);
```

**Resultat:**
```
id                                  | name              | city  | similarity
------------------------------------|-------------------|-------|----------
123e4567-e89b-12d3-a456-426614174000| TC Köln-Weiden    | Köln  | 0.85
234e5678-e89b-12d3-a456-426614174001| VKC Köln          | Köln  | 0.72
```

### **2. Duplikat-Check**
```sql
SELECT check_club_exists('TC Rot-Weiss Köln');
-- Resultat: true (wenn existiert)
```

---

## 🎨 **Frontend-Integration**

### **Autocomplete-Komponente**

```jsx
// In OnboardingFlow.jsx integriert
<ClubAutocomplete
  value={formData.selectedClubs}
  onChange={handleClubSelect}
  onAddNew={() => setShowManualForm(true)}
  placeholder="Verein suchen..."
  minChars={2}
  maxResults={10}
/>
```

**Features:**
- ⚡ Debounced Search (300ms)
- 🔍 Fuzzy-Matching
- ⭐ Verified Badge für TVM-Vereine
- ➕ "Verein nicht gefunden?" Button

---

## 📈 **Statistiken**

Nach Import:
```sql
SELECT 
  COUNT(*) as total_clubs,
  COUNT(*) FILTER (WHERE is_verified) as verified_clubs,
  COUNT(*) FILTER (WHERE federation = 'TVM') as tvm_clubs,
  COUNT(DISTINCT city) as cities
FROM club_info;
```

**Erwartetes Resultat:**
- 📊 Total: 50+ Vereine
- ⭐ Verifiziert: 50+ Vereine
- 🎾 TVM: 50+ Vereine
- 🏙️ Städte: 20+ Städte

---

## 🔐 **RLS Policies**

### **Lesen (SELECT)**
✅ Alle authentifizierten Nutzer

### **Erstellen (INSERT)**
✅ Alle authentifizierten Nutzer
- `is_verified = false` (Standard)
- `created_by = auth.uid()`

### **Bearbeiten (UPDATE)**
✅ Nur Ersteller oder Admins

### **Löschen (DELETE)**
❌ Nur Admins (manuell in Supabase)

---

## 🛠️ **Wartung**

### **Neue Vereine verifizieren**
```sql
-- Admin-Query: Alle unverifzierten Vereine
SELECT id, name, city, created_at, created_by
FROM club_info
WHERE is_verified = false
ORDER BY created_at DESC;

-- Verein verifizieren
UPDATE club_info
SET 
  is_verified = true,
  verification_date = NOW(),
  verified_by = 'admin-user-id'
WHERE id = 'club-id';
```

### **Duplikate manuell zusammenführen**
```sql
-- Finde potenzielle Duplikate
SELECT 
  c1.id, c1.name, c1.city,
  c2.id, c2.name, c2.city,
  SIMILARITY(c1.name, c2.name) as sim
FROM club_info c1
JOIN club_info c2 ON c1.id < c2.id
WHERE SIMILARITY(c1.name, c2.name) > 0.8
ORDER BY sim DESC;

-- Duplikat zusammenführen (manuell prüfen!)
-- 1. Teams zu Haupt-Verein verschieben
-- 2. Duplikat löschen
```

---

## 🚀 **Nächste Schritte**

### **Phase 3: Erweiterte Features** (optional)
- [ ] Admin-Dashboard für Vereins-Verwaltung
- [ ] Vereins-Profile mit Logo & Beschreibung
- [ ] Automatischer Import von DTB-Daten
- [ ] Regionale Gruppen (TVM, WTV, TNB)
- [ ] Statistiken pro Verein

---

## ❓ **FAQ**

**Q: Können Nutzer falsche Vereine anlegen?**
A: Ja, aber sie werden als "unverified" markiert und können vom Admin geprüft werden.

**Q: Was passiert bei Duplikaten?**
A: Der normalisierte Name verhindert exakte Duplikate. Ähnliche Namen werden beim Speichern angezeigt.

**Q: Wie oft sollte ich TVM-Daten aktualisieren?**
A: 1-2x pro Jahr oder bei größeren Änderungen.

**Q: Kann ich Vereine aus anderen Regionen hinzufügen?**
A: Ja! Entweder manuell durch Nutzer oder per CSV-Import.

---

## 📞 **Support**

Bei Fragen oder Problemen:
1. Prüfe Supabase SQL Editor Logs
2. Checke RLS Policies
3. Teste Fuzzy-Matching Funktionen

