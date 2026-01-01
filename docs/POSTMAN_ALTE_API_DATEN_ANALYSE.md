# 📮 Postman Requests - Alte API (funktioniert garantiert)

## ✅ Diese API funktioniert jetzt!

Die neue API ist noch nicht deployed (404-Fehler).  
**Nutze die alte API** - sie liefert die gleichen Daten!

---

## 🔵 Request 1: Club-Rosters laden (vollständige Daten)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Was du sehen wirst:**
- ✅ Club-Nummer und Name
- ✅ Alle Teams für die Saison
- ✅ Vollständige Meldelisten (Name, TVM-ID, LK, Geburtsjahr, Rang)
- ✅ Matching-Ergebnisse (welche Spieler wurden in DB gefunden?)
- ✅ Match-Typ: `tvm_id`, `exact`, `fuzzy`, `none`
- ✅ Confidence-Wert (0-100%)
- ✅ App-Account-Status (`hasUserAccount`)

**Erwartete Antwort-Struktur:**
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
      "playerCount": 32,
      "roster": [
        {
          "rank": 1,
          "teamNumber": 1,
          "name": "Meuser, Gary",
          "lk": "LK10,4",
          "tvmId": "17104633",
          "birthYear": 1971,
          "singles": null,
          "doubles": null,
          "total": null
        }
      ]
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
            "name": "Meuser, Gary",
            "tvmId": "17104633",
            "lk": "LK10,4",
            "birthYear": 1971
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

## 🔵 Request 2: Einzelnes Team-Roster laden

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/parse-team-roster`

**Body (raw JSON):**
```json
{
  "teamPortraitUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=...",
  "teamId": "optional-team-uuid",
  "season": "Winter 2025/2026",
  "apply": false
}
```

**Hinweis:** Du benötigst die `teamPortraitUrl` von einem Team. Diese findest du in der Response von Request 1 unter `teams[].teamUrl`.

---

## 🔵 Request 3: Liga-Scraper (Gruppen & Matches)

**Methode:** `POST`  
**URL:** `https://tennis-team-gamma.vercel.app/api/import/scrape-nuliga`

**Body (raw JSON):**
```json
{
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groups": "43,46",
  "apply": false,
  "includeMatches": true
}
```

**Was du sehen wirst:**
- ✅ Alle Gruppen in der Liga
- ✅ Match-Ergebnisse
- ✅ Spieltage
- ✅ Tabellen (Platzierung, Punkte)

---

## 📊 Was du analysieren kannst

### 1. Daten-Vollständigkeit aus nuLiga

**Prüfe in der Response:**
- ✅ Werden alle Teams erkannt? (`teams[]`)
- ✅ Sind alle Spieler in den Meldelisten? (`roster[]`)
- ✅ Welche Felder werden extrahiert? (Name, TVM-ID, LK, Geburtsjahr, Rang)
- ✅ Fehlen Daten? (z.B. `singles: null`, `doubles: null` - sind das fehlende Daten?)
- ✅ Gibt es Format-Unterschiede zwischen Teams?

### 2. Matching-Qualität

**Prüfe in `matchingResults[]`:**
- ✅ Wie viele Spieler werden gematcht? (`matchResult.playerId !== null`)
- ✅ Welche Match-Typen dominieren?
  - `tvm_id`: Sehr sicher (TVM-ID Match)
  - `exact`: Sehr sicher (Exakter Name-Match)
  - `fuzzy`: Unsicher (Ähnlicher Name)
  - `none`: Kein Match
- ✅ Wie viele Fuzzy-Matches gibt es? (können optimiert werden)
- ✅ Wie viele Spieler mit App-Account? (`hasUserAccount: true`)

### 3. Daten-Struktur

**Fragen:**
- ✅ Sind die Daten konsistent zwischen Teams?
- ✅ Gibt es Format-Unterschiede?
  - Namen: "Nachname, Vorname" vs. "Vorname Nachname"?
  - LK: "LK10,4" vs. "10.4" vs. "10,4"?
  - Geburtsjahr: Immer vorhanden?
- ✅ Welche zusätzlichen Daten könnten wir nutzen?
  - `singles`, `doubles`, `total`: Werden diese in nuLiga angezeigt, aber nicht extrahiert?
  - Team-Nummer: Wird `teamNumber` korrekt erkannt?

### 4. Optimierungs-Potenzial

**Mögliche Verbesserungen:**
- ✅ Können wir mehr Daten extrahieren? (z.B. Spielstatistiken)
- ✅ Können wir das Matching verbessern? (z.B. bessere Fuzzy-Match-Algorithmen)
- ✅ Können wir Daten normalisieren? (z.B. LK-Format vereinheitlichen)

---

## 🎯 Empfohlene Test-Reihenfolge

### Schritt 1: Vollständige Club-Analyse (30-60 Sekunden)

Teste Request 1 mit verschiedenen Clubs:

**VKC Köln:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**TC RW Leverkusen:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=35759",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Vergleiche die Responses:**
- Sind die Daten-Strukturen identisch?
- Gibt es Unterschiede in der Daten-Qualität?

### Schritt 2: Liga-Daten analysieren

Teste Request 3 mit verschiedenen Ligen:
- Welche Daten werden extrahiert?
- Wie vollständig sind die Match-Ergebnisse?
- Wie sind die Tabellen strukturiert?

---

## 💡 Tipps für die Analyse

### 1. Nutze Pretty-Print in Postman
- Klicke auf **"Pretty"** in der Response-Ansicht
- So siehst du die JSON-Struktur besser

### 2. Speichere die Responses
- Klicke auf **"Save Response"**
- So kannst du später vergleichen

### 3. Nutze die Browser Console
- Öffne Browser Console (F12)
- Sieh Server-Logs für Details

### 4. Teste verschiedene Clubs/Ligen
- Unterschiedliche Quellen haben unterschiedliche Daten-Strukturen
- So findest du potenzielle Probleme

---

## 🔍 Wichtige Felder in der Response

### `rosterPlayer` (aus nuLiga extrahiert):
- `rank`: Rang in der Meldeliste
- `teamNumber`: Mannschaftsnummer (1, 2, 3, etc.)
- `name`: Spieler-Name
- `lk`: Leistungsklasse (z.B. "LK10,4")
- `tvmId`: TVM-ID (eindeutige Spieler-ID)
- `birthYear`: Geburtsjahr
- `singles`, `doubles`, `total`: Spielstatistiken (oft `null`)

### `matchResult` (Matching-Ergebnis):
- `playerId`: UUID des gematchten Spielers (oder `null`)
- `confidence`: Sicherheit (0-100%)
- `matchType`: `tvm_id`, `exact`, `fuzzy`, `none`
- `hasUserAccount`: `true` wenn Spieler App-Account hat

---

## ✅ Diese API funktioniert jetzt!

Die alte API liefert **identische Daten** wie die neue API - nur anders strukturiert.

**Vorteil:** Du kannst sofort analysieren, welche Daten wir von nuLiga bekommen!

Viel Erfolg bei der Daten-Analyse! 🚀

