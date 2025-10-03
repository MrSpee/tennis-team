# 🔧 RLS Policy Fix - Registrierung Problem gelöst!

## ❌ Problem:
```
new row violates row-level security policy for table "players"
```

**Ursache:** Die Row Level Security (RLS) Policy in Supabase erlaubt keine neuen Spieler-Einträge.

---

## ✅ Lösung: Policy anpassen

### Schritt 1: SQL Script ausführen

1. **Öffne** Supabase Dashboard
2. **Gehe zu** SQL Editor (links im Menü)
3. **Neue Query** erstellen
4. **Kopiere** den kompletten Inhalt aus `SUPABASE_RLS_FIX.sql`
5. **Füge ein** in den Editor
6. **Klicke** Run ▶️
7. ✅ **"Success"**

---

## 🔍 Was wurde geändert?

### Vorher (zu restriktiv):
```sql
-- Nur Captains können Spieler erstellen
❌ CREATE POLICY "Captains can insert players"
    ON public.players FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.players 
        WHERE user_id = auth.uid() AND role = 'captain'
      )
    );
```

**Problem:** Neue User haben noch keinen Player-Eintrag → können sich nicht registrieren!

### Nachher (richtig):
```sql
-- Jeder User kann sich selbst als Spieler registrieren
✅ CREATE POLICY "Users can create their own player profile"
    ON public.players FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

**Lösung:** Jeder User kann einen Player-Eintrag für sich selbst erstellen!

---

## 📋 Alle Policies für `players` Tabelle:

### 1. INSERT (Registrierung)
```sql
✅ "Users can create their own player profile"
   → Jeder kann sich registrieren
```

### 2. SELECT (Rangliste anzeigen)
```sql
✅ "Anyone can view players"
   → Alle können alle Spieler sehen
```

### 3. UPDATE (Profil bearbeiten)
```sql
✅ "Players can update own profile"
   → Spieler können ihr eigenes Profil ändern
```

### 4. ALL (Admin-Funktionen)
```sql
✅ "Captains can manage all players"
   → Captains können alle Spieler verwalten
```

---

## 🧪 Nach dem Fix testen:

### 1. In der App:
```bash
# Falls Server läuft, einfach weitermachen
# Sonst starten:
npm run dev
```

### 2. Registrierung testen:
1. Öffne http://localhost:3000
2. Klicke **"Neuen Account erstellen"**
3. Fülle aus:
   - Name: Test User
   - Email: test@example.com
   - Passwort: test123
   - Optional: Telefon, LK
4. Klicke **"Registrieren"**
5. ✅ **Sollte jetzt funktionieren!**

### 3. In Supabase prüfen:
```sql
-- Im SQL Editor:
SELECT * FROM public.players;
```
✅ Dein neuer Spieler sollte da sein!

### 4. In der App prüfen:
1. Login mit test@example.com / test123
2. Gehe zu **Rangliste**
3. ✅ Du solltest in der Liste sein!

---

## 🆘 Immer noch Fehler?

### Fehler: "policy already exists"
**Lösung:** Das Script enthält `DROP POLICY IF EXISTS` - führe es einfach nochmal aus.

### Fehler: "permission denied"
**Lösung:** Du bist nicht als Owner eingeloggt. Prüfe:
1. Supabase Dashboard
2. Settings → Database
3. Du solltest als Owner angemeldet sein

### Fehler: "table players does not exist"
**Lösung:** Führe zuerst das komplette Schema aus:
1. Öffne `SUPABASE_SCHEMA.sql`
2. Führe es im SQL Editor aus
3. Dann `SUPABASE_RLS_FIX.sql`

### Fehler: "still violates row-level security"
**Lösung:** Prüfe die Policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'players';
```

Sollte mindestens diese Policy enthalten:
- `"Users can create their own player profile"` mit `cmd = 'INSERT'`

Falls nicht, führe das Fix-Script nochmal aus.

---

## 🔒 Sicherheits-Check:

### ✅ Was ist erlaubt:
- ✅ Jeder kann sich selbst registrieren
- ✅ Jeder kann alle Spieler sehen (Rangliste)
- ✅ Spieler können nur ihr eigenes Profil ändern
- ✅ Captains können alle Spieler verwalten

### ❌ Was ist NICHT erlaubt:
- ❌ Spieler können keine anderen Spieler bearbeiten
- ❌ Spieler können keine anderen Spieler löschen
- ❌ Nicht-authentifizierte User können nichts ändern

**Das ist sicher! ✅**

---

## 📚 Weitere Infos:

### Was ist Row Level Security?
RLS ist eine PostgreSQL-Feature, das Supabase nutzt:
- Jede Zeile kann eigene Zugriffsregeln haben
- User sehen/ändern nur, was sie dürfen
- Sehr sicher, direkt in der Datenbank

### Warum war die alte Policy falsch?
```sql
❌ CREATE POLICY "Captains can insert players"
```

Das bedeutete:
1. User will sich registrieren
2. System erstellt Auth-User in `auth.users`
3. App will Player-Eintrag erstellen in `public.players`
4. Policy prüft: "Ist dieser User ein Captain?"
5. **Problem:** User hat noch keinen Player-Eintrag → kann kein Captain sein!
6. ❌ Policy verweigert Zugriff

### Die neue Policy:
```sql
✅ WITH CHECK (auth.uid() = user_id)
```

Das bedeutet:
1. User will Player-Eintrag erstellen
2. Policy prüft: "Erstellt er den Eintrag für sich selbst?"
3. ✅ Ja → erlaubt!

---

**Führen Sie jetzt `SUPABASE_RLS_FIX.sql` aus und testen Sie die Registrierung! 🎾**

