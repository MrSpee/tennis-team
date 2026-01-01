# 🧪 Test: Meldelisten API (roster)

## 📋 API-Call: Meldelisten laden

**Endpoint:** `POST /api/import/nuliga-club-import`  
**Action:** `roster`

---

## 🌐 Browser Console (F12)

```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'roster',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026',
    apply: false  // Dry-Run (nur Matching, keine DB-Schreibvorgänge)
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Response:', data);
  console.log('📊 Übersicht:', {
    clubNumber: data.clubNumber,
    clubName: data.clubName,
    teamsCount: data.teams?.length || 0,
    totalPlayers: data.teams?.reduce((sum, t) => sum + (t.roster?.length || 0), 0) || 0
  });
  
  // Zeige erste Teams mit Roster-Info
  if (data.teams && data.teams.length > 0) {
    data.teams.slice(0, 3).forEach((team, idx) => {
      console.log(`📋 Team ${idx + 1}: ${team.teamName} (${team.contestType})`, {
        playerCount: team.playerCount,
        rosterLength: team.roster?.length || 0,
        matchingResults: team.matchingResults?.length || 0
      });
    });
  }
  
  if (data.teams && data.teams.length > 0) {
    const totalPlayers = data.teams.reduce((sum, t) => sum + (t.roster?.length || 0), 0);
    alert(`✅ ${data.teams.length} Teams, ${totalPlayers} Spieler gefunden für ${data.clubName || 'Club ' + data.clubNumber}`);
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

**Body (JSON) - Dry-Run (keine DB-Schreibvorgänge):**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Body (JSON) - Mit DB-Schreibvorgängen (⚠️ Vorsicht!):**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": true
}
```

---

## ✅ Erwartete Antwort (apply: false)

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",
  "season": "Winter 2025/2026",
  "teams": [
    {
      "contestType": "Herren 30",
      "teamName": "Herren 30",
      "teamUrl": "https://...",
      "playerCount": 19,
      "roster": [
        {
          "rank": 1,
          "teamNumber": 1,
          "name": "Sudbrack, Jan",
          "lk": "LK11,6",
          "tvmId": "18002439",
          "birthYear": 1980,
          "singles": null,
          "doubles": null,
          "total": null
        }
      ],
      "matchingResults": [
        {
          "rosterPlayer": {
            "rank": 1,
            "name": "Sudbrack, Jan",
            "tvmId": "18002439"
          },
          "matchResult": {
            "playerId": "uuid-123",
            "confidence": 100,
            "matchType": "tvm_id",
            "hasUserAccount": false
          }
        }
      ]
    }
  ]
}
```

---

## ⚠️ WICHTIG: Parameter

### `apply: false` (Dry-Run - Empfohlen für Tests)
- ✅ Führt Player-Matching durch
- ✅ Gibt Matching-Ergebnisse zurück
- ✅ **KEINE** DB-Schreibvorgänge
- ✅ Sicher zum Testen

### `apply: true` (Mit DB-Schreibvorgängen)
- ✅ Führt Player-Matching durch
- ✅ Speichert Teams in DB (falls nicht vorhanden)
- ✅ Speichert Meldelisten in DB
- ⚠️ **Schreibt in Datenbank!**
- ⚠️ Nur verwenden wenn sicher!

---

## ⏱️ Performance

**Dauer:** 30-60 Sekunden (je nach Anzahl Teams/Spieler)
- Parst alle Teams des Clubs
- Lädt Meldelisten für jedes Team
- Führt Player-Matching durch

**Hinweis:** API kann länger dauern, besonders bei vielen Teams!

---

## 🔍 Was zu prüfen ist:

1. ✅ `success: true`
2. ✅ `clubNumber` ist vorhanden
3. ✅ `clubName` ist vorhanden (aus DB geladen)
4. ✅ `teams` Array enthält Teams
5. ✅ Jedes Team hat `roster` Array mit Spielern
6. ✅ Jedes Team hat `matchingResults` (wenn `apply: false`)
7. ✅ Matching-Ergebnisse zeigen: `matchType`, `confidence`, `hasUserAccount`

---

## ⚠️ Mögliche Fehler

### 404 Not Found
- API noch nicht deployed
- Nutze alte API als Fallback: `parse-club-rosters`

### 400 Bad Request
- Fehlende Parameter
- Ungültige URL

### 500 Internal Server Error
- Server-Fehler (möglicherweise Timeout bei vielen Teams)
- Prüfe Server-Logs

### Timeout
- Zu viele Teams/Spieler
- API benötigt mehr Zeit
- Versuche mit weniger Teams oder warte länger


