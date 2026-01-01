# Fix: Duplicate Key Error in team_roster

## Problem

Beim automatischen Import von Team-Rostern tritt folgender Fehler auf:

```
duplicate key value violates unique constraint "team_roster_team_id_season_rank_key"
```

## Ursache

Die `saveTeamRoster` Funktion verwendet aktuell folgende Strategie:
1. DELETE aller Einträge für Team/Saison
2. INSERT neuer Einträge

**Problem:** 
- Wenn der automatische Import mehrmals für dasselbe Team/Saison läuft
- Oder wenn das DELETE fehlschlägt (z.B. RLS-Policy)
- Oder Race Conditions zwischen mehreren Imports
- → Dann versucht INSERT einen Eintrag einzufügen, der bereits existiert

Die UNIQUE Constraint `team_roster_team_id_season_rank_key` verhindert Duplikate auf:
- `(team_id, season, rank)`

## Lösung

**Verwende UPSERT statt DELETE + INSERT:**

1. **Option A: Supabase `.upsert()` mit `onConflict`** (bevorzugt)
   - Aktualisiert existierende Einträge
   - Fügt neue Einträge ein
   - Verhindert Duplikate

2. **Option B: Einzelne UPSERTs pro Eintrag** (falls Option A nicht funktioniert)
   - Für jeden Eintrag prüfen ob er existiert
   - UPDATE wenn vorhanden, INSERT wenn nicht

## Implementierung

Verwende `.upsert()` mit dem UNIQUE Constraint:

```javascript
const { data, error } = await supabase
  .from('team_roster')
  .upsert(rosterEntries, {
    onConflict: 'team_id,season,rank'
  })
  .select();
```

**WICHTIG:** Supabase's `.upsert()` verwendet standardmäßig den PRIMARY KEY. Für UNIQUE constraints muss man prüfen ob das funktioniert.

Falls nicht: Verwende einzelne UPSERTs pro Eintrag.

