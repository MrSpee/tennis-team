-- =====================================================
-- Fix: Allow Super-Admins to create clubs via Import
-- Description: Fügt RLS-Policy hinzu, die Super-Admins erlaubt
--              neue Vereine zu erstellen (wichtig für KI-Import)
-- Date: 2025-11-02
-- =====================================================

-- ========================================
-- SCHRITT 1: Prüfe aktuelle RLS-Policies
-- ========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'club_info';

-- ========================================
-- SCHRITT 2: Füge INSERT-Policy für Super-Admins hinzu
-- ========================================

-- Policy: Super-Admins dürfen Vereine erstellen
CREATE POLICY "Super-Admins können Vereine erstellen"
ON club_info
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
);

-- Policy: Super-Admins dürfen alle Vereine sehen
CREATE POLICY "Super-Admins können alle Vereine sehen"
ON club_info
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
  OR
  -- ODER: Normale User sehen nur verifizierte Vereine
  is_verified = true
);

-- Policy: Super-Admins dürfen Vereine aktualisieren
CREATE POLICY "Super-Admins können Vereine aktualisieren"
ON club_info
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM players_unified 
    WHERE players_unified.user_id = auth.uid() 
    AND players_unified.is_super_admin = true
    AND players_unified.status = 'active'
  )
);

-- ========================================
-- SCHRITT 3: Enable RLS auf club_info (falls nicht schon aktiv)
-- ========================================

ALTER TABLE club_info ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SCHRITT 4: Test-Queries
-- ========================================

-- Test 1: Prüfe ob Super-Admin erkannt wird
SELECT 
  id,
  name,
  email,
  is_super_admin
FROM players_unified
WHERE user_id = auth.uid();

-- Test 2: Versuche Verein zu lesen (sollte funktionieren)
SELECT COUNT(*) as total_clubs FROM club_info;

-- Test 3: Zeige alle aktiven Policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text 
    ELSE '' 
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check::text 
    ELSE '' 
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'club_info'
ORDER BY cmd, policyname;

-- ========================================
-- ALTERNATIVE: Falls Policies Konflikt haben
-- ========================================

-- OPTION 1: Lösche alte Policies (falls nötig)
-- DROP POLICY IF EXISTS "old_policy_name" ON club_info;

-- OPTION 2: Erstelle als RPC-Funktion (umgeht RLS komplett)
/*
CREATE OR REPLACE FUNCTION create_club_as_super_admin(
  p_name TEXT,
  p_city TEXT,
  p_federation TEXT,
  p_bundesland TEXT,
  p_website TEXT
)
RETURNS club_info
LANGUAGE plpgsql
SECURITY DEFINER  -- Läuft mit OWNER-Rechten (umgeht RLS)
AS $$
DECLARE
  v_new_club club_info;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Prüfe ob User Super-Admin ist
  SELECT is_super_admin INTO v_is_super_admin
  FROM players_unified
  WHERE user_id = auth.uid()
  AND status = 'active';
  
  IF NOT COALESCE(v_is_super_admin, FALSE) THEN
    RAISE EXCEPTION 'Nur Super-Admins dürfen Vereine erstellen';
  END IF;
  
  -- Erstelle Verein
  INSERT INTO club_info (name, city, federation, bundesland, website, is_verified)
  VALUES (p_name, p_city, p_federation, p_bundesland, p_website, TRUE)
  RETURNING * INTO v_new_club;
  
  RETURN v_new_club;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_club_as_super_admin TO authenticated;
*/

-- ========================================
-- VERIFICATION
-- ========================================

-- Zeige finale Policy-Übersicht
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'club_info'
ORDER BY cmd;

