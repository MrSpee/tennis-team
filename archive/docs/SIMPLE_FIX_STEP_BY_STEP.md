# Einfache Schritt-für-Schritt Anleitung

## Problem
Deine Matchdays werden nicht angezeigt, weil die falsche Team-ID verwendet wird.

## Lösung - FÜR NICHT-CODER

Führe diese Schritte NACHEINANDER im Supabase SQL Editor aus:

### Schritt 1: Prüfe welche Teams existieren
Kopiere dieses in den SQL Editor:
```sql
SELECT id, club_name, team_name, category 
FROM team_info 
WHERE club_name ILIKE '%Sürth%';
```

Klicke auf "Run" → Du siehst jetzt alle Teams mit "Sürth" im Namen.

### Schritt 2: Update Matchdays - HOME TEAM
Kopiere dieses (ersetze XXXX mit der ID aus Schritt 1):
```sql
UPDATE matchdays
SET home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE home_team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name != 'Herren 40'
);
```

Klicke auf "Run"

### Schritt 3: Update Matchdays - AWAY TEAM  
Kopiere dieses:
```sql
UPDATE matchdays
SET away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE away_team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name != 'Herren 40'
);
```

Klicke auf "Run"

### Schritt 4: Prüfe ob es funktioniert hat
Kopiere dieses:
```sql
SELECT 
  m.id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  ht.club_name AS home_club,
  ht.team_name AS home_team,
  at.club_name AS away_club,
  at.team_name AS away_team
FROM matchdays m
LEFT JOIN team_info ht ON m.home_team_id = ht.id
LEFT JOIN team_info at ON m.away_team_id = at.id
WHERE ht.club_name = 'SV Rot-Gelb Sürth' OR at.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date DESC;
```

Klicke auf "Run" → Du solltest jetzt alle Matchdays mit der richtigen Team-ID sehen.

### Schritt 5 (Optional): Entferne Duplikate
**Nur wenn Schritt 4 zeigt, dass alles funktioniert:**

```sql
DELETE FROM team_info 
WHERE club_name = 'SV Rot-Gelb Sürth' 
  AND team_name != 'Herren 40';
```

## Test
Lade die Seite neu (F5) → Du solltest jetzt Matchdays sehen!


