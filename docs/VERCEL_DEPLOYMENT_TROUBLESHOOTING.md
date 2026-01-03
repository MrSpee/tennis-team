# 🔧 Vercel Deployment Troubleshooting

## ❌ Problem
Keine automatischen Deployments bei Vercel nach Git Push.

## 🔍 Mögliche Ursachen & Lösungen

### 1. Vercel ist nicht mit GitHub verbunden

**Prüfen:**
- Vercel Dashboard → Project Settings → Git
- Ist GitHub Repository verbunden?

**Lösung:**
- Verbinde Vercel mit GitHub Repository
- Wähle das richtige Repository aus

---

### 2. Falscher Branch überwacht

**Prüfen:**
- Vercel Dashboard → Project Settings → Git
- Production Branch: Sollte `main` sein

**Lösung:**
- Ändere Production Branch zu `main` (falls anders)

---

### 3. GitHub Webhooks funktionieren nicht

**Prüfen:**
- GitHub Repository → Settings → Webhooks
- Gibt es einen Webhook für Vercel?
- Status: Grüne Haken oder Fehler?

**Lösung:**
- Lösche und erstelle Webhook neu
- Oder re-connect Vercel mit GitHub

---

### 4. Build-Fehler verhindert Deployment

**Prüfen:**
- Vercel Dashboard → Deployments
- Gibt es fehlgeschlagene Deployments?
- Prüfe Build-Logs

**Lösung:**
- Fehler in Build-Logs beheben
- Prüfe `vercel.json` Konfiguration
- Prüfe `package.json` Build-Scripts

---

### 5. Vercel-Projekt existiert nicht

**Prüfen:**
- Vercel Dashboard → Projects
- Existiert das Projekt?

**Lösung:**
- Erstelle neues Projekt
- Verbinde mit GitHub Repository
- Oder importiere bestehendes Projekt

---

### 6. Auto-Deploy deaktiviert

**Prüfen:**
- Vercel Dashboard → Project Settings → General
- "Automatically deploy every push" aktiviert?

**Lösung:**
- Aktiviere Auto-Deploy

---

## ✅ Checkliste

- [ ] GitHub Repository mit Vercel verbunden?
- [ ] Production Branch = `main`?
- [ ] GitHub Webhooks funktionieren?
- [ ] Build-Scripts korrekt (`package.json`)?
- [ ] `vercel.json` vorhanden und korrekt?
- [ ] Keine Build-Fehler?
- [ ] Auto-Deploy aktiviert?

---

## 🔧 Alternative: Manuelles Deployment

Falls Auto-Deploy nicht funktioniert:

### Option 1: Vercel CLI

```bash
# Installiere Vercel CLI (falls nicht vorhanden)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option 2: Vercel Dashboard

1. Gehe zu Vercel Dashboard
2. Wähle Projekt
3. Klicke "Deploy" Button
4. Wähle Branch/Commit

---

## 📝 Nächste Schritte

1. **Prüfe Vercel Dashboard** → Deployments Tab
2. **Prüfe Settings** → Git → Production Branch
3. **Prüfe Build-Logs** (falls Deployment vorhanden)
4. **Prüfe GitHub Webhooks** → Settings → Webhooks
5. **Falls nötig:** Manuelles Deployment via CLI

---

## 🔍 Debug-Informationen

**Git Status:**
- Commit: `7b65a36`
- Branch: `main`
- Remote: `origin/main`

**Vercel Konfiguration:**
- `vercel.json`: ✅ Vorhanden
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: `vite`

