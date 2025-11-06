-- =====================================================
-- RPC Function: create_team_as_super_admin
-- Description: Erstellt ein neues Team (nur für Super-Admins)
--              SECURITY DEFINER umgeht RLS-Policies
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- FUNCTION: create_team_as_super_admin
-- ========================================

CREATE OR REPLACE FUNCTION create_team_as_super_admin(
  p_team_name TEXT,
  p_category TEXT,
  p_club_id UUID,
  p_tvm_link TEXT DEFAULT NULL,
  p_region TEXT DEFAULT 'TVM'
)
RETURNS TABLE (
  id UUID,
  team_name TEXT,
  category TEXT,
  club_id UUID,
  club_name TEXT,
  region TEXT,
  tvm_link TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Läuft mit OWNER-Rechten (umgeht RLS)
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_new_team_id UUID;
  v_club_name TEXT;
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
    RAISE EXCEPTION 'Nur Super-Admins dürfen Teams erstellen'
      USING HINT = 'Kontaktiere einen Administrator für Berechtigungen';
  END IF;
  
  -- ========================================
  -- SCHRITT 2: Validierung der Eingaben
  -- ========================================
  
  IF p_team_name IS NULL OR TRIM(p_team_name) = '' THEN
    RAISE EXCEPTION 'Team-Name darf nicht leer sein';
  END IF;
  
  IF p_category IS NULL OR TRIM(p_category) = '' THEN
    RAISE EXCEPTION 'Kategorie darf nicht leer sein';
  END IF;
  
  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'Verein muss ausgewählt werden';
  END IF;
  
  -- ========================================
  -- SCHRITT 3: Hole Club-Name
  -- ========================================
  
  SELECT name INTO v_club_name
  FROM club_info
  WHERE club_info.id = p_club_id;
  
  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'Verein mit ID % nicht gefunden', p_club_id;
  END IF;
  
  -- ========================================
  -- SCHRITT 4: Prüfe auf Duplikate
  -- ========================================
  
  IF EXISTS (
    SELECT 1 
    FROM team_info 
    WHERE club_id = p_club_id
    AND LOWER(team_name) = LOWER(TRIM(p_team_name))
    AND category = p_category
  ) THEN
    RAISE EXCEPTION 'Ein Team mit diesem Namen existiert bereits für % (%)', v_club_name, p_category
      USING HINT = 'Verwende die Team-Suche um das bestehende Team zu finden';
  END IF;
  
  -- ========================================
  -- SCHRITT 5: Erstelle Team
  -- ========================================
  
  INSERT INTO team_info (
    team_name,
    category,
    club_id,
    club_name,
    region,
    tvm_link
  )
  VALUES (
    TRIM(p_team_name),
    TRIM(p_category),
    p_club_id,
    v_club_name,
    COALESCE(TRIM(p_region), 'TVM'),
    NULLIF(TRIM(p_tvm_link), '')  -- NULL wenn leer
  )
  RETURNING team_info.id INTO v_new_team_id;
  
  -- ========================================
  -- SCHRITT 6: Log Activity
  -- ========================================
  
  BEGIN
    PERFORM log_activity(
      'team_created',
      'team',
      v_new_team_id,
      jsonb_build_object(
        'team_name', p_team_name,
        'category', p_category,
        'club_name', v_club_name,
        'source', 'ki_import'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log-Fehler nicht kritisch, weiter machen
    RAISE WARNING 'Could not log team creation: %', SQLERRM;
  END;
  
  -- ========================================
  -- SCHRITT 7: Gib neues Team zurück
  -- ========================================
  
  RETURN QUERY
  SELECT 
    team_info.id,
    team_info.team_name,
    team_info.category,
    team_info.club_id,
    team_info.club_name,
    team_info.region,
    team_info.tvm_link,
    team_info.created_at
  FROM team_info
  WHERE team_info.id = v_new_team_id;
  
END;
$$;

-- ========================================
-- PERMISSIONS
-- ========================================

-- Grant execute to authenticated users (Funktion prüft intern ob Super-Admin)
GRANT EXECUTE ON FUNCTION create_team_as_super_admin TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_team_as_super_admin IS 
'Erstellt ein neues Team. Nur Super-Admins haben Berechtigung. 
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
AND routine_name = 'create_team_as_super_admin';

-- ========================================
-- ROLLBACK (Falls nötig)
-- ========================================

-- DROP FUNCTION IF EXISTS create_team_as_super_admin CASCADE;





