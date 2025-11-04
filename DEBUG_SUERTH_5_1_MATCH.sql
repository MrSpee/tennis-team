-- ============================================
-- DEBUG: SÜRTH 5:1 MATCH
-- ============================================
-- Prüfe warum 5:1 Sieg als Niederlage angezeigt wird
-- ============================================

-- ====================================
-- 1️⃣ FINDE SÜRTH TEAM
-- ====================================

SELECT 
  '1️⃣ SÜRTH TEAMS' as step,
  id,
  team_name,
  club_name,
  category,
  region
FROM team_info
WHERE club_name ILIKE '%Sürth%'
   OR club_name ILIKE '%Suerth%'
ORDER BY created_at;

-- ====================================
-- 2️⃣ ALLE MATCHES VON SÜRTH
-- ====================================

SELECT 
  '2️⃣ ALLE SÜRTH MATCHES' as step,
  m.id as matchday_id,
  m.match_date,
  m.home_team_id,
  m.away_team_id,
  ht.club_name as home_club,
  ht.category as home_category,
  at.club_name as away_club,
  at.category as away_category,
  m.home_score,
  m.away_score,
  m.status,
  m.season,
  CASE
    WHEN ht.club_name ILIKE '%Sürth%' OR ht.club_name ILIKE '%Suerth%' THEN 'HOME'
    WHEN at.club_name ILIKE '%Sürth%' OR at.club_name ILIKE '%Suerth%' THEN 'AWAY'
  END as suerth_perspective
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
WHERE ht.club_name ILIKE '%Sürth%' 
   OR ht.club_name ILIKE '%Suerth%'
   OR at.club_name ILIKE '%Sürth%'
   OR at.club_name ILIKE '%Suerth%'
ORDER BY m.match_date DESC;

-- ====================================
-- 3️⃣ FINDE DAS 5:1 MATCH (via match_results)
-- ====================================

SELECT 
  '3️⃣ MATCHES MIT 5:1 ERGEBNIS' as step,
  m.id as matchday_id,
  m.match_date,
  ht.club_name as home_club,
  at.club_name as away_club,
  COUNT(*) FILTER (WHERE mr.winner = 'home') as home_wins,
  COUNT(*) FILTER (WHERE mr.winner = 'guest') as guest_wins,
  COUNT(*) FILTER (WHERE mr.winner = 'away') as away_wins_FALSCH,
  m.home_score as db_home_score,
  m.away_score as db_away_score,
  CASE
    WHEN ht.club_name ILIKE '%Sürth%' OR ht.club_name ILIKE '%Suerth%' THEN 'HOME'
    WHEN at.club_name ILIKE '%Sürth%' OR at.club_name ILIKE '%Suerth%' THEN 'AWAY'
  END as suerth_perspective
FROM matchdays m
LEFT JOIN team_info ht ON ht.id = m.home_team_id
LEFT JOIN team_info at ON at.id = m.away_team_id
LEFT JOIN match_results mr ON mr.matchday_id = m.id
WHERE (ht.club_name ILIKE '%Sürth%' OR ht.club_name ILIKE '%Suerth%'
    OR at.club_name ILIKE '%Sürth%' OR at.club_name ILIKE '%Suerth%')
  AND m.id IN (
    SELECT matchday_id 
    FROM match_results 
    GROUP BY matchday_id 
    HAVING COUNT(*) = 6  -- Standard Winter-Match
  )
GROUP BY m.id, m.match_date, ht.club_name, at.club_name, m.home_score, m.away_score
HAVING COUNT(*) FILTER (WHERE mr.winner IN ('home', 'guest', 'away')) = 6
ORDER BY m.match_date DESC;

-- ====================================
-- 4️⃣ DETAILLIERTE ERGEBNISSE DES 5:1 MATCHES
-- ====================================

-- Suche nach dem wahrscheinlichen Match
WITH suerth_match AS (
  SELECT m.id
  FROM matchdays m
  LEFT JOIN team_info ht ON ht.id = m.home_team_id
  LEFT JOIN team_info at ON at.id = m.away_team_id
  WHERE (ht.club_name ILIKE '%Sürth%' OR ht.club_name ILIKE '%Suerth%'
      OR at.club_name ILIKE '%Sürth%' OR at.club_name ILIKE '%Suerth%')
  ORDER BY m.match_date DESC
  LIMIT 1
)
SELECT 
  '4️⃣ DETAILLIERTE ERGEBNISSE' as step,
  mr.*
FROM match_results mr
WHERE mr.matchday_id IN (SELECT id FROM suerth_match)
ORDER BY 
  CASE mr.match_type 
    WHEN 'Einzel' THEN 1 
    WHEN 'Doppel' THEN 2 
  END,
  mr.id;

-- ====================================
-- 5️⃣ PROBLEM-DIAGNOSE
-- ====================================

SELECT 
  '5️⃣ DIAGNOSE' as step,
  'Prüfe ob winner = ''away'' statt ''guest'' verwendet wird' as issue,
  COUNT(*) FILTER (WHERE winner = 'away') as matches_mit_away,
  COUNT(*) FILTER (WHERE winner = 'guest') as matches_mit_guest,
  COUNT(*) FILTER (WHERE winner = 'home') as matches_mit_home
FROM match_results;

