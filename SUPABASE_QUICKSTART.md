# ⚡ Supabase Schnellstart - 10 Minuten Setup

## 🎯 Ziel
Ihre Tennis-App von localStorage auf Supabase migrieren - in 10 Minuten!

---

## 📋 Voraussetzungen
- [ ] GitHub- oder Google-Account (für Supabase-Anmeldung)
- [ ] Node.js und npm installiert
- [ ] Terminal/Kommandozeile geöffnet

---

## 🚀 Los geht's!

### 1️⃣ Supabase-Projekt erstellen (3 Min)

1. **Öffnen Sie:** https://supabase.com
2. **Klicken Sie:** "Start your project"
3. **Melden Sie sich an** mit GitHub oder Google
4. **Klicken Sie:** "New Project"
5. **Füllen Sie aus:**
   - Name: `tennis-team-organizer`
   - Database Password: (generiert - kopieren Sie es!)
   - Region: `Frankfurt (eu-central-1)`
   - Plan: `Free`
6. **Klicken Sie:** "Create new project"
7. ⏳ **Warten Sie** ~2 Minuten

---

### 2️⃣ Keys kopieren (1 Min)

1. **Gehen Sie zu:** Settings ⚙️ (links unten)
2. **Klicken Sie:** API
3. **Kopieren Sie** (beide Werte):
   - ✅ Project URL
   - ✅ anon/public key

**💾 Bewahren Sie diese auf - Sie brauchen sie gleich!**

---

### 3️⃣ Datenbank einrichten (2 Min)

1. **Klicken Sie:** SQL Editor 🗄️ (links im Menü)
2. **Klicken Sie:** "New Query"
3. **Öffnen Sie** die Datei `SUPABASE_SCHEMA.sql` in Ihrem Editor
4. **Kopieren Sie** den KOMPLETTEN Inhalt
5. **Fügen Sie ihn ein** im SQL Editor
6. **Klicken Sie:** Run ▶️
7. ✅ **Erwartung:** "Success. No rows returned"

---

### 4️⃣ App konfigurieren (3 Min)

**Terminal öffnen:**

```bash
# In den Projekt-Ordner wechseln
cd tennis-team

# Supabase installieren
npm install @supabase/supabase-js

# .env Datei erstellen
cat > .env << 'EOF'
VITE_SUPABASE_URL=IHRE_PROJECT_URL_HIER
VITE_SUPABASE_ANON_KEY=IHR_ANON_KEY_HIER
EOF
```

**⚠️ WICHTIG:** Öffnen Sie jetzt die `.env` Datei und ersetzen Sie die Platzhalter mit Ihren echten Werten aus Schritt 2!

```bash
# .env mit Ihrem Editor öffnen
nano .env
# oder
code .env
```

Ersetzen Sie:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Speichern und schließen.

---

### 5️⃣ Supabase-Version aktivieren (1 Min)

Ersetzen Sie in `src/main.jsx` die Import-Zeile:

**Vorher:**
```javascript
import App from './App.jsx'
```

**Nachher:**
```javascript
import App from './App-Supabase.jsx'
```

**Oder verwenden Sie diesen Befehl:**

```bash
# Automatisch ändern
sed -i '' "s/import App from '.\/App.jsx'/import App from '.\/App-Supabase.jsx'/" src/main.jsx
```

---

### 6️⃣ App starten! 🎉

```bash
npm run dev
```

Öffnen Sie: **http://localhost:3001/**

---

## 🎯 Erste Anmeldung

### Option A: Neuen Account registrieren

1. Klicken Sie "✨ Neuen Account erstellen"
2. Füllen Sie aus:
   - Name: Ihr Name
   - E-Mail: Ihre E-Mail
   - Passwort: Mindestens 6 Zeichen
3. Registrieren
4. ✅ Sie sind drin!

### Option B: Demo-Account verwenden

**Nur wenn Sie die Demo-Accounts aus `MIGRATION_GUIDE.md` erstellt haben:**

- E-Mail: `admin@tennis.de`
- Passwort: `captain123`

---

## ✅ Funktioniert es?

Testen Sie:
- [ ] ✅ Login funktioniert
- [ ] ✅ Dashboard wird angezeigt
- [ ] ✅ Rangliste lädt (leer am Anfang ist ok)
- [ ] ✅ Profil-Seite öffnet sich
- [ ] ✅ Matches-Seite lädt
- [ ] ✅ Keine Fehler in der Konsole (F12)

---

## 🎨 Nächste Schritte

### Admin-Rechte bekommen:

1. Gehen Sie zu Supabase → **Table Editor** → `players`
2. Finden Sie Ihren Eintrag
3. Ändern Sie `role` von `player` zu `captain`
4. Speichern
5. Logout + Login
6. 🎉 Jetzt sehen Sie den **Admin-Tab**!

### Weitere Spieler einladen:

1. Teilen Sie die App-URL mit Ihren Teammitgliedern
2. Sie registrieren sich selbst
3. Alle Daten werden automatisch synchronisiert!

---

## 🆘 Probleme?

### "Keys fehlen" Fehler im Browser
```bash
# .env Datei existiert?
ls -la .env

# Inhalt prüfen
cat .env

# Dev-Server NEU starten nach .env Änderungen!
npm run dev
```

### "Cannot find module App-Supabase"
```bash
# Datei existiert?
ls -la src/App-Supabase.jsx

# main.jsx prüfen
cat src/main.jsx | grep "import App"
```

### Weitere Hilfe
📖 Siehe: `MIGRATION_GUIDE.md` für detaillierte Problemlösungen

---

## 🎉 Geschafft!

Sie haben jetzt:
- ✅ Zentrale Datenbank (Supabase)
- ✅ Mehrbenutzer-fähig
- ✅ Echtzeit-Synchronisation
- ✅ Professionelle Authentifizierung
- ✅ Automatische Backups
- ✅ Kostenlos für kleine Teams!

**Viel Erfolg mit Ihrer Tennis-Team-Organisation! 🎾**

---

## 📚 Weitere Dokumentation

- `SUPABASE_SETUP.md` - Ausführliche Setup-Anleitung
- `MIGRATION_GUIDE.md` - Detaillierte Migration mit Troubleshooting
- `SUPABASE_SCHEMA.sql` - Datenbank-Schema (für Referenz)

