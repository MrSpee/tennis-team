# Analyse: VKC Spielerliste - Probleme und Lösungen

## Probleme

### Problem 1: Alle Spieler werden angezeigt (nicht nur Herren 30)

**Ursache:**
- Zeile 719-723: Es werden **ALLE Teams des Gegner-Vereins** gefunden (`opponentClubTeams`)
- Zeile 728-733: Es werden **ALLE Spieler aus ALLEN Teams** des Gegner-Vereins geladen
- VKC hat 8 Teams:
  - Damen 30 (15 Spieler)
  - Herren 30 (34 Spieler) ← **Nur diese sollten angezeigt werden**
  - Herren 40 (65 Spieler)
  - Herren 50 Team 1 (35 Spieler)
  - Herren 50 Team 2 (25 Spieler)
  - Herren 55 Team 1 (15 Spieler)
  - Herren 55 Team 2 (1 Spieler)
  - Herren 60 (21 Spieler)

**Aktuelles Verhalten:**
- Es werden Spieler aus **allen 8 Teams** geladen (insgesamt ~210 Spieler)
- Statt nur aus "Herren 30" (34 Spieler)

### Problem 2: Doppelte Einträge

**Ursache:**
- Zeile 789-799: Meldelisten-Spieler werden mit `team_memberships` Spielern kombiniert
- Zeile 792: Duplikate werden nur auf `player.id` Ebene entfernt
- **ABER:** Wenn ein Spieler in mehreren Teams ist (z.B. in Herren 30 und Herren 40), wird er trotzdem mehrfach hinzugefügt
- Zeile 735: `opponentTeamMemberIds` entfernt Duplikate, aber beim Kombinieren werden sie wieder eingefügt

**Beispiel:**
- Spieler "Max Mustermann" ist in:
  - Herren 30 (aus Meldeliste: `rosterPlayers`)
  - Herren 40 (aus `team_memberships`: `playersFromUnified`)
- Er wird **zweimal** in der Liste angezeigt

## Lösung

### Fix 1: Filtere nach Kategorie

**Änderung in Zeile 719-723:**
```javascript
// VORHER:
const { data: opponentClubTeams, error: opponentClubTeamsError } = await supabase
  .from('team_info')
  .select('id')
  .ilike('club_name', `%${awayClubName}%`);

// NACHHER:
const awayTeamCategory = matchData.away_team?.category; // z.B. "Herren 30"
const { data: opponentClubTeams, error: opponentClubTeamsError } = await supabase
  .from('team_info')
  .select('id, category')
  .ilike('club_name', `%${awayClubName}%`)
  .eq('category', awayTeamCategory); // Nur Teams mit gleicher Kategorie
```

### Fix 2: Bessere Duplikat-Entfernung

**Änderung in Zeile 789-799:**
```javascript
// VORHER:
const combinedPlayers = [...rosterPlayers];
const rosterPlayerIds = new Set(rosterPlayers.map(p => p.id));

playersFromUnified.forEach(player => {
  if (!rosterPlayerIds.has(player.id)) {
    combinedPlayers.push(player);
  }
});

// NACHHER:
const combinedPlayers = [...rosterPlayers];
const rosterPlayerIds = new Set(rosterPlayers.map(p => p.id));
const addedPlayerIds = new Set(rosterPlayers.map(p => p.id)); // Track bereits hinzugefügte IDs

playersFromUnified.forEach(player => {
  // Nur hinzufügen, wenn nicht bereits in Meldeliste UND nicht bereits hinzugefügt
  if (!addedPlayerIds.has(player.id)) {
    combinedPlayers.push(player);
    addedPlayerIds.add(player.id); // Markiere als hinzugefügt
  }
});
```

## Zusammenfassung

**Aktuelles Verhalten:**
- ❌ Zeigt Spieler aus **allen VKC Teams** (8 Teams, ~210 Spieler)
- ❌ Doppelte Einträge durch Spieler in mehreren Teams

**Gewünschtes Verhalten:**
- ✅ Zeigt nur Spieler aus **Herren 30** (19 aus Meldeliste + zusätzliche aus team_memberships)
- ✅ Keine Duplikate

**Ursache:**
- Fehlende Filterung nach `category` beim Laden der Teams
- Unvollständige Duplikat-Entfernung beim Kombinieren der Listen
