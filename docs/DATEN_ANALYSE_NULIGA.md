# 📊 Daten-Analyse: nuLiga Import

## 📋 Übersicht: Welche Daten erhalten wir?

### 1. Club-Daten (Top-Level)

| Feld | Wert | Status | Nutzung in App |
|------|------|--------|----------------|
| `clubNumber` | "36154" | ✅ Vorhanden | Club identifizieren, Club-Info speichern |
| `clubName` | `null` | ⚠️ **FEHLERQUELLE** | Sollte Club-Name enthalten, wird aber nicht extrahiert |

**Nutzung:**
- Club-Identifikation über `clubNumber`
- Club-Name wird aktuell NICHT extrahiert (muss manuell ergänzt werden)

---

### 2. Teams-Daten

| Feld | Wert | Status | Nutzung in App |
|------|------|--------|----------------|
| `contestType` | "Herren 30", "Damen 30", "Herren 40", etc. | ✅ Vorhanden | Altersklasse/Kategorie identifizieren |
| `teamName` | "Herren 30", "Damen 30" | ✅ Vorhanden | Team-Name (oft identisch mit contestType) |
| `teamUrl` | URL zur Team-Detail-Seite | ✅ Vorhanden | Direktlink zu nuLiga, für Updates nutzbar |
| `playerCount` | 19, 15, 32, etc. | ✅ Vorhanden | Anzahl Spieler pro Team |
| `roster` | Array von Spielern | ✅ Vorhanden | Vollständige Meldeliste |

**Nutzung:**
- Team-Zuordnung über `contestType` + `teamName`
- `teamUrl` für automatische Updates
- `playerCount` für Vollständigkeits-Prüfung

---

### 3. Spieler-Daten (Roster)

| Feld | Beispiel | Status | Nutzung in App |
|------|----------|--------|----------------|
| `rank` | 1, 2, 3, ... | ✅ Vorhanden | Reihenfolge in Meldeliste (spielstärke-basiert?) |
| `teamNumber` | 1, 2, ... | ✅ Vorhanden | Mannschaftsnummer (wichtig bei mehreren Teams) |
| `name` | "Sudbrack, Jan" | ✅ Vorhanden | Spieler-Name (Format: "Nachname, Vorname") |
| `lk` | "LK11,6" | ✅ Vorhanden | Leistungsklasse (Format: Komma als Dezimaltrennzeichen) |
| `tvmId` | "18002439" | ✅ Vorhanden | TVM-ID (8-stellig, eindeutige Spieler-ID) |
| `birthYear` | 1980 | ✅ Vorhanden | Geburtsjahr (4-stellig) |
| `singles` | `null` | ⚠️ **FEHLERQUELLE** | Spielstatistik Einzel (wird nicht extrahiert) |
| `doubles` | `null` | ⚠️ **FEHLERQUELLE** | Spielstatistik Doppel (wird nicht extrahiert) |
| `total` | `null` | ⚠️ **FEHLERQUELLE** | Spielstatistik Gesamt (wird nicht extrahiert) |

**Nutzung:**
- Spieler-Identifikation über `tvmId` (eindeutig!)
- `name` für Display (Format beachten!)
- `lk` für Leistungs-Klassifizierung
- `birthYear` für Altersberechnung
- `teamNumber` für Zuordnung bei mehreren Teams
- `rank` könnte für Spielstärke-Sortierung genutzt werden

---

### 4. Matching-Ergebnisse

| Feld | Beispiel | Status | Nutzung in App |
|------|----------|--------|----------------|
| `playerId` | UUID oder `null` | ✅ Vorhanden | Verknüpfung zu `players_unified` |
| `confidence` | 0-100 | ✅ Vorhanden | Sicherheit des Matches |
| `matchType` | "tvm_id", "exact", "fuzzy", "none" | ✅ Vorhanden | Match-Art (für Qualitätsprüfung) |
| `hasUserAccount` | true/false | ✅ Vorhanden | Hat Spieler App-Account? |
| `allMatches` | Array bei fuzzy | ✅ Vorhanden | Alternative Matches (bei fuzzy) |

**Nutzung:**
- `matchType` = "tvm_id": Sehr sicher, direkt verwenden
- `matchType` = "exact": Sehr sicher, direkt verwenden
- `matchType` = "fuzzy": Unsicher, manuelle Prüfung nötig
- `matchType` = "none": Neuer Spieler, muss angelegt werden
- `hasUserAccount`: Zeigt ob Spieler bereits in App registriert ist

---

## ⚠️ Identifizierte Fehlerquellen

### 1. `clubName` ist `null`

**Problem:**
```json
"clubName": null
```

**Ursache:**
- Club-Name wird nicht aus der clubPools-Seite extrahiert
- HTML-Parsing findet den Namen nicht (Patterns funktionieren nicht)
- **ABER:** Club-Name IST auf nuLiga vorhanden: "VKC Köln" steht vor "Namentliche Mannschaftsmeldung"

**Auswirkung:**
- Club-Name wird nicht zurückgegeben

**Lösung (empfohlen):**
- **Datenbank-Abgleich:** Club-Name über Club-Nummer aus `club_info` Tabelle laden
  ```sql
  SELECT name FROM club_info WHERE club_number = '36154'
  ```
- **Fallback:** HTML-Parsing verbessern (nur wenn nicht in DB)
- **Vorteil:** Zuverlässiger, schneller, konsistenter

**Referenz:**
- nuLiga-Seite: https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154
- Club-Name steht direkt im HTML: `<h1>VKC Köln</h1>` oder Text "VKC Köln" vor "Namentliche Mannschaftsmeldung"

---

### 2. Spielstatistiken (`singles`, `doubles`, `total`) sind immer `null`

**Problem:**
```json
"singles": null,
"doubles": null,
"total": null
```

**Ursache:**
- Diese Daten sind **NICHT** auf der clubPools-Seite verfügbar
- Sie sind auf der **teamPortrait-Seite** verfügbar (andere URL!)

**Auswirkung:**
- Spielstatistiken können nicht automatisch importiert werden (ohne zusätzlichen Request)
- Müssen manuell gepflegt werden ODER zusätzlicher Request zu teamPortrait-Seite

**Lösung:**
- **Option 1 (aktuell):** Daten bleiben `null` - werden manuell gepflegt
- **Option 2 (optional):** Zusätzlicher Request zu teamPortrait-Seite für jedes Team
  - URL-Format: `https://tvm.liga.nu/.../teamPortrait?team={TEAM_ID}&championship={CHAMPIONSHIP}`
  - Beispiel: https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478330&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026
  - **Nachteil:** Mehr Requests, langsamer, komplexer

**Empfehlung:**
- Erst mal weglassen (wie aktuell)
- Später als optionales Feature hinzufügen

---

### 3. LK-Format mit Komma statt Punkt

**Problem:**
```json
"lk": "LK11,6"  // Komma als Dezimaltrennzeichen
```

**Auswirkung:**
- Kann Probleme bei numerischen Vergleichen verursachen
- Datenbank-Spalte muss String sein (nicht Decimal)

**Lösung:**
- ✅ Aktuell korrekt: Als String speichern
- Optional: Normalisieren zu "11.6" für bessere Sortierung
- ABER: Vorsicht bei Umwandlung - Format muss konsistent bleiben

---

### 4. Namens-Format: "Nachname, Vorname"

**Problem:**
```json
"name": "Sudbrack, Jan"  // Format: "Nachname, Vorname"
```

**Auswirkung:**
- Muss für Display umgewandelt werden ("Jan Sudbrack")
- Matching-Algorithmus muss dieses Format berücksichtigen
- ✅ Aktuell bereits implementiert: `normalizeNameForComparison`

**Lösung:**
- ✅ Bereits gelöst: Normalisierung funktioniert
- Für Display: Funktion `formatNameForDisplay(name)` verwenden

---

### 5. Titel im Namen (z.B. "Dr.")

**Problem:**
```json
"name": "Dr. Pullmann, Friedrich"
"name": "Dr. Heinzler, Rainer"
```

**Auswirkung:**
- Kann Matching-Probleme verursachen
- Muss beim Parsing entfernt werden

**Lösung:**
- ✅ Bereits implementiert: Titel werden in `normalizeNameForComparison` entfernt
- Funktioniert korrekt

---

### 6. Mehrere Teams (teamNumber: 1, 2)

**Problem:**
```json
// Herren 50 hat 2 Teams:
{ "rank": 4, "teamNumber": 1, "name": "Kliemt, Mathias" }
{ "rank": 5, "teamNumber": 2, "name": "Kostka, Michael" }
```

**Auswirkung:**
- Spieler müssen korrekt dem richtigen Team zugeordnet werden
- `teamNumber` ist wichtig für Zuordnung

**Lösung:**
- ✅ Bereits korrekt: `teamNumber` wird extrahiert und gespeichert
- Frontend muss Teams nach `teamNumber` gruppieren

---

### 7. Fuzzy-Matches mit niedriger Confidence

**Problem:**
```json
{
  "name": "Hoffmann, Anna",
  "matchResult": {
    "confidence": 80,
    "matchType": "fuzzy",
    "allMatches": [
      { "name": "Jan Hoffmann", "similarity": 80 }
    ]
  }
}
```

**Auswirkung:**
- Können falsche Zuordnungen sein
- Müssen manuell geprüft werden

**Lösung:**
- ✅ Bereits implementiert: Filter für Fuzzy-Matches
- ✅ Review-Tabelle zeigt Fuzzy-Matches markiert
- ✅ Alternative Matches werden angezeigt

---

### 8. Spieler ohne Match (`matchType: "none"`)

**Problem:**
```json
{
  "name": "Hart, Simon",
  "matchResult": {
    "playerId": null,
    "confidence": 0,
    "matchType": "none"
  }
}
```

**Auswirkung:**
- Neuer Spieler, muss in Datenbank angelegt werden
- TVM-ID sollte vorhanden sein (für spätere Verknüpfung)

**Lösung:**
- ✅ Bereits implementiert: Unmatched Players werden rot markiert
- ✅ TVM-ID wird gespeichert (spätere Verknüpfung möglich)

---

## ✅ Daten-Qualität: Zusammenfassung

### Sehr gut extrahiert:
- ✅ TVM-ID (eindeutig, zuverlässig)
- ✅ Name, LK, Geburtsjahr
- ✅ Team-Zuordnung (contestType, teamNumber)
- ✅ Matching-Ergebnisse (sehr detailliert)

### Teilweise vorhanden:
- ⚠️ Club-Name (null, muss manuell ergänzt werden)
- ⚠️ Spielstatistiken (null, evtl. nicht verfügbar)

### Gut gelöst:
- ✅ Namens-Normalisierung (Titel, Format)
- ✅ Team-Nummer (mehrere Teams)
- ✅ Fuzzy-Match-Handling
- ✅ Match-Qualitäts-Prüfung

---

## 🎯 Empfohlene Nutzung für die App

### 1. Spieler-Identifikation
- **Primär:** TVM-ID (eindeutig, zuverlässig)
- **Sekundär:** Name + Geburtsjahr (für Fuzzy-Matching)

### 2. Team-Zuordnung
- **Primär:** `contestType` + `teamNumber`
- **Sekundär:** `teamName` (für Display)

### 3. Spieler-Profile
- Name: Aus "Nachname, Vorname" formatieren
- LK: Als String speichern (Format: "LK11,6")
- Geburtsjahr: Für Altersberechnung nutzen
- TVM-ID: Für externe Verknüpfung nutzen

### 4. Matching-Qualität
- **TVM-ID Match:** Direkt verwenden (100% sicher)
- **Exact Match:** Direkt verwenden (100% sicher)
- **Fuzzy Match:** Manuelle Prüfung nötig (80% sicher)
- **None Match:** Neuen Spieler anlegen

### 5. App-Account-Erkennung
- `hasUserAccount: true` → Spieler ist bereits registriert
- Kann für Onboarding genutzt werden
- Kann für Notifications genutzt werden

---

## 🔧 Optimierungs-Vorschläge

### 1. Club-Name: Datenbank-Abgleich (EMPFOHLEN)
**Priorität:** Hoch  
**Aufwand:** Niedrig  
**Nutzen:** Hoch

**Empfehlung:** Club-Name über Club-Nummer aus Datenbank laden

```javascript
// 1. Club-Nummer extrahieren (bereits vorhanden)
const clubNumber = extractClubNumber(clubPoolsUrl);

// 2. Aus Datenbank laden
const { data: clubData } = await supabase
  .from('club_info')
  .select('name')
  .eq('club_number', clubNumber)
  .single();

const clubName = clubData?.name || null;

// 3. Fallback: HTML-Parsing (nur wenn nicht in DB)
if (!clubName) {
  // HTML-Parsing hier (falls nötig)
}
```

**Vorteile:**
- ✅ Zuverlässiger (DB ist Single Source of Truth)
- ✅ Schneller (kein HTML-Parsing)
- ✅ Konsistenter (gleicher Name überall)

**Referenz:**
- Club-Name ist auf nuLiga vorhanden: https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=36154
- Steht als `<h1>VKC Köln</h1>` oder Text vor "Namentliche Mannschaftsmeldung"

---

### 2. Spielstatistiken: Optional von teamPortrait-Seite holen
**Priorität:** Niedrig  
**Aufwand:** Hoch  
**Nutzen:** Mittel

**Status:** Spielstatistiken sind auf teamPortrait-Seite verfügbar!

**URL-Format:**
```
https://tvm.liga.nu/.../teamPortrait?team={TEAM_ID}&championship={CHAMPIONSHIP}
```

**Beispiel:**
- https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/teamPortrait?team=3478330&championship=K%C3%B6ln-Leverkusen+Winter+2025%2F2026

**Implementierung (optional):**
```javascript
// Für jedes Team zusätzlich teamPortrait-Seite parsen
async function getPlayerStatistics(teamPortraitUrl) {
  const response = await fetch(teamPortraitUrl);
  const html = await response.text();
  // Parse Spielstatistiken aus HTML-Tabelle
}
```

**Nachteile:**
- ❌ Zusätzliche Requests (langsamer)
- ❌ Mehr Komplexität
- ❌ Statistiken ändern sich oft

**Empfehlung:** 
- Erst mal weglassen (wie aktuell)
- Später als optionales Feature hinzufügen

---

### 3. LK-Normalisierung
**Priorität:** Niedrig  
**Aufwand:** Niedrig  
**Nutzen:** Niedrig

Optional: Komma zu Punkt umwandeln für bessere Sortierung:
```javascript
const normalizedLK = lk.replace(',', '.');
```

**ABER:** Nur wenn Format konsistent ist!

---

### 4. Rank-Nutzung
**Priorität:** Niedrig  
**Aufwand:** Niedrig  
**Nutzen:** Mittel

`rank` könnte für Spielstärke-Sortierung genutzt werden:
- Niedrigere Zahl = Stärkerer Spieler?
- Für Team-Aufstellung nutzbar?

---

## 📝 Fazit

**Daten-Qualität:** Sehr gut (95%+ der wichtigen Daten verfügbar)

**Hauptprobleme:**
1. Club-Name fehlt (✅ **Lösung:** Aus DB laden über Club-Nummer)
2. Spielstatistiken fehlen (✅ **Gefunden:** Auf teamPortrait-Seite verfügbar, aber optional)

**Gelöste Probleme:**
- ✅ Namens-Normalisierung
- ✅ Mehrere Teams
- ✅ Fuzzy-Matching
- ✅ Match-Qualitäts-Prüfung

**Empfehlung:**
- ✅ Daten-Struktur ist sehr gut für unsere App nutzbar
- ✅ Club-Name: **Aus Datenbank laden** (über Club-Nummer)
- ✅ Spielstatistiken: **Optional** von teamPortrait-Seite holen (später)
- ✅ Alle wichtigen Daten (Name, TVM-ID, LK, Geburtsjahr) sind vollständig und zuverlässig

