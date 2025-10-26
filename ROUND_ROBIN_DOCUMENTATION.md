# 🎲 Round-Robin Training-System - Dokumentation

## Überblick

Das **intelligente Round-Robin Training-System** sorgt für faire Platzvergabe bei überbuchten Trainings. Es berücksichtigt die Teilnahme-Historie jedes Spielers und stellt sicher, dass aktive Spieler bevorzugt werden, während "Vielabsager" bei Überbuchung eher auf die Warteliste kommen.

---

## ✨ Features

### 1. **Intelligente Prioritäts-Berechnung**
Jeder Spieler erhält einen Prioritäts-Score basierend auf:
- **40%** Teilnahme-Quote (Wie oft hast du zugesagt?)
- **30%** Prio-Training Bonus (Bei wichtigen Trainings)
- **20%** Zufallsfaktor (Faire Rotation)
- **10%** "Lange nicht teilgenommen" Bonus
- **Penalty:** -5 Punkte pro konsekutive Absage (max. -20)

### 2. **Automatische Warteliste**
- Bei Überbuchung (z.B. 5 Zusagen bei 4 Plätzen)
- Spieler mit niedrigerer Priorität kommen auf die Warteliste
- Wartelisten-Position wird automatisch berechnet

### 3. **Automatisches Nachrücken**
- Sagt jemand ab, rückt der Erste von der Warteliste automatisch nach
- Benachrichtigung erfolgt automatisch

### 4. **Prio-Training Modus**
- Für wichtige Trainings (z.B. Medenspiel-Vorbereitung)
- Alle Spieler erhalten +30% Priorität-Bonus
- Zeigt Wichtigkeit des Trainings

### 5. **Transparenz**
- Jeder Spieler sieht seine Priorität
- Grund für Wartelisten-Position ist ersichtlich
- Keine "Black Box" - alles nachvollziehbar

---

## 👤 Für Spieler: Wie funktioniert es?

### Deine Teilnahme-Quote
Deine **Teilnahme-Quote** ist der wichtigste Faktor:
```
Teilnahme-Quote = Zusagen / (Zusagen + Absagen)
```

**Beispiel:**
- Du hast 8x zugesagt und 2x abgesagt
- Deine Quote: 8 / (8 + 2) = **80%**
- Das gibt dir **32 Punkte** (40% von 80)

### Prioritäts-Berechnung im Detail

#### Beispiel 1: Aktiver Spieler
```
Name: Lisa
- Teilnahme-Quote: 90% → 36 Punkte
- Prio-Training: Ja → +30 Punkte
- Zufallsfaktor: 15.3 → +15.3 Punkte
- Letztes Training: Vor 3 Wochen → +4.3 Punkte
- Konsekutive Absagen: 0 → 0 Penalty

GESAMT: 85.6 Punkte ✅ DABEI
```

#### Beispiel 2: Gelegentlicher Spieler
```
Name: Max
- Teilnahme-Quote: 60% → 24 Punkte
- Prio-Training: Ja → +30 Punkte
- Zufallsfaktor: 8.2 → +8.2 Punkte
- Letztes Training: Vor 1 Woche → +1.4 Punkte
- Konsekutive Absagen: 2 → -10 Penalty

GESAMT: 53.6 Punkte ⏳ WARTELISTE Position 1
```

### Wenn du auf der Warteliste bist

**Was passiert?**
1. Du siehst deine Wartelisten-Position (z.B. #1, #2, ...)
2. Du siehst deinen Prioritäts-Score
3. Du kannst deine Priorität verbessern durch:
   - Regelmäßige Teilnahme an Trainings
   - Weniger Absagen

**Automatisches Nachrücken:**
- Sagt jemand ab, rückst du automatisch nach
- Du erhältst eine Benachrichtigung
- Keine Aktion nötig!

---

## 👨‍💼 Für Organisatoren: Training erstellen

### Round-Robin aktivieren

1. **Beim Training erstellen:**
   - Checkbox: "🎲 Intelligente Platzvergabe aktivieren"
   - Optional: "⭐ Prio-Training" für wichtige Events

2. **Was passiert dann?**
   - System berechnet automatisch Prioritäten
   - Bei Überbuchung: Warteliste wird erstellt
   - Bei Absagen: Automatisches Nachrücken

### Wann sollte ich Round-Robin aktivieren?

**Empfohlen für:**
- ✅ Wiederkehrende Trainings (wöchentlich)
- ✅ Trainings mit begrenzten Plätzen (4-8 Spieler)
- ✅ Trainings mit hoher Nachfrage
- ✅ Team-Trainings für Medenspiele

**Nicht empfohlen für:**
- ❌ Einzelne, einmalige Trainings
- ❌ Trainings mit unbegrenzten Plätzen
- ❌ Trainings mit wenig Nachfrage

### Prio-Training Modus

**Aktiviere "Prio-Training" für:**
- 🏆 Medenspiel-Vorbereitung
- 🎾 Wichtige Turniere
- 📅 Kurzfristige Team-Events

**Effekt:**
- Alle Spieler bekommen +30% Priorität
- Zeigt Wichtigkeit an (⭐ Symbol)
- Spieler sehen, dass es ein wichtiges Training ist

---

## 📊 Statistiken verstehen

### Training-Statistiken eines Spielers

Jeder Spieler hat folgende Statistiken:

```javascript
{
  "total_invites": 20,        // Wie oft eingeladen
  "total_attended": 16,        // Wie oft zugesagt
  "total_declined": 4,         // Wie oft abgesagt
  "attendance_rate": 0.8,      // 80% Teilnahme-Quote
  "last_attended": "2025-10-15", // Letztes Training
  "consecutive_declines": 0    // Absagen in Folge
}
```

### Wie verbessere ich meine Priorität?

1. **Regelmäßig zusagen** → Erhöht Teilnahme-Quote
2. **Absagen vermeiden** → Reduziert Penalty
3. **Lange Pausen vermeiden** → Erhöht "Recency" Bonus
4. **Bei Prio-Trainings zusagen** → Extra 30% Bonus

---

## 🔧 Technische Details

### Prioritäts-Formel

```javascript
Priorität = 
  (attendance_rate × 40) +           // Teilnahme-Quote
  (is_priority × 30) +               // Prio-Training Bonus
  (seededRandom × 20) +              // Zufallsfaktor
  (daysSinceLastTraining / 7 × 10) + // Recency Bonus
  (consecutive_declines × -5)        // Penalty
```

### Seeded Random
- Jedes Training bekommt einen "Seed" (Zufallszahl)
- Garantiert reproduzierbare Ergebnisse
- Alle Spieler haben die gleiche Chance
- Verhindert "Glücksspiel"-Effekt

### Automatisches Nachrücken
1. Spieler sagt ab → Status wird auf "declined" gesetzt
2. System berechnet neue Warteliste
3. Erster auf Warteliste wird markiert als "auto_promoted"
4. Benachrichtigung wird gesendet (optional)

---

## 🎯 Best Practices

### Für Spieler
1. ✅ Sage frühzeitig zu oder ab
2. ✅ Vermeide Last-Minute Absagen
3. ✅ Nimm regelmäßig an Trainings teil
4. ✅ Priorisiere wichtige Trainings (⭐)

### Für Organisatoren
1. ✅ Aktiviere Round-Robin für wiederkehrende Trainings
2. ✅ Setze "Prio-Training" nur für wirklich wichtige Events
3. ✅ Kommuniziere das System an dein Team
4. ✅ Überprüfe gelegentlich die Statistiken

---

## ❓ FAQ

### Warum bin ich auf der Warteliste?
Du hast eine niedrigere Priorität als andere Spieler. Das kann verschiedene Gründe haben:
- Niedrigere Teilnahme-Quote
- Viele Absagen in Folge
- Pech beim Zufallsfaktor
- Andere Spieler haben lange nicht teilgenommen

### Wie komme ich von der Warteliste runter?
1. **Kurzfristig:** Hoffen, dass jemand absagt (automatisches Nachrücken)
2. **Langfristig:** Teilnahme-Quote verbessern durch regelmäßige Zusagen

### Kann ich meine Priorität sehen?
Ja! Wenn du zugesagt hast, siehst du deinen Prioritäts-Score direkt in der Training-Card.

### Was ist, wenn ich unfair behandelt werde?
Das System ist komplett transparent und automatisch. Dein Organisator kann deine Statistiken einsehen und erklären. Bei Fragen: Sprich mit deinem Team Captain.

### Funktioniert das System auch ohne Round-Robin?
Ja! Round-Robin ist optional. Wenn nicht aktiviert, läuft alles wie bisher (First Come, First Serve).

---

## 🚀 Ausblick

### Geplante Features (V2)
- [ ] Push-Benachrichtigungen bei Nachrücken
- [ ] Email-Benachrichtigungen
- [ ] Spieler-Dashboard mit Statistiken
- [ ] Manuelle Prioritäts-Anpassung durch Captain
- [ ] "Urlaubs-Modus" (Aussetzen ohne Penalty)

---

**Viel Spaß beim Training! 🎾**

