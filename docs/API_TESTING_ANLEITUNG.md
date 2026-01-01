# 🧪 API-Testing Anleitung für Nicht-Techniker

## 📋 Übersicht

Diese Anleitung erklärt, wie du die neuen konsolidierten nuLiga-Import-APIs testen kannst. Du brauchst dafür **kein technisches Vorwissen** - wir nutzen nur einen Browser und ein einfaches Tool.

---

## 🛠️ Was du brauchst

1. **Einen Browser** (Chrome, Firefox, Safari, Edge - egal welcher)
2. **Eine nuLiga-URL** (z.B. eine ClubPools- oder LeaguePage-URL)
3. **Optional: Postman** (kostenloses Tool zum Testen von APIs) - aber auch ohne geht es!

---

## 🎯 Option 1: Testen mit dem Browser (Einfachste Methode)

### Schritt 1: Öffne die Entwicklertools

1. Öffne deinen Browser (z.B. Chrome)
2. Drücke **F12** oder **Rechtsklick → "Untersuchen"** (oder "Inspect")
3. Klicke auf den Tab **"Console"** (oder "Konsole")

### Schritt 2: Führe einen API-Test durch

Kopiere folgenden Code in die Console und drücke Enter:

```javascript
// Test 1: Club-Info extrahieren
fetch('https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'club-info',
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154'
  })
})
.then(response => response.json())
.then(data => console.log('✅ Ergebnis:', data))
.catch(error => console.error('❌ Fehler:', error));
```

**Was passiert hier?**
- Die API wird aufgerufen
- Sie extrahiert Club-Info aus der nuLiga-URL
- Das Ergebnis wird in der Console angezeigt

### Schritt 3: Ergebnis interpretieren

Du siehst jetzt etwas wie:

```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

✅ **Erfolg!** Die API funktioniert.

---

## 🎯 Option 2: Testen mit Postman (Empfohlen für detaillierte Tests)

### Schritt 1: Postman installieren

1. Gehe zu: https://www.postman.com/downloads/
2. Lade Postman herunter (kostenlos)
3. Installiere es
4. Erstelle einen kostenlosen Account (optional, aber empfohlen)

### Schritt 2: Erstelle eine neue Request

1. Öffne Postman
2. Klicke auf **"New"** → **"HTTP Request"**
3. Wähle **POST** als Methode aus
4. Gib folgende URL ein:
   ```
   https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import
   ```

### Schritt 3: Body konfigurieren

1. Klicke auf den Tab **"Body"**
2. Wähle **"raw"** aus
3. Wähle **"JSON"** aus dem Dropdown rechts
4. Füge folgenden JSON-Code ein:

```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

### Schritt 4: Request senden

1. Klicke auf **"Send"** (blaue Schaltfläche rechts)
2. Unten siehst du jetzt die Antwort

**Erwartete Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

---

## 📚 Verfügbare API-Endpoints

### API 1: `nuliga-club-import` (Vereine & Teams)

#### 1.1 Club-Info extrahieren

**Action:** `club-info`

**Request:**
```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/.../clubPools?club=36154"
}
```

**Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

---

#### 1.2 Teams extrahieren

**Action:** `teams`

**Request:**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/.../clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**Antwort:**
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

#### 1.3 Meldelisten laden (mit Matching-Review)

**Action:** `roster`

**Request:**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/.../clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Antwort:**
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

**Wichtig:** `apply: false` = Nur Review (keine DB-Writes). `apply: true` = DB-Import (noch nicht implementiert).

---

### API 2: `nuliga-matches-import` (Matches & Gruppen)

#### 2.1 Gruppen aus Liga extrahieren

**Action:** `league-groups`

**Request:**
```json
{
  "action": "league-groups",
  "leagueUrl": "https://tvm.liga.nu/.../leaguePage?championship=...&tab=2",
  "season": "Winter 2025/26"
}
```

**Antwort:**
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

#### 2.2 Gruppen-Details laden

**Action:** `group-details`

**Request:**
```json
{
  "action": "group-details",
  "leagueUrl": "https://tvm.liga.nu/.../leaguePage?championship=...",
  "season": "Winter 2025/26",
  "groupId": "43",
  "apply": false
}
```

**Antwort:**
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

#### 2.3 Match-Ergebnisse aktualisieren

**Action:** `match-results`

**Request:**
```json
{
  "action": "match-results",
  "leagueUrl": "https://tvm.liga.nu/.../leaguePage?championship=...",
  "season": "Winter 2025/26",
  "groups": "43,46",
  "apply": false
}
```

**Antwort:**
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

## 🔍 Häufige Fehler und Lösungen

### Fehler: "404 Not Found"

**Problem:** Die API-URL ist falsch oder die API existiert nicht.

**Lösung:** 
- Überprüfe, ob die URL stimmt: `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`
- Stelle sicher, dass die API deployt wurde

---

### Fehler: "400 Bad Request"

**Problem:** Der Request-Body ist falsch formatiert.

**Lösung:**
- Überprüfe, ob `"action"` korrekt ist (z.B. `"club-info"`, `"teams"`, `"roster"`)
- Überprüfe, ob alle erforderlichen Felder vorhanden sind (z.B. `clubPoolsUrl`)
- Stelle sicher, dass der JSON korrekt formatiert ist (Kommas, Anführungszeichen)

---

### Fehler: "500 Internal Server Error"

**Problem:** Server-Fehler (z.B. nuLiga-Seite nicht erreichbar, Parsing-Fehler).

**Lösung:**
- Überprüfe die Console-Logs im Server (Vercel Dashboard)
- Stelle sicher, dass die nuLiga-URL erreichbar ist
- Versuche es mit einer anderen URL

---

### Fehler: "CORS Error"

**Problem:** Browser blockiert die Anfrage wegen CORS-Richtlinien.

**Lösung:**
- Nutze Postman (umgeht CORS)
- Oder füge einen Browser-Extension hinzu, die CORS umgeht (nur für Tests!)

---

## ✅ Checkliste für erfolgreiche Tests

- [ ] API-URL ist korrekt
- [ ] HTTP-Methode ist `POST`
- [ ] `Content-Type: application/json` Header ist gesetzt
- [ ] Body enthält `action`-Parameter
- [ ] Body enthält alle erforderlichen Felder (z.B. `clubPoolsUrl`)
- [ ] JSON ist korrekt formatiert (keine Syntax-Fehler)
- [ ] nuLiga-URL ist erreichbar

---

## 🎓 Beispiel-Workflow: Vollständiger Test

### 1. Club-Info extrahieren

```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

**→ Erwartung:** Club-Nummer und Club-Name werden zurückgegeben

---

### 2. Teams auflisten

```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**→ Erwartung:** Liste aller Teams mit Spieleranzahl

---

### 3. Meldelisten mit Matching

```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**→ Erwartung:** Meldelisten mit Matching-Ergebnissen (welche Spieler wurden gematcht)

---

## 📞 Hilfe & Support

Wenn etwas nicht funktioniert:

1. **Prüfe die Console-Logs** (F12 → Console)
2. **Prüfe die Network-Tab** (F12 → Network) - siehst du die Request/Response?
3. **Prüfe die Vercel-Logs** (im Vercel Dashboard)

Bei Fragen: Erstelle ein Issue oder kontaktiere den Entwickler.

---

## 🔗 Nützliche Links

- **Postman Download:** https://www.postman.com/downloads/
- **Postman Dokumentation:** https://learning.postman.com/docs/
- **Vercel Dashboard:** https://vercel.com/dashboard

