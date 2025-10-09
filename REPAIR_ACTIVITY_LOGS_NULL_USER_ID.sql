-- REPAIR: Versuche existierende Logs mit NULL user_id zu reparieren
-- Basierend auf anderen Informationen im Log (entity_id, ip_address, zeitliche Korrelation)

-- 1. Analysiere, wie viele Logs repariert werden können
WITH log_context AS (
    SELECT 
        al.id,
        al.action,
        al.entity_id,
        al.entity_type,
        al.created_at,
        al.user_id,
        -- Versuche user_id aus entity_id zu ermitteln (z.B. bei profile_updated)
        CASE 
            WHEN al.entity_type = 'player' THEN (
                SELECT p.user_id FROM players p WHERE p.id = al.entity_id
            )
            WHEN al.entity_type = 'training' THEN (
                SELECT ts.organizer_id FROM training_sessions ts WHERE ts.id = al.entity_id
            )
            WHEN al.entity_type = 'match' THEN NULL -- Matches haben keine direkte user_id
            ELSE NULL
        END AS inferred_user_id
    FROM activity_logs al
    WHERE al.user_id IS NULL
)
SELECT 
    COUNT(*) AS total_null_logs,
    COUNT(inferred_user_id) AS repairable_logs,
    COUNT(*) - COUNT(inferred_user_id) AS unrepairable_logs
FROM log_context;

-- 2. Zeige Beispiele von reparierbaren Logs
WITH log_context AS (
    SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.created_at,
        CASE 
            WHEN al.entity_type = 'player' THEN (
                SELECT p.user_id FROM players p WHERE p.id = al.entity_id
            )
            WHEN al.entity_type = 'training' THEN (
                SELECT ts.organizer_id FROM training_sessions ts WHERE ts.id = al.entity_id
            )
            ELSE NULL
        END AS inferred_user_id,
        CASE 
            WHEN al.entity_type = 'player' THEN (
                SELECT p.name FROM players p WHERE p.id = al.entity_id
            )
            WHEN al.entity_type = 'training' THEN (
                SELECT p.name FROM training_sessions ts 
                JOIN players p ON ts.organizer_id = p.id
                WHERE ts.id = al.entity_id
            )
            ELSE NULL
        END AS inferred_user_name
    FROM activity_logs al
    WHERE al.user_id IS NULL
)
SELECT *
FROM log_context
WHERE inferred_user_id IS NOT NULL
LIMIT 10;

-- 3. UPDATE: Repariere Logs wo möglich (VORSICHT: Nur ausführen wenn Analyse OK ist!)
-- AUSKOMMENTIERT - Bitte erst Analyse oben prüfen!

/*
UPDATE activity_logs al
SET 
    user_id = CASE 
        WHEN al.entity_type = 'player' THEN (
            SELECT p.user_id FROM players p WHERE p.id = al.entity_id
        )
        WHEN al.entity_type = 'training' THEN (
            SELECT ts.organizer_id FROM training_sessions ts WHERE ts.id = al.entity_id
        )
        ELSE NULL
    END,
    user_email = CASE 
        WHEN al.entity_type = 'player' THEN (
            SELECT p.email FROM players p WHERE p.id = al.entity_id
        )
        WHEN al.entity_type = 'training' THEN (
            SELECT p.email FROM training_sessions ts 
            JOIN players p ON ts.organizer_id = p.id
            WHERE ts.id = al.entity_id
        )
        ELSE NULL
    END
WHERE 
    al.user_id IS NULL
    AND al.entity_type IN ('player', 'training');
*/

-- 4. Für Logs die nicht repariert werden können: Füge Hinweis in details hinzu
/*
UPDATE activity_logs al
SET details = COALESCE(details, '{}'::jsonb) || '{"user_unknown": true}'::jsonb
WHERE user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM players p WHERE p.id = al.entity_id
  );
*/

-- 5. Statistik nach Reparatur
SELECT 
    COUNT(*) AS total_logs,
    COUNT(user_id) AS logs_with_user,
    COUNT(*) - COUNT(user_id) AS logs_without_user
FROM activity_logs;

