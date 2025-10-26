-- MULTI-TEAM DATABASE MIGRATION
-- Ziel: Jeder Verein sieht Daten aus seiner Perspektive

-- ==========================================
-- SCHRITT 1: MATCHES TABELLE KORRIGIEREN
-- ==========================================

-- Problem: matches.team_id ist nicht korrekt zugeordnet
-- Lösung: team_id basierend auf location und opponent zuordnen

-- 1.1: Schaue dir die aktuellen Matches an
SELECT 
  m.id,
  m.opponent,
  m.location,
  m.team_id as current_team_id,
  ti.club_name,
  ti.team_name,
  CASE 
    WHEN m.location = 'Home' THEN 'Sürth spielt Heim'
    WHEN m.location = 'Away' THEN 'Sürth spielt Auswärts'
    ELSE 'Unbekannt'
  END as sürth_perspective
FROM matches m
LEFT JOIN team_info ti ON m.team_id = ti.id
ORDER BY m.match_date DESC;

-- 1.2: Korrigiere team_id für Sürth-Matches
-- Alle Matches gehören zu SV Rot-Gelb Sürth (team_id aus team_info)
UPDATE matches 
SET team_id = (
  SELECT id FROM team_info 
  WHERE club_name = 'SV Rot-Gelb Sürth' 
  LIMIT 1
)
WHERE team_id IS NULL 
   OR team_id NOT IN (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth');

-- 1.3: Bestätige die Korrektur
SELECT 
  'NACHHER:' as status,
  m.id,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE m.opponent = 'TG Leverkusen 2';

-- ==========================================
-- SCHRITT 2: MATCH_RESULTS PERSPEKTIVE FIXEN
-- ==========================================

-- Problem: winner ist absolut gespeichert, nicht relativ zum Team
-- Lösung: Neue Logik für relative Perspektive

-- 2.1: Schaue dir die aktuellen match_results an
SELECT 
  mr.id,
  mr.match_id,
  mr.winner as absolute_winner,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 'Sürth gewinnt (Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 'Sürth gewinnt (Auswärts)'
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN 'Gegner gewinnt (Sürth Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN 'Gegner gewinnt (Sürth Auswärts)'
    ELSE 'Unbekannt'
  END as sürth_perspective
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
JOIN team_info ti ON m.team_id = ti.id
WHERE m.opponent = 'TG Leverkusen 2';

-- 2.2: Korrigiere die Winner-Einträge basierend auf der Sürth-Perspektive
-- Für das Leverkusen-Spiel: Sürth hat gewonnen (Auswärts)
UPDATE match_results 
SET winner = 'guest'  -- Sürth spielt Auswärts, also guest = Sürth
WHERE match_id IN (
  SELECT id FROM matches 
  WHERE opponent = 'TG Leverkusen 2'
);

-- 2.3: Bestätige die Korrektur
SELECT 
  'KORRIGIERT:' as status,
  mr.id,
  mr.match_id,
  mr.winner,
  m.opponent,
  m.location,
  CASE 
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN '✅ Sürth gewinnt (Auswärts)'
    ELSE '❌ Noch falsch'
  END as sürth_perspective
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
WHERE m.opponent = 'TG Leverkusen 2';

-- ==========================================
-- SCHRITT 3: NEUE MULTI-TEAM LOGIK
-- ==========================================

-- 3.1: Erstelle eine View für Team-spezifische Perspektive
CREATE OR REPLACE VIEW team_match_results AS
SELECT 
  mr.*,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name,
  -- Berechne Winner aus Team-Perspektive
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 'team_wins'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 'team_wins'
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN 'opponent_wins'
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN 'opponent_wins'
    ELSE 'unknown'
  END as team_perspective_result
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
JOIN team_info ti ON m.team_id = ti.id;

-- 3.2: Teste die neue View
SELECT 
  match_id,
  opponent,
  location,
  club_name,
  team_name,
  winner as absolute_winner,
  team_perspective_result,
  CASE 
    WHEN team_perspective_result = 'team_wins' THEN '🏆 Team gewinnt'
    WHEN team_perspective_result = 'opponent_wins' THEN '😢 Gegner gewinnt'
    ELSE '❓ Unbekannt'
  END as result_display
FROM team_match_results
WHERE opponent = 'TG Leverkusen 2';

-- ==========================================
-- SCHRITT 4: VALIDIERUNG
-- ==========================================

-- 4.1: Prüfe alle Matches auf Konsistenz
SELECT 
  m.opponent,
  m.location,
  COUNT(*) as total_matches,
  COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as home_wins,
  COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as guest_wins,
  COUNT(CASE WHEN team_perspective_result = 'team_wins' THEN 1 END) as team_wins,
  COUNT(CASE WHEN team_perspective_result = 'opponent_wins' THEN 1 END) as opponent_wins
FROM matches m
JOIN team_match_results mr ON m.id = mr.match_id
GROUP BY m.opponent, m.location
ORDER BY m.opponent;

-- 4.2: Finale Bestätigung für Leverkusen-Spiel
SELECT 
  'FINAL CHECK:' as status,
  m.opponent,
  m.location,
  mr.winner,
  team_perspective_result,
  CASE 
    WHEN team_perspective_result = 'team_wins' THEN '✅ Sürth gewinnt das Spiel'
    ELSE '❌ Sürth verliert das Spiel'
  END as final_result
FROM matches m
JOIN team_match_results mr ON m.id = mr.match_id
WHERE m.opponent = 'TG Leverkusen 2';
