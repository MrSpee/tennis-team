# Cron-Job Testing Guide

## Lokales Testing

### Option 1: Mit Vercel Dev (Empfohlen)

```bash
# Starte Vercel Dev Server
npm run dev:api

# In einem neuen Terminal: Teste den Cron-Job
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Content-Type: application/json"
```

**Wichtig**: Der Cron-Job nutzt interne API-Calls zu `/api/import/scrape-nuliga`. Diese müssen verfügbar sein.

### Option 2: Direkt mit Node.js (nur Syntax-Check)

```bash
# Prüfe Syntax
node -c api/cron/update-meeting-ids.js
```

### Option 3: Mit Environment Variables

```bash
# Setze Environment Variables für lokales Testing
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export ADMIN_EMAIL="your-email@example.com"  # Optional
export CRON_SECRET="test-secret"  # Optional

# Teste mit Secret
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json"
```

## Production Testing (Vercel)

### Manueller Test nach Deployment

```bash
# Nach Deployment auf Vercel
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Wichtig**: 
- Setze `CRON_SECRET` als Environment Variable in Vercel
- Oder teste ohne Secret (wird nur eine Warnung loggen)

### Automatischer Test (via Vercel Cron)

Der Cron-Job läuft automatisch alle 2 Tage um 14:00 UTC. Prüfe die Logs in Vercel Dashboard:

1. Gehe zu **Vercel Dashboard** → Dein Projekt
2. **Logs** → Filter nach `/api/cron/update-meeting-ids`
3. Prüfe die Ausgabe für Fehler oder Erfolgsmeldungen

## Erwartete Response

### Success Response
```json
{
  "success": true,
  "summary": {
    "startTime": "2025-01-03T14:00:00.000Z",
    "endTime": "2025-01-03T14:02:30.500Z",
    "durationMs": 150500,
    "totalProcessed": 25,
    "updated": 18,
    "failed": 5,
    "skipped": 2,
    "message": "18 meeting_ids aktualisiert, 5 fehlgeschlagen, 2 übersprungen",
    "errors": [...]
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Fehler beim Laden der Matchdays: ..."
}
```

## Häufige Probleme

### 1. "SUPABASE_URL fehlt in den Umgebungsvariablen"
**Lösung**: Setze `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` als Environment Variables in Vercel

### 2. "Fehler beim Laden der Matchdays"
**Lösung**: Prüfe ob die Datenbank erreichbar ist und die Tabelle `matchdays` existiert

### 3. "Scrape-Antwort konnte nicht geparst werden"
**Lösung**: Prüfe ob `/api/import/scrape-nuliga` funktioniert (kann nuLiga nicht erreichbar sein)

### 4. "Keine Matchdays ohne meeting_id gefunden"
**Lösung**: Das ist normal - der Cron-Job hat nichts zu tun. Teste mit Matchdays die noch keine meeting_id haben.

## Debugging

### Console Logs prüfen

Der Cron-Job loggt ausführlich:
- `[update-meeting-ids] 🚀 Cron Job gestartet`
- `[update-meeting-ids] 🔍 Verarbeite X Matchdays...`
- `[update-meeting-ids] ✅ meeting_id XXX für Matchday YYY aktualisiert`
- `[update-meeting-ids] ❌ Fehler: ...`
- `[update-meeting-ids] 📊 Cron Job Zusammenfassung: ...`

### Vercel Logs

1. **Vercel Dashboard** → Dein Projekt → **Logs**
2. Filter: `/api/cron/update-meeting-ids`
3. Prüfe die Logs für Fehler oder Warnungen

### Lokale Logs (mit vercel dev)

```bash
npm run dev:api
# Logs erscheinen im Terminal
```

## Test-Datenbank vorbereiten

Für besseres Testing kannst du Test-Matchdays erstellen:

```sql
-- Finde Matchdays ohne meeting_id
SELECT id, match_date, group_name, league, home_team_id, away_team_id
FROM matchdays
WHERE meeting_id IS NULL
  AND match_date < CURRENT_DATE
  AND status != 'cancelled'
  AND status != 'postponed'
ORDER BY match_date DESC
LIMIT 10;
```

## Nächste Schritte nach Testing

1. ✅ Prüfe ob der Cron-Job grundsätzlich funktioniert
2. ✅ Prüfe ob meeting_ids korrekt aktualisiert werden
3. ✅ Prüfe ob Fehler korrekt geloggt werden
4. ⏳ Implementiere Email-Versand (wenn gewünscht)
5. ⏳ Implementiere Datenbank-Logging (wenn gewünscht)

