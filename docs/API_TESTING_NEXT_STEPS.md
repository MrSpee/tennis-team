# 🚀 Nächste Schritte: API-Testing

## ✅ Abgeschlossen

1. ✅ **Club-Name DB-Implementierung**
   - Club-Name wird jetzt aus Datenbank geladen (über `club_number`)
   - Fallback auf HTML-Parsing (falls nicht in DB)

---

## 🧪 Aktueller Test: Club-Name DB-Loading

**Datei:** `docs/POSTMAN_CLUB_NAME_TEST.md`

**Was testen:**
- Club-Name wird aus DB geladen (statt `null`)
- Console-Logs zeigen DB-Loading
- Fallback funktioniert (wenn Club nicht in DB)

**Test-Command:**
```javascript
// Siehe docs/POSTMAN_CLUB_NAME_TEST.md
```

---

## 📋 Nächste API-Calls zum Überprüfen

### 1. Vollständiger Import mit `apply: true`

**Was testen:**
- Daten werden in DB geschrieben
- Teams werden erstellt
- Meldelisten werden gespeichert
- Club-Nummer wird gespeichert

**Request:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": true,
  "clubId": "optional-club-id-if-known"
}
```

**Erwartung:**
- `savedRosters` Array mit gespeicherten Meldelisten
- Teams werden automatisch erstellt (falls nicht vorhanden)
- Club-Nummer wird in `team_info` gespeichert

---

### 2. Neue konsolidierte API: `nuliga-club-import`

**Status:** ⚠️ Aktuell 404 (noch nicht deployed)

**Action: `club-info`**
```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

**Action: `teams`**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

**Action: `roster`**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**Warte auf:** Deployment der neuen APIs

---

### 3. Neue konsolidierte API: `nuliga-matches-import`

**Status:** ⚠️ Aktuell 404 (noch nicht deployed)

**Action: `league-groups`**
```json
{
  "action": "league-groups",
  "leagueUrl": "https://tvm.liga.nu/..."
}
```

**Warte auf:** Deployment der neuen APIs

---

## 🎯 Prioritäten

1. **✅ JETZT:** Club-Name DB-Test (`parse-club-rosters` mit `apply: false`)
2. **NÄCHST:** Vollständiger Import-Test (`parse-club-rosters` mit `apply: true`)
3. **SPÄTER:** Neue konsolidierte APIs (nach Deployment)

---

## 📝 Notizen

- **Alte API funktioniert:** `parse-club-rosters` ist vollständig funktional
- **Neue APIs:** Warten auf Deployment (404-Error)
- **Club-Name:** Jetzt aus DB geladen (neue Implementierung)

