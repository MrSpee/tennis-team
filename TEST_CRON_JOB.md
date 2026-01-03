# 🧪 Cron-Job Test - Schnellstart

## ⚡ Schnelltest (wenn Server läuft)

```bash
./test-cron-job.sh
```

Oder manuell:
```bash
curl -X POST http://localhost:3000/api/cron/update-meeting-ids
```

---

## 📋 Vollständige Test-Anleitung

### Option 1: Lokaler Test (empfohlen)

#### Schritt 1: Server starten
```bash
npm run dev
```

#### Schritt 2: Test durchführen (in neuem Terminal)
```bash
curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" | jq '.'
```

**Oder mit Test-Script:**
```bash
./test-cron-job.sh
```

#### Erwartetes Ergebnis:
```json
{
  "success": true,
  "summary": {
    "startTime": "2025-01-XX...",
    "totalProcessed": 5,
    "updated": 0,
    "failed": 0,
    "resultsProcessed": 5,
    "resultsUpdated": 0,
    "resultsFailed": 0,
    "message": "...",
    "errors": []
  }
}
```

---

### Option 2: Production Test

#### Schritt 1: Finde deine Production-URL
- Gehe zu: https://vercel.com/dashboard
- Wähle dein Projekt
- Kopiere die URL (z.B. `https://tennis-team-gamma.vercel.app`)

#### Schritt 2: Teste
```bash
curl -X POST https://[deine-url]/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" | jq '.'
```

---

### Option 3: Vercel Logs prüfen

#### Wann?
- Nach automatischem Run (stündlich)
- Oder nach manuellem Test (Option 2)

#### Wo?
1. https://vercel.com/dashboard
2. Wähle Projekt
3. "Functions" → `/api/cron/update-meeting-ids`
4. Oder: "Logs" Tab

#### Was suchen?
```
[update-meeting-ids] 🚀 Cron Job gestartet
[update-meeting-ids] 🔍 Verarbeite X Matchdays...
[update-meeting-ids] ✅ meeting_id ... aktualisiert
[update-meeting-ids] 📥 Hole Ergebnisse für: ...
[update-meeting-ids] ✅ Ergebnisse erfolgreich importiert
[update-meeting-ids] 📊 Cron Job Zusammenfassung
```

---

## ✅ Ergebnis-Interpretation

### ✅ Erfolgreich
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
**Bedeutung:** Alles funktioniert! 🎉

### ⚠️ Teilweise erfolgreich (normal)
```json
{
  "success": false,
  "summary": {
    "updated": 2,
    "failed": 1,
    "resultsUpdated": 3,
    "resultsFailed": 1,
    "errors": [{"errorCode": "MEETING_NOT_FOUND"}]
  }
}
```
**Bedeutung:** Normal! Einige Matchdays haben noch keine meeting_ids/Ergebnisse. Wird bei nächstem Lauf erneut versucht.

### ❌ Fehler
```json
{
  "success": false,
  "error": "Fehler beim Laden der Matchdays: ..."
}
```
**Bedeutung:** Kritischer Fehler. Muss untersucht werden.

---

## 🔍 Troubleshooting

### "Connection refused"
**Lösung:** Server muss laufen → `npm run dev`

### "404 Not Found"
**Lösung:** Warte 1-2 Minuten nach Deployment

### "Unauthorized"
**Lösung:** Normal für Production (nur Vercel darf aufrufen). Für Testing: Prüfe Environment Variables.

