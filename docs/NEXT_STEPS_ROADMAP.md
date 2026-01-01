# 🚀 Nächste Schritte - Roadmap

## ✅ Abgeschlossen

1. ✅ **Club-Name DB-Implementierung** - Club-Name wird jetzt aus Datenbank geladen
2. ✅ **Vercel Function Limit** - Test-Function entfernt (13 → 12 Functions)

---

## 🎯 Aktueller Status

### Functions: 12/12 (exakt am Limit) ✅
### Club-Name: Implementiert (aus DB laden) ✅
### API-Test: Vorbereitet (noch nicht getestet) ⏳

---

## 📋 Nächste Schritte (Priorisiert)

### 1. ⚡ SOFORT: Git Commit & Deployment

**Aktion:**
```bash
git add api/test-openai.js
git commit -m "Remove test-openai.js to stay within Vercel limit (13→12 functions)"
git push
```

**Warum:** Deployment wird jetzt funktionieren (12 Functions = exakt am Limit)

---

### 2. 🧪 API-Test: Club-Name DB-Loading testen

**Was testen:**
- Club-Name wird aus Datenbank geladen (statt `null`)
- Fallback funktioniert (wenn Club nicht in DB)

**Test-Command:** Siehe `docs/TEST_CLUB_NAME_DB.md`

**Browser Console:**
```javascript
fetch('https://tennis-team-gamma.vercel.app/api/import/parse-club-rosters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clubPoolsUrl: 'https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154',
    targetSeason: 'Winter 2025/2026',
    apply: false
  })
})
.then(response => response.json())
.then(data => {
  console.log('📊 Club-Daten:', {
    clubNumber: data.clubNumber,
    clubName: data.clubName,  // <-- SOLLTE JETZT AUS DB KOMMEN!
    teamsCount: data.teams?.length || 0
  });
  if (data.clubName) {
    alert(`✅ Club-Name: "${data.clubName}" (Club-Nr: ${data.clubNumber})`);
  } else {
    alert(`⚠️ Club-Name ist null`);
  }
})
.catch(error => console.error('❌ FEHLER:', error));
```

**Erwartung:** `clubName` sollte jetzt aus DB geladen werden (z.B. "VKC Köln" statt `null`)

---

### 3. 🔍 Optionale Verbesserungen

#### A) Weitere Functions reduzieren (optional)

**Kandidaten zum Prüfen:**
- `meeting-report.js` - Wird genutzt (behalten)
- `team-portrait.js` - Wird genutzt (behalten)
- `parse-team-roster.js` - Wird noch genutzt, aber veraltet (später refactoren)
- `scrape-nuliga.js` - Wird noch genutzt, aber veraltet (später refactoren)

**Ergebnis:** Mehr Platz für neue Functions

---

#### B) Neue APIs deployen (nach Refactoring)

**Warten bis:**
- Alte Functions refactored sind
- Platz vorhanden ist (unter 12 Functions)

**Neue APIs:**
- `nuliga-club-import.js` (noch nicht deployed, 404)
- `nuliga-matches-import.js` (noch nicht deployed, 404)

---

## 🎯 Empfohlene Reihenfolge

1. **Git Commit** → Deployment funktioniert
2. **API-Test** → Club-Name DB-Loading verifizieren
3. **Weiterarbeiten** → Basierend auf Testergebnissen

---

## 📝 Dokumentation

Alle Details in:
- `docs/TEST_CLUB_NAME_DB.md` - Quick-Test für Club-Name
- `docs/POSTMAN_CLUB_NAME_TEST.md` - Detaillierte Test-Anleitung
- `docs/VERCEL_FUNCTION_REDUCTION_PLAN.md` - Function-Reduktion Details
- `docs/API_TESTING_NEXT_STEPS.md` - API-Testing Übersicht

