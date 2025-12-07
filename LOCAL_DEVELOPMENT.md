# 🚀 Lokale Entwicklung

## Problem
Die API-Routen sind Vercel Serverless Functions und funktionieren nur mit `vercel dev`, nicht mit dem normalen Vite Dev Server.

## Lösung: Zwei Server starten

### Option 1: Beide Server manuell starten (empfohlen)

**Terminal 1 - API Server (Port 3000):**
```bash
vercel dev --listen 3000
```

**Terminal 2 - Frontend Server (Port 3001):**
```bash
npm run dev
```

### Option 2: Beide Server automatisch starten

```bash
npm run dev:full
```

Dies startet beide Server gleichzeitig.

## Wichtig

- ✅ **API Server** muss auf **Port 3000** laufen (Vercel Dev Server)
- ✅ **Frontend Server** läuft auf **Port 3001** (Vite)
- ✅ Vite leitet `/api` Requests automatisch an Port 3000 weiter

## Troubleshooting

### Port 3000 bereits belegt?
```bash
# Finde den Prozess
lsof -ti:3000

# Beende den Prozess
kill -9 $(lsof -ti:3000)
```

### Vercel CLI nicht installiert?
```bash
npm install -g vercel
```

### API-Routen funktionieren nicht?
1. Prüfe ob `vercel dev` auf Port 3000 läuft
2. Prüfe ob der Proxy in `vite.config.js` korrekt ist
3. Prüfe die Browser-Konsole für Fehlermeldungen

