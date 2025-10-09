# 🏢 Team-Management System

## Übersicht
Ein Spieler kann in mehreren Vereinen und pro Verein in bis zu 3 Mannschaften spielen.

## Aktuelle Implementierung

### ✅ Was funktioniert:
- **Button "Mannschaft hinzufügen"** in Dashboard und Profil
- **Anzeige** aller Teams gruppiert nach Verein
- **Team-Details**: Liga, Gruppe, Saison, Spieleranzahl
- **Badges**: Hauptmannschaft, Captain/Spieler-Rolle

### 🚧 Was noch fehlt (TODO):
- **Modal** für Team-Auswahl
- **Validierung**: Max 3 Teams pro Club
- **Club-Suche** mit Autocomplete
- **Team-Auswahl** nach Club
- **Rollen-Auswahl**: Captain oder Spieler
- **Hauptmannschaft** festlegen

---

## Datenbank-Struktur

### Tabellen:
1. **`club_info`** - Vereine
   - `id` (UUID, PK)
   - `name` (Text, UNIQUE)
   - `city`, `region`, `state`

2. **`team_info`** - Mannschaften
   - `id` (UUID, PK)
   - `club_id` (UUID, FK → club_info)
   - `club_name` (Text, denormalisiert)
   - `team_name` (Text, optional)
   - `category` (z.B. "Herren 40")

3. **`team_seasons`** - Saison-Daten
   - `team_id` (UUID, FK → team_info)
   - `season` (z.B. "Winter 2025/26")
   - `league` (z.B. "1. Bezirksliga")
   - `group_name` (z.B. "Gr. 043")
   - `team_size` (INTEGER)

4. **`player_teams`** - Spieler ↔ Team Zuordnung
   - `player_id` (UUID, FK → players)
   - `team_id` (UUID, FK → team_info)
   - `is_primary` (BOOLEAN)
   - `role` (VARCHAR: "captain" | "player")

---

## Feature-Implementierung (Roadmap)

### Phase 1: Modal & UI ✅ DONE
- [x] Button "Mannschaft hinzufügen"
- [x] Info-Text "bis zu 3 Mannschaften pro Verein"

### Phase 2: Club-Suche 🚧 TODO
```jsx
// ClubAutocomplete Component bereits vorhanden!
<ClubAutocomplete
  onClubSelect={(club) => setSelectedClub(club)}
  placeholder="Verein suchen..."
/>
```

### Phase 3: Team-Auswahl 🚧 TODO
```jsx
// Nach Club-Auswahl: Lade Teams
const { data: teams } = await supabase
  .from('team_info')
  .select(`
    *,
    team_seasons!inner (
      league,
      group_name,
      season,
      team_size
    )
  `)
  .eq('club_id', selectedClub.id)
  .eq('team_seasons.is_active', true);
```

### Phase 4: Validierung 🚧 TODO
```jsx
// Prüfe aktuelle Teams des Spielers im gewählten Club
const { data: existingTeams } = await supabase
  .from('player_teams')
  .select('*, team_info!inner(club_id)')
  .eq('player_id', playerId)
  .eq('team_info.club_id', selectedClub.id);

if (existingTeams.length >= 3) {
  alert('Du bist bereits in 3 Mannschaften dieses Vereins!');
  return;
}
```

### Phase 5: Team hinzufügen 🚧 TODO
```jsx
// Füge Spieler zum Team hinzu
const { error } = await supabase
  .from('player_teams')
  .insert({
    player_id: playerId,
    team_id: selectedTeam.id,
    is_primary: existingTeams.length === 0, // Erstes Team = Primary
    role: selectedRole // "captain" oder "player"
  });

if (!error) {
  // RLS Policy sorgt automatisch für Sichtbarkeit!
  // Lade Teams neu
  await loadPlayerTeams(playerId);
}
```

---

## Modal-Design (Vorschlag)

```
┌─────────────────────────────────────────────────┐
│  ➕ Mannschaft hinzufügen                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  Schritt 1: Verein wählen                       │
│  ┌───────────────────────────────────────────┐ │
│  │ 🔍 Verein suchen...          [ClubAuto] │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  Schritt 2: Mannschaft wählen                   │
│  ┌───────────────────────────────────────────┐ │
│  │ ⚪ Herren 40 1 - 1. Bezirksliga           │ │
│  │ ⚪ Herren 30 2 - 2. Kreisliga             │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  Schritt 3: Rolle wählen                        │
│  ┌───────────────────────────────────────────┐ │
│  │ ⚪ 🎾 Spieler                              │ │
│  │ ⚪ 🎯 Captain                              │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ⚠️  Du bist bereits in 1 Mannschaft(en)       │
│      dieses Vereins. (Max. 3)                  │
│                                                  │
│              [Abbrechen]  [Hinzufügen]         │
└─────────────────────────────────────────────────┘
```

---

## RLS Policies (bereits implementiert)

### `player_teams`:
```sql
-- Spieler sieht eigene Teams
CREATE POLICY "player_teams_select_policy"
ON player_teams FOR SELECT
USING (player_id = get_current_player_id());
```

### `team_info`:
```sql
-- Spieler sieht nur Teams, in denen er Mitglied ist
CREATE POLICY "team_info_select_policy"
ON team_info FOR SELECT
USING (
  id IN (
    SELECT team_id FROM player_teams 
    WHERE player_id = get_current_player_id()
  )
);
```

### `matches`:
```sql
-- Spieler sieht nur Matches seiner Teams
CREATE POLICY "team_matches_select"
ON matches FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM player_teams 
    WHERE player_id = get_current_player_id()
  )
);
```

---

## Testing Checklist

- [ ] Spieler kann Club suchen
- [ ] Nach Club-Auswahl werden Teams geladen
- [ ] Validierung: Max 3 Teams pro Club
- [ ] Team wird erfolgreich hinzugefügt
- [ ] `player_teams` Eintrag erstellt
- [ ] RLS: Neue Matches sind sofort sichtbar
- [ ] RLS: Training-Sessions sind sichtbar
- [ ] Dashboard zeigt neues Team
- [ ] Profil zeigt neues Team

---

## Verwendete Components

### Bereits vorhanden:
1. **`ClubAutocomplete.jsx`** - Club-Suche mit Fuzzy Matching
2. **`OnboardingFlow.jsx`** - Ähnlicher Flow für Setup
3. **`SupabaseProfile.jsx`** - Profil-Verwaltung

### Neu zu erstellen:
1. **`AddTeamModal.jsx`** - Modal für Team-Auswahl
2. **`TeamSelector.jsx`** - Team-Auswahl-Liste

---

## Nächste Schritte

1. **AddTeamModal.jsx** erstellen
2. **ClubAutocomplete** integrieren
3. **TeamSelector** Component bauen
4. **Validierung** implementieren
5. **Supabase Insert** implementieren
6. **Testing** durchführen

---

## Notes

- **Captain-Rolle**: Nur Captains können Matches verwalten
- **Primary Team**: Das erste Team wird automatisch als Primary markiert
- **RLS**: Alle Policies sind bereits vorhanden und funktionieren
- **Multi-Club**: Ein Spieler kann problemlos in mehreren Clubs sein


