SELECT id, club_name, team_name
FROM team_info
WHERE (club_name = 'TV Ensen Westhoven' AND team_name = '1')
   OR (club_name = 'TC Colonius' AND team_name = '3')
   OR (club_name = 'TC Ford Köln' AND team_name = '2')
   OR club_name = 'TV Ensen Westhoven' OR club_name = 'TC Colonius' OR club_name = 'TC Ford Köln';


