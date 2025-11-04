# 🔍 Datenbank Redundanz-Analyse & Lösungskonzept

## ❌ AKTUELLES PROBLEM

### Saison-Daten werden an **3 verschiedenen Orten** gespeichert:

| Tabelle | Spalte(n) | Beispiel-Werte | Problem |
|---------|-----------|----------------|---------|
| `team_memberships` | `season` (TEXT) | "Winter 2025/26", "Winter", NULL | ❌ Inkonsistent formatiert |
| `team_seasons` | `season`, `league`, `group_name`, `team_size` | "Winter 2025/26", "1. Kreisliga", "Gr. 063", 4 | ✅ Strukturiert, aber nicht immer vorhanden |
| `matchdays` | `season` (TEXT) | "winter", "winter_25_26", NULL | ❌ Inkonsistent formatiert |

---

## 🎯 KONKRETE PROBLEME

### 1. **Herren 30 hat keine team_seasons**
Nach dem Duplikat-Merge wurde:
- ✅ Team erstellt
- ✅ Spieler zugeordnet
- ✅ Matches zugeordnet
- ❌ **Kein `team_seasons` Eintrag!**

**Resultat:** UI zeigt "Liga: Unbekannt", "Saison: Unbekannt"

### 2. **Verschiedene Season-Formate**
```sql
-- team_memberships:
season = 'Winter 2025/26'

-- matchdays:
season = 'winter'  ODER  'winter_25_26'

-- team_seasons:
season = 'Winter 2025/26'
```

→ Joins und Filter schlagen fehl! ❌

### 3. **Duplikate Logik**
```javascript
// Code nutzt mal:
pt.league || team.league || 'Unbekannt'

// Woher kommt pt.league? pt.current_league?
// Woher kommt team.league?
```

→ Verwirrung welche Daten aus welcher Quelle kommen!

---

## ✅ LANGFRISTIGE LÖSUNG

### **Option A: `team_seasons` als Single Source of Truth** (EMPFOHLEN)

**Prinzip:**
- `team_seasons` ist die **einzige Quelle** für Liga/Gruppe/Größe
- Alle anderen Tabellen referenzieren nur `season` als Text-ID
- **Normalisierung:** Season-Daten nur an einem Ort

**Schema-Änderungen:**

```sql
-- 1. Entferne redundante Spalten
ALTER TABLE team_memberships 
  ALTER COLUMN season TYPE TEXT;  -- Nur noch Text-ID

-- 2. Stelle sicher dass JEDES Team einen team_seasons Eintrag hat
CREATE UNIQUE INDEX idx_team_seasons_active 
ON team_seasons(team_id, season) 
WHERE is_active = true;

-- 3. Foreign Key Constraint
ALTER TABLE team_memberships
  ADD CONSTRAINT fk_membership_season
  FOREIGN KEY (team_id, season) 
  REFERENCES team_seasons(team_id, season);
```

**Application-Logik:**
```javascript
// IMMER laden:
const { data: teams } = await supabase
  .from('team_memberships')
  .select(`
    *,
    team_info(*),
    team_season:team_seasons!inner(  // ✅ JOIN erzwungen
      season, league, group_name, team_size
    )
  `)
  .eq('team_seasons.is_active', true);
```

---

### **Option B: Migration zu einheitlichem Format** (Schnelle Fix)

**Ziel:** Alle Season-Strings auf einheitliches Format normalisieren

```sql
-- 1. Normalisiere matchdays.season
UPDATE matchdays 
SET season = 'Winter 2025/26'
WHERE season IN ('winter', 'winter_25_26');

-- 2. Normalisiere team_memberships.season
UPDATE team_memberships
SET season = 'Winter 2025/26'
WHERE season = 'Winter' OR season IS NULL;

-- 3. Erstelle fehlende team_seasons
INSERT INTO team_seasons (team_id, season, league, team_size, is_active)
SELECT DISTINCT
  tm.team_id,
  'Winter 2025/26',
  '2. Bezirksliga',  -- Default
  4,                 -- Default
  true
FROM team_memberships tm
WHERE tm.season = 'Winter 2025/26'
  AND NOT EXISTS (
    SELECT 1 FROM team_seasons ts
    WHERE ts.team_id = tm.team_id
      AND ts.season = 'Winter 2025/26'
  );
```

---

## 📋 EMPFOHLENER MIGRATIONS-PLAN

### **Phase 1: Sofort-Fixes** (Heute)
1. ✅ Erstelle `team_seasons` für Herren 30 (`FIX_HERREN_30_SEASON.sql`)
2. ✅ Normalisiere Season-Formate auf "Winter 2025/26"
3. ✅ Erstelle fehlende `team_seasons` für alle Teams

### **Phase 2: Code-Cleanup** (Diese Woche)
1. ✅ Refactoring: Immer `team_seasons` JOIN nutzen
2. ✅ Fallbacks entfernen (`pt.league || team.league`)
3. ✅ Validation: Team-Erstellung MUSS `team_seasons` Eintrag erstellen

### **Phase 3: Schema-Migration** (Nächste Woche)
1. ⚠️ Foreign Key Constraints hinzufügen
2. ⚠️ Redundante Spalten als DEPRECATED markieren
3. ⚠️ Monitoring: Alerts wenn `team_seasons` fehlt

---

## 🔧 SOFORT AUSFÜHRBARE LÖSUNG

### **Komplett-Script:**

```sql
-- COMPLETE_SEASON_NORMALIZATION.sql

-- 1. Normalisiere matchdays.season
UPDATE matchdays SET season = 'Winter 2025/26'
WHERE season IN ('winter', 'winter_25_26', 'Winter');

-- 2. Normalisiere team_memberships.season
UPDATE team_memberships SET season = 'Winter 2025/26'
WHERE season IN ('Winter', 'winter') OR season IS NULL;

-- 3. Erstelle fehlende team_seasons für ALLE Teams
INSERT INTO team_seasons (team_id, season, league, group_name, team_size, is_active)
SELECT DISTINCT
  ti.id as team_id,
  'Winter 2025/26',
  COALESCE(
    (SELECT league FROM team_seasons ts2 WHERE ts2.team_id = ti.id LIMIT 1),
    '2. Bezirksliga'
  ) as league,
  COALESCE(
    (SELECT group_name FROM team_seasons ts2 WHERE ts2.team_id = ti.id LIMIT 1),
    ''
  ) as group_name,
  4 as team_size,
  true
FROM team_info ti
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons ts
  WHERE ts.team_id = ti.id
    AND ts.season = 'Winter 2025/26'
    AND ts.is_active = true
);

-- 4. Deaktiviere alte Seasons
UPDATE team_seasons 
SET is_active = false
WHERE season != 'Winter 2025/26';

-- VERIFICATION
SELECT 
  ti.club_name,
  ti.category,
  ti.team_name,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active
FROM team_info ti
LEFT JOIN team_seasons ts ON ts.team_id = ti.id AND ts.is_active = true
WHERE ti.club_name ILIKE '%VKC%'
ORDER BY ti.category;
```

---

## 💡 LANGFRISTIGE ARCHITEKTUR

### **Single Source of Truth: `team_seasons`**

```
team_info (Master-Daten)
├─ id, club_name, category, team_name
│
└─ team_seasons (Saison-spezifische Daten)
   ├─ season: "Winter 2025/26"
   ├─ league: "1. Kreisliga"
   ├─ group_name: "Gr. 063"
   ├─ team_size: 4
   └─ is_active: true

team_memberships (Zuordnung)
├─ team_id → team_info
└─ season → team_seasons.season (TEXT-Referenz)

matchdays (Spiele)
├─ home_team_id → team_info
└─ season → team_seasons.season (TEXT-Referenz)
```

**Vorteil:**
- ✅ Liga/Gruppe nur an **einem Ort**
- ✅ Historische Saisons möglich
- ✅ Klare Daten-Hierarchie

---

## 📊 NÄCHSTE SCHRITTE

1. **Führe aus:** `FIX_HERREN_30_SEASON.sql` (Sofort-Fix)
2. **Erstelle:** `COMPLETE_SEASON_NORMALIZATION.sql` (Alle Teams)
3. **Code-Refactoring:** Immer `team_seasons` JOIN verwenden
4. **Schema-Migration:** Foreign Keys + Constraints

---

**Soll ich das Komplett-Script erstellen?** 🔧


