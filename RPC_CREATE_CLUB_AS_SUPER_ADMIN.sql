-- =====================================================
-- RPC Function: create_club_as_super_admin
-- Description: Erstellt einen neuen Verein (nur für Super-Admins)
--              SECURITY DEFINER umgeht RLS-Policies
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- FUNCTION: create_club_as_super_admin
-- ========================================

CREATE OR REPLACE FUNCTION create_club_as_super_admin(
  p_name TEXT,
  p_city TEXT,
  p_federation TEXT,
  p_bundesland TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  federation TEXT,
  bundesland TEXT,
  website TEXT,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Läuft mit OWNER-Rechten (umgeht RLS)
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_new_club_id UUID;
BEGIN
  -- ========================================
  -- SCHRITT 1: Prüfe ob User Super-Admin ist
  -- ========================================
  
  SELECT is_super_admin INTO v_is_super_admin
  FROM players_unified
  WHERE user_id = auth.uid()
  AND status = 'active';
  
  -- Wenn kein Spieler gefunden oder nicht Super-Admin
  IF NOT COALESCE(v_is_super_admin, FALSE) THEN
    RAISE EXCEPTION 'Nur Super-Admins dürfen Vereine erstellen'
      USING HINT = 'Kontaktiere einen Administrator für Berechtigungen';
  END IF;
  
  -- ========================================
  -- SCHRITT 2: Validierung der Eingaben
  -- ========================================
  
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Vereinsname darf nicht leer sein';
  END IF;
  
  IF p_city IS NULL OR TRIM(p_city) = '' THEN
    RAISE EXCEPTION 'Stadt darf nicht leer sein';
  END IF;
  
  IF p_federation IS NULL OR TRIM(p_federation) = '' THEN
    RAISE EXCEPTION 'Tennisverband darf nicht leer sein';
  END IF;
  
  -- ========================================
  -- SCHRITT 3: Prüfe auf Duplikate
  -- ========================================
  
  IF EXISTS (
    SELECT 1 
    FROM club_info 
    WHERE LOWER(name) = LOWER(TRIM(p_name))
    AND LOWER(city) = LOWER(TRIM(p_city))
  ) THEN
    RAISE EXCEPTION 'Ein Verein mit diesem Namen existiert bereits in %', p_city
      USING HINT = 'Verwende die Verein-Suche um den bestehenden Verein zu finden';
  END IF;
  
  -- ========================================
  -- SCHRITT 4: Erstelle Verein
  -- ========================================
  
  INSERT INTO club_info (
    name,
    city,
    federation,
    bundesland,
    website,
    is_verified  -- Auto-approve für Super-Admin-Imports
  )
  VALUES (
    TRIM(p_name),
    TRIM(p_city),
    TRIM(p_federation),
    TRIM(p_bundesland),
    NULLIF(TRIM(p_website), ''),  -- NULL wenn leer
    TRUE  -- ✅ Auto-verifiziert
  )
  RETURNING club_info.id INTO v_new_club_id;
  
  -- ========================================
  -- SCHRITT 5: Log Activity
  -- ========================================
  
  BEGIN
    PERFORM log_activity(
      'club_created',
      'club',
      v_new_club_id,
      jsonb_build_object(
        'club_name', p_name,
        'city', p_city,
        'federation', p_federation,
        'source', 'ki_import'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log-Fehler nicht kritisch, weiter machen
    RAISE WARNING 'Could not log club creation: %', SQLERRM;
  END;
  
  -- ========================================
  -- SCHRITT 6: Gib neuen Verein zurück
  -- ========================================
  
  RETURN QUERY
  SELECT 
    club_info.id,
    club_info.name,
    club_info.city,
    club_info.federation,
    club_info.bundesland,
    club_info.website,
    club_info.is_verified,
    club_info.created_at
  FROM club_info
  WHERE club_info.id = v_new_club_id;
  
END;
$$;

-- ========================================
-- PERMISSIONS
-- ========================================

-- Grant execute to authenticated users (Funktion prüft intern ob Super-Admin)
GRANT EXECUTE ON FUNCTION create_club_as_super_admin TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_club_as_super_admin IS 
'Erstellt einen neuen Verein. Nur Super-Admins haben Berechtigung. 
Funktion läuft mit SECURITY DEFINER und umgeht RLS.';

-- ========================================
-- TEST
-- ========================================

-- Test 1: Prüfe ob Funktion existiert
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_club_as_super_admin';

-- Test 2: Rufe Funktion auf (als Super-Admin)
-- SELECT * FROM create_club_as_super_admin(
--   'Test-Verein TC München',
--   'München',
--   'BTV',
--   'Bayern',
--   'https://test.de'
-- );

-- ========================================
-- ROLLBACK (Falls nötig)
-- ========================================

-- DROP FUNCTION IF EXISTS create_club_as_super_admin CASCADE;




