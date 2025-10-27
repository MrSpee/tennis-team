# Rankings.jsx Refactoring Plan

## Aktuelle Situation
- **1129 Zeilen** in einer Datei
- **Ineffizient**: N×M Queries (20 Spieler × Matches pro Spieler)
- **Monolithisch**: Alles in einer Komponente
- **Season-Problem**: Filter auf "Winter 2025/26", DB hat "winter"
- **KRITISCH**: LK-Berechnung filtert nach Season → FALSCH! LK ist saisonsübergreifend!

## Ziel
- **Modulare Struktur**: Kleinere Komponenten
- **Performance**: Stats-Caching, Batch-Queries
- **Bessere UX**: Verein/Mannschaft-Selektor
- **Cleaner Code**: Wartbar, erweiterbar

---

## Neue Struktur

### Dateien
```
src/components/rankings/
├── Rankings.jsx (Container - 100 Zeilen)
├── ClubSelector.jsx (30 Zeilen)
├── TeamSelector.jsx (40 Zeilen)
├── PlayerList.jsx (200 Zeilen)
│   ├── PlayerCard.jsx (100 Zeilen)
│   ├── PlayerStats.jsx (50 Zeilen)
│   └── LKCalculation.jsx (150 Zeilen)
└── FilterControls.jsx (30 Zeilen)
```

### DataContext Erweiterung
```javascript
// Neue Funktionen in DataContext
- useRankingsData() → Stats-Cache
- getClubTeams(club_id) → Teams eines Vereins
- getTeamPlayers(team_id) → Spieler einer Mannschaft
```

---

## Umsetzungsschritte

### 1. DataContext erweitern ✅
- Stats-Caching hinzufügen
- Club/Team-Filter-Funktionen

### 2. Rankings.jsx Container
- Vereins-Auswahl
- Mannschafts-Auswahl
- Filter (Team intim / Aufsteiger)

### 3. Komponenten extrahieren
- ClubSelector
- TeamSelector
- PlayerList
- PlayerCard
- LKCalculation

### 4. Performance-Optimierung
- Stats einmalig laden (nicht N×M)
- Virtual Scrolling für viele Spieler
- Debouncing

### 5. LK-Berechnung: SAISONSUEBERGREIFEND!
**WICHTIG**: LK berücksichtigt ALLE Saisons (Winter + Sommer)
- **LK-Berechnung**: KEIN Season-Filter!
- **Season-Statistiken**: Nur für Anzeige (z.B. "5 Siege in Winter-Saison")
- **current_lk**: Weiterführend über alle Saisons
- **Manuelle LK-Korrektur**: Muss möglich sein (z.B. Admin-Panel)

---

## UI Flow

```
User öffnet Rankings
↓
Vereins-Dropdown anzeigen (wenn >1 Club)
↓
Mannschafts-Dropdown anzeigen (wenn >1 Team)
↓
Filter: "Team intim" | "Aufsteiger"
↓
Player-Liste anzeigen (nach current_lk sortiert)
↓
🔮 LK Button → Akkordeon öffnet (mehrere parallel möglich)
↓
Stats werden automatisch geladen (gecacht)
```

---

## Notizen

### Aktuelle Probleme
1. **Zeile 84-86**: Season-Filter filtert auf "Winter 2025/26" → findet nichts!
2. **Zeile 72-175**: Stat-Berechnung ist N×M = ineffizient
3. **Zeile 25-69**: Club-Filterung über komplizierte Queries
4. **KRITISCH - Zeile 84-86, 399**: LK-Berechnung filtert nach Season → LK ist SAISONSUEBERGREIFEND!

### Lösungen
1. **LK-Berechnung**: ALLE Matches berücksichtigen (kein Season-Filter!)
2. **Season-Statistiken**: Nur für Anzeige filtern (Winter vs. Sommer für Stats)
3. Stats einmalig laden, dann cachen
4. Direkt über club_id filtern (existiert jetzt!)

### CSS behalten!
- Rankings.css bleibt unverändert
- Alle Styles funktionieren weiterhin

