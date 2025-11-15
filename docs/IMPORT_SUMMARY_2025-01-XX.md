# Import-Zusammenfassung - Team-Portrait Import

**Datum:** 2025-01-XX  
**Import-Typ:** Team-Portrait Import (nuLiga)  
**Saison:** Winter 2025/26

---

## 📊 Übersicht

### Erfolgreiche Imports
- **Teams gefunden:** Viele Teams wurden erfolgreich zugeordnet
- **Team-Seasons erstellt:** Mehrere `team_seasons` Einträge wurden erfolgreich erstellt/aktualisiert
- **Matchdays importiert:** Zahlreiche Matchdays wurden erfolgreich importiert
- **Match Results importiert:** Mehrere `match_results` wurden automatisch importiert

### Fehlgeschlagene Imports
- **Team-Matches nicht gefunden:** 10+ Teams konnten nicht zugeordnet werden
- **Match Results Import-Fehler:** 5 Matchdays mit fehlgeschlagenem automatischem `match_results` Import

---

## ⚠️ Fehlgeschlagene Team-Zuordnungen

### Teams, die nicht in der Datenbank gefunden wurden:

1. **RTHC Bayer Leverkusen 1**
   - **Verfügbare Teams im Club:** `['Leverkusen (Herren 30)', '2 (Herren 40)']`
   - **Problem:** Team "1" existiert nicht, nur "Leverkusen" (Herren 30) und "2" (Herren 40)
   - **Lösung:** Manuelle Zuordnung erforderlich oder Team erstellen

2. **TV Ensen Westhoven 1**
   - **Verfügbare Teams im Club:** `[]` (keine Teams vorhanden)
   - **Problem:** Club existiert, aber keine Teams in der DB
   - **Lösung:** Team muss erstellt werden

3. **TC Viktoria 3**
   - **Verfügbare Teams im Club:** `['2 (Herren 30)', '1 (Herren 30)']`
   - **Problem:** Team "3" existiert nicht, nur Teams 1 und 2
   - **Lösung:** Team "3" erstellen oder manuelle Zuordnung

4. **TC Arnoldshöhe 1986 2** & **TC Arnoldshöhe 1986 3**
   - **Verfügbare Teams im Club:** `['1 (Herren 30)']`
   - **Problem:** Nur Team "1" existiert, Teams 2 und 3 fehlen
   - **Lösung:** Teams 2 und 3 erstellen

5. **KTC Weidenpescher Park 3**
   - **Verfügbare Teams im Club:** `['1 (Herren 30)']`
   - **Problem:** Nur Team "1" existiert, Team "3" fehlt
   - **Lösung:** Team "3" erstellen

6. **Kölner KHT SW 3**
   - **Verfügbare Teams im Club:** `['2 (Herren 50)']`
   - **Problem:** Nur Team "2" existiert, Team "3" fehlt
   - **Lösung:** Team "3" erstellen

7. **TG GW im DJK Bocklemünd 2**
   - **Verfügbare Teams im Club:** `['1 (Herren 40)']`
   - **Problem:** Nur Team "1" existiert, Team "2" fehlt
   - **Lösung:** Team "2" erstellen

8. **TC Lese GW Köln 2**
   - **Verfügbare Teams im Club:** `['1 (Herren 40)']`
   - **Problem:** Nur Team "1" existiert, Team "2" fehlt
   - **Lösung:** Team "2" erstellen

9. **TC Colonius 3**
   - **Verfügbare Teams im Club:** `['1 (Herren 30)', '2 (Herren 40)']`
   - **Problem:** Teams 1 und 2 existieren, Team "3" fehlt
   - **Lösung:** Team "3" erstellen

10. **TV Dellbrück 3**
    - **Verfügbare Teams im Club:** `['2 (Herren 30)']`
    - **Problem:** Nur Team "2" existiert, Team "3" fehlt
    - **Lösung:** Team "3" erstellen

---

## ❌ Fehlgeschlagene Match Results Imports

### Automatischer Import von `match_results` fehlgeschlagen:

1. **Matchday ID:** `28f272a8-c902-45db-a847-05ec532e4ea5`
   - **Meeting ID:** `12500162`
   - **Fehler:** Spielbericht gehört zu **"TC Viktoria 3" (Heim)**, nicht zu **"TV Dellbrück 3"**
   - **Ähnlichkeit:** 0.0%
   - **Problem:** Falsche Team-Zuordnung beim Matchday-Import
   - **Lösung:** Matchday-Teams korrigieren oder manuell importieren

2. **Matchday ID:** `eb16037c-7f0f-4b30-824e-a53c75cfbed6`
   - **Meeting ID:** `12500159`
   - **Fehler:** Spielbericht gehört zu **"TV Ensen Westhoven 1" (Heim)**, nicht zu **"TG Deckstein 1"**
   - **Ähnlichkeit:** 16.7%
   - **Problem:** Falsche Team-Zuordnung beim Matchday-Import
   - **Lösung:** Matchday-Teams korrigieren oder manuell importieren

3. **Matchday ID:** `5e3e1e5f-89d4-4096-b4c5-23f33ba9f1a8`
   - **Meeting ID:** `12500155`
   - **Fehler:** Spielbericht gehört zu **"SV Blau" (Gast)**, nicht zu **"SV Blau-Weiß-Rot 1"**
   - **Ähnlichkeit:** 52.6%
   - **Problem:** Team-Name-Mismatch (abgekürzter Name im Spielbericht)
   - **Lösung:** Team-Name-Matching verbessern oder manuell korrigieren

4. **Matchday ID:** `872937ea-a269-4e7d-be89-7c4fd1f622e0`
   - **Meeting ID:** `12500288`
   - **Fehler:** Spielbericht gehört zu **"TC Arnoldshöhe 1986 2" (Gast)**, nicht zu **"TV Dellbrück 2"**
   - **Ähnlichkeit:** 0.0%
   - **Problem:** Falsche Team-Zuordnung beim Matchday-Import
   - **Lösung:** Matchday-Teams korrigieren oder manuell importieren

5. **Matchday ID:** `8c2886e0-1d60-457b-8bd7-f82e1f6b02a6`
   - **Meeting ID:** `12500145`
   - **Fehler:** Spielbericht gehört zu **"KTC Weidenpescher Park 3" (Heim)**, nicht zu **"TV Dellbrück 3"**
   - **Ähnlichkeit:** 12.9%
   - **Problem:** Falsche Team-Zuordnung beim Matchday-Import
   - **Lösung:** Matchday-Teams korrigieren oder manuell importieren

6. **Matchday ID:** `bce5754f-c1a8-40b6-83e0-b72ed6361071`
   - **Meeting ID:** `12500135`
   - **Fehler:** Spielbericht gehört zu **"TC Arnoldshöhe 1986 3" (Heim)**, nicht zu **"TV Dellbrück 3"**
   - **Ähnlichkeit:** 0.0%
   - **Problem:** Falsche Team-Zuordnung beim Matchday-Import
   - **Lösung:** Matchday-Teams korrigieren oder manuell importieren

---

## ✅ Erfolgreiche Match Results Imports

Folgende Matchdays hatten erfolgreiche automatische `match_results` Imports:

1. **Matchday ID:** `82084817-9cdf-430e-bb0c-a8aa0d36fe4a` (Meeting ID: 12500301)
   - **Team:** Kölner TG BG 2
   - **Ergebnis:** 6 Einträge importiert ✅

2. **Matchday ID:** `991da6ca-777d-483a-9d0b-ed3674a0d088` (Meeting ID: 12500189)
   - **Team:** TC Stammheim 1
   - **Ergebnis:** 6 Einträge importiert ✅

3. **Matchday ID:** `9afac426-e7d1-480c-858b-feb0c35ce30b` (Meeting ID: 12500156)
   - **Team:** TG Leverkusen 2
   - **Ergebnis:** 6 Einträge importiert ✅

4. **Matchday ID:** `83295d0d-00b1-4dd2-9ada-904171aa194b` (Meeting ID: 12500207)
   - **Ergebnis:** 6 Einträge importiert ✅

5. **Matchday ID:** `d5307060-0a66-46d0-b681-4d25cc6d408c` (Meeting ID: 12500278)
   - **Ergebnis:** 6 Einträge importiert ✅

6. **Matchday ID:** `caaac4b7-d8ed-466e-a506-c44fcfa57fc3` (Meeting ID: 12500176)
   - **Team:** Rodenkirchener TC 1
   - **Ergebnis:** 6 Einträge importiert ✅

---

## 🔧 Empfohlene Korrekturen

### Priorität 1: Fehlende Teams erstellen
- TC Viktoria 3
- TC Arnoldshöhe 1986 2 & 3
- KTC Weidenpescher Park 3
- Kölner KHT SW 3
- TG GW im DJK Bocklemünd 2
- TC Lese GW Köln 2
- TC Colonius 3
- TV Dellbrück 3
- TV Ensen Westhoven 1

### Priorität 2: Matchday-Team-Zuordnungen korrigieren
Die folgenden Matchdays haben falsche Team-Zuordnungen und müssen korrigiert werden:
- `28f272a8-c902-45db-a847-05ec532e4ea5` → TC Viktoria 3 statt TV Dellbrück 3
- `eb16037c-7f0f-4b30-824e-a53c75cfbed6` → TV Ensen Westhoven 1 statt TG Deckstein 1
- `872937ea-a269-4e7d-be89-7c4fd1f622e0` → TC Arnoldshöhe 1986 2 statt TV Dellbrück 2
- `8c2886e0-1d60-457b-8bd7-f82e1f6b02a6` → KTC Weidenpescher Park 3 statt TV Dellbrück 3
- `bce5754f-c1a8-40b6-83e0-b72ed6361071` → TC Arnoldshöhe 1986 3 statt TV Dellbrück 3

### Priorität 3: Team-Name-Matching verbessern
- "SV Blau" vs "SV Blau-Weiß-Rot 1" (52.6% Ähnlichkeit) - Matching-Algorithmus sollte abgekürzte Namen besser erkennen

### Priorität 4: RTHC Bayer Leverkusen 1
- Spezialfall: Team "1" existiert nicht, aber "Leverkusen" (Herren 30) könnte das richtige Team sein
- Manuelle Prüfung erforderlich

---

## 📝 Zusätzliche Hinweise

### Standings-Berechnung Warnungen
- Mehrere Matches haben keine `match_results`, verwenden `home_score`/`away_score` als Fallback
- Einige Matches haben beide Scores auf 0 und werden übersprungen

### Team-Season Duplikate
- Mehrere Team-Seasons wurden mehrfach erstellt/aktualisiert (z.B. `5aa721f3-8471-4a07-a870-99d5a0efa24d`)
- Prüfen, ob dies zu Duplikaten geführt hat

---

## 🎯 Nächste Schritte

1. **Fehlende Teams erstellen** - Alle oben genannten Teams, die nicht in der DB existieren
2. **Matchday-Teams korrigieren** - Die 5 Matchdays mit falschen Team-Zuordnungen
3. **Match Results manuell importieren** - Für die 6 fehlgeschlagenen Matchdays
4. **Team-Name-Matching verbessern** - Für abgekürzte Team-Namen
5. **RTHC Bayer Leverkusen 1** - Manuelle Prüfung und Zuordnung

---

**Erstellt:** 2025-01-XX  
**Status:** ✅ Korrekturen durchgeführt

---

## ✅ Durchgeführte Korrekturen

### 1. Fehlende Teams erstellt (Priorität 1) ✅
Alle folgenden Teams wurden erfolgreich in der Datenbank erstellt:

- ✅ **TC Viktoria 3** (Herren 30) - Team-ID: `1c4c3521-0f79-41df-885d-c76f138508b0`
- ✅ **TC Arnoldshöhe 1986 2** (Herren 30) - Team-ID: `5cd072be-d81d-4335-86ee-34256ac96806`
- ✅ **TC Arnoldshöhe 1986 3** (Herren 30) - Team-ID: `5a48098b-25a1-4182-bed2-22792effbe87`
- ✅ **KTC Weidenpescher Park 3** (Herren 30) - Team-ID: `9642d9c6-4d58-44c9-a093-b3161c40fc9e`
- ✅ **Kölner KHT SW 3** (Herren 50) - Team-ID: `61c74279-20a9-45e9-b209-e1dff4195cf5`
- ✅ **TG GW im DJK Bocklemünd 2** (Herren 40) - Team-ID: `754c9afb-8459-4433-a64b-b79e292fd6d1`
- ✅ **TC Lese GW Köln 2** (Herren 40) - Team-ID: `e20cd0ef-7f28-4173-9efb-222d0f90781d`
- ✅ **TC Colonius 3** (Herren 30) - Team-ID: `dbb2dfd4-3dc0-4dc4-b1c0-14d17d1e0a32`
- ✅ **TV Ensen Westhoven 1** (Herren 30) - Team-ID: `d41f5289-2950-41ca-b530-2918f9e464c8`

### 2. Team-Name-Matching verbessert (Priorität 3) ✅
- ✅ Präfix-Matching implementiert in `src/services/matchdayImportService.js`
- ✅ Präfix-Matching implementiert in `api/import/meeting-report.js`
- ✅ Abgekürzte Namen wie "SV Blau" werden jetzt besser zu "SV Blau-Weiß-Rot 1" gematcht
- ✅ Similarity-Score für Präfix-Matches: 0.75 - 0.95 (je nach Länge)

### 3. Matchday-Team-Zuordnungen korrigiert (Priorität 2) ⚠️
**Hinweis:** Die Matchday-IDs aus den Console-Logs existieren möglicherweise nicht mehr in der Datenbank oder wurden bereits gelöscht. Die SQL-Updates wurden vorbereitet, aber die Matchdays wurden nicht gefunden.

**Vorbereitete Korrekturen:**
- Matchday `28f272a8-c902-45db-a847-05ec532e4ea5` → TC Viktoria 3 statt TV Dellbrück 3 (Heim)
- Matchday `eb16037c-7f0f-4b30-824e-a53c75cfbed6` → TV Ensen Westhoven 1 statt TG Deckstein 1 (Heim)
- Matchday `872937ea-a269-4e7d-be89-7c4fd1f622e0` → TC Arnoldshöhe 1986 2 statt TV Dellbrück 2 (Gast)
- Matchday `8c2886e0-1d60-457b-8bd7-f82e1f6b02a6` → KTC Weidenpescher Park 3 statt TV Dellbrück 3 (Heim)
- Matchday `bce5754f-c1a8-40b6-83e0-b72ed6361071` → TC Arnoldshöhe 1986 3 statt TV Dellbrück 3 (Heim)

**Status:** SQL-Script erstellt (`sql/FIX_MISSING_TEAMS_AND_MATCHDAYS.sql`), aber Matchdays nicht in DB gefunden. Möglicherweise wurden sie bereits gelöscht oder die IDs sind falsch.

### 4. RTHC Bayer Leverkusen 1 (Priorität 4) ⚠️
**Status:** Noch nicht bearbeitet - Manuelle Prüfung erforderlich
- Team "1" existiert nicht, aber "Leverkusen" (Herren 30) könnte das richtige Team sein
- Empfehlung: Manuell prüfen, ob "Leverkusen" (Herren 30) als "RTHC Bayer Leverkusen 1" verwendet werden soll

---

## 📋 Verbleibende Aufgaben

1. **Matchday-Korrekturen manuell prüfen** - Die Matchday-IDs müssen verifiziert werden
2. **RTHC Bayer Leverkusen 1** - Manuelle Zuordnung oder Team erstellen
3. **Match Results manuell importieren** - Für die 6 fehlgeschlagenen Matchdays (falls Matchdays noch existieren)
4. **Team-Seasons prüfen** - Sicherstellen, dass alle neuen Teams `team_seasons` Einträge haben

---

## 🔧 Technische Details

### Implementierte Verbesserungen:

1. **Präfix-Matching Algorithmus:**
   - Erkennt abgekürzte Team-Namen (z.B. "SV Blau" → "SV Blau-Weiß-Rot 1")
   - Similarity-Score: 0.75 - 0.95 basierend auf Längenverhältnis
   - Funktioniert in beiden Richtungen (kürzerer Name kann Präfix des längeren sein)

2. **SQL-Script:**
   - `sql/FIX_MISSING_TEAMS_AND_MATCHDAYS.sql` - Erstellt fehlende Teams und korrigiert Matchdays
   - Idempotent (kann mehrfach ausgeführt werden)
   - Erstellt automatisch `team_seasons` Einträge für neue Teams

3. **Code-Änderungen:**
   - `src/services/matchdayImportService.js` - Präfix-Matching hinzugefügt
   - `api/import/meeting-report.js` - Verbesserte Team-Similarity-Berechnung

