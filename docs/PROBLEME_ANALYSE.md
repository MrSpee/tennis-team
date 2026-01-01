# 🔍 Probleme-Analyse

## ❌ Gefundene Probleme

### Problem 1: 500 Internal Server Error bei `parse-team-roster`

**Fehler:**
```
POST https://tennis-team-gamma.vercel.app/api/import/parse-team-roster 500 (Internal Server Error)
```

**Ursache:** Unbekannt - muss in Server-Logs geprüft werden

**Betroffen:**
- `autoTeamRosterImportService.js` - Automatischer Import schlägt fehl
- Mehrere Teams betroffen (5b5bc112..., a1404752..., etc.)

---

### Problem 2: RLS (Row-Level Security) Policy Verletzung

**Fehler:**
```
new row violates row-level security policy for table "team_roster"
```

**Ursache:** 
- Frontend versucht direkt in `team_roster` Tabelle zu schreiben
- RLS Policy blockiert das Schreiben (nur Service Role darf schreiben)
- Frontend verwendet Anon Key (normale User-Permissions)

**Betroffen:**
- `autoTeamRosterImportService.js` - Automatischer Import
- Mehrere Teams (44a1d2ab..., dd08f1bb..., 5b5bc112..., a1404752...)

**Lösung:**
- API sollte Service Role verwenden (server-side)
- Oder RLS Policy anpassen (weniger sicher)

---

## 📊 Status: Club-Name Test

**API-Call wurde ausgeführt:**
```javascript
fetch('/api/import/parse-club-rosters', {
  method: 'POST',
  body: JSON.stringify({
    clubPoolsUrl: '...',
    targetSeason: 'Winter 2025/2026',
    apply: false
  })
})
```

**Ergebnis:** Nicht sichtbar in Logs (wartet noch auf Antwort oder Fehler)

---

## 🎯 Nächste Schritte

### Option 1: Probleme beheben (Empfohlen)

1. **parse-team-roster 500 Fehler untersuchen**
   - Server-Logs prüfen
   - Code-Review
   - Fehler beheben

2. **RLS Problem lösen**
   - API sollte Service Role verwenden
   - Oder RLS Policy anpassen

### Option 2: Club-Name Test fortsetzen

- Antwort des `parse-club-rosters` Tests prüfen
- Erwartetes Ergebnis: `clubName` sollte aus DB geladen werden

---

## 🔧 Mögliche Lösungen

### Für Problem 1 (500 Error):

1. **Server-Logs prüfen** (Vercel Dashboard)
2. **Code-Review** von `parse-team-roster.js`
3. **Häufige Ursachen:**
   - Fehlende Environment Variables
   - Datenbank-Verbindungsfehler
   - Syntax-Fehler
   - Missing Dependencies

### Für Problem 2 (RLS):

1. **Service Role in API verwenden** (empfohlen)
2. **RLS Policy anpassen** (weniger sicher)
3. **RPC-Function erstellen** (umgeht RLS)

