# Fix: Spieler-Erstellung mit automatischer Dropdown-Auswahl

## Problem
- Spieler wurde in DB erstellt
- Spieler fehlte im Dropdown
- Spieler wurde nicht automatisch ausgewählt

## Lösung

### 1. Sofortige Spieler-Erstellung in DB
- Spieler wird SOFORT beim Klick auf "Übernehmen" in `players_unified` erstellt
- Team-Membership wird erstellt in `team_memberships`
- Kein `player_type` Feld (entfernt)

### 2. Team-Zuordnung basierend auf playerType
- Gast-Spieler → `away_team_id` + `match.away_team`
- Heim-Spieler → `home_team_id` + `match.home_team`

### 3. Dropdown wird nach Erstellung neu geladen
- `reloadOpponentPlayers()` lädt alle Spieler des Gegner-Teams neu
- 100ms Delay gibt React Zeit, die Liste zu aktualisieren
- Dann wird Spieler automatisch ausgewählt

### 4. Fluss
```
1. User wählt "➕ Spieler hinzufügen..."
2. Modal öffnet sich
3. User gibt Namen ein
4. User klickt "Übernehmen"
5. → Spieler wird in players_unified erstellt
6. → Team-Membership wird erstellt (team_memberships)
7. → Dropdown wird neu geladen
8. → Spieler wird automatisch ausgewählt
9. → Modal schließt sich
```

## Logging
- ✅ Alle Schritte werden geloggt
- ✅ Fehler werden klar angezeigt
- ✅ Success-Messages zeigen was passiert

## Wichtig
- **Kein `player_type: 'opponent'`** - dieses Feld existiert nicht mehr
- Spieler ist `is_active: false` (kein user_id)
- Spieler wird über `team_memberships` dem Verein/Team zugeordnet


