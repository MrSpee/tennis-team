# Automatischer Import von Match-Ergebnissen

## Übersicht

Dieses Dokument beschreibt die drei implementierten Lösungen für den automatischen Import von Match-Ergebnissen:

1. **Empfehlung 1**: Script zum Import fehlender Ergebnisse für Spieltage mit `meeting_id`
2. **Empfehlung 2**: Script zum Finden fehlender `meeting_id`s
3. **Empfehlung 3**: Automatischer Service im Dashboard

---

## Empfehlung 1: Import fehlender Match-Ergebnisse

### Script: `scripts/import_missing_match_results.mjs`

**Zweck**: Importiert Ergebnisse für alle vergangenen Spieltage, die eine `meeting_id` haben, aber noch keine detaillierten Ergebnisse.

**Verwendung**:
```bash
node scripts/import_missing_match_results.mjs
```

**Was es tut**:
1. Findet alle vergangenen Spieltage mit `meeting_id` aber ohne `match_results`
2. Ruft für jeden Spieltag den `/api/import/meeting-report` Endpoint auf
3. Importiert die Ergebnisse in die Datenbank

**Konfiguration**:
- `API_BASE_URL`: Standardmäßig `http://localhost:3000` (lokal) oder Production-URL
- Kann über Umgebungsvariable `VITE_API_BASE_URL` gesetzt werden

**Ausgabe**:
- Zeigt eine Zusammenfassung: Erfolgreich, Übersprungen (nicht verfügbar), Fehlgeschlagen
- Listet Fehler-Details auf

**Beispiel-Output**:
```
📊 ZUSAMMENFASSUNG:

   Gesamt: 52
   ✅ Erfolgreich: 45
   ⚠️  Übersprungen (nicht verfügbar): 5
   ❌ Fehlgeschlagen: 2
```

---

## Empfehlung 2: Finden fehlender Meeting IDs

### Script: `scripts/find_missing_meeting_ids.mjs`

**Zweck**: Versucht, `meeting_id`s für Spieltage ohne `meeting_id` zu finden.

**Status**: ⚠️ **Noch nicht vollständig implementiert**

**Was noch fehlt**:
- Die richtige `leagueUrl` für jede Season/League zu finden
- Das Scrapen der Gruppe aus nuLiga
- Das Finden des Matches basierend auf Teams und Datum
- Die Extraktion der `meeting_id`

**Alternative**: Nutze das bereits existierende Script `scripts/fix_missing_meeting_ids.mjs`, das ähnliche Funktionalität bietet.

---

## Empfehlung 3: Automatischer Service im Dashboard

### Service: `src/services/autoMatchResultImportService.js`

**Zweck**: Automatischer Import von Match-Ergebnissen im Hintergrund.

**Integration**: Wurde in `src/components/Dashboard.jsx` integriert.

**Funktionsweise**:
1. **Beim Laden des Dashboards**: Führt sofort einen Import durch (max. 5 Spieltage)
2. **Regelmäßig**: Alle 60 Minuten wird automatisch ein Import durchgeführt

**Konfiguration** (in `Dashboard.jsx`):
```javascript
runAutoImport(supabase, { 
  maxImports: 5, // Max. 5 Spieltage pro Durchlauf
  delayBetweenImports: 2000 // 2 Sekunden Pause zwischen Imports
});
```

**Was wird importiert**:
- Nur Spieltage mit `status='completed'`
- Nur Spieltage mit `meeting_id` (nicht NULL)
- Nur vergangene Spieltage (`match_date < NOW()`)
- Nur Spieltage ohne bereits vorhandene Ergebnisse

**Logging**:
- Alle Aktionen werden in der Browser-Konsole geloggt
- Format: `[autoMatchResultImport]` oder `[Dashboard]`

**Fehlerbehandlung**:
- Fehler werden geloggt, aber stoppen den Prozess nicht
- Meeting-Reports, die nicht verfügbar sind (404), werden übersprungen

---

## API-Endpoint

### `/api/import/meeting-report`

**Methode**: `POST`

**Request Body**:
```json
{
  "meetingId": "12500118",
  "matchdayId": "uuid-des-spieltages",
  "homeTeam": "TC Ford Köln 2",
  "awayTeam": "TC RW Porz 2",
  "apply": true
}
```

**Response (Success)**:
```json
{
  "success": true,
  "applied": true,
  "meetingId": "12500118",
  "applyResult": {
    "inserted": [...],
    "deleted": 6,
    "missingPlayers": []
  }
}
```

**Response (Meeting nicht verfügbar)**:
```json
{
  "success": false,
  "errorCode": "MEETING_NOT_FOUND",
  "error": "Meeting-Report konnte nicht gefunden werden"
}
```

---

## Statistik

### Aktuelle Situation (Stand: 2025-01-24)

- **594 Spieltage** insgesamt
- **82 Spieltage** haben detaillierte Ergebnisse (13.80%)
- **512 Spieltage** haben keine detaillierten Ergebnisse (86.20%)

**Vergangene Spieltage (150)**:
- ✅ **82 Spieltage** mit Ergebnissen (54.67%)
- ❌ **68 Spieltage** ohne Ergebnisse (45.33%)
  - **52 davon** haben eine `meeting_id` → können importiert werden
  - **16 davon** haben keine `meeting_id` → müssen manuell gepflegt werden

**Zukünftige Spieltage (444)**:
- Alle ohne Ergebnisse (erwartet)

---

## Empfohlene Workflows

### 1. Einmaliger Import aller fehlenden Ergebnisse

```bash
# Führe das Script aus
node scripts/import_missing_match_results.mjs
```

### 2. Regelmäßiger automatischer Import

Der automatische Service im Dashboard läuft bereits:
- Beim Laden des Dashboards (max. 5 Spieltage)
- Alle 60 Minuten (max. 5 Spieltage pro Durchlauf)

### 3. Manueller Import über SuperAdmin Dashboard

Im SuperAdmin Dashboard kann manuell ein Import für einzelne Spieltage durchgeführt werden.

---

## Troubleshooting

### Problem: "Meeting-Report nicht verfügbar"

**Ursache**: Der Meeting-Report ist noch nicht in nuLiga verfügbar oder wurde entfernt.

**Lösung**: 
- Warte einige Stunden/Tage, bis der Report verfügbar ist
- Prüfe manuell in nuLiga, ob der Report existiert

### Problem: "API nicht erreichbar"

**Ursache**: Die API-URL ist falsch konfiguriert.

**Lösung**:
- Setze `VITE_API_BASE_URL` in der `.env` Datei
- Für lokale Entwicklung: `http://localhost:3000`
- Für Production: `https://tennis-team-gamma.vercel.app`

### Problem: "Zu viele API-Aufrufe"

**Ursache**: Das Script ruft die API zu schnell auf.

**Lösung**:
- Erhöhe `delayBetweenImports` im Script
- Reduziere `maxImports` pro Durchlauf

---

## Zukünftige Verbesserungen

1. **Empfehlung 2 vollständig implementieren**:
   - Automatische Suche nach `meeting_id`s für Spieltage ohne `meeting_id`
   - Integration mit `scraper_snapshots` für gespeicherte `leagueUrl`s

2. **Erweiterte Fehlerbehandlung**:
   - Retry-Logik für fehlgeschlagene Imports
   - Benachrichtigungen bei kritischen Fehlern

3. **Monitoring**:
   - Dashboard mit Statistiken über Import-Status
   - Warnungen bei vielen fehlenden Ergebnissen

4. **Scheduling**:
   - Optional: Cron-Job für regelmäßigen Import (z.B. täglich um 2 Uhr morgens)
   - Integration mit Vercel Cron Jobs

---

## Changelog

- **2025-01-24**: Initiale Implementierung aller drei Empfehlungen
- **2025-01-24**: Integration des Auto-Import-Services in Dashboard

