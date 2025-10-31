-- Konsolidierung: Verschiebe alle Verknüpfungen von "SV Rot-Gelb Sürth - Herren 1"
-- auf "SV Rot-Gelb Sürth - Herren 40" OHNE DO-Block (kompatibel mit Supabase SQL Editor)

BEGIN;

WITH ids AS (
  SELECT
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 1' LIMIT 1)  AS herren_1_id,
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 40' LIMIT 1) AS herren_40_id
)
-- Matchdays: Home-Team migrieren
UPDATE matchdays m
SET home_team_id = ids.herren_40_id
FROM ids
WHERE m.home_team_id = ids.herren_1_id;

WITH ids AS (
  SELECT
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 1' LIMIT 1)  AS herren_1_id,
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 40' LIMIT 1) AS herren_40_id
)
-- Matchdays: Away-Team migrieren
UPDATE matchdays m
SET away_team_id = ids.herren_40_id
FROM ids
WHERE m.away_team_id = ids.herren_1_id;

WITH ids AS (
  SELECT
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 1' LIMIT 1)  AS herren_1_id,
    (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 40' LIMIT 1) AS herren_40_id
)
-- Team-Memberships migrieren
UPDATE team_memberships tm
SET team_id = ids.herren_40_id
FROM ids
WHERE tm.team_id = ids.herren_1_id;

-- Optional: Duplikat-Team entfernen (falls vorhanden)
WITH h1 AS (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 1' LIMIT 1
)
DELETE FROM team_info ti
USING h1
WHERE ti.id = h1.id;

COMMIT;

