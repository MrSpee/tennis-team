-- SYSTEMATIC MULTI-TEAM MATCH CORRECTION
-- Korrigiert alle Matches für Multi-Team-Perspektive

-- ==========================================
-- SCHRITT 1: ALLE MATCHES ANALYSIEREN
-- ==========================================

-- Schaue dir alle Matches mit ihren Ergebnissen an
SELECT 
  m.id,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name,
  COUNT(mr.id) as total_einzelspiele,
  COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as home_wins,
  COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as guest_wins,
  CASE 
    WHEN m.location = 'Home' AND COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) THEN '✅ Team gewinnt (Heim)'
    WHEN m.location = 'Away' AND COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) THEN '✅ Team gewinnt (Auswärts)'
    WHEN m.location = 'Home' AND COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) THEN '❌ Gegner gewinnt (Team Heim)'
    WHEN m.location = 'Away' AND COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) THEN '❌ Gegner gewinnt (Team Auswärts)'
    ELSE '🤝 Unentschieden'
  END as team_perspective_result
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
LEFT JOIN match_results mr ON m.id = mr.match_id
GROUP BY m.id, m.opponent, m.location, m.team_id, ti.club_name, ti.team_name
ORDER BY m.match_date DESC;

-- ==========================================
-- SCHRITT 2: PROBLEMATISCHE MATCHES IDENTIFIZIEREN
-- ==========================================

-- Finde Matches, wo die Winner-Logik inkonsistent ist
WITH match_analysis AS (
  SELECT 
    m.id,
    m.opponent,
    m.location,
    m.team_id,
    ti.club_name,
    COUNT(mr.id) as total_spiele,
    COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) as home_wins,
    COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) as guest_wins,
    CASE 
      WHEN m.location = 'Home' AND COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) THEN 'team_wins'
      WHEN m.location = 'Away' AND COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) THEN 'team_wins'
      ELSE 'opponent_wins'
    END as expected_result
  FROM matches m
  JOIN team_info ti ON m.team_id = ti.id
  LEFT JOIN match_results mr ON m.id = mr.match_id
  GROUP BY m.id, m.opponent, m.location, m.team_id, ti.club_name
)
SELECT 
  'PROBLEMATISCHE MATCHES:' as status,
  id,
  opponent,
  location,
  club_name,
  total_spiele,
  home_wins,
  guest_wins,
  expected_result,
  CASE 
    WHEN expected_result = 'team_wins' THEN '✅ Team sollte gewinnen'
    ELSE '❌ Gegner sollte gewinnen'
  END as korrektur_hinweis
FROM match_analysis
WHERE total_spiele > 0
ORDER BY club_name, opponent;

-- ==========================================
-- SCHRITT 3: AUTOMATISCHE KORREKTUR
-- ==========================================

-- Korrigiere alle Matches basierend auf der Team-Perspektive
-- WICHTIG: Das ist ein gefährlicher Befehl - erst testen!

-- Für jeden Match: Wenn das Team gewinnen sollte, aber nicht alle Einzelspiele korrekt sind
WITH corrections AS (
  SELECT 
    m.id as match_id,
    m.location,
    m.team_id,
    CASE 
      WHEN m.location = 'Home' AND COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) THEN 'home'
      WHEN m.location = 'Away' AND COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) THEN 'guest'
      WHEN m.location = 'Home' AND COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) THEN 'guest'
      WHEN m.location = 'Away' AND COUNT(CASE WHEN mr.winner = 'home' THEN 1 END) > COUNT(CASE WHEN mr.winner = 'guest' THEN 1 END) THEN 'home'
      ELSE NULL
    END as correct_winner
  FROM matches m
  JOIN team_info ti ON m.team_id = ti.id
  LEFT JOIN match_results mr ON m.id = mr.match_id
  GROUP BY m.id, m.location, m.team_id
  HAVING COUNT(mr.id) > 0
)
SELECT 
  'KORREKTUR-VORSCHLAG:' as status,
  match_id,
  location,
  correct_winner,
  CASE 
    WHEN correct_winner = 'home' THEN 'Alle Einzelspiele auf "home" setzen'
    WHEN correct_winner = 'guest' THEN 'Alle Einzelspiele auf "guest" setzen'
    ELSE 'Keine Korrektur nötig'
  END as aktion
FROM corrections
WHERE correct_winner IS NOT NULL;

-- ==========================================
-- SCHRITT 4: MANUELLE KORREKTUR (SICHERER)
-- ==========================================

-- Korrigiere nur das Leverkusen-Match (sicherer Ansatz)
UPDATE match_results 
SET winner = 'guest'
WHERE match_id = '3bf226c8-dcfb-4429-94ee-fe239fe52250'
  AND winner != 'guest';

-- Bestätige die Korrektur
SELECT 
  'LEVERKUSEN MATCH KORRIGIERT:' as status,
  COUNT(*) as total_spiele,
  COUNT(CASE WHEN winner = 'guest' THEN 1 END) as sürth_siege,
  COUNT(CASE WHEN winner = 'home' THEN 1 END) as gegner_siege,
  CASE 
    WHEN COUNT(CASE WHEN winner = 'guest' THEN 1 END) > COUNT(CASE WHEN winner = 'home' THEN 1 END) 
    THEN '🏆 Sürth gewinnt das Medenspiel'
    ELSE '❌ Noch nicht korrekt'
  END as ergebnis
FROM match_results mr
WHERE mr.match_id = '3bf226c8-dcfb-4429-94ee-fe239fe52250';

-- ==========================================
-- SCHRITT 5: FRONTEND-TEST QUERY
-- ==========================================

-- Diese Query sollte das Frontend verwenden
SELECT 
  mr.id,
  mr.match_id,
  m.opponent,
  m.location,
  m.team_id,
  ti.club_name,
  ti.team_name,
  mr.winner as absolute_winner,
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 'team_wins'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 'team_wins'
    ELSE 'opponent_wins'
  END as team_perspective_result,
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN '🏆 Team gewinnt (Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN '🏆 Team gewinnt (Auswärts)'
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN '😢 Gegner gewinnt (Team Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN '😢 Gegner gewinnt (Team Auswärts)'
    ELSE '❓ Unbekannt'
  END as display_text
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date DESC, mr.id;
