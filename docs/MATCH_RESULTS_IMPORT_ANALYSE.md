# Analyse: Warum werden keine Match-Ergebnisse importiert?

## Problem
- 77 Matchdays mit `meeting_id` aber ohne `match_results`
- Re-Import-Script: 0 erfolgreich, 77 fehlgeschlagen
- Fehlermeldungen:
  - "Keine Ergebnisse importiert" (meistens)
  - "Meeting-Report nicht verfügbar (HTTP 404)" (einige)

## Mögliche Ursachen

### 1. Meeting-Report ist leer oder nicht verfügbar
- Die `meeting_id` existiert, aber der Meeting-Report enthält keine Daten
- Der Meeting-Report konnte nicht von nuLiga geladen werden (404)

### 2. Meeting-Report konnte nicht geparst werden
- Der Scraper findet keine Einzel- oder Doppel-Matches
- Die Datenstruktur des Meeting-Reports ist unerwartet

### 3. Spieler konnten nicht zugeordnet werden
- Alle Spieler fehlen, daher werden keine Ergebnisse erstellt
- Die `appendRow` Funktion wird aufgerufen, aber es werden keine Rows erstellt

## Code-Analyse

### `applyMeetingResults` Funktion
```javascript
if (!rows.length) {
  return { inserted: [], deleted: 0, missingPlayers: [] };
}
```

Wenn keine `rows` erstellt wurden, gibt die API keine Ergebnisse zurück.

### `appendRow` Funktion
Wird für jedes Match in `singles` und `doubles` aufgerufen. Wenn diese Arrays leer sind, werden keine Rows erstellt.

## Nächste Schritte

1. **Teste ein spezifisches Match manuell**
   - Prüfe, ob der Meeting-Report Daten enthält
   - Prüfe, ob die Spieler zugeordnet werden können
   - Prüfe, ob die Set-Ergebnisse vorhanden sind

2. **Verbessere Fehlerbehandlung**
   - Logge, warum keine Ergebnisse erstellt wurden
   - Erstelle Ergebnisse auch, wenn Spieler fehlen (mit NULL-Werten)
   - Erstelle Ergebnisse auch, wenn Set-Ergebnisse fehlen

3. **Prüfe Meeting-Report Verfügbarkeit**
   - Prüfe, ob die `meeting_id` noch gültig ist
   - Prüfe, ob der Meeting-Report auf nuLiga verfügbar ist

