# 🚀 Platzhirsch App LIVE schalten

## ✅ SCHRITT 1: Letzte Checks (5 Min)

### A) Status-Bug behoben
- ✅ Verfügbarkeit nutzt jetzt korrektes Format: `available` / `unavailable` / `maybe`
- ✅ CSS-Klassen angepasst
- ✅ Alle Filter korrigiert

### B) Test in Dev-Umgebung
1. **Browser neu laden:** `Cmd+Shift+R` (Hard Refresh)
2. **Test-Verfügbarkeit:**
   - Gehe zu **Verfügbarkeit**
   - Klicke bei einem Spiel auf **"Verfügbar"**
   - ✅ KEIN Fehler mehr in der Konsole
   - ✅ Grüner Status wird angezeigt

---

## 🌐 SCHRITT 2: App deployen (10-15 Min)

### Option A: Vercel (EMPFOHLEN - Einfachste Lösung)

#### 1. GitHub Repository erstellen
```bash
cd /Users/cspee/Documents/01_Private_NEW/BIZ_Projects/01_Projects/CM-Tracker/tennis-team

# Git initialisieren
git init
git add .
git commit -m "Initial commit - Platzhirsch Tennis Team App"

# GitHub Repository erstellen (über https://github.com/new)
# Dann:
git remote add origin https://github.com/DEIN-USERNAME/platzhirsch.git
git branch -M main
git push -u origin main
```

#### 2. Vercel einrichten
1. Gehe zu: **https://vercel.com**
2. **Sign up** mit GitHub
3. Klicke **"New Project"**
4. **Import** dein `platzhirsch` Repository
5. **Framework Preset:** Vite
6. **Root Directory:** ./
7. **Build Command:** `npm run build`
8. **Output Directory:** `dist`

#### 3. Environment Variables setzen
**In Vercel:**
1. Gehe zu **Settings** → **Environment Variables**
2. **Füge hinzu:**
   ```
   VITE_SUPABASE_URL = https://fyvmyyfuxuconhdbiwoa.supabase.co
   VITE_SUPABASE_ANON_KEY = (dein Key aus .env)
   ```
3. **Deploy**

#### 4. Custom Domain (Optional)
1. **Settings** → **Domains**
2. Füge hinzu: z.B. `platzhirsch.vercel.app` oder eigene Domain

**✅ FERTIG! App ist live unter:**
```
https://dein-projekt.vercel.app
```

---

### Option B: Netlify (Alternative)

#### 1. Build erstellen
```bash
npm run build
```

#### 2. Netlify Drop
1. Gehe zu: **https://app.netlify.com/drop**
2. **Ziehe den `dist/` Ordner** in das Fenster
3. **Fertig!**

#### 3. Environment Variables
1. **Site Settings** → **Environment Variables**
2. Füge `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinzu
3. **Rebuild**

---

### Option C: Eigener Server (Fortgeschritten)

```bash
# Build erstellen
npm run build

# dist/ Ordner auf Server hochladen (z.B. via FTP/SFTP)
# Nginx/Apache konfigurieren für SPA
```

---

## 📧 SCHRITT 3: E-Mail Templates (5 Min)

1. **Supabase Dashboard** → **Authentication** → **Email Templates**
2. **Kopiere Templates** aus `SUPABASE_EMAIL_TEMPLATES.md`
3. **Speichern**

**Templates:**
- ✅ Confirm signup
- ✅ Magic Link (optional)
- ✅ Password Reset (optional)

---

## 🔐 SCHRITT 4: Supabase Produktion (10 Min)

### A) E-Mail Bestätigung
**Empfehlung für Produktion:**
1. **Authentication** → **Settings**
2. **Enable email confirmations:** ✅ AN
3. **Speichern**

### B) URL-Konfiguration
1. **Authentication** → **URL Configuration**
2. **Site URL:** `https://dein-projekt.vercel.app`
3. **Redirect URLs:** 
   ```
   https://dein-projekt.vercel.app/**
   http://localhost:3000/**  (für Dev)
   ```
4. **Speichern**

### C) RLS Policies prüfen
```sql
-- Alle Policies anzeigen
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Wichtig:**
- ✅ `players` - RLS aktiviert
- ✅ `matches` - RLS aktiviert
- ✅ `match_availability` - RLS aktiviert

### D) Rate Limiting
1. **Authentication** → **Rate Limits**
2. **Email sends per hour:** 10
3. **SMS sends per hour:** 5
4. **Speichern**

---

## 👥 SCHRITT 5: Erste Benutzer einladen (5 Min)

### A) Mannschaftsführer (Admin)
1. **Registriere dich** als Captain
2. **Setze in Supabase:**
   ```sql
   UPDATE players 
   SET role = 'captain' 
   WHERE email = 'mail@christianspee.de';
   ```

### B) Spieler einladen
**WhatsApp-Nachricht (Vorlage):**
```
🎾 Platzhirsch - Unsere neue Team-App!

Hallo zusammen! 👋

Ab sofort nutzen wir "Platzhirsch" für unsere Mannschaft:

🔗 https://dein-projekt.vercel.app

✅ Verfügbarkeit für Spiele angeben
✅ Rangliste & Meldeliste einsehen
✅ Team-Übersicht & Spielplan

📱 So gehts:
1. Link öffnen
2. "Neuen Account erstellen" klicken
3. E-Mail + Passwort eingeben
4. Namen & LK eintragen
5. Fertig!

💡 Tipp: App als Homescreen-Icon speichern!

Bei Fragen: Einfach melden!

Sportliche Grüße,
Daniel (Mannschaftsführer)
```

---

## 📱 SCHRITT 6: Als App installieren (PWA)

### iPhone/iPad:
1. **Safari** öffnen → App-URL
2. **Teilen** → **Zum Home-Bildschirm**
3. Name: "Platzhirsch"
4. **Hinzufügen**
5. ✅ App-Icon auf Homescreen!

### Android:
1. **Chrome** öffnen → App-URL
2. **Menü** (⋮) → **App installieren**
3. **Installieren**
4. ✅ App-Icon auf Homescreen!

### Desktop:
1. **Chrome** → App-URL
2. **Adressleiste:** + Icon
3. **Installieren**
4. ✅ Desktop-App!

---

## 🧪 SCHRITT 7: Final-Test (10 Min)

### Checkliste:

**Authentifizierung:**
- [ ] Registrierung funktioniert
- [ ] E-Mail-Bestätigung (falls aktiviert)
- [ ] Login funktioniert
- [ ] Logout funktioniert
- [ ] Session bleibt nach Refresh

**Features (als Spieler):**
- [ ] Dashboard zeigt Spiele
- [ ] Verfügbarkeit kann eingetragen werden
- [ ] Rangliste zeigt TVM-Meldeliste
- [ ] Profil kann bearbeitet werden

**Features (als Captain):**
- [ ] Admin-Panel ist sichtbar
- [ ] Team-Setup funktioniert
- [ ] Spiele können erstellt werden
- [ ] Spiele können bearbeitet werden
- [ ] Spiele können gelöscht werden
- [ ] TVM-Link wird gespeichert

**Mobile:**
- [ ] Navigation funktioniert
- [ ] Scrolling funktioniert
- [ ] Alle Seiten sind responsive
- [ ] PWA-Installation funktioniert

---

## 📊 SCHRITT 8: Monitoring (laufend)

### A) Supabase Dashboard
**Täglich prüfen:**
- **Database** → Anzahl der Einträge
- **Authentication** → Aktive Users
- **Storage** → Nutzung

### B) Error Tracking (Optional)
**Sentry installieren:**
```bash
npm install @sentry/react
```

---

## 🎯 Quick Start Checklist:

1. ✅ **Status-Bug** behoben → JETZT testen!
2. ⏳ **Vercel Account** erstellen
3. ⏳ **GitHub Repo** erstellen & pushen
4. ⏳ **Vercel Deploy** durchführen
5. ⏳ **Environment Variables** setzen
6. ⏳ **E-Mail Templates** in Supabase einfügen
7. ⏳ **Supabase URLs** konfigurieren
8. ⏳ **Captain-Rolle** setzen
9. ⏳ **Team einladen**
10. ✅ **LIVE!**

---

## 💡 Empfehlung:

**Für schnellsten Start:**
1. **JETZT:** Status-Fix testen (Browser reload)
2. **Heute:** Vercel Deploy (15 Min)
3. **Morgen:** Team einladen & testen

---

**Sollen wir mit dem Vercel-Deployment starten? 🚀**
