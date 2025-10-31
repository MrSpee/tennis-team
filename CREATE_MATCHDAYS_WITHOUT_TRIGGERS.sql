-- CREAT MATCHDAYS OHNE club_info Trigger-Probleme
-- Erstelle die Matchdays mit manuell gesuchten Team-IDs

-- 1. Hole alle benötigten Team IDs
SELECT id, club_name, team_name FROM team_info 
WHERE (club_name = 'TV Ensen Westhoven' AND team_name = '1')
   OR (club_name = 'TC Colonius' AND team_name = '3')
   OR club_name = 'TV Ensen Westhoven'
   OR club_name = 'TC Colonius';

-- 2. Lösche falsche Matchdays
DELETE FROM matchdays WHERE id IN ('b4c85108-55c8-4bb5-b27a-8249c3eb4a7e', '8fcd7288-80bb-4acd-be5a-1a9bf79a6a43');

-- 3. Prüfe: Gibt es schon einen Matchday am 20.12.2025 für Sürth?
SELECT id, home_team_id, away_team_id, match_date
FROM matchdays 
WHERE match_date::date = '2025-12-20'
  AND (home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f' OR away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f');

-- 4. Prüfe: Gibt es schon einen Matchday am 07.03.2026 für Sürth?
SELECT id, home_team_id, away_team_id, match_date
FROM matchdays 
WHERE match_date::date = '2026-03-07'
  AND (home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f' OR away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f');

-- 5. Prüfe alle Sürth Matchdays (FINAL)
SELECT 
    md.id,
    md.match_date,
    md.start_time,
    md.location,
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



