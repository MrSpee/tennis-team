# Match Number Analyse

## ✅ Was ich jetzt verstehe:

### `match_number` ist eindeutig pro Saison
- Gr. 001: Match #1 bis #21
- Gr. 002: Match #22 bis #36
- Gr. 003: Match #37 bis #51
- etc.

**Jeder Matchday hat eine eindeutige `match_number` in der gesamten Saison!**

## 🤔 Das Problem aus den Logs:

```
[importMatches] ⚠️ Bestehendes Match gefunden über match_number #1 in anderer Gruppe (Gr. 001) - wird aktualisiert
```

**Frage**: Wenn `match_number` eindeutig ist, warum wurde dann Match #1 aus Gr. 001 gefunden, wenn wir Match #1 für eine andere Gruppe importieren wollten?

### Mögliche Erklärungen:

1. **nuLiga liefert falsche `match_number`**: 
   - Der Scraper bekommt `match_number` aus nuLiga
   - Diese Nummer könnte falsch sein oder sich ändern

2. **Die alte Logik hat ohne Team-Validierung gesucht**:
   - Auch wenn `match_number` eindeutig sein sollte, könnte es sein, dass:
     - Ein Match noch nicht in der DB ist
     - Ein Match mit falscher `match_number` importiert wurde
     - Die alte Logik hat dann ein anderes Match gefunden

3. **`match_number` wird pro Gruppe neu vergeben**:
   - Vielleicht ist `match_number` NICHT eindeutig, sondern nur pro Gruppe?
   - Aber die DB zeigt, dass sie eindeutig ist...

## 💡 Meine Lösung:

Auch wenn `match_number` eindeutig sein sollte, sollten wir trotzdem:
1. **Immer nach `group_name` filtern** (zusätzliche Sicherheit)
2. **Teams validieren** (falls `match_number` doch nicht eindeutig ist oder falsch)
3. **Nicht über Gruppen hinweg suchen** (verhindert falsche Zuordnungen)

## ❓ Fragen an dich:

1. **Ist `match_number` wirklich eindeutig pro Saison?** 
   - Oder kann es sein, dass verschiedene Gruppen die gleiche `match_number` haben?

2. **Woher kommt `match_number`?**
   - Wird sie von nuLiga geliefert?
   - Oder wird sie von uns generiert?

3. **Was meinst du mit "einzelne Ergebnisse eines Matchdays"?**
   - Ein Matchday = ein Spiel zwischen zwei Teams
   - Einzelne Ergebnisse = die einzelnen Spiele (Einzel, Doppel) innerhalb eines Matchdays?
   - Müssen diese der `match_number` des Matchdays zugeordnet werden?

