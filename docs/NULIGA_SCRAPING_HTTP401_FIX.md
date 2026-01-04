# HTTP 401 Problem beim Meeting-ID Fetching - Lösung

## 🔍 Problem Identifiziert

**Test-Ergebnis mit verbessertem Logging:**

```
MEETING-ID FETCHING:
  ❌ HTTP 401 Fehler (Authentication Required)
  ❌ Content-Type: text/html; charset=utf-8
  ❌ Antwort: HTML-Fehlerseite ('Authentication Required')
```

**Bedeutung:**
- Der `/api/import/scrape-nuliga` Endpoint wird von Vercel blockiert
- Vercel verlangt Authentication für interne API-Calls zwischen Functions
- Gleiches Problem wie bei `/api/import/meeting-report` (bereits behoben)

## ✅ Lösung

**Direkte Integration der Scraping-Logik** (wie bei Schritt 2: Ergebnis-Fetching)

Statt HTTP-Request zu `/api/import/scrape-nuliga`:
- Direkt `scrapeNuLiga()` aus `lib/nuligaScraper.mjs` aufrufen
- Keine HTTP-Requests zwischen Functions
- Umgeht Vercel's Authentication-Anforderung

## 📋 Implementierung

1. **Importiere `scrapeNuLiga` direkt:**
   ```javascript
   // Lazy Load: Lade Module nur wenn benötigt
   async function loadScrapingFunctions() {
     const nuligaScraper = await import('../../lib/nuligaScraper.mjs');
     return nuligaScraper.scrapeNuLiga;
   }
   ```

2. **Rufe `scrapeNuLiga()` direkt auf:**
   ```javascript
   const scrapeNuLiga = await loadScrapingFunctions();
   const { results, unmappedTeams } = await scrapeNuLiga({
     leagueUrl: leagueOverviewUrl,
     seasonLabel: effectiveSeason,
     groupFilter: groupId,
     requestDelayMs: 350,
     teamIdMap: TEAM_ID_MAP,
     supabaseClient: null, // Kein apply-Modus
     applyChanges: false,
     outputDir: null,
     onLog: (...messages) => console.log('[update-meeting-ids]', ...messages)
   });
   ```

3. **Verarbeite Ergebnisse direkt:**
   - Die `results` enthalten die gescrapten Daten
   - Keine JSON-Parsing nötig (direkte JavaScript-Objekte)
   - Keine HTTP-Requests = keine 401 Fehler

## 🎯 Vorteile

- ✅ Keine HTTP 401 Fehler mehr
- ✅ Schneller (keine Netzwerk-Latenz)
- ✅ Zuverlässiger (keine HTTP-Fehler)
- ✅ Konsistent mit Schritt 2 (Ergebnis-Fetching)

