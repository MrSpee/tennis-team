# 🎲 Round-Robin System - EINFACH & KLAR

**Stand:** 31. Oktober 2024  
**Ziel:** Faires Aussetzen-System für Trainingseinheiten

---

## 🎯 KONZEPT

### Ziel
**5 Spieler trainieren, 1 muss aussetzen** - Faire Rotation ab 01.11.2025

### Grundregel
- **Ab 01.11.2025:** Jedes Training mit ≥5 Anmeldungen → Ein Spieler muss aussetzen
- **Bei <5 Anmeldungen:** Kein Aussetzer → Rutscht eine Woche nach hinten

---

## 📅 SYSTEM-ÜBERSICHT

### Zeitraum
- **Start:** 01.11.2025
- **Ende:** Automatisch nach 24 Trainingseinheiten
- **Zeit:** Jeden Mittwoch 17:00 Uhr (konstant)

### Spielerliste
```
1. Alexander Elwert
2. Marc Stoppenbach
3. Markus Wilwerscheid
4. Chris Spee
5. Raoul van Herwijnen
```

### Prioritäts-Liste (für Aussetzen)
```
Rotation Start:
Woche 1: Alexander (muss aussetzen)
Woche 2: Marc
Woche 3: Markus
Woche 4: Chris
Woche 5: Raoul
... und von vorne
```

---

## 🔄 LOGIK

### Bei EACH TRAINING (ab 01.11.2025):

**SCHRITT 1: Zähle Anmeldungen**
```
confirmed_players = Anzahl 'confirmed' Responses
```

**SCHRITT 2: Entscheide**
- **WENN `confirmed_players ≥ 5`**
  → Nächster in Rotation MUSS aussetzen
  → Warteliste: 1 Spieler (der Aussetzer)
  
- **WENN `confirmed_players < 5`**
  → KEIN Aussetzer
  → Rotationsposition bleibt gleich für nächste Woche

**SCHRITT 3: Update Rotationsposition**
- **WENN Aussetzer bestimmt wurde**
  → `current_rotation_index = (current_rotation_index + 1) % 5`
  
- **WENN Kein Aussetzer**
  → `current_rotation_index` bleibt gleich

---

## 💾 DATENSTRUKTUR

### Neue Tabelle: `round_robin_rotation`
```sql
CREATE TABLE round_robin_rotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_date DATE NOT NULL UNIQUE, -- Datum des Trainings
  expected_setter_id UUID REFERENCES players_unified(id), -- Wer SOLLTE aussetzen
  actual_setter_id UUID REFERENCES players_unified(id), -- Wer TATSÄCHLICH aussetzt (bei <5 wird auf NULL gesetzt)
  confirmed_count INTEGER DEFAULT 0, -- Anzahl confirmed Responses zum Zeitpunkt
  rotation_index INTEGER, -- Position in Rotation (0-4)
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'set', 'skipped'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Initiale Rotation (wird beim ersten Training automatisch erstellt)
```javascript
const rotation_order = [
  player_ids[0], // Alexander
  player_ids[1], // Marc
  player_ids[2], // Markus
  player_ids[3]  // Raoul
];

let current_index = 0; // Start bei Alexander
```

---

## 🔧 AUTOMATISCHE BERECHNUNG

### Bei jedem Training (BEVOR es stattfindet):

```javascript
function calculateSetter(trainingDate, confirmedCount, currentRotationIndex) {
  const nextIndex = currentRotationIndex % 4;
  const expectedSetter = rotation_order[nextIndex];
  
  if (confirmedCount >= 5) {
    // Normalfall: Jemand muss aussetzen
    return {
      setter: expectedSetter,
      rotationAdvances: true,
      status: 'set'
    };
  } else {
    // Weniger als 5: Kein Aussetzer
    return {
      setter: null,
      rotationAdvances: false,
      status: 'skipped'
    };
  }
}
```

### Automatische Update-Funktion:
```javascript
async function updateRotationForTraining(trainingDate) {
  // 1. Lade Attendance für dieses Training
  const attendance = await getAttendanceForTraining(trainingId);
  const confirmedCount = attendance.filter(a => a.status === 'confirmed').length;
  
  // 2. Hole aktuelle Rotation
  const rotation = await getRotationState();
  
  // 3. Berechne Setter
  const result = calculateSetter(trainingDate, confirmedCount, rotation.current_index);
  
  // 4. Speichere in DB
  await updateRotationEntry(trainingDate, result);
  
  // 5. Update Index wenn notwendig
  if (result.rotationAdvances) {
    await incrementRotationIndex();
  }
}
```

---

## 📊 UI: ROUND-ROBIN SEITE

### URL: `/round-robin`

### Display:
```
🎲 Round-Robin Aussetzen-Plan
=====================

📅 Nächste 24 Trainingstermine (ab 01.11.2025)

Termin         Status    Aussetzer
-----------------------------------
05.11.2025     ⏳        Alexander (wenn ≥5)
12.11.2025     ⏳        Marc (wenn ≥5)
19.11.2025     ⏳        Markus (wenn ≥5)
26.11.2025     ⏳        Raoul (wenn ≥5)
...

💡 ERKLÄRUNG:
• Bei ≥5 Anmeldungen: Aussetzer ist fest
• Bei <5 Anmeldungen: Kein Aussetzer, rutscht eine Woche
```

### Dynamische Updates:
- Seite lädt automatisch alle 30 Sekunden
- Zeigt "VERÄNDERT" Badge bei Änderungen
- Farbcodierung:
  - 🟢 Grün: Kein Aussetzer (<5 Anmeldungen)
  - 🟡 Gelb: Aussetzer fest (≥5 Anmeldungen, aber noch nicht bestätigt)
  - 🔴 Rot: Aussetzer hat bereits abgesagt

---

## ⚙️ IMPLEMENTIERUNG

### Backend (Supabase Functions):
1. **`calculate_next_setter()`** - Berechnet wer als nächstes aussetzen sollte
2. **`update_rotation_state()`** - Speichert aktuelle Rotation in DB
3. **`get_rotation_plan()`** - Gibt 24-Termine-Plan zurück

### Frontend:
1. **Komponente:** `RoundRobinPlan.jsx` - Neue Komponente
2. **Service:** `simpleRotationService.js` - Neue Service-Datei
3. **UI:** Einfache Tabelle mit dynamischen Updates

---

## 🧪 TEST-SZENARIEN

### Szenario 1: Normal (<5 Anmeldungen)
```
Training: 05.11.2025
Anmeldungen: 4
Aussetzer: KEINER
Rotation: Bleibt bei Alexander
```

### Szenario 2: Überschuss (≥5 Anmeldungen)
```
Training: 05.11.2025
Anmeldungen: 6
Aussetzer: Alexander
Rotation: Weiter zu Marc
```

### Szenario 3: Wechsel
```
Training 1: 3 Anmeldungen → KEIN Aussetzer
Training 2: 5 Anmeldungen → Alexander (wegen Training 1 ist er noch dran)
Training 3: 4 Anmeldungen → KEIN Aussetzer
Training 4: 6 Anmeldungen → Alexander (immer noch dran)
Training 5: 5 Anmeldungen → Marc (jetzt erst weitergegangen)
```

---

## ✅ VORTEILE

1. **Einfach:** Keine komplexe Statistik
2. **Fair:** Jeder kommt mal dran
3. **Flexibel:** Passt sich an Anmeldungen an
4. **Transparent:** Klare Regel, klare Anzeige
5. **Automatisch:** Kein manuelles Eingreifen nötig

---

## 🔗 INTEGRATION

### Training.jsx
- **Entfernen:** Alle komplexen Round-Robin Berechnungen
- **Behalten:** Nur einfache "Setter"-Anzeige pro Training

### Neue Seite: Round-Robin Plan
- **Route:** `/round-robin`
- **Zweck:** Zentrale Übersicht aller 24 Termine
- **Update:** Automatisch bei Änderungen

---

**Next Step:** SQL-Schema erstellen und implementieren!

