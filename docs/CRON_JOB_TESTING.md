# Cron-Job Testing Guide

## Production Testing

### Option 1: Mit Test-Skript (Empfohlen)

```bash
# Test-Skript ausführen (lokal, testet Production)
./test-cron-job.sh
```

Das Skript testet automatisch die Production-URL: `https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids`

### Option 2: Manuell mit curl

**Wichtig**: Der curl-Befehl wird **lokal in deinem Terminal** ausgeführt, testet aber die **Production-URL**.

```bash
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -v
```

**Wo ausführen?**
- In deinem **lokalen Terminal** (z.B. iTerm, Terminal.app auf Mac)
- Oder in jedem Terminal/Command Prompt
- Der Befehl sendet eine HTTP-Request an die Production-URL

### Option 3: Mit Browser oder Postman

**URL**: `https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids`

**Method**: POST  
**Headers**: `Content-Type: application/json`  
**Body**: (leer oder `{}`)

## Deployment

Der Cron-Job wird automatisch deployed, wenn du auf `main` pusht:

```bash
git push origin main
```

**Vercel deployt automatisch** nach jedem Push auf `main`.

**Prüfe Deployment Status:**
1. Gehe zu: https://vercel.com/dashboard
2. Wähle dein Projekt: `tennis-team`
3. Prüfe die neuesten Deployments

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

### Keine Matchdays gefunden (auch Success)
```json
{
  "success": true,
  "summary": {
    "message": "Keine Matchdays ohne meeting_id gefunden."
  }
}
```

## Logs prüfen

### Vercel Dashboard

1. Gehe zu: https://vercel.com/dashboard
2. Wähle Projekt: `tennis-team`
3. **Logs** → Filter nach `/api/cron/update-meeting-ids`
4. Prüfe die Ausgabe für Details

### Console Logs (im curl Output)

Mit `-v` Flag siehst du:
- HTTP Status Code
- Response Headers
- Response Body

## Environment Variables prüfen

Stelle sicher, dass folgende Environment Variables in Vercel gesetzt sind:

1. **Vercel Dashboard** → Dein Projekt → **Settings** → **Environment Variables**
2. Prüfe:
   - `SUPABASE_URL` oder `VITE_SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅
   - Optional: `ADMIN_EMAIL` (für zukünftige Email-Benachrichtigungen)
   - Optional: `CRON_SECRET` (für zusätzliche Sicherheit)

## Häufige Probleme

### 1. "SUPABASE_URL fehlt in den Umgebungsvariablen"
**Lösung**: Setze `SUPABASE_URL` oder `VITE_SUPABASE_URL` in Vercel Environment Variables

### 2. "Fehler beim Laden der Matchdays"
**Lösung**: Prüfe ob die Datenbank erreichbar ist und die Tabelle `matchdays` existiert

### 3. "Scrape-Antwort konnte nicht geparst werden"
**Lösung**: Prüfe ob `/api/import/scrape-nuliga` funktioniert (kann nuLiga nicht erreichbar sein)

### 4. "Keine Matchdays ohne meeting_id gefunden"
**Lösung**: Das ist normal - der Cron-Job hat nichts zu tun. Teste mit Matchdays die noch keine meeting_id haben.

### 5. 401 Unauthorized
**Lösung**: Wenn `CRON_SECRET` gesetzt ist, musst du den Header hinzufügen:
```bash
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Lokales Testing (Alternative)

Falls du lokal testen willst:

```bash
# Terminal 1: Starte Dev Server
npm run dev:api

# Terminal 2: Teste lokal
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Content-Type: application/json"
```

## Nächste Schritte nach Testing

1. ✅ Prüfe ob der Cron-Job grundsätzlich funktioniert
2. ✅ Prüfe ob meeting_ids korrekt aktualisiert werden
3. ✅ Prüfe ob Fehler korrekt geloggt werden
4. ⏳ Implementiere Email-Versand (wenn gewünscht)
5. ⏳ Implementiere Datenbank-Logging (wenn gewünscht)
