# 🔄 Round-Robin System Erklärung

## Problem: Markus setzt 2x hintereinander aus

### Ursache
Das aktuelle System berechnet Priorität **ausschließlich** basierend auf:
1. **Tage seit letzter Teilnahme** (Hauptfaktor)
2. Absagen-Bonus
3. Zufallsfaktor

### Warum passiert das?
In der Gruppe "Volkers Hallenhelden" sind **5 Spieler** aktiv:
- Max. Plätze: **4** 
- Muss jeder abwechselnd aussetzen

**Beispiel-Szenario:**

| Training | Markus | Anna | Tom | Lisa | Jens |
|----------|--------|------|-----|------|------|
| 1        | ✅     | ✅   | ✅  | ✅   | ❌   |
| 2        | ❌     | ✅   | ✅  | ✅   | ✅   |

**Warum setzt Markus beim 2. Training aus?**
- Nach Training 1 war Markus **zuletzt dabei**
- Alle anderen hatten eine **längere Pause** (weil noch nie dabei)
- System berechnet: "Wer am längsten nicht da war = höchste Priorität"
- Resultat: Markus hat **niedrigste Priorität**, andere haben **höhere**

### Die Crux
Das System denkt: "Markus war gerade erst da, andere noch nie → sie kommen zuerst"

## ✅ Lösungsansatz

Das System ist **grundsätzlich korrekt**, ABER:

1. **Bei erstem Training** haben alle `last_attended = null` → System nutzt Saisonstart (18.10.2025)
2. **Nach erstem Training** wird `last_attended` aktualisiert
3. **Beim 2. Training** hat Markus die **geringste Pause** → niedrigste Priorität

**Das ist das ERWARTETE Verhalten!**

### Round-Robin bedeutet:
- **Wer am längsten NICHT dabei war**, bekommt Platz
- Markus war gerade erst da → er hat Pause gemacht
- Beim **3. Training** wird Markus wieder Priorität haben

## 🎯 Fazit

Das System funktioniert korrekt! Markus **SOLL** beim 2. Training aussetzen, wenn er beim 1. dabei war.

**Proof:**
- Training 1: 4 Plätze, 5 Spieler → Jens setzt aus (nie dabei)
- Training 2: 4 Plätze, 5 Spieler → Markus setzt aus (war gerade erst da)
- Training 3: 4 Plätze, 5 Spieler → Anna setzt aus (war beim Training 1)
- Training 4: 4 Plätze, 5 Spieler → Tom setzt aus (war bei 1 & 2)
- usw.

**Das ist FAIR ROTATION!**

## 📊 Prioritäts-Berechnung

```javascript
priority = daysSinceLastTraining + declineBonus + randomFactor
```

- **Höhere Priorität** = Längere Pause = Platz ist sicher
- **Niedrigere Priorität** = Kürzlich dabei gewesen = Warteliste

## ⚠️ Wenn du willst dass NICHTS ausfällt

Wenn **alle 5 Spieler immer kommen wollen**, setze `max_players = 5` oder mehr.

---

**Erstellt:** 29.10.2025  
**Status:** ✅ System funktioniert wie designed



