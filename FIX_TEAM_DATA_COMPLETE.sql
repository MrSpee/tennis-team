-- ========================================
-- KOMPLETTE TEAM-DATEN REPARATUR
-- Behebt: Leere team_names, doppelte Einträge, fehlendes TC Köln
-- ========================================

-- ========================================
-- SCHRITT 1: Zeige aktuelle Situation
-- ========================================

SELECT 'AKTUELLE TEAMS' as info, * FROM team_info;

SELECT 
  'THEOS AKTUELLE TEAMS' as info,
  p.name,
  ti.club_name,
  ti.team_name,
  ti.id as team_id,
  pt.is_primary
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester';

-- ========================================
-- SCHRITT 2: Bereinige doppelte player_teams Einträge
-- ========================================

-- Lösche doppelte Einträge (behalte nur den neuesten pro player+team)
DELETE FROM player_teams pt1
WHERE EXISTS (
  SELECT 1 FROM player_teams pt2
  WHERE pt1.player_id = pt2.player_id
  AND pt1.team_id = pt2.team_id
  AND pt1.created_at < pt2.created_at
);

-- ========================================
-- SCHRITT 3: Setze team_name für SV Rot-Gelb Sürth
-- ========================================

UPDATE team_info
SET team_name = 'Herren 40'
WHERE club_name LIKE '%Sürth%' OR club_name LIKE '%Rot%Gelb%'
AND (team_name IS NULL OR team_name = '');

-- ========================================
-- SCHRITT 4: Erstelle TC Köln Team (neu & sauber)
-- ========================================

-- Lösche erst alte TC Köln Einträge (falls vorhanden)
DELETE FROM player_teams WHERE team_id IN (SELECT id FROM team_info WHERE club_name = 'TC Köln');
DELETE FROM matches WHERE team_id IN (SELECT id FROM team_info WHERE club_name = 'TC Köln');
DELETE FROM team_info WHERE club_name = 'TC Köln';

-- Erstelle frisches TC Köln Team
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
VALUES (
  'TC Köln',
  'Herren 1',
  'Herren',
  'Verbandsliga',
  'Gr. 1',
  'Mittelrhein',
  'https://tvm-tennis.de/spielbetrieb/mannschaft/example-tc-koeln',
  'winter',
  '24/25'
)
RETURNING id, club_name, team_name;

-- ========================================
-- SCHRITT 5: Weise Theo beiden Teams zu
-- ========================================

DO $$
DECLARE
  theo_id UUID;
  suerth_team_id UUID;
  koeln_team_id UUID;
BEGIN
  -- Finde Theo
  SELECT id INTO theo_id FROM players WHERE name = 'Theo Tester' LIMIT 1;
  
  IF theo_id IS NULL THEN
    RAISE EXCEPTION '❌ Theo Tester nicht gefunden!';
  END IF;
  
  -- Finde SV Sürth Team
  SELECT id INTO suerth_team_id 
  FROM team_info 
  WHERE club_name LIKE '%Sürth%' OR club_name LIKE '%Rot%Gelb%'
  LIMIT 1;
  
  -- Finde TC Köln Team
  SELECT id INTO koeln_team_id 
  FROM team_info 
  WHERE club_name = 'TC Köln'
  LIMIT 1;
  
  -- Lösche alte Zuweisungen für Theo
  DELETE FROM player_teams WHERE player_id = theo_id;
  
  -- Weise Theo SV Sürth zu (PRIMARY)
  IF suerth_team_id IS NOT NULL THEN
    INSERT INTO player_teams (player_id, team_id, is_primary, role)
    VALUES (theo_id, suerth_team_id, true, 'player');
    RAISE NOTICE '✅ Theo → SV Sürth (PRIMARY)';
  END IF;
  
  -- Weise Theo TC Köln zu (SECONDARY)
  IF koeln_team_id IS NOT NULL THEN
    INSERT INTO player_teams (player_id, team_id, is_primary, role)
    VALUES (theo_id, koeln_team_id, false, 'player');
    RAISE NOTICE '✅ Theo → TC Köln (SECONDARY)';
  END IF;
  
  RAISE NOTICE '🎉 Theo spielt jetzt für % Teams', 
    (SELECT COUNT(*) FROM player_teams WHERE player_id = theo_id);
END $$;

-- ========================================
-- SCHRITT 6: Erstelle Demo-Match für TC Köln
-- ========================================

INSERT INTO matches (
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed,
  team_id
)
SELECT
  NOW() + INTERVAL '14 days', -- In 2 Wochen
  'TC Bayer Leverkusen 1',
  'Away',
  'TC Bayer Leverkusen, Nobelstraße 37, 51373 Leverkusen',
  'winter',
  6,
  id
FROM team_info
WHERE club_name = 'TC Köln'
LIMIT 1;

-- ========================================
-- SCHRITT 7: Setze team_id für ALLE Matches die noch keine haben
-- ========================================

UPDATE matches m
SET team_id = (
  SELECT id FROM team_info 
  WHERE club_name LIKE '%Sürth%' OR club_name LIKE '%Rot%Gelb%'
  LIMIT 1
)
WHERE team_id IS NULL;

-- ========================================
-- FINAL VERIFICATION
-- ========================================

-- 1. Alle Teams
SELECT 
  '✅ ALLE TEAMS' as check_name,
  id,
  club_name,
  team_name,
  category,
  season
FROM team_info
ORDER BY created_at;

-- 2. Theos Teams
SELECT 
  '✅ THEOS TEAMS' as check_name,
  p.name,
  ti.club_name,
  ti.team_name,
  pt.is_primary,
  pt.role
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester'
ORDER BY pt.is_primary DESC;

-- 3. Matches mit Teams
SELECT 
  '✅ MATCHES MIT TEAMS' as check_name,
  m.opponent,
  TO_CHAR(m.match_date, 'DD.MM.YYYY') as datum,
  ti.club_name || ' - ' || ti.team_name as team,
  m.season
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

-- 4. Matches OHNE team_id (sollte 0 sein!)
SELECT 
  '⚠️ MATCHES OHNE TEAM_ID' as check_name,
  COUNT(*) as anzahl
FROM matches
WHERE team_id IS NULL;

-- ========================================
-- ERWARTETES ERGEBNIS
-- ========================================
/*
✅ ALLE TEAMS: 2 Zeilen
  - SV Rot-Gelb Sürth - Herren 40
  - TC Köln - Herren 1

✅ THEOS TEAMS: 2 Zeilen
  - SV Rot-Gelb Sürth (PRIMARY)
  - TC Köln (SECONDARY)

✅ MATCHES MIT TEAMS: Alle Matches haben Team-Namen
  - Mehrheit: SV Rot-Gelb Sürth
  - Mind. 1: TC Köln

⚠️ MATCHES OHNE TEAM_ID: 0
*/

