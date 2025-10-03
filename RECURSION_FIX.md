# 🔧 Infinite Recursion Fix - Endlosschleife behoben!

## ❌ Problem:
```
infinite recursion detected in policy for relation "players"
```

**Ursache:** Die Policy `"Captains can manage all players"` führt zu einer Endlosschleife:

```sql
❌ CREATE POLICY "Captains can manage all players"
    USING (
      EXISTS (
        SELECT 1 FROM public.players  ← Hier!
        WHERE user_id = auth.uid() AND role = 'captain'
      )
    );
```

**Das Problem:**
1. User will Player-Eintrag erstellen
2. Policy prüft: "Ist User ein Captain?"
3. Policy schaut in `players` Tabelle
4. Das triggert wieder die Policy
5. Policy schaut in `players` Tabelle
6. Das triggert wieder die Policy
7. ♾️ **Endlosschleife!**

---

## ✅ Lösung: Policies ohne Rekursion

### Ausführen:

1. **Öffne** Supabase SQL Editor
2. **Kopiere** den kompletten Inhalt aus **`SUPABASE_RLS_FIX_V2.sql`**
3. **Füge ein** und klicke **Run** ▶️
4. ✅ **"Success"**

---

## 📋 Neue Policies (OHNE Rekursion):

### 1. SELECT - Rangliste anzeigen
```sql
✅ "players_select_policy"
   FOR SELECT
   USING (true)
```
→ Jeder kann alle Spieler sehen (für Rangliste)

### 2. INSERT - Registrierung
```sql
✅ "players_insert_policy"
   FOR INSERT
   WITH CHECK (auth.uid() = user_id)
```
→ User kann nur für sich selbst einen Eintrag erstellen

### 3. UPDATE - Profil bearbeiten
```sql
✅ "players_update_policy"
   FOR UPDATE
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id)
```
→ User kann nur sein eigenes Profil ändern

### 4. DELETE - Deaktiviert
```sql
❌ Keine DELETE Policy
```
→ Löschen nur über Supabase Dashboard (manuell)

---

## 🎯 Was ist mit Admin/Captain Rechten?

### Option 1: Captains verwalten über Supabase Dashboard (EMPFOHLEN)
- Captains ändern Spieler-Daten direkt in Supabase
- Keine Rekursion-Probleme
- Sicher und kontrolliert

### Option 2: Separate Admin-API (später)
- Service Role Key verwenden (bypassed RLS)
- Separate Admin-Endpoints
- Nur für Admin-Panel

### Für jetzt: 
**Captains können ihre eigenen Daten ändern + über Supabase Dashboard andere verwalten.**

---

## 🧪 Jetzt testen:

### 1. App öffnen:
```
http://localhost:3000
```

### 2. Registrieren:
- Name: Test Spieler
- Email: spieler@test.de
- Passwort: test123
- Klicke **"Registrieren"**
- ✅ **Sollte jetzt funktionieren!**

### 3. Prüfen in Supabase:
```sql
SELECT * FROM public.players;
```
✅ Neuer Spieler sollte da sein!

### 4. Login testen:
- Email: spieler@test.de
- Passwort: test123
- ✅ Dashboard lädt

### 5. Profil bearbeiten:
- Gehe zu **Profil** (👤)
- Klicke **"Bearbeiten"**
- Ändere LK-Ranking: "LK 10"
- **"Speichern"**
- ✅ Sollte funktionieren

---

## 🔒 Sicherheits-Check:

### ✅ Was funktioniert:
- ✅ Registrierung (neue Spieler)
- ✅ Login
- ✅ Eigenes Profil anzeigen
- ✅ Eigenes Profil bearbeiten
- ✅ Rangliste anzeigen (alle Spieler)

### ❌ Was NICHT geht (und das ist GUT!):
- ❌ Spieler können keine anderen Spieler bearbeiten
- ❌ Spieler können keine Spieler löschen
- ❌ Nicht-authentifizierte User können nichts ändern

### 👑 Captain-Rechte:
**Für jetzt:**
- Captains können über **Supabase Dashboard** andere Spieler verwalten
- Captains können **Team-Setup** in der App machen (separate Tabelle)
- Captains können **Matches** erstellen/löschen

**Später** (wenn nötig):
- Separate Admin-API mit Service Role Key
- Bypass RLS für Admin-Operationen

---

## 🆘 Immer noch Fehler?

### "infinite recursion" immer noch da:
**Lösung:** Cache-Problem. 
1. Stoppe App (Strg+C)
2. Starte neu: `npm run dev`
3. Browser: Strg+Shift+R (Hard Reload)

### "policy does not exist":
**Lösung:** Policies wurden nicht erstellt.
```sql
-- Prüfe:
SELECT * FROM pg_policies WHERE tablename = 'players';
```
Sollte 3 Policies zeigen (select, insert, update).

### "permission denied for table players":
**Lösung:** RLS nicht aktiviert oder Policies fehlen.
```sql
-- Prüfe RLS:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'players';
-- rowsecurity sollte 't' (true) sein
```

Falls `false`:
```sql
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
```

---

## 📝 Zusammenfassung:

### Problem:
```sql
❌ Policy prüft players Tabelle
   → triggert dieselbe Policy
   → prüft players Tabelle
   → triggert dieselbe Policy
   → ♾️ Endlosschleife
```

### Lösung:
```sql
✅ Policies ohne Subqueries auf players Tabelle
   → Nur auth.uid() = user_id prüfen
   → Keine Rekursion möglich
   → Funktioniert!
```

---

**Führen Sie `SUPABASE_RLS_FIX_V2.sql` aus und testen Sie die Registrierung! 🎾**

