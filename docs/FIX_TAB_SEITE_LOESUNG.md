# Fix: Falsche Tab-Seite für Köln-Leverkusen Ligen

## Problem identifiziert

Die Fallback-Logik verwendete für alle "Köln-Leverkusen" Ligen `tab=3` (Senioren), aber:
- **Gr. 025, 026, 029** sind auf **tab=2** (Damen/Herren)
- **Gr. 035, 037, 041, 043** sind auf **tab=3** (Senioren)

### Fehler
```
❌ Fehler beim Parser für Gruppe 25 Error: Keine Gruppenlinks auf der Ligaübersicht gefunden.
```

### Root Cause

Die Unterscheidung hängt nicht nur vom `championship`-Parameter ab, sondern auch von der **Altersklasse**:

- **"Herren"** (ohne Altersklasse) → **tab=2** (Damen/Herren)
- **"Herren 30/40/50"** (mit Altersklasse) → **tab=3** (Senioren)
- **"Damen"** (ohne Altersklasse) → **tab=2** (Damen/Herren)
- **"Damen 30/40/50"** (mit Altersklasse) → **tab=3** (Senioren)

### Betroffene Gruppen

| Gruppe | Liga | Tab-Seite | Altersklasse |
|--------|------|-----------|--------------|
| Gr. 025 | Köln-Leverkusen Winter 2025/2026 Herren 2. Bezirksliga | **tab=2** | Herren (ohne Altersklasse) |
| Gr. 026 | Köln-Leverkusen Winter 2025/2026 Herren 2. Bezirksliga | **tab=2** | Herren (ohne Altersklasse) |
| Gr. 029 | Köln-Leverkusen Winter 2025/2026 Herren 2. Kreisliga | **tab=2** | Herren (ohne Altersklasse) |
| Gr. 035 | 2. Bezirksliga | **tab=3** | Herren 30 (Senioren) |
| Gr. 037 | 1. Kreisliga | **tab=3** | Herren 40 (Senioren) |
| Gr. 041 | 3. Kreisliga 4-er | **tab=3** | Herren 30 (Senioren) |
| Gr. 043 | 1. Bezirksliga | **tab=3** | Herren 40 (Senioren) |

## Lösung

Die Fallback-Logik wurde korrigiert, um die Tab-Seite basierend auf der **Altersklasse** zu bestimmen:

### Vorher:
```javascript
if (league.includes('Köln-Leverkusen')) {
  // Immer tab=3 für Köln-Leverkusen ❌
  leagueUrl = `${baseUrl}&tab=3`;
}
```

### Nachher:
```javascript
if (league.includes('Köln-Leverkusen')) {
  baseUrl = '...?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026';
  
  // Bestimme Tab basierend auf Altersklasse:
  // - "Herren 30", "Herren 40", etc. = Senioren (tab=3)
  // - "Herren" (ohne Altersklasse) = Damen/Herren (tab=2)
  if (/Herren\s+\d+|Damen\s+\d+/.test(league)) {
    tab = 3; // Senioren
  } else {
    tab = 2; // Damen/Herren
  }
  
  leagueUrl = `${baseUrl}&tab=${tab}`; // ✅ Korrekt
}
```

## Implementierte Änderungen

### 1. Frontend: `fetchGroupSnapshot` (SuperAdminDashboard.jsx)
- Prüft, ob Liga "Herren 30/40/50" oder "Damen 30/40/50" enthält
- Verwendet `tab=3` für Senioren-Ligen
- Verwendet `tab=2` für Damen/Herren-Ligen (ohne Altersklasse)

### 2. Backend: `meeting-report` API
- Gleiche Logik implementiert
- Bestimmt Tab-Seite basierend auf Altersklasse im Liga-Namen

## Regex-Pattern

```javascript
/Herren\s+\d+|Damen\s+\d+/.test(league)
```

Dieses Pattern erkennt:
- "Herren 30", "Herren 40", "Herren 50", etc.
- "Damen 30", "Damen 40", "Damen 50", etc.

## Test

Nach dem Fix sollten:
- **Gr. 025, 026, 029** auf **tab=2** gefunden werden
- **Gr. 035, 037, 041, 043** auf **tab=3** gefunden werden

Die betroffenen Gruppen sollten jetzt korrekt importiert werden können.

