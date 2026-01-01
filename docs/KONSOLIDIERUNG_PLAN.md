# 📋 Plan: Konsolidierung der Import-Tabs im SuperAdmin Dashboard

## 🔍 Aktuelle Situation

### Bestehende Import-Tabs:
1. **"Import-Tools"** (`ImportTab`)
   - Funktion: Matchday-Import (Spieltage aus Text)
   - API: `/api/import/parse-matches`
   - Nutzung: OpenAI-basiertes Parsing

2. **"Team-Portrait"** (`TeamPortraitImportTab`)
   - Funktion: Team-Portrait-Import (Spieler-Statistiken, Matches)
   - API: `/api/import/team-portrait`
   - Nutzung: nuLiga teamPortrait-Seite scrapen

3. **"Meldelisten"** (`ClubRostersTab`)
   - Funktion: Meldelisten-Import (Club-Roster)
   - API: `/api/import/parse-club-rosters` (alte API)
   - Neue API: `/api/import/nuliga-club-import` (noch nicht deployed)

### Neue APIs (sollten alte ersetzen):
- **`nuliga-club-import`**: Ersetzt `parse-club-rosters`, `parse-team-roster`
  - Actions: `club-info`, `teams`, `roster`
  
- **`nuliga-matches-import`**: Soll `parse-matches`, `scrape-nuliga` ersetzen
  - Actions: `league-groups`, `group-details`, `match-results`

---

## 🎯 Ziel: Konsolidierter "nuLiga Import" Tab

### Struktur:
Ein einziger Tab mit **Unter-Tabs/Sektionen** für verschiedene Import-Typen:

```
📥 nuLiga Import
├── 📋 Meldelisten (Club-Roster)
│   ├── Club-Info laden
│   ├── Teams auflisten  
│   └── Meldelisten importieren
│
├── 🏆 Match-Ergebnisse (Liga-Gruppen)
│   ├── Liga-Gruppen auflisten
│   ├── Gruppen-Details laden
│   └── Match-Ergebnisse importieren
│
├── 👥 Team-Portrait
│   ├── Team-Portrait-URL eingeben
│   └── Spieler-Statistiken & Matches importieren
│
└── 📝 Matchday-Import (Text)
    ├── Text/URL eingeben
    └── KI-basiertes Parsing & Import
```

---

## 📝 Vorgehen

### Schritt 1: Neue Komponente erstellen
- **Datei**: `src/components/superadmin/NuLigaImportTab.jsx`
- **Struktur**: Tab-Navigation innerhalb der Komponente
- **Sektionen**:
  1. `club-rosters` - Meldelisten-Import
  2. `matches` - Match-Ergebnisse (neu)
  3. `team-portrait` - Team-Portrait-Import
  4. `matchdays` - Matchday-Text-Import (optional, könnte auch separat bleiben)

### Schritt 2: Bestehende Komponenten als Unter-Komponenten nutzen
- `ClubRostersTab` → Wird zu Sektion "Meldelisten"
- `TeamPortraitImportTab` → Wird zu Sektion "Team-Portrait"
- `ImportTab` → Bleibt separat ODER wird zu Sektion "Matchdays"

### Schritt 3: Neue APIs integrieren
- `nuliga-club-import` für Meldelisten
- `nuliga-matches-import` für Match-Ergebnisse (neu!)
- Fallback zu alten APIs wenn neue noch nicht deployed

### Schritt 4: SuperAdminDashboard anpassen
- Neuen Tab "nuLiga Import" hinzufügen
- Alte Tabs entfernen (oder als deprecated markieren)

---

## 🤔 Entscheidungen nötig

1. **Matchday-Import**: Soll `ImportTab` (Text-Import mit OpenAI) in den konsolidierten Tab integriert werden, oder separat bleiben?
   - **Empfehlung**: Separat lassen, da es ein anderer Workflow ist (KI-basiert vs. nuLiga-Scraping)

2. **Reihenfolge der Umsetzung**:
   - Option A: Erst neuen Tab erstellen, dann schrittweise migrieren
   - Option B: Komplett neu entwickeln mit allen Funktionen
   - **Empfehlung**: Option A (schrittweise Migration)

3. **Namensgebung**:
   - "nuLiga Import" oder "Import Tools"?
   - **Empfehlung**: "nuLiga Import" (klarer, spezifischer)

---

## 🚀 Nächste Schritte

1. ✅ **Analyse abgeschlossen** - Bestehende Tabs identifiziert
2. ⏳ **Plan erstellt** - Siehe oben
3. ⏳ **Entscheidungen treffen** - Warte auf User-Feedback
4. ⏳ **Implementierung starten** - Neue Komponente erstellen

