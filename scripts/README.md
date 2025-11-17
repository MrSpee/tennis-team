# Prüf-Scripts Übersicht

## Matchdays & Match-Results

### `count-matchdays.mjs`
**Zählt alle Matchdays in der Datenbank**

```bash
node scripts/count-matchdays.mjs
node scripts/count-matchdays.mjs "Gr. 034"  # Für spezifische Gruppe
```

**Zeigt:**
- Gesamtanzahl Matchdays
- Aufgeschlüsselt nach Gruppen
- Anzahl mit/ohne Match-Results
- Match-Nummern pro Gruppe

---

### `check-matchdays.mjs`
**Prüft Matchdays und ob sie Match-Results haben**

```bash
node scripts/check-matchdays.mjs
```

**Zeigt:**
- Alle Matchdays (letzte 20)
- Welche haben Match-Results
- Welche haben keine Match-Results
- Status (completed/scheduled)

---

### `debug-match-results.mjs`
**Detaillierte Analyse von Match-Results und Spieler-Daten**

```bash
node scripts/debug-match-results.mjs
node scripts/debug-match-results.mjs <matchday_id>  # Für spezifischen Matchday
```

**Zeigt:**
- Alle Matchdays mit Details
- Match-Results pro Matchday
- Player-IDs in match_results
- Spieler-Daten aus players_unified
- Welche Spieler fehlen

---

## Meeting Reports (Spielberichte)

### `debug-meeting-report.mjs`
**Analysiert einen Meeting Report und zeigt alle extrahierbaren Daten**

```bash
node scripts/debug-meeting-report.mjs 12500213
node scripts/debug-meeting-report.mjs "https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/meetingReport?meeting=12500213"
```

**Zeigt:**
- Metadata (Teams, Datum, Ergebnis, Schiedsrichter)
- Alle Einzel-Matches mit Spielern, LKs, Positionen, Ergebnissen
- Alle Doppel-Matches mit Spielern, LKs, Positionen, Ergebnissen
- JSON-Export aller Daten

---

## Scraper-Tests

### `test-single-group.mjs`
**Testet das Scrapen einer einzelnen Gruppe**

```bash
node scripts/test-single-group.mjs 34
```

**Zeigt:**
- Scraped Daten für eine Gruppe
- Teams, Matches, Standings
- Debug-Informationen

---

## Weitere Prüf-Scripts

### `check_all_clubs.mjs`
**Prüft alle Clubs in der Datenbank**

```bash
node scripts/check_all_clubs.mjs
```

---

### `check_matches_detail.mjs`
**Detaillierte Prüfung von Matches**

```bash
node scripts/check_matches_detail.mjs
```

---

### `full_db_check.mjs`
**Vollständige Datenbank-Prüfung**

```bash
node scripts/full_db_check.mjs
```

---

## Schnell-Referenz

### Wichtigste Scripts für nuLiga-Import:

1. **Matchdays zählen:**
   ```bash
   node scripts/count-matchdays.mjs
   ```

2. **Match-Results prüfen:**
   ```bash
   node scripts/debug-match-results.mjs
   ```

3. **Meeting Report analysieren:**
   ```bash
   node scripts/debug-meeting-report.mjs 12500213
   ```

4. **Gruppe scrapen (Test):**
   ```bash
   node scripts/test-single-group.mjs 34
   ```

