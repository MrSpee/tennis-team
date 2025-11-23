# Fix: Falscher championship-Parameter in Fallback-URL

## Problem

Die Fallback-Logik verwendete immer `championship=TVM+Winter+2025%2F2026`, aber:
- **"Köln-Leverkusen" Ligen** benötigen `championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026`
- **Andere Ligen** (Verbandsliga, Mittelrheinliga) verwenden `championship=TVM+Winter+2025%2F2026`

### Fehler
```
❌ Fehler beim Parser für Gruppe 25 Error: Keine Gruppenlinks auf der Ligaübersicht gefunden.
```

### Betroffene Gruppen
- Gr. 025, Gr. 026, Gr. 029 (Köln-Leverkusen Ligen)
- Ligen: "Köln-Leverkusen Winter 2025/2026 Herren 2. Bezirksliga", etc.

## Lösung

Die Fallback-Logik wurde korrigiert, um den richtigen `championship`-Parameter basierend auf der Liga zu verwenden:

### Vorher:
```javascript
// Immer TVM championship
const baseUrl = 'https://tvm.liga.nu/...?championship=TVM+Winter+2025%2F2026';
leagueUrl = `${baseUrl}&tab=2`; // ❌ Falsch für Köln-Leverkusen Ligen
```

### Nachher:
```javascript
if (league.includes('Köln-Leverkusen')) {
  // Köln-Leverkusen Ligen
  baseUrl = 'https://tvm.liga.nu/...?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
  leagueUrl = `${baseUrl}&tab=3`; // ✅ Korrekt
} else {
  // Andere Ligen
  baseUrl = 'https://tvm.liga.nu/...?championship=TVM+Winter+2025%2F2026';
  leagueUrl = `${baseUrl}&tab=2`; // ✅ Korrekt
}
```

## Implementierte Änderungen

### 1. Frontend: `fetchGroupSnapshot` (SuperAdminDashboard.jsx)
- Prüft, ob Liga "Köln-Leverkusen" enthält
- Verwendet `championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=3` für Köln-Leverkusen Ligen
- Verwendet `championship=TVM+Winter+2025%2F2026&tab=2` für andere Ligen

### 2. Backend: `meeting-report` API
- Gleiche Logik implementiert
- Lädt `source_url` aus `team_seasons` oder verwendet Fallback mit korrektem `championship`-Parameter

## Tab-Seiten

- **Köln-Leverkusen Ligen**: `tab=3` (entspricht DEFAULT_LEAGUE_URL)
- **TVM Ligen** (Verbandsliga, Mittelrheinliga): `tab=2`

## Test

Nach dem Fix sollten die betroffenen Gruppen (25, 29, 26) korrekt importiert werden können, da die richtige URL mit dem korrekten `championship`-Parameter verwendet wird.

