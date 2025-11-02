-- =====================================================
-- COMPLETE FIX: Club & Team Import für Super-Admins
-- Description: All-in-One Migration für KI-Import Feature
-- Umfasst:
--   1. bundesland Spalte zu club_info
--   2. RLS-Policies für Super-Admins
--   3. RPC-Funktionen für Club/Team-Erstellung
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- TEIL 1: Add bundesland column to club_info
-- ========================================

ALTER TABLE club_info
ADD COLUMN IF NOT EXISTS bundesland TEXT;

COMMENT ON COLUMN club_info.bundesland IS 'Bundesland des Vereins (basierend auf Tennisverband)';

CREATE INDEX IF NOT EXISTS idx_club_info_bundesland 
ON club_info(bundesland);

-- Update existing clubs
UPDATE club_info SET bundesland = 'Nordrhein-Westfalen' WHERE federation IN ('TVM', 'TVN', 'WTV') AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Bayern' WHERE federation = 'BTV' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Baden-Württemberg' WHERE federation IN ('BTV-Baden', 'WTB') AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Berlin/Brandenburg' WHERE federation = 'TVBB' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Hamburg' WHERE federation = 'HTV-Hamburg' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Hessen' WHERE federation = 'HTV-Hessen' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Niedersachsen/Bremen' WHERE federation = 'TNB' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Rheinland-Pfalz' WHERE federation = 'TRP' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Saarland' WHERE federation = 'STB' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Sachsen' WHERE federation = 'STV' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Sachsen-Anhalt' WHERE federation = 'TSA' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Schleswig-Holstein' WHERE federation = 'TSH' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Thüringen' WHERE federation = 'TTV' AND bundesland IS NULL;
UPDATE club_info SET bundesland = 'Mecklenburg-Vorpommern' WHERE federation = 'TMV' AND bundesland IS NULL;

-- ========================================
-- TEIL 2: RPC Function - Create Club (Super-Admin only)
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_new_club_id UUID;
BEGIN
  -- Prüfe Super-Admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM players_unified
  WHERE user_id = auth.uid() AND status = 'active';
  
  IF NOT COALESCE(v_is_super_admin, FALSE) THEN
    RAISE EXCEPTION 'Nur Super-Admins dürfen Vereine erstellen';
  END IF;
  
  -- Validierung
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Vereinsname darf nicht leer sein';
  END IF;
  
  IF p_city IS NULL OR TRIM(p_city) = '' THEN
    RAISE EXCEPTION 'Stadt darf nicht leer sein';
  END IF;
  
  -- Duplikat-Check
  IF EXISTS (
    SELECT 1 FROM club_info 
    WHERE LOWER(club_info.name) = LOWER(TRIM(p_name))
    AND LOWER(club_info.city) = LOWER(TRIM(p_city))
  ) THEN
    RAISE EXCEPTION 'Ein Verein mit diesem Namen existiert bereits in %', p_city;
  END IF;
  
  -- Erstelle Verein
  INSERT INTO club_info (name, city, federation, bundesland, website, is_verified)
  VALUES (TRIM(p_name), TRIM(p_city), TRIM(p_federation), TRIM(p_bundesland), NULLIF(TRIM(p_website), ''), TRUE)
  RETURNING club_info.id INTO v_new_club_id;
  
  -- Log Activity
  BEGIN
    PERFORM log_activity('club_created', 'club', v_new_club_id, 
      jsonb_build_object('club_name', p_name, 'city', p_city, 'source', 'ki_import'));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log club creation: %', SQLERRM;
  END;
  
  -- Gib Verein zurück
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

GRANT EXECUTE ON FUNCTION create_club_as_super_admin TO authenticated;

-- ========================================
-- TEIL 3: RPC Function - Create Team (Super-Admin only)
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_new_team_id UUID;
  v_club_name TEXT;
BEGIN
  -- Prüfe Super-Admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM players_unified
  WHERE user_id = auth.uid() AND status = 'active';
  
  IF NOT COALESCE(v_is_super_admin, FALSE) THEN
    RAISE EXCEPTION 'Nur Super-Admins dürfen Teams erstellen';
  END IF;
  
  -- Validierung
  IF p_team_name IS NULL OR TRIM(p_team_name) = '' THEN
    RAISE EXCEPTION 'Team-Name darf nicht leer sein';
  END IF;
  
  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'Verein muss ausgewählt werden';
  END IF;
  
  -- Hole Club-Name
  SELECT club_info.name INTO v_club_name FROM club_info WHERE club_info.id = p_club_id;
  
  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'Verein mit ID % nicht gefunden', p_club_id;
  END IF;
  
  -- Duplikat-Check
  IF EXISTS (
    SELECT 1 FROM team_info 
    WHERE team_info.club_id = p_club_id
    AND LOWER(team_info.team_name) = LOWER(TRIM(p_team_name))
    AND team_info.category = p_category
  ) THEN
    RAISE EXCEPTION 'Ein Team mit diesem Namen existiert bereits für % (%)', v_club_name, p_category;
  END IF;
  
  -- Erstelle Team
  INSERT INTO team_info (team_name, category, club_id, club_name, region, tvm_link)
  VALUES (TRIM(p_team_name), TRIM(p_category), p_club_id, v_club_name, COALESCE(TRIM(p_region), 'TVM'), NULLIF(TRIM(p_tvm_link), ''))
  RETURNING team_info.id INTO v_new_team_id;
  
  -- Log Activity
  BEGIN
    PERFORM log_activity('team_created', 'team', v_new_team_id,
      jsonb_build_object('team_name', p_team_name, 'category', p_category, 'club_name', v_club_name, 'source', 'ki_import'));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log team creation: %', SQLERRM;
  END;
  
  -- Gib Team zurück
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

GRANT EXECUTE ON FUNCTION create_team_as_super_admin TO authenticated;

-- ========================================
-- TEIL 4: RLS-Policies (Optional - falls du Policies statt RPC bevorzugst)
-- ========================================

-- Enable RLS
ALTER TABLE club_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_info ENABLE ROW LEVEL SECURITY;

-- Club Policies
DROP POLICY IF EXISTS "Super-Admins können Vereine erstellen" ON club_info;
CREATE POLICY "Super-Admins können Vereine erstellen"
ON club_info FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
);

DROP POLICY IF EXISTS "Super-Admins können alle Vereine sehen" ON club_info;
CREATE POLICY "Super-Admins können alle Vereine sehen"
ON club_info FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
  )
  OR is_verified = true  -- Normale User sehen nur verifizierte
);

DROP POLICY IF EXISTS "Super-Admins können Vereine aktualisieren" ON club_info;
CREATE POLICY "Super-Admins können Vereine aktualisieren"
ON club_info FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
  )
);

-- Team Policies
DROP POLICY IF EXISTS "Super-Admins können Teams erstellen" ON team_info;
CREATE POLICY "Super-Admins können Teams erstellen"
ON team_info FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
);

-- ========================================
-- VERIFICATION
-- ========================================

-- Test 1: Prüfe ob Funktionen existieren
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_club_as_super_admin', 'create_team_as_super_admin');

-- Test 2: Prüfe Policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('club_info', 'team_info')
ORDER BY tablename, cmd;

-- Test 3: Prüfe bundesland Spalte
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'club_info'
AND column_name = 'bundesland';

-- Test 4: Zähle Vereine mit bundesland
SELECT bundesland, COUNT(*) as count
FROM club_info
GROUP BY bundesland
ORDER BY count DESC;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration erfolgreich!';
  RAISE NOTICE '✅ bundesland Spalte hinzugefügt';
  RAISE NOTICE '✅ RPC-Funktionen erstellt';
  RAISE NOTICE '✅ RLS-Policies aktualisiert';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Nächster Schritt:';
  RAISE NOTICE '   1. Refresh Schema Cache im Supabase Dashboard';
  RAISE NOTICE '   2. Teste KI-Import im Frontend';
END $$;

