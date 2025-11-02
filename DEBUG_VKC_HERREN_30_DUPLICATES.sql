-- ============================================
-- DEBUG: VKC Herren 30 Duplikate
-- ============================================
-- Prüft warum 3x Herren 30 existieren und wo Spieler/Matches zugeordnet sind
-- ============================================

-- ================================================
-- 🔍 1️⃣  ALLE VKC Herren 30 Teams in der Datenbank
-- ================================================

SELECT 
  '1️⃣ ALLE TEAMS' as step,
  id,
  team_name,
  category,
  club_name,
  region,
  tvm_link,
  created_at,
  (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_info.id AND is_active = true) as spieler_count,
  (SELECT COUNT(*) FROM matchdays WHERE home_team_id = team_info.id OR away_team_id = team_info.id) as match_count
FROM team_info
WHERE club_name ILIKE '%VKC%'
  AND category ILIKE '%Herren 30%'
ORDER BY created_at ASC;


-- ============================================
-- 👥 2️⃣  SPIELER-ZUORDNUNG (team_memberships)
-- ============================================

WITH herren30_teams AS (
  SELECT id, team_name, category, created_at
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%Herren 30%'
)
SELECT 
  '2️⃣ SPIELER' as step,
  t.id as team_id,
  t.category,
  LEFT(t.id::text, 8) || '...' as team_id_short,
  t.created_at as team_created,
  COUNT(DISTINCT tm.player_id) as active_players,
  STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as player_names
FROM herren30_teams t
LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.is_active = true
LEFT JOIN players_unified p ON p.id = tm.player_id
GROUP BY t.id, t.category, t.created_at
ORDER BY t.created_at ASC;


-- ==========================================
-- 🏆 3️⃣  MEDENSPIELE-ZUORDNUNG (matchdays)
-- ==========================================

WITH herren30_teams AS (
  SELECT id, team_name, category, created_at
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%Herren 30%'
)
SELECT 
  '3️⃣ MATCHES' as step,
  t.id as team_id,
  t.category,
  LEFT(t.id::text, 8) || '...' as team_id_short,
  t.created_at as team_created,
  COUNT(DISTINCT m.id) as total_matches,
  COUNT(DISTINCT CASE WHEN m.home_team_id = t.id THEN m.id END) as home_matches,
  COUNT(DISTINCT CASE WHEN m.away_team_id = t.id THEN m.id END) as away_matches,
  STRING_AGG(
    TO_CHAR(m.match_date, 'YYYY-MM-DD') || ' vs ' || 
    CASE 
      WHEN m.home_team_id = t.id THEN COALESCE(ti_away.team_name, 'Unknown') || ' (' || COALESCE(ti_away.category, '?') || ')'
      ELSE COALESCE(ti_home.team_name, 'Unknown') || ' (' || COALESCE(ti_home.category, '?') || ')'
    END,
    ' | '
    ORDER BY m.match_date
  ) as match_opponents
FROM herren30_teams t
LEFT JOIN matchdays m ON m.home_team_id = t.id OR m.away_team_id = t.id
LEFT JOIN team_info ti_home ON ti_home.id = m.home_team_id
LEFT JOIN team_info ti_away ON ti_away.id = m.away_team_id
GROUP BY t.id, t.category, t.created_at
ORDER BY t.created_at ASC;


-- ========================================
-- 📊 4️⃣  TEAM-SAISON-DATEN (team_seasons)
-- ========================================

WITH herren30_teams AS (
  SELECT id, team_name, category, created_at
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%Herren 30%'
)
SELECT 
  '4️⃣ SEASONS' as step,
  t.id as team_id,
  t.category,
  LEFT(t.id::text, 8) || '...' as team_id_short,
  ts.season,
  ts.league,
  ts.group_name,
  ts.is_active,
  ts.created_at as season_created
FROM herren30_teams t
LEFT JOIN team_seasons ts ON ts.team_id = t.id
ORDER BY t.created_at ASC, ts.created_at ASC;


-- ============================
-- 🎯 5️⃣  EMPFEHLUNG FÜR MERGE
-- ============================
-- Basierend auf Spieler-Count und Match-Count

WITH herren30_teams AS (
  SELECT id, team_name, category, created_at
  FROM team_info
  WHERE club_name ILIKE '%VKC%'
    AND category ILIKE '%Herren 30%'
),
team_stats AS (
  SELECT 
    t.id,
    t.category,
    t.created_at,
    COUNT(DISTINCT tm.player_id) as player_count,
    COUNT(DISTINCT m.id) as match_count
  FROM herren30_teams t
  LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.is_active = true
  LEFT JOIN matchdays m ON m.home_team_id = t.id OR m.away_team_id = t.id
  GROUP BY t.id, t.category, t.created_at
)
SELECT 
  '5️⃣ EMPFEHLUNG' as step,
  id as team_id,
  category,
  created_at,
  player_count,
  match_count,
  player_count + match_count as total_score,
  CASE 
    WHEN player_count + match_count = (SELECT MAX(player_count + match_count) FROM team_stats)
    THEN '✅ MASTER (behalten)'
    ELSE '❌ DUPLIKAT (mergen)'
  END as recommendation
FROM team_stats
ORDER BY total_score DESC, created_at ASC;

-- ==================
-- 💡 NÄCHSTE SCHRITTE:
-- ==================
-- 1. Identifiziere das MASTER-Team (meiste Spieler + Matches)
-- 2. Erstelle MERGE-Script wie MERGE_VKC_HERREN_55_DUPLICATES.sql
-- 3. Prüfe KI-Import Code in ImportTab.jsx → teamCache Logic

