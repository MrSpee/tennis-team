-- ==========================================
-- EINFACHE RANKINGS-STRUKTUR ANALYSE
-- ==========================================
-- Für Supabase SQL Editor ausführbar

-- ==========================================
-- 1. WICHTIGSTE TABELLEN STRUKTUR
-- ==========================================

-- 1.1 players_unified Spalten prüfen
SELECT 
    'players_unified' as tabelle,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'players_unified'
ORDER BY ordinal_position;

-- 1.2 team_info Spalten (WICHTIG: club_id prüfen!)
SELECT 
    'team_info' as tabelle,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_info'
ORDER BY ordinal_position;

-- 1.3 team_memberships Spalten
SELECT 
    'team_memberships' as tabelle,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_memberships'
ORDER BY ordinal_position;

-- 1.4 WICHTIG: KEINE season_improvement Spalte!
-- Wir müssen es aus current_lk - season_start_lk berechnen
SELECT 
    'players_unified LK-Felder' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'players_unified' 
AND (column_name LIKE '%lk%' OR column_name LIKE '%improvement%' OR column_name LIKE '%ranking%')
ORDER BY column_name;

-- Zeige Beispieldaten mit allen LK-Feldern
SELECT 
    name,
    current_lk,
    season_start_lk,
    ranking,
    points,
    -- MANUELLE BERECHNUNG: improvement = season_start - current (negativ = besser!)
    CASE 
        WHEN current_lk IS NOT NULL AND season_start_lk IS NOT NULL 
        THEN (
            CAST(REPLACE(season_start_lk, 'LK ', '') AS NUMERIC) - 
            CAST(REPLACE(current_lk, 'LK ', '') AS NUMERIC)
        )
        ELSE NULL
    END as manuelle_improvement
FROM players_unified
WHERE is_active = true
LIMIT 10;

-- ==========================================
-- 2. EXISTIERT CLUB_ID?
-- ==========================================

SELECT 
    'club_id existiert in team_info?' as frage,
    CASE WHEN COUNT(*) > 0 THEN '✅ JA' ELSE '❌ NEIN' END as antwort
FROM information_schema.columns
WHERE table_name = 'team_info' AND column_name = 'club_id';

-- Zeige alle club_name Werte
SELECT DISTINCT club_name FROM team_info WHERE club_name IS NOT NULL;

-- ==========================================
-- 3. VEREIN-MANNSCHAFT-HIERARCHIE
-- ==========================================

-- Vereine mit Anzahl Mannschaften (MIT club_id!)
SELECT 
    ti.club_name as verein,
    ti.club_id,
    COUNT(*) as mannschaften,
    STRING_AGG(ti.team_name || ' (' || ti.category || ')', ' | ' ORDER BY ti.team_name) as teams,
    SUM((SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = ti.id AND tm.is_active = true)) as gesamt_spieler
FROM team_info ti
WHERE ti.club_name IS NOT NULL
GROUP BY ti.club_name, ti.club_id
ORDER BY ti.club_name;

-- Detaillierte Mannschafts-Übersicht (MIT club_id!)
SELECT 
    club_name as verein,
    club_id,
    team_name as mannschaft,
    category,
    id as team_id,
    (SELECT COUNT(*) 
     FROM team_memberships tm 
     WHERE tm.team_id = team_info.id 
     AND tm.is_active = true) as spieler
FROM team_info
ORDER BY club_name, team_name;

-- ==========================================
-- 4. SPIELER-TEAM-ZUORDNUNG
-- ==========================================

-- Spieler in mehreren Teams
SELECT 
    pu.name,
    COUNT(DISTINCT tm.team_id) as teams,
    STRING_AGG(DISTINCT ti.club_name, ', ' ORDER BY ti.club_name) as vereine,
    STRING_AGG(DISTINCT ti.team_name, ', ' ORDER BY ti.team_name) as mannschaften
FROM players_unified pu
JOIN team_memberships tm ON pu.id = tm.player_id
JOIN team_info ti ON tm.team_id = ti.id
WHERE tm.is_active = true
GROUP BY pu.id, pu.name
HAVING COUNT(DISTINCT tm.team_id) > 1
ORDER BY teams DESC, pu.name;

-- ==========================================
-- 5. MATCH-DATEN
-- ==========================================

-- Matches pro Team
SELECT 
    ti.club_name,
    ti.team_name,
    ti.category,
    COUNT(m.id) as matches,
    COUNT(CASE WHEN m.season = 'Winter 2025/26' THEN 1 END) as winter_2526,
    COUNT(CASE WHEN m.season = 'winter_25_26' THEN 1 END) as winter_alt
FROM team_info ti
LEFT JOIN matches m ON ti.id = m.team_id
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category
ORDER BY ti.club_name, matches DESC;

-- ==========================================
-- 6. SEASON-WERTE
-- ==========================================

-- Welche season Werte gibt es?
SELECT 'matches' as quelle, season, COUNT(*) as anzahl
FROM matches
GROUP BY season
UNION ALL
SELECT 'team_seasons' as quelle, season, COUNT(*) as anzahl
FROM team_seasons
GROUP BY season
ORDER BY quelle, season;

-- ==========================================
-- 7. MATCH-ERGEBNISSE (SIEVIER!)
-- ==========================================

-- Beispiel: Siege/Niederlagen für Top 10 Spieler
SELECT 
    pu.name,
    pu.current_lk,
    pu.season_start_lk,
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
GROUP BY pu.id, pu.name, pu.current_lk, pu.season_start_lk
HAVING COUNT(mr.id) > 0
ORDER BY siege DESC, pu.name
LIMIT 20;

-- ==========================================
-- 8. ZUSAMMENFASSUNG
-- ==========================================

SELECT 
    'Datenanzahl' as typ,
    'Spieler (aktiv)' as kategorie,
    COUNT(*) as anzahl
FROM players_unified WHERE is_active = true
UNION ALL
SELECT 'Datenanzahl', 'Teams', COUNT(*) FROM team_info
UNION ALL
SELECT 'Datenanzahl', 'Team Memberships (aktiv)', COUNT(*) FROM team_memberships WHERE is_active = true
UNION ALL
SELECT 'Datenanzahl', 'Matches', COUNT(*) FROM matches
UNION ALL
SELECT 'Datenanzahl', 'Match Results', COUNT(*) FROM match_results
ORDER BY typ, kategorie;

