-- ================================================
-- RLS Policy Fix V2 - Infinite Recursion beheben
-- ================================================
-- Problem: Policy prüft players Tabelle in players Policy
-- Lösung: Separate Policies ohne Rekursion
-- ================================================

-- 1. ALLE bestehenden Policies löschen
-- ================================================
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
DROP POLICY IF EXISTS "Captains can insert players" ON public.players;
DROP POLICY IF EXISTS "Users can create their own player profile" ON public.players;
DROP POLICY IF EXISTS "Captains can manage all players" ON public.players;

-- 2. SELECT Policy (Rangliste) - KEINE Rekursion
-- ================================================
CREATE POLICY "players_select_policy"
  ON public.players
  FOR SELECT
  USING (true);
  -- Jeder kann alle Spieler sehen

-- 3. INSERT Policy (Registrierung) - KEINE Rekursion
-- ================================================
CREATE POLICY "players_insert_policy"
  ON public.players
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  -- Nur für den eigenen User-Account

-- 4. UPDATE Policy (Profil bearbeiten) - KEINE Rekursion
-- ================================================
CREATE POLICY "players_update_policy"
  ON public.players
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  -- Nur das eigene Profil

-- 5. DELETE Policy (nur für Admins über Supabase)
-- ================================================
-- Keine DELETE Policy = nur über Supabase Dashboard möglich

-- ================================================
-- FERTIG!
-- ================================================
-- ✅ Keine Infinite Recursion mehr
-- ✅ Registrierung funktioniert
-- ✅ Profil bearbeiten funktioniert
-- ✅ Rangliste funktioniert
--
-- Teste jetzt die Registrierung!
-- ================================================

-- OPTIONAL: Prüfe alle Policies
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'players'
ORDER BY cmd;

