# Rankings Refactoring - Schrittweise Umsetzung

## PHASE 1: KRITISCHER FIX (Sofort!)
**Zeilen 84-86, 399**: LK-Berechnung filtert nach Season → FALSCH!

### Was zu tun ist:
```javascript
// AKTUELL (FALSCH):
const seasonMatches = matches.filter(m => m.season === currentSeason);

// NEU (RICHTIG):
const seasonMatches = matches; // ALLE Matches für LK!
// Optional: Nur für Statistiken-Anzeige filtern
```

---

## PHASE 2: Stats-Caching (DataContext)
**Zeilen 72-175**: Ineffiziente N×M Queries

### Was zu tun ist:
```javascript
// EINMALIG laden, dann cachen
const stats = await loadAllPlayerStats();
// Statt: 20 Spieler × 100 Matches = 2000 Queries
// Jetzt: 1 Query mit Aggregation
```

---

## PHASE 3: UI-Komponenten (Rankings.jsx)
**1129 Zeilen → Modularisieren**

### Neue Struktur:
```
Rankings.jsx (Container - 100 Zeilen)
├── ClubSelector.jsx
├── TeamSelector.jsx  
├── PlayerList.jsx
│   ├── PlayerCard.jsx
│   └── LKCalculation.jsx
└── FilterControls.jsx
```

---

## Entscheidung:
**Sofort starten mit Phase 1 (Kritischer Fix)?**
**Oder komplettes Refactoring auf einmal?**


