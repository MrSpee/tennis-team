-- ================================================================
-- Team Self-Assignment System - Datenbank Setup
-- ================================================================
-- Spieler können sich selbst Teams zuordnen
-- Optional: Team Captain muss bestätigen
-- ================================================================

-- 1. Erweitere player_teams um Status-Feld
ALTER TABLE player_teams
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
-- Status: 'pending', 'active', 'rejected'

ALTER TABLE player_teams
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW();

ALTER TABLE player_teams
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE player_teams
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES players(id) ON DELETE SET NULL;

-- 2. Erstelle Index
CREATE INDEX IF NOT EXISTS idx_player_teams_status ON player_teams(status);

-- 3. RLS Policy: Spieler können ihre eigenen Anfragen sehen
DROP POLICY IF EXISTS "players_can_view_own_team_requests" ON player_teams;

CREATE POLICY "players_can_view_own_team_requests" ON player_teams
  FOR SELECT USING (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
    OR team_id IN (
      -- Team Captains sehen alle Anfragen für ihre Teams
      SELECT pt.team_id FROM player_teams pt
      WHERE pt.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
        AND pt.role IN ('captain', 'admin')
    )
  );

-- 4. RLS Policy: Spieler können sich selbst zu Teams hinzufügen
DROP POLICY IF EXISTS "players_can_request_team_join" ON player_teams;

CREATE POLICY "players_can_request_team_join" ON player_teams
  FOR INSERT WITH CHECK (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- 5. RLS Policy: Team Captains können Anfragen bestätigen/ablehnen
DROP POLICY IF EXISTS "captains_can_manage_team_requests" ON player_teams;

CREATE POLICY "captains_can_manage_team_requests" ON player_teams
  FOR UPDATE USING (
    team_id IN (
      SELECT pt.team_id FROM player_teams pt
      WHERE pt.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
        AND pt.role IN ('captain', 'admin')
        AND pt.status = 'active'
    )
  );

-- 6. Prüfe Ergebnis
SELECT 
  '📋 player_teams neue Spalten:' as info,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'player_teams'
  AND table_schema = 'public'
  AND column_name IN ('status', 'requested_at', 'approved_at', 'approved_by')
ORDER BY ordinal_position;

-- 7. Zeige RLS Policies
SELECT 
  '🔒 RLS Policies:' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'player_teams'
ORDER BY policyname;

-- Fertig!
SELECT '✅ Team Self-Assignment System eingerichtet!' as status;
