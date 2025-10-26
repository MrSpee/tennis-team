-- ================================================================
-- PHASE 1: Team-Training System - Datenbank Setup
-- ================================================================
-- Ziel: Team-Zuordnung für Trainings (keine Redundanzen!)
-- ================================================================

-- =====================================================
-- SCHRITT 1: Prüfe bestehende Struktur
-- =====================================================

-- Zeige training_sessions Spalten
SELECT 
  '📋 training_sessions Spalten:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Zeige player_teams Struktur
SELECT 
  '📋 player_teams Struktur:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'player_teams'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- SCHRITT 2: Erweitere training_sessions (falls nötig)
-- =====================================================

-- Füge team_id hinzu (falls noch nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' 
      AND column_name = 'team_id'
  ) THEN
    ALTER TABLE training_sessions
    ADD COLUMN team_id UUID REFERENCES team_info(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ team_id Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ team_id Spalte existiert bereits';
  END IF;
END $$;

-- Füge invitation_mode hinzu (falls noch nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_sessions' 
      AND column_name = 'invitation_mode'
  ) THEN
    ALTER TABLE training_sessions
    ADD COLUMN invitation_mode VARCHAR(50) DEFAULT 'all_team_members';
    
    RAISE NOTICE '✅ invitation_mode Spalte hinzugefügt';
  ELSE
    RAISE NOTICE '⚠️ invitation_mode Spalte existiert bereits';
  END IF;
END $$;

-- Erstelle Index für Performance (falls noch nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id 
ON training_sessions(team_id);

SELECT '✅ Indizes erstellt' as status;

-- =====================================================
-- SCHRITT 3: RLS Policy für Team-Trainings
-- =====================================================

-- Lösche alte Policy (falls vorhanden)
DROP POLICY IF EXISTS "team_training_visibility" ON training_sessions;

-- Erstelle neue Policy: Nur Team-Mitglieder sehen Team-Trainings
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

SELECT '✅ RLS Policy erstellt' as status;

-- =====================================================
-- SCHRITT 4: Helper Function - Get User Teams
-- =====================================================

-- Funktion: Hole alle Teams eines Spielers
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE(
  team_id UUID,
  team_name VARCHAR,
  club_name VARCHAR,
  category VARCHAR,
  league VARCHAR,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id as team_id,
    ti.team_name,
    ti.club_name,
    ti.category,
    ti.league,
    pt.is_primary
  FROM player_teams pt
  JOIN team_info ti ON pt.team_id = ti.id
  WHERE pt.player_id IN (
    SELECT id FROM players WHERE user_id = user_uuid
  )
  ORDER BY pt.is_primary DESC, ti.team_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ get_user_teams() Funktion erstellt' as status;

-- =====================================================
-- SCHRITT 5: Helper Function - Get Team Members
-- =====================================================

-- Funktion: Hole alle Mitglieder eines Teams
CREATE OR REPLACE FUNCTION get_team_members(team_uuid UUID)
RETURNS TABLE(
  player_id UUID,
  player_name VARCHAR,
  player_email VARCHAR,
  current_lk VARCHAR,
  is_primary BOOLEAN,
  role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as player_id,
    p.name as player_name,
    p.email as player_email,
    p.current_lk,
    pt.is_primary,
    pt.role
  FROM player_teams pt
  JOIN players p ON pt.player_id = p.id
  WHERE pt.team_id = team_uuid
    AND p.is_active = true
  ORDER BY pt.is_primary DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ get_team_members() Funktion erstellt' as status;

-- =====================================================
-- SCHRITT 6: Verification
-- =====================================================

-- Zeige finale Struktur
SELECT 
  '📋 Finale training_sessions Spalten:' as info,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND table_schema = 'public'
  AND column_name IN ('team_id', 'invitation_mode', 'type')
ORDER BY ordinal_position;

-- Teste get_user_teams() Funktion
SELECT 
  '🧪 Test get_user_teams():' as info,
  * 
FROM get_user_teams(auth.uid())
LIMIT 5;

-- Zeige RLS Policies
SELECT 
  '🔒 RLS Policies:' as info,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'training_sessions'
  AND policyname = 'team_training_visibility';

-- =====================================================
-- ERFOLG
-- =====================================================

SELECT '✅ Phase 1 Datenbank-Setup abgeschlossen!' as status;
