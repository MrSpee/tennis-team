-- DEBUG: Check Activity Logs vs Players user_id Matching
-- Dieses Script hilft zu verstehen, warum "Unbekannt" angezeigt wird

-- 1. Zeige die ersten 10 Activity Logs mit user_id
SELECT 
    id,
    action,
    user_id,
    created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Zeige alle Players mit user_id
SELECT 
    id,
    user_id,
    name,
    email
FROM players
ORDER BY created_at DESC;

-- 3. Finde Activity Logs OHNE passenden Player
SELECT 
    al.id AS log_id,
    al.action,
    al.user_id AS log_user_id,
    al.created_at,
    p.id AS player_id,
    p.name AS player_name,
    p.user_id AS player_user_id
FROM activity_logs al
LEFT JOIN players p ON al.user_id = p.user_id
WHERE p.id IS NULL
ORDER BY al.created_at DESC
LIMIT 20;

-- 4. Statistik: Wie viele Logs haben keinen zugeordneten Player?
SELECT 
    COUNT(*) AS total_logs,
    COUNT(p.id) AS logs_with_player,
    COUNT(*) - COUNT(p.id) AS logs_without_player
FROM activity_logs al
LEFT JOIN players p ON al.user_id = p.user_id;

-- 5. Gruppiere Logs ohne Player nach Action-Typ
SELECT 
    al.action,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT al.user_id::text, ', ') AS orphaned_user_ids
FROM activity_logs al
LEFT JOIN players p ON al.user_id = p.user_id
WHERE p.id IS NULL
GROUP BY al.action
ORDER BY count DESC;

-- 6. Zeige ein konkretes Beispiel eines Logs ohne Player
SELECT 
    al.*,
    'NO MATCH' AS status
FROM activity_logs al
LEFT JOIN players p ON al.user_id = p.user_id
WHERE p.id IS NULL
LIMIT 1;

-- 7. Vergleiche user_id Formate (falls es ein Format-Problem gibt)
SELECT 
    'activity_logs' AS source,
    user_id,
    pg_typeof(user_id) AS data_type
FROM activity_logs
LIMIT 5

UNION ALL

SELECT 
    'players' AS source,
    user_id,
    pg_typeof(user_id) AS data_type
FROM players
LIMIT 5;

