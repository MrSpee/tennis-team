-- PRÜFE: Sind die Match-IDs korrekt?
-- Schaue dir die Matches mit den korrekten Daten an

-- 1. Suche nach TG Leverkusen 2 am 05.10.2025
SELECT 
  'TG LEVERKUSEN 2 (05.10.2025):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.opponent = 'TG Leverkusen 2'
  AND m.match_date::date = '2025-10-05';

-- 2. Suche nach TV Ensen Westhoven 1 am 20.12.2025
SELECT 
  'TV ENSEN WESTHOVEN 1 (20.12.2025):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.opponent = 'TV Ensen Westhoven 1'
  AND m.match_date::date = '2025-12-20';

-- 3. Suche nach TC Colonius 3 am 07.03.2026
SELECT 
  'TC COLONIUS 3 (07.03.2026):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.opponent = 'TC Colonius 3'
  AND m.match_date::date = '2026-03-07';

-- 4. Suche nach TC Ford Köln 2 am 21.03.2026
SELECT 
  'TC FORD KÖLN 2 (21.03.2026):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.opponent = 'TC Ford Köln 2'
  AND m.match_date::date = '2026-03-21';
