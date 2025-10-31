-- Prüfe und erstelle fehlende Teams für Sürth Matchdays

-- 1. TV Ensen Westhoven 1
INSERT INTO club_info (id, name, city, region)
SELECT gen_random_uuid(), 'TV Ensen Westhoven', 'Köln', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM club_info WHERE name = 'TV Ensen Westhoven');

INSERT INTO team_info (club_name, team_name, category, region)
SELECT 'TV Ensen Westhoven', '1', 'Herren 40', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM team_info WHERE club_name = 'TV Ensen Westhoven' AND team_name = '1');

-- 2. TC Colonius 3
INSERT INTO club_info (id, name, city, region)
SELECT gen_random_uuid(), 'TC Colonius', 'Köln', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM club_info WHERE name = 'TC Colonius');

INSERT INTO team_info (club_name, team_name, category, region)
SELECT 'TC Colonius', '3', 'Herren 40', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM team_info WHERE club_name = 'TC Colonius' AND team_name = '3');

-- 3. TC Ford Köln 2
INSERT INTO club_info (id, name, city, region)
SELECT gen_random_uuid(), 'TC Ford Köln', 'Köln', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM club_info WHERE name = 'TC Ford Köln');

INSERT INTO team_info (club_name, team_name, category, region)
SELECT 'TC Ford Köln', '2', 'Herren 40', 'Mittelrhein'
WHERE NOT EXISTS (SELECT 1 FROM team_info WHERE club_name = 'TC Ford Köln' AND team_name = '2');

-- 4. Zeige alle erstellten Teams
SELECT 
    id,
    club_name,
    team_name,
    category
FROM team_info
WHERE (club_name = 'TV Ensen Westhoven' AND team_name = '1')
   OR (club_name = 'TC Colonius' AND team_name = '3')
   OR (club_name = 'TC Ford Köln' AND team_name = '2');

