-- IDENTIFY_DUPLICATES.sql
-- Zeigt alle Duplikate in team_seasons

-- Zeige ALLE VKC Köln Teams mit Duplikaten
SELECT 
  'DUPLICATES FOUND' as info,
  ts.team_id,
  ti.team_name,
  ti.club_name,
  ts.season,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ts.id ORDER BY ts.created_at DESC) as season_ids,
  ARRAY_AGG(ts.created_at ORDER BY ts.created_at DESC) as created_dates
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.is_active = true
GROUP BY ts.team_id, ti.team_name, ti.club_name, ts.season
HAVING COUNT(*) > 1;

-- Zeige die DUPLIKATEN im Detail für Herren 40 1
SELECT 
  'DETAILED DUPLICATES - Herren 40 1' as info,
  ts.id,
  ts.team_id,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ts.created_at,
  ts.updated_at
FROM team_seasons ts
WHERE ts.team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND ts.is_active = true
ORDER BY ts.created_at ASC;

