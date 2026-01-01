# 🧪 Test: Teams auflisten API

## 📋 API-Call: Teams auflisten

**Endpoint:** `POST /api/import/nuliga-club-import`  
**Action:** `teams`

---

## 🌐 Browser Console (F12)

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'teams',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Response:', data);
  console.log('📊 Teams:', {
    clubNumber: data.clubNumber,
    clubName: data.clubName,
    teamsCount: data.teams?.length || 0,
    teams: data.teams?.map(t => ({
      contestType: t.contestType,
      teamName: t.teamName,
      playerCount: t.playerCount,
      teamUrl: t.teamUrl
    }))
  });
  
  if (data.teams && data.teams.length > 0) {
    alert(`✅ ${data.teams.length} Teams gefunden für ${data.clubName || 'Club ' + data.clubNumber}`);
  } else {
    alert(`⚠️ Keine Teams gefunden`);
  }
})
.catch(error => {
  console.error('❌ FEHLER:', error);
  alert('Fehler: ' + error.message);
});
```

---

## 📋 Postman Request

**Method:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

---

## ✅ Erwartete Antwort

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",
  "teams": [
    {
      "contestType": "Herren 30",
      "teamName": "Herren 30",
      "teamUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154&seasonName=Winter+2025%2F2026&contestType=Herren+30",
      "playerCount": 19
    },
    {
      "contestType": "Damen 30",
      "teamName": "Damen 30",
      "teamUrl": "...",
      "playerCount": 15
    }
  ]
}
```

---

## ⚠️ Mögliche Fehler

### 404 Not Found
- API noch nicht deployed
- Nutze alte API als Fallback: `parse-club-rosters`

### 400 Bad Request
- Fehlende Parameter
- Ungültige URL

### 500 Internal Server Error
- Server-Fehler
- Prüfe Server-Logs

---

## 🔍 Was zu prüfen ist:

1. ✅ `success: true`
2. ✅ `clubNumber` ist vorhanden
3. ✅ `clubName` ist vorhanden (aus DB geladen)
4. ✅ `teams` Array enthält Teams
5. ✅ Jedes Team hat: `contestType`, `teamName`, `teamUrl`, `playerCount`


