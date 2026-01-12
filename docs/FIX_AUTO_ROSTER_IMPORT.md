# Fix: Automatischer Roster-Import beim Matchday-Import

## Problem

Beim nuLiga Matchday-Import werden Teams erstellt/gefunden, aber die Meldelisten (Roster) werden **nicht automatisch importiert**. Dies führt dazu, dass:

1. ✅ Matchdays werden importiert
2. ✅ Teams werden erstellt/gefunden
3. ❌ Meldelisten fehlen → Spieler können nicht aus Meldeliste ausgewählt werden

## Beispiel: TC BW Zündorf Herren 30

- Team existiert: `3db15a8c-2a95-4dc9-b195-8d6100c2385b`
- Club-Nummer vorhanden: `35409`
- **Meldeliste fehlt** in `team_roster`

## Lösung

Beim Matchday-Import sollte automatisch geprüft werden:

1. **Wenn Team erstellt wird** → Prüfe ob `club_number` vorhanden ist
2. **Wenn `club_number` vorhanden** → Importiere automatisch Meldeliste über `parse-club-rosters` API
3. **Wenn `club_number` fehlt** → Zeige Warnung, aber importiere Matchdays trotzdem

## Implementierung

### Option 1: Nach Matchday-Import (Empfohlen)

In `src/components/ImportTab.jsx` → `handleImportMatches()`:

```javascript
// Nach erfolgreichem Matchday-Import:
// 1. Sammle alle betroffenen Teams
// 2. Prüfe club_number
// 3. Importiere Meldelisten für Teams mit club_number

const importedTeamIds = [...new Set(matchdaysToCreate.map(m => [m.home_team_id, m.away_team_id]).flat())];

// Lade Teams mit club_number
const { data: teamsWithClubNumber } = await supabase
  .from('team_info')
  .select('id, club_name, category, club_number')
  .in('id', importedTeamIds)
  .not('club_number', 'is', null);

if (teamsWithClubNumber && teamsWithClubNumber.length > 0) {
  // Gruppiere nach Club
  const clubsByNumber = {};
  teamsWithClubNumber.forEach(team => {
    if (!clubsByNumber[team.club_number]) {
      clubsByNumber[team.club_number] = [];
    }
    clubsByNumber[team.club_number].push(team);
  });
  
  // Importiere Meldelisten für jeden Club
  for (const [clubNumber, teams] of Object.entries(clubsByNumber)) {
    try {
      const clubPoolsUrl = `https://tvm.liga.nu/cgi-bin/WebObjects/nuLigaTENDE.woa/wa/clubPools?club=${clubNumber}`;
      const targetSeason = finalSeason || 'Winter 2025/26';
      
      await fetch('/api/import/parse-club-rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubPoolsUrl,
          targetSeason,
          apply: true
        })
      });
      
      console.log(`✅ Meldelisten für Club ${clubNumber} importiert`);
    } catch (error) {
      console.warn(`⚠️ Fehler beim Import der Meldelisten für Club ${clubNumber}:`, error);
      // Nicht blockierend - Matchdays sind bereits importiert
    }
  }
}
```

### Option 2: Beim Team-Erstellen

In `src/components/ImportTab.jsx` → `findOrCreateTeamGeneric()`:

```javascript
// Nach Team-Erstellung:
if (newTeam && clubNumber) {
  // Importiere Meldeliste für dieses Team
  // (asynchron, nicht blockierend)
  importTeamRoster(newTeam.id, clubNumber, season).catch(err => {
    console.warn('⚠️ Fehler beim automatischen Roster-Import:', err);
  });
}
```

## Empfehlung

**Option 1** ist besser, weil:
- ✅ Effizienter (ein API-Call pro Club statt pro Team)
- ✅ Läuft nach Matchday-Import (nicht blockierend)
- ✅ Kann mehrere Teams pro Club gleichzeitig behandeln

## Status

- [ ] Implementierung in `ImportTab.jsx`
- [ ] Test mit TC BW Zündorf Herren 30
- [ ] Dokumentation aktualisieren
