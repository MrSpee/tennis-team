# 📋 Anleitung: Team "Herren 40" von TV Ensen Westhoven löschen

## Schritt 1: CASCADE DELETE aktivieren (NUR EINMAL NÖTIG!)
1. Öffne Supabase → SQL Editor
2. Führe aus: `FIX_CASCADE_DELETE.sql` (bereits erstellt)
3. Warte auf Erfolgsmeldung ✅

## Schritt 2: Verknüpfungen prüfen
1. Öffne SQL Editor in Supabase
2. Führe SCHRITT 1 aus `DELETE_TEAM_HERREN_40.sql`
3. Du siehst:
   - Anzahl Team-Memberships (Spieler)
   - Anzahl Matches
   - Anzahl Trainings
   - Anzahl Matchdays
   
**📊 Beispiel-Ausgabe:**
```
tabelle              | anzahl_verbindungen
---------------------|--------------------
team_memberships     | 12
matches              | 5
training_sessions    | 3
matchdays            | 8
```

## Schritt 3: Team löschen (NACH Prüfung!)
1. Stelle sicher, dass die Verknüpfungen OK sind (oder sollen entfernt werden)
2. Führe aus: `DELETE FROM team_info WHERE id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';`
3. Fertig! ✅ Alle Verknüpfungen werden automatisch mitgelöscht (wenn CASCADE aktiviert)

## Alternative: Ohne CASCADE DELETE (komplizierter!)
Falls CASCADE nicht aktiviert ist:
1. Lösche zuerst alle Verknüpfungen:
   - `DELETE FROM team_memberships WHERE team_id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';`
   - `DELETE FROM matches WHERE team_id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';`
   - `DELETE FROM matchdays WHERE home_team_id = '...' OR away_team_id = '...';`
2. Dann das Team:
   - `DELETE FROM team_info WHERE id = '6decfef3-1d82-4bc4-b5de-f24d5a70fa0c';`

## ⚠️ Vorsicht!
- **Mitgliedschaften** (team_memberships) werden mitgelöscht → Spieler verlieren Team-Zuordnung
- **Matches** werden mitgelöscht → Spielhistorie verschwindet
- **Matchdays** werden mitgelöscht → Spielpläne verschwinden

## Empfehlung
**Besser Team-Eintrag korrigieren statt löschen:**
- `team_name` von "Herren 40" auf "1" ändern
- Dann weiterverwenden statt alles zu löschen!



