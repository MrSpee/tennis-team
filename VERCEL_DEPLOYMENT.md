# 🚀 Platzhirsch auf Vercel deployen

## ✅ Voraussetzungen:
- ✅ GitHub Account vorhanden
- ✅ Vercel Account vorhanden
- ✅ Git installiert

---

## SCHRITT 1: .gitignore prüfen (1 Min)

Die `.gitignore` Datei sollte folgendes enthalten:

```
node_modules
dist
.env
.env.local
.env.production
.DS_Store
```

✅ Bereits vorhanden!

---

## SCHRITT 2: GitHub Repository erstellen (3 Min)

### A) Auf GitHub.com:
1. Gehe zu: **https://github.com/new**
2. **Repository name:** `platzhirsch`
3. **Description:** "Tennis Team App für SV Rot-Gelb Sürth Herren 40"
4. **Visibility:** Private (empfohlen)
5. **NICHT** "Initialize with README" ankreuzen
6. Klicke **"Create repository"**

### B) Terminal (führe diese Befehle aus):

```bash
cd /Users/cspee/Documents/01_Private_NEW/BIZ_Projects/01_Projects/CM-Tracker/tennis-team

# Git initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien hinzufügen
git add .

# Erster Commit
git commit -m "Initial commit - Platzhirsch App"

# GitHub Remote hinzufügen (ERSETZE 'DEIN-USERNAME')
git remote add origin https://github.com/DEIN-USERNAME/platzhirsch.git

# Branch umbenennen
git branch -M main

# Push zu GitHub
git push -u origin main
```

**GitHub Username:**
Wenn du deinen GitHub-Username nicht kennst:
- Gehe zu https://github.com
- Oben rechts siehst du deinen Username

**Beispiel:**
```bash
git remote add origin https://github.com/christianspee/platzhirsch.git
```

---

## SCHRITT 3: Vercel Projekt erstellen (5 Min)

### A) Vercel Dashboard:
1. Gehe zu: **https://vercel.com/dashboard**
2. Klicke **"Add New..."** → **"Project"**
3. **Import Git Repository:**
   - Falls nicht verbunden: **"Connect GitHub Account"**
   - Autorisiere Vercel für GitHub
4. **Wähle:** `platzhirsch` Repository
5. Klicke **"Import"**

### B) Project Settings:

**Framework Preset:**
- Wähle: **Vite** (sollte automatisch erkannt werden)

**Build and Output Settings:**
- **Build Command:** `npm run build` ✅
- **Output Directory:** `dist` ✅
- **Install Command:** `npm install` ✅

**Root Directory:**
- Lasse leer: `./` ✅

---

## SCHRITT 4: Environment Variables setzen (3 Min)

**WICHTIG: Bevor du deployst!**

1. **Klicke:** "Environment Variables"
2. **Füge hinzu:**

**Variable 1:**
```
Name:  VITE_SUPABASE_URL
Value: https://fyvmyyfuxuconhdbiwoa.supabase.co
```

**Variable 2:**
```
Name:  VITE_SUPABASE_ANON_KEY
Value: [DEIN KEY]
```

**Deinen Supabase Key findest du:**
- Öffne `.env` Datei im Projekt
- Kopiere den Wert von `VITE_SUPABASE_ANON_KEY`
- ODER: Supabase Dashboard → Settings → API → `anon public`

**Für alle Environments:**
- ✅ Production
- ✅ Preview
- ✅ Development

---

## SCHRITT 5: Deployen! (2 Min)

1. Klicke **"Deploy"**
2. ⏳ **Warte 1-2 Minuten**
3. ✅ **Deployment erfolgreich!**

**Du bekommst eine URL:**
```
https://platzhirsch-xyz123.vercel.app
```

---

## SCHRITT 6: Supabase URL konfigurieren (2 Min)

### A) In Supabase:
1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL:** 
   ```
   https://platzhirsch-xyz123.vercel.app
   ```
3. **Redirect URLs:**
   ```
   https://platzhirsch-xyz123.vercel.app/**
   http://localhost:3000/**
   ```
4. Klicke **"Save"**

---

## SCHRITT 7: Live-Test! (5 Min)

1. **Öffne deine Vercel-URL** im Browser
2. ✅ **Login-Seite** sollte erscheinen
3. **Teste Login:**
   - E-Mail: `mail@christianspee.de`
   - Passwort: [dein Passwort]
4. ✅ **Dashboard** sollte laden
5. ✅ **Navigation** funktioniert
6. ✅ **Verfügbarkeit** kann eingetragen werden

---

## 🎯 SCHRITT 8: Custom Domain (Optional - 5 Min)

### A) Domain in Vercel hinzufügen:
1. **Vercel Dashboard** → Dein Projekt
2. **Settings** → **Domains**
3. Klicke **"Add"**
4. **Gib ein:** z.B. `platzhirsch.de` oder `tennis.rotgelbsuerth.de`
5. **Folge den DNS-Anweisungen**

### B) Kostenlose Subdomain behalten:
```
platzhirsch-xyz123.vercel.app
```
→ Funktioniert sofort, keine DNS-Konfiguration nötig!

---

## 📱 SCHRITT 9: Team informieren (5 Min)

**WhatsApp-Nachricht:**
```
🎾 Platzhirsch ist LIVE! 🚀

Hallo Team! 👋

Unsere neue Team-App ist jetzt online:

🔗 https://platzhirsch-xyz123.vercel.app

✅ Verfügbarkeit angeben
✅ Rangliste & Meldeliste
✅ Spielplan & Team-Info

📱 WICHTIG - So registrierst du dich:
1. Link öffnen → "Neuen Account erstellen"
2. Name, E-Mail, Passwort eingeben
3. E-Mail bestätigen (Link im Postfach)
4. Einloggen → Fertig!

💡 Tipp: Als App auf Homescreen speichern!
   iPhone: Safari → Teilen → Zum Home-Bildschirm
   Android: Chrome → Menü → App installieren

Bei Fragen: Einfach melden!

Let's go! 🎾
Daniel
```

---

## 🔄 SCHRITT 10: Updates deployen (später)

**Wenn du Code änderst:**

```bash
cd /Users/cspee/Documents/01_Private_NEW/BIZ_Projects/01_Projects/CM-Tracker/tennis-team

# Änderungen committen
git add .
git commit -m "Update: [deine Änderung]"
git push

# Vercel deployt AUTOMATISCH! 🚀
```

**Vercel macht:**
1. ✅ Erkennt Push auf GitHub
2. ✅ Baut App neu
3. ✅ Deployt automatisch
4. ✅ URL bleibt gleich
5. ⏱️ Dauer: ~1-2 Minuten

---

## 📊 CHECKLISTE - Vor dem Go-Live:

**Datenbank:**
- [ ] Team-Setup für Winter 25/26 eingetragen
- [ ] TVM-Link gespeichert
- [ ] Mindestens 1 Spiel angelegt
- [ ] Captain-Rolle gesetzt (mail@christianspee.de)

**Supabase:**
- [ ] URL Configuration korrekt
- [ ] E-Mail Templates gesetzt
- [ ] RLS Policies aktiviert

**App:**
- [ ] Login funktioniert
- [ ] Verfügbarkeit funktioniert (kein Status-Bug)
- [ ] Dashboard zeigt Daten
- [ ] Mobile optimiert

---

## 🎯 QUICK COMMANDS:

```bash
# Schritt 1: Zum Projekt-Ordner
cd /Users/cspee/Documents/01_Private_NEW/BIZ_Projects/01_Projects/CM-Tracker/tennis-team

# Schritt 2: Git initialisieren
git init
git add .
git commit -m "Initial commit - Platzhirsch App"

# Schritt 3: GitHub Remote (ERSETZE USERNAME!)
git remote add origin https://github.com/DEIN-USERNAME/platzhirsch.git
git branch -M main
git push -u origin main

# Fertig! Jetzt in Vercel importieren
```

---

**Bereit für den ersten Schritt? Führe die Git-Befehle aus! 🚀**
