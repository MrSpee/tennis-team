# Fix: Automatischer Import für ältere Matches

## Problem

Der automatische Import hat **nur Matches der letzten 4 Tage** versucht zu importieren. Matches, die älter als 4 Tage waren, wurden **übersprungen**, auch wenn sie noch nie versucht wurden.

### Beispiel
- **Spiel**: TC Lese GW Köln 2 vs. TTC Brauweiler 1
- **Datum**: 15.11.2025
- **Heute**: 23.11.2025 (8 Tage später)
- **Meeting ID**: 12504653 ✅
- **Ergebnisse in nuLiga**: Verfügbar ✅
- **Import-Versuche**: 0 ❌
- **Problem**: Spiel ist 8 Tage alt → wurde nie versucht zu importieren

## Lösung

Die Logik in `findMatchdaysForAutoImport` wurde angepasst:

### Vorher:
```javascript
// Nur Matches der letzten 4 Tage
.gte('match_date', fourDaysAgo.toISOString())

// Überspringe alle Matches älter als 4 Tage
if (daysSinceMatch > 4) {
  continue; // ❌ Wird nie versucht
}
```

### Nachher:
```javascript
// Erweitere auf 30 Tage zurück
.gte('match_date', thirtyDaysAgo.toISOString())

// Versuche auch ältere Matches, wenn sie noch nie versucht wurden
if (daysSinceMatch > 4) {
  if (attemptCount > 0) {
    // Bereits versucht, aber älter als 4 Tage - überspringe
    continue;
  }
  // Noch nie versucht, auch wenn älter als 4 Tage - versuche es! ✅
}
```

## Neue Logik

1. **Matches der letzten 4 Tage**: Werden täglich versucht (max. 4 Versuche)
2. **Matches älter als 4 Tage**: Werden nur versucht, wenn sie **noch nie versucht wurden** (attemptCount === 0)
3. **Matches mit 4+ Versuchen**: Werden übersprungen (Warnung wird angezeigt)

## Vorteile

- ✅ Ältere Matches werden erfasst, wenn sie noch nie versucht wurden
- ✅ Verhindert unnötige Versuche für bereits fehlgeschlagene Imports
- ✅ Behält die 4-Tage-Regel für regelmäßige Imports bei
- ✅ Zeigt Warnung für Matches, die nach 4 Versuchen noch keine Ergebnisse haben

## Test

Nach dem Fix sollte der automatische Import auch das Beispiel-Spiel (8 Tage alt, 0 Versuche) beim nächsten Dashboard-Load versuchen zu importieren.

