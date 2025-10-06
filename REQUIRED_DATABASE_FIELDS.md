# 📊 Benötigte Datenbank-Felder für Multi-Team Support

## ✅ Erforderliche Tabellen und Spalten

### 1. **team_info** (Team-Informationen)
```sql
CREATE TABLE team_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- ✅ WICHTIG!
  team_name VARCHAR,
  club_name VARCHAR,
  category VARCHAR,
  league VARCHAR,
  group_name VARCHAR,
  region VARCHAR,
  tvm_link TEXT,
  season VARCHAR,
  season_year VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Genutzt in:**
- Dashboard → "Deine Mannschaften" Card
- Results → Team-Selector
- Alle Match-Cards → Team-Badge

---

### 2. **matches** (Spiele)
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  match_date TIMESTAMP,
  opponent VARCHAR,
  location VARCHAR,
  venue TEXT,
  season VARCHAR,
  players_needed INTEGER,
  team_id UUID REFERENCES team_info(id), -- ✅ NEU & WICHTIG!
  created_at TIMESTAMP
);
```

**Genutzt in:**
- Dashboard → Kommende/Beendete Spiele
- Results → Mannschafts-Ansicht
- Matches → Verfügbarkeit
- MatchdayResults → Detail-Ansicht

---

### 3. **player_teams** (Spieler ↔ Teams Verknüpfung)
```sql
CREATE TABLE player_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id), -- ✅ WICHTIG!
  team_id UUID REFERENCES team_info(id), -- ✅ WICHTIG!
  is_primary BOOLEAN DEFAULT false,
  role VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, team_id)
);
```

**Genutzt in:**
- DataContext → loadPlayerTeams()
- Dashboard → "Deine Mannschaften" Card
- Results → Team-Selector Options

---

### 4. **players** (Spieler-Daten)
```sql
-- Bestehende Tabelle, keine Änderung nötig
-- Wird verknüpft über player_teams
```

---

## 🔗 JOIN-Queries die verwendet werden

### DataContext.loadMatches():
```sql
SELECT 
  matches.*,
  team_info (
    id,
    club_name,
    team_name,
    category
  ),
  match_availability (...)
FROM matches
LEFT JOIN team_info ON team_info.id = matches.team_id
ORDER BY match_date ASC;
```

### DataContext.loadPlayerTeams():
```sql
SELECT 
  player_teams.*,
  team_info (
    id,
    club_name,
    team_name,
    category,
    league,
    group_name,
    tvm_link,
    season,
    season_year
  )
FROM player_teams
JOIN team_info ON team_info.id = player_teams.team_id
WHERE player_id = ?
ORDER BY is_primary DESC;
```

---

## ⚠️ WICHTIG: Erforderliche Daten-Konsistenz

### Alle Matches MÜSSEN team_id haben!
```sql
-- Prüfen:
SELECT COUNT(*) FROM matches WHERE team_id IS NULL;

-- Sollte 0 sein!
```

**Wenn > 0:**
→ `FIX_TEAM_IDS.sql` ausführen

---

### Alle Teams MÜSSEN id (UUID) haben!
```sql
-- Prüfen:
SELECT id, club_name, team_name FROM team_info;

-- Alle Zeilen sollten id haben!
```

**Wenn NULL:**
→ `MULTI_TEAM_SETUP.sql` nochmal ausführen

---

### Theo Tester MUSS in player_teams sein!
```sql
-- Prüfen:
SELECT 
  p.name,
  ti.club_name,
  pt.is_primary
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester';

-- Sollte mindestens 1 Zeile zurückgeben!
```

**Wenn leer:**
→ `MULTI_TEAM_SETUP.sql` nochmal ausführen

---

## 🧪 Test-Queries

### Zeige alle Daten für Theo Tester:
```sql
-- Theo's Player-ID
SELECT id, name FROM players WHERE name = 'Theo Tester';

-- Theo's Teams
SELECT 
  ti.club_name,
  ti.team_name,
  pt.is_primary
FROM player_teams pt
JOIN team_info ti ON ti.id = pt.team_id
WHERE pt.player_id = (SELECT id FROM players WHERE name = 'Theo Tester' LIMIT 1);

-- Matches für Theo's Haupt-Team
SELECT 
  m.opponent,
  m.match_date,
  m.season,
  ti.club_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
WHERE m.team_id = (
  SELECT pt.team_id 
  FROM player_teams pt 
  WHERE pt.player_id = (SELECT id FROM players WHERE name = 'Theo Tester' LIMIT 1)
  AND pt.is_primary = true
  LIMIT 1
)
ORDER BY m.match_date DESC;
```

---

## 📋 Schnell-Check Checkliste

Führe diese Queries aus und prüfe die Ergebnisse:

```sql
-- ✅ 1. team_info hat id?
SELECT COUNT(*) as teams_with_id FROM team_info WHERE id IS NOT NULL;

-- ✅ 2. matches hat team_id Spalte?
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'matches' AND column_name = 'team_id';

-- ✅ 3. Alle matches haben team_id?
SELECT COUNT(*) as matches_without_team FROM matches WHERE team_id IS NULL;

-- ✅ 4. player_teams Tabelle existiert?
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'player_teams';

-- ✅ 5. Theo hat Teams?
SELECT COUNT(*) as theo_teams FROM player_teams pt
JOIN players p ON p.id = pt.player_id
WHERE p.name = 'Theo Tester';
```

---

**Erwartete Ergebnisse:**
1. `teams_with_id` > 0
2. `matches.team_id` = 1 (Spalte existiert)
3. `matches_without_team` = 0 (alle haben team_id)
4. `player_teams` = 1 (Tabelle existiert)
5. `theo_teams` >= 1 (Theo hat mind. 1 Team)

---

**Status:** Bereit zum Debuggen! 🔍

