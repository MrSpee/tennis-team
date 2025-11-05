-- ============================================
-- DEBUG: VKC Herren 50 Duplikate
-- ============================================

-- 1️⃣ ALLE VKC Herren 50 Teams
SELECT 
  '1️⃣ ALLE TEAMS' as step,
  id,
  team_name,
  category,
  club_name,
  club_id,
  created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id AND is_active = true) as spieler_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = team_info.id OR away_team_id = team_info.id) as match_count
FROM team_info
WHERE club_name ILIKE '%VKC%'
  AND category ILIKE '%Herren 50%'
ORDER BY created_at ASC;

-- 2️⃣ EMPFEHLUNG
WITH herren50_teams AS (
  SELECT id, category, created_at
  FROM team_info
  WHERE club_name ILIKE '%VKC%' AND category ILIKE '%Herren 50%'
),
team_stats AS (
  SELECT 
    t.id,
    t.created_at,
    COUNT(DISTINCT tm.player_id) as player_count,
    COUNT(DISTINCT m.id) as match_count
  FROM herren50_teams t
  LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.is_active = true
  LEFT JOIN matchdays m ON m.home_team_id = t.id OR m.away_team_id = t.id
  GROUP BY t.id, t.created_at
)
SELECT 
  '2️⃣ EMPFEHLUNG' as step,
  id as team_id,
  created_at,
  player_count,
  match_count,
  player_count + match_count as total_score,
  CASE 
    WHEN player_count + match_count = (SELECT MAX(player_count + match_count) FROM team_stats)
    THEN '✅ MASTER'
    ELSE '❌ DUPLIKAT'
  END as recommendation
FROM team_stats
ORDER BY total_score DESC, created_at ASC;




