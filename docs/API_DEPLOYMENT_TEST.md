# 🧪 Test-Anleitung für neue APIs nach Deployment

## Schritt 3: Neue APIs testen (sobald deployed)

Sobald die neuen APIs auf Vercel deployed sind, kannst du sie testen.

---

## 🔍 So prüfst du, ob die APIs deployed sind:

### Option 1: Vercel Dashboard

1. Gehe zu: https://vercel.com/dashboard
2. Wähle dein Projekt "tennis-team"
3. Gehe zu "Deployments"
4. Prüfe den neuesten Deployment-Status
5. Wenn Status = "Ready" → APIs sollten verfügbar sein

### Option 2: Direkter API-Test

Teste in Postman oder Browser Console:

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'club-info',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154'
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ Neue API funktioniert!', data);
    alert('Neue API funktioniert!');
  } else {
    console.error('❌ API-Fehler:', data);
  }
})
.catch(err => {
  console.error('❌ Fehler:', err);
  if (err.message.includes('404')) {
    alert('API noch nicht deployed. Warte 2-3 Minuten und versuche es erneut.');
  }
});
```

**Erwartete Antwort (200 OK):**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

**Falls 404:** API noch nicht deployed, warte 2-3 Minuten.

---

## 📋 Test-Szenarien für neue APIs

### Test 1: Club-Info (schnell, ~2 Sekunden)

**Postman:**
- URL: `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`
- Method: POST
- Body:
```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

**Erwartetes Ergebnis:**
- Status: 200 OK
- Response: `{ success: true, clubNumber: "36154", clubName: "..." }`

---

### Test 2: Teams auflisten (~5-10 Sekunden)

**Body:**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**Erwartetes Ergebnis:**
- Status: 200 OK
- Response: `{ success: true, teams: [...], totalTeams: 6 }`

---

### Test 3: Meldelisten mit Matching (~30-60 Sekunden)

**Body:**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Erwartetes Ergebnis:**
- Status: 200 OK
- Response: `{ success: true, matchingResults: [...], teams: [...] }`

---

## ✅ Vergleich: Alte vs. Neue API

### Alte API (funktioniert jetzt):
- URL: `/api/import/parse-club-rosters`
- Request: `{ clubPoolsUrl, targetSeason, apply }`
- Response: `{ success, teams, matchingResults }`

### Neue API (nach Deployment):
- URL: `/api/import/nuliga-club-import`
- Request: `{ action: "roster", clubPoolsUrl, targetSeason, apply }`
- Response: `{ success, teams, matchingResults }` (identisch)

**Unterschied:** Neue API hat `action` Parameter für verschiedene Operationen.

---

## 🔄 Frontend-Integration (Schritt 2)

Sobald die neuen APIs funktionieren, können wir die Frontend-Integration anpassen:

**Aktuell nutzt ClubRostersTab:**
- `/api/import/parse-club-rosters`

**Nach Integration nutzt ClubRostersTab:**
- `/api/import/nuliga-club-import` mit `action: "roster"`

**Vorteil:**
- Einheitliche API-Struktur
- Konsolidierte Logik
- Bessere Fehlerbehandlung

---

## 📝 Checkliste

- [ ] Warte auf Vercel Deployment (2-3 Minuten nach `git push`)
- [ ] Teste `action: "club-info"` → sollte 200 OK sein
- [ ] Teste `action: "teams"` → sollte Teams-Liste zurückgeben
- [ ] Teste `action: "roster"` → sollte Matching-Results zurückgeben
- [ ] Vergleiche Ergebnisse mit alter API
- [ ] Wenn alles funktioniert → Frontend-Integration starten

---

## 🆘 Troubleshooting

### Problem: 404 Not Found

**Ursache:** API noch nicht deployed

**Lösung:**
1. Warte 2-3 Minuten
2. Prüfe Vercel Dashboard
3. Nutze vorerst die alte API (`parse-club-rosters`)

### Problem: 500 Internal Server Error

**Ursache:** Server-Fehler in der API

**Lösung:**
1. Prüfe Vercel Logs (Dashboard → Deployments → Logs)
2. Prüfe ob nuLiga-URL erreichbar ist
3. Nutze die alte API als Fallback

### Problem: Timeout

**Ursache:** Request dauert zu lange (>60 Sekunden)

**Lösung:**
1. Normales Verhalten bei großen Meldelisten
2. Nutze `action: "teams"` zuerst, um Teams zu sehen
3. Dann einzeln `action: "roster"` für jedes Team

---

Viel Erfolg beim Testen! 🚀

