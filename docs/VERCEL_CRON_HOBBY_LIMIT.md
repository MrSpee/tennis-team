# Vercel Cron Job Hobby Plan Limit

## ⚠️ Problem

Vercel Hobby Plan erlaubt nur **tägliche Cron Jobs** (einmal pro Tag).

**Fehlermeldung:**
> "Hobby accounts are limited to daily cron jobs. This cron expression (0 * * * *) would run more than once per day. Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel."

## 📋 Limit-Erklärung

- **Hobby Plan:** Nur **1x täglich** Cron Jobs möglich
- **Pro Plan:** Unlimited Cron Jobs (auch stündlich/minütlich)

## ✅ Lösung

Cron Schedule auf **täglich** geändert:

### Vorher (stündlich - nicht erlaubt):
```json
{
  "crons": [
    {
      "path": "/api/cron/update-meeting-ids",
      "schedule": "0 * * * *"  // ❌ Stündlich - überschreitet Limit
    }
  ]
}
```

### Nachher (täglich - erlaubt):
```json
{
  "crons": [
    {
      "path": "/api/cron/update-meeting-ids",
      "schedule": "0 14 * * *"  // ✅ Täglich um 14:00 UTC (15:00 MEZ)
    }
  ]
}
```

## 📅 Cron Schedule Optionen (Hobby Plan)

Alle folgenden Schedule sind auf Hobby Plan erlaubt (nur 1x täglich):

- `0 0 * * *` - Täglich um 00:00 UTC (01:00 MEZ)
- `0 14 * * *` - Täglich um 14:00 UTC (15:00 MEZ) ✅ **Aktuell verwendet**
- `0 12 * * *` - Täglich um 12:00 UTC (13:00 MEZ)
- `0 6 * * *` - Täglich um 06:00 UTC (07:00 MEZ)

## 🔄 Auswirkung

### Vorher (geplant):
- Stündlich: 24x pro Tag
- Batch-Größe: 5 Matchdays pro Run
- Theoretisch: 120 Matchdays pro Tag verarbeitet

### Jetzt (Hobby Plan):
- Täglich: 1x pro Tag (um 14:00 UTC)
- Batch-Größe: 5 Matchdays pro Run
- Pro Tag: 5 Matchdays verarbeitet

## 💡 Alternativen

### Option 1: Bei Hobby Plan bleiben (aktuelle Lösung)
- ✅ Täglich 1x ausführen
- ✅ 5 Matchdays pro Tag verarbeitet
- ⚠️ Langsamere Verarbeitung (alle Matchdays brauchen ~20 Tage)

### Option 2: Auf Pro Plan upgraden
- ✅ Stündlich möglich (24x täglich)
- ✅ 120 Matchdays pro Tag verarbeitet
- 💰 Kosten: Pro Plan (~$20/Monat)

### Option 3: Manuelles Deployment bei Bedarf
- ✅ Cron Job bleibt täglich
- ✅ Zusätzlich manuell triggern, wenn nötig
- ⚠️ Keine automatische stündliche Ausführung

## 📝 Notizen

- Ursprünglich geplant: 15x täglich (alle 10 Minuten mit 10 Min Pause)
- Hobby Plan Limit: Nur 1x täglich möglich
- Aktuelle Lösung: 1x täglich um 14:00 UTC (15:00 MEZ)
- Batch-Größe bleibt bei 5 Matchdays (für kurze Ausführungszeit)

