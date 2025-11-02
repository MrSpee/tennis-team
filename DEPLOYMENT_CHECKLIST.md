# 🚀 Production Deployment Checklist

**Stand:** 31. Oktober 2024  
**Version:** v1.0.0  
**Branch:** main

---

## ✅ Pre-Deployment Checks

### 1. Code-Qualität
- [x] SQL-Skripte aufgeräumt (35 gelöscht, 60 archiviert)
- [x] `.gitignore` konfiguriert
- [x] `vercel.json` vorhanden und konfiguriert
- [x] `package.json` dependencies aktuell
- [ ] Production Build erfolgreich (`npm run build`)

### 2. Environment Variables (Vercel Dashboard)
**Wichtig:** Diese Variablen MÜSSEN in Vercel gesetzt sein!

#### Frontend (VITE_*):
```
VITE_SUPABASE_URL=https://fyvmyyfuxuconhdbiwoa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Backend (für KI-Import API):
```
OPENAI_API_KEY=sk-proj-...
```

**Wo setzen?**
1. Vercel Dashboard → Settings → Environment Variables
2. Füge obige Variablen hinzu
3. Wähle Environment: **Production** (und optional Preview/Development)
4. Click **Save**
5. **WICHTIG:** Redeploy das Projekt

### 3. Database Setup
- [x] Supabase Projekt erstellt und konfiguriert
- [x] Alle Tabellen erstellt (`CLEAN_DB_SETUP.sql`)
- [x] RLS Policies aktiv
- [x] Auth aktiviert
- [ ] Test-Login erfolgreich

### 4. Dependencies
- [x] React 18.3.1
- [x] @supabase/supabase-js 2.58.0
- [x] date-fns 3.0.0
- [x] lucide-react 0.424.0
- [x] react-router-dom 6.26.0
- [x] openai 6.3.0
- [x] @vercel/analytics 1.5.0
- [x] @vercel/speed-insights 1.2.0

---

## 🔧 Deployment Steps

### Schritt 1: Lokaler Build-Test
```bash
cd tennis-team
npm run build
```

**Erwartetes Ergebnis:** 
- `dist/` Ordner erstellt
- Keine Build-Fehler
- Bundle-Size unter 2MB

### Schritt 2: Git Commit & Push
```bash
git status  # Prüfe Änderungen
git add .
git commit -m "chore: cleanup SQL files and prepare production deployment"
git push origin main
```

**Automatisches Vercel Deployment:**  
Wenn Vercel mit GitHub verknüpft ist, wird automatisch gedeployed.

### Schritt 3: Manuelles Deployment (Optional)
```bash
vercel --prod
```

---

## 🧪 Post-Deployment Testing

### 1. Frontend-Tests
- [ ] App lädt ohne Fehler
- [ ] Login-Flow funktioniert
- [ ] Dashboard wird angezeigt
- [ ] Navigation funktioniert (Spiele, Rangliste, Tabelle, Training)
- [ ] Onboarding-Flow funktioniert

### 2. Auth-Tests
- [ ] Registrierung funktioniert
- [ ] Login funktioniert
- [ ] Logout funktioniert
- [ ] Session-Persistence funktioniert
- [ ] Protected Routes funktionieren

### 3. Data-Tests
- [ ] Spieler-Daten werden geladen
- [ ] Matches werden angezeigt
- [ ] Team-Informationen werden geladen
- [ ] Rankings werden angezeigt
- [ ] Training-Sessions werden angezeigt

### 4. KI-Import Tests (SuperAdmin)
- [ ] Import-Tab ist sichtbar
- [ ] Parse-Button funktioniert
- [ ] AI-Analyse läuft durch
- [ ] Ergebnisse werden angezeigt
- [ ] Import zu Datenbank funktioniert

### 5. PWA-Tests
- [ ] Manifest geladen
- [ ] App kann installiert werden
- [ ] Offline-Funktionalität (wenn implementiert)
- [ ] Icons angezeigt

---

## 🔍 Monitoring

### Vercel Dashboard
- [ ] Deployment erfolgreich (grüner Status)
- [ ] Funktion Logs prüfen
- [ ] Analytics aktiv
- [ ] Speed Insights aktiv

### Browser Console
**Nach Deployment, prüfe auf:**
- ❌ Keine Supabase-Auth-Fehler
- ❌ Keine API-404-Fehler
- ❌ Keine CORS-Fehler

**Erlaubt/Normal:**
- ⚠️ Analytics-Fehler (laden nur in Production)
- ℹ️ Debug-Logs (können in Production entfernt werden)

### Supabase Dashboard
- [ ] Auth-Activity Log prüfen
- [ ] Database Logs prüfen
- [ ] Real-time Subscriptions funktionieren

---

## ⚠️ Bekannte Issues & Fixes

### Issue 1: Build fehlgeschlagen
**Error:** `Cannot find module '@vitejs/plugin-react'`  
**Fix:** 
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue 2: Supabase Keys fehlen
**Error:** `❌ Supabase-Keys fehlen!`  
**Fix:** 
1. Vercel Dashboard → Settings → Environment Variables
2. Füge `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinzu
3. Redeploy

### Issue 3: OpenAI API Error 401
**Error:** `OpenAI API error: Invalid API key`  
**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Prüfe `OPENAI_API_KEY` ist gesetzt
3. Redeploy

### Issue 4: RLS Policy Error
**Error:** `new row violates row-level security policy`  
**Fix:**
1. Supabase Dashboard → Table Editor → RLS
2. Prüfe Policies für `players_unified`, `team_memberships`, etc.
3. Stelle sicher, dass authenticated users read access haben

---

## 🎯 Success Criteria

### ✅ Deployment erfolgreich wenn:
- [ ] Vercel Deployment grün
- [ ] App lädt ohne Fehler
- [ ] Login funktioniert
- [ ] Alle Hauptseiten funktionieren
- [ ] Daten werden geladen
- [ ] KI-Import funktioniert (wenn genutzt)

---

## 📊 Rollback-Plan

### Wenn etwas schiefgeht:

**Option 1: Vercel Rollback**
1. Vercel Dashboard → Deployments
2. Wähle vorheriges erfolgreiches Deployment
3. Click "Promote to Production"

**Option 2: Git Revert**
```bash
git revert HEAD
git push origin main
```

**Option 3: Manueller Fix & Redeploy**
```bash
git checkout main
# Mache Fixes
git commit -m "fix: production issue X"
git push origin main
```

---

## 📝 Deployment-Notizen

**Deployment-Datum:** _[Wird beim Deployment ausgefüllt]_  
**Deployed By:** _[Name]_  
**Environment:** Production (Vercel)  
**Version:** 1.0.0  
**Build-Time:** _[Wird ausgefüllt]_

**Notizen:**
- SQL-Files Cleanup durchgeführt
- 37 SQL-Dateien behalten (Production-relevant)
- 60 Dateien archiviert
- 35 Dateien gelöscht

---

## 🚨 Kritische Deployment-Hinweise

### ⚠️ WICHTIG: Environment Variables
- Supabase-Keys sind **ERFORDERLICH** für App-Start
- OpenAI-Key ist **ERFORDERLICH** für KI-Import
- Ohne diese Variablen lädt die App **NICHT**

### ⚠️ WICHTIG: Database Migrations
- Führe `CLEAN_DB_SETUP.sql` NUR EINMAL aus
- Erstelle Backups vor großen Änderungen
- Teste Migrations in Preview-Environment

### ⚠️ WICHTIG: RLS Policies
- Alle Tabs in `players_unified` haben RLS
- Authenticated users haben read access
- SuperAdmins haben write access
- Prüfe Policies regelmäßig

---

## 🎉 Post-Deployment

### Nach erfolgreichem Deployment:
1. ✅ **Erste Tests** durchführen
2. ✅ **User-Feedback** sammeln
3. ✅ **Monitoring** aktivieren
4. ✅ **Performance** überwachen
5. ✅ **Error-Tracking** prüfen

### Next Steps:
- [ ] Erste User einladen
- [ ] Onboarding-Flow testen
- [ ] Feedback sammeln
- [ ] Bugs tracken und fixen

---

**Viel Erfolg mit dem Deployment! 🚀**


