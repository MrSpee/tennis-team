-- ================================================
-- RLS Policy Fix - Spieler-Registrierung erlauben
-- ================================================
-- Führen Sie dieses Script in Supabase SQL Editor aus
-- ================================================

-- 1. Alte restriktive Policy löschen (falls vorhanden)
-- ================================================
DROP POLICY IF EXISTS "Captains can insert players" ON public.players;

-- 2. Neue Policy: Jeder kann sich selbst als Spieler registrieren
-- ================================================
CREATE POLICY "Users can create their own player profile"
  ON public.players
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Policy: Jeder kann alle Spieler sehen (für Rangliste)
-- ================================================
-- Diese sollte schon existieren, aber zur Sicherheit:
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;

CREATE POLICY "Anyone can view players"
  ON public.players 
  FOR SELECT
  USING (true);

-- 4. Policy: Spieler können ihr eigenes Profil bearbeiten
-- ================================================
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;

CREATE POLICY "Players can update own profile"
  ON public.players 
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Policy: Captains können andere Spieler bearbeiten
-- ================================================
CREATE POLICY "Captains can manage all players"
  ON public.players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND role = 'captain'
    )
  );

-- ================================================
-- SUCCESS!
-- ================================================
-- ✅ Neue Spieler können sich registrieren
-- ✅ Alle können Spieler sehen (Rangliste)
-- ✅ Spieler können ihr Profil bearbeiten
-- ✅ Captains können alle Spieler verwalten
--
-- Teste die Registrierung in der App!
-- ================================================

-- OPTIONAL: Prüfe alle Policies
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
WHERE tablename = 'players';

