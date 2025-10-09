-- FIX: Activity Logs mit NULL user_id
-- Problem: activity_logs haben user_id = NULL, obwohl der User authentifiziert ist

-- 1. Überprüfe die log_activity Funktion
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'log_activity';

-- 2. Zeige alle Logs mit NULL user_id
SELECT 
    COUNT(*) AS total_null_user_id,
    MIN(created_at) AS oldest,
    MAX(created_at) AS newest
FROM activity_logs
WHERE user_id IS NULL;

-- 3. Zeige Beispiele von Logs MIT user_id (falls vorhanden)
SELECT 
    action,
    user_id,
    user_email,
    created_at
FROM activity_logs
WHERE user_id IS NOT NULL
LIMIT 5;

-- 4. DROP und RE-CREATE der log_activity Funktion mit automatischer user_id Extraktion
DROP FUNCTION IF EXISTS log_activity(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS log_activity(varchar, varchar, uuid, jsonb);

-- Neue log_activity Funktion die automatisch auth.uid() verwendet
CREATE OR REPLACE FUNCTION log_activity(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_log_id UUID;
BEGIN
    -- Hole die aktuelle user_id aus der Supabase Auth Session
    v_user_id := auth.uid();
    
    -- Hole die Email aus der players Tabelle (falls vorhanden)
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM players
        WHERE user_id = v_user_id
        LIMIT 1;
    END IF;
    
    -- Erstelle den Activity Log Eintrag
    INSERT INTO activity_logs (
        user_id,
        user_email,
        action,
        entity_type,
        entity_id,
        details
    )
    VALUES (
        v_user_id,
        v_user_email,
        p_action,
        p_entity_type,
        p_entity_id,
        p_details
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Setze Permissions für die Funktion
GRANT EXECUTE ON FUNCTION log_activity(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(text, text, uuid, jsonb) TO anon;

-- 5. Teste die neue Funktion
SELECT log_activity(
    'test_action',
    'test_entity',
    gen_random_uuid(),
    '{"test": "data"}'::jsonb
);

-- 6. Überprüfe den letzten Log-Eintrag
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 1;

-- 7. Optional: Lösche Test-Eintrag
DELETE FROM activity_logs WHERE action = 'test_action';

