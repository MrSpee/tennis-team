-- ==========================================
-- DEBUG: MATCH-ERGEBNISSE ANALYSIEREN
-- ==========================================
-- Finde heraus, warum die Statistiken falsch sind!

-- 1. ALLE Match Results anzeigen
SELECT 
    mr.id,
    mr.match_id,
    mr.match_type,
    mr.winner,
    mr.home_player_id,
    mr.home_player1_id,
    mr.home_player2_id,
    m.opponent,
    m.match_date,
    m.season,
    ti.team_name
FROM match_results mr
LEFT JOIN matches m ON mr.match_id = m.id
LEFT JOIN team_info ti ON m.team_id = ti.id
ORDER BY m.match_date DESC;

-- 2. Matches pro Spieler (DETAILIERT)
SELECT 
    pu.name as spieler,
    m.opponent,
    m.match_date,
    mr.match_type,
    mr.winner,
    -- Beteiligt?
    CASE 
        WHEN mr.home_player_id = pu.id THEN '✅ Einzel Heim'
        WHEN mr.home_player1_id = pu.id THEN '✅ Doppel Heim Player 1'
        WHEN mr.home_player2_id = pu.id THEN '✅ Doppel Heim Player 2'
        ELSE '❌ Nicht beteiligt'
    END as rolle,
    -- Sieg/Verlust?
    CASE 
        WHEN mr.winner = 'home' AND (
            mr.home_player_id = pu.id OR 
            mr.home_player1_id = pu.id OR 
            mr.home_player2_id = pu.id
        ) THEN '🎉 SIEG'
        WHEN mr.winner = 'guest' AND (
            mr.home_player_id = pu.id OR 
            mr.home_player1_id = pu.id OR 
            mr.home_player2_id = pu.id
        ) THEN '😞 Niederlage'
        WHEN mr.winner IS NULL THEN '⏳ Kein Ergebnis'
        ELSE '❓ Unklar'
    END as ergebnis
FROM players_unified pu
JOIN match_results mr ON (
    mr.home_player_id = pu.id OR 
    mr.home_player1_id = pu.id OR 
    mr.home_player2_id = pu.id
)
JOIN matches m ON mr.match_id = m.id
LEFT JOIN team_info ti ON m.team_id = ti.id
WHERE pu.name IN ('Adrian Tugui', 'Robert Ellrich', 'Frank Ritter')
ORDER BY pu.name, m.match_date DESC;

-- 3. ADRIAN: Alle Matches im Detail
SELECT 
    'Adrian Tugui' as spieler,
    m.opponent,
    m.match_date,
    mr.match_type,
    mr.winner,
    mr.set1_home,
    mr.set1_guest,
    mr.set2_home,
    mr.set2_guest,
    mr.set3_home,
    mr.set3_guest,
    CASE 
        WHEN mr.home_player_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui') THEN 'Einzel'
        WHEN mr.home_player1_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui') THEN 'Doppel Player 1'
        WHEN mr.home_player2_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui') THEN 'Doppel Player 2'
        ELSE 'Fehler'
    END as adrian_rolle,
    CASE 
        WHEN mr.winner = 'home' THEN '🎉 SIEG'
        WHEN mr.winner = 'guest' THEN '😞 Niederlage'
        ELSE '⏳ Kein Ergebnis'
    END as ergebnis
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE mr.home_player_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
   OR mr.home_player1_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
   OR mr.home_player2_id = (SELECT id FROM players_unified WHERE name = 'Adrian Tugui')
ORDER BY m.match_date DESC;

-- 4. PROBLEM IDENTIFIZIEREN: Winner-Feld leer?
SELECT 
    'Winner-Feld Analyse' as typ,
    COUNT(*) as gesamt,
    COUNT(CASE WHEN winner IS NULL THEN 1 END) as ohne_winner,
    COUNT(CASE WHEN winner = 'home' THEN 1 END) as siege_home,
    COUNT(CASE WHEN winner = 'guest' THEN 1 END) as siege_guest,
    ROUND(100.0 * COUNT(CASE WHEN winner IS NULL THEN 1 END) / COUNT(*), 2) as prozent_leer
FROM match_results;

-- 5. SEASON-FILTER PRÜFEN
SELECT 
    season,
    COUNT(*) as matches
FROM matches
GROUP BY season;

