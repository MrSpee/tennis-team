# 🔧 SQL Migration - Anleitung

## ⚠️ WICHTIG: Das SQL-Script muss manuell in Supabase ausgeführt werden!

### 📝 Option 1: Supabase Dashboard (Empfohlen)

1. **Öffne Supabase Dashboard**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt

2. **Öffne SQL Editor**
   - Klicke auf "SQL Editor" in der Sidebar

3. **Führe das Script aus**
   - Öffne die Datei: `tennis-team/CREATE_MATCHDAYS_SYSTEM.sql`
   - Kopiere den Inhalt
   - Füge ihn in den SQL Editor ein
   - Klicke auf "Run"

### 📝 Option 2: Via Supabase CLI (Wenn installiert)

```bash
# Installiere Supabase CLI (falls noch nicht vorhanden)
npm install -g supabase

# Login zu deinem Projekt
supabase link

# Führe Migration aus
supabase db execute < tennis-team/CREATE_MATCHDAYS_SYSTEM.sql
```

## ✅ Nach der Migration prüfen

```sql
-- Prüfe ob matchdays erstellt wurde
SELECT COUNT(*) FROM matchdays;

-- Prüfe ob match_results die matchday_id hat
SELECT COUNT(*) FROM match_results WHERE matchday_id IS NOT NULL;

-- Zeige migrierte Matchdays
SELECT 
    md.id,
    ht.club_name as home_club,
    ht.team_name as home_team,
    at.club_name as away_club,
    at.team_name as away_team,
    md.match_date,
    md.location
FROM matchdays md
LEFT JOIN team_info ht ON md.home_team_id = ht.id
LEFT JOIN team_info at ON md.away_team_id = at.id
LIMIT 10;
```

## 🎯 Erwartete Ergebnisse

Nach erfolgreicher Migration sollten Sie sehen:
- ✅ Tabelle `matchdays` existiert
- ✅ Tabelle `matchdays` hat Daten aus `matches`
- ✅ `match_results.matchday_id` ist befüllt
- ✅ Team-Namen werden korrekt aus DB geladen (kein hardcoded Sürth mehr)

## 🔄 Rollback (Falls nötig)

Sollte etwas schiefgehen:

```sql
-- Lösche matchdays falls nötig
DROP TABLE IF EXISTS matchdays CASCADE;

-- Entferne matchday_id column
ALTER TABLE match_results DROP COLUMN IF EXISTS matchday_id;
```

Die alte `matches` Tabelle bleibt unverändert als Backup.

