-- Prüfe Team-Info für Sürth
SELECT 
  id,
  team_name,
  club_name,
  league,
  group_name,
  category
FROM team_info
WHERE club_name ILIKE '%sürth%' OR club_name ILIKE '%suerth%'
ORDER BY team_name;
