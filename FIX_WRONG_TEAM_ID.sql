-- Fix: Ersetze ALLE falschen Team-IDs mit der RICHTIGEN

-- Chris Spee's richtiges Team
UPDATE matchdays
SET home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE home_team_id IN ('95220c8e-085a-41ff-8a2c-225df6df3f29', '2fde7487-27dd-4942-ac07-2ee1cde8c2f6', '4fd8e7c2-2290-458e-b810-fe0bb11e0094');

UPDATE matchdays
SET away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
WHERE away_team_id IN ('95220c8e-085a-41ff-8a2c-225df6df3f29', '2fde7487-27dd-4942-ac07-2ee1cde8c2f6', '4fd8e7c2-2290-458e-b810-fe0bb11e0094');

-- Prüfe
SELECT id, match_date, home_team_id, away_team_id
FROM matchdays
WHERE home_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f' 
   OR away_team_id = 'ff090c47-ff26-4df1-82fd-3e4358320d7f'
ORDER BY match_date;

