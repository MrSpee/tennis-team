-- Prüfe welche source_url Werte in der Datenbank gespeichert sind
SELECT 
  source_url,
  source_type,
  COUNT(*) as matchday_count,
  STRING_AGG(DISTINCT group_name, ', ') as groups,
  MIN(match_date) as earliest_match,
  MAX(match_date) as latest_match
FROM matchdays
WHERE source_url IS NOT NULL
GROUP BY source_url, source_type
ORDER BY matchday_count DESC;

-- Zeige auch einige Beispiele für vergangene Matchdays ohne meeting_id
SELECT 
  id,
  match_date,
  group_name,
  source_url,
  meeting_id,
  home_team_id,
  away_team_id
FROM matchdays
WHERE match_date < NOW()
  AND (meeting_id IS NULL OR meeting_id = '')
  AND source_url IS NOT NULL
ORDER BY match_date DESC
LIMIT 20;

