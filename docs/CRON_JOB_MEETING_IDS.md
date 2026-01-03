# Cron-Job: Automatische meeting_id Aktualisierung

## Übersicht

Der Cron-Job `/api/cron/update-meeting-ids` läuft automatisch alle 2 Tage um 14:00 UTC (15:00/16:00 MEZ) und aktualisiert fehlende `meeting_id` Werte für vergangene Matches.

## Funktionalität

1. **Findet Matchdays ohne meeting_id**: Alle vergangenen Matchdays, die noch keine `meeting_id` haben und keine Detailsergebnisse
2. **Gruppiert nach source_url**: Nutzt `team_seasons.source_url` für effizientes Scraping
3. **Scraped nuLiga**: Ruft `/api/import/scrape-nuliga` auf, um Match-Daten von nuLiga zu holen
4. **Matcht Matches**: Verwendet Team-Namen und Datum, um passende Matches zu finden
5. **Aktualisiert meeting_id**: Speichert die gefundenen `meeting_id` Werte in der Datenbank
6. **Loggt Ergebnisse**: Erstellt eine Zusammenfassung mit Statistiken
7. **Sendet Email bei Fehlern**: Bei Fehlern wird eine Email an `ADMIN_EMAIL` gesendet (TODO)

## Konfiguration

### Vercel Cron Job

Der Cron-Job ist in `vercel.json` konfiguriert:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-meeting-ids",
      "schedule": "0 14 */2 * *"
    }
  ]
}
```

- **Schedule**: `0 14 */2 * *` = Alle 2 Tage um 14:00 UTC (tagsüber für natürliches Verhalten)
- **Path**: `/api/cron/update-meeting-ids`

### Environment Variables

**Erforderlich:**
- `SUPABASE_URL` oder `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` oder `SERVICE_ROLE_KEY`

**Optional:**
- `ADMIN_EMAIL`: Email-Adresse für Fehler-Benachrichtigungen (TODO: Email-Versand implementieren)
- `CRON_SECRET`: Secret für zusätzliche Sicherheit (wenn gesetzt, muss Request `Authorization: Bearer <secret>` Header haben)

### Batch-Größe

- **Limit**: 50 Matchdays pro Lauf (um Timeouts zu vermeiden)
- **Grund**: nuLiga Scraping kann langsam sein (~120ms Delay zwischen Requests)

## Logging

Der Cron-Job loggt:
- Start- und Endzeit
- Anzahl verarbeiteter Matchdays
- Anzahl erfolgreich aktualisierter meeting_ids
- Anzahl fehlgeschlagener Updates
- Anzahl übersprungener Matches (keine meeting_id in nuLiga verfügbar)
- Fehler-Details

**Log-Format:**
```json
{
  "startTime": "2025-01-03T14:00:00.000Z",
  "endTime": "2025-01-03T14:02:30.500Z",
  "durationMs": 150500,
  "totalProcessed": 25,
  "updated": 18,
  "failed": 5,
  "skipped": 2,
  "errors": [...]
}
```

## Email-Benachrichtigungen (TODO)

**Status**: Email-Versand ist vorbereitet, aber noch nicht implementiert.

**Geplante Implementierung:**
1. Nutze `ADMIN_EMAIL` Environment Variable
2. Sende Email nur bei Fehlern (`summary.error` oder `summary.failed > 0`)
3. Email enthält Zusammenfassung der Ergebnisse

**Optionen für Email-Versand:**
- Supabase Edge Function (komplex)
- Externer Service (SendGrid, Resend, etc.)
- Node.js Email-Bibliothek (nodemailer, etc.)

## Datenbank-Logging (TODO)

**Status**: Datenbank-Logging ist vorbereitet, aber noch nicht implementiert.

**Geplante Tabelle:**
```sql
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'success', 'error', 'warning'
  total_processed INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

### Lokales Testing

```bash
# Starte Vercel Dev Server
npm run dev:api

# Teste Endpoint (mit CRON_SECRET wenn gesetzt)
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Production Testing

Der Cron-Job läuft automatisch alle 2 Tage. Für manuelles Testing:

```bash
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Wichtige Hinweise

1. **Tagsüber ausführen**: Der Cron-Job läuft um 14:00 UTC (tagsüber), damit er nicht als "agentischer Job" identifiziert wird
2. **Batch-Größe**: Max 50 Matchdays pro Lauf, um Timeouts zu vermeiden
3. **Rate Limiting**: nuLiga Scraping hat ~120ms Delay zwischen Requests
4. **Fehlerbehandlung**: Fehler werden geloggt und per Email benachrichtigt (wenn implementiert)

## Bekannte Einschränkungen

1. **Email-Versand**: Noch nicht implementiert (nur Console-Logging)
2. **Datenbank-Logging**: Noch nicht implementiert (nur Console-Logging)
3. **Internal API Calls**: Nutzt HTTP-Requests zu `/api/import/scrape-nuliga` (könnte optimiert werden durch direkte Nutzung der Scraper-Logik)

## Nächste Schritte

1. ✅ Cron-Job implementiert
2. ⏳ Email-Versand implementieren
3. ⏳ Datenbank-Logging implementieren
4. ⏳ Optimierung: Direkte Nutzung der Scraper-Logik statt HTTP-Requests

