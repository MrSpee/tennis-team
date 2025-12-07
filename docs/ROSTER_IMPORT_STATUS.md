# 🎾 Roster-Import Status

## ✅ Abgeschlossen

1. **SQL-Migration**: `club_number` Spalte zu `team_info` hinzugefügt
2. **API-Route**: `api/import/parse-club-rosters.js` erstellt
   - Extrahiert Club-Nummer aus URL ✅
   - Findet alle Teams für eine Saison ✅
   - Team-Portrait-URLs werden noch nicht gefunden ⚠️

## ⚠️ Aktuelles Problem

Die Team-Portrait-URLs werden nicht gefunden, weil:
- Die Team-Detail-Seite (clubPools mit contestType) zeigt die Meldeliste direkt an
- Es gibt keinen direkten Link zur Team-Portrait-Seite
- Die Team-ID ist nicht direkt in der HTML sichtbar

## 💡 Lösung

**Option 1: Meldeliste direkt von clubPools-Seite parsen** (Empfohlen)
- Die Meldeliste wird bereits auf der Team-Detail-Seite angezeigt
- Wir können die bestehende `parseTeamPortrait` Logik anpassen
- Effizienter, da wir keine zusätzliche Team-Portrait-URL benötigen

**Option 2: Team-ID aus anderen Quellen extrahieren**
- Aus `team_seasons.source_url` (falls bereits vorhanden)
- Aus der Datenbank (wenn Team bereits bekannt ist)

## 🔄 Nächste Schritte

1. **Anpassen der `parse-club-rosters` API-Route**:
   - Meldeliste direkt von der Team-Detail-Seite parsen
   - Verwende die gleiche Parsing-Logik wie `parse-team-roster.js`
   - Speichere direkt in `team_roster` Tabelle

2. **Testen**:
   - Vollständiger Test mit einem Team
   - Prüfen, ob alle Spieler korrekt extrahiert werden
   - Prüfen, ob Matching mit `players_unified` funktioniert

3. **Integration**:
   - SuperAdmin Dashboard erweitern
   - Automatisches Importieren aller Teams eines Vereins

