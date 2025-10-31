# Clean Database Schema - Tennis Team App

## Kern-Philosophie
- **EINE zentrale Spieler-Tabelle**: Alle Spieler (eigene Vereins-Spieler, Gegner, inaktiv, aktiv)
- **Alle Spieler gehören zur players_unified** - egal ob aus meinem oder gegnerischem Verein

## Database Tables

### 1. players_unified (SPIELER - alle!)
```
id: UUID (PK)
name: VARCHAR
current_lk: VARCHAR
user_id: UUID (NULL wenn inaktiv)
is_active: BOOLEAN
tvm_id_number: VARCHAR (für KI-Import)
player_type: VARCHAR ('app_user' | 'opponent')
created_at, updated_at
```

### 2. team_info (MANNSCHAFTEN)
```
id: UUID (PK)
team_name: VARCHAR
club_name: VARCHAR
category: VARCHAR (Herren 40, etc.)
league: VARCHAR
group_name: VARCHAR
...
```

### 3. team_memberships (SPIELER ↔ TEAMS)
```
id: UUID (PK)
player_id: UUID → players_unified(id)
team_id: UUID → team_info(id)
role: VARCHAR ('captain' | 'player')
is_primary: BOOLEAN
...
```

### 4. matchdays (SPIELTAGE)
```
id: UUID (PK)
home_team_id: UUID → team_info(id)
away_team_id: UUID → team_info(id)  
match_date: TIMESTAMPTZ
venue: VARCHAR
location: VARCHAR ('Home' | 'Away')
season: VARCHAR
status: VARCHAR ('scheduled' | 'finished')
home_score: INTEGER
away_score: INTEGER
final_score: VARCHAR
notes: TEXT
created_at, updated_at
```

### 5. match_results (EINZELNE ERGEBNISSE pro Matchday)
```
id: UUID (PK)
matchday_id: UUID → matchdays(id)
match_type: VARCHAR ('singles' | 'doubles')
position: INTEGER (1, 2, 3, ...)

-- Home Team Spieler
player_home_1_id: UUID → players_unified(id)
player_home_2_id: UUID → players_unified(id) [optional für Doubles]

-- Away Team Spieler  
player_away_1_id: UUID → players_unified(id)
player_away_2_id: UUID → players_unified(id) [optional für Doubles]

score_home: VARCHAR
score_away: VARCHAR
winner: VARCHAR ('home' | 'away')
notes: TEXT
created_at, updated_at
```

### 6. match_availability (VERFÜGBARKEITEN)
```
id: UUID (PK)
matchday_id: UUID → matchdays(id)  [WICHTIG: nicht match_id!]
player_id: UUID → players_unified(id)
status: VARCHAR ('available' | 'unavailable' | 'pending')
comment: TEXT
created_at, updated_at
```

## Wichtige Punkte

✅ **KEINE opponent_players Tabelle mehr** - alle Spieler in players_unified
✅ **match_results.player_away_X_id** → verweist auf players_unified (können auch eigene Vereinsspieler sein!)
✅ **match_availability.matchday_id** (nicht match_id!)
✅ **Matchdays hat home_team_id + away_team_id** (beide aus team_info)

## Datenfluss Beispiel

1. Spieler meldet sich an → players_unified mit user_id
2. Spieler ist in mehreren Teams → team_memberships Einträge
3. Matchday wird erstellt → matchdays mit home_team_id + away_team_id
4. Spieler gibt Verfügbarkeit → match_availability mit matchday_id
5. Einzelergebnisse werden eingetragen → match_results mit player_away_1_id usw.


