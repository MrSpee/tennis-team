-- ANALYSE: Warum hat Sürth 22 Spiele statt 4?
-- Schaue dir alle Matches für Sürth an

-- 1. Alle Matches für Sürth mit Details
SELECT 
  'ALLE MATCHES FÜR SÜRTH:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  m.season,
  m.team_id,
  ti.club_name,
  ti.team_name,
  ti.category
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date;

-- 2. Gruppiere nach Saison
SELECT 
  'MATCHES NACH SAISON:' as info,
  m.season,
  COUNT(*) as match_count,
  STRING_AGG(m.opponent, ', ') as opponents
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
GROUP BY m.season
ORDER BY m.season;

-- 3. Schaue dir die Datenqualität an
SELECT 
  'DATENQUALITÄT:' as info,
  COUNT(*) as total_matches,
  COUNT(CASE WHEN m.season IS NULL THEN 1 END) as null_season,
  COUNT(CASE WHEN m.season = 'winter' THEN 1 END) as winter_matches,
  COUNT(CASE WHEN m.season = 'summer' THEN 1 END) as summer_matches,
  COUNT(CASE WHEN m.season NOT IN ('winter', 'summer') THEN 1 END) as other_seasons
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth';

-- 4. Schaue dir die Match-Daten genauer an
SELECT 
  'MATCH-DETAILS:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.season,
  m.created_at,
  m.updated_at
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.created_at DESC
LIMIT 10;
