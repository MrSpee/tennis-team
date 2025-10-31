# 🛡️ Anti-Aussetz-Schutz (Version 2.0)

## Problem gelöst: Kein Spieler kann 2x hintereinander aussetzen

### ✅ Neue Prioritäts-Berechnung

```javascript
priority = daysSinceLastTraining + declineBonus + randomFactor
```

### 🎯 Anti-Aussetz-Bonus System

| Situation | Bonus | Erklärung |
|-----------|-------|-----------|
| **2x hintereinander ausgesetzt** | **+2000** | EXTRA GROSSER Bonus - wird garantiert beim nächsten Training Platz haben |
| **1x ausgesetzt** | **+1000** | GROSSER Bonus - darf nicht wieder aussetzen |
| **Letzte Antwort war Absage (länger her)** | +25 | Normaler Bonus |
| **Nie ausgesetzt** | +0 bis +15 | Je nach Quote |

## 📊 Wie funktioniert das?

### Beispiel: "Volkers Hallenhelden"
- **5 Spieler**, **4 Plätze** pro Training
- Round-Robin aktiviert

### Training 1 (25.10.2025)
| Spieler | Status | Priorität |
|---------|--------|-----------|
| Markus  | ✅ Dabei | - |
| Anna    | ✅ Dabei | - |
| Tom     | ✅ Dabei | - |
| Lisa    | ✅ Dabei | - |
| Jens    | ❌ Ausgesetzt | - |

**Warum Jens?** Alle hatten `last_attended = null` → Jens hatte schlechteste Zufallszahl.

### Training 2 (01.11.2025)
| Spieler | Last Attended | Consecutive Declines | Bonus | Priorität | Status |
|---------|---------------|---------------------|-------|-----------|--------|
| Jens    | nie           | 1                   | **+1000** | ~2000 | ✅ Dabei |
| Markus  | 25.10 (7 Tage)| 0                   | +0    | 7         | ❌ Ausgesetzt |
| Anna    | 25.10 (7 Tage)| 0                   | +0    | 7         | ✅ Dabei |
| Tom     | 25.10 (7 Tage)| 0                   | +0    | 7         | ✅ Dabei |
| Lisa    | 25.10 (7 Tage)| 0                   | +0    | 7         | ✅ Dabei |

**Warum Markus?** Jens hat Bonus +1000 (hat ausgesetzt), daher höchste Priorität.  
Markus, Anna, Tom, Lisa haben alle 7 Tage seit letzter Teilnahme.  
→ Zufall entscheidet → Markus verliert.

### Training 3 (08.11.2025)
| Spieler | Last Attended | Consecutive Declines | Bonus | Priorität | Status |
|---------|---------------|---------------------|-------|-----------|--------|
| Markus  | nie seit Training 1 | 0 (wenn abgesagt) oder 1 (wenn dabei) | **+1000** | ~2000 | ✅ Dabei |
| Jens    | 01.11 (7 Tage) | 0                   | +0    | 7         | ❌ Ausgesetzt |
| Anna    | 01.11 (7 Tage) | 0                   | +0    | 7         | ✅ Dabei |
| Tom     | 01.11 (7 Tage) | 0                   | +0    | 7         | ✅ Dabei |
| Lisa    | 01.11 (7 Tage) | 0                   | +0    | 7         | ✅ Dabei |

**Warum Markus?** Markus hat +1000 Bonus (hat beim 2. Training ausgesetzt).  
→ **Markus ist garantiert dabei**, muss NICHT 2x hintereinander aussetzen!

## 🎯 Fazit

### Vorher (Ohne Anti-Aussetz-Schutz):
- Markus: Training 1 ✅, Training 2 ❌, Training 3 ❌ (2x hintereinander!)
- **Problem:** Ungerecht!

### Jetzt (Mit Anti-Aussetz-Schutz):
- Markus: Training 1 ✅, Training 2 ❌, Training 3 ✅ (+1000 Bonus)
- **Ergebnis:** Faire Rotation ohne 2x hintereinander aussetzen!

## 📈 Prioritäts-Formel (Final)

```javascript
// 1. Basis: Tage seit letzter Teilnahme (höher = besser)
priority = daysSinceLastTraining;

// 2. Anti-Aussetz-Bonus:
if (consecutive_declines >= 2) {
  declineBonus = 2000; // 2x+ ausgesetzt
} else if (last_response === 'declined' && consecutive_declines === 1) {
  declineBonus = 1000; // 1x ausgesetzt
} else if (last_response === 'declined') {
  declineBonus = 25; // Absage (länger her)
}

// 3. Zufallsfaktor (0-5)
randomFactor = seededRandom(playerId + seed);

// FINALE Priorität
finalPriority = priority + declineBonus + randomFactor;
```

## ✅ Garantien

1. **Kein Spieler setzt 2x hintereinander aus** (wenn er zusagt)
2. **Wer 2x ausgesetzt hat, ist garantiert beim nächsten Mal dabei** (Bonus +2000)
3. **Wer 1x ausgesetzt hat, bekommt Vorrang** (Bonus +1000)
4. **Faire Rotation über die Zeit**

---

**Erstellt:** 29.10.2025  
**Status:** ✅ Implementiert - Anti-Aussetz-Schutz aktiv



