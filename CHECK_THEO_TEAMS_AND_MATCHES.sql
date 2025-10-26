-- Check Theo Tester's Teams and Matches
-- =====================================

-- 1. Finde Theo Tester in der Datenbank
SELECT 
  'Theo Tester Info' as info,
  pu.id,
  pu.name,
  pu.email,
  pu.primary_team_id,
  pu.player_type,
  pu.status
FROM players_unified pu
WHERE pu.name ILIKE '%Theo%Tester%'
   OR pu.email ILIKE '%jorzig@gmail.com%';

-- 2. Alle Teams die Theo zugeordnet sind
SELECT 
  'Theo Team Memberships' as info,
  tm.id as membership_id,
  tm.player_id,
  tm.team_id,
  tm.is_active,
  tm.is_primary,
  tm.role,
  tm.season,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.league_id
FROM team_memberships tm
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.player_id = 'faaf92cf-e050-421f-8d2b-5880d5f11a62';

-- 3. Gibt es eine "Herren 30" Mannschaft?
SELECT 
  'Herren 30 Teams' as info,
  ti.id,
  ti.team_name,
  ti.club_name,
  ti.category,
  ti.league_id,
  COUNT(tm.id) as members_count
FROM team_info ti
LEFT JOIN team_memberships tm ON ti.id = tm.team_id AND tm.is_active = true
WHERE ti.team_name ILIKE '%30%'
   OR ti.category ILIKE '%30%'
GROUP BY ti.id, ti.team_name, ti.club_name, ti.category, ti.league_id
ORDER BY ti.team_name;

-- 4. Alle Matches für SV Rot-Gelb Sürth Herren 30 (falls existiert)
SELECT 
  'Matches für Herren 30' as info,
  m.id,
  m.date,
  m.opponent,
  m.venue,
  m.season,
  m.status,
  ti.team_name,
  ti.club_name
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name ILIKE '%Rot-Gelb Sürth%'
  AND ti.category ILIKE '%30%';

-- 5. Alle Matches für Theo's aktuelle Teams
SELECT 
  'Matches für Theo Teams' as info,
  m.id,
  m.date,
  m.opponent,
  m.venue,
  m.season,
  m.status,
  ti.team_name,
  ti.club_name,
  ti.category
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE m.team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';  -- Sein aktuelles Team

-- 6. Alle Teams mit "30" in der Kategorie
SELECT 
  'All Teams with 30' as info,
  ti.id,
  ti.team_name,
  ti.club_name,
  ti.category
FROM team_info ti
WHERE ti.category ILIKE '%30%'
ORDER BY ti.club_name, ti.team_name;

-- 7. Zeige ALLE Spalten von team_info (damit wir wissen was existiert)
SELECT 
  'Team Info Columns' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;
