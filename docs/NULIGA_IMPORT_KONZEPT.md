# Neues nuLiga Import-Konzept für Gruppen

## Problem-Analyse

Die aktuelle Implementierung ist zu komplex und fehleranfällig:
- Komplexe Vergleichslogik mit vielen Edge Cases
- Team-Matching ist fehleranfällig (Kategorie-Probleme)
- Match-Matching hat zu viele Strategien
- Inkonsistente Datenstrukturen

## Neues Konzept: Einfach und Robust

### 1. Datenstruktur aus nuLiga (klar definiert)

```javascript
{
  group: {
    groupId: "34",           // Eindeutige Gruppen-ID
    groupName: "Gr. 034",    // Anzeigename
    category: "Herren 30",   // Kategorie (aus Header)
    league: "1. Bezirksliga", // Liga
    season: "Winter 2025/26"  // Saison
  },
  teams: [
    {
      clubName: "TC Colonius",
      teamSuffix: "1",
      category: "Herren 30",  // IMMER aus Group
      teamName: "TC Colonius 1" // Vollständiger Name
    }
  ],
  matches: [
    {
      matchNumber: "416",        // EINDEUTIG in Gruppe! Primärer Schlüssel
      matchDateIso: "2025-10-12T10:00:00Z",
      startTime: "10:00",
      homeTeam: "TC Viktoria 1",
      awayTeam: "TC Colonius 1",
      venue: "TC Viktoria",
      court_number: 1,
      status: "completed",
      matchPoints: { home: 5, away: 1 },
      meetingId: "12345",        // Für match_results Import
      meetingReportUrl: "..."
    }
  ]
}
```

### 2. Matching-Strategien (Priorität)

#### Match-Matching (EINFACH):
1. **Primär: `match_number`** (eindeutig in Gruppe!)
   - Wenn `match_number` vorhanden → direktes Matching
   - Keine weiteren Strategien nötig
   
2. **Fallback: `match_number` + Datum** (nur wenn match_number fehlt)
   - Kombination aus match_number und Datum
   
3. **Letzter Fallback: Datum + Teams** (nur wenn match_number komplett fehlt)
   - Nur wenn Teams eindeutig identifizierbar sind

#### Team-Matching (ROBUST):
1. **Club-Name normalisiert** (case-insensitive, ohne Sonderzeichen)
2. **Team-Suffix** (z.B. "1", "2", "III")
3. **Kategorie** (IMMER aus Group-Kontext!)
   - WICHTIG: Kategorie kommt IMMER aus der Group, nicht aus dem Team-Namen

### 3. Import-Flow (EINFACH)

```
1. Scrape nuLiga-Daten für Gruppe
   ↓
2. Automatisch fehlende Clubs erstellen
   ↓
3. Automatisch fehlende Teams erstellen (mit Kategorie aus Group!)
   ↓
4. Team-Seasons sicherstellen (für alle Teams in Gruppe)
   ↓
5. Matches importieren (basierend auf match_number)
   - Wenn match_number existiert → Update oder Insert
   - Wenn match_number fehlt → Warnung, aber trotzdem importieren
   ↓
6. Match-Results importieren (wenn meetingId vorhanden)
```

### 4. Implementierung

#### Schritt 1: Vereinfachte Vergleichslogik
- Entferne komplexe Vergleichslogik
- Fokus auf: Was fehlt? Was muss erstellt werden?

#### Schritt 2: Automatisches Erstellen
- Clubs: Automatisch erstellen wenn nicht vorhanden
- Teams: Automatisch erstellen mit Kategorie aus Group
- Team-Seasons: Automatisch erstellen für alle Teams

#### Schritt 3: Match-Import
- Primär über `match_number` (eindeutig!)
- Automatisches Upsert (Update wenn vorhanden, Insert wenn neu)
- Keine komplexe Matching-Logik

#### Schritt 4: Match-Results Import
- Automatisch wenn `meetingId` vorhanden
- Über bestehenden `/api/import/meeting-report` Endpoint

### 5. Fehlerbehandlung

- **Fehlende Teams:** Automatisch erstellen (mit Kategorie)
- **Fehlende Clubs:** Automatisch erstellen
- **Fehlende match_number:** Warnung, aber trotzdem importieren
- **Kategorie-Mismatch:** Automatisch korrigieren (Team mit richtiger Kategorie erstellen)

### 6. Vorteile

✅ **Einfach:** Klare Datenstruktur, klare Logik
✅ **Robust:** match_number als primärer Schlüssel
✅ **Automatisch:** Keine manuelle Zuordnung nötig
✅ **Konsistent:** Kategorie immer aus Group-Kontext
✅ **Wartbar:** Weniger Code, weniger Edge Cases

