# ✅ Postman Requests - ALTE API (funktioniert garantiert!)

## ⚠️ WICHTIG: Nutze die alte API, bis die neuen APIs deployed sind

Die neuen APIs (`nuliga-club-import`) sind noch nicht auf Vercel verfügbar (404-Fehler).  
**Nutze stattdessen die alte API** - sie funktioniert!

---

## 📋 Request: Club-Rosters laden

### Postman-Konfiguration:

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters`

### Headers:
```
Content-Type: application/json
```

### Body (raw JSON):
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

### Erwartete Antwort:
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",
  "teams": [
    {
      "contestType": "Herren 40",
      "teamName": "Herren 40",
      "teamUrl": "https://...",
      "playerCount": 12
    }
  ],
  "matchingResults": [
    {
      "contestType": "Herren 40",
      "teamName": "Herren 40",
      "matchingResults": [
        {
          "rosterPlayer": {
            "rank": 1,
            "name": "Max Mustermann",
            "tvmId": "12345678",
            "lk": "LK 12.5"
          },
          "matchResult": {
            "playerId": "uuid-123",
            "confidence": 100,
            "matchType": "tvm_id",
            "hasUserAccount": true
          }
        }
      ]
    }
  ]
}
```

---

## 📋 Request: Team-Roster laden (einzelnes Team)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-team-roster`

### Body (raw JSON):
```json
{
  "teamPortraitUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=...",
  "teamId": "uuid-des-teams",
  "season": "Winter 2025/2026",
  "apply": false
}
```

---

## 📋 Request: Liga-Scraper (Gruppen & Matches)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/scrape-nuliga`

### Body (raw JSON):
```json
{
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groups": "43,46",
  "apply": false,
  "includeMatches": true
}
```

---

## ✅ Diese API funktioniert garantiert!

Die alte API `parse-club-rosters` macht genau das gleiche wie die neue API - sie ist nur anders strukturiert.

**Unterschied:**
- ❌ Neue API: `action: "club-info"` Parameter
- ✅ Alte API: Direkter Request ohne `action` Parameter

**Funktionalität ist identisch!**

---

## 🎯 Test-Reihenfolge

1. **Starte mit der alten API** (`parse-club-rosters`)
2. **Sobald Vercel das neue Deployment fertig hat** (warte 2-3 Minuten)
3. **Teste dann die neue API** nochmal

---

## ⏱️ Wartezeit für neues Deployment

Nach dem `git push` dauert es normalerweise:
- **1-2 Minuten** bis Vercel das Deployment startet
- **2-3 Minuten** bis es fertig ist
- **Insgesamt: 3-5 Minuten**

Danach sollte die neue API funktionieren!

---

## 🔍 So prüfst du ob Deployment fertig ist:

1. Gehe zu: https://vercel.com/dashboard
2. Wähle dein Projekt "tennis-team"
3. Schaue auf den neuesten Deployment-Status
4. Wenn Status = "Ready" → Neue API sollte funktionieren

