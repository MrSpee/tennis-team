# 🎾 Pragmatischer LK-Ansatz - MVP

## 🎯 Ziel
LK-Verwaltung mit **minimalem User-Aufwand** aber **maximaler Präzision**

---

## Phase 1: Onboarding (JETZT) 🚀

### User-Flow beim Signup:
```
1. Name, Email, Passwort
2. "Was ist deine aktuelle LK?"
   → Eingabefeld: [LK __.__]
   → Hilfetext: "Findest du auf deiner TVM-Profilseite"
   → Optional: Link zu TVM
3. Fertig!
```

### Datenbank:
```sql
-- Beim Onboarding:
players.current_lk = 'LK 12.5'  -- User-Eingabe
players.season_start_lk = NULL  -- Wird später gesetzt
```

### Vorteile:
- ✅ 5 Sekunden Aufwand
- ✅ Keine externe Datenquelle
- ✅ Sofort nutzbar
- ✅ 95% Genauigkeit (User weiß seine LK)

---

## Phase 2: Captain-Import (1x pro Saison) 👨‍✈️

### Captain-Flow:
```
1. Captain geht zu "Team verwalten"
2. Button: "Meldeliste importieren"
3. Eingabemaske:
   
   📋 Kopiere die Meldeliste aus TVM hier ein:
   Format: Name, LK, Email (pro Zeile)
   
   [Textfeld - multiline]
   Max Mustermann, LK 12.5, max@example.com
   Anna Schmidt, LK 14.2, anna@example.com
   Peter Müller, LK 16.8, peter@example.com
   
   [Import starten]
   
4. System matcht über Email
5. Zeigt Preview: "Folgende Spieler werden aktualisiert"
6. Captain bestätigt
7. Fertig!
```

### Datenbank:
```sql
-- Für gematchte Spieler:
UPDATE players
SET season_start_lk = 'LK 12.5',  -- Aus Meldeliste
    current_lk = 'LK 12.5'        -- Initial = Start
WHERE email IN (importierte_emails);
```

### Alternative: CSV-Upload
```csv
name,lk,email
Max Mustermann,LK 12.5,max@example.com
Anna Schmidt,LK 14.2,anna@example.com
```

### Vorteile:
- ✅ Captain macht es EIN MAL
- ✅ Alle profitieren
- ✅ Offizielle Meldelisten-Daten
- ✅ 100% Genauigkeit

---

## Phase 3: Laufende Updates (Optional) 🔄

### Option A: Self-Service Update
```
User sieht in App:
"Deine LK: LK 12.5"
[Änderung melden] Button

→ Eingabefeld: Neue LK
→ Optional: Grund (Medenspiel, Turnier)
→ Speichern
```

### Option B: Post-Match Update
```
Nach Medenspiel:
Captain/Spieler trägt Ergebnis ein:
- Einzel X: Sieg/Niederlage
- Gegner-LK: LK 11.8

→ System schlägt LK-Änderung vor
→ Spieler bestätigt
```

### Option C: TVM-Check (passiv)
```
Notification:
"🎾 Neues Medenspiel gespielt?
Aktualisiere deine LK wenn sie sich geändert hat"

→ Spieler: Ja/Nein
```

---

## 🛠️ Technische Umsetzung

### 1. Onboarding erweitern
```jsx
// src/components/Onboarding.jsx
<FormField>
  <label>Deine aktuelle LK</label>
  <input 
    type="text" 
    placeholder="z.B. LK 12.5"
    pattern="LK \d+\.\d+"
  />
  <small>
    Findest du auf deiner 
    <a href="https://tvm.tennis.de" target="_blank">
      TVM-Profilseite
    </a>
  </small>
</FormField>
```

### 2. Captain-Import-Tool
```jsx
// src/components/CaptainTools.jsx
<ImportMeldeliste>
  <h3>Meldeliste importieren</h3>
  <p>Format: Name, LK, Email (eine Zeile pro Spieler)</p>
  <textarea 
    rows={10}
    placeholder="Max Mustermann, LK 12.5, max@example.com"
  />
  <Button onClick={parseAndImport}>Import starten</Button>
</ImportMeldeliste>
```

### 3. Parser-Funktion
```javascript
function parsePlayerList(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const [name, lk, email] = line.split(',').map(s => s.trim());
    return { name, lk, email };
  }).filter(p => p.email); // Nur valide Zeilen
}

async function importPlayerList(players) {
  for (const player of players) {
    await supabase
      .from('players')
      .update({
        season_start_lk: player.lk,
        current_lk: player.lk
      })
      .eq('email', player.email);
  }
}
```

---

## 📊 Vergleich der Ansätze

| Ansatz | Aufwand User | Aufwand Captain | Genauigkeit | Aufwand Dev |
|--------|--------------|-----------------|-------------|-------------|
| **Phase 1: Self-Entry** | 5 Sek | 0 | 95% | Gering ✅ |
| **Phase 2: Captain-Import** | 0 | 5 Min/Saison | 100% | Mittel ✅ |
| **TVM-Crawling** | 0 | 0 | 100% | Hoch + rechtlich ❌ |
| **Voller Onboarding-Flow** | 5 Min | 0 | 90% | Hoch ❌ |

---

## 🎯 Empfehlung: Start mit Phase 1 + 2

### Roadmap:
1. **Sprint 1 (Jetzt):**
   - Onboarding: LK-Eingabefeld hinzufügen
   - Speichere in `players.current_lk`
   
2. **Sprint 2 (2 Wochen):**
   - Captain-Tool: Meldelisten-Import
   - Parser für Text-Format
   - Preview + Bestätigung
   
3. **Sprint 3 (1 Monat):**
   - Self-Service LK-Update
   - Historie-Anzeige
   - Notifications bei Änderungen

4. **Später:**
   - Match-Result-Eingabe
   - Automatische LK-Berechnung
   - TVM-Screenshot-OCR (wenn gewünscht)

---

## 💡 Zusätzliche Pragmatische Features

### 1. "LK-Verifizierung" (Community-Trust)
```
Spieler A: "Meine LK ist 12.5"
Team-Mitglieder können bestätigen: ✅ "Stimmt"
→ Badge: "Verifiziert von 3 Team-Mitgliedern"
```

### 2. "LK-Reminder"
```
Alle 3 Monate:
"🎾 Hey Max! Ist deine LK noch aktuell? (LK 12.5)
[Ja, stimmt] [Nein, ändern]"
```

### 3. "Team-LK-Schnellcheck"
```
Captain sieht Liste:
✅ Max - LK 12.5 (aktualisiert vor 2 Tagen)
⚠️ Anna - LK 14.2 (aktualisiert vor 3 Monaten)
❌ Peter - Keine LK angegeben

[Alle erinnern] Button
```

---

## ✅ Entscheidung für User

**Frage an dich:**

1. **Onboarding-Erweiterung** (5 Min Dev-Aufwand)
   - Füge LK-Feld beim Signup hinzu?
   - → JA/NEIN

2. **Captain-Import-Tool** (2h Dev-Aufwand)
   - Meldelisten-Parser + Import-Funktion?
   - → JA/NEIN

3. **Self-Service-Update** (1h Dev-Aufwand)
   - "LK ändern" Button im Profil?
   - → JA/NEIN

**Meine Empfehlung:** Start mit 1 + 3 (Onboarding + Self-Service)
→ Captain-Tool kommt später, wenn Teams größer werden

---

## 📱 Quick Wins für sofort

### A) Minimale Änderung (5 Min):
```javascript
// In Onboarding/Profile:
<input 
  name="current_lk"
  placeholder="Deine aktuelle LK (z.B. LK 12.5)"
/>
```

### B) Captain Quick-Import (Copy-Paste):
```
Captain geht ins Admin-Panel → SQL Editor:
UPDATE players SET current_lk = 'LK 12.5' WHERE email = 'max@example.com';
UPDATE players SET current_lk = 'LK 14.2' WHERE email = 'anna@example.com';
```

**Später:** UI dafür bauen

---

**Was denkst du? Welche Phase sollen wir zuerst umsetzen?** 🎾

