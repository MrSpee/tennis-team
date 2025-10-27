-- ==========================================
-- RANKINGS DATENBANK-STRUKTUR ANALYSE
-- ==========================================
-- Dieses Script analysiert die komplette Struktur für die Rankings-Refactoring

\echo '🔍 STARTE DATENBANK-ANALYSE...'
\echo ''

-- ==========================================
-- 1. KERN-TABELLEN STRUKTUR
-- ==========================================

\echo '📋 1. KERN-TABELLEN STRUKTUR'
\echo ''

-- 1.1 players_unified Struktur
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📊 players_unified Struktur                          │'
\echo '└─────────────────────────────────────────────────────┘'
\d players_unified

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'players_unified'
ORDER BY ordinal_position;

-- Beispieldaten anzeigen
SELECT 
    id,
    name,
    current_lk,
    season_start_lk,
    season_improvement,
    last_lk_update,
    is_active,
    player_type
FROM players_unified
LIMIT 5;

\echo ''
\echo ''

-- 1.2 team_info Struktur (WICHTIG: club_id!)
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 🏢 team_info Struktur (MIT club_id!)                 │'
\echo '└─────────────────────────────────────────────────────┘'
\d team_info

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;

-- Existiert club_id Feld?
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'team_info' 
AND column_name = 'club_id';

\echo ''
\echo '✅ CLUB_ID EXISTS:', 
(SELECT COUNT(*) FROM information_schema.columns 
 WHERE table_name = 'team_info' AND column_name = 'club_id');

-- Zeige alle Vereine (clubs) durch team_info.club_name
SELECT 
    DISTINCT club_name,
    club_id
FROM team_info
ORDER BY club_name;

-- Zeige Teams pro Verein
SELECT 
    club_name,
    team_name,
    category,
    id as team_id
FROM team_info
ORDER BY club_name, team_name;

\echo ''
\echo ''

-- 1.3 team_memberships Struktur (Spieler-Team-Zuordnung)
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 👥 team_memberships Struktur                        │'
\echo '└─────────────────────────────────────────────────────┘'
\d team_memberships

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'team_memberships'
ORDER BY ordinal_position;

-- Zeige Beispieldaten: Welche Spieler sind in welchen Teams?
SELECT 
    tm.player_id,
    tm.team_id,
    tm.role,
    tm.is_primary,
    tm.is_active,
    pu.name as player_name,
    ti.club_name,
    ti.team_name,
    ti.category
FROM team_memberships tm
LEFT JOIN players_unified pu ON tm.player_id = pu.id
LEFT JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
LIMIT 20
ORDER BY ti.club_name, ti.team_name;

\echo ''
\echo ''

-- 1.4 matches Struktur
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 🎾 matches Struktur                                  │'
\echo '└─────────────────────────────────────────────────────┘'
\d matches

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- Existiert team_id in matches?
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'matches' 
AND column_name = 'team_id';

-- Zeige Beispiel-Matches mit Team-Info
SELECT 
    m.id,
    m.team_id,
    m.match_date,
    m.opponent,
    m.season,
    ti.club_name,
    ti.team_name,
    ti.category
FROM matches m
LEFT JOIN team_info ti ON m.team_id = ti.id
ORDER BY m.match_date DESC
LIMIT 10;

\echo ''
\echo ''

-- 1.5 match_results Struktur
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📈 match_results Struktur                           │'
\echo '└─────────────────────────────────────────────────────┘'
\d match_results

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'match_results'
ORDER BY ordinal_position;

-- Zeige Beispiel-Ergebnisse
SELECT 
    mr.id,
    mr.match_id,
    mr.match_type,
    mr.winner,
    mr.set1_home,
    mr.set1_guest,
    -- Spieler-IDs
    mr.home_player_id,
    mr.home_player1_id,
    mr.home_player2_id,
    mr.guest_player_id,
    mr.guest_player1_id,
    mr.guest_player2_id
FROM match_results mr
LIMIT 10;

\echo ''
\echo ''

-- 1.6 team_seasons Struktur (FÜR AKTUELLE SAISON!)
\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📅 team_seasons Struktur                            │'
\echo '└─────────────────────────────────────────────────────┘'
\d team_seasons

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_seasons'
ORDER BY ordinal_position;

-- Zeige aktuell aktive Seasons
SELECT 
    ts.team_id,
    ts.season,
    ts.is_active,
    ti.club_name,
    ti.team_name
FROM team_seasons ts
LEFT JOIN team_info ti ON ts.team_id = ti.id
WHERE ts.is_active = true
ORDER BY ti.club_name, ts.season;

\echo ''
\echo ''

-- ==========================================
-- 2. RELATIONEN ANALYSIEREN
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 🔗 RELATIONEN ANALYSE                               │'
\echo '└─────────────────────────────────────────────────────┘'

-- 2.1 Foreign Keys prüfen
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name IN ('players_unified', 'team_info', 'team_memberships', 'matches', 'match_results', 'team_seasons'))
ORDER BY tc.table_name;

\echo ''
\echo ''

-- ==========================================
-- 3. VEREIN-MANNSCHAFT-HIERARCHIE
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 🏢 VEREIN-MANNSCHAFT-HIERARCHIE                     │'
\echo '└─────────────────────────────────────────────────────┘'

-- 3.1 Alle Vereine (Unique club_name)
SELECT 
    'Vereine' as type,
    DISTINCT ON (club_name)
    club_name,
    club_id
FROM team_info
WHERE club_name IS NOT NULL
ORDER BY club_name;

-- 3.2 Mannschaften pro Verein
SELECT 
    club_name as verein,
    COUNT(DISTINCT id) as anzahl_mannschaften,
    STRING_AGG(team_name || ' (' || category || ')', ', ' ORDER BY team_name) as mannschaften
FROM team_info
WHERE club_name IS NOT NULL
GROUP BY club_name
ORDER BY club_name;

\echo ''
\echo ''

-- 3.3 Detaillierte Mannschafts-Liste
SELECT 
    club_name as verein,
    team_name as mannschaft,
    category,
    id as team_id,
    (SELECT COUNT(*) FROM team_memberships tm 
     WHERE tm.team_id = ti.id AND tm.is_active = true) as spieler_anzahl
FROM team_info ti
ORDER BY club_name, team_name, category;

\echo ''
\echo ''

-- ==========================================
-- 4. SPIELER-TEAM-ZUORDNUNG
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 👥 SPIELER IN MEHREREN VEREINEN/TEAMS?               │'
\echo '└─────────────────────────────────────────────────────┘'

-- 4.1 Spieler in mehreren Teams
SELECT 
    pu.name,
    pu.id as player_id,
    COUNT(DISTINCT tm.team_id) as teams_anzahl,
    STRING_AGG(DISTINCT ti.club_name, ', ') as vereine,
    STRING_AGG(DISTINCT ti.team_name || ' (' || ti.category || ')', ', ') as mannschaften
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
GROUP BY pu.id, pu.name
HAVING COUNT(DISTINCT tm.team_id) > 1
ORDER BY teams_anzahl DESC, pu.name;

-- 4.2 Spieler in mehreren Vereinen
SELECT 
    pu.name,
    pu.id as player_id,
    COUNT(DISTINCT ti.club_name) as vereine_anzahl,
    STRING_AGG(DISTINCT ti.club_name, ', ') as vereine
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
GROUP BY pu.id, pu.name
HAVING COUNT(DISTINCT ti.club_name) > 1
ORDER BY vereine_anzahl DESC, pu.name;

\echo ''
\echo ''

-- ==========================================
-- 5. MATCH-DATEN ANALYSIEREN
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 🎾 MATCH-DATEN ANALYSE                              │'
\echo '└─────────────────────────────────────────────────────┘'

-- 5.1 Wie viele Matches pro Team?
SELECT 
    ti.club_name,
    ti.team_name,
    COUNT(m.id) as matches_anzahl
FROM team_info ti
LEFT JOIN matches m ON ti.id = m.team_id
GROUP BY ti.id, ti.club_name, ti.team_name
ORDER BY ti.club_name, matches_anzahl DESC;

-- 5.2 Wie viele match_results mit winner-Feld gefüllt?
SELECT 
    'Gesamt Ergebnisse' as typ,
    COUNT(*) as anzahl,
    COUNT(CASE WHEN winner IS NOT NULL THEN 1 END) as mit_winner,
    ROUND(100.0 * COUNT(CASE WHEN winner IS NOT NULL THEN 1 END) / COUNT(*), 2) as prozent
FROM match_results;

-- 5.3 Match-Ergebnisse pro Spieler (SIEVIER-ZAHLEN!)
SELECT 
    pu.name,
    COUNT(CASE 
        WHEN mr.winner = 'home' AND (
            mr.home_player_id = pu.id OR 
            mr.home_player1_id = pu.id OR 
            mr.home_player2_id = pu.id
        ) THEN 1 
    END) as siege,
    COUNT(CASE 
        WHEN mr.winner = 'guest' AND (
            mr.home_player_id = pu.id OR 
            mr.home_player1_id = pu.id OR 
            mr.home_player2_id = pu.id
        ) THEN 1 
    END) as niederlagen
FROM players_unified pu
LEFT JOIN match_results mr ON (
    mr.home_player_id = pu.id OR 
    mr.home_player1_id = pu.id OR 
    mr.home_player2_id = pu.id
)
GROUP BY pu.id, pu.name
ORDER BY siege DESC, pu.name
LIMIT 20;

\echo ''
\echo ''

-- ==========================================
-- 6. SEASON-LOGIK PRÜFEN
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📅 SEASON-WERTE IN DER DB                          │'
\echo '└─────────────────────────────────────────────────────┘'

-- 6.1 Welche season-Werte existieren in matches?
SELECT 
    season,
    COUNT(*) as anzahl
FROM matches
GROUP BY season
ORDER BY season;

-- 6.2 Welche season-Werte in team_seasons?
SELECT 
    season,
    COUNT(*) as anzahl
FROM team_seasons
GROUP BY season
ORDER BY season;

-- 6.3 Vergleich: matches.season vs team_seasons.season
SELECT 
    'Aktuelle Matches' as typ,
    DISTINCT season
FROM matches
UNION
SELECT 
    'Team Seasons' as typ,
    DISTINCT season
FROM team_seasons
ORDER BY season;

\echo ''
\echo ''

-- ==========================================
-- 7. LK-DATEN ANALYSIEREN
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📊 LK-DATEN ANALYSE                                  │'
\echo '└─────────────────────────────────────────────────────┘'

-- 7.1 Spieler mit current_lk und season_improvement
SELECT 
    name,
    current_lk,
    season_start_lk,
    season_improvement,
    last_lk_update
FROM players_unified
WHERE current_lk IS NOT NULL
ORDER BY 
    CASE 
        WHEN season_improvement IS NOT NULL THEN season_improvement 
        ELSE 999 
    END
LIMIT 20;

-- 7.2 Spieler ohne LK-Update
SELECT 
    name,
    current_lk,
    last_lk_update,
    CURRENT_TIMESTAMP - last_lk_update as time_since_update
FROM players_unified
WHERE current_lk IS NOT NULL
ORDER BY last_lk_update ASC NULLS LAST
LIMIT 10;

\echo ''
\echo ''

-- ==========================================
-- 8. ZUSAMMENFASSUNG
-- ==========================================

\echo '┌─────────────────────────────────────────────────────┐'
\echo '│ 📋 ZUSAMMENFASSUNG                                  │'
\echo '└─────────────────────────────────────────────────────┘'

SELECT 
    'Tabellen Übersicht' as typ,
    'players_unified' as tabelle,
    COUNT(*) as anzahl
FROM players_unified
WHERE is_active = true
UNION ALL
SELECT 'Tabellen Übersicht', 'team_info', COUNT(*) FROM team_info
UNION ALL
SELECT 'Tabellen Übersicht', 'team_memberships', COUNT(*) FROM team_memberships WHERE is_active = true
UNION ALL
SELECT 'Tabellen Übersicht', 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'Tabellen Übersicht', 'match_results', COUNT(*) FROM match_results
UNION ALL
SELECT 'Tabellen Übersicht', 'team_seasons', COUNT(*) FROM team_seasons WHERE is_active = true;

\echo ''
\echo '✅ ANALYSE ABGESCHLOSSEN!'
\echo ''
\echo '🔍 WICHTIGE FINDINGS FÜR RANKINGS:'
\echo ''
\echo '1. VEREINE: Gruppiert nach club_name'
\echo '2. MANNSCHAFTEN: Eindeutig identifiziert durch team_info (id, team_name, category)'
\echo '3. ZUORDNUNG: team_memberships verbindet Spieler ↔ Team'
\echo '4. MATCHES: Haben team_id → Filter nach Team möglich'
\echo '5. STATS: Siege/Niederlagen müssen aus match_results aggregiert werden'
\echo '6. CLUB_ID: Prüfe ob Feld existiert!'
\echo ''

