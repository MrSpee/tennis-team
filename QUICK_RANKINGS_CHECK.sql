-- ==========================================
-- QUICK RANKINGS CHECK (nur das Wesentliche!)
-- ==========================================

-- 1. VEREINE MIT CLUB_ID
SELECT 
    club_name as verein,
    club_id,
    COUNT(*) as mannschaften
FROM team_info
WHERE club_name IS NOT NULL
GROUP BY club_name, club_id
ORDER BY club_name;

-- 2. MANNSCHAFTEN PRO VEREIN
SELECT 
    club_name,
    club_id,
    team_name,
    category,
    id as team_id
FROM team_info
ORDER BY club_name, team_name;

-- 3. SPIELER IN MEHREREN VEREINEN/TEAMS?
SELECT 
    pu.name,
    COUNT(DISTINCT tm.team_id) as teams,
    COUNT(DISTINCT ti.club_id) as vereine,
    STRING_AGG(DISTINCT ti.club_name, ', ') as vereins_liste
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
GROUP BY pu.id, pu.name
HAVING COUNT(DISTINCT tm.team_id) > 1
ORDER BY teams DESC, pu.name;

-- 4. MATCH-ERGEBNISSE TOP 10
SELECT 
    pu.name,
    pu.current_lk,
    pu.season_start_lk,
    COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as siege,
    COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as niederlagen
FROM players_unified pu
LEFT JOIN match_results mr ON (
    mr.home_player_id = pu.id OR 
    mr.home_player1_id = pu.id OR 
    mr.home_player2_id = pu.id
)
GROUP BY pu.id, pu.name, pu.current_lk, pu.season_start_lk
HAVING COUNT(mr.id) > 0
ORDER BY siege DESC
LIMIT 10;

