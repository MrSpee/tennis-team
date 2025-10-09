-- ================================================================
-- PHASE 1: Team-Training System - EINFACHES Setup
-- ================================================================

-- 1. Füge team_id Spalte hinzu
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES team_info(id) ON DELETE CASCADE;

-- 2. Füge invitation_mode Spalte hinzu
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS invitation_mode VARCHAR(50) DEFAULT 'all_team_members';

-- 3. Erstelle Index
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id ON training_sessions(team_id);

-- 4. Lösche alte RLS Policy
DROP POLICY IF EXISTS "team_training_visibility" ON training_sessions;

-- 5. Erstelle neue RLS Policy
CREATE POLICY "team_training_visibility" ON training_sessions
  FOR SELECT USING (
    -- Team-Training: Nur Team-Mitglieder
    (type = 'team' AND team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM player_teams
      WHERE player_teams.team_id = training_sessions.team_id
        AND player_teams.player_id IN (
          SELECT id FROM players WHERE user_id = auth.uid()
        )
    ))
    OR
    -- Private Trainings: Organisator oder Eingeladene
    (type = 'private' AND (
      organizer_id IN (SELECT id FROM players WHERE user_id = auth.uid())
      OR invited_players @> ARRAY[(SELECT id FROM players WHERE user_id = auth.uid())]
    ))
    OR
    -- Legacy: Trainings ohne team_id (alle sehen)
    (type = 'team' AND team_id IS NULL)
  );

-- 6. Prüfe Ergebnis
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND table_schema = 'public'
  AND column_name IN ('team_id', 'invitation_mode', 'type')
ORDER BY ordinal_position;

-- Fertig!
SELECT '✅ Phase 1 Setup abgeschlossen!' as status;
