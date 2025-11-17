# 🧹 Cleanup-Anleitung: Vorbereitung für sauberen nuLiga-Import

## Übersicht

Dieses Cleanup entfernt alle inkonsistenten/alten Daten und bereitet die Datenbank für einen sauberen Neustart mit nuLiga-Import vor.

**Was wird BEHALTEN:**
- ✅ Aktive App-Nutzer (`players_unified` mit `user_id` und `is_active = true`)
- ✅ Deren Team-Memberships (werden aber ungültig, da Teams gelöscht werden)
- ✅ Vereine (`club_info`) - können neu gemappt werden

**Was wird GELÖSCHT:**
- ❌ Alle Teams (`team_info`)
- ❌ Alle Matches (`matchdays`)
- ❌ Alle Match-Results (`match_results`)
- ❌ Alle Team-Seasons (`team_seasons`)
- ❌ Alle Spieler ohne `user_id` (externe Spieler, Gegner)
- ❌ Inaktive Spieler

## ⚠️ WICHTIG: Backup erstellen!

**Bevor du das Cleanup ausführst, erstelle ein Backup!**

### Option 1: Supabase Dashboard
1. Gehe zu deinem Supabase-Projekt
2. Settings → Database → Backups
3. Erstelle ein manuelles Backup

### Option 2: SQL Backup (empfohlen)
```sql
-- Führe diese Befehle AUS, bevor du das Cleanup startest:
CREATE TABLE players_unified_backup AS SELECT * FROM players_unified;
CREATE TABLE team_info_backup AS SELECT * FROM team_info;
CREATE TABLE matchdays_backup AS SELECT * FROM matchdays;
CREATE TABLE match_results_backup AS SELECT * FROM match_results;
CREATE TABLE team_seasons_backup AS SELECT * FROM team_seasons;
CREATE TABLE team_memberships_backup AS SELECT * FROM team_memberships;
```

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Analyse ausführen

Führe zuerst `ANALYZE_BEFORE_CLEANUP.sql` aus, um zu sehen, was gelöscht wird:

```bash
# Via Supabase SQL Editor oder psql
psql -h <your-db-host> -U postgres -d postgres -f sql/ANALYZE_BEFORE_CLEANUP.sql
```

**Prüfe die Ergebnisse:**
- ✅ Sind alle aktiven App-Nutzer korrekt identifiziert?
- ⚠️ Gibt es Warnungen bei Teams mit aktiven Memberships?
- 📊 Stimmen die Zahlen?

### Schritt 2: Backup erstellen

Siehe oben - **NICHT ÜBERSPRINGEN!**

### Schritt 3: Cleanup ausführen

Führe `CLEANUP_FOR_NULIGA_IMPORT.sql` aus:

```bash
# Via Supabase SQL Editor oder psql
psql -h <your-db-host> -U postgres -d postgres -f sql/CLEANUP_FOR_NULIGA_IMPORT.sql
```

**Oder Schritt für Schritt im Supabase SQL Editor:**
1. Öffne den SQL Editor
2. Kopiere den Inhalt von `CLEANUP_FOR_NULIGA_IMPORT.sql`
3. Führe es aus (es ist in einer Transaction, also alles-oder-nichts)

### Schritt 4: Verifikation

Das Cleanup-Script führt automatisch Verifikationen durch. Prüfe:
- ✅ Verbleibende Spieler = nur aktive App-Nutzer
- ✅ Verbleibende Teams = 0
- ✅ Verbleibende Matches = 0
- ✅ Verbleibende Match-Results = 0

### Schritt 5: Neustart mit nuLiga-Import

1. **Gehe ins SuperAdmin-Dashboard** → Scraper-Tab
2. **Lade nuLiga-Daten:**
   - Gruppen eingeben (z.B. "42, 44, 63")
   - "Live-Scrape" klicken
3. **Mappe Clubs/Teams:**
   - Prüfe die Club-Summaries
   - Bestätige oder erstelle neue Clubs
   - Bestätige Team-Zuordnungen
4. **Importiere Teams:**
   - "Teams importieren" klicken
   - Prüfe die Ergebnisse
5. **Importiere Matches:**
   - "Matches importieren" klicken
   - Prüfe auf Duplikate/Warnungen
6. **Importiere Match-Results:**
   - Gehe zu Matchdays-Tab
   - Für jedes abgeschlossene Match: "Meeting-Report laden" → "Importieren"

## 🔄 Rollback (falls etwas schief geht)

Falls du das Cleanup rückgängig machen musst:

```sql
BEGIN;

-- Stelle Spieler wieder her
DELETE FROM players_unified;
INSERT INTO players_unified SELECT * FROM players_unified_backup;

-- Stelle Teams wieder her
DELETE FROM team_info;
INSERT INTO team_info SELECT * FROM team_info_backup;

-- Stelle Matches wieder her
DELETE FROM matchdays;
INSERT INTO matchdays SELECT * FROM matchdays_backup;

-- Stelle Match-Results wieder her
DELETE FROM match_results;
INSERT INTO match_results SELECT * FROM match_results_backup;

-- Stelle Team-Seasons wieder her
DELETE FROM team_seasons;
INSERT INTO team_seasons SELECT * FROM team_seasons_backup;

-- Stelle Team-Memberships wieder her
DELETE FROM team_memberships;
INSERT INTO team_memberships SELECT * FROM team_memberships_backup;

COMMIT;
```

## ❓ FAQ

### Was passiert mit den Team-Memberships der aktiven App-Nutzer?

Die Memberships bleiben erhalten, aber die `team_id`-Referenzen werden ungültig (da Teams gelöscht werden). Nach dem nuLiga-Import müssen die Spieler manuell wieder ihren Teams zugeordnet werden, ODER du kannst ein Script schreiben, das die Memberships basierend auf Team-Namen neu zuordnet.

### Was passiert mit den Vereinen?

Vereine bleiben erhalten, aber Teams werden gelöscht. Beim nuLiga-Import werden neue Teams angelegt und mit den bestehenden Vereinen verknüpft (oder neue Vereine erstellt, falls nicht gefunden).

### Kann ich einzelne Teams/Matches behalten?

Ja, aber dann musst du das Cleanup-Script anpassen. Kommentiere die entsprechenden DELETE-Statements aus oder füge WHERE-Bedingungen hinzu.

### Was ist mit historischen Daten?

Alle historischen Matches und Ergebnisse werden gelöscht. Wenn du diese behalten willst, musst du sie vorher exportieren oder das Cleanup-Script anpassen.

## 🎯 Nach dem Cleanup

Nach erfolgreichem Cleanup und nuLiga-Import solltest du haben:
- ✅ Saubere Team-Struktur aus nuLiga
- ✅ Aktuelle Matches der Saison
- ✅ Korrekte Kategorie-Zuordnungen
- ✅ Keine Duplikate
- ✅ Aktive App-Nutzer (müssen ggf. Teams neu zuordnen)

## 📞 Support

Bei Problemen:
1. Prüfe die Verifikations-Ergebnisse
2. Prüfe die Supabase-Logs
3. Nutze das Rollback-Script falls nötig


