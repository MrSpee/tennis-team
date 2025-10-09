-- CHECK_PLAYER_WITHOUT_TEAM.sql
-- Zeige den Spieler ohne Team-Zuordnung
-- ============================================

-- Spieler ohne Team
SELECT 
  p.id as player_id,
  p.user_id,
  p.name as player_name,
  p.email,
  p.phone,
  p.ranking,
  p.is_active,
  p.created_at,
  p.updated_at,
  '❌ KEIN TEAM ZUGEORDNET' as problem,
  CASE 
    WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN '🆕 Neu (< 24h)'
    WHEN p.created_at > NOW() - INTERVAL '7 days' THEN '⚠️ Vor wenigen Tagen erstellt'
    ELSE '⏰ Schon länger ohne Team'
  END as zeitstempel
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
WHERE pt.id IS NULL
ORDER BY p.created_at DESC;

-- Prüfe ob dieser User im auth.users existiert
SELECT 
  p.name as player_name,
  p.email,
  p.user_id,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ User existiert in auth.users'
    ELSE '❌ User FEHLT in auth.users'
  END as auth_status,
  au.email as auth_email,
  au.created_at as auth_created_at,
  au.last_sign_in_at
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE pt.id IS NULL
ORDER BY p.created_at DESC;

-- Überprüfe ob dieser Spieler Matches hat (ohne Team-Zuordnung)
SELECT 
  p.name as player_name,
  COUNT(ma.id) as anzahl_match_availabilities,
  STRING_AGG(DISTINCT m.opponent, ', ') as matches_ohne_team
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
LEFT JOIN match_availability ma ON p.id = ma.player_id
LEFT JOIN matches m ON ma.match_id = m.id
WHERE pt.id IS NULL
GROUP BY p.id, p.name;

-- Überprüfe ob dieser Spieler Trainings hat (ohne Team-Zuordnung)
SELECT 
  p.name as player_name,
  COUNT(ta.id) as anzahl_training_attendances,
  STRING_AGG(DISTINCT ts.title, ', ') as trainings_ohne_team
FROM players p
LEFT JOIN player_teams pt ON p.id = pt.player_id
LEFT JOIN training_attendance ta ON p.id = ta.player_id
LEFT JOIN training_sessions ts ON ta.session_id = ts.id
WHERE pt.id IS NULL
GROUP BY p.id, p.name;

