# Matchday Import - Feldanalyse

## Sample Datensatz aus TVM:
```
Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	Status
02.11.2025, 15:00	TV Dellbrück	TV Dellbrück 1	VKC Köln 1	0:0	0:0	0:0	offen
```

## Team-Info aus Header:
- **Verein**: VKC Köln
- **Liga**: Herren 40 1. Bezirksliga Gr. 043
- **Team**: Herren 40 1 (4er)

## Feld-Mapping zu matchdays:

| TVM Feld | matchdays Spalte | Mapping | Status |
|----------|-----------------|---------|--------|
| `Datum` (02.11.2025, 15:00) | `match_date` | Timestamp parsen | ✅ |
| | `start_time` | "15:00" extrahieren | ✅ |
| `Spielort` (TV Dellbrück) | `venue` | Direkt übernehmen | ✅ |
| | `address` | NULL (nicht im TVM) | ✅ |
| `Heim Verein` (TV Dellbrück 1) | `home_team_id` | Team-Lookup aus team_info | ⚠️ |
| `Gastverein` (VKC Köln 1) | `away_team_id` | Team-Lookup aus team_info | ⚠️ |
| `Matchpunkte` (0:0) | `home_score`, `away_score` | Parsen z.B. "2:1" → 2, 1 | ✅ |
| | `final_score` | NULL wenn noch offen | ✅ |
| Liga (1. Bezirksliga) | `league` | Direkt übernehmen | ✅ |
| Gruppe (Gr. 043) | `group_name` | Direkt übernehmen | ✅ |
| Saison (Winter/Summer) | `season` | Aus Datum ableiten | ✅ |
| | `location` | 'Home' / 'Away' basierend auf Spielort | ✅ |
| Status (offen) | `status` | 'scheduled' / 'completed' | ✅ |
| | `notes` | NULL | ✅ |

## ⚠️ KRITISCHES PROBLEM:

**Team-Lookup wird schwierig!**

Der Import kennt:
- `team_id` (unser Team - z.B. VKC Köln 1)
- `opponent` (Gegner - z.B. "TV Dellbrück 1")

Aber wir brauchen für matchdays:
- `home_team_id` 
- `away_team_id`

**Lösung**: 
1. Bestimme unser Team (aus ausgewähltem team_id im Import)
2. Finde Gegner-Team über Team-Name (opponent)
3. Setze home/away basierend auf "location" oder Spielort
4. Wenn Gegner-Team NICHT gefunden wird → warnen oder überspringen

## Empfehlung:

Der Import sollte so funktionieren:
```javascript
const createMatchday = {
  home_team_id: ourTeam.id,  // Unser Team
  away_team_id: await findTeamByName(opponent), // Gegner suchen
  match_date: parsedDate,
  start_time: "15:00",
  venue: "TV Dellbrück",
  location: isHome ? 'Home' : 'Away',
  season: getSeason(date),
  league: "1. Bezirksliga",
  group_name: "Gr. 043",
  status: 'scheduled',
  home_score: 0,
  away_score: 0
};
```


