# 📋 Plan: Scraper-Integration in Gruppenübersicht

## 🎯 Ziel

Integration des nuLiga-Scrapers in die Gruppenübersicht, um:
- Scraper-Daten gegen aktuelle DB-Daten zu vergleichen
- Unterschiede (fehlende Clubs, Teams, Spieler, Matchdays) anzuzeigen
- Unterschiede klickbar zu machen für einfaches Ergänzen
- Prozentuale Übereinstimmung anzuzeigen
- Solide DB-Speicherung für vorhandene und gescrapte Daten

---

## 📊 Datenstruktur

### 1. Scraper-Daten (aus `/api/import/scrape-nuliga`)
```javascript
{
  groups: [
    {
      group: {
        groupId: "034",
        groupName: "Gr. 034",
        league: "1. Bezirksliga",
        category: "Herren 30",
        season: "Winter 2025/26"
      },
      teamsDetailed: [
        {
          teamName: "TC Viktoria 1",
          clubName: "TC Viktoria",
          category: "Herren 30",
          league: "1. Bezirksliga",
          groupName: "Gr. 034"
        }
      ],
      standings: [...],
      matches: [
        {
          matchNumber: "123",
          homeTeam: "TC Viktoria 1",
          awayTeam: "TC Stammheim 1",
          matchDateIso: "2025-01-15",
          matchPoints: { home: 4, away: 2 },
          status: "completed"
        }
      ]
    }
  ]
}
```

### 2. DB-Daten (aus `team_seasons`, `matchdays`, etc.)
```javascript
{
  category: "Herren 30",
  league: "1. Bezirksliga",
  groupName: "Gr. 034",
  season: "Winter 2025/26",
  teams: [...],
  matchdays: [...]
}
```

---

## 🗄️ DB-Speicherung

### Option A: Temporäre Tabelle für Scraper-Daten (EMPFOHLEN)

**Tabelle: `scraper_snapshots`**
```sql
CREATE TABLE scraper_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL, -- z.B. "Herren 30::1. Bezirksliga::Gr. 034::Winter 2025/26"
  category TEXT,
  league TEXT,
  group_name TEXT,
  season TEXT,
  scraped_data JSONB NOT NULL, -- Vollständige Scraper-Daten
  comparison_result JSONB, -- Vergleichsergebnis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days' -- Auto-Cleanup
);

CREATE INDEX idx_scraper_snapshots_group ON scraper_snapshots(group_id);
CREATE INDEX idx_scraper_snapshots_expires ON scraper_snapshots(expires_at);
```

**Vorteile:**
- Persistente Speicherung für Vergleich
- Auto-Cleanup nach 7 Tagen
- Vergleichsergebnisse können gespeichert werden
- Mehrere Snapshots pro Gruppe möglich

### Option B: In-Memory (State only)

**Nachteile:**
- Daten gehen bei Reload verloren
- Keine Historie
- Keine Vergleichsmöglichkeit über Zeit

**→ Wir verwenden Option A**

---

## 🔄 Vergleichslogik

### Vergleichs-Entity-Typen:

1. **Clubs** (Vereine)
   - Vergleich: Club-Name (normalisiert)
   - Unterschied: Club existiert in nuLiga, aber nicht in DB

2. **Teams** (Mannschaften)
   - Vergleich: Club-Name + Team-Name + Kategorie
   - Unterschied: Team existiert in nuLiga, aber nicht in DB

3. **Players** (Spieler) - optional
   - Vergleich: Name + LK + Team
   - Unterschied: Spieler existiert in nuLiga, aber nicht in DB

4. **Matchdays** (Spieltage)
   - Vergleich: Match-Nummer oder Datum + Teams
   - Unterschied: Match existiert in nuLiga, aber nicht in DB

### Vergleichs-Ergebnis-Struktur:

```javascript
{
  groupKey: "Herren 30::1. Bezirksliga::Gr. 034::Winter 2025/26",
  overallMatch: 85, // Prozentuale Übereinstimmung
  clubs: {
    total: 10,
    matched: 9,
    missing: 1,
    missingItems: [
      {
        scrapedName: "TC Neuer Verein",
        confidence: 0.0,
        action: "create_club"
      }
    ]
  },
  teams: {
    total: 12,
    matched: 11,
    missing: 1,
    missingItems: [
      {
        scrapedName: "TC Viktoria 3",
        scrapedClub: "TC Viktoria",
        confidence: 0.0,
        action: "create_team",
        suggestedClubId: "uuid-here" // Falls Club existiert
      }
    ]
  },
  matchdays: {
    total: 30,
    matched: 28,
    missing: 2,
    missingItems: [
      {
        matchNumber: "456",
        homeTeam: "TC Viktoria 1",
        awayTeam: "TC Stammheim 1",
        matchDate: "2025-01-20",
        action: "create_matchday"
      }
    ]
  }
}
```

---

## 🎨 UI-Komponenten

### 1. Scraper-Button in Gruppen-Detailansicht
- Button: "🔄 Mit nuLiga vergleichen"
- Lädt Scraper-Daten für die ausgewählte Gruppe
- Zeigt Lade-Status

### 2. Vergleichs-Übersicht
- Prozentuale Übereinstimmung (große Zahl, farbkodiert)
- Kategorien: Clubs, Teams, Matchdays
- Für jede Kategorie: Anzahl fehlend, Liste der fehlenden Items

### 3. Unterschiede-Liste
- Klickbare Items für fehlende Daten
- Bei Klick: Modal/Formular zum Erstellen
- Quick-Actions: "Alle fehlenden Teams erstellen"

### 4. Vergleichs-Historie
- Zeigt letzte Scraper-Snapshots
- Vergleich über Zeit möglich

---

## 🔧 Implementierungsschritte

### Schritt 1: DB-Schema erstellen
- [ ] `scraper_snapshots` Tabelle erstellen
- [ ] Indexes hinzufügen
- [ ] RLS Policies (falls nötig)

### Schritt 2: Scraper-Integration in GroupsTab
- [ ] Scraper-State hinzufügen
- [ ] `handleScrapeGroup` Funktion
- [ ] Scraper-Daten für spezifische Gruppe laden

### Schritt 3: Vergleichslogik
- [ ] `compareScrapedWithDatabase` Funktion
- [ ] Club-Vergleich
- [ ] Team-Vergleich
- [ ] Matchday-Vergleich
- [ ] Prozentuale Übereinstimmung berechnen

### Schritt 4: UI-Komponenten
- [ ] Vergleichs-Button in Detailansicht
- [ ] Vergleichs-Übersicht anzeigen
- [ ] Unterschiede-Liste mit klickbaren Items
- [ ] Quick-Actions für Bulk-Import

### Schritt 5: DB-Speicherung
- [ ] Scraper-Snapshot speichern
- [ ] Vergleichs-Ergebnis speichern
- [ ] Auto-Cleanup implementieren

### Schritt 6: Import-Funktionen
- [ ] Fehlende Clubs erstellen
- [ ] Fehlende Teams erstellen
- [ ] Fehlende Matchdays erstellen
- [ ] Bulk-Import für mehrere Items

---

## 📝 Code-Struktur

```
GroupsTab.jsx
├── State
│   ├── scraperData (für ausgewählte Gruppe)
│   ├── comparisonResult
│   ├── scraperLoading
│   └── scraperSnapshot
├── Functions
│   ├── handleScrapeGroup()
│   ├── compareScrapedWithDatabase()
│   ├── saveScraperSnapshot()
│   ├── loadScraperSnapshot()
│   └── handleCreateMissingItem()
└── UI
    ├── Scraper-Button
    ├── Comparison-Overview
    ├── Differences-List
    └── Quick-Actions
```

---

## ✅ Erfolgskriterien

1. ✅ Scraper-Daten können für eine Gruppe geladen werden
2. ✅ Vergleich zeigt prozentuale Übereinstimmung
3. ✅ Unterschiede werden klar angezeigt
4. ✅ Fehlende Items können per Klick erstellt werden
5. ✅ Scraper-Daten werden in DB gespeichert
6. ✅ Vergleichs-Historie ist verfügbar

---

## 🚀 Nächste Schritte

1. DB-Schema erstellen
2. Scraper-Integration starten
3. Vergleichslogik implementieren
4. UI-Komponenten bauen

