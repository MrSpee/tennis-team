-- FIX_SEASON_VALUE.sql
-- Korrigiert den season-Wert in team_seasons für VKC Köln Herren 40 1

-- 1. Zeige ALLE team_seasons für beide Teams
SELECT 
  'All team_seasons for VKC teams' as info,
  ts.id,
  ts.team_id,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  ts.is_active,
  ti.team_name,
  ti.club_name
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ti.club_name = 'VKC Köln'
ORDER BY ts.team_id, ts.season;

-- 2. Update season von "Winter 2025/26" zu "winter_25_26"
UPDATE team_seasons
SET season = 'winter_25_26',
    updated_at = NOW()
WHERE team_id = '235fade5-0974-4f5b-a758-536f771a5e80'
  AND season = 'Winter 2025/26'
RETURNING 'Updated season value' as status, *;

-- 3. Verification - Zeige aktualisierte Daten
SELECT 
  'VERIFICATION' as info,
  ts.*,
  ti.team_name,
  ti.club_name
FROM team_seasons ts
JOIN team_info ti ON ts.team_id = ti.id
WHERE ti.club_name = 'VKC Köln'
  AND ts.is_active = true
ORDER BY ts.team_id;





