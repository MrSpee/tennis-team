# Fix: Fallback-Logik für fehlende source_url

## Problem

Bei älteren Imports fehlt die `source_url` in `team_seasons` für viele Gruppen. Das führt zu Fehlern:
- "Keine Gruppenlinks auf der Ligaübersicht gefunden"
- Der Scraper verwendet die falsche Tab-Seite (tab=3 statt tab=2)

### Betroffene Gruppen
- Gr. 025, Gr. 026, Gr. 029 (und viele weitere)
- Ligen: "Köln-Leverkusen Winter 2025/2026 Herren 2. Bezirksliga", "Herren 2. Kreisliga", etc.

## Lösung

Implementiert eine **3-stufige Fallback-Logik**:

### 1. Versuche `source_url` aus `team_seasons` zu laden
- Für die spezifische Gruppe (group_name, season, league)

### 2. Fallback: Andere Gruppe derselben Liga
- Wenn keine `source_url` für diese Gruppe, prüfe andere Gruppen derselben Liga

### 3. Fallback: Basierend auf Liga-Name
- Wenn keine `source_url` gefunden, bestimme Tab-Seite basierend auf Liga-Name:
  - Köln-Leverkusen Ligen → `tab=2`
  - Bezirksliga/Kreisliga → `tab=2`
  - Andere → `tab=2` (Standard)

## Implementierte Änderungen

### 1. Frontend: `fetchGroupSnapshot` (SuperAdminDashboard.jsx)
- Lädt `source_url` aus `team_seasons`
- Implementiert 3-stufige Fallback-Logik
- Verwendet Fallback-URL, wenn keine `source_url` vorhanden

### 2. Backend: `meeting-report` API
- Lädt `source_url` aus `team_seasons`, wenn `matchdayId` vorhanden ist
- Implementiert gleiche Fallback-Logik
- Verwendet `leagueUrlToUse` statt `DEFAULT_LEAGUE_URL`

## Vorteile

- ✅ Funktioniert auch für ältere Imports ohne `source_url`
- ✅ Automatische Erkennung der richtigen Tab-Seite
- ✅ Keine manuellen Eingriffe nötig
- ✅ Konsistente Logik in Frontend und Backend

## Test

Nach dem Fix sollten die betroffenen Gruppen (25, 29, 26) korrekt importiert werden können, auch wenn `source_url` fehlt.

