# Systematischer Fix-Plan: Herren 55 Standings-Probleme

## Identifizierte Probleme

### Problem 1: VKC Köln taucht zweimal in der Tabelle auf
- **Symptom**: "VKC Köln  1" (2 Leerzeichen) und "VKC Köln 1" (1 Leerzeichen) erscheinen beide
- **Ursache**: Wahrscheinlich zwei verschiedene `team_info` Einträge mit unterschiedlichen `team_name` Werten
- **Auswirkung**: Falsche Tabellenberechnung, da ein Team doppelt gezählt wird

### Problem 2: Spiele der Saison werden nicht angezeigt
- **Symptom**: Nur 1 Spiel (6:0 Sieg) wird angezeigt, obwohl mehr Spiele existieren sollten
- **Ursache**: 
  - Matchdays haben möglicherweise falsche `season`, `league` oder `group_name`
  - Filterung in `TeamView.jsx` Zeile 375-377 ist zu strikt
  - Matchdays werden nicht korrekt geladen

### Problem 3: Standings-Berechnung berücksichtigt nicht alle Spiele
- **Symptom**: Nur 1 Spiel wird in der Berechnung berücksichtigt
- **Ursache**: 
  - `matchdays` Query filtert nach `season` (Zeile 369), aber möglicherweise haben nicht alle Matchdays die korrekte `season`
  - Filterung nach `group_name` fehlt in der Query

## Analyse-Schritte

1. **SQL-Analyse-Script ausführen** (`sql/ANALYZE_HERREN_55_STANDINGS_ISSUES.sql`)
   - Identifiziere alle Duplikate in `team_info` und `team_seasons`
   - Prüfe alle Matchdays für Herren 55
   - Prüfe welche `match_results` existieren

2. **Code-Analyse**
   - Prüfe Deduplizierungs-Logik in `TeamView.jsx` Zeile 280-331
   - Prüfe Matchday-Filterung in `TeamView.jsx` Zeile 365-377
   - Prüfe `buildTeamLabel` in `standings.js` Zeile 6-9

## Fix-Strategie

### Phase 1: Datenbereinigung (SQL)
1. **Duplikate in `team_info` finden und zusammenführen**
   - Finde alle `team_info` Einträge für "VKC Köln" mit `category = 'Herren 55'`
   - Identifiziere Duplikate (unterschiedliche IDs, aber gleicher normalisierter Name)
   - Migriere alle Referenzen zum ältesten Eintrag
   - Lösche Duplikate

2. **Duplikate in `team_seasons` bereinigen**
   - Finde alle `team_seasons` Einträge für das gleiche Team
   - Behalte nur den neuesten aktiven Eintrag
   - Lösche oder deaktiviere Duplikate

3. **Matchdays korrigieren**
   - Stelle sicher, dass alle Matchdays für Herren 55 die korrekte `season`, `league` und `group_name` haben
   - Filtere nach Team-ID, nicht nur nach Category

### Phase 2: Code-Verbesserungen
1. **Robustere Deduplizierung in `TeamView.jsx`**
   - Verbessere Normalisierung (entferne alle mehrfachen Leerzeichen)
   - Prüfe auch nach Team-ID Duplikaten
   - Warnung bei Duplikaten in Console

2. **Verbesserte Matchday-Filterung**
   - Filtere auch nach `group_name` in der Query
   - Fallback-Logik wenn `group_name` fehlt
   - Debug-Logs für besseres Troubleshooting

3. **Verbesserte `buildTeamLabel` Funktion**
   - Normalisiere Leerzeichen (entferne mehrfache Leerzeichen)
   - Konsistente Formatierung

## Fragen zur Klärung

1. **Soll "VKC Köln  1" (2 Leerzeichen) und "VKC Köln 1" (1 Leerzeichen) als das gleiche Team behandelt werden?**
   - **Antwort erwartet**: Ja, es handelt sich um das gleiche Team

2. **Wie viele Spiele sollten für Herren 55 in Gr. 063 angezeigt werden?**
   - **Aktuell**: Nur 1 Spiel wird angezeigt
   - **Erwartet**: ? Spiele

3. **Sollen alle Matchdays für Herren 55 automatisch zu "Gr. 063" zugeordnet werden, oder gibt es Matchdays die zu anderen Gruppen gehören?**
   - **Antwort erwartet**: Alle Matchdays für Herren 55 in dieser Saison gehören zu "Gr. 063"

4. **Soll die Deduplizierung auch nach normalisiertem Team-Namen erfolgen (nicht nur nach Team-ID)?**
   - **Antwort erwartet**: Ja, Teams mit gleichem normalisiertem Namen sollten als Duplikate behandelt werden

