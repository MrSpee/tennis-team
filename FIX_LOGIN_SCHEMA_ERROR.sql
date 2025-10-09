-- ================================================================
-- FIX: "Database error querying schema" beim Login
-- ================================================================
-- Problem: Login schlägt fehl weil ein Trigger/View current_lk erwartet
-- Lösung: Finde und fixe alle Stellen die current_lk benötigen
-- ================================================================

-- =====================================================
-- STEP 1: Finde alle Trigger die auf players reagieren
-- =====================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'players'
ORDER BY trigger_name;

-- =====================================================
-- STEP 2: Finde alle Functions die auf players zugreifen
-- =====================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition LIKE '%players%' 
    OR routine_definition LIKE '%current_lk%'
  )
ORDER BY routine_name;

-- =====================================================
-- STEP 3: Finde alle Views die players nutzen
-- =====================================================
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition LIKE '%players%'
ORDER BY table_name;

-- =====================================================
-- STEP 4: Prüfe ob es Constraints auf current_lk gibt
-- =====================================================
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'players'
  AND (kcu.column_name LIKE '%lk%' OR cc.check_clause LIKE '%lk%')
ORDER BY tc.constraint_type, tc.constraint_name;

-- =====================================================
-- STEP 5: Prüfe RLS Policies auf players
-- =====================================================
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
WHERE tablename = 'players'
ORDER BY policyname;

-- =====================================================
-- STEP 6: Test-Insert ohne LK
-- =====================================================
-- Simuliere was beim Player-Create passiert (ohne wirklich zu erstellen)
DO $$
DECLARE
  v_test_user_id UUID := gen_random_uuid();
BEGIN
  -- Trockenlauf: Was würde passieren?
  RAISE NOTICE 'Testing player insert without current_lk...';
  
  -- Dieser Insert sollte funktionieren (wird nicht committed)
  BEGIN
    INSERT INTO players (
      user_id,
      email,
      name,
      role,
      points,
      is_active
    ) VALUES (
      v_test_user_id,
      'test-dry-run@example.com',
      'Test User',
      'player',
      0,
      true
    );
    
    RAISE NOTICE '✅ Insert would succeed without current_lk';
    
    -- Rollback
    RAISE EXCEPTION 'Rollback test';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM != 'Rollback test' THEN
        RAISE NOTICE '❌ Insert would fail: %', SQLERRM;
      END IF;
  END;
END $$;

-- =====================================================
-- STEP 7: Prüfe ob track_lk_changes Trigger existiert
-- =====================================================
-- Dieser Trigger könnte Probleme machen wenn current_lk NULL ist
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'players'
  AND tgname LIKE '%lk%'
ORDER BY tgname;

-- =====================================================
-- POSSIBLE FIX: Deaktiviere problematische Trigger temporär
-- =====================================================
-- Falls ein LK-Trigger existiert und Probleme macht:
-- ALTER TABLE players DISABLE TRIGGER trigger_track_lk_changes;

-- =====================================================
-- STEP 8: Prüfe letzten Login-Versuch
-- =====================================================
-- Schaue in auth.users ob der User existiert
SELECT 
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE email = 'tester@plora.de';

-- Prüfe ob Player-Eintrag existiert
SELECT 
  id,
  user_id,
  name,
  email,
  current_lk,
  created_at
FROM players
WHERE email = 'tester@plora.de';

-- =====================================================
-- QUICK FIX: Manuell Player erstellen für tester@plora.de
-- =====================================================
-- Falls Player-Eintrag fehlt:
INSERT INTO players (
  user_id,
  email,
  name,
  role,
  points,
  is_active,
  current_lk
)
SELECT 
  id as user_id,
  email,
  INITCAP(SPLIT_PART(email, '@', 1)) as name,
  'player' as role,
  0 as points,
  true as is_active,
  NULL as current_lk
FROM auth.users
WHERE email = 'tester@plora.de'
  AND NOT EXISTS (
    SELECT 1 FROM players WHERE email = 'tester@plora.de'
  );

-- Prüfe Erfolg:
SELECT 
  'Player Status' as info,
  COUNT(*) as player_entries
FROM players
WHERE email = 'tester@plora.de';

-- =====================================================
-- VERIFICATION: Simuliere Login-Query
-- =====================================================
-- Das ist was AuthContext beim Login macht:
SELECT 
  p.*
FROM players p
WHERE p.email = 'tester@plora.de'
  OR p.user_id = (
    SELECT id FROM auth.users WHERE email = 'tester@plora.de'
  )
LIMIT 1;

-- Falls das fehlschlägt, ist es ein RLS-Problem!

