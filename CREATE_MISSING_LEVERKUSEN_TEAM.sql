-- CREATE_MISSING_LEVERKUSEN_TEAM.sql
-- Erstellt das fehlende Leverkusen Team in team_info

-- 1. Prüfe ob das Team bereits existiert
SELECT 
  'CHECKING EXISTING TEAM' as info,
  id,
  club_name,
  team_name,
  category
FROM team_info 
WHERE id = '06ee529a-18cf-4a30-bbe0-f7096314721e';

-- 2. Erstelle das fehlende Team
INSERT INTO team_info (
  id,
  club_name,
  team_name,
  category,
  region,
  tvm_link,
  club_id,
  created_at,
  updated_at
)
VALUES (
  '06ee529a-18cf-4a30-bbe0-f7096314721e',
  'TG Leverkusen',
  'TG Leverkusen 2',
  'Herren 40',
  'Köln',
  NULL, -- TVM Link falls vorhanden
  NULL, -- Club ID falls vorhanden
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING; -- Falls es bereits existiert

-- 3. Verifikation: Prüfe ob das Team jetzt existiert
SELECT 
  'TEAM CREATED' as info,
  id,
  club_name,
  team_name,
  category
FROM team_info 
WHERE id = '06ee529a-18cf-4a30-bbe0-f7096314721e';

-- 4. Zeige alle opponent_players für dieses Team
SELECT 
  'OPPONENT_PLAYERS FOR THIS TEAM' as info,
  COUNT(*) as total_players,
  COUNT(CASE WHEN is_captain = true THEN 1 END) as captains
FROM opponent_players 
WHERE team_id = '06ee529a-18cf-4a30-bbe0-f7096314721e';

-- 5. Zeige Team-Details
SELECT 
  'TEAM DETAILS' as info,
  op.team_id,
  COUNT(*) as player_count,
  MIN(op.lk) as min_lk,
  MAX(op.lk) as max_lk,
  AVG(op.lk::numeric) as avg_lk,
  STRING_AGG(op.name, ', ') as player_names
FROM opponent_players op
WHERE op.team_id = '06ee529a-18cf-4a30-bbe0-f7096314721e'
GROUP BY op.team_id;

