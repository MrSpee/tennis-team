# ⚠️ Vercel Function Limit: 12 Functions Maximum (Hobby Plan)

## 🎯 Problem

**Error:**
```
No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```

**Limit:** Hobby Plan = **12 Serverless Functions maximum**

---

## 📊 Aktuelle Functions-Analyse

### ✅ Alle API-Routen (13 Functions - 1 über Limit!)

```
api/import/
├── bulk-import-club-rosters.js        ✅ GENUTZT (ClubRostersTab)
├── create-player.js                   ✅ GENUTZT
├── find-club-numbers.js               ✅ GENUTZT (ClubRostersTab)
├── meeting-report.js                  ❓ UNKLAR (prüfen)
├── nuliga-club-import.js              ⚠️ NEU (404, noch nicht deployed)
├── nuliga-matches-import.js           ⚠️ NEU (404, noch nicht deployed)
├── parse-club-rosters.js              ✅ GENUTZT (ClubRostersTab - Haupt-API)
├── parse-matches.js                   ✅ GENUTZT (ImportTab, MatchdayImportTab)
├── parse-team-roster.js               ⚠️ VERALTET (noch genutzt: TeamPortraitImportTab, autoTeamRosterImportService)
├── scrape-nuliga.js                   ⚠️ VERALTET (noch genutzt: SuperAdminDashboard, GroupsTab)
└── team-portrait.js                   ❓ UNKLAR (prüfen)

api/standings/
└── get-standings.js                   ✅ GENUTZT

api/
└── test-openai.js                     🗑️ TEST-FUNCTION (kann entfernt werden)

UTILITIES (zählen NICHT als Functions):
├── _lib/supabaseAdmin.js              ✅ UTILITY
└── import/_lib/playerMatcher.js       ✅ UTILITY
```

**GESAMT: 13 Functions → 1 über Limit!**

---

## 🔍 Frage: Betrifft das alle Projekte oder nur ein einzelnes?

**Antwort:** Das Limit gilt **PRO PROJEKT** (nicht global).

- **Hobby Plan:** 12 Functions pro Projekt
- **Pro Plan:** 100 Functions pro Projekt
- **Team:** Pro Plan pro Team-Mitglied

**Wenn du mehrere Vercel-Projekte hast:**
- Jedes Projekt hat sein eigenes Limit von 12 Functions
- Die Functions werden nicht zwischen Projekten geteilt

---

## 💡 Empfehlung: Functions reduzieren

### ✅ Strategie 1: Sofort entfernen (KEIN Risiko)

**Kandidaten zum Entfernen:**

1. 🗑️ **`api/test-openai.js`** → TEST-FUNCTION
   - **Grund:** Nur für Testing, nicht produktiv genutzt
   - **Status:** Nicht im Frontend genutzt
   - **Risiko:** NULL (Test-Function)
   - **Einsparung:** -1 Function → **13 → 12 ✅ LIMIT ERREICHT!**

---

### ⚠️ Strategie 2: Veraltete Functions (ERST NACH REFACTORING)

**Diese Functions werden noch genutzt, aber sollten ersetzt werden:**

2. ⚠️ **`api/import/parse-team-roster.js`** → VERALTET, ABER NOCH GENUTZT
   - **Wird genutzt in:**
     - `src/components/superadmin/TeamPortraitImportTab.jsx`
     - `src/services/autoTeamRosterImportService.js`
   - **Grund:** Wird ersetzt durch `parse-club-rosters.js`
   - **Status:** Noch aktiv genutzt
   - **Risiko:** HOCH (wird noch verwendet!)
   - **Aktion:** Erst refactoren, dann entfernen

3. ⚠️ **`api/import/scrape-nuliga.js`** → VERALTET, ABER NOCH GENUTZT
   - **Wird genutzt in:**
     - `src/components/SuperAdminDashboard.jsx` (3x)
     - `src/components/superadmin/GroupsTab.jsx` (2x)
   - **Grund:** Wird ersetzt durch `nuliga-matches-import.js`
   - **Status:** Noch aktiv genutzt
   - **Risiko:** HOCH (wird noch verwendet!)
   - **Aktion:** Erst refactoren, dann entfernen

**Einsparung (nach Refactoring):** -2 Functions

---

### ❓ Strategie 3: Unklare Functions prüfen

4. ❓ **`api/import/meeting-report.js`** → UNKLAR
   - **Status:** Nicht im Frontend gefunden
   - **Aktion:** Prüfen ob genutzt, sonst entfernen

5. ❓ **`api/import/team-portrait.js`** → UNKLAR
   - **Status:** Nicht im Frontend gefunden
   - **Aktion:** Prüfen ob genutzt, sonst entfernen

---

### Strategie 2: Neue Functions noch nicht deployen

**Kandidaten:**

3. ⚠️ **`api/import/nuliga-club-import.js`** → NOCH NICHT DEPLOYED
   - **Status:** 404-Fehler, noch nicht aktiv
   - **Option:** Erst deployen wenn alte Functions entfernt sind
   - **Risiko:** Kein (ist noch nicht aktiv)

4. ⚠️ **`api/import/nuliga-matches-import.js`** → NOCH NICHT DEPLOYED
   - **Status:** 404-Fehler, noch nicht aktiv
   - **Option:** Erst deployen wenn alte Functions entfernt sind
   - **Risiko:** Kein (ist noch nicht aktiv)

**Warte mit Deployment** bis alte Functions entfernt sind

---

### Strategie 3: Andere API-Routen prüfen

**Mögliche weitere Routes:**

- `api/` Root-Level Routes (falls vorhanden)
- Andere Import-Routes
- Utility-Routes

**Zu prüfen:** Wie viele Functions gibt es insgesamt?

---

## 📋 Empfohlene Vorgehensweise

### Schritt 1: Zählen der aktuellen Functions

```bash
find api -name "*.js" -type f | grep -v "_lib" | wc -l
```

### Schritt 2: Veraltete Functions identifizieren

**Sichere Kandidaten:**
1. `api/import/parse-team-roster.js` → Ersetzt durch `parse-club-rosters.js`
2. `api/import/scrape-nuliga.js` → Ersetzt durch `nuliga-matches-import.js`

### Schritt 3: Prüfen ob noch genutzt

**Suche im Code:**
```bash
grep -r "parse-team-roster" src/
grep -r "scrape-nuliga" src/
```

### Schritt 4: Entfernen (wenn nicht genutzt)

**Vorsicht:** 
- Erst prüfen ob noch genutzt wird
- Backup erstellen (Git)
- Testen nach Entfernen

---

## 🎯 Konkrete Empfehlung (PRIORISIERT)

### ✅ SOFORT (KEIN Risiko):

1. 🗑️ **`api/test-openai.js`** → ENTFERNEN
   - **Grund:** Test-Function, nicht produktiv genutzt
   - **Risiko:** NULL
   - **Aktion:** Einfach löschen
   - **Ergebnis:** 13 → 12 Functions ✅ **LIMIT ERREICHT!**

---

### ⚠️ NÄCHSTE SCHRITTE (nach Test-Removal):

2. ❓ **Prüfen und ggf. entfernen:**
   - `api/import/meeting-report.js` (wenn nicht genutzt)
   - `api/import/team-portrait.js` (wenn nicht genutzt)

3. 🔄 **Refactoring (später):**
   - `parse-team-roster.js` → Ersetzen durch `parse-club-rosters.js`
   - `scrape-nuliga.js` → Ersetzen durch `nuliga-matches-import.js`

4. 🚀 **Neue Functions deployen (nach Refactoring):**
   - `nuliga-club-import.js` (noch nicht deployed)
   - `nuliga-matches-import.js` (noch nicht deployed)

---

## 📊 Erwartete Einsparung

**Aktuell:** **13 Functions** (1 über Limit!)
**Nach sofortiger Entfernung:** **12 Functions** ✅ **LIMIT ERREICHT!**

**Sofort entfernen:**
- `test-openai.js` → -1 ✅

**Später entfernen (nach Refactoring):**
- `parse-team-roster.js` → -1 (wenn durch parse-club-rosters ersetzt)
- `scrape-nuliga.js` → -1 (wenn durch nuliga-matches-import ersetzt)

**Optional prüfen:**
- `meeting-report.js` → -1 (wenn nicht genutzt)
- `team-portrait.js` → -1 (wenn nicht genutzt)

**Ergebnis:** Mindestens 12 Functions (exakt am Limit), potentiell weniger

---

## ⚠️ WICHTIG: Backup & Test

**Vor dem Entfernen:**

1. ✅ **Git Commit** (aktueller Stand)
2. ✅ **Prüfen ob genutzt:** `grep -r "function-name" src/`
3. ✅ **Testen** (nach Entfernen)
4. ✅ **Deployment** testen

**Nach dem Entfernen:**

1. ✅ **Deployment erfolgreich**
2. ✅ **App funktioniert**
3. ✅ **Keine 404-Fehler** für entfernte Functions

---

## 🔄 Alternative: Pro Plan

**Kosten:**
- **Hobby Plan:** $0 (12 Functions)
- **Pro Plan:** $20/Monat (100 Functions)

**Wenn du viele Functions brauchst:** Pro Plan könnte sinnvoll sein

**Aber:** Erst mal Functions reduzieren (spart Geld)

---

## 📝 Checkliste: SOFORT-LÖSUNG

### ✅ Schritt 1: Test-Function entfernen (KEIN Risiko)

- [x] Anzahl Functions gezählt: **13 Functions** (1 über Limit)
- [x] `test-openai.js` identifiziert (Test-Function)
- [ ] **Git Commit** (Backup vor Änderung)
- [ ] `api/test-openai.js` **LÖSCHEN**
- [ ] Testen: `npm run build` (sollte funktionieren)
- [ ] **Deployment** (sollte jetzt funktionieren: 12 Functions ✅)

**Ergebnis:** 13 → 12 Functions (exakt am Limit)

---

### ⚠️ Schritt 2: Optional - Weitere Functions prüfen

- [ ] `meeting-report.js` prüfen: `grep -r "meeting-report" src/`
- [ ] `team-portrait.js` prüfen: `grep -r "team-portrait" src/`
- [ ] Wenn nicht genutzt: Entfernen (spart Platz für neue Functions)

---

### 🔄 Schritt 3: Später - Refactoring (optional)

- [ ] `parse-team-roster.js` → Ersetzen durch `parse-club-rosters.js`
- [ ] `scrape-nuliga.js` → Ersetzen durch `nuliga-matches-import.js`
- [ ] Alte Functions entfernen
- [ ] Neue Functions deployen (`nuliga-club-import`, `nuliga-matches-import`)

