# nuLiga Import-Prozess: Analyse & Konsolidierung

## 🔍 Unterschiede: clubPools vs. teamPortrait

### 1. **clubPools** (`/wa/clubPools?club=36154`)
**Zweck**: Saison-Initialisierung - Einmaliger Import zu Saisonbeginn

**Daten**:
- ✅ **Vereins-Info**: Name, Adresse, Website
- ✅ **Alle Teams** des Vereins für eine Saison
- ✅ **Meldelisten** (Roster) für ALLE Teams:
  - Spieler mit Rang (Position in Meldeliste)
  - LK (Leistungsklasse)
  - TVM-ID
  - Geburtsjahr
  - **KEINE Statistiken** (Einzel/Doppel-Ergebnisse)

**Wann importieren?**
- ✅ **Einmal zu Saisonbeginn** (z.B. Oktober für Winter-Saison)
- ✅ **Statisch** - ändert sich während der Saison nicht
- ✅ **Bulk-Import** für alle Vereine möglich

**Speicherung**:
- `team_roster` Tabelle: `team_id`, `season`, `rank`, `player_name`, `lk`, `tvm_id`, `birth_year`
- `team_info` Tabelle: Team-Details, Liga, Kategorie

---

### 2. **teamPortrait** (`/wa/teamPortrait?team=3478330&championship=...`)
**Zweck**: Laufende Updates - Dynamische Spieler-Statistiken

**Daten**:
- ✅ **Einzelnes Team** (nicht alle Teams eines Vereins)
- ✅ **Spieler-Statistiken**:
  - Einzel-Bilanz (z.B. "5:3")
  - Doppel-Bilanz (z.B. "2:4")
  - Gesamt-Bilanz
  - Aktuelle LK (kann sich während Saison ändern)
- ✅ **Spieler-Rang** (Position in Meldeliste)
- ✅ **TVM-ID**, Geburtsjahr

**Wann importieren?**
- ✅ **Automatisch** wenn Matchdays geladen werden (für Gegner-Teams)
- ✅ **Manuell** für Updates von Spieler-Statistiken
- ✅ **Dynamisch** - ändert sich während der Saison

**Speicherung**:
- `team_roster` Tabelle: Aktualisiert `singles_record`, `doubles_record`, `total_record`, `lk`
- **UPSERT** statt INSERT (aktualisiert bestehende Einträge)

---

## 🎯 Konsolidierter Prozess

### **Phase 1: Saison-Initialisierung** (Einmal zu Saisonbeginn)

```
1. Club-Nummern finden/verifizieren
   ↓
2. clubPools-Import für alle Vereine
   ↓
3. Meldelisten in team_roster speichern
   ↓
4. Spieler-Matching (player_id zuordnen)
```

**Tools**:
- ✅ "Club-Nummern finden" Funktion
- ✅ "Bulk-Import" für alle Vereine
- ✅ "Meldelisten verwalten" für manuelle Korrekturen

---

### **Phase 2: Laufende Updates** (Während der Saison)

```
1. Matchdays importieren
   ↓
2. Automatisch teamPortrait für Gegner-Teams laden
   ↓
3. team_roster aktualisieren (Statistiken, LK)
```

**Tools**:
- ✅ Automatischer Import via `autoTeamRosterImportService`
- ✅ Manueller Import über "Team-Portrait" Tab

---

## ❌ Aktuelle Probleme

### 1. **Club-Nummern finden**
**Problem**: 
- Funktion existiert (`find-club-numbers` API)
- Aber: Prozess ist nicht klar dokumentiert
- Keine einfache Möglichkeit, fehlende Club-Nummern zu finden

**Lösung**:
- ✅ Vereins-Übersicht zeigt Status (hat Club-Nr. / fehlt)
- ✅ "Club-Nummern finden" Button prominent platzieren
- ✅ Automatischer Vorschlag: "Diese Vereine haben noch keine Club-Nummer"

### 2. **Doppelte Funktionalität**
**Problem**:
- `parse-club-rosters` und `parse-team-roster` überschneiden sich
- Beide speichern in `team_roster`
- Unklar, wann welche API verwendet werden soll

**Lösung**:
- ✅ **Klar trennen**:
  - `clubPools` → Saison-Initialisierung (Bulk-Import)
  - `teamPortrait` → Laufende Updates (Einzel-Team)
- ✅ **Dokumentation** im UI: "Wann verwende ich was?"

### 3. **Konsolidierung**
**Problem**:
- `nuliga-club-import` (neu) vs. `parse-club-rosters` (alt)
- Beide machen ähnliches, aber unterschiedliche Struktur

**Lösung**:
- ✅ **Eine API** für clubPools: `nuliga-club-import`
- ✅ **Eine API** für teamPortrait: `parse-team-roster` (bereits gut)
- ✅ Alte APIs als Fallback behalten, aber dokumentieren

---

## 📋 Empfohlener Workflow

### **Zu Saisonbeginn (z.B. Oktober für Winter-Saison):**

1. **Club-Nummern verifizieren**
   - Superadmin → "nuLiga Import" → "Meldelisten"
   - "Club-Nummern finden" → Alle Vereine durchsuchen
   - Fehlende Club-Nummern ergänzen

2. **Meldelisten importieren**
   - "Bulk-Import" → Alle Vereine mit Club-Nummern
   - Oder: Einzel-Import pro Verein
   - Speichert in `team_roster` (rank, player_name, lk, tvm_id)

3. **Spieler-Matching**
   - "Meldelisten verwalten" → Ungematchte Spieler zuordnen
   - Fuzzy-Matching automatisch, manuelle Korrekturen

4. **Fertig** ✅
   - Meldelisten sind statisch für die Saison
   - Keine weiteren Änderungen nötig

### **Während der Saison:**

1. **Automatisch** (im Hintergrund):
   - Wenn Matchdays geladen werden → `autoTeamRosterImportService`
   - Lädt `teamPortrait` für Gegner-Teams
   - Aktualisiert Statistiken in `team_roster`

2. **Manuell** (falls nötig):
   - "Team-Portrait" Tab → Einzelnes Team aktualisieren
   - Für eigene Teams oder spezifische Updates

---

## 🛠️ Technische Umsetzung

### **API-Konsolidierung:**

```
✅ BEHALTEN:
- nuliga-club-import (clubPools) → Saison-Initialisierung
- parse-team-roster (teamPortrait) → Laufende Updates

❌ DEPRECATED (aber als Fallback):
- parse-club-rosters (alt) → Wird durch nuliga-club-import ersetzt
```

### **UI-Struktur:**

```
📥 nuLiga Import
│
├── 📋 Meldelisten (clubPools)
│   ├── Club-Nummern finden
│   ├── Bulk-Import (alle Vereine)
│   ├── Einzel-Import (ein Verein)
│   └── Meldelisten verwalten (Bearbeitung)
│
├── 🏆 Match-Ergebnisse
│   └── Liga-Gruppen & Matches
│
└── 👥 Team-Portrait
    └── Einzelnes Team aktualisieren (Statistiken)
```

---

## ✅ Nächste Schritte

1. **Club-Nummern-Findung verbessern**
   - Automatischer Vorschlag für Vereine ohne Club-Nummer
   - Einfacherer Workflow

2. **Dokumentation im UI**
   - Tooltips: "Wann verwende ich was?"
   - Status-Anzeige: "Saison-Initialisierung" vs. "Laufende Updates"

3. **Prozess-Automatisierung**
   - "Saison-Initialisierung" Button → Führt alle Schritte aus
   - Progress-Tracking

4. **Konsolidierung abschließen**
   - Alte APIs markieren als deprecated
   - Migration zu neuen APIs

