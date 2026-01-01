# 🔧 Fix für 404-Fehler bei neuen APIs

## Problem

Du bekommst einen **404 (Not Found)** Fehler, wenn du die neue API aufrufst:
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import 404 (Not Found)
```

## Lösung

### Schritt 1: Prüfe ob Dateien committed sind

Öffne Terminal/Git und führe aus:

```bash
git status api/import/nuliga*.js api/import/_lib/
```

**Wenn Dateien als "untracked" oder "modified" angezeigt werden:**

1. **Commit die Dateien:**
   ```bash
   git add api/import/nuliga-club-import.js
   git add api/import/nuliga-matches-import.js
   git add api/import/_lib/playerMatcher.js
   git commit -m "Neue konsolidierte nuLiga Import APIs"
   ```

2. **Push zu GitHub:**
   ```bash
   git push
   ```

3. **Warte auf Vercel Deployment:**
   - Gehe zu https://vercel.com/dashboard
   - Prüfe ob ein neues Deployment läuft
   - Warte bis es fertig ist (normalerweise 1-2 Minuten)

---

### Schritt 2: Prüfe Vercel Deployment

1. Öffne https://vercel.com/dashboard
2. Wähle dein Projekt "tennis-team"
3. Prüfe die **"Deployments"** Tab
4. Schaue ob die neuesten Dateien enthalten sind

**Wenn die Dateien nicht deployed wurden:**
- Trigger ein neues Deployment (z.B. durch einen neuen Commit)
- Oder klicke auf "Redeploy" im Vercel Dashboard

---

### Schritt 3: Prüfe ob API-Dateien korrekt sind

Die API-Dateien müssen am Ende so exportiert werden:

```javascript
module.exports = handler;
```

**Prüfe:**
- `api/import/nuliga-club-import.js` → sollte `module.exports = handler;` am Ende haben
- `api/import/nuliga-matches-import.js` → sollte `module.exports = handler;` am Ende haben

---

### Schritt 4: Teste die API lokal (optional)

Wenn du lokal testen möchtest (mit `vercel dev`):

```bash
# Installiere Vercel CLI falls nicht vorhanden
npm i -g vercel

# Starte lokalen Server
vercel dev
```

Dann teste mit:
```javascript
fetch('http://localhost:3000/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'club-info',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## Alternative: Nutze die alten APIs

Falls die neuen APIs noch nicht funktionieren, nutze die **alten APIs** weiterhin:

- ✅ `api/import/parse-club-rosters.js` (funktioniert)
- ✅ `api/import/parse-team-roster.js` (funktioniert)
- ✅ `api/import/scrape-nuliga.js` (funktioniert)

Die neuen APIs sind **parallel** zu den alten - sie ersetzen sie noch nicht!

---

## Nach dem Fix: Test nochmal

Sobald die Dateien deployed sind, teste nochmal:

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'club-info',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154'
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('✅ ERFOLG!', data);
})
.catch(error => {
  console.error('❌ FEHLER:', error);
});
```

**Erwartetes Ergebnis:**
- Status: 200 (nicht 404!)
- Response: `{ success: true, clubNumber: "36154", clubName: "VKC Köln" }`

---

## Hilfe

Wenn es weiterhin nicht funktioniert:

1. **Prüfe Vercel Logs:**
   - Vercel Dashboard → Deployments → Klicke auf neuestes Deployment → "Functions" Tab
   - Schaue ob Fehler in den Logs sind

2. **Prüfe ob Dateien im Build enthalten sind:**
   - Vercel Dashboard → Deployments → "Source" Tab
   - Prüfe ob `api/import/nuliga-club-import.js` in der Dateiliste ist

3. **Kontaktiere Support:**
   - Erstelle ein Issue mit Screenshot der Vercel Logs

