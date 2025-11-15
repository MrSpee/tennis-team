-- ================================================================
-- FIX: RLS Policy für player_privacy_settings
-- Problem: Importierte Spieler können keine Privacy Settings erhalten
-- Lösung: Erlaube System-Inserts (ohne auth.uid())
-- ================================================================

-- =====================================================
-- SCHRITT 1: Prüfe existierende Policies
-- =====================================================

SELECT 
  '📋 EXISTIERENDE POLICIES' as info,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'player_privacy_settings'
ORDER BY policyname;

-- =====================================================
-- SCHRITT 2: Lösche alte restriktive Policies
-- =====================================================

DROP POLICY IF EXISTS "privacy_settings_insert_own" ON player_privacy_settings;
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON player_privacy_settings;
DROP POLICY IF EXISTS "Users can only insert own privacy settings" ON player_privacy_settings;

SELECT '✅ Alte Policies gelöscht' as status;

-- =====================================================
-- SCHRITT 3: Erstelle neue flexible Policy für INSERT
-- =====================================================

-- Policy: Erlaube INSERT für:
-- 1. Authenticated Users (für ihre eigenen Settings)
-- 2. Service Role / System (für Importe)
CREATE POLICY "privacy_settings_insert_flexible" 
ON player_privacy_settings
FOR INSERT
WITH CHECK (
  -- Fall 1: Authenticated User erstellt eigene Settings
  (auth.uid() IS NOT NULL AND player_id IN (
    SELECT id FROM players_unified WHERE user_id = auth.uid()
  ))
  OR
  -- Fall 2: System/Service Role Import (kein auth.uid())
  -- WICHTIG: Nur Service Role kann das nutzen!
  (auth.uid() IS NULL AND auth.role() = 'service_role')
  OR
  -- Fall 3: Anon Key (für Importe über API)
  (auth.role() = 'anon')
);

SELECT '✅ INSERT Policy erstellt: privacy_settings_insert_flexible' as status;

-- =====================================================
-- SCHRITT 4: Erstelle Policy für SELECT
-- =====================================================

DROP POLICY IF EXISTS "privacy_settings_select_own" ON player_privacy_settings;
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON player_privacy_settings;

CREATE POLICY "privacy_settings_select_flexible" 
ON player_privacy_settings
FOR SELECT
USING (
  -- Fall 1: User sieht eigene Settings
  (auth.uid() IS NOT NULL AND player_id IN (
    SELECT id FROM players_unified WHERE user_id = auth.uid()
  ))
  OR
  -- Fall 2: Service Role sieht alles (für Admin/Import)
  (auth.role() = 'service_role')
  OR
  -- Fall 3: Anon kann Settings für API-Zwecke lesen
  (auth.role() = 'anon')
);

SELECT '✅ SELECT Policy erstellt: privacy_settings_select_flexible' as status;

-- =====================================================
-- SCHRITT 5: Erstelle Policy für UPDATE
-- =====================================================

DROP POLICY IF EXISTS "privacy_settings_update_own" ON player_privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON player_privacy_settings;

CREATE POLICY "privacy_settings_update_flexible" 
ON player_privacy_settings
FOR UPDATE
USING (
  -- User kann nur eigene Settings updaten
  (auth.uid() IS NOT NULL AND player_id IN (
    SELECT id FROM players_unified WHERE user_id = auth.uid()
  ))
  OR
  -- Service Role kann alles updaten
  (auth.role() = 'service_role')
);

SELECT '✅ UPDATE Policy erstellt: privacy_settings_update_flexible' as status;

-- =====================================================
-- SCHRITT 6: Erstelle Policy für DELETE
-- =====================================================

DROP POLICY IF EXISTS "privacy_settings_delete_own" ON player_privacy_settings;
DROP POLICY IF EXISTS "Users can delete their own privacy settings" ON player_privacy_settings;

CREATE POLICY "privacy_settings_delete_flexible" 
ON player_privacy_settings
FOR DELETE
USING (
  -- User kann nur eigene Settings löschen
  (auth.uid() IS NOT NULL AND player_id IN (
    SELECT id FROM players_unified WHERE user_id = auth.uid()
  ))
  OR
  -- Service Role kann alles löschen
  (auth.role() = 'service_role')
);

SELECT '✅ DELETE Policy erstellt: privacy_settings_delete_flexible' as status;

-- =====================================================
-- SCHRITT 7: Prüfe neue Policies
-- =====================================================

SELECT 
  '✅ NEUE POLICIES' as info,
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'INSERT' THEN 'WITH CHECK: auth=user OR service_role OR anon'
    WHEN cmd = 'SELECT' THEN 'USING: auth=user OR service_role OR anon'
    WHEN cmd = 'UPDATE' THEN 'USING: auth=user OR service_role'
    WHEN cmd = 'DELETE' THEN 'USING: auth=user OR service_role'
    ELSE 'N/A'
  END as policy_description
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'player_privacy_settings'
ORDER BY cmd, policyname;

-- =====================================================
-- SCHRITT 8: Test - Simuliere Import
-- =====================================================

-- Prüfe ob Privacy Settings für importierte Spieler fehlen
SELECT 
  '⚠️ SPIELER OHNE PRIVACY SETTINGS' as info,
  COUNT(*) as count_without_settings,
  STRING_AGG(p.name, ', ') as player_names_sample
FROM players_unified p
LEFT JOIN player_privacy_settings pps ON p.id = pps.player_id
WHERE pps.id IS NULL
  AND p.player_type = 'tvm_import'
LIMIT 10;

SELECT '✅ RLS Fix abgeschlossen! Teste jetzt den Import erneut.' as status;

