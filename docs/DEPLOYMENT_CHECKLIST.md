# ✅ Deployment-Checklist: Cron-Job Update

## 🔍 Pre-Deployment Checks

- [x] **Syntax-Check:** ✅ Keine Fehler
- [x] **Linter-Check:** ✅ Keine Fehler
- [x] **Funktionen vorhanden:** ✅ updateScores(), updateMeetingIds()
- [x] **BASE_URL definiert:** ✅ Am Anfang von updateMeetingIds()
- [x] **Code-Struktur:** ✅ Korrekt (keine doppelten returns/catches)
- [x] **Cron-Schedule:** ✅ Stündlich (0 * * * *)
- [x] **Batch-Größe:** ✅ 5 Matchdays

## 📝 Änderungen

### Dateien geändert:
1. **api/cron/update-meeting-ids.js**
   - updateScores() Funktion hinzugefügt (206 Zeilen)
   - BASE_URL Definition hinzugefügt
   - Code-Struktur korrigiert
   - Batch-Größe: 50 → 5 Matchdays

2. **vercel.json**
   - Cron-Schedule: `0 14 */2 * *` → `0 * * * *` (stündlich)

### Neue Dokumentation:
- docs/CRON_JOB_FIXES_ERKLAERUNG.md
- docs/CRON_JOB_TEST_ANLEITUNG.md
- docs/CRON_JOB_DETAILANALYSE.md

## 🚀 Deployment-Schritte

### 1. Änderungen committen
```bash
git add .
git commit -m "Cron-Job erweitert: meeting_ids + Ergebnisse (5 Matchdays, stündlich)"
```

### 2. Deployment auf Vercel
```bash
git push
```

### 3. Nach Deployment prüfen

#### a) Vercel Dashboard
- Gehe zu: https://vercel.com/dashboard
- Wähle Projekt
- Prüfe "Deployments" → Neuestes Deployment

#### b) Vercel Logs prüfen
- Gehe zu "Functions" → `/api/cron/update-meeting-ids`
- Prüfe ob Cron-Job läuft (warte bis zur nächsten Stunde oder teste manuell)

#### c) Manueller Test (optional)
```bash
curl -X POST https://[deine-domain]/api/cron/update-meeting-ids
```

## ✅ Post-Deployment Checks

Nach dem ersten Cron-Job Lauf:

- [ ] **Logs prüfen:** Cron-Job wurde ausgeführt
- [ ] **Erfolgreich:** "Cron Job gestartet" in Logs
- [ ] **Keine kritischen Fehler:** Erfolgs-Rate > 80%
- [ ] **Datenbank-Check:** meeting_ids werden aktualisiert
- [ ] **Datenbank-Check:** Ergebnisse werden importiert

## 📊 Erwartete Ergebnisse

### Erster Run (nach Deployment):
- **meeting_ids:** 0-5 aktualisiert (je nachdem wie viele fehlen)
- **Ergebnisse:** 0-5 importiert (je nachdem wie viele verfügbar sind)
- **Fehler:** 0-2 nicht-kritische Fehler (MEETING_NOT_FOUND) = OK

### Nach 24 Stunden (24 Runs):
- **meeting_ids:** ~60-120 aktualisiert (wenn viele fehlen)
- **Ergebnisse:** ~60-120 importiert (wenn viele verfügbar sind)

## ⚠️ Mögliche Probleme

### Problem 1: "Keine Matchdays gefunden"
**Bedeutung:** Normal, wenn alle bereits `meeting_id`s/Ergebnisse haben
**Lösung:** Keine Aktion nötig

### Problem 2: "MEETING_NOT_FOUND" Fehler
**Bedeutung:** Normal, Meeting-Report noch nicht verfügbar
**Lösung:** Wird bei nächstem Lauf erneut versucht

### Problem 3: Viele kritische Fehler (> 5)
**Bedeutung:** Problem! Muss untersucht werden
**Lösung:** Logs prüfen, Fehler analysieren

## 📝 Notizen

- Cron-Job läuft **stündlich** (24x pro Tag)
- Jeder Run verarbeitet **max. 5 Matchdays**
- Ausführungszeit: **~15-35 Sekunden** pro Run
- Funktionen-Limit: **12/12** (bleibt gleich)

