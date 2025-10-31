-- GET COLUMNS FOR matches, team_info, team_memberships
-- ======================================================

SELECT 'matches' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;

SELECT 'team_info' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;

SELECT 'team_memberships' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'team_memberships'
ORDER BY ordinal_position;



