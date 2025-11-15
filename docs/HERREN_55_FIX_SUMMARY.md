# Fix-Zusammenfassung: Herren 55 Standings-Probleme

## Durchgeführte Änderungen

### 1. SQL-Fixes (müssen ausgeführt werden)

#### 1.1 `sql/NORMALIZE_TEAM_NAMES.sql`
**Problem:** Teams hatten unterschiedliche Leerzeichen in `team_name` (z.B. " 1" vs "1")
**Lösung:** Entferne führende/nachfolgende Leerzeichen und normalisiere mehrfache Leerzeichen

#### 1.2 `sql/FIX_VKC_HERREN_55_TEAM_SEASONS.sql`
**Problem:** VKC Köln Herren 55 hatte 4 aktive `team_seasons` Einträge für die gleiche Saison
**Lösung:** Deaktiviere 3 falsche Einträge, behalte nur den korrekten (1. Kreisliga 4-er, Gr. 063)

### 2. Code-Fixes (bereits implementiert)

#### 2.1 `src/utils/standings.js` - `buildTeamLabel()`
**Problem:** Mehrfache Leerzeichen wurden nicht normalisiert
**Lösung:** Normalisiere Leerzeichen mit `.replace(/\s+/g, ' ').trim()`

```javascript
export const buildTeamLabel = (team = {}) => {
  const parts = [team.club_name, team.team_name].filter(Boolean);
  const label = parts.length > 0 ? parts.join(' ') : team.team_name || team.club_name || 'Unbekanntes Team';
  // Normalisiere mehrfache Leerzeichen zu einzelnen Leerzeichen
  return label.replace(/\s+/g, ' ').trim();
};
```

#### 2.2 `src/components/TeamView.jsx` - Deduplizierungs-Logik
**Problem:** Die Deduplizierungs-Logik behandelte Teams mit ähnlichen Namen als Duplikate, auch wenn sie unterschiedliche IDs (und Kategorien) hatten
**Lösung:** Vereinfachte Logik - dedupliziere nur nach Team-ID, nicht nach Namen. Unterschiedliche IDs = unterschiedliche Teams!

#### 2.3 `src/components/TeamView.jsx` - Matchdays-Filterung
**Problem:** Matchdays wurden nur nach `season` gefiltert, nicht nach `group_name`
**Lösung:** Füge auch Filter nach `league` und `group_name` hinzu

```javascript
const { data: allMatchesRaw, error: matchesError} = await supabase
  .from('matchdays')
  .select('id, home_team_id, away_team_id, match_date, status, season, league, group_name')
  .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
  .eq('season', teamSeason.season)
  .eq('league', teamSeason.league)
  .eq('group_name', teamSeason.group_name) // NEU!
  .order('match_date');
```

## Ausführungsreihenfolge

1. **SQL-Scripts ausführen (in dieser Reihenfolge):**
   - `sql/NORMALIZE_TEAM_NAMES.sql`
   - `sql/FIX_VKC_HERREN_55_TEAM_SEASONS.sql`

2. **Frontend neu laden:**
   - Code-Änderungen sind bereits implementiert
   - Nach dem Reload sollte die Standings-Tabelle korrekt angezeigt werden

## Erwartete Ergebnisse

Nach den Fixes sollte:
- ✅ VKC Köln nur einmal in der Tabelle erscheinen (nicht zweimal)
- ✅ Alle Spiele der Gr. 063 für Herren 55 (Winter 2025/26) angezeigt werden
- ✅ Die Standings-Berechnung alle Spiele berücksichtigen

## Wichtige Erkenntnisse

- **VKC Köln " 1" (Herren 40)** und **VKC Köln "1" (Herren 55)** sind UNTERSCHIEDLICHE Teams!
- Beide spielen in der gleichen Liga/Gruppe (1. Kreisliga 4-er, Gr. 063), aber unterschiedliche Altersklassen
- Nach der Normalisierung werden beide "VKC Köln 1" heißen, aber durch unterschiedliche IDs und Kategorien getrennt bleiben
- Die Deduplizierungs-Logik wurde vereinfacht und ist jetzt robuster

## Offene Fragen

1. Ist es korrekt, dass Herren 40 und Herren 55 Teams in der gleichen Liga/Gruppe spielen?
   - Falls nein: Welches Team gehört wirklich zu Gr. 063?

