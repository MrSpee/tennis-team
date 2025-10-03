# 🔄 Migration zu Supabase - Schritt für Schritt

## Übersicht

Diese Anleitung hilft Ihnen, von **localStorage** (nur lokaler Browser) zu **Supabase** (zentrale Datenbank) zu migrieren.

---

## ✅ Was Sie gewinnen:

- ✅ **Mehrere Nutzer gleichzeitig** - Teammitglieder können parallel arbeiten
- ✅ **Echtzeit-Synchronisation** - Änderungen werden sofort bei allen angezeigt
- ✅ **Sichere Authentifizierung** - Echte Login-System mit E-Mail/Passwort
- ✅ **Datenpersistenz** - Daten bleiben auch nach Browser-Wechsel erhalten
- ✅ **Backup & Recovery** - Automatische Backups durch Supabase
- ✅ **Skalierbar** - Wächst mit Ihrem Team

---

## 🚀 Migration in 5 Schritten (ca. 15 Minuten)

### Schritt 1: Supabase-Projekt erstellen
📖 **Siehe:** `SUPABASE_SETUP.md` - Schritt 1

**Zusammenfassung:**
1. Gehen Sie zu https://supabase.com
2. Erstellen Sie kostenloses Projekt (Name: `tennis-team-organizer`)
3. Kopieren Sie **Project URL** und **anon key**

⏱️ **Dauer:** ~5 Minuten

---

### Schritt 2: Datenbank-Schema einrichten
📖 **Siehe:** `SUPABASE_SETUP.md` - Schritt 2

**Zusammenfassung:**
1. Öffnen Sie **SQL Editor** in Supabase
2. Kopieren Sie `SUPABASE_SCHEMA.sql` komplett
3. Führen Sie SQL aus (▶️ Run)

⏱️ **Dauer:** ~3 Minuten

---

### Schritt 3: Supabase Client installieren

```bash
cd tennis-team
npm install @supabase/supabase-js
```

⏱️ **Dauer:** ~1 Minute

---

### Schritt 4: Umgebungsvariablen konfigurieren

1. Erstellen Sie `.env` Datei im `tennis-team` Ordner:

```bash
cp .env.example .env
```

2. Bearbeiten Sie `.env` und tragen Sie Ihre Keys ein:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ WICHTIG:** Ersetzen Sie die Platzhalter mit Ihren echten Werten aus Schritt 1!

⏱️ **Dauer:** ~2 Minuten

---

### Schritt 5: Supabase-Version aktivieren

Ersetzen Sie den Inhalt von `src/main.jsx`:

**Alt (localStorage):**
```javascript
import App from './App.jsx'
```

**Neu (Supabase):**
```javascript
import App from './App-Supabase.jsx'
```

**Oder verwenden Sie diesen Befehl:**

```bash
cd tennis-team/src
# Backup erstellen
cp main.jsx main.jsx.backup

# main.jsx anpassen
sed -i '' "s/import App from '.\/App.jsx'/import App from '.\/App-Supabase.jsx'/" main.jsx
```

⏱️ **Dauer:** ~1 Minute

---

### Schritt 6: Demo-Accounts erstellen (Optional)

Um die App sofort testen zu können, erstellen Sie Demo-Accounts:

1. Öffnen Sie **SQL Editor** in Supabase
2. Fügen Sie diesen Code ein und führen Sie ihn aus:

```sql
-- Demo Admin Account erstellen
-- E-Mail: admin@tennis.de
-- Passwort: captain123

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tennis.de',
  crypt('captain123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Team Captain"}',
  NOW(),
  NOW()
) RETURNING id;

-- Notieren Sie die ID aus dem Result!
-- Dann fügen Sie den Player-Eintrag hinzu:

INSERT INTO public.players (user_id, name, email, role, points, ranking)
VALUES (
  'HIER_DIE_ID_EINFÜGEN',  -- ID aus dem vorherigen Query
  'Team Captain',
  'admin@tennis.de',
  'captain',
  0,
  'LK 5'
);

-- Demo Spieler Account
-- E-Mail: max@tennis.de
-- Passwort: player123

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'max@tennis.de',
  crypt('player123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Max Müller"}',
  NOW(),
  NOW()
) RETURNING id;

-- Player-Eintrag
INSERT INTO public.players (user_id, name, email, role, points, ranking)
VALUES (
  'HIER_DIE_ID_EINFÜGEN',
  'Max Müller',
  'max@tennis.de',
  'player',
  850,
  'LK 8'
);
```

⏱️ **Dauer:** ~3 Minuten

---

## 🎯 App starten und testen

```bash
cd tennis-team
npm run dev
```

Öffnen Sie http://localhost:3001/

### Login mit Demo-Accounts:

**Admin (Team Captain):**
- E-Mail: `admin@tennis.de`
- Passwort: `captain123`

**Spieler:**
- E-Mail: `max@tennis.de`
- Passwort: `player123`

---

## ✅ Checkliste - Alles funktioniert?

- [ ] ✅ Supabase-Projekt erstellt
- [ ] ✅ SQL-Schema ausgeführt (keine Fehler)
- [ ] ✅ `.env` Datei mit korrekten Keys erstellt
- [ ] ✅ `@supabase/supabase-js` installiert
- [ ] ✅ `main.jsx` auf `App-Supabase.jsx` geändert
- [ ] ✅ Demo-Accounts erstellt (optional)
- [ ] ✅ App startet ohne Fehler
- [ ] ✅ Login funktioniert
- [ ] ✅ Rangliste zeigt echte Spieler
- [ ] ✅ Match-Verfügbarkeit speichern funktioniert
- [ ] ✅ Admin-Panel ist nur für Captain sichtbar

---

## 🔄 Zurück zu localStorage (Rollback)

Falls Sie zurück zur alten Version wollen:

```bash
cd tennis-team/src
cp main.jsx.backup main.jsx
```

Oder manuell in `main.jsx` ändern:
```javascript
import App from './App.jsx'  // Statt App-Supabase.jsx
```

---

## 📊 Daten aus localStorage migrieren (Optional)

Wenn Sie **vorhandene localStorage-Daten** nach Supabase übertragen wollen:

1. Öffnen Sie Browser DevTools (F12)
2. Console → Führen Sie aus:

```javascript
// Alle localStorage-Daten exportieren
const data = {
  players: JSON.parse(localStorage.getItem('players') || '[]'),
  matches: JSON.parse(localStorage.getItem('matches') || '[]'),
  leagueStandings: JSON.parse(localStorage.getItem('leagueStandings') || '[]')
};
console.log(JSON.stringify(data, null, 2));
```

3. Kopieren Sie die Ausgabe
4. Kontaktieren Sie mich für ein Import-Script (zu komplex für manuelle Migration)

---

## 🆘 Probleme?

### "Invalid API key"
- ✅ Prüfen Sie `.env` - Keys korrekt aus Supabase kopiert?
- ✅ Dev-Server neu starten nach `.env` Änderungen

### "Failed to fetch"
- ✅ Ist Ihr Supabase-Projekt aktiv? (grüner Status in Dashboard)
- ✅ Internetverbindung ok?

### "No rows returned"
- ✅ SQL-Schema ausgeführt? (Schritt 2)
- ✅ Demo-Accounts erstellt? (Schritt 6)

### "Permission denied"
- ✅ Row Level Security aktiviert? (im SQL-Schema enthalten)
- ✅ Sind Sie als Captain eingeloggt? (für Admin-Funktionen)

---

## 🎉 Fertig!

Sie haben jetzt eine professionelle Tennis-Team-App mit:
- ✅ Zentraler Datenbank
- ✅ Mehrbenutzer-Unterstützung
- ✅ Echtzeit-Synchronisation
- ✅ Sicherer Authentifizierung
- ✅ Automatischen Backups

**Viel Erfolg mit Ihrer Tennis-Team-Organisation! 🎾**

