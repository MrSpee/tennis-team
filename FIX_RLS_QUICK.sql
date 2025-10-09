-- QUICK FIX: Disable RLS and remove all policies
-- Run this NOW to fix the app

-- Disable RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams DISABLE ROW LEVEL SECURITY;

-- Drop all policies on players
DROP POLICY IF EXISTS "Players can view their own profile" ON players;
DROP POLICY IF EXISTS "Players can update their own profile" ON players;
DROP POLICY IF EXISTS "players_select_policy" ON players;
DROP POLICY IF EXISTS "players_insert_policy" ON players;
DROP POLICY IF EXISTS "players_update_policy" ON players;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON players;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON players;

-- Drop all policies on matches
DROP POLICY IF EXISTS "team_matches_select_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_insert_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_update_policy" ON matches;
DROP POLICY IF EXISTS "team_matches_delete_policy" ON matches;
DROP POLICY IF EXISTS "Players see only their team's matches" ON matches;
DROP POLICY IF EXISTS "Players can view their team matches" ON matches;

-- Drop all policies on training_sessions
DROP POLICY IF EXISTS "training_sessions_select_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_insert_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_update_policy" ON training_sessions;
DROP POLICY IF EXISTS "training_sessions_delete_policy" ON training_sessions;
DROP POLICY IF EXISTS "Players see accessible trainings" ON training_sessions;

-- Drop all policies on training_attendance
DROP POLICY IF EXISTS "training_attendance_select_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_insert_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_update_policy" ON training_attendance;
DROP POLICY IF EXISTS "training_attendance_delete_policy" ON training_attendance;

-- Drop all policies on match_availability
DROP POLICY IF EXISTS "match_availability_select_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_insert_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_update_policy" ON match_availability;
DROP POLICY IF EXISTS "match_availability_delete_policy" ON match_availability;

-- Create simple safe policies for players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_all" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert_own" ON players FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "players_update_own" ON players FOR UPDATE USING (user_id = auth.uid());

-- Create simple safe policies for matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_auth" ON matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "matches_update_auth" ON matches FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "matches_delete_auth" ON matches FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create simple safe policies for training_sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_select_all" ON training_sessions FOR SELECT USING (true);
CREATE POLICY "training_insert_auth" ON training_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "training_update_auth" ON training_sessions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "training_delete_auth" ON training_sessions FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create simple safe policies for training_attendance
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_all" ON training_attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert_auth" ON training_attendance FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_update_auth" ON training_attendance FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_delete_auth" ON training_attendance FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create simple safe policies for match_availability
ALTER TABLE match_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select_all" ON match_availability FOR SELECT USING (true);
CREATE POLICY "availability_insert_auth" ON match_availability FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "availability_update_auth" ON match_availability FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "availability_delete_auth" ON match_availability FOR DELETE USING (auth.uid() IS NOT NULL);

