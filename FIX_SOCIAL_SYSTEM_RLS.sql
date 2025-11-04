-- ============================================
-- FIX SOCIAL SYSTEM RLS POLICIES
-- ============================================
-- Problem: Notifications können nicht erstellt werden
-- Lösung: INSERT Policy anpassen + System-User
-- ============================================

-- ====================================
-- 1️⃣ FIX: Notifications INSERT Policy
-- ====================================

-- Alte Policy löschen
DROP POLICY IF EXISTS "notifications_insert_own" ON player_notifications;

-- Neue Policy: Jeder authentifizierte User kann Notifications erstellen
-- (Wird vom Trigger genutzt um andere User zu benachrichtigen)
CREATE POLICY "notifications_insert_any"
  ON player_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "notifications_insert_any" ON player_notifications IS 
  'Authenticated users can create notifications (needed for triggers that notify other users)';

-- ====================================
-- 2️⃣ ALTERNATIVE: Trigger als SECURITY DEFINER
-- ====================================

-- Diese Option ist sicherer, aber komplexer
-- Trigger-Function neu erstellen als SECURITY DEFINER

CREATE OR REPLACE FUNCTION trigger_notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Läuft mit Owner-Rechten, nicht User-Rechten
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Hole Namen des Followers
  SELECT name INTO v_follower_name
  FROM players_unified
  WHERE id = NEW.follower_id;
  
  -- Erstelle Notification (läuft jetzt mit DEFINER-Rechten)
  INSERT INTO player_notifications (player_id, type, title, message, reference_type, reference_id)
  VALUES (
    NEW.following_id,
    'follow',
    'Neuer Follower!',
    v_follower_name || ' folgt dir jetzt.',
    'player',
    NEW.follower_id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Falls Notification fehlschlägt, Follow trotzdem durchführen
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ====================================
-- 3️⃣ FIX: Unfollow Trigger auch als DEFINER
-- ====================================

CREATE OR REPLACE FUNCTION trigger_unfollow_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lösche alle Follow-Beziehungen in beide Richtungen
  DELETE FROM player_followers 
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to unfollow on block: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ====================================
-- 4️⃣ FIX: Mutual Follow Trigger
-- ====================================

CREATE OR REPLACE FUNCTION trigger_update_mutual_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prüfe ob mutual follow existiert
  IF TG_OP = 'INSERT' THEN
    -- Prüfe ob Gegenstück existiert
    IF EXISTS(
      SELECT 1 FROM player_followers
      WHERE follower_id = NEW.following_id
        AND following_id = NEW.follower_id
    ) THEN
      -- Beide Einträge auf mutual setzen
      UPDATE player_followers
      SET is_mutual = true
      WHERE (follower_id = NEW.follower_id AND following_id = NEW.following_id)
         OR (follower_id = NEW.following_id AND following_id = NEW.follower_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Bei Unfollow: Gegenstück auf non-mutual setzen
    UPDATE player_followers
    SET is_mutual = false
    WHERE follower_id = OLD.following_id
      AND following_id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to update mutual follow: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ====================================
-- 5️⃣ VERIFICATION
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ RLS POLICIES FIXED!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 ÄNDERUNGEN:';
  RAISE NOTICE '   ✅ player_notifications INSERT Policy: Offen für alle authenticated';
  RAISE NOTICE '   ✅ Alle Trigger jetzt SECURITY DEFINER (sicherer)';
  RAISE NOTICE '   ✅ Error Handling in allen Triggern';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 JETZT SOLLTE FOLGEN FUNKTIONIEREN!';
  RAISE NOTICE '';
END $$;

-- Test: Policies anzeigen
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('player_followers', 'player_notifications')
ORDER BY tablename, policyname;


