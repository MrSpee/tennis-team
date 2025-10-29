# 🔍 Problem-Analyse: TV Ensen Westhoven Spieler

## Problem
Importierte Spieler erscheinen nicht im Dropdown-Menü beim Ergebniseintrag.

## Ursache
Die Dropdown-Logik in `LiveResultsWithDB.jsx` lädt Spieler nur über `team_memberships`:

```javascript
// Zeile 157-160
const { data: opponentTeamMembers, error: opponentTeamError } = await supabase
  .from('team_memberships')
  .select('player_id')
  .eq('team_id', awayTeamId);
```

**Problem:** Wenn beim Import kein Team zugeordnet wurde, haben die Spieler keine `team_membership` → werden nicht angezeigt!

## Lösung

### Option 1: Fix-Script ausführen
Führe `FIX_ENSEN_WESTHOVEN_PLAYERS.sql` aus:
- Findet/erstellt Verein "TV Ensen Westhoven"
- Findet/erstellt Team "TV Ensen Westhoven 1"
- Ordnet alle importierten Spieler (`import_source='tvm_import'`) ohne Team-Membership zu

### Option 2: Import-Code verbessern (für zukünftige Imports)
Der Import sollte automatisch das erkannte Team zuordnen, auch wenn kein Team manuell ausgewählt wurde.

## Prüfung

Führe zuerst `CHECK_ENSEN_WESTHOVEN_PLAYERS.sql` aus, um zu sehen:
1. Ob der Verein existiert
2. Ob das Team existiert
3. Ob Spieler importiert wurden
4. Ob Spieler Team-Memberships haben

