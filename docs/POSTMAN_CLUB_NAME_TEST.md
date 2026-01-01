# 🧪 Test: Club-Name DB-Implementierung

## Test: Club-Name wird aus Datenbank geladen

Teste ob der Club-Name jetzt korrekt aus der Datenbank geladen wird (statt `null`).

---

## 📋 Postman Request

### Request-Konfiguration

**Method:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

---

## 📋 Browser Console (Schnelltest)

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026',
    apply: false
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ ERFOLG!', data);
  console.log('📊 Club-Daten:', {
    clubNumber: data.clubNumber,
    clubName: data.clubName,  // <-- SOLLTE JETZT AUS DB KOMMEN!
    teamsCount: data.teams?.length || 0
  });
  
  if (data.clubName) {
    alert(`✅ Club-Name gefunden: "${data.clubName}" (Club-Nr: ${data.clubNumber})`);
  } else {
    alert(`⚠️ Club-Name ist null (Club-Nr: ${data.clubNumber})`);
  }
})
.catch(error => {
  console.error('❌ FEHLER:', error);
  alert('Fehler: ' + error.message);
});
```

---

## ✅ Erwartete Ergebnisse

### Wenn Club in DB vorhanden ist:

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",  // ✅ AUS DB GELADEN (statt null)
  "teams": [...],
  "matchingResults": [...]
}
```

**Console-Logs (Server):**
```
[parse-club-rosters] ✅ Club-Name aus DB geladen: "VKC Köln" (Club-Nr: 36154)
```

### Wenn Club NICHT in DB vorhanden ist:

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": null,  // ⚠️ Oder HTML-geparster Name (Fallback)
  "teams": [...],
  "matchingResults": [...]
}
```

**Console-Logs (Server):**
```
[parse-club-rosters] ℹ️ Club 36154 nicht in DB gefunden
```

---

## 🔍 Was zu prüfen ist:

1. ✅ **`clubName` ist NICHT mehr `null`** (wenn Club in DB)
2. ✅ **Console zeigt**: `✅ Club-Name aus DB geladen: "VKC Köln"`
3. ✅ **Korrekter Club-Name** (z.B. "VKC Köln" für Club-Nr 36154)

---

## 📝 Alternative Test-URLs

### Test mit anderem Club:

```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=12345",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Erwartung:** `clubName: null` (wenn Club nicht in DB)

---

## 🐛 Troubleshooting

### Problem: `clubName` ist immer noch `null`

**Mögliche Ursachen:**
1. Club nicht in Datenbank (erwartet)
2. `club_number` nicht in `team_info` gespeichert
3. Keine Teams für diesen Club in DB

**Lösung:**
- Prüfe ob Club in DB existiert: `SELECT * FROM club_info WHERE id IN (SELECT DISTINCT club_id FROM team_info WHERE club_number = '36154')`
- Prüfe ob `club_number` gespeichert ist: `SELECT club_number, club_id FROM team_info WHERE club_number = '36154' LIMIT 1`

### Problem: Fehler beim Laden

**Prüfe Server-Logs:**
- `⚠️ Fehler beim Laden von Club-Name` → DB-Query-Problem
- `❌ Fehler beim Laden von Club-Name aus DB` → Exception

---

## 📊 Vollständige Response-Struktur

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",  // ✅ JETZT AUS DB!
  "teams": [
    {
      "contestType": "Herren 30",
      "teamName": "Herren 30",
      "teamUrl": "...",
      "playerCount": 19,
      "roster": [...]
    }
  ],
  "matchingResults": [...],
  "savedRosters": [],
  "message": "6 Teams für Saison \"Winter 2025/2026\" gefunden (Club-Nummer: 36154)"
}
```

