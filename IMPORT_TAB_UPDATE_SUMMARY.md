# ImportTab.jsx Update Zusammenfassung

## ✅ Durchgeführte Änderungen für players_unified Migration

### 1. **team_memberships statt player_teams** (3 Stellen)

**Zeile 39:** `loadUserTeams()`
- ✅ `from('player_teams')` → `from('team_memberships')`
- ✅ Hinzugefügt: `.eq('is_active', true)`

**Zeile 673:** `linkPlayerToTeam()`
- ✅ `from('player_teams')` → `from('team_memberships')`
- ✅ `.insert()` mit zusätzlichen Feldern: `season: 'winter_25_26', is_active: true`

**Zeile 686:** `linkPlayerToTeam()`
- ✅ Gleiche Änderungen wie oben

### 2. **players_unified statt players/imported_players** (4 Stellen)

**Zeile 473:** `handleImportPlayers()` - Update existierender Spieler
- ✅ `from('players')` → `from('players_unified')`

**Zeile 496:** `handleImportPlayers()` - Neuer Spieler
- ✅ `from('imported_players')` → `from('players_unified')`
- ✅ Neue Felder hinzugefügt:
  - `player_type: 'app_user'`
  - `onboarding_status: 'not_started'`
  - `import_source: 'tvm_import'`
  - `merged_from_player_id: null`
  - `invited_at: new Date().toISOString()`
  - `onboarded_at: null`
- ✅ `import_lk` → `current_lk`
- ✅ `team_id` → `primary_team_id`

**Zeile 701:** `performPlayerMatching()`
- ✅ Kombiniertes Laden von `players` UND `imported_players` → Einzelnes Laden von `players_unified`
- ✅ Filter: `.in('status', ['active', 'pending'])`

**Zeile 710:** `performPlayerMatching()`
- ✅ Single Query: `from('players_unified')` mit `.in('status', ['active', 'pending'])`
- ✅ Normalisierung: Alle Spieler haben jetzt `current_lk` statt unterschiedliche Feldnamen

### 3. **matches Tabelle - Spaltenkorrekturen** (2 Stellen)

**Zeile 228:** `handleImportMatches()`
- ✅ `match_date` → `date_time`
- ✅ `created_by` → `organizer_id`
- ✅ Saison-Format korrigiert: `'winter'` → `'winter_25_26'`

**Zeile 397:** `checkForDuplicates()`
- ✅ `select('match_date')` → `select('date_time')`
- ✅ Duplicate-Check-Logik angepasst für `date_time` Format

## 🎯 Funktionalität

### ✅ Was funktioniert:
1. **Club Matching:** Fuzzy-Search findet/erstellt Vereine
2. **Team Creation:** Erstellt Team mit club_id in team_info
3. **Match Import:** Korrekte Spalten (`date_time`, `organizer_id`)
4. **Player Import:** 
   - Erstellt neue Spieler in `players_unified` mit `status='pending'`
   - Updated existierende Spieler (LK)
   - Verknüpft Spieler mit Teams in `team_memberships`

### ⚠️ VKC Köln Import-Voraussetzungen:

1. **Verein fehlt:** "VKC Köln" existiert nicht in `club_info`
   - **Lösung:** User muss Verein erstellen oder `findOrSuggestClub()` Modal verwenden

2. **Test-Beispiel:** Zeile 817 enthält bereits Beispiel-Text für "VKC Köln Herren 50"
   - Muss für "Herren 40" angepasst werden

## 📝 Empfohlene nächste Schritte:

1. ✅ Testen mit Test-Daten (DRY RUN)
2. ⏳ Club "VKC Köln" in DB erstellen
3. ⏳ Import testen mit echten VKC Köln Daten
4. ✅ Sicherstellen dass Matches korrekt importiert werden





