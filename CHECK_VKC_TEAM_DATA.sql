-- CHECK_VKC_TEAM_DATA.sql
-- Überprüft die Daten für Theo Tester II und die VKC Köln Teams

-- 1. Theo Tester II's Team-Mitgliedschaften
SELECT
  'Theo Memberships' as info,
  tm.player_id,
  tm.team_id,
  tm.season,
  tm.is_active,
  tm.is_primary,
  tm.role,
  ti.team_name,
  ti.club_name,
  ti.category
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62'
ORDER BY tm.is_primary DESC, ti.team_name;

-- 2. Alle team_seasons für VKC Köln Herren 30
SELECT
  'Herren 30 Seasons' as info,
  ts.team_id,
  ts.season,
  ts.league AS liga,
  ts.group_name AS gruppe,
  ts.team_size AS players,
  ts.is_active
FROM team_seasons ts
WHERE ts.team_id = '6c38c710-28dd-41fe-b991-b7180ef23ca1';

-- 3. Alle team_seasons für VKC Köln Herren 40 1
SELECT
  'Herren 40 1 Seasons' as info,
  ts.team_id,
  ts.season,
  ts.league AS liga,
  ts.group_name AS gruppe,
  ts.team_size AS players,
  ts.is_active
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80';

-- 4. Spieler-Anzahl für Herren 30
SELECT
  'Herren 30 Players' as info,
  COUNT(*) as num_players
FROM team_memberships
WHERE team_id = '6c38c710-28dd-41fe-b991-b7180ef23ca1'
  AND is_active = TRUE;

-- 5. Spieler-Anzahl für Herren 40 1
SELECT
  'Herren 40 1 Players' as info,
  COUNT(*) as num_players
FROM team_memberships
WHERE team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND is_active = TRUE;

