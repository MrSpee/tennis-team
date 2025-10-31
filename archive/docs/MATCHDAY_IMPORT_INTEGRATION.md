# Matchday Import System - Integration Guide

## Überblick

Das neue KI-gestützte Import-System für Medenspiel-Übersichten bietet:
- ✅ Automatisches Erkennen von Verein, Mannschaft, Liga, Spieltagen
- ✅ Fuzzy Matching mit Confidence Scores
- ✅ Review-Workflow vor dem Commit
- ✅ Idempotenz (keine Duplikate bei Re-Import)
- ✅ Vollständig editierbar

## Setup

### 1. Datenbank-Struktur erstellen

```sql
-- Führe aus in Supabase SQL Editor:
\i tennis-team/CREATE_MATCHDAY_IMPORT_SYSTEM.sql
```

Dies erstellt:
- `import_sessions` - Import-Vorgänge
- `import_entities` - Erkannte Entitäten (Club, Team, Liga, Season)
- `import_fixtures` - Erkannte Spieltage
- `import_logs` - Audit Trail
- `alias_mappings` - Lernsystem für Aliasse

### 2. Integration in ImportTab

Der bestehende `ImportTab.jsx` kann erweitert werden, um das neue System zu nutzen:

```jsx
import MatchdayImportService from '../services/matchdayImportService';
import MatchdayImportReview from './MatchdayImportReview';

// Im ImportTab:
const handleMatchdayImport = async () => {
  // 1. Erstelle Session
  const session = await MatchdayImportService.createImportSession(
    inputText,
    'text',
    player?.id
  );
  
  // 2. Parse mit KI
  const parsed = await MatchdayImportService.parseMatchdayInput(
    inputText,
    session.id
  );
  
  // 3. Context speichern
  await supabase
    .from('import_sessions')
    .update({ context_normalized: parsed.team_info })
    .eq('id', session.id);
  
  // 4. Entity Matching
  const entities = await MatchdayImportService.performEntityMatching(
    session.id,
    parsed
  );
  
  // 5. Fixture Matching
  const fixtures = await MatchdayImportService.createImportFixtures(
    session.id,
    parsed.matches,
    entities
  );
  
  // 6. Zeige Review-UI
  setShowReview(true);
  setReviewSessionId(session.id);
};
```

### 3. Workflow

```
1. User kopiert Medenspiel-Übersicht
   ↓
2. KI-Parser extrahiert:
   - Verein (SV Rot-Gelb Sürth)
   - Mannschaft (Herren 40 1)
   - Liga (1. Kreisliga Gr. 046)
   - Spieltage (Datum, Heim, Gast, Ergebnis)
   ↓
3. Fuzzy Matching:
   - Club: "SV RG Sürth" → "SV Rot-Gelb Sürth" (96%)
   - Team: "Herren 40 1" → Team-ID (94%)
   - Liga: Normalisierung & Group-Match (88%)
   ↓
4. Review-UI:
   - Alle Entitäten editierbar
   - Alle Fixtures editierbar
   - Validation (Fehler/Warnungen)
   ↓
5. Commit:
   - Erstellt/Updates Matchdays
   - Idempotenz-Check (keine Duplikate)
   - Audit Log
```

## Verwendung

### Beispiel-Input

```
SV Rot-Gelb Sürth
Stadt Köln
Auf dem Breiten Feld 25
50997 Köln
https://www.rotgelbsuerth.de/

Mannschaftsführer
Becher Daniel (01725305246)

Herren 40 1. Kreisliga Gr. 046
Herren 40 1 (4er)
Tabelle    Spielplan    Meldeliste

Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
05.10.2025, 14:00	TG Leverkusen	TG Leverkusen 2	SV RG Sürth 1	1:5	3:10	42:63	Spielbericht
20.12.2025, 17:00	Tennishalle Köln-Rath	TV Ensen Westhoven 1	SV RG Sürth 1	0:0	0:0	0:0	offen
07.03.2026, 18:00	Marienburger SC	SV RG Sürth 1	TC Colonius 3	0:0	0:0	0:0	offen
21.03.2026, 18:00	Marienburger SC	SV RG Sürth 1	TC Ford Köln 2	0:0	0:0	0:0	offen
```

### Was wird erkannt:

1. **Verein**: "SV Rot-Gelb Sürth"
   - Fuzzy Match mit "SV RG Sürth" (Alias)
   - Match Score: 96%

2. **Mannschaft**: "Herren 40 1"
   - Match mit Team-ID aus `team_info`
   - Match Score: 94%

3. **Liga**: "Herren 40 1. Kreisliga Gr. 046"
   - Category: "Herren 40"
   - Class: "1. Kreisliga"
   - Group: "046"

4. **Saison**: "Winter 2025/26" (auto-erkannnt aus Datum)

5. **Spieltage**: 4 Fixtures
   - Datum/Zeit geparst
   - Heim/Gast-Teams erkannt
   - Ergebnisse extrahiert (falls vorhanden)

## API

### Service-Methoden

```javascript
// Session erstellen
const session = await MatchdayImportService.createImportSession(
  rawText,
  'text',
  userId
);

// Input parsen (nutzt bestehenden Parser)
const parsed = await MatchdayImportService.parseMatchdayInput(
  text,
  sessionId
);

// Entity Matching
const entities = await MatchdayImportService.performEntityMatching(
  sessionId,
  parsedData
);

// Fixtures erstellen
const fixtures = await MatchdayImportService.createImportFixtures(
  sessionId,
  matches,
  entities
);

// Session laden
const data = await MatchdayImportService.loadImportSession(sessionId);

// Fuzzy Matching (direkt nutzbar)
const clubMatch = await MatchdayImportService.matchClub('SV RG Sürth');
const teamMatch = await MatchdayImportService.matchTeam('Herren 40 1', clubId, 'Herren 40');
const leagueMatch = await MatchdayImportService.matchLeague('1. Kreisliga', 'Herren 40', '046');
```

## Komponenten

### MatchdayImportReview

Haupt-Review-Komponente:

```jsx
<MatchdayImportReview
  sessionId={sessionId}
  onComplete={(matchdays) => {
    console.log('Importiert:', matchdays);
    navigate('/matches');
  }}
  onCancel={() => setShowReview(false)}
/>
```

**Features:**
- Entity Editing (Club, Team, Liga)
- Fixture Editing (Datum, Teams, Ergebnisse)
- Autocomplete-Suche für Clubs/Teams
- Validation mit Fehler/Warnungen
- Commit-Button (disabled bei Fehlern)

## Fuzzy Matching Details

### Thresholds

- **Club**: ≥ 92% = Auto, 80-92% = Review, < 80% = Manual
- **Team**: ≥ 85% = Auto, 70-85% = Review, < 70% = Manual
- **Liga**: ≥ 80% = Auto, 60-80% = Review, < 60% = Manual

### Matching-Algorithmen

1. **Jaro-Winkler**: String-Ähnlichkeit (40% Gewicht)
2. **Token Set Ratio**: Multi-Word Matching (30% Gewicht)
3. **Kölner Phonetik**: Für Namensvarianten (20% Gewicht)
4. **Alias-Mappings**: Gelernte Zuordnungen (10% Gewicht)

### Normalisierung

- Umlaute: ä→ae, ö→oe, ü→ue, ß→ss
- Sonderzeichen entfernt
- Mehrfachspaces → Single Space
- Stoppwörter entfernt (e.V., TC, SV, etc.)

## Idempotenz

Der Import ist idempotent durch:

1. **Natural Keys für Matchdays**:
   - `league_id + season_id + match_date + home_team_id + away_team_id`

2. **Conflict-Handling**:
   - Upsert-Logik in Commit-Funktion
   - Prüft Existenz vor Insert

3. **Session-Tracking**:
   - Jeder Import erhält eindeutige `session_id`
   - Re-Import erstellt neue Session (keine Duplikate)

## Testing

### Test-Input

```bash
# Beispiel-Test (in Supabase SQL Editor oder via API)
INSERT INTO import_sessions (source_type, raw_payload, status)
VALUES ('text', 'SV Rot-Gelb Sürth\n...', 'draft');
```

### Validierung

```sql
-- Prüfe Import-Session
SELECT * FROM import_session_overview
WHERE id = 'session-id';

-- Prüfe Entities
SELECT * FROM import_entities
WHERE session_id = 'session-id';

-- Prüfe Fixtures
SELECT * FROM import_fixtures
WHERE session_id = 'session-id'
ORDER BY row_order;
```

## Troubleshooting

### Problem: Club wird nicht erkannt

**Lösung:**
1. Prüfe `alias_mappings` Tabelle
2. Füge manuell Alias hinzu:
```sql
INSERT INTO alias_mappings (entity_type, raw_alias, normalized_name, mapped_to_id)
VALUES ('club', 'SV RG Sürth', 'SV Rot-Gelb Sürth', 'club-id');
```

### Problem: Fixtures fehlen nach Commit

**Lösung:**
1. Prüfe `import_logs` für Fehler
2. Validiere Team-IDs in `import_fixtures`
3. Prüfe Konsistenz: Alle Teams müssen existieren

### Problem: Duplikate trotz Idempotenz

**Lösung:**
```sql
-- Finde Duplikate
SELECT 
  home_team_id,
  away_team_id,
  match_date,
  COUNT(*) as count
FROM matchdays
GROUP BY home_team_id, away_team_id, match_date
HAVING COUNT(*) > 1;
```

## Nächste Schritte

1. ✅ **Datenbank-Schema** - Erstellt
2. ✅ **Fuzzy Matching** - Implementiert
3. ✅ **Review-UI** - Implementiert
4. ⏳ **Parser-Integration** - Nutzt bestehenden Parser
5. ⏳ **Idempotenz-Tests** - Validierung nötig
6. ⏳ **Alias-Learning** - Automatisches Lernen aus Manuellen Zuordnungen

## Beispiel-Workflow (Code)

```javascript
// Vollständiger Import-Workflow
const importMatchdays = async (inputText, userId) => {
  try {
    // 1. Session erstellen
    const session = await MatchdayImportService.createImportSession(
      inputText,
      'text',
      userId
    );
    
    // 2. Parse
    const parsed = await MatchdayImportService.parseMatchdayInput(inputText, session.id);
    
    // 3. Matching
    await supabase
      .from('import_sessions')
      .update({ context_normalized: parsed.team_info })
      .eq('id', session.id);
    
    const entities = await MatchdayImportService.performEntityMatching(
      session.id,
      parsed
    );
    
    const fixtures = await MatchdayImportService.createImportFixtures(
      session.id,
      parsed.matches,
      entities
    );
    
    // 4. Zeige Review
    return { sessionId: session.id, entities, fixtures };
    
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
};
```


