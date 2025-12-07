# 🎾 Konzept: Verbessertes Roster-Import-System

## Problemstellung
Aktuell müssen wir für jedes Team einzeln die Team-Portrait-URL aufrufen, um die Meldeliste zu importieren. Das ist ineffizient, wenn ein Verein mehrere Teams hat.

## Lösung: Vereinsübersichts-Seite nutzen

### Ziel
Eine nuLiga-Seite, die alle Teams eines Vereins mit ihren Meldelisten für eine Saison (z.B. "Winter 2025/2026") übersichtlich anzeigt.

### Vorteile
- ✅ Einmaliger Scrape für alle Teams eines Vereins
- ✅ Automatische Erkennung aller Teams und deren Meldelisten
- ✅ Effizienter als einzelne Team-Portrait-URLs

## Struktur-Analyse (zu analysieren)

### Erwartete Struktur:
```
Vereinsübersichts-Seite
├── Vereins-Info (Name, etc.)
├── Saison-Auswahl (z.B. "Winter 2025/2026")
└── Teams-Liste
    ├── Team 1 (z.B. "Herren 30")
    │   ├── Link zu Team-Portrait
    │   └── Meldeliste (optional direkt sichtbar)
    ├── Team 2 (z.B. "Herren 40")
    │   ├── Link zu Team-Portrait
    │   └── Meldeliste
    └── ...
```

## Implementierungs-Plan

### 1. Neue API-Route: `api/import/parse-club-rosters.js`
- Input: Vereinsübersichts-URL
- Output: Array von Teams mit ihren Meldelisten

### 2. Parsing-Logik
- Extrahiere alle Teams für "Winter 2025/2026"
- Für jedes Team:
  - Extrahiere Team-Portrait-URL
  - Parse Meldeliste (entweder direkt auf der Seite oder über Team-Portrait-URL)
  - Führe Matching mit `players_unified` durch

### 3. Matching-Strategie
- TVM-ID Match (höchste Priorität)
- Exakter Name-Match
- Fuzzy-Matching (80%+ Ähnlichkeit)
- Erstelle neue Spieler in `players_unified` wenn kein Match

### 4. Speicherung
- Speichere alle Meldelisten in `team_roster`
- Verknüpfe mit `players_unified` via `player_id`
- Update `team_seasons.source_url` mit Team-Portrait-URL

## Implementierung

### ✅ Abgeschlossen:
1. ✅ SQL-Migration: `sql/add_club_number_to_team_info.sql` - Fügt `club_number` Spalte zu `team_info` hinzu
2. ✅ API-Route: `api/import/parse-club-rosters.js` - Parst clubPools-Seite und extrahiert Teams + Team-Portrait-URLs
3. ✅ Test-Script: `scripts/test-parse-club-rosters.mjs` - Testet die API-Route

### HTML-Struktur-Analyse:
Die clubPools-Seite hat folgende Struktur:
```html
<h2>Winter 2025/2026</h2>
<a href="/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Herren+40">
  Herren 40
</a>
```

Jeder Team-Link führt zu einer Detail-Seite, auf der die Team-Portrait-URL zu finden ist.

### Club-Nummer Extraktion:
Die Club-Nummer wird direkt aus der URL extrahiert:
- URL: `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154`
- Club-Nummer: `36154`

### Nächste Schritte:
1. ⏳ SQL-Migration ausführen (via MCP oder Supabase Dashboard)
2. ⏳ API-Route testen
3. ⏳ Integration in SuperAdmin Dashboard (neuer Tab oder Erweiterung)
4. ⏳ Automatisches Importieren aller Meldelisten für einen Verein

