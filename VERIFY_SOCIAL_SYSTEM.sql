-- ============================================
-- SOCIAL SYSTEM VERIFICATION
-- ============================================
-- Prüfe ob alle Tabellen korrekt erstellt wurden
-- ============================================

-- ====================================
-- 1️⃣ TABELLEN CHECK
-- ====================================

SELECT 
  '✅ TABELLEN' as check_type,
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'player_followers',
    'player_blocks', 
    'player_privacy_settings',
    'team_favorites',
    'player_notifications'
  )
ORDER BY tablename;

-- ====================================
-- 2️⃣ INDIZES CHECK
-- ====================================

SELECT 
  '✅ INDIZES' as check_type,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'player_followers',
    'player_blocks',
    'player_privacy_settings', 
    'team_favorites',
    'player_notifications'
  )
ORDER BY tablename, indexname;

-- ====================================
-- 3️⃣ FUNCTIONS CHECK
-- ====================================

SELECT 
  '✅ FUNCTIONS' as check_type,
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_follower_count',
    'get_following_count',
    'is_following',
    'is_blocked',
    'is_mutual_follow',
    'trigger_update_mutual_follow',
    'trigger_unfollow_on_block',
    'trigger_update_timestamp',
    'trigger_notify_on_follow',
    'trigger_create_default_privacy'
  )
ORDER BY routine_name;

-- ====================================
-- 4️⃣ TRIGGERS CHECK
-- ====================================

SELECT 
  '✅ TRIGGERS' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN (
    'player_followers',
    'player_blocks',
    'player_privacy_settings',
    'players_unified'
  )
ORDER BY event_object_table, trigger_name;

-- ====================================
-- 5️⃣ RLS POLICIES CHECK
-- ====================================

SELECT 
  '✅ RLS POLICIES' as check_type,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'player_followers',
    'player_blocks',
    'player_privacy_settings',
    'team_favorites',
    'player_notifications'
  )
ORDER BY tablename, policyname;

-- ====================================
-- 6️⃣ PRIVACY SETTINGS - Auto-Created?
-- ====================================

SELECT 
  '✅ PRIVACY SETTINGS' as check_type,
  COUNT(*) as total_players_with_privacy,
  (SELECT COUNT(*) FROM players_unified) as total_players,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM players_unified) 
    THEN '✅ ALLE SPIELER HABEN PRIVACY SETTINGS'
    ELSE '⚠️ NICHT ALLE SPIELER HABEN PRIVACY SETTINGS'
  END as status
FROM player_privacy_settings;

-- ====================================
-- 7️⃣ AKTUELLE DATEN
-- ====================================

SELECT 
  '📊 AKTUELLE DATEN' as info,
  (SELECT COUNT(*) FROM player_followers) as total_follows,
  (SELECT COUNT(*) FROM player_blocks) as total_blocks,
  (SELECT COUNT(*) FROM player_privacy_settings) as total_privacy_settings,
  (SELECT COUNT(*) FROM team_favorites) as total_team_favorites,
  (SELECT COUNT(*) FROM player_notifications) as total_notifications;

-- ====================================
-- 8️⃣ SAMPLE: Privacy Settings
-- ====================================

SELECT 
  '📋 SAMPLE PRIVACY' as info,
  p.name as player_name,
  pps.profile_visibility,
  pps.show_match_results,
  pps.show_email,
  pps.show_phone,
  pps.allow_follow_requests
FROM player_privacy_settings pps
JOIN players_unified p ON p.id = pps.player_id
LIMIT 5;

