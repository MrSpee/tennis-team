# 🎾 Multi-Team Support - Finale Anleitung

## ✅ Was wurde implementiert:

### 1. **Datenbank-Struktur** (Supabase)
- ✅ `team_info` hat UUID Primary Key
- ✅ `matches` haben `team_id` Spalte
- ✅ `player_teams` Tabelle (Spieler ↔ Teams)

### 2. **Lokale Test-Daten** (nur für Theo Tester)
- ✅ TC Köln Team-Daten
- ✅ 3 Demo-Matches für TC Köln
- ✅ 5 fiktive Spieler
- ✅ Ein/Aus schaltbar via `enabled` Flag

### 3. **Frontend-Integration**
- ✅ **DataContext**: Merged Supabase + lokale Daten
- ✅ **Dashboard**: Team-Badge in Match-Cards
- ✅ **Results**: Team-Selector zum Filtern
- ✅ **Matches**: Team-Badge in Match-Cards

---

## 🚀 SETUP-SCHRITTE

### Schritt 1: Alte Test-Daten löschen (Optional)
**Ausführen in Supabase SQL-Editor:**
```sql
-- Datei: CLEANUP_TEST_DATA.sql
-- Löscht alle TC Köln Test-Daten aus der DB
```

### Schritt 2: App testen
1. **Als Theo Tester einloggen**
2. **Erwartung:**
   - "Deine Mannschaften" zeigt 2 Teams
   - Matches zeigen Team-Badges
   - Results hat Team-Selector

---

## 🎨 UI-Verhalten

### **Dashboard & Matches:**
- **ALLE Matches** aller Teams werden angezeigt
- **Team-Badge** erscheint in jeder Card (nur wenn > 1 Team)
  - Format: "🏢 TC Köln - Herren 1"
  - Blau/Lila Gradient
- **Kein Selector** - volle Übersicht

### **Results:**
- **Team-Selector** oben (nach Überschrift)
- **Filter** Matches nach ausgewähltem Team
- **Count-Badge** zeigt gefilterte Anzahl

---

## 🧪 Test-Daten Details

### TC Köln Team:
```json
{
  "club_name": "TC Köln",
  "team_name": "Herren 1",
  "category": "Herren",
  "league": "Verbandsliga",
  "group_name": "Gr. 1"
}
```

### TC Köln Matches:
1. **20.12.2025** - TC Bayer Leverkusen (Auswärts)
   - 3 Zusagen (Theo, Max, Stefan)
   - 3 weitere Spieler benötigt

2. **10.01.2026** - TG Grün-Weiß Bonn (Heim)
   - Keine Zusagen
   - 6 Spieler benötigt

3. **01.10.2024** - TC Rheinland (Heim, beendet)
   - Endergebnis: 4:2 Sieg
   - Bereits gespielt

---

## 🔧 Test-Daten aktivieren/deaktivieren

### Ausschalten:
```json
// testdata-tc-koeln/tc-koeln-team.json
{
  "enabled": false,  // ← auf false setzen
  ...
}
```

### Einschalten:
```json
{
  "enabled": true,  // ← auf true setzen
  ...
}
```

---

## ✅ Checkliste für Theo Tester

- [ ] Beim Login werden 2 Teams geladen
- [ ] "Deine Mannschaften" Card zeigt beide Teams
- [ ] Dashboard zeigt SV Sürth UND TC Köln Matches gemischt
- [ ] Team-Badges erscheinen in Match-Cards
- [ ] Results hat Team-Selector
- [ ] Selector filtert korrekt
- [ ] TC Köln Match am 20.12.2025 ist sichtbar
- [ ] Verfügbarkeit kann gesetzt werden

---

## 🐛 Troubleshooting

### Problem: "Keine Teams werden geladen"
**Console-Logs prüfen:**
```
🔍 Loading teams for player: [uuid]
✅ Player teams loaded from DB: [...]
🧪 Adding TC Köln test team
```

**Lösung:**
- Hard-Refresh (Cmd+Shift+R)
- Logout → Login
- Prüfe ob `tc-koeln-team.json` existiert

### Problem: "Team-Badge erscheint nicht"
**Check:**
- `playerTeams.length > 1` muss true sein
- `match.teamInfo` muss vorhanden sein

**Lösung:**
- Console-Log: `console.log('playerTeams:', playerTeams)`
- Console-Log: `console.log('match.teamInfo:', match.teamInfo)`

### Problem: "Matches werden doppelt geladen"
**Ursache:**
- React Strict Mode lädt Components 2x
- Normal in Development

**Lösung:**
- Ignorieren oder Strict Mode deaktivieren

---

## 📊 Daten-Fluss

```
1. User Login
   ↓
2. AuthContext lädt Player-Daten
   ↓
3. Event "reloadTeams" gefeuert
   ↓
4. DataContext lädt Player-Teams aus DB
   ↓
5. Lokale TC Köln Test-Daten werden hinzugefügt
   ↓
6. Primary Team wird ausgewählt
   ↓
7. Matches werden geladen (DB + Test-Daten)
   ↓
8. UI zeigt alle Matches mit Team-Badges
```

---

## 🎯 Nächste Schritte (nach erfolgreichem Test)

1. **Test-Daten deaktivieren** (`enabled: false`)
2. **Echte TC Köln Daten** in Supabase eintragen
3. **player_teams** für echte Spieler pflegen
4. **Test-Ordner löschen** oder behalten für später

---

**Status:** Bereit zum Testen! 🚀
**Wichtig:** Echte Supabase-Daten bleiben unverändert!

