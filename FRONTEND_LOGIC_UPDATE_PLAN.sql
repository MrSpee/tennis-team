-- FRONTEND LOGIC UPDATE PLAN
-- Nach der Datenbank-Migration müssen wir das Frontend anpassen

-- ==========================================
-- NEUE FRONTEND-LOGIK (Konzept)
-- ==========================================

/*
ALTE LOGIK (falsch):
- winner === 'home' = Sieg
- winner === 'guest' = Niederlage

NEUE LOGIK (korrekt):
- team_perspective_result === 'team_wins' = Sieg
- team_perspective_result === 'opponent_wins' = Niederlage

FRONTEND-ÄNDERUNGEN:

1. Results.jsx - calculatePlayerPerspectiveScore():
   VORHER:
   if (isPlayerHome) {
     return { playerScore: rawScore.home, opponentScore: rawScore.guest };
   } else {
     return { playerScore: rawScore.guest, opponentScore: rawScore.home };
   }

   NACHHER:
   // Verwende team_match_results View
   const teamResult = await supabase
     .from('team_match_results')
     .select('team_perspective_result')
     .eq('match_id', matchId)
     .eq('team_id', playerTeamId);

2. Results.jsx - Spieler-Statistiken:
   VORHER:
   const wins = playerMatches.filter(m => {
     const winner = m.winner || calculateMatchWinner(m);
     return winner === 'home';
   }).length;

   NACHHER:
   const wins = playerMatches.filter(m => {
     return m.team_perspective_result === 'team_wins';
   }).length;

3. Neue SQL-Query für Frontend:
   SELECT 
     mr.*,
     m.opponent,
     m.location,
     m.team_id,
     CASE 
       WHEN m.location = 'Home' AND mr.winner = 'home' THEN 'team_wins'
       WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 'team_wins'
       ELSE 'opponent_wins'
     END as team_perspective_result
   FROM match_results mr
   JOIN matches m ON mr.match_id = m.id
   WHERE m.team_id = $playerTeamId;
*/

-- ==========================================
-- TEST-QUERIES FÜR FRONTEND
-- ==========================================

-- Test 1: Hole alle Ergebnisse für Sürth-Team
SELECT 
  mr.id,
  mr.match_id,
  m.opponent,
  m.location,
  mr.winner,
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 'team_wins'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 'team_wins'
    ELSE 'opponent_wins'
  END as team_perspective_result,
  CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN '🏆 Sürth gewinnt (Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN '🏆 Sürth gewinnt (Auswärts)'
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN '😢 Gegner gewinnt (Sürth Heim)'
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN '😢 Gegner gewinnt (Sürth Auswärts)'
    ELSE '❓ Unbekannt'
  END as display_text
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date DESC;

-- Test 2: Spieler-Statistiken für Robert Ellrich
SELECT 
  p.name,
  COUNT(*) as total_matches,
  COUNT(CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 1
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 1
  END) as wins,
  COUNT(CASE 
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN 1
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN 1
  END) as losses
FROM players p
JOIN match_results mr ON (
  mr.home_player_id = p.id OR 
  mr.home_player1_id = p.id OR 
  mr.home_player2_id = p.id
)
JOIN matches m ON mr.match_id = m.id
JOIN team_info ti ON m.team_id = ti.id
WHERE p.name = 'Robert Ellrich'
  AND ti.club_name = 'SV Rot-Gelb Sürth'
GROUP BY p.name;

-- Test 3: Medenspiel-Score für Leverkusen-Spiel
SELECT 
  m.opponent,
  m.location,
  COUNT(*) as total_matches,
  COUNT(CASE 
    WHEN m.location = 'Home' AND mr.winner = 'home' THEN 1
    WHEN m.location = 'Away' AND mr.winner = 'guest' THEN 1
  END) as team_wins,
  COUNT(CASE 
    WHEN m.location = 'Home' AND mr.winner = 'guest' THEN 1
    WHEN m.location = 'Away' AND mr.winner = 'home' THEN 1
  END) as opponent_wins
FROM matches m
JOIN match_results mr ON m.id = mr.match_id
JOIN team_info ti ON m.team_id = ti.id
WHERE m.opponent = 'TG Leverkusen 2'
  AND ti.club_name = 'SV Rot-Gelb Sürth'
GROUP BY m.opponent, m.location;
