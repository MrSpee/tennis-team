# Umfassender Cron-Job Plan: Alle Ergebnisse aktuell halten

## 🎯 Ziel

Alle Matchdays haben aktuelle Ergebnisse (`home_score`, `away_score`, `final_score`).

## 🔄 Workflow

```
Matchday ohne Ergebnisse
    ↓
1. meeting_id holen (falls fehlt)
    ↓
2. Ergebnisse holen (basierend auf meeting_id)
    ↓
3. Ergebnisse in DB speichern
```

## 📋 Aktueller Stand

### Schritt 1: meeting_id holen ✅
- **Cron-Job:** `api/cron/update-meeting-ids.js`
- **Status:** Implementiert, läuft alle 2 Tage
- **Funktionalität:** Findet Matchdays ohne `meeting_id`, scraped nuLiga, speichert `meeting_id`

### Schritt 2: Ergebnisse holen ❓
- **Service:** `api/import/meeting-report.js`
- **Service:** `src/services/autoMatchResultImportService.js`
- **Status:** Existiert, aber nicht im Cron-Job integriert
- **Funktionalität:** Holt Ergebnisse basierend auf `meeting_id`

## 🚀 Lösung: Umfassender Cron-Job

### Option 1: Erweitere bestehenden Cron-Job (Empfohlen)

**Datei:** `api/cron/update-meeting-ids.js`

**Workflow:**
1. Finde Matchdays ohne `meeting_id` → Hole `meeting_id`
2. Finde Matchdays mit `meeting_id` aber ohne Ergebnisse → Hole Ergebnisse
3. Alles in einem Durchlauf

**Vorteile:**
- ✅ Ein Cron-Job für alles
- ✅ Logische Abfolge: Erst `meeting_id`, dann Ergebnisse
- ✅ Einfacher zu warten

### Option 2: Zwei separate Cron-Jobs

**Cron-Job 1:** `update-meeting-ids.js` (bleibt wie bisher)
- Läuft: Alle 2 Tage
- Zweck: Nur `meeting_id`s holen

**Cron-Job 2:** `update-match-results.js` (neu)
- Läuft: Täglich
- Zweck: Nur Ergebnisse holen (nutzt bestehende `meeting_id`s)

**Vorteile:**
- ✅ Klare Trennung
- ✅ Ergebnisse können öfter aktualisiert werden
- ✅ Unabhängige Ausführung

## 📊 Empfohlener Plan (Option 1 erweitert)

### Phase 1: Analyse (✅ Fertig)

- [x] Verstehe `meeting-report.js` API
- [x] Verstehe `autoMatchResultImportService.js`
- [x] Verstehe Datenfluss

### Phase 2: Cron-Job erweitern

**Datei:** `api/cron/update-meeting-ids.js` → Umbenennen zu `update-match-results.js`

**Neue Funktionalität:**

```javascript
async function updateMatchResults() {
  // 1. Hole meeting_ids (falls fehlen)
  await updateMeetingIds();
  
  // 2. Hole Ergebnisse für Matchdays mit meeting_id aber ohne Scores
  await updateScores();
  
  // 3. Zusammenfassung
  return summary;
}

async function updateScores() {
  // Finde Matchdays mit meeting_id aber ohne home_score/away_score
  const matchdaysWithMeetingId = await supabase
    .from('matchdays')
    .select('*')
    .not('meeting_id', 'is', null)
    .is('home_score', null)
    .is('away_score', null)
    .lt('match_date', today);
  
  // Für jeden: Rufe meeting-report API auf
  for (const matchday of matchdaysWithMeetingId) {
    await fetchResultsForMatchday(matchday);
  }
}
```

### Phase 3: Integration

**Änderungen:**

1. **Erweitere `updateMeetingIds()` Funktion:**
   - Nenne um zu `updateMatchResults()`
   - Füge `updateScores()` Schritt hinzu

2. **Nutze bestehende `meeting-report.js` API:**
   - Rufe `/api/import/meeting-report` auf
   - Oder: Nutze Logik direkt (besser für Cron-Job)

3. **Update `vercel.json`:**
   - Cron-Job Name bleibt gleich (oder ändern zu `update-match-results`)
   - Häufigkeit: Täglich statt alle 2 Tage (Ergebnisse öfter prüfen)

### Phase 4: Testing

- [ ] Teste lokal
- [ ] Teste auf Production
- [ ] Prüfe Logs
- [ ] Verifiziere Ergebnisse in DB

## 🔍 Technische Details

### Welche API/Service nutzen?

**Option A: API-Aufruf**
```javascript
const response = await fetch(`${process.env.VERCEL_URL}/api/import/meeting-report`, {
  method: 'POST',
  body: JSON.stringify({ meeting_id: matchday.meeting_id })
});
```

**Option B: Direkte Nutzung (Besser)**
```javascript
const { fetchMeetingReport } = require('../import/meeting-report');
const results = await fetchMeetingReport(matchday.meeting_id);
```

### Welche Matchdays sollen verarbeitet werden?

**Kriterien:**
1. ✅ `meeting_id IS NOT NULL` (haben bereits meeting_id)
2. ✅ `home_score IS NULL` ODER `away_score IS NULL` (haben keine Scores)
3. ✅ `match_date < NOW()` (in der Vergangenheit)
4. ✅ `status NOT IN ('cancelled', 'postponed')`

## 📅 Häufigkeit

**Empfehlung:**

- **meeting_id holen:** Alle 2 Tage (seltener, ändert sich nicht so oft)
- **Ergebnisse holen:** Täglich (häufiger, Ergebnisse kommen nach Spielen)

**Oder:** Beides täglich (einfacher, aber mehr Requests)

## 🎯 Nächste Schritte

1. ✅ Analysiere `meeting-report.js` API genauer
2. ✅ Entscheide: Option 1 (erweitert) oder Option 2 (separat)
3. ✅ Implementiere `updateScores()` Funktion
4. ✅ Integriere in Cron-Job
5. ✅ Teste
6. ✅ Deploye

## 📝 Notizen

- `meeting-report.js` nutzt vermutlich `meeting_id` um Ergebnisse von nuLiga zu holen
- `autoMatchResultImportService.js` macht das automatisch für aktuelle Matches
- Cron-Job soll das für alle vergangenen Matches machen

