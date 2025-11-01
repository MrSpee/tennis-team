# 📊 Dashboard.jsx - Datenquellen-Analyse

## Übersicht: Welche Daten werden aus welchen Quellen geladen?

---

## 1️⃣ CONTEXT PROVIDER

`Dashboard.jsx` lädt **KEINE Daten direkt** aus der DB!  
Stattdessen nutzt es **2 Context Provider**:

### **A) `AuthContext` (Zeile 14)**
```javascript
const { currentUser, player } = useAuth();
```

**Quelle:** `tennis-team/src/context/AuthContext.jsx`

**Geladene Daten:**
- `currentUser` - Supabase Auth User (email, id, metadata)
- `player` - Spieler aus `players_unified` Tabelle

**SQL-Query in AuthContext (Zeile 194-198):**
```javascript
const { data: allPlayers } = await supabase
  .from('players_unified')
  .select('*')
  .eq('user_id', userId)
  .eq('player_type', 'app_user');
```

**Was wird geladen:**
- ✅ `id`, `name`, `email`, `phone`
- ✅ `current_lk`, `season_start_lk`, `ranking`
- ✅ `primary_team_id` ⚠️ **KANN NULL SEIN!**
- ✅ `player_type`, `is_active`, `onboarding_status`
- ✅ Alle anderen Spieler-Felder

---

### **B) `DataContext` (Zeile 15-19)**
```javascript
const { 
  matches,      // Alle Matches
  teamInfo,     // Team-Info (FALLBACK!)
  playerTeams   // Teams des Spielers
} = useData();
```

**Quelle:** `tennis-team/src/context/DataContext.jsx`

---

## 2️⃣ DATENQUELLEN im DETAIL

### **`playerTeams` - Die HAUPTQUELLE für Team-Anzeige**

**SQL-Query in DataContext (Zeile 130-168):**
```javascript
const { data, error } = await supabase
  .from('team_memberships')
  .select(`
    *,
    team_info!inner (
      id,
      club_name,
      team_name,
      category,
      region,
      tvm_link
    )
  `)
  .eq('player_id', playerId)
  .eq('is_active', true);
```

**Dann für jedes Team (Zeile 172-233):**
```javascript
// Lade team_seasons für aktuelle Saison
const { data: seasonData } = await supabase
  .from('team_seasons')
  .select('*')
  .eq('team_id', pt.team_info.id)
  .eq('season', currentSeason)  // z.B. 'Winter 2025/26'
  .eq('is_active', true)
  .maybeSingle();

// Lade Spieler-Anzahl
const { count: playerCount } = await supabase
  .from('team_memberships')
  .select('*', { count: 'exact', head: true })
  .eq('team_id', pt.team_info.id)
  .eq('is_active', true);
```

**Ergebnis-Struktur:**
```javascript
{
  id: 'team-uuid',
  club_name: 'SV Rot-Gelb Sürth',
  team_name: '1',
  category: 'Herren 40',
  region: 'Mittelrhein',
  tvm_link: 'https://...',
  is_primary: true,
  role: 'player',
  // Aus team_seasons:
  league: '2. Bezirksliga',
  group_name: 'Gr. 054',
  team_size: 6,
  season: 'Winter 2025/26',
  // Berechnet:
  player_count: 9
}
```

**WO wird es angezeigt im Dashboard:**
- ✅ Zeile 788-1018: `playerTeams.map(...)` - **HAUPTANZEIGE!**
- ✅ Zeile 798-1017: Zeigt alle Teams des Spielers gruppiert nach Verein

---

### **`teamInfo` - Der GEFÄHRLICHE FALLBACK** ⚠️

**WICHTIG:** Wird NUR verwendet wenn `playerTeams.length === 0`!

**SQL-Query in DataContext (Zeile 548-552):**
```javascript
const { data, error } = await supabase
  .from('team_info')
  .select('*')
  .limit(1)      // ❌ NIMMT EINFACH DAS ERSTE TEAM!
  .maybeSingle();
```

**WO wird es angezeigt im Dashboard:**
- ⚠️ Zeile 1019-1074: `teamInfo ? (...)` - **NUR FALLBACK!**
- ⚠️ Wird nur genutzt wenn `playerTeams` leer ist

**Das Problem:**
- Wenn `primary_team_id = NULL` ist
- UND `playerTeams` korrekt geladen wird
- Wird `teamInfo` **NICHT** verwendet! ✅

**ABER:**
- Wenn `selectedTeamId` gesetzt ist (Zeile 501-536)
- Wird ein spezifisches Team aus `team_info` geladen
- Das ist OK, da es vom User gewählt wird

---

### **`matches` - Match-Daten**

**SQL-Query in DataContext (Zeile 286-314):**
```javascript
const result = await supabase
  .from('matchdays')
  .select(`
    *,
    home_team:home_team_id (
      id,
      club_name,
      team_name,
      category
    ),
    away_team:away_team_id (
      id,
      club_name,
      team_name,
      category
    )
  `)
  .or(`home_team_id.in.(${playerTeamIds.join(',')}),away_team_id.in.(${playerTeamIds.join(',')})`)
  .order('match_date', { ascending: true });
```

**Filter:** Nur Matches wo ein Team des Spielers beteiligt ist!

---

## 3️⃣ PROBLEM-ANALYSE: Robert Ellrich

### **Was Dashboard ANZEIGEN SOLLTE:**

**Quelle:** `playerTeams` aus `DataContext`

```javascript
playerTeams = [
  {
    club_name: 'SV Rot-Gelb Sürth',  // ✅ KORREKT!
    team_name: '1',
    category: 'Herren 40',
    is_primary: true
  }
]
```

**WO:** Dashboard.jsx Zeile 798-1017

### **Was Dashboard ANZEIGT:**

```
TC Rot-Weiss Köln  // ❌ FALSCH!
Herren 50
Kreisliga
```

---

## 4️⃣ HYPOTHESEN

### **Hypothese 1: `playerTeams` ist leer** ⚠️
Wenn `playerTeams.length === 0`:
- Dashboard zeigt den `teamInfo` Fallback (Zeile 1019-1074)
- `teamInfo` wird aus `.limit(1)` geladen (erstes Team in DB)
- Das wäre alphabetisch "Bayer 04 Leverkusen" oder "KölnerTHC"
- **ABER Screenshot zeigt "TC Rot-Weiss Köln"** → passt nicht ganz

### **Hypothese 2: DataContext lädt falsche Daten** 🔍
- `primary_team_id = NULL`
- `loadPlayerTeams` Query in DataContext (Zeile 130-168) lädt basierend auf `player_id`
- **SOLLTE funktionieren**, da `team_memberships` korrekt ist

### **Hypothese 3: Alte Daten im Browser Cache** 💾
- Robert war früher in "TC Rot-Weiss Köln"
- Browser-Cache oder LocalStorage haben alte Daten
- **Lösung:** Hard Refresh (Cmd+Shift+R)

### **Hypothese 4: Falscher Spieler geladen** 👥
- Es gibt mehrere Player-Einträge für Robert
- Der falsche wird ausgewählt (mit anderer Team-Zuordnung)
- **CHECK:** Schritt 1 zeigte nur 1 Spieler → ausgeschlossen!

---

## 5️⃣ DEBUG-STRATEGIE

### **Schritt 1: Console-Logs prüfen**
Robert soll sich einloggen und dann in der Browser-Console (F12) suchen nach:

```javascript
// In DataContext:
"✅ Player teams loaded from DB:"
"✅ playerTeams state updated with"
"🔍 Teams with seasons data:"

// In Dashboard:
"🔍 Dashboard State Changed:"
```

**Erwartung:**
```javascript
playerTeams: [
  {
    club_name: 'SV Rot-Gelb Sürth',
    category: 'Herren 40',
    is_primary: true
  }
]
```

**Falls leer:** `team_memberships` Query schlägt fehl!

### **Schritt 2: Network-Tab prüfen**
- F12 → Network Tab
- Filter auf "team_memberships"
- Prüfe Response: Welche Daten kommen zurück?

### **Schritt 3: SQL-Fix ausführen**
```sql
-- AUTO_FIX_MISSING_PRIMARY_TEAMS.sql
-- Setzt primary_team_id für alle Spieler mit NULL
```

**Dann:** Robert Logout → Login → Sollte funktionieren!

---

## 6️⃣ ZUSAMMENFASSUNG

### **Datenfluss für Dashboard:**

```
1. Login (AuthContext)
   └─> Supabase Auth
   └─> players_unified (SELECT WHERE user_id = ...)
       └─> player.primary_team_id (kann NULL sein!)

2. DataContext wird getriggert (durch 'reloadTeams' Event)
   └─> team_memberships (SELECT WHERE player_id = ...)
       └─> JOIN team_info
       └─> JOIN team_seasons (für league, group_name)
       └─> COUNT team_memberships (für player_count)
   └─> playerTeams Array wird gefüllt ✅

3. Dashboard rendert
   ├─> playerTeams.length > 0 → Zeigt playerTeams ✅
   └─> playerTeams.length === 0 → Zeigt teamInfo Fallback ⚠️
```

### **Problem bei Robert:**

```
player.primary_team_id = NULL ❌
team_memberships = [Rot-Gelb Sürth] ✅

→ playerTeams SOLLTE geladen werden
→ Dashboard SOLLTE Rot-Gelb Sürth zeigen
→ ABER zeigt TC Rot-Weiss Köln ❌

→ ENTWEDER: playerTeams ist leer (Query-Problem)
→ ODER: Browser-Cache zeigt alte Daten
→ ODER: Ein anderer Bug im Rendering
```

---

## 7️⃣ NÄCHSTE SCHRITTE

1. ✅ **SQL-Fix ausführen:** `AUTO_FIX_MISSING_PRIMARY_TEAMS.sql`
2. ✅ **Robert Logout → Login**
3. ✅ **Console-Logs checken:** Was wird wirklich geladen?
4. ✅ **Hard Refresh:** Cmd+Shift+R (oder Ctrl+Shift+R)
5. ✅ **Falls immer noch falsch:** Screenshot der Console-Logs senden

---

**Wichtigste Erkenntnis:**  
`Dashboard.jsx` zeigt **NUR** Daten aus `playerTeams` (wenn vorhanden).  
`teamInfo` ist nur ein Fallback für Spieler OHNE Teams.  
→ Das Problem liegt wahrscheinlich im **DataContext** oder **Browser-Cache**!

