-- ========================================
-- DEBUG MULTI-TEAM SETUP
-- Prüfe Datenbank-Struktur und Daten
-- ========================================

-- 1. Prüfe team_info Tabelle
SELECT 
  'team_info' as check_name,
  id,
  club_name,
  team_name,
  season,
  season_year,
  created_at
FROM team_info
ORDER BY created_at;

-- 2. Prüfe player_teams (Theo Tester)
SELECT 
  'player_teams' as check_name,
  pt.id,
  p.name as player_name,
  ti.club_name,
  ti.team_name,
  pt.is_primary,
  pt.created_at
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name LIKE '%Theo%'
ORDER BY pt.is_primary DESC;

-- 3. Prüfe matches Spalten
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- 4. Prüfe alle matches (mit team_id)
SELECT 
  'matches' as check_name,
  m.id,
  m.opponent,
  m.match_date,
  m.season,
  m.team_id,
  ti.club_name,
  ti.team_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 20;

-- 5. Prüfe ob Matches OHNE team_id existieren (Problem!)
SELECT 
  'matches_without_team' as check_name,
  COUNT(*) as count,
  array_agg(opponent) as opponents
FROM matches
WHERE team_id IS NULL;

-- 6. Hole ID des Haupt-Teams (SV Rot-Gelb Sürth)
SELECT 
  'main_team_id' as check_name,
  id,
  club_name,
  team_name,
  season,
  season_year
FROM team_info
WHERE club_name LIKE '%Sürth%'
OR club_name LIKE '%Rot%Gelb%'
LIMIT 1;

-- ========================================
-- LÖSUNG: Wenn Matches keine team_id haben
-- ========================================

-- Setze team_id für alle Matches ohne team_id
DO $$
DECLARE
  main_team_id UUID;
BEGIN
  -- Hole Haupt-Team ID
  SELECT id INTO main_team_id
  FROM team_info
  WHERE (club_name LIKE '%Sürth%' OR club_name LIKE '%Rot%Gelb%')
  AND season = 'winter'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF main_team_id IS NOT NULL THEN
    -- Update alle Matches ohne team_id
    UPDATE matches
    SET team_id = main_team_id
    WHERE team_id IS NULL;
    
    RAISE NOTICE '✅ Updated % matches with team_id: %', 
      (SELECT COUNT(*) FROM matches WHERE team_id = main_team_id),
      main_team_id;
  ELSE
    RAISE NOTICE '❌ No main team found!';
  END IF;
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

-- Alle Matches sollten jetzt team_id haben
SELECT 
  m.opponent,
  m.match_date,
  m.season,
  m.team_id IS NOT NULL as has_team_id,
  ti.club_name,
  ti.team_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

