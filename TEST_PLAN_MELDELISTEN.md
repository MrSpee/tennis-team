# 🧪 Test-Plan: Meldelisten-Import-Funktionalität

## Voraussetzungen prüfen

### 1. Migrationen ausführen

**Migration 1: team_roster Tabelle**
- Datei: `sql/create_team_roster_table.sql`
- Status: ✅ Bereits ausgeführt (laut User)

**Migration 2: source_url Spalte**
- Datei: `sql/add_source_url_to_team_seasons.sql`
- Status: ⚠️ Muss noch ausgeführt werden

**Ausführung:**
1. Öffne: https://supabase.com/dashboard/project/fyvmyyfuxuconhdbiwoa/sql/new
2. Kopiere Inhalt von `sql/add_source_url_to_team_seasons.sql`
3. Führe aus

---

## Test-Szenarien

### TEST 1: Team-Portrait Import mit Meldelisten-Speicherung

**Schritte:**
1. Gehe zu SuperAdmin Dashboard → Team-Portrait Import Tab
2. Füge URL ein: `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3471133&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026&group=43`
3. Klicke "Scrapen"
4. Wähle/Erstelle Verein: "VKC Köln"
5. Wähle/Erstelle Team: "VKC Köln 1" (Herren 40)
6. Klicke "Importieren"

**Erwartete Ergebnisse:**
- ✅ Spieler werden in `players_unified` importiert
- ✅ `team_seasons.source_url` wird gespeichert
- ✅ Meldelisten-Spieler werden in `team_roster` gespeichert
- ✅ Console-Log: `[parse-team-roster] ✅ X Spieler in team_roster gespeichert`

**Prüfung in Datenbank:**
```sql
-- Prüfe team_seasons
SELECT id, team_id, season, source_url 
FROM team_seasons 
WHERE source_url LIKE '%teamPortrait%' 
LIMIT 5;

-- Prüfe team_roster
SELECT id, team_id, season, rank, player_name, lk, player_id
FROM team_roster
ORDER BY team_id, season, rank
LIMIT 10;
```

---

### TEST 2: Automatisches Laden beim Öffnen eines Matchdays

**Schritte:**
1. Öffne einen Matchday, der ein Team mit `source_url` enthält
2. Gehe zu `/live-results/:matchId`
3. Öffne Browser-Konsole (F12)

**Erwartete Console-Logs:**
```
[autoTeamRosterImport] 🔍 Prüfe Meldelisten für X Matchdays...
[autoTeamRosterImport] 📊 Gefunden: Y eindeutige Team/Saison-Kombinationen
[autoTeamRosterImport] ✅ Meldeliste bereits vorhanden für Team...
[autoTeamRosterImport] 🚀 Starte Import von Z Meldelisten im Hintergrund...
```

**Erwartete UI:**
- ✅ Meldelisten-Spieler erscheinen im "Gegner-Spieler wählen" Dropdown
- ✅ Format: "📋 Mustermann, Max (Rang 1, LK 8.5)"
- ✅ Spieler sind nach Rang sortiert (niedrigster Rang = bester Spieler)

---

### TEST 3: Automatisches Laden beim Laden von Matchdays

**Schritte:**
1. Öffne Dashboard oder SuperAdmin Dashboard
2. Öffne Browser-Konsole (F12)
3. Warte bis Matchdays geladen sind

**Erwartete Console-Logs:**
```
[autoTeamRosterImport] 🔍 Prüfe Meldelisten für X Matchdays...
[autoTeamRosterImport] 📊 Gefunden: Y eindeutige Team/Saison-Kombinationen
[autoTeamRosterImport] 🚀 Starte Import von Z Meldelisten im Hintergrund...
[parse-team-roster] ✅ X Spieler aus Meldeliste extrahiert
[parse-team-roster] ✅ X Spieler in team_roster gespeichert
```

---

### TEST 4: Meldelisten-Spieler in Ergebnis-Eingabe

**Schritte:**
1. Öffne einen Matchday mit einem Gast-Team, das eine Meldeliste hat
2. Gehe zu Ergebnis-Eingabe
3. Klicke auf "Gegner-Spieler wählen" Dropdown

**Erwartete Ergebnisse:**
- ✅ Meldelisten-Spieler erscheinen mit 📋 Icon
- ✅ Rang wird angezeigt (z.B. "Rang 1")
- ✅ LK wird angezeigt (z.B. "LK 8.5")
- ✅ Spieler sind nach Rang sortiert
- ✅ Falls `player_id` vorhanden: Spieler ist mit `players_unified` verknüpft

---

## Fehlerbehandlung

### Wenn Meldelisten nicht geladen werden:

1. **Prüfe ob `source_url` vorhanden ist:**
```sql
SELECT team_id, season, source_url 
FROM team_seasons 
WHERE team_id = 'DEINE_TEAM_ID' 
AND season = 'Winter 2025/26';
```

2. **Prüfe ob `team_roster` Einträge existieren:**
```sql
SELECT COUNT(*) 
FROM team_roster 
WHERE team_id = 'DEINE_TEAM_ID' 
AND season = 'Winter 2025/26';
```

3. **Prüfe Browser-Konsole für Fehler:**
- Suche nach `[autoTeamRosterImport]` oder `[parse-team-roster]`
- Prüfe auf Fehler-Meldungen

---

## Erfolgs-Kriterien

✅ **Migrationen ausgeführt:**
- `team_roster` Tabelle existiert
- `team_seasons.source_url` Spalte existiert

✅ **Team-Portrait Import funktioniert:**
- URLs werden in `team_seasons.source_url` gespeichert
- Meldelisten werden in `team_roster` gespeichert

✅ **Automatisches Laden funktioniert:**
- Meldelisten werden beim Laden von Matchdays geladen
- Meldelisten werden beim Öffnen eines Matchdays geladen

✅ **UI-Integration funktioniert:**
- Meldelisten-Spieler erscheinen im Dropdown
- Rang und LK werden angezeigt
- Spieler sind korrekt sortiert

