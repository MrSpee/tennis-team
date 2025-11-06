# 🗄️ Datenbank-Struktur: Spieler-Zuordnung & Beziehungen

## 📊 Kern-Philosophie

**EINE zentrale Spieler-Tabelle für ALLE Spieler:**
- Eigene Vereins-Spieler (mit `user_id`)
- Gegner-Spieler (ohne `user_id`)
- Importierte Spieler (KI-Import mit `status='pending'`)
- Alle werden in `players_unified` gespeichert!

---

## 🏗️ Datenbank-Schema Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    DATENBANK-STRUKTUR                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ club_info    │         │ team_info   │         │ matchdays   │
│              │         │              │         │              │
│ id (PK)      │◄────────│ club_name   │         │ id (PK)      │
│ name         │         │ team_name   │◄────────│ home_team_id │
│ city         │         │ category    │         │ away_team_id │
│ region       │         │ league      │         │ match_date   │
│ website      │         │ group_name  │         │ venue        │
└──────────────┘         │ id (PK)     │         │ season       │
                         └──────┬──────┘         │ status       │
                                │                 └──────────────┘
                                │                          │
                                │                          │
                         ┌──────▼──────┐                  │
                         │team_members│                  │
                         │   ships     │                  │
                         │             │                  │
                         │ id (PK)     │                  │
                         │ player_id ──┼──────────────────┘
                         │ team_id     │
                         │ role        │    ┌──────────────┐
                         │ is_active   │    │match_results │
                         │ season      │    │              │
                         └──────┬──────┘    │ id (PK)      │
                                │           │ matchday_id  │
                                │           │ player_home_1│
┌──────────────┐                │           │ player_home_2│
│players_unified│◄──────────────┘           │ player_away_1│
│              │                             │ player_away_2│
│ id (PK)      │◄────────────────────────────│ score_home   │
│ name         │                             │ score_away   │
│ current_lk   │                             │ winner       │
│ tvm_id_number│                             └──────────────┘
│ user_id      │
│ player_type  │    ┌──────────────┐
│ status       │    │match_availability│
│ is_active    │    │              │
│ import_source│◄───│ id (PK)      │
└──────────────┘    │ matchday_id  │
                   │ player_id    │
                   │ status       │
                   │ comment      │
                   └──────────────┘
```

---

## 📋 Detaillierte Tabellen-Struktur

### 1. `club_info` - Vereine
```sql
id              UUID (PK)          -- Eindeutige ID
name            VARCHAR(100)        -- "TV Ensen Westhoven"
city            VARCHAR(100)        -- "Köln"
region          VARCHAR(50)         -- "Mittelrhein"
website         VARCHAR(255)        -- "http://..."
```

**Beispiel:**
- `id: b61867d7-e2ed-4047-9e89-2385bbd46a1c`
- `name: "TV Ensen Westhoven"`
- `city: "Köln"`

---

### 2. `team_info` - Mannschaften
```sql
id              UUID (PK)          -- Eindeutige ID
club_name       VARCHAR(100)        -- "TV Ensen Westhoven" (VERKNÜPFUNG zu club_info)
team_name       VARCHAR(50)         -- "1" (nicht "Herren 40"!)
category        VARCHAR(50)         -- "Herren 40"
league          VARCHAR(100)        -- "1. Kreisliga Gr. 046"
group_name      VARCHAR(50)          -- "046"
region          VARCHAR(50)         -- "Mittelrhein"
```

**WICHTIG:** 
- `team_name` = **nur Nummer** ("1", "2", "3") - nicht "Herren 40 1"!
- `category` = Altersklasse ("Herren 40", "Herren 50")
- **KEIN** `club_id` Feld direkt! (nur `club_name` als String-Verbindung)

**Beispiel:**
- `id: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c`
- `club_name: "TV Ensen Westhoven"`
- `team_name: "1"` ✅ (nicht "Herren 40" ❌)
- `category: "Herren 40"`

---

### 3. `players_unified` - ALLE Spieler
```sql
id              UUID (PK)          -- Eindeutige ID
name            VARCHAR(100)        -- "Jochen Becker-Grüll"
current_lk      VARCHAR(10)         -- "11.1"
tvm_id_number  VARCHAR(50)         -- "17102247" (TVM Spieler-ID)
user_id         UUID                -- NULL für externe Spieler
player_type     VARCHAR(20)         -- 'app_user' | 'opponent'
status          VARCHAR(20)         -- 'active' | 'pending' | 'inactive'
import_source   VARCHAR(50)         -- 'tvm_import' | 'manual'
is_active       BOOLEAN             -- true/false
is_captain      BOOLEAN             -- true/false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Spieler-Typen:**

| Typ | user_id | status | import_source | Beschreibung |
|-----|---------|--------|---------------|--------------|
| **App-User** | ✅ (UUID) | `active` | `null` | Eigene Spieler, haben Account |
| **Importiert** | ❌ NULL | `pending` | `tvm_import` | KI-Import, noch nicht aktiviert |
| **Gegner** | ❌ NULL | `active` | `manual` | Manuell erstellt, kein Account |

**Beispiel (Importierter Spieler):**
- `id: e308315b-675d-41b6-b21d-010e7af0832e`
- `name: "Jochen Becker-Grüll"`
- `current_lk: "11.1"`
- `tvm_id_number: "17102247"`
- `user_id: NULL` (noch kein Account)
- `status: "pending"` (noch nicht aktiviert)
- `import_source: "tvm_import"`

---

### 4. `team_memberships` - Spieler ↔ Teams Verknüpfung
```sql
id              UUID (PK)          -- Eindeutige ID
player_id       UUID → players_unified(id)  -- Welcher Spieler?
team_id         UUID → team_info(id)        -- Welches Team?
role            VARCHAR(20)         -- 'player' | 'captain'
is_primary      BOOLEAN             -- Haupt-Team?
season          VARCHAR(50)         -- "Winter 2025/26"
is_active       BOOLEAN             -- ⚠️ WICHTIG: nur aktive erscheinen im Dropdown!
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE(player_id, team_id, season)  -- Ein Spieler kann nicht 2x im gleichen Team sein
```

**WICHTIG:** 
- Ein Spieler kann in **mehreren Teams** sein (verschiedene `team_id`)
- Ein Spieler kann in **mehreren Saisons** sein (verschiedene `season`)
- **NUR** Memberships mit `is_active = true` erscheinen in der UI!

**Beispiel:**
- `player_id: e308315b-675d-41b6-b21d-010e7af0832e` (Jochen Becker-Grüll)
- `team_id: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c` (TV Ensen Westhoven 1)
- `role: "player"`
- `season: "Winter 2025/26"`
- `is_active: true` ✅ (erscheint im Dropdown)

---

### 5. `matchdays` - Spieltage
```sql
id              UUID (PK)          -- Eindeutige ID
home_team_id    UUID → team_info(id)  -- Heim-Team
away_team_id    UUID → team_info(id)  -- Auswärts-Team
match_date      TIMESTAMPTZ        -- Datum & Zeit
venue           VARCHAR(255)        -- Spielort
location        VARCHAR(20)         -- 'Home' | 'Away'
season          VARCHAR(50)         -- "Winter 2025/26"
status          VARCHAR(20)         -- 'scheduled' | 'finished'
home_score      INTEGER            -- Matchpunkte Home
away_score      INTEGER            -- Matchpunkte Away
```

**Beispiel:**
- `home_team_id: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c` (TV Ensen Westhoven 1)
- `away_team_id: ...` (Gegner-Team)

---

### 6. `match_results` - Einzelne Spielergebnisse
```sql
id              UUID (PK)          -- Eindeutige ID
matchday_id     UUID → matchdays(id)  -- Zu welchem Spieltag?
match_number    INTEGER            -- Position im Match (1-6)
match_type      VARCHAR(20)        -- 'singles' | 'doubles'
player_home_1_id  UUID → players_unified(id)  -- Home Spieler 1
player_home_2_id  UUID → players_unified(id)  -- Home Spieler 2 (Doubles, optional)
player_away_1_id  UUID → players_unified(id)  -- Away Spieler 1
player_away_2_id  UUID → players_unified(id)  -- Away Spieler 2 (Doubles, optional)
score_home      VARCHAR(20)        -- "6:4, 6:3"
score_away      VARCHAR(20)        -- "4:6, 3:6"
winner          VARCHAR(10)         -- 'home' | 'away'
```

---

### 7. `match_availability` - Verfügbarkeiten
```sql
id              UUID (PK)          -- Eindeutige ID
matchday_id     UUID → matchdays(id)  -- Zu welchem Spieltag?
player_id       UUID → players_unified(id)  -- Welcher Spieler?
status          VARCHAR(20)         -- 'available' | 'unavailable' | 'pending'
comment         TEXT               -- Kommentar
```

---

## 🔄 Spieler-Datenfluss

### A) KI-Import eines Spielers

```
1. KI-Import erkennt Spieler:
   ┌─────────────────────────────────────┐
   │ Name: "Jochen Becker-Grüll"       │
   │ LK: "11.1"                         │
   │ TVM ID: "17102247"                 │
   │ Verein: "TV Ensen Westhoven"       │
   │ Team: "1"                          │
   └─────────────────────────────────────┘
                    │
                    ▼
2. Fuzzy-Matching prüft:
   - Existiert Spieler mit Name + LK + TVM ID?
   - Wenn JA → Update existierender Spieler
   - Wenn NEIN → Neuer Spieler erstellen
                    │
                    ▼
3. Erstelle/Update in players_unified:
   ┌─────────────────────────────────────┐
   │ players_unified                     │
   │   id: e308315b-...                  │
   │   name: "Jochen Becker-Grüll"      │
   │   current_lk: "11.1"                │
   │   tvm_id_number: "17102247"        │
   │   status: "pending"                 │
   │   import_source: "tvm_import"      │
   │   user_id: NULL                     │
   └─────────────────────────────────────┘
                    │
                    ▼
4. Verknüpfe mit Team:
   ┌─────────────────────────────────────┐
   │ team_memberships                    │
   │   player_id: e308315b-...          │
   │   team_id: 6decfef3-...             │
   │   role: "player"                    │
   │   season: "Winter 2025/26"          │
   │   is_active: true  ✅               │
   └─────────────────────────────────────┘
```

### B) Spieler in Ergebniseingabe laden

```
1. User öffnet Ergebniseingabe für Matchday:
   ┌─────────────────────────────────────┐
   │ matchday                            │
   │   home_team_id: 6decfef3-...       │
   │   away_team_id: ...                 │
   └─────────────────────────────────────┘
                    │
                    ▼
2. Lade Team-Memberships (NUR aktive!):
   SELECT * FROM team_memberships
   WHERE team_id = home_team_id
     AND is_active = true  ⚠️ WICHTIG!
                    │
                    ▼
3. Lade Spieler-Daten:
   SELECT * FROM players_unified
   WHERE id IN (team_member_ids)
                    │
                    ▼
4. Zeige im Dropdown:
   ✅ Jochen Becker-Grüll
   ✅ Christoph Lindenschmidt
   ✅ ...
```

---

## ⚠️ Wichtige Regeln & Best Practices

### ✅ RICHTIG:

1. **Team-Name Format:**
   - ✅ `team_name: "1"` 
   - ❌ `team_name: "Herren 40 1"`
   - ❌ `team_name: "Herren 40"`

2. **team_memberships `is_active`:**
   - ✅ Immer `is_active = true` setzen für neue Memberships
   - ✅ Filtere nach `is_active = true` beim Laden (LiveResultsWithDB)

3. **Spieler-Import:**
   - ✅ Erstelle immer `team_membership` wenn Spieler importiert wird
   - ✅ Setze `status = 'pending'` für KI-Import Spieler
   - ✅ Setze `is_active = true` in `team_membership`

### ❌ VERMEIDEN:

1. **Team-Name Fehler:**
   - ❌ `team_name: "Herren 40"` → sollte `"1"` sein
   - Die Category ist `"Herren 40"`, nicht `team_name`!

2. **Vergessene Memberships:**
   - ❌ Spieler ohne `team_membership` erscheinen nicht im Dropdown
   - ✅ Immer `team_membership` erstellen beim Import

3. **Inaktive Memberships:**
   - ❌ `is_active = false` → Spieler nicht sichtbar
   - ✅ Immer `is_active = true` für neue Memberships

---

## 🔍 Debugging: Spieler erscheint nicht im Dropdown

**Checkliste:**

1. ✅ Spieler existiert in `players_unified`?
   ```sql
   SELECT * FROM players_unified WHERE name = '...';
   ```

2. ✅ `team_membership` existiert?
   ```sql
   SELECT * FROM team_memberships 
   WHERE player_id = '...' 
     AND team_id = '...';
   ```

3. ✅ `is_active = true`?
   ```sql
   SELECT * FROM team_memberships 
   WHERE player_id = '...' 
     AND team_id = '...'
     AND is_active = true;
   ```

4. ✅ Team-ID stimmt mit Matchday überein?
   ```sql
   SELECT home_team_id, away_team_id FROM matchdays WHERE id = '...';
   ```

---

## 📝 Beispiel: Kompletter Datenfluss

### Beispiel: "Jochen Becker-Grüll" von TV Ensen Westhoven

```sql
-- 1. Verein
club_info:
  id: b61867d7-e2ed-4047-9e89-2385bbd46a1c
  name: "TV Ensen Westhoven"

-- 2. Team
team_info:
  id: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c
  club_name: "TV Ensen Westhoven"  ← Verknüpfung zu club_info.name
  team_name: "1"                    ← ✅ RICHTIG
  category: "Herren 40"

-- 3. Spieler
players_unified:
  id: e308315b-675d-41b6-b21d-010e7af0832e
  name: "Jochen Becker-Grüll"
  current_lk: "11.1"
  tvm_id_number: "17102247"
  status: "pending"
  import_source: "tvm_import"

-- 4. Verknüpfung
team_memberships:
  player_id: e308315b-675d-41b6-b21d-010e7af0832e  ← FK zu players_unified
  team_id: 6decfef3-1d82-4bc4-b5de-f24d5a70fa0c   ← FK zu team_info
  role: "player"
  season: "Winter 2025/26"
  is_active: true  ✅
```

---

## 🎯 Zusammenfassung

**Kern-Prinzipien:**
1. **EINE Tabelle für alle Spieler:** `players_unified`
2. **Viele-zu-Viele Beziehung:** `team_memberships` verbindet Spieler ↔ Teams
3. **Aktivitäts-Flag:** Nur `is_active = true` Memberships erscheinen in UI
4. **Team-Name Format:** Immer nur Nummer ("1"), Category separat ("Herren 40")

**Wichtigste Verknüpfungen:**
- `players_unified` ←→ `team_memberships` ←→ `team_info`
- `team_info.club_name` → `club_info.name` (String-Verknüpfung)
- `matchdays.home_team_id` → `team_info.id`
- `match_results.player_home_1_id` → `players_unified.id`








