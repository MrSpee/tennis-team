# 🎾 Venues & Surface System - Hallenplan mit Belag-Info

## 📋 ÜBERBLICK

Das Venues & Surface System ermöglicht die Verwaltung von Tennishallen/-plätzen mit detaillierten Belag-Informationen und Schuh-Empfehlungen.

---

## 🎯 HAUPTFUNKTIONEN

### ✅ Implementiert:
1. **Surface Types** - 10 Belag-Typen mit Schuh-Empfehlungen
2. **Venues** - Hallen/Plätze mit Adresse, Kontakt, Belag
3. **Matchday-Integration** - Verlinkung von Matches zu Venues
4. **Schuh-Empfehlungen** - Automatische Anzeige basierend auf Belag

---

## 🏟️ BELAG-TYPEN & SCHUH-EMPFEHLUNGEN

### **🟦 TEPPICH-BELÄGE (Glatte Sohle PFLICHT)**

#### **1. Teppich (Carpet)**
- **Schuhe:** Hallenschuhe mit **glatter Sohle** PFLICHT
- **Geschwindigkeit:** ⚡⚡⚡⚡⚡ (sehr schnell)
- **Sprung:** ⬇️⬇️ (niedrig)
- **Warum glatt?** Profil kann hängenbleiben → Verletzungsgefahr!

#### **2. Supreme**
- **Schuhe:** Hallenschuhe mit **glatter Sohle** PFLICHT
- **Geschwindigkeit:** ⚡⚡⚡⚡⚡ (sehr schnell)
- **Sprung:** ⬇️⬇️ (niedrig)
- **Besonderheit:** Hochwertiger Teppich, sehr rutschig

#### **3. Taraflex**
- **Schuhe:** Hallenschuhe mit **glatter Sohle** empfohlen
- **Geschwindigkeit:** ⚡⚡⚡⚡ (schnell)
- **Sprung:** ⬇️⬇️⬇️ (mittel)
- **Besonderheit:** Synthetik, ähnlich Teppich aber etwas griffiger

---

### **🟨 GRANULAT/SAND-BELÄGE (Profil möglich)**

#### **4. Granulat**
- **Schuhe:** Sandplatzschuhe mit **Profil** oder Allcourt
- **Geschwindigkeit:** ⚡⚡⚡ (mittel)
- **Sprung:** ⬇️⬇️⬇️ (mittel)
- **Wie Sommer:** Ja, ähnlich wie Sandplatz

#### **5. Asche (Clay)**
- **Schuhe:** Sandplatzschuhe mit **Fischgrätenprofil**
- **Geschwindigkeit:** ⚡⚡ (langsam)
- **Sprung:** ⬇️⬇️⬇️⬇️ (hoch)
- **Wie Sommer:** Ja, identisch mit Outdoor-Sandplatz

---

### **💙 HARTPLATZ-BELÄGE (Profil empfohlen)**

#### **6. Rebound Ace**
- **Schuhe:** Hartplatzschuhe mit **Profil**
- **Geschwindigkeit:** ⚡⚡⚡⚡ (schnell)
- **Sprung:** ⬇️⬇️⬇️ (mittel)
- **Wo gespielt:** Australian Open (Melbourne)

#### **7. Laykold**
- **Schuhe:** Hartplatzschuhe mit **Profil**
- **Geschwindigkeit:** ⚡⚡⚡⚡ (schnell)
- **Sprung:** ⬇️⬇️⬇️ (mittel)
- **Wo gespielt:** US Open (New York)

#### **8. DecoTurf**
- **Schuhe:** Hartplatzschuhe mit **Profil**
- **Geschwindigkeit:** ⚡⚡⚡ (mittel)
- **Sprung:** ⬇️⬇️⬇️ (mittel)
- **Besonderheit:** Beliebter Acryl-Belag in USA

---

### **⚪ UNIVERSAL**

#### **9. Kunststoff (Synthetic)**
- **Schuhe:** Allcourt-Schuhe
- **Geschwindigkeit:** ⚡⚡⚡ (mittel)
- **Sprung:** ⬇️⬇️⬇️ (mittel)

#### **10. Unbekannt**
- **Schuhe:** Allcourt-Schuhe zur Sicherheit
- **Fallback:** Wenn Belag nicht bekannt

---

## 💾 DATENBANK-STRUKTUR

### **surface_types**
```sql
{
  id: UUID,
  name: TEXT,                      -- 'Teppich', 'Granulat', etc.
  name_en: TEXT,                   -- 'Carpet', 'Granulate'
  description: TEXT,
  shoe_recommendation: TEXT,        -- 'Hallenschuhe mit glatter Sohle'
  shoe_type: 'smooth' | 'profile' | 'both',
  speed_rating: INTEGER (1-5),     -- 1=langsam, 5=schnell
  bounce_rating: INTEGER (1-5),    -- 1=niedrig, 5=hoch
  is_indoor: BOOLEAN,
  icon_emoji: TEXT,                -- '🟦', '🟨', etc.
  color_hex: TEXT                  -- '#3b82f6'
}
```

### **venues**
```sql
{
  id: UUID,
  name: TEXT,                      -- 'TH Schloß Morsbroich'
  club_name: TEXT,                 -- 'RTHC Bayer'
  street: TEXT,
  postal_code: TEXT,
  city: TEXT,
  region: TEXT,
  latitude: DECIMAL,
  longitude: DECIMAL,
  surface_type_id: UUID,           -- → surface_types
  court_count: INTEGER,
  indoor: BOOLEAN,
  has_parking: BOOLEAN,
  has_restaurant: BOOLEAN,
  has_pro_shop: BOOLEAN,
  notes: TEXT,
  phone: TEXT,
  email: TEXT,
  website: TEXT,
  is_verified: BOOLEAN
}
```

### **matchdays (erweitert)**
```sql
{
  ...existing fields...,
  venue_id: UUID  -- ✅ NEU: → venues
}
```

---

## 🎨 UI/UX DESIGN

### **Dashboard - Vor Match:**

```
📅 NÄCHSTES SPIEL
Sa., 16. Nov • 18:00 Uhr

📍 TH Schloß Morsbroich
   Morsbroicher Weg 191, 51375 Leverkusen

⚠️ WICHTIG: Belag-Info
┌────────────────────────────────────┐
│ 🟦 TEPPICH                        │
│                                    │
│ 👟 Hallenschuhe PFLICHT            │
│ ✅ Glatte Sohle                   │
│ ❌ KEIN Profil (Verletzungsgefahr)│
└────────────────────────────────────┘
```

### **Match-Card (erweitert):**

```
🏠 HEIMSPIEL
vs. TC Rot-Weiss Köln 1

📍 Cologne Sportspark
🟨 Granulat | 👟 Profil OK

[Zusagen] [Details]
```

---

## 🚀 INSTALLATION

### **1. Datenbank Setup:**
```sql
→ CREATE_VENUES_SURFACE_SYSTEM.sql
```

**Erstellt:**
- ✅ Tabelle `surface_types` (10 Belag-Typen)
- ✅ Tabelle `venues`
- ✅ Spalte `matchdays.venue_id`
- ✅ Helper Functions (2)
- ✅ RLS Policies

---

## 📝 NÄCHSTE SCHRITTE

### **Phase 1: Daten-Import (TODO)**
```sql
-- Manuelle Venue-Erstellung für Mittelrhein
INSERT INTO venues (name, club_name, city, surface_type_id, ...)
VALUES (...);
```

### **Phase 2: Frontend-Integration (TODO)**

**Dashboard.jsx:**
```jsx
{nextMatch && (
  <div className="surface-warning">
    <SurfaceInfo matchId={nextMatch.id} />
  </div>
)}
```

**Neue Komponente: `SurfaceInfo.jsx`**
```jsx
function SurfaceInfo({ matchId }) {
  const [surface, setSurface] = useState(null);
  
  // Lade Belag-Info
  const { data } = await supabase.rpc('get_shoe_recommendation', { 
    p_matchday_id: matchId 
  });
  
  return (
    <div className="surface-card">
      <div className="surface-icon">{surface.icon}</div>
      <div className="surface-name">{surface.surface_name}</div>
      <div className="shoe-rec">{surface.shoe_recommendation}</div>
    </div>
  );
}
```

### **Phase 3: Venue-Verwaltung (TODO)**
- Super-Admin kann Venues erstellen/bearbeiten
- Import von TVM Hallenplan (CSV/PDF Parser)
- Automatische Venue-Zuordnung beim Match-Import

---

## 📊 BEISPIEL-DATEN

### **TVM Mittelrhein Hallen:**
```sql
-- TH Schloß Morsbroich (RTHC Bayer)
INSERT INTO venues (name, club_name, city, street, postal_code, surface_type_id)
VALUES (
  'TH Schloß Morsbroich',
  'RTHC Bayer Leverkusen',
  'Leverkusen',
  'Morsbroicher Weg 191',
  '51375',
  (SELECT id FROM surface_types WHERE name = 'Teppich')
);

-- Cologne Sportspark (VKC Köln)
INSERT INTO venues (name, club_name, city, street, postal_code, surface_type_id)
VALUES (
  'Cologne Sportspark',
  'VKC Köln',
  'Köln',
  'Friedrich-Karl-Straße 2a',
  '50735',
  (SELECT id FROM surface_types WHERE name = 'Granulat')
);
```

---

## 🔍 HELPER QUERIES

### **Finde Venue für Match:**
```sql
SELECT v.name, v.city, st.name as surface, st.shoe_recommendation
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
JOIN surface_types st ON st.id = v.surface_type_id
WHERE m.id = 'match-id';
```

### **Alle Granulat-Hallen:**
```sql
SELECT v.name, v.club_name, v.city
FROM venues v
JOIN surface_types st ON st.id = v.surface_type_id
WHERE st.name = 'Granulat';
```

### **Matches auf Teppich (glatte Sohle erforderlich):**
```sql
SELECT m.match_date, m.venue, st.name, st.shoe_recommendation
FROM matchdays m
JOIN venues v ON v.id = m.venue_id
JOIN surface_types st ON st.id = v.surface_type_id
WHERE st.shoe_type = 'smooth'
  AND m.match_date >= NOW()
ORDER BY m.match_date;
```

---

## ⚠️ WICHTIGE HINWEISE

### **Schuh-Regeln:**

#### **✅ ERLAUBT:**
| Belag | Glatte Sohle | Profil |
|-------|--------------|---------|
| Teppich | ✅ PFLICHT | ❌ VERBOTEN |
| Supreme | ✅ PFLICHT | ❌ VERBOTEN |
| Taraflex | ✅ Empfohlen | ⚠️ Nicht ideal |
| Granulat | ✅ OK | ✅ OK |
| Asche | ⚠️ Nicht ideal | ✅ Empfohlen |
| Rebound Ace | ✅ OK | ✅ Empfohlen |
| Laykold | ✅ OK | ✅ Empfohlen |
| DecoTurf | ✅ OK | ✅ Empfohlen |

#### **⚠️ SICHERHEIT:**
- **Teppich mit Profil-Schuhen:** GEFÄHRLICH! Profil kann hängenbleiben → Knieverletzungen
- **Hartplatz mit glatten Schuhen:** Möglich, aber weniger Grip
- **Im Zweifel:** Allcourt-Schuhe (moderate Profil)

---

## 🚀 DEPLOYMENT CHECKLISTE

- [ ] SQL-Script ausgeführt: `CREATE_VENUES_SURFACE_SYSTEM.sql`
- [ ] 10 Surface Types erstellt
- [ ] Venues aus PDF importiert
- [ ] `matchdays.venue_id` verlinkt
- [ ] Frontend-Komponente `SurfaceInfo.jsx` erstellt
- [ ] Dashboard-Integration
- [ ] Match-Card-Integration
- [ ] Super-Admin Venue-Verwaltung UI

---

**Version:** 1.0  
**Erstellt:** 04.11.2025  
**Basierend auf:** TVM Mittelrhein Hallenplan Winter 2024/2025



