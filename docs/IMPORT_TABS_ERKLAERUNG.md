# Import-Tabs Erklärung

## Welcher Tab funktioniert?

### ✅ **"Gruppen" Tab** (empfohlen)
- **Funktioniert**: ✅ Ja, vollständig
- **Was macht er**: Importiert komplette nuLiga-Gruppen (Teams, Matchdays, Ergebnisse)
- **Vorteile**:
  - Automatische Team-Erstellung
  - Automatische Matchday-Erstellung
  - Automatischer Match-Results Import
  - Bessere Fehlerbehandlung
  - Speichert `source_url` in `team_seasons`
- **Verwendung**: 
  1. Tab "Gruppen" öffnen
  2. "Mit nuLiga vergleichen" klicken
  3. Gruppen auswählen
  4. "Importieren" klicken

### ⚠️ **"Scraper" Tab** (veraltet)
- **Funktioniert**: ⚠️ Teilweise, aber veraltet
- **Was macht er**: Älterer Import-Prozess mit manueller Team-Zuordnung
- **Nachteile**:
  - Erfordert manuelle Team-Zuordnung
  - Keine automatische Team-Erstellung
  - Komplexere UI
- **Verwendung**: Nicht empfohlen, außer für spezielle Fälle

## 409 Conflict Fehler bei team_seasons

### Problem
Der Fehler `POST .../team_seasons 409 (Conflict)` tritt auf, wenn versucht wird, eine `team_season` zu erstellen, die bereits existiert.

### Lösung
Die Funktion `ensureTeamSeasons` wurde verbessert:
- Prüft vor dem Insert, ob die `team_season` bereits existiert
- Behandelt 409 Conflicts korrekt (findet bestehenden Eintrag)
- Aktualisiert `source_url`, falls noch nicht gesetzt
- Loggt informative Meldungen statt Fehler

### Was passiert jetzt
1. Prüfung: Existiert die `team_season` bereits?
2. Wenn ja: Update `source_url` (falls nötig) → ✅ Erfolg
3. Wenn nein: Insert → ✅ Erfolg
4. Bei 409 Conflict: Finde bestehenden Eintrag → ✅ Erfolg (kein Fehler mehr)

## Duplikate

### Prüfung
- ✅ **Keine Duplikate** in `matchdays` (gleiches Datum + Teams)
- ✅ **Keine Duplikate** in `team_seasons` (gleiche team_id + season + league + group_name)
- ✅ **Keine Duplikate** in `team_info` (gleiche club_id + team_name + category)

## Empfehlung

**Verwende den "Gruppen" Tab** für alle nuLiga-Imports. Er ist vollständig automatisiert und erstellt alle benötigten Daten (Teams, Matchdays, Ergebnisse) automatisch.

