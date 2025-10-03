# 🔍 Matches in Supabase prüfen

## 1. Supabase SQL Editor öffnen
1. Gehe zu **Supabase Dashboard**
2. Klicke auf **SQL Editor**

## 2. Diese Query ausführen:

```sql
-- Alle Matches anzeigen mit Saison-Info
SELECT 
    id,
    opponent,
    match_date,
    season,
    location,
    venue,
    players_needed,
    created_at
FROM matches
ORDER BY match_date DESC;
```

## 3. Was du siehst:
- **match_date**: Datum des Spiels
- **season**: `winter` oder `summer`
- **opponent**: Gegner
- **location**: `Home` oder `Away`

## 4. Prüfe die Saison-Spalte:
✅ Alle Winter-Spiele sollten `season = 'winter'` haben
✅ Alle Sommer-Spiele sollten `season = 'summer'` haben

## 5. Falls Saison falsch ist:
```sql
-- Beispiel: Match auf Winter ändern
UPDATE matches 
SET season = 'winter'
WHERE id = 'deine-match-id';
```

## 6. Aktuelle Datum-Logik in der App:

**Aktueller Monat:** Oktober 2025

**Saison-Bestimmung:**
- **Mai (4) - August (7):** `summer` → "Sommer 2025"
- **September (8) - Dezember (11):** `winter` → "Winter 25/26"
- **Januar (0) - April (3):** `winter` → "Winter 24/25"

**Im Oktober 2025:**
- Aktuelle Saison: `winter`
- Display: "Winter 25/26"

## 7. Debug in der Browser-Konsole:
```javascript
// Öffne F12 → Console und tippe:
console.log('Alle Matches:', matches);
console.log('Upcoming Matches:', upcomingMatches);
console.log('Current Season:', currentSeason);
console.log('Season Display:', seasonDisplay);
```
