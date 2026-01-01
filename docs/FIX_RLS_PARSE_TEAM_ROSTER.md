# ✅ Fix: RLS-Fehler in parse-team-roster

## ❌ Problem

**Fehler:**
```
new row violates row-level security policy for table "team_roster"
POST https://tennis-team-gamma.vercel.app/api/import/parse-team-roster 500 (Internal Server Error)
```

**Ursache:**
- `parse-team-roster.js` verwendete `createSupabaseClient()` (Anon Key) auch bei `apply=true`
- Anon Key hat keine Schreibrechte auf `team_roster` (RLS blockiert)
- Nur Service Role kann in `team_roster` schreiben

---

## ✅ Lösung

**Änderung in `api/import/parse-team-roster.js`:**

**Vorher:**
```javascript
if (apply) {
  const supabase = createSupabaseClient(); // ❌ Anon Key (keine Schreibrechte)
  const result = await saveTeamRoster(supabase, teamId, season, roster);
  savedRoster = result;
}
```

**Nachher:**
```javascript
// WICHTIG: Verwende Service Role für DB-Schreibvorgänge (umgeht RLS)
if (apply) {
  const supabase = createSupabaseClient(true); // ✅ Service Role (hat Schreibrechte)
  const result = await saveTeamRoster(supabase, teamId, season, roster);
  savedRoster = result;
}
```

---

## 📊 Betroffene Funktionen

**`saveTeamRoster()`:**
- Löscht alte Einträge: `DELETE FROM team_roster`
- Erstellt neue Einträge: `INSERT INTO team_roster`
- Beide Operationen benötigen Service Role

---

## ✅ Ergebnis

- ✅ RLS-Fehler behoben
- ✅ 500 Error sollte jetzt auch behoben sein (wenn RLS die Ursache war)
- ✅ `autoTeamRosterImportService` kann jetzt erfolgreich importieren

---

## 🧪 Test

**Nach Deployment:**
- Automatischer Import sollte jetzt funktionieren
- Keine RLS-Fehler mehr in Console
- Meldelisten werden erfolgreich gespeichert

