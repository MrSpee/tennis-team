# Fix: find-club-numbers Timeout-Problem

## Problem
Die `find-club-numbers` API überschreitet das Vercel Timeout (10 Sekunden auf Hobby Plan), wenn mehrere Vereine gleichzeitig verarbeitet werden sollen.

**Ursache:**
- Jede Suche dauert 3-5 Sekunden
- Delay zwischen Requests: 10-15 Sekunden (um nicht als Bot erkannt zu werden)
- Bei mehreren Vereinen: `n * (3-5 + 10-15) Sekunden` = schnell > 10 Sekunden

## Lösung

### Implementiert: Limit pro Request
- **Max 1 Verein pro Request** - verhindert Timeout
- Klare Fehlermeldung, wenn zu viele Vereine ausgewählt wurden
- Reduziertes Delay (3-5 Sekunden statt 10-15) für bessere Performance

### Alternative Lösungen (nicht implementiert)

1. **Batch-Processing mit frühem Response**
   - Startet Verarbeitung
   - Gibt sofort Response zurück mit Job-ID
   - Frontend pollt Status
   - Komplexer, benötigt Job-Queue

2. **Parallele Verarbeitung**
   - Alle Vereine parallel suchen
   - Schneller, aber riskiert Rate-Limiting bei nuLiga
   - Nicht empfohlen

3. **Vercel Pro Plan**
   - 60 Sekunden Timeout statt 10 Sekunden
   - Kostet Geld, aber löst das Problem

## Aktuelle Implementierung

```javascript
const MAX_CLUBS_PER_REQUEST = 1;

if (clubs.length > MAX_CLUBS_PER_REQUEST) {
  return withCors(res, 400, {
    success: false,
    error: 'Zu viele Vereine ausgewählt',
    message: `Bitte wähle maximal ${MAX_CLUBS_PER_REQUEST} Verein(e) pro Request aus.`,
    maxClubsPerRequest: MAX_CLUBS_PER_REQUEST,
    selectedClubs: clubs.length
  });
}
```

## Frontend-Anpassung

Das Frontend sollte:
- Nur 1 Verein gleichzeitig verarbeiten
- Oder: Vereine einzeln nacheinander verarbeiten
- Progress-Tracking zeigen
- Automatisch nächsten Verein verarbeiten, wenn vorheriger fertig ist

## Zukünftige Verbesserungen

- **Batch-Processing**: Asynchrone Verarbeitung mit Job-Queue
- **Progress-Tracking**: WebSocket oder Polling für Status-Updates
- **Smart Batching**: Gruppiert Vereine in intelligente Batches

