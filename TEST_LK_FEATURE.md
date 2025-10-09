# 🧪 Test-Anleitung: LK-Eingabe Feature

## 🎯 Ziel
Teste die neue LK-Eingabe im Onboarding und Profil

---

## ✅ **TEST 1: Neuer User Onboarding**

### Vorbereitung:
1. Öffne Browser: `http://localhost:3001`
2. Falls eingeloggt → Ausloggen
3. Öffne Browser DevTools (F12) → Console Tab

### Schritt-für-Schritt:
```
1. Klicke auf "Registrieren" / "Sign Up"

2. Gib Daten ein:
   - Email: test-lk@example.com
   - Passwort: TestPass123!
   - Bestätige Passwort

3. Klicke "Registrieren"

4. Onboarding sollte starten - Schritt 1:
   ✅ Verein auswählen (z.B. "TC Sürth" oder eigenen)
   ✅ Klicke "Weiter"

5. Schritt 2: Teams auswählen
   ✅ Wähle mindestens 1 Team
   ✅ Klicke "Weiter"

6. Schritt 3: Persönliche Daten
   ✅ Name: Test User
   ✅ Telefon: +49 123 456789 (optional)
   ✅ **LK: LK 12.5** ← DAS TESTEN WIR!
   ✅ Prüfe: Link "TVM-Profilseite" ist da?
   ✅ Klicke Link → öffnet TVM in neuem Tab?
   ✅ Klicke "Weiter"

7. Schritt 4: Zusammenfassung
   ✅ Wird die LK angezeigt? "🏆 LK 12.5"
   ✅ Klicke "Profil erstellen"

8. Dashboard lädt
   ✅ Keine Fehler in Console?
```

### Erwartetes Ergebnis:
- ✅ LK-Feld ist sichtbar und prominent (blauer Rahmen)
- ✅ TVM-Link funktioniert
- ✅ LK wird in Zusammenfassung angezeigt
- ✅ Onboarding erfolgreich abgeschlossen
- ✅ Dashboard lädt ohne Fehler

---

## ✅ **TEST 2: Profil-Bearbeitung**

### Nach erfolgreichem Onboarding:
```
1. Klicke auf Profil-Icon (oben rechts)

2. Scrolle zu "Tennis-Story" Sektion

3. Suche das LK-Feld:
   ✅ "🏆 Aktuelle Leistungsklasse"
   ✅ Zeigt "LK 12.5" an?
   ✅ Link zur TVM-Seite ist da?

4. Klicke "Bearbeiten"

5. Ändere LK:
   - Alt: LK 12.5
   - Neu: LK 13.2

6. Klicke "Speichern"

7. Prüfe:
   ✅ "Erfolgreich gespeichert" erscheint?
   ✅ LK zeigt jetzt "LK 13.2"?
   ✅ Keine Console-Fehler?
```

### Erwartetes Ergebnis:
- ✅ LK-Feld ist editierbar
- ✅ Änderung wird gespeichert
- ✅ Neue LK wird angezeigt

---

## ✅ **TEST 3: Datenbank-Prüfung**

### In Supabase SQL Editor:
```sql
-- Prüfe ob LK gespeichert wurde
SELECT 
  name,
  email,
  current_lk,
  created_at
FROM players
WHERE email = 'test-lk@example.com';
```

### Erwartetes Ergebnis:
```
name          | email                  | current_lk | created_at
Test User     | test-lk@example.com    | LK 13.2    | 2025-10-09...
```

---

## ✅ **TEST 4: Bestehender User**

### Mit bestehendem Account:
```
1. Logge dich mit bestehendem User ein

2. Gehe zu Profil

3. Klicke "Bearbeiten"

4. Scrolle zu LK-Feld

5. Gib LK ein (falls noch nicht vorhanden):
   LK 14.8

6. Speichere

7. Prüfe:
   ✅ LK wird angezeigt?
   ✅ Rankings-Seite zeigt LK?
```

---

## 🐛 **Bekannte Issues / Edge Cases**

### 1. LK-Format:
- ✅ "LK 12.5" → Korrekt
- ✅ "12.5" → Auch OK (könnte normalisiert werden)
- ✅ "LK12.5" → Auch OK
- ⚠️ "ABC" → Sollte funktionieren, aber Warning?

### 2. Ohne LK:
- ✅ Feld ist optional
- ✅ Kann leer bleiben
- ✅ Kein Fehler wenn leer

### 3. TVM-Link:
- ✅ Öffnet in neuem Tab (target="_blank")
- ✅ Korrekte URL: https://tvm-tennis.de/spielbetrieb/

---

## 📊 **Performance / Console Checks**

### Während Tests prüfen:
```javascript
// In Browser Console:

// 1. Check if LK is saved after onboarding
localStorage.getItem('localPlayerData') // Should be null

// 2. Check network requests
// DevTools → Network Tab → Supabase requests
// Should see UPDATE players with current_lk

// 3. Check for errors
// Console should be clean (no red errors)
```

---

## ✅ **Success Criteria**

### Alle Tests bestanden wenn:
- [x] Onboarding zeigt LK-Feld prominent an
- [x] TVM-Link funktioniert und öffnet korrekt
- [x] LK wird in Zusammenfassung angezeigt
- [x] LK wird in Datenbank gespeichert
- [x] Profil zeigt LK an
- [x] Profil kann LK ändern
- [x] Änderungen werden persistiert
- [x] Keine Console-Fehler
- [x] Keine Ladeprobleme

---

## 🔧 **Troubleshooting**

### Problem: "LK wird nicht gespeichert"
```sql
-- Prüfe ob Spalte existiert:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name = 'current_lk';

-- Falls nicht: Spalte erstellen
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_lk VARCHAR(20);
```

### Problem: "TVM-Link funktioniert nicht"
- Prüfe URL: https://tvm-tennis.de/spielbetrieb/
- Sollte in neuem Tab öffnen
- Check DevTools → Console für Blocked Requests

### Problem: "Onboarding hängt"
```javascript
// Browser Console:
localStorage.clear();
location.reload();
```

---

## 📝 **Test-Protokoll**

### Datum: ___________
### Tester: ___________

| Test | Status | Bemerkung |
|------|--------|-----------|
| TEST 1: Onboarding | ⬜ Pass / ⬜ Fail | |
| TEST 2: Profil | ⬜ Pass / ⬜ Fail | |
| TEST 3: Datenbank | ⬜ Pass / ⬜ Fail | |
| TEST 4: Bestehend | ⬜ Pass / ⬜ Fail | |

### Bugs gefunden:
```
1. 
2. 
3. 
```

### Verbesserungsvorschläge:
```
1. 
2. 
3. 
```

---

**Happy Testing! 🎾✨**

