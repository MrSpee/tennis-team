# 🎾 AKTUELLER STAND & TEST-PLAN

**Datum:** 21. Oktober 2025  
**Problem:** Spieler sehen ihre privaten Trainings nicht

---

## 📊 WO STEHEN WIR?

### ✅ **Was funktioniert:**

1. **Zwei-Stufen Spieler-System**
   - `players` Tabelle: Registrierte Spieler mit `user_id`
   - `imported_players` Tabelle: TVM-Importe ohne `user_id`
   - Onboarding-Merge: Automatische Übertragung beim Registrieren

2. **Training-Einladungen**
   - Registrierte Spieler → `training_sessions.invited_players` (UUID Array)
   - Importierte Spieler → `training_sessions.external_players` (JSONB mit `imported_player_id`)
   - SQL-Funktion: `merge_training_invites_after_onboarding()` überträgt Einladungen

3. **Datenbank-Struktur**
   - Foreign Keys mit `CASCADE` oder `SET NULL`
   - Activity Logging für Onboarding
   - Timestamp-Felder standardisiert
   - Ungenutzte Tabellen gelöscht

---

## 🚨 **AKTUELLES PROBLEM:**

**User-Bericht:** Spieler können sich einem Verein zuordnen, aber **sehen keine privaten Trainings**, für die sie eingeladen wurden.

---

## 🔍 **MÖGLICHE URSACHEN:**

### **1. Einladungs-Daten fehlen oder sind falsch**

**Problem:**
- `invited_players` Array ist `NULL` oder leer
- Player-IDs stimmen nicht überein
- `external_players` enthält keine `imported_player_id`

**Wo zu prüfen:**
```sql
SELECT 
  id, title, type, 
  invited_players, 
  external_players
FROM training_sessions
WHERE type = 'private';
```

---

### **2. Frontend filtert falsch**

**Problem:** Die Logik in `Training.jsx` filtert zu streng.

**Aktuelle Logik (Zeilen 349-365):**
```javascript
const filteredPrivate = (privateTrainings || []).filter(pt => {
  const isOrganizer = pt.organizer_id === player?.id;
  const isInvited = pt.invited_players?.includes(player?.id);
  const isPublic = pt.is_public && pt.needs_substitute;
  
  return isOrganizer || isInvited || isPublic;
});
```

**Potenzielle Fehler:**
- ❌ `player?.id` ist `undefined` oder falsch
- ❌ `invited_players` ist ein String statt Array
- ❌ `invited_players` enthält falsche UUIDs

---

### **3. Training-Einladungen werden nicht korrekt gespeichert**

**Problem:** Beim Erstellen von Trainings werden `invited_players` nicht richtig in die DB geschrieben.

**Code-Check (Zeilen 573-577):**
```javascript
invited_players: registeredPlayerIds.length > 0 ? registeredPlayerIds : null,
external_players: [...formData.externalPlayers, ...importedAsExternal].length > 0 
  ? [...formData.externalPlayers, ...importedAsExternal] 
  : null,
```

**Potenzielle Fehler:**
- ❌ `registeredPlayerIds` ist leer (obwohl Spieler ausgewählt wurden)
- ❌ Spieler wurden als `importedAsExternal` gespeichert (obwohl sie registriert sind)
- ❌ `formData.invitedPlayers` enthält falsche IDs

---

### **4. `training_attendance` Einträge fehlen**

**Problem:** Einträge in `training_attendance` wurden nicht erstellt.

**Erwartung:**
- Für jeden Spieler in `invited_players` sollte ein Eintrag mit `status='pending'` existieren

**Wo zu prüfen:**
```sql
SELECT 
  ta.session_id,
  ta.player_id,
  ta.status,
  p.name
FROM training_attendance ta
JOIN players p ON p.id = ta.player_id
WHERE ta.session_id = '<TRAINING_ID>';
```

---

### **5. Player hat keine Teams → Trainings werden nicht geladen**

**Problem:** Die Logik lädt **NUR** Trainings, wenn `userTeams.length > 0` (Zeile 71-74).

**Code:**
```javascript
useEffect(() => {
  if (userTeams.length > 0) {
    loadTrainings();
  }
}, [userTeams, player]);
```

**Fehler:**
- ❌ Spieler hat keine Team-Zuordnung in `player_teams`
- ❌ Private Trainings sollten **AUCH OHNE TEAM** geladen werden!

---

## 🧪 **TEST-PLAN: SCHRITT FÜR SCHRITT**

### **PHASE 1: Datenbank prüfen**

#### **Test 1.1: Führe `DEBUG_TRAINING_VISIBILITY.sql` aus**

**Ziel:** Verstehe die aktuelle Datenstruktur

**Was zu prüfen:**
1. ✅ Sind private Trainings vorhanden?
2. ✅ Sind `invited_players` Arrays gefüllt?
3. ✅ Sind `external_players` korrekt (mit `imported_player_id`)?
4. ✅ Existieren `training_attendance` Einträge?
5. ✅ Haben alle Spieler Team-Zuordnungen?

**Script:**
```bash
# In Supabase SQL Editor:
# Führe DEBUG_TRAINING_VISIBILITY.sql aus
```

**Erwartete Ausgabe:**
- Liste aller Trainings
- Invited Players mit UUIDs
- External Players mit JSONB
- Attendance Records
- Spieler-Team-Zuordnungen

---

#### **Test 1.2: Prüfe einen konkreten Testuser**

**Ziel:** Verstehe, warum ein bestimmter Spieler sein Training nicht sieht

**SQL:**
```sql
-- Ersetze <USER_EMAIL> mit der E-Mail des Testusers
SELECT 
  '🔍 USER INFO' as section,
  au.id::text as auth_user_id,
  p.id::text as player_id,
  p.name,
  p.email,
  NULL::text as team_info
FROM auth.users au
JOIN players p ON p.user_id = au.id
WHERE au.email = '<USER_EMAIL>'

UNION ALL

-- Teams des Users
SELECT 
  '🎾 USER TEAMS' as section,
  pt.player_id::text,
  t.team_name as name,
  NULL as email,
  t.id::text as team_info
FROM player_teams pt
JOIN team_info t ON t.id = pt.team_id
WHERE pt.player_id = (
  SELECT p.id FROM auth.users au 
  JOIN players p ON p.user_id = au.id 
  WHERE au.email = '<USER_EMAIL>'
)

UNION ALL

-- Trainings wo User eingeladen ist
SELECT 
  '📅 TRAININGS (INVITED)' as section,
  ts.id::text,
  ts.title as name,
  ts.type as email,
  array_to_string(ts.invited_players, ', ') as team_info
FROM training_sessions ts
WHERE '<PLAYER_ID>' = ANY(ts.invited_players)

UNION ALL

-- Trainings wo User Organisator ist
SELECT 
  '👤 TRAININGS (ORGANIZER)' as section,
  ts.id::text,
  ts.title as name,
  ts.type as email,
  ts.organizer_id::text as team_info
FROM training_sessions ts
WHERE ts.organizer_id = '<PLAYER_ID>';
```

---

### **PHASE 2: Frontend prüfen**

#### **Test 2.1: Console-Logs prüfen**

**Ziel:** Verstehe, was das Frontend lädt und filtert

**Steps:**
1. Öffne die App im Browser
2. Öffne DevTools (F12) → Console
3. Navigiere zu "Training"
4. Prüfe die Logs:

**Erwartete Logs:**
```
🔒 Loading trainings for player teams: [<TEAM_IDS>]
✅ Trainings loaded: { team: X, private: Y, total: Z }
🔍 Filtering private trainings for player: <PLAYER_ID>
📊 Total private trainings: Y
Training <ID>: { 
  title: "...", 
  organizer: "...", 
  isOrganizer: false, 
  invited: [<PLAYER_IDS>], 
  isInvited: true, 
  isPublic: false, 
  show: true 
}
✅ Filtered private trainings: X
```

**Fehler-Indikatoren:**
- ⚠️ `No teams found for player` → User hat keine Teams!
- ⚠️ `isInvited: false` → User ist nicht in `invited_players`
- ⚠️ `invited: null` → `invited_players` ist NULL
- ⚠️ `show: false` → Training wird nicht angezeigt

---

#### **Test 2.2: React DevTools prüfen**

**Ziel:** Prüfe den State im Frontend

**Steps:**
1. Installiere React DevTools (Chrome Extension)
2. Öffne DevTools → Components
3. Suche nach `Training` Component
4. Prüfe die States:

**Was zu prüfen:**
- `player.id` → Ist es eine gültige UUID?
- `userTeams` → Hat der User Teams?
- `trainings` → Welche Trainings wurden geladen?
- `visibleTrainings` → Welche Trainings werden angezeigt?
- `filteredTrainings` → Nach Filter-Anwendung

---

### **PHASE 3: Training erstellen (End-to-End Test)**

#### **Test 3.1: Privates Training erstellen**

**Steps:**
1. Logge dich als User A ein
2. Erstelle ein **privates Training**
3. Lade 2 Spieler ein:
   - ✅ User B (registriert)
   - ✅ User C (importiert, nicht registriert)
4. Speichere das Training

**Prüfe in der DB:**
```sql
SELECT 
  id, title, 
  organizer_id,
  invited_players, 
  external_players
FROM training_sessions
WHERE title = '<TRAINING_TITLE>';
```

**Erwartete Ausgabe:**
- `invited_players` = `[<USER_B_ID>]`
- `external_players` = `[{"name":"User C", "imported_player_id":"<USER_C_ID>", ...}]`

---

#### **Test 3.2: Training-Sichtbarkeit prüfen**

**Steps:**
1. **User A (Organisator):**
   - Logge ein → Navigiere zu "Training"
   - ✅ Training sollte sichtbar sein (als Organisator)

2. **User B (Eingeladen, registriert):**
   - Logge ein → Navigiere zu "Training"
   - ✅ Training sollte sichtbar sein (in `invited_players`)

3. **User C (Eingeladen, importiert):**
   - User C ist **NICHT registriert**
   - ❌ Training sollte **NICHT** in der App sichtbar sein
   - ✅ User C sollte eine **WhatsApp-Einladung** erhalten haben

---

### **PHASE 4: Fixes anwenden (falls Fehler gefunden)**

Je nach Ergebnis der Tests:

#### **Fix 1: Frontend lädt keine Trainings ohne Teams**

**Problem:** `loadTrainings()` wird nur aufgerufen, wenn `userTeams.length > 0`

**Lösung:** Lade private Trainings **IMMER**, unabhängig von Teams

**Code-Änderung in `Training.jsx` (Zeile 69-74):**
```javascript
// Lade Trainings wenn Player geladen wurde (NICHT nur wenn Teams vorhanden)
useEffect(() => {
  if (player?.id) {
    loadTrainings();
  }
}, [player]);
```

---

#### **Fix 2: `invited_players` wird nicht korrekt gespeichert**

**Problem:** Spieler-IDs werden falsch separiert (registriert vs. importiert)

**Lösung:** Logge den Status **VOR** dem Speichern

**Code-Änderung in `Training.jsx` (vor Zeile 550):**
```javascript
console.log('🔍 BEFORE SAVE:', {
  allInvited: formData.invitedPlayers,
  registered: registeredPlayerIds,
  imported: importedPlayerIds
});
```

---

#### **Fix 3: `training_attendance` Einträge fehlen**

**Problem:** Keine Einträge in `training_attendance` für eingeladene Spieler

**Lösung:** Erstelle automatisch Einträge beim Training-Insert

**SQL Trigger:**
```sql
CREATE OR REPLACE FUNCTION create_training_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Für jeden eingeladenen Spieler einen Attendance-Eintrag erstellen
  IF NEW.invited_players IS NOT NULL THEN
    INSERT INTO training_attendance (session_id, player_id, status)
    SELECT NEW.id, player_id, 'pending'
    FROM unnest(NEW.invited_players) AS player_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_training_insert
AFTER INSERT ON training_sessions
FOR EACH ROW
EXECUTE FUNCTION create_training_attendance();
```

---

#### **Fix 4: Player-ID Mismatch**

**Problem:** `player.id` im Frontend stimmt nicht mit DB überein

**Lösung:** Prüfe `AuthContext` und `players` Tabelle

**SQL:**
```sql
-- Prüfe Konsistenz
SELECT 
  au.id as auth_id,
  au.email,
  p.id as player_id,
  p.user_id,
  CASE 
    WHEN au.id = p.user_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM auth.users au
LEFT JOIN players p ON p.user_id = au.id;
```

---

## 📝 **ZUSAMMENFASSUNG**

### **Was zu testen:**
1. ✅ Führe `DEBUG_TRAINING_VISIBILITY.sql` aus
2. ✅ Prüfe Console-Logs im Browser
3. ✅ Erstelle ein Test-Training (End-to-End)
4. ✅ Prüfe User-Sichtbarkeit für 3 Rollen (Organisator, Eingeladen, Nicht-Eingeladen)

### **Häufigste Fehler:**
- ❌ `userTeams.length = 0` → Keine Trainings werden geladen
- ❌ `invited_players = NULL` → Spieler wurden nicht korrekt eingeladen
- ❌ `player.id` Mismatch → Frontend/DB ID stimmt nicht überein
- ❌ Fehlende `training_attendance` Einträge

### **Nächste Schritte:**
1. **Führe `DEBUG_TRAINING_VISIBILITY.sql` aus** und kopiere das Ergebnis
2. Gib mir die **Console-Logs** aus dem Browser
3. Gib mir die **E-Mail eines Testusers**, der das Problem hat

Dann kann ich dir **GENAU** sagen, wo der Fehler liegt! 💪

---

**🎾 Let's fix this!**





