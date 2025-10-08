-- ========================================
-- ACTIVITY LOGGER FUNCTION OVERLOADING FIX
-- ========================================
-- Behebt das Problem mit überladenen log_activity Funktionen

-- ========================================
-- SCHRITT 1: Bestehende Funktionen löschen
-- ========================================

-- Lösche alle bestehenden log_activity Funktionen
DROP FUNCTION IF EXISTS public.log_activity(character varying, character varying, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_activity(text, text, uuid, jsonb);

-- ========================================
-- SCHRITT 2: Einheitliche Funktion erstellen
-- ========================================

-- Erstelle eine einheitliche log_activity Funktion
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    NOW()
  );
END;
$$;

-- ========================================
-- SCHRITT 3: Berechtigungen setzen
-- ========================================

-- Erlaube authentifizierten Benutzern, die Funktion zu verwenden
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ========================================
-- SCHRITT 4: Test der Funktion
-- ========================================

DO $$
BEGIN
  -- Teste die Funktion
  PERFORM public.log_activity(
    'test_action',
    'test_entity',
    gen_random_uuid(),
    '{"test": "data"}'::jsonb
  );
  
  RAISE NOTICE '✅ Activity Logger Funktion erfolgreich erstellt und getestet!';
END $$;
