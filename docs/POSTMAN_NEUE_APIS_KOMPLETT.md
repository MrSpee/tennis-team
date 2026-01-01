# 📮 Postman Requests - Neue nuLiga APIs (Komplett)

## 🎯 Ziel: Daten-Struktur von nuLiga analysieren

Diese Requests zeigen dir die **rohen Daten**, die von nuLiga-Seiten kommen, damit du sehen kannst, was wir extrahieren können.

---

## 📋 API 1: nuliga-club-import

### Request 1.1: Club-Info extrahieren

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

**Was du sehen wirst:**
- `clubNumber`: Club-Nummer (z.B. "36154")
- `clubName`: Club-Name (z.B. "VKC Köln")

**Erwartete Antwort:**
```json
{
  "success": true,
  "clubNumber": "36154",
  "clubName": "VKC Köln"
}
```

---

### Request 1.2: Teams auflisten (ohne Meldelisten)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`

**Body (raw JSON):**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**Was du sehen wirst:**
- Liste aller Teams für die Saison
- `contestType`: Altersklasse (z.B. "Herren 40", "Damen 30")
- `teamName`: Team-Name
- `teamUrl`: URL zur Team-Detail-Seite
- `playerCount`: Anzahl Spieler (wird berechnet)

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
      "teamUrl": "https://tvm.liga.nu/...",
      "playerCount": 32
    }
  ],
  "totalTeams": 6
}
```

---

### Request 1.3: Meldelisten mit Matching (Vollständige Analyse)

**⚠️ WICHTIG: Dieser Request dauert 30-60 Sekunden!**

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import`

**Body (raw JSON):**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Was du sehen wirst:**
- Alle Teams mit vollständigen Meldelisten
- Jeder Spieler mit: Name, TVM-ID, LK, Geburtsjahr, Rang
- Matching-Ergebnisse: Welche Spieler wurden in der DB gefunden?
- Match-Typ: `tvm_id`, `exact`, `fuzzy`, `none`
- Confidence-Wert (0-100%)
- App-Account-Status (`hasUserAccount`)

**Erwartete Antwort-Struktur:**
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
      "playerCount": 32
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
            "teamNumber": 1,
            "name": "Meuser, Gary",
            "lk": "LK10,4",
            "tvmId": "17104633",
            "birthYear": 1971,
            "singles": null,
            "doubles": null,
            "total": null
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

## 📋 API 2: nuliga-matches-import

### Request 2.1: Gruppen aus Liga extrahieren

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`

**Body (raw JSON):**
```json
{
  "action": "league-groups",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26"
}
```

**Was du sehen wirst:**
- Liste aller Gruppen in der Liga
- `groupId`: Gruppen-ID (z.B. "43")
- `groupName`: Gruppen-Name (z.B. "Gr. 043")
- `league`: Vollständiger Liga-Name
- `category`: Kategorie (z.B. "Herren 50")
- `matchCount`: Anzahl Matches in der Gruppe
- `standingsCount`: Anzahl Teams in Tabelle

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

### Request 2.2: Gruppen-Details (ohne DB-Write)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`

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

**Was du sehen wirst:**
- Gruppen-Meta-Informationen
- Anzahl Matches
- Anzahl Teams in Tabelle
- Unmapped Teams (Teams die nicht in DB gefunden wurden)

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

### Request 2.3: Match-Ergebnisse (Vollständige Analyse)

**⚠️ WICHTIG: Dieser Request dauert 30-60 Sekunden!**

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import`

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

**Was du sehen wirst:**
- Alle Matches für die angegebenen Gruppen
- Spieltage
- Heim- und Gast-Teams
- Ergebnisse (Einzel, Doppel)
- Tabelle (Platzierung, Punkte, Spiele)
- Unmapped Teams

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
  "groups": [
    {
      "groupId": "43",
      "groupName": "Gr. 043",
      "matches": 42,
      "standings": 4
    }
  ]
}
```

---

## 🔍 Alternative URLs zum Testen

### Verschiedene Clubs:

**VKC Köln (Club 36154):**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

**TC RW Leverkusen (Club 35759):**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=35759"
}
```

**TC GW Königsforst (Club 36074):**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36074"
}
```

---

## 📊 Was du analysieren kannst

### 1. Daten-Vollständigkeit
- Welche Felder werden korrekt extrahiert?
- Fehlen Daten (z.B. Geburtsjahr, LK)?
- Sind alle Teams erkannt?

### 2. Matching-Qualität
- Wie viele Spieler werden korrekt gematcht?
- Welche Match-Typen dominieren?
- Wie viele Fuzzy-Matches gibt es?

### 3. Daten-Struktur
- Sind die Daten konsistent?
- Gibt es Format-Unterschiede zwischen Teams?
- Welche zusätzlichen Daten könnten wir nutzen?

### 4. Performance
- Wie lange dauern die Requests?
- Welche Requests sind am langsamsten?
- Gibt es Timeout-Probleme?

---

## 🎯 Empfohlene Test-Reihenfolge

### Schritt 1: Club-Info (schnell, ~2 Sekunden)
✅ Teste ob API grundsätzlich funktioniert

### Schritt 2: Teams auflisten (~5-10 Sekunden)
✅ Sieh welche Teams verfügbar sind

### Schritt 3: Meldelisten analysieren (~30-60 Sekunden)
✅ Vollständige Daten-Struktur sehen

### Schritt 4: Liga-Gruppen (~5 Sekunden)
✅ Sieh welche Gruppen verfügbar sind

### Schritt 5: Match-Ergebnisse (~30-60 Sekunden)
✅ Vollständige Match-Daten sehen

---

## 💡 Tipps für die Analyse

1. **Nutze die Pretty-Print Funktion in Postman:**
   - Klicke auf "Pretty" in der Response-Ansicht
   - So siehst du die JSON-Struktur besser

2. **Speichere die Responses:**
   - Klicke auf "Save Response"
   - So kannst du später vergleichen

3. **Teste verschiedene Clubs:**
   - Unterschiedliche Clubs haben unterschiedliche Daten-Strukturen
   - So findest du potenzielle Probleme

4. **Prüfe die Console:**
   - Öffne Browser Console (F12)
   - Sieh Server-Logs für Details

---

## 🆘 Falls die neuen APIs nicht funktionieren

Nutze die **alte API** (funktioniert garantiert):

**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters`

**Body:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

Die alte API gibt die gleichen Daten zurück, nur anders strukturiert.

---

Viel Erfolg bei der Daten-Analyse! 🚀

