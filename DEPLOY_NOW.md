# ⚡ Quick Deploy - KI-Import System

## 🚀 Deployment in 3 Schritten

### Schritt 1: Environment Variables setzen

**Vercel Dashboard** → **Settings** → **Environment Variables**

Füge diese Variable hinzu (wichtig für KI-Import):
```
OPENAI_API_KEY=sk-...  # Dein OpenAI API Key
```

⚠️ **WICHTIG:**
- Wähle **Environment: Production** (und optional Preview)
- OpenAI Key findest du hier: https://platform.openai.com/api-keys

---

### Schritt 2: Deployment starten

**Option A: Via Git Push**
```bash
git add .
git commit -m "feat: KI-Import System mit Fuzzy Matching"
git push origin main
```

**Option B: Via Vercel CLI**
```bash
cd tennis-team
vercel --prod
```

---

### Schritt 3: Testen

1. Öffne: `https://deine-domain.vercel.app`
2. Login als SuperAdmin
3. Gehe zu **SuperAdmin Dashboard** → **Import Tab**
4. Klicke **"📝 Beispiel einfügen"**
5. Klicke **"🤖 KI analysieren"**

✅ **Erfolg wenn:**
- Parsing startet (kein API-Error)
- Review-Panel wird angezeigt
- Matches/Spieler werden erkannt

---

## 🔍 Troubleshooting

### ❌ "OpenAI API key is missing"
→ Prüfe `OPENAI_API_KEY` in Vercel Environment Variables

### ❌ "404 Not Found" auf `/api/import/parse-matches`
→ API-Route existiert bereits, prüfe Vercel Logs

### ❌ CORS-Fehler
→ CORS ist bereits konfiguriert, sollte funktionieren

---

## ✅ Checklist

- [ ] OpenAI API Key in Vercel gesetzt
- [ ] Deployment erfolgreich
- [ ] Frontend lädt ohne Fehler
- [ ] Import Tab ist erreichbar
- [ ] KI-Analyse funktioniert
- [ ] Test-Import erfolgreich

---

**Viel Erfolg! 🎾**

