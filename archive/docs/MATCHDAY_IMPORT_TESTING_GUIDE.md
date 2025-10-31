# Matchday Import System - Testing Guide

## ✅ Status: Bereit für Production-Testing

### Was wurde erstellt:
1. ✅ **SQL-Schema** - `CREATE_MATCHDAY_IMPORT_SYSTEM.sql` ausgeführt
2. ✅ **Fuzzy-Matching Service** - `matchdayImportService.js`
3. ✅ **Review-UI** - `MatchdayImportReview.jsx`
4. ✅ **Parser-API** - Bereits vorhanden (`api/import/parse-matches.js`)

### Was noch zu tun ist:
- **Integration** in `ImportTab.jsx` oder neue Komponente
- **Production-Deployment** für API-Testing

---

## 🚀 Deployment & Testing

### Option 1: Vercel Production Deploy (Empfohlen)

1. **Commit & Push** alle Änderungen:
```bash
git add .
git commit -m "Add Matchday Import System with Fuzzy Matching"
git push
```

2. **Vercel Deploy**:
```bash
# Falls Vercel CLI installiert
vercel deploy --prod

# Oder via GitHub - automatischer Deploy nach Push
```

3. **Environment Variables prüfen**:
   - `OPENAI_API_KEY` muss in Vercel gesetzt sein
   - Supabase Keys müssen vorhanden sein

4. **Test im Production**:
   - Gehe zu `/admin` → Import Tab
   - Nutze das Beispiel-Input (siehe unten)
   - Der neue Workflow sollte automatisch starten

### Option 2: Lokales Testing (Workaround)

Da die API nur in Production läuft, kannst du:

1. **Mock-Parser verwenden** (siehe unten)
2. **Oder**: Supabase Edge Function erstellen statt Vercel

---

## 📝 Integration in ImportTab

Du hast zwei Optionen:

### A) Neuen Button im bestehenden ImportTab

```jsx
// In ImportTab.jsx - füge neuen Button hinzu:
<button onClick={handleMatchdayImport}>
  🎾 Medenspiel-Übersicht importieren
</button>

// Neue Funktion:
const handleMatchdayImport = async () => {
  // 1. Erstelle Session
  // 2. Parse mit API
  // 3. Matching
  // 4. Zeige Review-UI
};
```

### B) Separate Komponente (Empfohlen)

Erstelle eine neue Route `/import-matchdays`:

```jsx
// In App.jsx:
<Route path="/import-matchdays" element={
  <ProtectedRoute>
    <MatchdayImportTab />
  </ProtectedRoute>
} />
```

---

## 🧪 Test-Input (SV Rot-Gelb Sürth)

Kopiere diesen Text in den Import:

```
SV Rot-Gelb Sürth
Stadt Köln
Auf dem Breiten Feld 25
50997 Köln
https://www.rotgelbsuerth.de/

Mannschaftsführer
Becher Daniel (01725305246)

Herren 40 1. Kreisliga Gr. 046
Herren 40 1 (4er)
Tabelle    Spielplan    Meldeliste

Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
05.10.2025, 14:00	TG Leverkusen	TG Leverkusen 2	SV RG Sürth 1	1:5	3:10	42:63	Spielbericht
20.12.2025, 17:00	Tennishalle Köln-Rath	TV Ensen Westhoven 1	SV RG Sürth 1	0:0	0:0	0:0	offen
07.03.2026, 18:00	Marienburger SC	SV RG Sürth 1	TC Colonius 3	0:0	0:0	0:0	offen
21.03.2026, 18:00	Marienburger SC	SV RG Sürth 1	TC Ford Köln 2	0:0	0:0	0:0	offen
```

---

## 🔄 Erwartetes Verhalten

### 1. **Parser-Phase** (API auf Vercel)
- ✅ Erkennt Verein: "SV Rot-Gelb Sürth"
- ✅ Erkennt Mannschaft: "Herren 40 1"
- ✅ Erkennt Liga: "Herren 40 1. Kreisliga Gr. 046"
- ✅ Erkennt 4 Spieltage

### 2. **Fuzzy-Matching-Phase** (Frontend)
- ✅ Club Match: "SV RG Sürth" → "SV Rot-Gelb Sürth" (96%)
- ✅ Team Match: "Herren 40 1" → Team-ID (94%)
- ✅ League Match: Normalisiert Liga-String (88%)

### 3. **Review-UI** (Frontend)
- ✅ Zeigt alle erkannten Entitäten
- ✅ Zeigt alle Fixtures
- ✅ Editierbar vor Commit
- ✅ Validation (Fehler/Warnungen)

### 4. **Commit** (Frontend → Supabase)
- ✅ Erstellt Matchdays in `matchdays` Tabelle
- ✅ Idempotenz-Check (keine Duplikate)
- ✅ Audit Log in `import_logs`

---

## 🐛 Troubleshooting

### Problem: API gibt 404 zurück

**Ursache**: Vercel Function nicht deployed oder falscher Pfad

**Lösung**:
1. Prüfe ob `api/import/parse-matches.js` im Repo ist
2. Prüfe Vercel-Deployment-Logs
3. Teste API direkt: `POST https://your-app.vercel.app/api/import/parse-matches`

### Problem: Fuzzy Matching findet nichts

**Ursache**: Club/Team existiert noch nicht in DB

**Lösung**:
1. In Review-UI manuell zuordnen
2. Oder: Club/Team vorher erstellen

### Problem: Session wird nicht geladen

**Ursache**: RLS-Policies blockieren Zugriff

**Lösung**:
```sql
-- In Supabase SQL Editor:
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import sessions"
ON import_sessions FOR SELECT
USING (auth.uid() = created_by);
```

---

## 📊 Monitoring

Nach dem Import kannst du prüfen:

```sql
-- Alle Import-Sessions
SELECT * FROM import_session_overview
ORDER BY created_at DESC;

-- Entities einer Session
SELECT * FROM import_entities
WHERE session_id = 'session-id';

-- Fixtures einer Session
SELECT * FROM import_fixtures
WHERE session_id = 'session-id'
ORDER BY row_order;

-- Logs
SELECT * FROM import_logs
WHERE session_id = 'session-id'
ORDER BY created_at;
```

---

## ✅ Checkliste vor Production-Test

- [ ] SQL-Schema ausgeführt (`CREATE_MATCHDAY_IMPORT_SYSTEM.sql`)
- [ ] Vercel Deployment erfolgreich
- [ ] `OPENAI_API_KEY` in Vercel gesetzt
- [ ] Frontend-Build erfolgreich
- [ ] ImportTab/Route erstellt oder erweitert
- [ ] Test-Input vorbereitet
- [ ] Database-Backup gemacht (optional, aber empfohlen)

---

## 🎯 Nächste Schritte

1. **Kurze Integration erstellen** (siehe Option A oder B oben)
2. **Deployment** durchführen
3. **Test-Input** verwenden
4. **Ergebnisse prüfen** (Matchdays sollten in DB sein)
5. **Feedback** sammeln und Feinabstimmung

---

Fragen? Schaue in `MATCHDAY_IMPORT_INTEGRATION.md` für Details zur API!


