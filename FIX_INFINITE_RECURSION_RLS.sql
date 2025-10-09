-- FIX_INFINITE_RECURSION_RLS.sql
-- NOTFALL: Entferne alle RLS Policies die Rekursion verursachen
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚨 NOTFALL-FIX: RLS Policies entfernen';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. DISABLE RLS auf allen betroffenen Tabellen
-- =====================================================

ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams DISABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS deaktiviert auf allen Tabellen';

-- =====================================================
-- 2. DROP alle Policies auf players
-- =====================================================

DROP POLICY IF EXISTS "Players can view their own profile" ON players;
DROP POLICY IF EXISTS "Players can update their own profile" ON players;
DROP POLICY IF EXISTS "players_select_policy" ON players;
DROP POLICY IF EXISTS "players_insert_policy" ON players;
DROP POLICY IF EXISTS "players_update_policy" ON players;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON players;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON players;

RAISE NOTICE '✅ Alle Policies von players entfernt';

-- =====================================================
-- 3. DROP alle Policies auf matches
-- =====================================================

DROP POLICY IF EXISTS "team_matches_select_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_insert_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_update_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_delete_policy" ON matches;
DROP POLICY IF EXISTS "Players see only their team's matches" ON matches;
DROP POLICY IF EXISTS "Players can view their team matches" ON matches;

RAISE NOTICE '✅ Alle Policies von matches entfernt';

-- =====================================================
-- 4. DROP alle Policies auf training_sessions
-- =====================================================

DROP POLICY IF EXISTS "training_sessions_select_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_insert_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_update_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_delete_policy" ON training_sessions;
DROP POLICY IF EXISTS "Players see accessible trainings" ON training_sessions;

RAISE NOTICE '✅ Alle Policies von training_sessions entfernt';

-- =====================================================
-- 5. DROP alle Policies auf training_attendance
-- =====================================================

DROP POLICY IF EXISTS "training_attendance_select_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_insert_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_update_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_delete_policy" ON training_attendance;

RAISE NOTICE '✅ Alle Policies von training_attendance entfernt';

-- =====================================================
-- 6. DROP alle Policies auf match_availability
-- =====================================================

DROP POLICY IF EXISTS "match_availability_select_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_insert_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_update_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_delete_policy" ON match_availability;

RAISE NOTICE '✅ Alle Policies von match_availability entfernt';

-- =====================================================
-- 7. Erstelle SICHERE Basis-Policies (OHNE Rekursion)
-- =====================================================

-- ✅ PLAYERS: Einfache Policies ohne Rekursion
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_all"
ON players FOR SELECT
USING (true);  -- Alle authentifizierten User sehen alle Spieler

CREATE POLICY "players_insert_own"
ON players FOR INSERT
WITH CHECK (user_id = auth.uid());  -- Nur eigenes Profil erstellen

CREATE POLICY "players_update_own"
ON players FOR UPDATE
USING (user_id = auth.uid());  -- Nur eigenes Profil bearbeiten

RAISE NOTICE '✅ Sichere Policies für players erstellt';

-- ✅ MATCHES: Alle sehen alle (vorerst)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_all"
ON matches FOR SELECT
USING (true);  -- Alle authentifizierten User sehen alle Matches

CREATE POLICY "matches_insert_authenticated"
ON matches FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matches_update_authenticated"
ON matches FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "matches_delete_authenticated"
ON matches FOR DELETE
USING (auth.uid() IS NOT NULL);

RAISE NOTICE '✅ Sichere Policies für matches erstellt';

-- ✅ TRAINING_SESSIONS: Alle sehen alle (vorerst)
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_sessions_select_all"
ON training_sessions FOR SELECT
USING (true);  -- Alle authentifizierten User sehen alle Trainings

CREATE POLICY "training_sessions_insert_authenticated"
ON training_sessions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "training_sessions_update_authenticated"
ON training_sessions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "training_sessions_delete_authenticated"
ON training_sessions FOR DELETE
USING (auth.uid() IS NOT NULL);

RAISE NOTICE '✅ Sichere Policies für training_sessions erstellt';

-- ✅ TRAINING_ATTENDANCE: Alle sehen alle (vorerst)
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_attendance_select_all"
ON training_attendance FOR SELECT
USING (true);

CREATE POLICY "training_attendance_insert_authenticated"
ON training_attendance FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "training_attendance_update_authenticated"
ON training_attendance FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "training_attendance_delete_authenticated"
ON training_attendance FOR DELETE
USING (auth.uid() IS NOT NULL);

RAISE NOTICE '✅ Sichere Policies für training_attendance erstellt';

-- ✅ MATCH_AVAILABILITY: Alle sehen alle (vorerst)
ALTER TABLE match_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_availability_select_all"
ON match_availability FOR SELECT
USING (true);

CREATE POLICY "match_availability_insert_authenticated"
ON match_availability FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "match_availability_update_authenticated"
ON match_availability FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "match_availability_delete_authenticated"
ON match_availability FOR DELETE
USING (auth.uid() IS NOT NULL);

RAISE NOTICE '✅ Sichere Policies für match_availability erstellt';

-- =====================================================
-- 8. Status
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ NOTFALL-FIX ABGESCHLOSSEN';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   - Alle rekursiven Policies entfernt';
  RAISE NOTICE '   - Sichere Basis-Policies erstellt';
  RAISE NOTICE '   - App sollte jetzt wieder funktionieren';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WICHTIG:';
  RAISE NOTICE '   - Momentan sehen alle User ALLE Daten';
  RAISE NOTICE '   - Multi-Tenancy ist DEAKTIVIERT';
  RAISE NOTICE '   - Wir müssen RLS neu designen (ohne Rekursion)';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Zeige aktuelle Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('players', 'matches', 'training_sessions', 'training_attendance', 'match_availability')
ORDER BY tablename, cmd;

