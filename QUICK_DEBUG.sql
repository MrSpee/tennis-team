-- ==========================================
-- QUICK DEBUG: Warum sind die Daten falsch?
-- ==========================================

-- HYPOTHESE 1: Winner-Feld ist leer?
SELECT 
    'Winner-Feld Status' as check_type,
    COUNT(*) as total_results,
    COUNT(CASE WHEN winner IS NULL THEN 1 END) as ohne_winner,
    COUNT(CASE WHEN winner IS NOT NULL THEN 1 END) as mit_winner
FROM match_results;

-- HYPOTHESE 2: Nur 6 von 8 Matches haben Ergebnisse?
SELECT 
    'Match vs Results' as check_type,
    (SELECT COUNT(*) FROM matches) as total_matches,
    (SELECT COUNT(*) FROM match_results) as total_results,
    (SELECT COUNT(*) FROM matches) - (SELECT COUNT(DISTINCT match_id) FROM match_results) as matches_ohne_result;

-- HYPOTHESE 3: Adrian's tatsächliche Daten
SELECT 
    'Adrian Check' as spieler,
    m.opponent,
    m.match_date,
    mr.match_type,
    mr.winner,
    CASE 
        WHEN mr.winner = 'home' THEN 'Sieg'
        WHEN mr.winner = 'guest' THEN 'Niederlage'
        ELSE 'Kein Ergebnis'
    END as ergebnis
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE mr.home_player_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
   OR mr.home_player1_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
   OR mr.home_player2_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
ORDER BY m.match_date DESC;

