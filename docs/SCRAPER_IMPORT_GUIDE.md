# 🚀 Scraper-Import Anleitung

## Übersicht

Der vollständige Import-Flow für gescrapte Liga-Daten in 3 Schritten.

---

## 📋 Vorbereitung

1. **JSON-Datei bereitstellen**: z.B. `tmp/tvm_league_snapshot.json`
2. **Super-Admin Dashboard öffnen**: `http://localhost:3001/super-admin`
3. **Scraper-Tab auswählen** (wird automatisch geöffnet)

---

## 🔄 Import-Prozess

### **Schritt 1: Vereins-Fuzzy-Matching** 🏢

**Was passiert:**
- JSON hochladen → System vergleicht **automatisch** alle Clubs mit DB
- Normalisierte String-Vergleiche (ohne Leerzeichen, Umlaute, Sonderzeichen)
- Score ≥90% = "Verein bereits vorhanden" ✅
- Score <90% = "Verein fehlt" 🆕

**Anzeige:**
```
✅ Verein bereits in Datenbank: TC Lese GW Köln (Köln)
🆕 Verein anlegen
```

**Aktionen:**
- **Bei ✅ Existing:** Kein Import nötig
- **Bei 🆕 Neu:** Button "Verein anlegen" klicken
- **Manuelle Suche:** Suchfeld nutzen falls automatisches Matching fehlschlägt

**Bulk-Import:** *Nicht verfügbar* (Vereine müssen einzeln geprüft werden)

---

### **Schritt 2: Mannschaftscheck & Stammdaten** ⚽

**Was passiert:**
- Für **existierende** Clubs: Automatischer Team-Abgleich
- Prüfung: `team_info` (Club-ID + Team-Name)
- Prüfung: `team_seasons` (Liga + Saison + Gruppe)

**Anzeige je Team:**
```
TC GW Königsforst 1
✅ Bereits vorhanden

Status:
- Kategorie: Herren 40
- Suffix: 1
- Liga: 1. Bezirksliga
- Gruppe: Gr. 042
- Saison: Winter 2025/26
- ✅ Team-ID: abc-123
- ✅ Saison: verknüpft
```

**Oder:**
```
Kölner KHT SW 2
🆕 Neu

Status:
- Kategorie: Herren 40
- Suffix: 2
- Liga: 1. Bezirksliga
- Gruppe: Gr. 042
- Saison: Winter 2025/26
- 🆕 Team muss angelegt werden

[Button: Mannschaft anlegen]
```

**Bulk-Import:**
```
🚀 Alle 5 fehlenden Teams importieren
```
- Importiert **alle** Teams mit Status "🆕 Neu"
- Erstellt automatisch `team_info` + `team_seasons` Einträge
- Zeigt Fortschritt: `✅ 5 Teams importiert`

---

### **Schritt 3: Matchday-Übersicht** 🎾

**Statistik:**
```
10 Gesamt | 1 Gespielt | 9 Angesetzt
```

**Match-Tabelle:**
| Datum | Start | Heim | Gast | Austragungsort | Plätze | Score | Status | Import |
|-------|-------|------|------|----------------|--------|-------|--------|--------|
| 05.10.2025 | 16:00 | Kölner TG BG 1 | TC GW Königsforst 1 | PadelBox Weiden | 4-5 | 3:3 | ✅ gespielt | ☑️ |
| 22.11.2025 | 17:00 | TC GW Königsforst 1 | Kölner KHT SW 2 | Tennishalle Köln-Rath | 3-4 | – | ⏱️ angesetzt | ☑️ |

**Aktionen:**
- **Checkbox pro Match:** Wähle welche Matches importiert werden sollen
- **Bulk-Import-Button:** 
  ```
  🚀 Alle ausgewählten Matches importieren
  ```

**Import-Logik:**
1. **Neue Matches:** Werden in `matchdays` angelegt
2. **Bestehende Matches:** 
   - Score wird aktualisiert (wenn neuer vorhanden)
   - Status wird aktualisiert
   - Warnung wenn `match_results` fehlen
3. **Fehlende Teams:** Match wird übersprungen

**Ergebnis-Anzeige:**
```
✅ Import erfolgreich!
- 8 Matches importiert
- 2 Matches aktualisiert
- 0 Matches übersprungen
⚠️ 1 Match hat Score aber keine Einzelergebnisse (ID: abc-123)
```

---

## 🔍 Daten-Verifikation

**Nach dem Import:** Nutze die Verification-Queries in `sql/verify_scraper_import.sql`

### Schnell-Check (Query #6):
```sql
SELECT typ, anzahl FROM (
  SELECT 'Vereine' as typ, COUNT(*) as anzahl FROM club_info WHERE ...
  UNION ALL
  SELECT 'Teams' as typ, COUNT(*) as anzahl FROM team_info WHERE ...
  UNION ALL
  SELECT 'Team-Saisons' as typ, COUNT(*) as anzahl FROM team_seasons WHERE ...
  UNION ALL
  SELECT 'Matches' as typ, COUNT(*) as anzahl FROM matchdays WHERE ...
);
```

**Erwartetes Ergebnis für `tvm_league_snapshot.json`:**
```
Vereine:       5
Teams:         5
Team-Saisons:  5
Matches:      10
```

### Detail-Checks:
- **Query #1:** Vereine (mit `normalized_name`)
- **Query #2:** Teams (mit Club-Zuordnung)
- **Query #3:** Team-Saisons (Liga + Gruppe + Saison)
- **Query #4:** Matchdays (mit Scores + Status)
- **Query #5:** Matches mit Score aber ohne `match_results`

---

## ⚠️ Häufige Probleme

### ❌ "Verein wird nicht gefunden"
- **Ursache:** String-Normalisierung schlägt fehl
- **Lösung:** Nutze manuelle Suche im Club-Suchfeld
- **Alternative:** Score-Schwelle ist bei 90% – bei fuzzy matches "Verknüpfen"-Button nutzen

### ❌ "Team kann nicht angelegt werden"
- **Ursache:** Club muss zuerst existieren
- **Lösung:** Erst Verein importieren (Schritt 1), dann Team (Schritt 2)

### ❌ "Match wird übersprungen"
- **Ursache:** Heim- oder Auswärts-Team fehlt in DB
- **Lösung:** Erst alle Teams importieren (Schritt 2), dann Matches (Schritt 3)

### ⚠️ "Score ohne match_results"
- **Info:** Match hat Endergebnis, aber keine Einzelergebnisse
- **Empfehlung:** Einzelergebnisse manuell erfassen oder per separatem Import
- **Kein Fehler:** System warnt nur, Import funktioniert

---

## 📊 Datenbank-Struktur

### Tabellen:
1. **`club_info`**: Vereine
   - `normalized_name` für Fuzzy-Matching
   - `data_source = 'tvm_scraper'` markiert Import-Quelle

2. **`team_info`**: Teams
   - `club_id` → Foreign Key zu `club_info`
   - `team_name` = Suffix (z.B. "1", "2")

3. **`team_seasons`**: Saison-Verknüpfungen
   - `team_id` → Foreign Key zu `team_info`
   - `season`, `league`, `group_name` definieren Kontext

4. **`matchdays`**: Matches
   - `home_team_id`, `away_team_id` → Foreign Keys zu `team_info`
   - `match_date`, `start_time`, `venue`, `court_number`
   - `home_score`, `away_score`, `final_score`, `status`

5. **`match_results`**: Einzelergebnisse (nicht via Scraper)
   - `matchday_id` → Foreign Key zu `matchdays`
   - Match-Details (Einzel/Doppel, Sätze, Spieler)

---

## 🎯 Best Practices

1. **Import-Reihenfolge einhalten:**
   - Erst Vereine → dann Teams → dann Matches

2. **Bulk-Import nutzen:**
   - Teams: "Alle X fehlenden Teams importieren"
   - Matches: Checkboxen setzen + "Alle ausgewählten Matches importieren"

3. **Verification nach jedem Schritt:**
   - Prüfe Stats in der Header-Zeile
   - Nutze SQL-Queries für Details

4. **Duplicate Handling:**
   - System erkennt automatisch Duplikate (via `normalized_name`, `unique` constraints)
   - Existierende Einträge werden wiederverwendet, nicht neu angelegt

5. **Score-Updates:**
   - Scores werden aktualisiert wenn neue Daten vorliegen
   - `match_results` bleiben unverändert (müssen separat erfasst werden)

---

## 🔗 Links

- **Dashboard:** `http://localhost:3001/super-admin`
- **Verification SQL:** `sql/verify_scraper_import.sql`
- **Scraper Script:** `scripts/scrape_tvm_league.mjs`
- **Test-JSON:** `tmp/tvm_league_snapshot.json`

---

## 📝 Changelog

- **2025-11-09:** Initial version mit vollständigem 3-Stufen-Import












