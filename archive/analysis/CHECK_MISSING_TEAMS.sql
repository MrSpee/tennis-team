-- Finde fehlende Teams für die Matchdays

-- 1. Hole alle Matchdays mit Sürth
SELECT 
    md.id,
    md.match_date,
    md.home_team_id,
    md.away_team_id,
    ht.club_name as home_club,
    ht.team_name as home_team,
    at.club_name as away_club,
    at.team_name as away_team
FROM matchdays md
LEFT JOIN team_info ht ON md.home_team_id = ht.id
LEFT JOIN team_info at ON md.away_team_id = at.id
WHERE md.home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f' 
   OR md.away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
ORDER BY md.match_date;

-- 2. Prüfe: Welche Team-IDs fehlen noch?
-- Hole alle UNIQUE Team-IDs aus den Matchdays
SELECT 
    home_team_id as team_id,
    'home' as position
FROM matchdays
WHERE home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'

UNION ALL

SELECT 
    away_team_id as team_id,
    'away' as position
FROM matchdays
WHERE away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f';

-- 3. Prüfe: Welche dieser IDs existieren NICHT in team_info?
SELECT 
    ti.id,
    ti.club_name,
    ti.team_name,
    ti.category
FROM team_info ti
WHERE ti.id IN (
    SELECT DISTINCT home_team_id FROM matchdays WHERE home_team_id != 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
    UNION
    SELECT DISTINCT away_team_id FROM matchdays WHERE away_team_id != 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
);



