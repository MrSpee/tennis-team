# 📮 Postman API-Requests - Sofort nutzbar

## 🚀 Schnellstart

1. **Öffne Postman**
2. **Erstelle eine neue Request** (New → HTTP Request)
3. **Kopiere die Requests unten** und teste sie

---

## 📋 API 1: nuliga-club-import

### 1.1 Club-Info extrahieren

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

---

### 1.2 Teams auflisten

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",
  "season": "Winter 2025/2026",
  "teams": [
    {
      "contestType": "Herren 40",
      "teamName": "Herren 40",
      "teamUrl": "https://...",
      "playerCount": 12
    }
  ],
  "totalTeams": 5
}
```

---

### 1.3 Meldelisten laden (mit Matching-Review)

**⚠️ WICHTIG: Dieser Request dauert länger (30-60 Sekunden)!**

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln",
  "season": "Winter 2025/2026",
  "teams": [...],
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

## 📋 API 2: nuliga-matches-import

### 2.1 Gruppen aus Liga extrahieren

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "league-groups",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26"
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "leagueUrl": "https://...",
  "season": "Winter 2025/26",
  "groups": [
    {
      "groupId": "43",
      "groupName": "Gr. 043",
      "league": "Herren 50 2. Bezirksliga Gr. 043",
      "category": "Herren 50",
      "matchCount": 42,
      "standingsCount": 4
    }
  ],
  "totalGroups": 10
}
```

---

### 2.2 Gruppen-Details laden

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "group-details",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groupId": "43",
  "apply": false
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "mode": "dry-run",
  "group": {
    "groupId": "43",
    "groupName": "Gr. 043",
    "league": "Herren 50 2. Bezirksliga Gr. 043",
    "category": "Herren 50"
  },
  "matches": 42,
  "standings": 4,
  "unmappedTeams": []
}
```

---

### 2.3 Match-Ergebnisse aktualisieren

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "action": "match-results",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groups": "43,46",
  "apply": false
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "mode": "dry-run",
  "leagueUrl": "https://...",
  "season": "Winter 2025/26",
  "groupsProcessed": 2,
  "totals": {
    "matches": 84,
    "standings": 8
  },
  "unmappedTeams": [],
  "groups": [...]
}
```

---

## 🎯 Schritt-für-Schritt: Postman einrichten

### Schritt 1: Neue Request erstellen

1. Öffne Postman
2. Klicke auf **"New"** (oben links)
3. Wähle **"HTTP Request"**

### Schritt 2: Request konfigurieren

1. **Methode:** Wähle `POST` aus dem Dropdown (links neben der URL)
2. **URL:** Kopiere eine der URLs oben (z.B. `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`)
3. **Headers:** 
   - Klicke auf Tab **"Headers"**
   - Füge hinzu: `Content-Type` = `application/json`
4. **Body:**
   - Klicke auf Tab **"Body"**
   - Wähle **"raw"** aus
   - Wähle **"JSON"** aus dem Dropdown rechts
   - Kopiere einen der JSON-Bodies oben und füge ihn ein

### Schritt 3: Request senden

1. Klicke auf **"Send"** (blaue Schaltfläche rechts)
2. Unten siehst du die **Response**
3. Prüfe:
   - **Status:** Sollte `200 OK` sein
   - **Body:** Sollte JSON mit `"success": true` enthalten

---

## 🧪 Test-Reihenfolge (empfohlen)

### Test 1: Einfacher Test (schnell)
✅ **Club-Info extrahieren** (Request 1.1)
- Dauer: ~2-3 Sekunden
- Prüft ob API grundsätzlich funktioniert

### Test 2: Erweiterter Test
✅ **Teams auflisten** (Request 1.2)
- Dauer: ~5-10 Sekunden
- Prüft ob Parsing funktioniert

### Test 3: Vollständiger Test (dauert länger!)
✅ **Meldelisten laden** (Request 1.3)
- Dauer: ~30-60 Sekunden
- Prüft Matching-Logik

---

## 🔍 Response-Interpretation

### ✅ Erfolgreiche Antwort

**Status Code:** `200 OK`

**Body-Beispiel:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

**Was bedeutet das?**
- API funktioniert ✅
- Daten wurden erfolgreich extrahiert ✅
- Keine Fehler ✅

---

### ❌ Fehler: 404 Not Found

**Status Code:** `404`

**Was bedeutet das?**
- API-Endpoint existiert nicht
- Datei wurde nicht deployed
- Falsche URL

**Lösung:**
- Prüfe ob die Datei auf Vercel deployed wurde
- Prüfe ob die URL korrekt ist

---

### ❌ Fehler: 500 Internal Server Error

**Status Code:** `500`

**Was bedeutet das?**
- Server-Fehler
- API-Code hat einen Bug
- Externe API (nuLiga) nicht erreichbar

**Lösung:**
- Prüfe Vercel-Logs (Vercel Dashboard → Deployments → Logs)
- Prüfe ob nuLiga-URL erreichbar ist

---

### ❌ Fehler: 400 Bad Request

**Status Code:** `400`

**Was bedeutet das?**
- Request-Body ist falsch formatiert
- Fehlende erforderliche Parameter
- Ungültige Werte

**Lösung:**
- Prüfe ob JSON korrekt formatiert ist
- Prüfe ob alle erforderlichen Felder vorhanden sind (z.B. `action`, `clubPoolsUrl`)

---

## 💾 Postman Collection (optional)

Du kannst auch eine Postman Collection erstellen, um alle Requests zu speichern:

1. **Collection erstellen:**
   - Klicke auf **"New"** → **"Collection"**
   - Name: "nuLiga Import APIs"

2. **Requests hinzufügen:**
   - Erstelle die Requests wie oben beschrieben
   - Ziehe sie in die Collection

3. **Speichern:**
   - Collection wird automatisch gespeichert
   - Du kannst sie später wieder verwenden

---

## 📝 Hinweise

- **`apply: false`** = Dry-Run (keine DB-Writes, nur Review)
- **`apply: true`** = DB-Import (noch nicht implementiert in neuen APIs)
- Alle Requests sind **POST** Requests
- Alle Bodies müssen **JSON** sein
- Headers: `Content-Type: application/json` ist erforderlich

---

## 🔗 Alternative URLs zum Testen

Falls die neuen APIs nicht funktionieren (404), nutze die **alten APIs**:

**Alte Club-Rosters API:**
```
POST https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters
Body:
{
  "clubPoolsUrl": "https://tvm.liga.nu/.../clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

---

## ✅ Checkliste vor dem Testen

- [ ] Postman installiert und geöffnet
- [ ] Internet-Verbindung vorhanden
- [ ] URL korrekt kopiert
- [ ] Methode = POST
- [ ] Headers gesetzt (Content-Type: application/json)
- [ ] Body = raw JSON
- [ ] JSON korrekt formatiert (Kommas, Anführungszeichen)

Viel Erfolg beim Testen! 🚀

