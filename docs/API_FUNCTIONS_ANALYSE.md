# API Functions Analyse - Vercel Hobby Plan Limit

## Problem

Vercel Hobby Plan erlaubt nur **12 Serverless Functions**. Wir haben mehr als 12 Functions.

## Lösung

Nicht genutzte Functions deaktivieren/entfernen.

## Aktuelle Functions (ohne _lib/)

1. `api/cron/update-meeting-ids.js` ✅ **NEU - WIRD BENÖTIGT**
2. `api/import/parse-matches.js` ✅ **WIRD VERWENDET**
3. `api/import/scrape-nuliga.js` ✅ **WIRD VERWENDET**
4. `api/import/meeting-report.js` ✅ **WIRD VERWENDET**
5. `api/import/team-portrait.js` ✅ **WIRD VERWENDET**
6. `api/import/find-club-numbers.js` ✅ **WIRD VERWENDET**
7. `api/import/nuliga-club-import.js` ✅ **WIRD VERWENDET**
8. `api/import/nuliga-matches-import.js` ✅ **WIRD VERWENDET**
9. `api/standings/get-standings.js` ✅ **WIRD VERWENDET**
10. `api/import/bulk-import-club-rosters.js` ❓ **PRÜFEN**
11. `api/import/create-player.js` ❓ **PRÜFEN**

## Zu prüfende Functions

- `bulk-import-club-rosters.js` - Wird diese noch verwendet?
- `create-player.js` - Wird diese noch verwendet?

## Nächste Schritte

1. Prüfe ob `bulk-import-club-rosters.js` verwendet wird
2. Prüfe ob `create-player.js` verwendet wird
3. Wenn nicht verwendet: Entfernen oder in `api/_archive/` verschieben

