-- ============================================
-- PLAYER FOLLOWERS SYSTEM
-- ============================================
-- Ermöglicht Spielern, anderen Spielern zu folgen
-- und deren Matches in einer Favoriten-Liste zu sehen
-- ============================================

-- ====================================
-- 1️⃣ TABELLE: player_followers
-- ====================================

CREATE TABLE IF NOT EXISTS player_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Wer folgt wem?
  follower_id UUID NOT NULL REFERENCES players_unified(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES players_unified(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE(follower_id, following_id)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_followers_follower ON player_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON player_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created ON player_followers(created_at DESC);

COMMENT ON TABLE player_followers IS 'Follower-System: Spieler können anderen Spielern folgen';
COMMENT ON COLUMN player_followers.follower_id IS 'User der folgt';
COMMENT ON COLUMN player_followers.following_id IS 'User dem gefolgt wird';

-- ====================================
-- 2️⃣ RLS POLICIES
-- ====================================

ALTER TABLE player_followers ENABLE ROW LEVEL SECURITY;

-- Jeder kann sehen, wer wem folgt (öffentliche Info)
CREATE POLICY "player_followers_select_all"
  ON player_followers
  FOR SELECT
  TO authenticated
  USING (true);

-- Nur eigene Follows erstellen
CREATE POLICY "player_followers_insert_own"
  ON player_followers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_id IN (
      SELECT id FROM players_unified WHERE user_id = auth.uid()
    )
  );

-- Nur eigene Follows löschen
CREATE POLICY "player_followers_delete_own"
  ON player_followers
  FOR DELETE
  TO authenticated
  USING (
    follower_id IN (
      SELECT id FROM players_unified WHERE user_id = auth.uid()
    )
  );

-- ====================================
-- 3️⃣ HELPER FUNCTIONS
-- ====================================

-- Anzahl Follower für einen Spieler
CREATE OR REPLACE FUNCTION get_follower_count(p_player_id UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM player_followers
  WHERE following_id = p_player_id;
$$;

-- Anzahl Following für einen Spieler
CREATE OR REPLACE FUNCTION get_following_count(p_player_id UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM player_followers
  WHERE follower_id = p_player_id;
$$;

-- Prüfe ob User einem Spieler folgt
CREATE OR REPLACE FUNCTION is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM player_followers
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
  );
$$;

-- ====================================
-- 4️⃣ VERIFICATION
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ PLAYER FOLLOWERS SYSTEM ERSTELLT!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tabelle: player_followers';
  RAISE NOTICE '🔒 RLS Policies: aktiviert';
  RAISE NOTICE '⚡ Helper Functions: 3 erstellt';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Jetzt kannst du:';
  RAISE NOTICE '   - Spielern folgen (Follow-Button)';
  RAISE NOTICE '   - Favoriten in Results sehen';
  RAISE NOTICE '   - Follower-Counts anzeigen';
  RAISE NOTICE '';
END $$;

-- Test Query (optional)
SELECT 
  'player_followers' as table_name,
  COUNT(*) as current_follows
FROM player_followers;


