-- FIX V2: Activity Logs mit besserer user_id Extraktion
-- Problem: auth.uid() gibt NULL zurück, wenn nicht von authenticated client aufgerufen

-- Lösche alte Versionen
DROP FUNCTION IF EXISTS log_activity(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS log_activity(varchar, varchar, uuid, jsonb);

-- Neue Version mit expliziter user_id als Parameter
CREATE OR REPLACE FUNCTION log_activity(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER  -- Wichtig: INVOKER statt DEFINER für auth.uid()
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_log_id UUID;
BEGIN
    -- Hole die aktuelle user_id aus der Supabase Auth Session
    v_user_id := auth.uid();
    
    -- Debug: Wenn user_id NULL ist, logge das
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Warning: auth.uid() returned NULL for action: %', p_action;
    END IF;
    
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

-- Setze Permissions
GRANT EXECUTE ON FUNCTION log_activity(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(text, text, uuid, jsonb) TO anon;

-- Teste die Funktion
-- WICHTIG: Dieser Test wird auch NULL user_id haben, weil er vom SQL Editor ausgeführt wird
-- Echte Tests müssen von der App aus (authentifizierter Client) erfolgen
SELECT log_activity(
    'test_action_v2',
    'test_entity',
    gen_random_uuid(),
    '{"test": "data_v2", "note": "Called from SQL editor - user_id will be NULL"}'::jsonb
);

-- Lösche Test-Einträge
DELETE FROM activity_logs WHERE action LIKE 'test_action%';

-- Zeige die Funktions-Definition
SELECT 
    proname AS function_name,
    prosecdef AS is_security_definer,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'log_activity';

-- Info-Ausgabe
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'log_activity Funktion wurde aktualisiert!';
    RAISE NOTICE '';
    RAISE NOTICE 'WICHTIG:';
    RAISE NOTICE '- Tests im SQL Editor haben IMMER user_id = NULL';
    RAISE NOTICE '- Echte Logs von der App sollten user_id haben';
    RAISE NOTICE '- Bitte teste durch eine Aktion in der App';
    RAISE NOTICE '  (z.B. Profil bearbeiten, Training erstellen)';
    RAISE NOTICE '==================================================';
END $$;

