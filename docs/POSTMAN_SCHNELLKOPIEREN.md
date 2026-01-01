# 📋 Postman Requests - Schnell kopieren

## ⚡ Sofort verwendbare Requests

Kopiere diese Requests direkt in Postman!

---

## 🔵 API 1: Club-Info (schnell)

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import
```

**Body:**
```json
{
  "action": "club-info",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154"
}
```

---

## 🔵 API 2: Teams auflisten - ⚠️ Noch nicht deployed

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import
```

**Body:**
```json
{
  "action": "teams",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026"
}
```

---

## 🔵 API 3: Meldelisten (vollständig, dauert 30-60s) - ⚠️ Noch nicht deployed

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-club-import
```

**Body:**
```json
{
  "action": "roster",
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

---

## 🟢 API 4: Liga-Gruppen - ⚠️ Noch nicht deployed

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import
```

**Body:**
```json
{
  "action": "league-groups",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26"
}
```

---

## 🟢 API 5: Gruppen-Details - ⚠️ Noch nicht deployed

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import
```

**Body:**
```json
{
  "action": "group-details",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groupId": "43",
  "apply": false
}
```

---

## 🟢 API 6: Match-Ergebnisse (vollständig, dauert 30-60s) - ⚠️ Noch nicht deployed

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/nuliga-matches-import
```

**Body:**
```json
{
  "action": "match-results",
  "leagueUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/leaguePage?championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&tab=2",
  "season": "Winter 2025/26",
  "groups": "43,46",
  "apply": false
}
```

---

## ⚠️ WICHTIG: Header setzen!

In Postman:
1. Tab "Headers" öffnen
2. Key: `Content-Type`
3. Value: `application/json`
4. Tab "Body" öffnen
5. "raw" auswählen
6. "JSON" auswählen (Dropdown rechts)
7. Body oben einfügen

---

## ⚠️ WICHTIG: Neue APIs noch nicht deployed!

Wenn du einen **404-Fehler** bekommst, nutze die **alte API** (funktioniert garantiert):

---

## 🔄 Alte API (funktioniert garantiert - NUTZE DIESE!)

**URL:**
```
POST https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters
```

**Body:**
```json
{
  "clubPoolsUrl": "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154",
  "targetSeason": "Winter 2025/2026",
  "apply": false
}
```

**✅ Diese API liefert die gleichen Daten wie die neuen APIs!**

**Was du siehst:**
- Club-Nummer und Name
- Alle Teams mit vollständigen Meldelisten
- Matching-Ergebnisse (welche Spieler wurden in DB gefunden?)
- Match-Typen: `tvm_id`, `exact`, `fuzzy`, `none`
- Confidence-Werte und App-Account-Status

**📊 Vollständige Analyse-Dokumentation:** Siehe `docs/POSTMAN_ALTE_API_DATEN_ANALYSE.md`

