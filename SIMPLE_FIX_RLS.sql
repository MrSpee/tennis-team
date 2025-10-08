-- =====================================================
-- Einfacher RLS Fix - Lösche alles und erstelle neu
-- =====================================================

-- 1. Zeige aktuelle Policies
SELECT 
  policyname,
  cmd,
  roles::text as roles
FROM pg_policies
WHERE tablename = 'activity_logs';

-- 2. Lösche ALLE Policies
DROP POLICY IF EXISTS "Super admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Super admins can read activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "temp_all_can_read" ON activity_logs;
DROP POLICY IF EXISTS "temp_all_can_create" ON activity_logs;

-- 3. Erstelle EINE einfache Policy: Alle auth. User können ALLES
CREATE POLICY "allow_all_authenticated" ON activity_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Stelle sicher dass RLS aktiv ist
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Zeige neue Policies
SELECT 
  policyname,
  cmd,
  roles::text as roles,
  '✅' as status
FROM pg_policies
WHERE tablename = 'activity_logs';

-- 6. Zusammenfassung
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS Policies für activity_logs aktualisiert!';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Alte Policies: ALLE GELÖSCHT';
  RAISE NOTICE '📋 Neue Policy: "allow_all_authenticated"';
  RAISE NOTICE '   → Erlaubt: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '   → Bedingung: auth.uid() IS NOT NULL';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 WICHTIG: Als Theo NEU EINLOGGEN!';
  RAISE NOTICE '   1. Logout';
  RAISE NOTICE '   2. Login';
  RAISE NOTICE '   3. Super-Admin Dashboard öffnen';
  RAISE NOTICE '   4. Logs sollten sichtbar sein!';
  RAISE NOTICE '';
END $$;

