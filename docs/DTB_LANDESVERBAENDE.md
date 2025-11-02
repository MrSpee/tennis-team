# DTB Landesverbände - Übersicht

## Deutscher Tennis Bund (DTB)

Der Deutsche Tennis Bund besteht aus **17 Landesverbänden**, die regional organisiert sind.

Stand: 1. Februar 2022

## Landesverbände

| Verband | Kürzel | Mitglieder | Vereine | Plätze | Bundesland |
|---------|--------|------------|---------|--------|-----------|
| Badischer Tennisverband | BTV-Baden | 109.617 | 690 | 3.477 | Baden-Württemberg |
| Württembergischer Tennis-Bund | WTB | 163.926 | 999 | 5.350 | Baden-Württemberg |
| Bayerischer Tennis-Verband | BTV | 302.952 | 1.981 | 9.483 | Bayern |
| Tennis-Verband Berlin-Brandenburg | TVBB | 43.180 | 189 | 1.203 | Berlin / Brandenburg |
| Hamburger Tennis-Verband | HTV-Hamburg | 36.359 | 84 | 880 | Hamburg |
| Hessischer Tennis-Verband | HTV-Hessen | 121.693 | 726 | 3.623 | Hessen |
| Tennisverband Mecklenburg-Vorpommern | TMV | 4.199 | 39 | 223 | Mecklenburg-Vorpommern |
| Tennisverband Mittelrhein | TVM | 77.402 | 359 | 2.171 | Nordrhein-Westfalen |
| Tennis-Verband Niederrhein | TVN | 95.024 | 416 | 2.873 | Nordrhein-Westfalen |
| Westfälischer Tennis-Verband | WTV | 127.327 | 779 | 4.440 | Nordrhein-Westfalen |
| Tennisverband Niedersachsen-Bremen | TNB | 134.834 | 1.104 | 5.566 | Niedersachsen / Bremen |
| Tennisverband Rheinland-Pfalz | TRP | 79.401 | 669 | 2.821 | Rheinland-Pfalz |
| Saarländischer Tennisbund | STB | 21.780 | 160 | 792 | Saarland |
| Sächsischer Tennis Verband | STV | 12.142 | 140 | 638 | Sachsen |
| Tennisverband Sachsen-Anhalt | TSA | 5.450 | 76 | 351 | Sachsen-Anhalt |
| Tennisverband Schleswig-Holstein | TSH | 41.703 | 317 | 1.693 | Schleswig-Holstein |
| Thüringer Tennis-Verband | TTV | 5.835 | 66 | 273 | Thüringen |

## Besonderheiten

### Mehrere Verbände pro Bundesland

#### **Baden-Württemberg (2 Verbände)**
- BTV-Baden (Badischer Tennisverband)
- WTB (Württembergischer Tennis-Bund)

#### **Nordrhein-Westfalen (3 Verbände)**
- TVM (Tennisverband Mittelrhein)
- TVN (Tennis-Verband Niederrhein)
- WTV (Westfälischer Tennis-Verband)

### Namensdoppelungen

⚠️ **Achtung:** Es gibt zwei verschiedene "HTV":
- **HTV-Hamburg** - Hamburger Tennis-Verband
- **HTV-Hessen** - Hessischer Tennis-Verband

⚠️ **Achtung:** Es gibt zwei verschiedene "BTV":
- **BTV-Baden** - Badischer Tennisverband (Baden-Württemberg)
- **BTV** - Bayerischer Tennis-Verband (Bayern)

## Implementierung in der Anwendung

### Datenbank-Schema

```sql
-- club_info Tabelle
CREATE TABLE club_info (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  federation TEXT,           -- Landesverband (z.B. 'TVM', 'BTV', etc.)
  bundesland TEXT,           -- Bundesland (automatisch gesetzt)
  website TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Automatische Bundesland-Zuordnung

Beim Erstellen eines Vereins wird das Bundesland automatisch basierend auf dem Verband gesetzt:

```javascript
const verbandToBundesland = {
  'BTV-Baden': 'Baden-Württemberg',
  'WTB': 'Baden-Württemberg',
  'BTV': 'Bayern',
  'TVBB': 'Berlin/Brandenburg',
  'HTV-Hamburg': 'Hamburg',
  'HTV-Hessen': 'Hessen',
  'TMV': 'Mecklenburg-Vorpommern',
  'TVM': 'Nordrhein-Westfalen',
  'TVN': 'Nordrhein-Westfalen',
  'WTV': 'Nordrhein-Westfalen',
  'TNB': 'Niedersachsen/Bremen',
  'TRP': 'Rheinland-Pfalz',
  'STB': 'Saarland',
  'STV': 'Sachsen',
  'TSA': 'Sachsen-Anhalt',
  'TSH': 'Schleswig-Holstein',
  'TTV': 'Thüringen'
};
```

## UI-Komponente

Das Dropdown-Menü im "Neuen Verein erstellen" Modal zeigt alle 17 Landesverbände gruppiert nach Bundesland an:

```jsx
<optgroup label="🏆 Bayern">
  <option value="BTV">BTV - Bayerischer Tennis-Verband</option>
</optgroup>
<optgroup label="🏆 Nordrhein-Westfalen">
  <option value="TVM">TVM - Tennisverband Mittelrhein</option>
  <option value="TVN">TVN - Tennis-Verband Niederrhein</option>
  <option value="WTV">WTV - Westfälischer Tennis-Verband</option>
</optgroup>
```

## Migration

Die SQL-Migration `ADD_BUNDESLAND_TO_CLUB_INFO.sql` fügt die `bundesland` Spalte hinzu und aktualisiert bestehende Datensätze basierend auf dem `federation` Feld.

```bash
# Migration ausführen
psql -d tennis_team -f migrations/ADD_BUNDESLAND_TO_CLUB_INFO.sql
```

## Verwendungszwecke

### Filterung
- Vereine nach Bundesland filtern
- Spieler nach Region suchen
- Turniere regional organisieren

### Statistiken
- Anzahl Vereine pro Bundesland
- Spielerverteilung nach Region
- Regionale Aktivitäten tracken

### Matchmaking
- Lokale Gegner finden
- Reiseaufwand minimieren
- Regionalliga-Organisation

## Quellen

- Deutscher Tennis Bund (DTB)
- Stand: 1. Februar 2022
- [DTB Website](https://www.dtb-tennis.de)

