# 🚀 Vercel Deployment Setup

## 🔧 Umgebungsvariablen konfigurieren

Die App benötigt Supabase-Konfiguration. Falls diese fehlen, wird eine Fehlerseite angezeigt.

### 1. Vercel Dashboard öffnen
- Gehe zu [vercel.com](https://vercel.com)
- Wähle dein **tennis-team** Projekt

### 2. Environment Variables hinzufügen
- Klicke auf **Settings** → **Environment Variables**
- Füge folgende Variablen hinzu:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Supabase-Keys finden
- Gehe zu deinem [Supabase Dashboard](https://supabase.com)
- Wähle dein Projekt
- Gehe zu **Settings** → **API**
- Kopiere:
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon public** Key → `VITE_SUPABASE_ANON_KEY`

### 4. Deployment neu starten
- **Wichtig:** Nach dem Hinzufügen der Variablen musst du das Deployment neu starten!
- Gehe zu **Deployments** → **Redeploy**

## 🎯 Troubleshooting

### App hängt beim Laden
- ✅ **Ursache:** Supabase-Konfiguration fehlt
- ✅ **Lösung:** Environment Variables in Vercel setzen

### Fehlermeldung "Supabase nicht konfiguriert"
- ✅ **Ursache:** Umgebungsvariablen nicht gesetzt
- ✅ **Lösung:** Siehe Anleitung oben

### Analytics funktioniert nicht
- ✅ **Ursache:** Analytics lädt nur in echter Vercel-Produktion
- ✅ **Lösung:** Erst Supabase konfigurieren, dann Analytics aktiviert sich automatisch

### Fehlermeldungen in Konsole (normal)
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
[Vercel Web Analytics] Failed to load script
[Vercel Speed Insights] Failed to load script
```
- ✅ **Ursache:** Analytics lädt nur in Vercel-Produktion
- ✅ **Lösung:** Diese Fehler sind normal und verschwinden nach Vercel-Deployment

## 📱 PWA Features
- ✅ **Manifest:** Automatisch konfiguriert
- ✅ **Icons:** Alle Icons vorhanden
- ✅ **Installation:** Funktioniert nach Supabase-Setup

## 🔍 Debug-Informationen
Die App zeigt detaillierte Debug-Logs in der Browser-Konsole:
- `🔵 AuthContext - Supabase configured: true/false`
- `🔵 Checking for existing session...`
- `✅ Session found! User: email@example.com`

## 📞 Support
Bei Problemen:
1. Browser-Konsole öffnen (F12)
2. Debug-Logs prüfen
3. Environment Variables in Vercel überprüfen
4. Deployment neu starten
