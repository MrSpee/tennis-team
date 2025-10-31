# Matchdays System Migration Guide

## 🎯 Ziel

Umstellen der Datenstruktur von `matches` auf `matchdays` für saubere Team-Referenzen und bessere Datenintegrität.

## 📊 Neue Struktur

### **matchdays** (Meta-Daten des Spieltags)
```sql
matchdays
├── id (UUID)
├── home_team_id (FK → team_info) ✅
├── away_team_id (FK → team_info) ✅
├── match_date, start_time
├── venue, address
├── location ('Home'/'Away')
├── season, league, group_name
├── home_score, away_score, final_score
└── notes, status
```

### **match_results** (Detail-Ergebnisse)
```sql
match_results
├── id (UUID)
├── matchday_id (FK → matchdays) ✅
├── match_number (1-6)
├── match_type ('Einzel'/'Doppel')
├── Spieler-IDs (home_player_id, guest_player_id, etc.)
├── Scores (set1_home, set2_guest, etc.)
├── winner, status
└── notes
```

## 🔄 Migration Steps

### 1. Erstelle `matchdays` Tabelle & Migriere Daten

```sql
-- Führe aus in Supabase SQL Editor:
```

Ausführen des SQL-Skripts:
```bash
# Kopiere CREATE_MATCHDAYS_SYSTEM.sql in Supabase SQL Editor
```

### 2. Prüfe Migration

```sql
-- Prüfe ob Migration erfolgreich war
SELECT 
    'Migration erfolgreich!' as status,
    (SELECT COUNT(*) FROM matchdays) as matchdays_count,
    (SELECT COUNT(*) FROM match_results WHERE matchday_id IS NOT NULL) as results_with_matchday;
```

## ✅ Was wurde aktualisiert

### Komponenten:
1. ✅ **LiveResultsWithDB.jsx** - Nutzt `matchdays` statt `matches`
2. ✅ **DataContext.jsx** - Lädt von `matchdays` 
3. ✅ **MatchdayResults.jsx** - Hardcoded Werte entfernt, nutzt `matchdays`
4. ✅ Team-Badges zeigen echte Team-Namen aus DB

### Änderungen:
- `matches` → `matchdays` 
- `match_results.match_id` → `match_results.matchday_id`
- Beide Teams als Foreign Keys
- Keine hardcoded Werte mehr

## 🚀 Next Steps

1. **SQL-Script ausführen** in Supabase
2. **Alte `matches` Tabelle** (optional) später löschen oder archivieren
3. **Testen** der Ergebniseingabe

## ⚠️ Wichtige Notes

- **match_results.match_id** bleibt vorerst für Kompatibilität
- **match_results.matchday_id** ist die neue Referenz
- Rollback möglich, wenn nötig

## 📝 SQL Script Location

Das Migrations-Script findest du in:
```
tennis-team/CREATE_MATCHDAYS_SYSTEM.sql
```


