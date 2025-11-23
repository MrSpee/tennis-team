# Problem 1: `match_number` ist nicht eindeutig über Gruppen hinweg

## 🔴 Das Problem

### Was ist `match_number`?
- Jede Gruppe hat ihre eigenen Matches, die mit #1, #2, #3, etc. nummeriert sind
- **Jede Gruppe startet bei #1!**
- Beispiel:
  - Gruppe "Gr. 001" hat Match #1, #2, #3, ...
  - Gruppe "Gr. 002" hat auch Match #1, #2, #3, ...
  - Gruppe "Gr. 045" hat auch Match #1, #2, #3, ...

### Die alte Logik (PROBLEMATISCH):

```javascript
// 1. Suche in aktueller Gruppe
const { data: dataInGroup } = await supabase
  .from('matchdays')
  .select('*')
  .eq('match_number', match.matchNumber)
  .eq('season', group.season)
  .eq('league', group.league)
  .eq('group_name', group.groupName)  // ✅ Nur in aktueller Gruppe
  .maybeSingle();

if (dataInGroup) {
  existingMatch = dataInGroup;  // ✅ Gefunden!
} else {
  // ❌ PROBLEM: Fallback-Suche über ALLE Gruppen!
  const { data: dataAnywhere } = await supabase
    .from('matchdays')
    .select('*')
    .eq('match_number', match.matchNumber)
    // ❌ KEIN Filter nach group_name!
    .maybeSingle();
  
  if (dataAnywhere) {
    existingMatch = dataAnywhere;  // ❌ FALSCHES Match gefunden!
    console.log(`⚠️ Bestehendes Match gefunden über match_number #${match.matchNumber} in anderer Gruppe (${dataAnywhere.group_name}) - wird aktualisiert`);
  }
}
```

### Beispiel aus deinen Logs:

```
[importMatches] 🔍 Prüfe Match #1: {homeTeam: 'TC GW Aachen 1', awayTeam: 'TC Bayer Dormagen 1', ...}
[importMatches] ⚠️ Bestehendes Match gefunden über match_number #1 in anderer Gruppe (Gr. 001) - wird aktualisiert
[importMatches] 🔄 Aktualisiere meeting_id für Match #1: NULL → 12504482
```

**Was passiert hier?**
1. Wir importieren Match #1 für Gruppe "Gr. 045"
2. Match #1 existiert noch nicht in "Gr. 045"
3. Die alte Logik sucht dann über ALLE Gruppen
4. Sie findet Match #1 aus "Gr. 001" (falsche Gruppe!)
5. Sie versucht, dieses Match zu aktualisieren
6. **Problem**: Die Teams stimmen nicht überein!

### Konkretes Beispiel:

**Szenario**: Wir importieren Match #1 für Gruppe "Gr. 045"
- **Erwartet**: "TC Ford Köln 1" vs "Marienburger SC 1" (Gr. 045)
- **Gefunden (falsch)**: "TC GW Aachen 1" vs "TC Bayer Dormagen 1" (Gr. 001)
- **Folge**: Falsche `meeting_id` wird zugeordnet → `MEETING_TEAM_MISMATCH` Fehler!

## ✅ Die neue Logik (KORRIGIERT):

```javascript
// ✅ NUR in aktueller Gruppe suchen
const { data: dataInGroup } = await supabase
  .from('matchdays')
  .select('*')
  .eq('match_number', match.matchNumber)
  .eq('season', group.season)
  .eq('league', group.league)
  .eq('group_name', group.groupName)  // ✅ IMMER Filter nach group_name
  .maybeSingle();

if (dataInGroup) {
  // ✅ ZUSÄTZLICHE VALIDIERUNG: Prüfe ob Teams übereinstimmen
  const teamsMatch = 
    (dataInGroup.home_team_id === homeTeam.id && dataInGroup.away_team_id === awayTeam.id) ||
    (dataInGroup.home_team_id === awayTeam.id && dataInGroup.away_team_id === homeTeam.id);
  
  if (teamsMatch) {
    existingMatch = dataInGroup;  // ✅ Korrektes Match gefunden!
  } else {
    // Teams stimmen nicht - erstelle neues Match
    existingMatch = null;
  }
}

// ❌ ENTFERNT: Fallback-Suche über alle Gruppen
// Wenn kein Match in der aktuellen Gruppe gefunden wird,
// wird ein NEUES Match erstellt (korrekt!)
```

## 📊 Warum ist das wichtig?

### Ohne die Korrektur:
- ❌ Matches aus falschen Gruppen werden aktualisiert
- ❌ Falsche `meeting_id`s werden zugeordnet
- ❌ `MEETING_TEAM_MISMATCH` Fehler beim Import der Ergebnisse
- ❌ Daten werden korrupt

### Mit der Korrektur:
- ✅ Matches werden nur in der korrekten Gruppe gesucht
- ✅ Zusätzliche Team-Validierung verhindert falsche Zuordnungen
- ✅ Wenn kein Match gefunden wird, wird ein neues erstellt (korrekt!)
- ✅ Keine falschen `meeting_id`-Zuordnungen mehr

