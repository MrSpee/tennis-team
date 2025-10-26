# 🧪 Round-Robin System - Test Guide

## Übersicht

Dieser Guide hilft dir, das neue Round-Robin System systematisch zu testen.

---

## 🗄️ **SCHRITT 1: Datenbank Setup**

### 1.1 SQL-Script ausführen

Führe in **Supabase SQL Editor** aus:
```sql
-- Datei: ROUND_ROBIN_SYSTEM_SETUP.sql
```

**Erwartete Ausgabe:**
```
✅ ROUND-ROBIN SYSTEM ERFOLGREICH INSTALLIERT!
✅ players.training_stats: OK
✅ training_sessions.round_robin_enabled: OK
✅ training_attendance.priority_score: OK
✅ Trigger & Functions: OK
```

### 1.2 Prüfe bestehende Spieler-Statistiken

```sql
SELECT 
  name,
  training_stats->>'total_attended' as attended,
  training_stats->>'total_declined' as declined,
  (training_stats->>'attendance_rate')::float as rate
FROM players
WHERE is_active = true
ORDER BY (training_stats->>'attendance_rate')::float DESC;
```

**Erwartung:** Alle Spieler sollten Statistiken haben (auch wenn 0).

---

## 🧪 **SCHRITT 2: Frontend Tests**

### Test 1: Training OHNE Round-Robin erstellen

**Ziel:** Sicherstellen, dass normale Trainings noch funktionieren.

1. **Training erstellen:**
   - Typ: "Privat"
   - Spieler: 5 Spieler einladen
   - Max Players: 4
   - **Round-Robin:** ❌ NICHT aktivieren
   - Speichern

2. **Erwartung:**
   - Training wird erstellt
   - Alle 5 Spieler sehen "Bin dabei!"
   - **KEINE** Warteliste
   - Normal FCFS-Logik

**✅ Pass-Kriterium:** Alle 5 Spieler können zusagen, keine Warteliste.

---

### Test 2: Training MIT Round-Robin erstellen

**Ziel:** Round-Robin Basis-Funktion testen.

1. **Training erstellen:**
   - Typ: "Privat"
   - Titel: "Round-Robin Test 1"
   - Spieler: 5 Spieler einladen
   - Max Players: 4
   - **Round-Robin:** ✅ AKTIVIEREN
   - Speichern

2. **Erwartung:**
   - Training wird erstellt mit 🎲 Symbol
   - System berechnet Prioritäten
   - 4 Spieler in "Dabei" (sortiert nach Priorität)
   - 1 Spieler auf "Warteliste" (Position #1)
   - Prioritäts-Scores sind sichtbar

3. **Prüfe UI:**
   - [ ] Header zeigt `🎲` Symbol
   - [ ] Badge zeigt `4/4 (+1)`
   - [ ] "Dabei" Liste zeigt Prioritäts-Scores (z.B. `• 65`)
   - [ ] "Warteliste" Liste zeigt Position (`#1`)

**✅ Pass-Kriterium:** 
- 4 Spieler "Dabei" mit Scores
- 1 Spieler "Warteliste #1" mit Score
- Sortierung korrekt (höchste Priorität oben)

---

### Test 3: Prioritäts-Berechnung verifizieren

**Ziel:** Sicherstellen, dass Prioritäten korrekt berechnet werden.

1. **Öffne Browser Console** (F12)
2. **Lade Training-Seite**
3. **Suche Log:** `✅ Loaded players with stats`

4. **Prüfe Spieler-Statistiken:**
```javascript
// In Console:
playersWithStats.find(p => p.name === "Chris Spee")
```

5. **Erwartung:**
```javascript
{
  id: "...",
  name: "Chris Spee",
  training_stats: {
    total_attended: 10,
    total_declined: 2,
    attendance_rate: 0.83,
    consecutive_declines: 0,
    last_attended: "2025-10-20"
  }
}
```

**✅ Pass-Kriterium:** 
- Alle Spieler haben `training_stats`
- `attendance_rate` ist korrekt berechnet
- Werte sind realistisch

---

### Test 4: Automatisches Nachrücken testen

**Ziel:** Warteliste funktioniert bei Absagen.

1. **Ausgangssituation:**
   - Training mit Round-Robin
   - 4 Spieler "Dabei"
   - 1 Spieler "Warteliste #1" (z.B. Max)

2. **Aktion:**
   - Als einer der 4 "Dabei"-Spieler absagen
   - Klicke "❌ Kann nicht"

3. **Erwartung:**
   - Alert: `✅ Max ist von der Warteliste nachgerückt!`
   - Warteliste ist nun leer
   - Max ist jetzt in "Dabei" Liste
   - Absagender Spieler ist in "Absage" Liste

4. **Console Log prüfen:**
```
🔔 Player declined, checking waitlist for auto-promotion...
🔔 Auto-promoting Max from waitlist (Position 1)
✅ Max successfully promoted from waitlist
```

**✅ Pass-Kriterium:**
- Wartelisten-Spieler rückt automatisch nach
- Alert erscheint
- UI aktualisiert sich korrekt

---

### Test 5: Prio-Training Bonus testen

**Ziel:** Prio-Training gibt +30% Bonus.

1. **Training 1 erstellen (OHNE Prio):**
   - Round-Robin: ✅ Aktiviert
   - **Prio-Training:** ❌ NICHT aktiviert
   - 5 Spieler einladen, 4 Plätze
   - Notiere Wartelisten-Spieler

2. **Training 2 erstellen (MIT Prio):**
   - Round-Robin: ✅ Aktiviert
   - **Prio-Training:** ⭐ AKTIVIERT
   - **Gleiche 5 Spieler** einladen
   - Notiere Wartelisten-Spieler

3. **Erwartung:**
   - Wartelisten-Spieler können unterschiedlich sein
   - Prio-Training zeigt ⭐ Symbol
   - Prioritäts-Scores sind höher (~+30 Punkte)

**✅ Pass-Kriterium:**
- Prio-Training Symbol ⭐ wird angezeigt
- Prioritäten sind konsistent höher
- Info-Box "🏆 Alle Spieler erhalten +30% Priorität" wird angezeigt

---

### Test 6: Statistik-Update bei Zu-/Absage

**Ziel:** Spieler-Statistiken werden automatisch aktualisiert.

1. **Vor Test:**
   - Prüfe Statistik eines Spielers in DB
   ```sql
   SELECT training_stats FROM players WHERE name = 'Chris Spee';
   ```

2. **Aktion:**
   - Als Chris Spee: Zusage zu Training
   - Warte 2 Sekunden

3. **Nach Test:**
   - Prüfe erneut:
   ```sql
   SELECT training_stats FROM players WHERE name = 'Chris Spee';
   ```

4. **Erwartung:**
   - `total_attended` ist +1
   - `attendance_rate` ist neu berechnet
   - `last_attended` ist aktualisiert
   - `consecutive_declines` ist 0

**✅ Pass-Kriterium:**
- Statistiken werden automatisch aktualisiert
- Keine manuelle Aktion nötig
- Werte sind korrekt

---

### Test 7: Überbuchung mit mehr als 2 Wartelisten-Plätzen

**Ziel:** Warteliste funktioniert auch bei mehreren Wartenden.

1. **Training erstellen:**
   - Round-Robin: ✅ Aktiviert
   - Max Players: 4
   - **8 Spieler** einladen

2. **Erwartung:**
   - 4 Spieler "Dabei"
   - 4 Spieler "Warteliste" (Positionen #1, #2, #3, #4)
   - Badge zeigt `4/4 (+4)`

3. **Absage testen:**
   - Ein "Dabei"-Spieler sagt ab
   - Warteliste #1 rückt nach
   - Neue Warteliste: #1, #2, #3 (um 1 verschoben)

**✅ Pass-Kriterium:**
- Warteliste zeigt alle 4 Spieler
- Positionen sind korrekt nummeriert
- Nachrücken funktioniert für Position #1

---

## 🔍 **SCHRITT 3: Edge Cases testen**

### Edge Case 1: Alle Spieler haben gleiche Priorität

**Szenario:** 5 Spieler mit identischer Teilnahme-Quote

1. **Setup:**
   - Alle Spieler: 10 Zusagen, 0 Absagen (100% Quote)
   - Training mit 4 Plätzen, 5 eingeladen

2. **Erwartung:**
   - Zufallsfaktor entscheidet
   - Reproduzierbar (gleicher Seed = gleiche Reihenfolge)

**✅ Pass-Kriterium:** System bricht nicht, Zufallsfaktor entscheidet fair.

---

### Edge Case 2: Spieler ohne Statistiken

**Szenario:** Neuer Spieler (noch nie trainiert)

1. **Setup:**
   - Spieler mit `training_stats = null` oder `= {}`
   - Einladen zu Round-Robin Training

2. **Erwartung:**
   - System initialisiert Statistiken auf 0
   - Spieler erhält Standard-Priorität
   - Kein Fehler

**✅ Pass-Kriterium:** Keine Fehler, Spieler wird fair behandelt.

---

### Edge Case 3: Training wird bearbeitet

**Szenario:** Round-Robin Training nachträglich ändern

1. **Setup:**
   - Training MIT Round-Robin erstellt
   - Bearbeiten klicken

2. **Erwartung:**
   - Formular zeigt korrekte Werte
   - Round-Robin Checkbox ist aktiviert
   - Seed bleibt gleich (reproduzierbare Prioritäten)

**✅ Pass-Kriterium:** Bearbeiten funktioniert, keine Fehler.

---

## 📊 **SCHRITT 4: Performance Tests**

### Performance Test 1: Viele Trainings laden

**Ziel:** System ist performant bei vielen Trainings.

1. **Setup:**
   - Erstelle 20+ Trainings (mit Round-Robin)
   - Lade Training-Seite

2. **Prüfe:**
   - Ladezeit < 2 Sekunden
   - Keine Console-Errors
   - UI ist responsive

**✅ Pass-Kriterium:** Seite lädt schnell, keine Performance-Probleme.

---

### Performance Test 2: Viele Spieler

**Ziel:** System skaliert mit vielen Spielern.

1. **Setup:**
   - Training mit 20+ eingeladenen Spielern
   - Max 4 Plätze
   - Round-Robin aktiviert

2. **Prüfe:**
   - Prioritäts-Berechnung < 1 Sekunde
   - UI zeigt alle Spieler korrekt
   - Keine Verzögerungen

**✅ Pass-Kriterium:** Auch mit vielen Spielern performant.

---

## ✅ **SCHRITT 5: Abnahme-Checkliste**

### Funktionale Tests
- [ ] Training OHNE Round-Robin funktioniert normal
- [ ] Training MIT Round-Robin erstellt Warteliste bei Überbuchung
- [ ] Prioritäts-Scores werden korrekt berechnet
- [ ] Warteliste zeigt korrekte Positionen
- [ ] Automatisches Nachrücken funktioniert
- [ ] Prio-Training Bonus wird korrekt angewendet
- [ ] Spieler-Statistiken werden automatisch aktualisiert
- [ ] Mehrere Wartelisten-Plätze funktionieren

### UI Tests
- [ ] 🎲 Symbol wird bei Round-Robin angezeigt
- [ ] ⭐ Symbol wird bei Prio-Training angezeigt
- [ ] Badge zeigt korrekte Anzahl (z.B. `4/4 (+2)`)
- [ ] Prioritäts-Scores sind sichtbar
- [ ] Wartelisten-Positionen sind sichtbar
- [ ] Info-Boxen sind hilfreich und korrekt
- [ ] "Dabei" / "Warteliste" Listen sind klar getrennt

### Edge Cases
- [ ] Spieler ohne Statistiken werden korrekt behandelt
- [ ] Alle Spieler mit gleicher Priorität → Zufallsfaktor
- [ ] Training bearbeiten funktioniert
- [ ] Absagen und wieder zusagen funktioniert

### Performance
- [ ] Ladezeit < 2 Sekunden (bei 20+ Trainings)
- [ ] Prioritäts-Berechnung < 1 Sekunde (bei 20+ Spielern)
- [ ] Keine Console-Errors
- [ ] UI ist responsive

---

## 🐛 **Bekannte Bugs / Limitierungen**

### V1 Limitierungen
- [ ] Keine Push-Benachrichtigungen bei Nachrücken (nur Alert)
- [ ] Keine Email-Benachrichtigungen
- [ ] Keine manuelle Prioritäts-Anpassung durch Captain
- [ ] Kein "Urlaubs-Modus" (Spieler pausieren ohne Penalty)

### Geplante Fixes für V2
- Benachrichtigungs-System
- Dashboard für Spieler-Statistiken
- Manuelle Overrides für Captains

---

## 📝 **Test-Protokoll**

### Test-Umgebung
- **Datum:** _______________
- **Tester:** _______________
- **Browser:** _______________
- **Supabase Projekt:** _______________

### Test-Ergebnisse

| Test ID | Test Name | Status | Notizen |
|---------|-----------|--------|---------|
| 1 | Training ohne RR | ☐ Pass ☐ Fail | |
| 2 | Training mit RR | ☐ Pass ☐ Fail | |
| 3 | Prioritäts-Berechnung | ☐ Pass ☐ Fail | |
| 4 | Auto-Nachrücken | ☐ Pass ☐ Fail | |
| 5 | Prio-Training Bonus | ☐ Pass ☐ Fail | |
| 6 | Statistik-Update | ☐ Pass ☐ Fail | |
| 7 | Mehrere Wartelisten-Plätze | ☐ Pass ☐ Fail | |
| EC1 | Gleiche Priorität | ☐ Pass ☐ Fail | |
| EC2 | Spieler ohne Stats | ☐ Pass ☐ Fail | |
| EC3 | Training bearbeiten | ☐ Pass ☐ Fail | |
| P1 | Performance (viele Trainings) | ☐ Pass ☐ Fail | |
| P2 | Performance (viele Spieler) | ☐ Pass ☐ Fail | |

---

**Viel Erfolg beim Testen! 🚀**

