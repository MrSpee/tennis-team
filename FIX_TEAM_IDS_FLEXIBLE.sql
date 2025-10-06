-- ========================================
-- FIX TEAM IDs - FLEXIBLE VERSION
-- Findet automatisch das richtige Haupt-Team
-- ========================================

-- Schritt 1: Zeige ALLE Teams in der DB
SELECT 
  'ALLE TEAMS IN DB' as info,
  id,
  club_name,
  team_name,
  season,
  season_year,
  created_at
FROM team_info
ORDER BY created_at;

-- Schritt 2: Zeige Matches OHNE team_id
SELECT 
  'MATCHES OHNE TEAM_ID' as info,
  COUNT(*) as anzahl
FROM matches
WHERE team_id IS NULL;

-- Schritt 3: FLEXIBLE LÖSUNG - Nimm das ERSTE Team als Haupt-Team
DO $$
DECLARE
  main_team_id UUID;
  updated_count INTEGER;
  team_name_found VARCHAR;
  club_name_found VARCHAR;
BEGIN
  -- Finde irgendein Team (erstes in der DB)
  SELECT id, club_name, team_name INTO main_team_id, club_name_found, team_name_found
  FROM team_info
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF main_team_id IS NULL THEN
    RAISE EXCEPTION '❌ KEINE Teams in team_info gefunden! Bitte zuerst Teams erstellen.';
  END IF;
  
  RAISE NOTICE '✅ Haupt-Team gefunden: % - % (ID: %)', club_name_found, team_name_found, main_team_id;
  
  -- Update alle Matches ohne team_id
  UPDATE matches
  SET team_id = main_team_id
  WHERE team_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % Matches mit team_id aktualisiert', updated_count;
  
  -- Zeige welche Matches aktualisiert wurden
  RAISE NOTICE '📋 Alle Matches gehören jetzt zu: % - %', club_name_found, team_name_found;
END $$;

-- Schritt 4: VERIFICATION
SELECT 
  'NACH UPDATE' as info,
  COUNT(*) as total_matches,
  COUNT(team_id) as matches_with_team_id,
  COUNT(*) - COUNT(team_id) as matches_without_team_id
FROM matches;

-- Schritt 5: Zeige 10 neueste Matches mit Team
SELECT 
  m.opponent,
  TO_CHAR(m.match_date, 'DD.MM.YYYY HH24:MI') as datum,
  m.season,
  ti.club_name || ' - ' || ti.team_name as team
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

-- ========================================
-- BONUS: Erstelle Haupt-Team falls nicht vorhanden
-- ========================================

-- Wenn kein Team existiert, erstelle eins:
INSERT INTO team_info (
  club_name,
  team_name,
  category,
  league,
  group_name,
  region,
  tvm_link,
  season,
  season_year
)
SELECT 
  'SV Rot-Gelb Sürth',
  'Herren 40',
  'Herren 40',
  '1. Kreisliga',
  'Gr. 046',
  'Mittelrhein',
  'https://tvm-tennis.de/spielbetrieb/mannschaft/3472127-sv-rg-suerth-1',
  'winter',
  '24/25'
WHERE NOT EXISTS (
  SELECT 1 FROM team_info 
  WHERE club_name LIKE '%Sürth%' 
  OR club_name LIKE '%Rot%Gelb%'
);

-- Weise Theo Tester dem Haupt-Team zu (falls noch nicht geschehen)
DO $$
DECLARE
  theo_id UUID;
  main_team_id UUID;
BEGIN
  -- Finde Theo
  SELECT id INTO theo_id FROM players WHERE name = 'Theo Tester' LIMIT 1;
  
  -- Finde Haupt-Team
  SELECT id INTO main_team_id FROM team_info ORDER BY created_at ASC LIMIT 1;
  
  IF theo_id IS NOT NULL AND main_team_id IS NOT NULL THEN
    -- Füge Verknüpfung hinzu (falls nicht vorhanden)
    INSERT INTO player_teams (player_id, team_id, is_primary, role)
    VALUES (theo_id, main_team_id, true, 'player')
    ON CONFLICT (player_id, team_id) DO UPDATE
    SET is_primary = true;
    
    RAISE NOTICE '✅ Theo Tester dem Haupt-Team zugewiesen';
  ELSE
    RAISE NOTICE '⚠️ Theo oder Haupt-Team nicht gefunden';
  END IF;
END $$;

-- ========================================
-- FINAL CHECK
-- ========================================

-- Zeige Theos Teams
SELECT 
  'THEOS TEAMS' as info,
  p.name as spieler,
  ti.club_name,
  ti.team_name,
  pt.is_primary
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester';

