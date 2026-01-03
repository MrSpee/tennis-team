# 🧪 Cron-Job jetzt testen

## Option 1: Lokaler Test (empfohlen für erste Tests)

### Voraussetzung:
- Node.js Server muss laufen

### Schritt 1: Server starten (falls nicht läuft)
```bash
npm run dev
```

### Schritt 2: Cron-Job testen (in neuem Terminal)
```bash
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -v
```

### Erwartetes Ergebnis:
```json
{
  "success": true,
  "summary": {
    "startTime": "2025-01-XX...",
    "totalProcessed": 5,
    "updated": 0,
    "failed": 0,
    "skipped": 0,
    "message": "...",
    "errors": []
  }
}
```

---

## Option 2: Production Test (nach Deployment)

### Schritt 1: Finde deine Production-URL
- Gehe zu: https://vercel.com/dashboard
- Wähle dein Projekt
- Kopiere die Production-URL (z.B. `https://tennis-team.vercel.app`)

### Schritt 2: Teste den Cron-Job
```bash
curl -X POST https://[deine-production-url]/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -v
```

### Erwartetes Ergebnis:
Gleiche JSON-Response wie bei Option 1

---

## Option 3: Vercel Logs prüfen (nach automatischem Run)

### Wann?
- Cron-Job läuft automatisch stündlich
- Oder nach manuellem Test (Option 2)

### Wo?
1. Gehe zu: https://vercel.com/dashboard
2. Wähle dein Projekt
3. Gehe zu "Functions" → `/api/cron/update-meeting-ids`
4. Oder: "Logs" Tab

### Was suchen?
```
[update-meeting-ids] 🚀 Cron Job gestartet
[update-meeting-ids] 🔍 Verarbeite X Matchdays...
[update-meeting-ids] ✅ meeting_id ... für Matchday ... aktualisiert
[update-meeting-ids] 📥 Hole Ergebnisse für: ...
[update-meeting-ids] ✅ Ergebnisse für Matchday ... erfolgreich importiert
[update-meeting-ids] 📊 Cron Job Zusammenfassung: {...}
```

---

## Ergebnis-Interpretation

### ✅ Erfolgreich:
```json
{
  "success": true,
  "summary": {
    "updated": 3,
    "failed": 0,
    "resultsUpdated": 4,
    "resultsFailed": 0
  }
}
```
**Bedeutung:** Alles funktioniert perfekt!

### ⚠️ Teilweise erfolgreich (normal):
```json
{
  "success": false,
  "summary": {
    "updated": 2,
    "failed": 1,
    "resultsUpdated": 3,
    "resultsFailed": 1,
    "errors": [
      {"errorCode": "MEETING_NOT_FOUND"}
    ]
  }
}
```
**Bedeutung:** Normal! Einige Matchdays haben noch keine meeting_ids/Ergebnisse. Wird bei nächstem Lauf erneut versucht.

### ❌ Fehler:
```json
{
  "success": false,
  "error": "Fehler beim Laden der Matchdays: ..."
}
```
**Bedeutung:** Kritischer Fehler. Muss untersucht werden.

---

## Troubleshooting

### Problem: "Connection refused" (lokal)
**Lösung:** Server muss laufen → `npm run dev`

### Problem: "404 Not Found" (Production)
**Lösung:** Warte 1-2 Minuten nach Deployment, dann erneut versuchen

### Problem: "Unauthorized" (Production)
**Lösung:** Normal - Cron-Job sollte nur von Vercel aufgerufen werden. Für Testing: Prüfe `CRON_SECRET` in Environment Variables.

### Problem: Timeout
**Lösung:** Unwahrscheinlich bei 5 Matchdays. Falls doch: Prüfe Logs für langsame API-Calls.

