-- CLEAN_DUPLICATE_TEAM_SEASONS.sql
-- Bereinigt Duplikate in team_seasons und standardisiert auf "Winter 2025/26"

-- 1. Zeige DUPLIKATE
SELECT 
  'DUPLICATES CHECK' as info,
  ts.team_id,
  ti.team_name,
  ti.category,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ts.id) as season_ids,
  ARRAY_AGG(ts.season) as seasons
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.is_active = true
GROUP BY ts.team_id, ti.team_name, ti.category
HAVING COUNT(*) > 1;

-- 2. Zeige ALLE team_seasons für VKC Köln
SELECT 
  'ALL VKC team_seasons' as info,
  ts.id,
  ts.team_id,
  ts.season,
  ts.league,
  ts.group_name,
  ti.team_name,
  ti.category
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ti.club_name = 'VKC Köln'
  AND ts.is_active = true
ORDER BY ts.team_id, ts.season;

-- 3. LÖSCHE DUPLIKATE - Behalte nur "Winter 2025/26" Einträge
DELETE FROM team_seasons
WHERE id IN (
  SELECT ts.id
  FROM team_seasons ts
  JOIN team_info ti ON ts.team_id = ti.id
  WHERE ti.club_name = 'VKC Köln'
    AND ts.season = 'winter_25_26'
    AND ts.is_active = true
)
RETURNING 'Deleted duplicates' as status, *;

-- 4. FALLBACK: Update ALLE "winter_25_26" zu "Winter 2025/26" (falls noch welche übrig)
UPDATE team_seasons
SET season = 'Winter 2025/26',
    updated_at = NOW()
WHERE season = 'winter_25_26'
  AND is_active = true
RETURNING 'Updated to Winter 2025/26' as status, *;

-- 5. FINAL VERIFICATION
SELECT 
  'FINAL CHECK' as info,
  ts.*,
  ti.team_name,
  ti.club_name,
  ti.category
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.is_active = true
ORDER BY ti.club_name, ts.team_id;




