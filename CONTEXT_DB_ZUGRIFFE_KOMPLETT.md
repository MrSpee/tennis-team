# 🗄️ Context DB-Zugriffe - Komplette Übersicht

## AuthContext.jsx - Alle Datenbankzugriffe

---

### 📍 **1. Login & Session Check (Zeile 160-176)**

**Funktion:** `checkSession()` - Prüft ob User eingeloggt ist und lädt Player-Daten

**Query 1: Lade Player-Daten**
```javascript
await supabase
  .from('players_unified')
  .select('*')
  .eq('user_id', currentUser.id)
  .eq('player_type', 'app_user')
  .maybeSingle();
```

**Zweck:** Hole Spieler-Daten für eingeloggten User  
**Ergebnis:** `player` Object mit allen Feldern  
**Problem:** Wenn `.maybeSingle()` NULL zurückgibt (mehrere Player) → wird ignoriert

**Query 2: Prüfe Team-Zuordnung**
```javascript
await supabase
  .from('team_memberships')
  .select('team_id')
  .eq('player_id', data.id)
  .eq('is_active', true)
  .limit(1);
```

**Zweck:** Prüfe ob Spieler einem Team zugeordnet ist  
**Ergebnis:** `needsOnboarding = true/false`  
**Keine Team-Daten:** Wird nur gecheckt, nicht geladen!

---

### 📍 **2. Load Player Data (Zeile 189-261)**

**Funktion:** `loadPlayerData(userId)` - Lädt Spieler-Daten ROBUST (mehrere Player möglich)

**Query 1: Alle Player für User-ID**
```javascript
await supabase
  .from('players_unified')
  .select('*')
  .eq('user_id', userId)
  .eq('player_type', 'app_user');
```

**Zweck:** Hole ALLE Spieler für User (könnte mehrere geben bei Bugs)  
**Ergebnis:** Array von Playern  
**Logik:**
- Wenn mehrere: Wähle Player mit `onboarding_status = 'completed'`
- Sonst: Wähle neuesten (nach `created_at`)
- Setze `setPlayer(selectedPlayer)`

**Geladene Felder aus `players_unified`:**
```javascript
✅ id, user_id, name, email, phone
✅ current_lk, season_start_lk, ranking
✅ primary_team_id  ⚠️ KANN NULL SEIN!
✅ player_type, is_active, is_captain
✅ onboarding_status, status
✅ created_at, updated_at
✅ UND ALLE anderen Felder (profile_image, address, etc.)
```

**Query 2: Prüfe Team-Zuordnung**
```javascript
await supabase
  .from('team_memberships')
  .select('team_id')
  .eq('player_id', selectedPlayer.id)
  .eq('is_active', true)
  .limit(1);
```

**Zweck:** Prüfe ob Player einem Team zugeordnet ist  
**Ergebnis:** `needsOnboarding = true` wenn keine Teams

**Trigger:** Event `'reloadTeams'` wird gefeuert für DataContext

---

### 📍 **3. Update Profile (Zeile 347-410)**

**Funktion:** `updateProfile(profileData)` - Speichert Profil-Änderungen

**Query: Update Player-Daten**
```javascript
await supabase
  .from('players_unified')
  .update({
    name: profileData.name,
    phone: profileData.phone || null,
    ranking: profileData.ranking || null,
    profile_image: profileData.profileImage || null,
    favorite_shot: profileData.favoriteShot || null,
    tennis_motto: profileData.tennisMotto || null,
    fun_fact: profileData.funFact || null,
    worst_tennis_memory: profileData.worstTennisMemory || null,
    best_tennis_memory: profileData.bestTennisMemory || null,
    superstition: profileData.superstition || null,
    pre_match_routine: profileData.preMatchRoutine || null,
    favorite_opponent: profileData.favoriteOpponent || null,
    dream_match: profileData.dreamMatch || null,
    birth_date: profileData.birthDate || null,
    address: profileData.address || null,
    emergency_contact: profileData.emergencyContact || null,
    emergency_phone: profileData.emergencyPhone || null,
    notes: profileData.notes || null,
    current_lk: profileData.current_lk || null
  })
  .eq('id', player.id);
```

**Zweck:** Speichert Profil-Änderungen in DB  
**Ergebnis:** Aktualisiert `player` State (KEIN Reload!)  
**⚠️ Problem:** Viele Spalten fehlen noch (address, emergency_contact, etc.)

---

## DataContext.jsx - Alle Datenbankzugriffe

---

### 📍 **1. Load Player Teams (Zeile 128-258)**

**Funktion:** `loadPlayerTeams(playerId)` - **HAUPTFUNKTION für Team-Daten!**

**Query 1: Lade Player-Name**
```javascript
await supabase
  .from('players_unified')
  .select('name')
  .eq('id', playerId)
  .single();
```

**Zweck:** Hole Spielername (für Test-Daten-Filter)  
**Ergebnis:** `currentPlayerName` State

**Query 2: Lade Team-Memberships mit Team-Info** ⭐ **WICHTIGSTE QUERY!**
```javascript
await supabase
  .from('team_memberships')
  .select(`
    *,
    team_info (
      id,
      team_name,
      club_name,
      category,
      region,
      tvm_link,
      club_id
    )
  `)
  .eq('player_id', playerId)
  .eq('is_active', true);
```

**Zweck:** Hole alle aktiven Teams des Spielers  
**Join:** `team_info` via Foreign Key  
**Ergebnis:** Array von Team-Memberships mit Team-Details

**Für jedes Team (Loop in Zeile 172-233):**

**Query 3: Lade Season-Daten**
```javascript
await supabase
  .from('team_seasons')
  .select('*')
  .eq('team_id', pt.team_info.id)
  .eq('season', currentSeason)  // Dynamisch berechnet: "Winter 2025/26"
  .eq('is_active', true)
  .maybeSingle();
```

**Zweck:** Hole Liga, Gruppe, Team-Größe für aktuelle Saison  
**Ergebnis:** `league`, `group_name`, `team_size`, `season`

**Query 4: Zähle Team-Mitglieder**
```javascript
await supabase
  .from('team_memberships')
  .select('*', { count: 'exact', head: true })
  .eq('team_id', pt.team_info.id)
  .eq('is_active', true);
```

**Zweck:** Wie viele Spieler sind im Team?  
**Ergebnis:** `player_count` (z.B. 9)

**FINALE STRUKTUR `playerTeams`:**
```javascript
[
  {
    // Aus team_info:
    id: 'team-uuid',
    club_name: 'SV Rot-Gelb Sürth',
    team_name: '1',
    category: 'Herren 40',
    region: 'Mittelrhein',
    tvm_link: 'https://...',
    
    // Aus team_memberships:
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
]
```

**⚠️ WICHTIG:** Diese Query verwendet **NICHT** `primary_team_id`!  
Sie lädt basierend auf `team_memberships.player_id`!

---

### 📍 **2. Load Matches (Zeile 280-469)**

**Funktion:** `loadMatches(teams)` - Lädt Matches basierend auf Player-Teams

**Query 1: Lade Matchdays (neue Struktur)**
```javascript
await supabase
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
    ),
    match_availability (
      id,
      matchday_id,
      player_id,
      status,
      comment,
      players!match_availability_player_id_fkey (
        name,
        ranking
      )
    )
  `)
  .or(`home_team_id.in.(${playerTeamIds.join(',')}),away_team_id.in.(${playerTeamIds.join(',')})`)
  .order('match_date', { ascending: true });
```

**Zweck:** Hole alle Matches wo ein Team des Spielers beteiligt ist  
**Filter:** `home_team_id` ODER `away_team_id` in Player-Team-IDs  
**Joins:** `home_team`, `away_team`, `match_availability`, `players`

**Fallback Query: Alte matches Tabelle (Zeile 323-338)**
```javascript
await supabase
  .from('matches')
  .select(`
    *,
    team_info!matches_team_id_fkey (
      id,
      club_name,
      team_name,
      category
    ),
    match_availability (...)
  `)
  .in('team_id', playerTeamIds)
  .order('match_date', { ascending: true });
```

**Transformation (Zeile 370-431):**
- Bestimmt `isOurTeamHome` / `isOurTeamAway`
- Berechnet `location` aus Spieler-Perspektive ✅
- Setzt `opponent` Name zusammen
- Erstellt finale Match-Struktur

---

### 📍 **3. Load Players (Zeile 472-489)**

**Funktion:** `loadPlayers()` - Lädt ALLE Spieler (für Rankings, etc.)

**Query:**
```javascript
await supabase
  .from('players_unified')
  .select('*')
  .order('points', { ascending: false });
```

**Zweck:** Hole alle Spieler sortiert nach Punkten  
**Filter:** KEINE (zeigt alle, auch inaktive)  
**Ergebnis:** `players` Array mit allen Spielern

---

### 📍 **4. Load Team Info (Zeile 497-596)** ⚠️ **GEFÄHRLICH!**

**Funktion:** `loadTeamInfo()` - Lädt Team-Info (FALLBACK!)

**Fall A: selectedTeamId gesetzt (Zeile 501-536)**
```javascript
await supabase
  .from('team_info')
  .select('*')
  .eq('id', selectedTeamId)
  .maybeSingle();
```

**Zweck:** Lade spezifisches Team (User-Auswahl)  
**OK:** Wird vom User gewählt ✅

**Fall B: FALLBACK (Zeile 539-596)** ⚠️ **HIER IST DER BUG!**
```javascript
await supabase
  .from('team_info')
  .select('*')
  .limit(1)      // ❌ NIMMT EINFACH DAS ERSTE TEAM!
  .maybeSingle();
```

**Zweck:** Fallback für Spieler OHNE Teams  
**Problem:** Alphabetisch erstes Team = "Bayer 04 Leverkusen"  
**ABER:** Wird nur genutzt wenn `teamInfo` noch NULL ist UND `selectedTeamId` nicht gesetzt!

**WICHTIG:** Dieser Fallback wird im Dashboard **NICHT verwendet**, wenn `playerTeams.length > 0`!

---

### 📍 **5. Weitere Queries**

**Add/Update/Delete Match:**
- `matches` oder `matchdays` Tabelle
- `match_availability` Tabelle
- `match_results` Tabelle

**Update Availability:**
- `match_availability` Tabelle (INSERT oder UPDATE)

**Get Player Profile:**
- `players_unified` Tabelle (SELECT WHERE id = playerId)

**Load Player Availability:**
- `match_availability` Tabelle mit JOINs auf `players` und `matchday`

---

## 🔍 **ROBERT's PROBLEM - ROOT CAUSE ANALYSE**

### **Was in der DB steht (laut SQL-Check):**

```sql
-- players_unified
{
  id: '76df607d-30cb-4f2c-b143-2cb805c80060',
  user_id: 'c6a41cf3-dd5e-4e76-8c5c-ff1850394b78',
  name: 'Robert Ellrich',
  email: 'robert.ellrich@icloud.com',
  primary_team_id: NULL  ❌ DAS IST DAS PROBLEM!
}

-- team_memberships
{
  player_id: '76df607d-30cb-4f2c-b143-2cb805c80060',
  team_id: 'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  is_primary: true,
  is_active: true
}

-- team_info (für team_id ff090c47...)
{
  id: 'ff090c47-ff26-4df1-82fd-3e4358320d7f',
  club_name: 'SV Rot-Gelb Sürth',
  team_name: '1',
  category: 'Herren 40'
}
```

### **Was die App laden SOLLTE:**

**1. AuthContext lädt:**
```javascript
loadPlayerData(userId) → players_unified
→ player = { ..., primary_team_id: NULL }
→ Trigger: 'reloadTeams' Event
```

**2. DataContext lädt:**
```javascript
loadPlayerTeams(player.id) → team_memberships
→ Query mit player_id = '76df607d-30cb-4f2c-b143-2cb805c80060'
→ SOLLTE zurückgeben: [{ team_info: { club_name: 'SV Rot-Gelb Sürth', ... }}]
→ playerTeams = [Rot-Gelb Sürth Object]
```

**3. Dashboard rendert:**
```javascript
playerTeams.length > 0 → JA! (sollte 1 sein)
→ Zeigt: playerTeams.map(...) 
→ SOLLTE anzeigen: "SV Rot-Gelb Sürth Herren 40" ✅
```

### **Was die App tatsächlich ZEIGT:**

```
❌ TC Rot-Weiss Köln
❌ Herren 50
❌ Kreisliga
```

---

## 🎯 **WARUM ZEIGT ES DAS FALSCHE TEAM?**

### **Hypothese 1: playerTeams ist leer** 🔍

**Mögliche Ursache:**
- `team_memberships` Query findet keine Ergebnisse
- `playerTeams = []`
- Dashboard zeigt Fallback: `teamInfo`
- `teamInfo` wird mit `.limit(1)` geladen → erstes Team

**Test:**
- Führe SQL aus: `SELECT * FROM team_memberships WHERE player_id = '76df607d-30cb-4f2c-b143-2cb805c80060'`
- Sollte 1 Ergebnis zurückgeben ✅

**Wenn leer:** Foreign Key Problem oder Datenbankfehler!

---

### **Hypothese 2: DataContext wird nicht getriggert** ⏸️

**Mögliche Ursache:**
- `reloadTeams` Event wird nicht gefeuert (Zeile 250 in AuthContext)
- DataContext lauscht nicht auf Event
- `playerTeams` bleibt leer oder ungeladen

**Code-Stelle in DataContext (Zeile 116-124):**
```javascript
useEffect(() => {
  const handleReload = (e) => {
    console.log('🔄 Reload teams event received:', e.detail);
    if (player) {
      loadPlayerTeams(player.id);
    }
  };
  
  window.addEventListener('reloadTeams', handleReload);
  return () => window.removeEventListener('reloadTeams', handleReload);
}, [player]);
```

**Test:** Läuft das Event?

---

### **Hypothese 3: Alte Daten im Browser** 💾

**Mögliche Ursache:**
- LocalStorage hat alte `playerTeams`
- React State hat alte Daten
- Logout/Login lädt nicht neu

**Lösung:**
- Hard Refresh (Cmd+Shift+R)
- Browser-Cache löschen
- Logout → Login

---

### **Hypothese 4: `teamInfo` überschreibt `playerTeams`** 🔄

**Mögliche Ursache:**
- Dashboard rendert zuerst `teamInfo` (Fallback)
- Später kommt `playerTeams` rein
- Aber UI updated nicht

**Code-Stelle Dashboard (Zeile 1019):**
```javascript
{playerTeams.length > 0 ? (
  // Zeigt playerTeams ✅
) : teamInfo ? (
  // Zeigt teamInfo Fallback ⚠️
) : null}
```

**Test:** Was ist `playerTeams.length`?

---

## ✅ **DEFINITIVER FIX-PLAN**

### **Schritt 1: SQL-Migration (DU)**

**Führe aus:** `AUTO_FIX_MISSING_PRIMARY_TEAMS.sql`

**Was es macht:**
```sql
-- Findet alle Spieler mit primary_team_id = NULL
-- Setzt primary_team_id basierend auf is_primary=true in team_memberships
-- Für Robert: primary_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
```

**Verifizierung:**
```sql
SELECT p.name, p.primary_team_id, ti.club_name
FROM players_unified p
LEFT JOIN team_info ti ON p.primary_team_id = ti.id
WHERE p.email = 'robert.ellrich@icloud.com';

-- Sollte zeigen:
-- Robert Ellrich | ff090c47... | SV Rot-Gelb Sürth ✅
```

---

### **Schritt 2: Robert instruieren (DU → ROBERT)**

**Nachricht:**
```
Hi Robert,

deine Team-Zuordnung wurde korrigiert.
Bitte einmal ab- und neu anmelden:

1. App öffnen
2. Profil (unten rechts)
3. Logout (oben)
4. Neu einloggen

Falls "TC Rot-Weiss" immer noch erscheint:
- App komplett schließen
- Neu öffnen
- Einloggen

Sollte dann "SV Rot-Gelb Sürth Herren 40" zeigen.

Grüße!
```

---

### **Schritt 3: Verifizierung (ROBERT)**

**Robert prüft Dashboard:**
- ✅ "SV Rot-Gelb Sürth" statt "TC Rot-Weiss Köln"
- ✅ "Herren 40" statt "Herren 50"
- ✅ "2. Bezirksliga, Gr. 054"

**Falls IMMER NOCH falsch:**
→ Browser-Cache löschen (siehe Anleitung oben)

---

## 📊 **ZUSAMMENFASSUNG DER DB-ZUGRIFFE**

### **AuthContext:**
| Query | Tabelle | Zweck | Wann |
|-------|---------|-------|------|
| 1 | `players_unified` | Lade Player bei Login | Bei Session-Check |
| 2 | `team_memberships` | Prüfe ob Player Teams hat | Nach Player-Load |
| 3 | `players_unified` | Update Profil-Daten | Bei Profil-Änderungen |

### **DataContext:**
| Query | Tabelle | Zweck | Wann |
|-------|---------|-------|------|
| 1 | `players_unified` | Hole Spielername | Bei loadPlayerTeams |
| 2 | `team_memberships` + `team_info` | Lade alle Teams des Spielers | Bei loadPlayerTeams |
| 3 | `team_seasons` | Lade Liga/Gruppe pro Team | Für jedes Team |
| 4 | `team_memberships` | Zähle Team-Mitglieder | Für jedes Team |
| 5 | `matchdays` + JOINs | Lade Matches | Nach loadPlayerTeams |
| 6 | `players_unified` | Lade alle Spieler | Für Rankings |
| 7 | `team_info` | Fallback Team-Info | Nur wenn selectedTeamId oder playerTeams leer |

---

**KRITISCHER PFAD FÜR ROBERT:**

```
1. Login → AuthContext lädt players_unified
2. Event → DataContext lädt team_memberships
3. Query → Findet Rot-Gelb Sürth ✅
4. State → playerTeams = [Rot-Gelb Sürth]
5. Dashboard → Rendert playerTeams ✅
```

**Wenn `primary_team_id = NULL`:**
- ⚠️ Kein direkter Einfluss auf Team-Anzeige
- ✅ `team_memberships` Query funktioniert trotzdem
- ⚠️ ABER: Möglicherweise andere Bugs in der App

**Daher:** SQL-Fix ist wichtig für Konsistenz!

---

**STARTE JETZT:** SQL-Script ausführen! 🚀






