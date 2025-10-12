# 🎾 TRAINING INVITE SYSTEM - Dokumentation

## 📋 **ÜBERSICHT**

Das Training-Einladungs-System unterstützt **3 Typen von Spielern**:

1. **✅ Registrierte Spieler** (`players` Tabelle)
   - Haben einen Account in der App
   - Werden in `invited_players` (Array) gespeichert
   - Bekommen automatisch `training_attendance` Einträge

2. **⏳ Importierte Spieler** (`imported_players` Tabelle)
   - Aus TVM-Meldelisten importiert
   - OHNE Account (noch nicht registriert)
   - Werden als **externe Spieler** in `external_players` (JSON) gespeichert
   - Können sich via **Onboarding-Flow** registrieren

3. **📋 Externe Spieler** (manuell hinzugefügt)
   - Spieler, die NICHT in der App sind
   - Werden direkt in `external_players` (JSON) gespeichert
   - Können per WhatsApp eingeladen werden

---

## 🔄 **FLOW: Von Importiert → Registriert**

### **1. Training erstellen mit importierten Spielern**

```javascript
// Training.jsx - handleCreateTraining()
const importedPlayerIds = formData.invitedPlayers.filter(id => 
  allImportedPlayers.some(p => p.id === id && p.source === 'imported')
);

const importedAsExternal = importedPlayerIds.map(id => {
  const importedPlayer = allImportedPlayers.find(p => p.id === id);
  return {
    name: importedPlayer.name,
    lk: importedPlayer.currentLk,
    club: 'Wartet auf Registrierung',
    imported_player_id: id // 🔑 Wichtig für Merge!
  };
});

// Speichern in training_sessions
{
  invited_players: registeredPlayerIds, // Nur registrierte
  external_players: [...formData.externalPlayers, ...importedAsExternal] // Inkl. importierte
}
```

### **2. Spieler registriert sich (Onboarding)**

```javascript
// OnboardingFlow.jsx - handleComplete()

// User sucht sich selbst in imported_players
searchImportedPlayers('Marc Stoppenbach');
setSelectedImportedPlayer(player);

// Nach Registrierung: Merge durchführen
await supabase
  .from('imported_players')
  .update({
    status: 'merged',
    merged_to_player_id: playerData.id
  })
  .eq('id', selectedImportedPlayer.id);

// 🔧 NEU: Training-Einladungen übertragen
await supabase.rpc('merge_training_invites_after_onboarding', {
  p_imported_player_id: selectedImportedPlayer.id,
  p_new_player_id: playerData.id
});
```

### **3. SQL-Funktion überträgt Einladungen**

```sql
-- ONBOARDING_MERGE_SYSTEM.sql
CREATE FUNCTION merge_training_invites_after_onboarding(
  p_imported_player_id UUID,
  p_new_player_id UUID
)
...
-- Durchsucht training_sessions.external_players
-- Findet Spieler mit imported_player_id
-- Erstellt training_attendance Eintrag
-- Entfernt Spieler aus external_players
```

### **4. Spieler sieht jetzt seine Trainings**

- Training wird in `visibleTrainings` gefiltert (weil `player.id` jetzt in `training_attendance`)
- Spieler kann Zu-/Absagen
- Status wird in `training_attendance` gespeichert

---

## 📊 **DATENBANK-STRUKTUR**

### **training_sessions Tabelle**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Training-ID |
| `invited_players` | UUID[] | **NUR registrierte Spieler** |
| `external_players` | JSONB | **Importierte + Externe Spieler** |

**external_players JSON-Format:**
```json
[
  {
    "name": "Marc Stoppenbach",
    "lk": "LK 16.0",
    "club": "Wartet auf Registrierung",
    "email": null,
    "phone": null,
    "imported_player_id": "a18c5c2a-2d6b-4e09-89f1-3802238c215e"
  },
  {
    "name": "Externer Spieler",
    "lk": "LK 14.0",
    "club": "TC Extern",
    "email": "extern@example.com",
    "phone": "+49 123 456789"
    // Kein imported_player_id → komplett extern
  }
]
```

### **training_attendance Tabelle**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `session_id` | UUID | Training-ID |
| `player_id` | UUID | **NUR registrierte Spieler** |
| `status` | TEXT | pending, confirmed, declined |
| `response_date` | TIMESTAMP | Zeitpunkt der Antwort |

**Foreign Key:** `player_id` → `players.id` (NUR registrierte Spieler!)

---

## 🚀 **SETUP & INSTALLATION**

### **1. SQL-Funktion installieren**

```bash
# In Supabase SQL Editor ausführen:
```

```sql
-- Führe aus: ONBOARDING_MERGE_SYSTEM.sql
```

### **2. Bestehendes Training reparieren**

```bash
# Falls du bereits ein Training mit importierten Spielern hast:
```

```sql
-- Führe aus: FIX_EXISTING_TRAINING.sql
```

### **3. Code-Änderungen**

- ✅ `Training.jsx` - Updated (trennt registrierte von importierten Spielern)
- ✅ `OnboardingFlow.jsx` - Updated (ruft `merge_training_invites_after_onboarding` auf)

---

## 🧪 **TESTING**

### **Test 1: Training mit importierten Spielern erstellen**

1. Erstelle privates Training
2. Suche nach importiertem Spieler (z.B. "Marc Stoppenbach")
3. Wähle Spieler aus (✅ oder ⏳ Icon sichtbar)
4. Speichere Training
5. **Erwartung:** Spieler ist in `external_players` mit `imported_player_id`

### **Test 2: Importierter Spieler registriert sich**

1. Melde dich als neuer User an
2. Onboarding-Flow starten
3. Suche nach eigenem Namen (z.B. "Marc Stoppenbach")
4. Wähle importierten Spieler aus
5. Schließe Onboarding ab
6. **Erwartung:** 
   - `imported_players.status` = 'merged'
   - `training_attendance` Eintrag erstellt
   - Spieler sieht Training in der App
   - Spieler ist NICHT mehr in `external_players`

### **Test 3: Zu-/Absage nach Registrierung**

1. Als neuer User: Öffne Trainings-Seite
2. Training sollte sichtbar sein
3. Klicke "Bin dabei!"
4. **Erwartung:** `training_attendance.status` = 'confirmed'

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Importierte Spieler werden nicht angezeigt**

**Ursache:** `loadImportedPlayersForPrivateTraining()` lädt nicht alle Spieler

**Lösung:**
```javascript
// Training.jsx - loadImportedPlayersForPrivateTraining()
const { data: allPlayers } = await supabase
  .from('players')
  .select('id, name, email, current_lk, phone')
  .eq('is_active', true);

const { data: importedData } = await supabase
  .from('imported_players')
  .select('id, name, import_lk, team_id')
  .eq('status', 'pending');

const allAvailablePlayers = [
  ...registeredMembers.map(p => ({ ...p, source: 'registered' })),
  ...importedMembers.map(p => ({ ...p, source: 'imported' }))
];
```

### **Problem: Foreign Key Constraint Error**

**Fehler:** `insert or update on table "training_attendance" violates foreign key constraint`

**Ursache:** Versuch, `imported_player_id` direkt in `training_attendance` zu speichern

**Lösung:** Importierte Spieler MÜSSEN als externe Spieler gespeichert werden!

### **Problem: Spieler sieht Training nicht nach Registrierung**

**Ursache:** SQL-Funktion `merge_training_invites_after_onboarding` nicht ausgeführt

**Lösung:**
1. Prüfe, ob SQL-Funktion existiert: `SELECT * FROM pg_proc WHERE proname = 'merge_training_invites_after_onboarding';`
2. Falls nicht: Führe `ONBOARDING_MERGE_SYSTEM.sql` aus
3. Manueller Test: `SELECT merge_training_invites_after_onboarding('imported_id', 'player_id');`

---

## 📈 **VORTEILE DIESES SYSTEMS**

✅ **Einfaches Onboarding:** Spieler müssen sich nicht komplett neu anlegen
✅ **Kein RLS-Problem:** `training_attendance` hat nur registrierte Spieler
✅ **Automatische Übertragung:** Nach Registrierung sofort Zugriff auf Trainings
✅ **Flexible Einladungen:** Registrierte, importierte UND externe Spieler möglich
✅ **WhatsApp-Integration:** Alle Spieler-Typen können per WhatsApp eingeladen werden

---

## 🎯 **NÄCHSTE SCHRITTE (BACKLOG)**

Siehe: `TRAINING_PERMISSIONS_BACKLOG.md`

1. **Team Captain Permissions** (Mittel-Priorität)
2. **"Spieler gesucht" Sichtbarkeit** (Hoch-Priorität)
3. **Kalender-Integration** (Mittel-Priorität)

---

**Erstellt:** 2025-10-12  
**Letzte Aktualisierung:** 2025-10-12  
**Version:** 1.0
