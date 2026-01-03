# 404 Fehler beim Cron-Job - Lösung

## ❌ Problem

Beim Testen bekommst du einen **404 Fehler**:
```
HTTP/2 404 
The page could not be found
NOT_FOUND
```

## 🔍 Einfache Erklärung

**404 = Datei nicht gefunden**

Das bedeutet: Vercel hat die Datei `api/cron/update-meeting-ids.js` noch **nicht deployed** oder erkennt sie nicht.

## ✅ Lösungen

### Lösung 1: Warte auf Deployment (2-3 Minuten)

Nach jedem `git push` deployt Vercel automatisch. Das kann **2-3 Minuten** dauern.

**Teste dann nochmal:**
```bash
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -v
```

### Lösung 2: Prüfe Vercel Dashboard

1. **Gehe zu:** https://vercel.com/dashboard
2. **Wähle Projekt:** `tennis-team`
3. **Prüfe "Deployments":**
   - 🟡 **"Building"** = läuft noch, warte
   - 🟢 **"Ready"** = fertig, teste nochmal
   - 🔴 **"Error"** = Fehler, prüfe Logs

### Lösung 3: Manuelles Redeploy

Falls das Deployment fehlschlägt:

1. **Vercel Dashboard** → Dein Projekt
2. **Deployments** → Klicke auf das neueste Deployment
3. **Drei Punkte (⋮)** → **"Redeploy"**

### Lösung 4: Prüfe ob Datei korrekt ist

**Lokal prüfen:**
```bash
# Prüfe ob Datei existiert
ls -la api/cron/update-meeting-ids.js

# Prüfe ob Export korrekt ist
tail -5 api/cron/update-meeting-ids.js
```

**Sollte zeigen:**
```
module.exports = async function handler(req, res) {
  ...
};
```

## 🧪 Test nach Deployment

Nach erfolgreichem Deployment solltest du **200 OK** bekommen (kein 404):

```bash
curl -X POST https://tennis-team-gamma.vercel.app/api/cron/update-meeting-ids \
  -H "Content-Type: application/json" \
  -v
```

**Erfolgreiche Response:**
```
HTTP/2 200
{
  "success": true,
  "summary": { ... }
}
```

## ⚠️ Wenn immer noch 404

1. **Prüfe Vercel Dashboard** für Deployment-Fehler
2. **Prüfe Build-Logs** in Vercel Dashboard
3. **Prüfe ob Datei committed wurde:** `git log --oneline -3`
4. **Kontaktiere Vercel Support** wenn das Problem weiterhin besteht

## 📋 Checkliste

- [ ] Datei existiert: `api/cron/update-meeting-ids.js`
- [ ] Datei exportiert: `module.exports = async function handler(req, res)`
- [ ] Code committed: `git log` zeigt die Datei
- [ ] Code gepusht: `git push origin main` erfolgreich
- [ ] Vercel Deployment: Status "Ready" im Dashboard
- [ ] Wartezeit: 2-3 Minuten nach Push
