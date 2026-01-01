# Plan: Meldelisten-Verwaltung im Superadmin Dashboard

## Anforderung
Der User möchte:
1. Die automatischen Meldelisten-Imports nachvollziehen können
2. Die importierten Meldelisten bearbeiten können

## Lösung
Eine neue Sektion "Importierte Meldelisten" in ClubRostersTab, die:

### 1. Übersicht aller importierten Meldelisten
- Gruppiert nach Team/Saison
- Zeigt: Team-Name, Saison, Anzahl Spieler, Anzahl gematcht (player_id vorhanden)
- Filter nach Verein, Saison, Match-Status (vollständig/teilweise/ungematcht)

### 2. Bearbeitungsfunktionen
- "Bearbeiten"-Button pro Meldeliste
- Modal/Tab mit:
  - Tabelle aller Roster-Einträge
  - Spalten: Rang, Name, LK, TVM-ID, player_id (gematcht?), Aktionen
  - Edit-Button pro Zeile → Modal zum:
    - player_id zuordnen (Search/Select aus players_unified)
    - LK korrigieren
    - TVM-ID korrigieren
    - Eintrag löschen
  - Bulk-Aktionen: "Alle ungematchten neu matchen"

### 3. Integration
- Sollte in ClubRostersTab integriert werden (nicht separate Komponente)
- Als neue Sektion nach der Vereins-Übersicht
- Toggle zwischen "Import" und "Verwaltung" View

