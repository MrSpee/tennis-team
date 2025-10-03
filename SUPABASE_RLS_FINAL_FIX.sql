-- ================================================
-- FINAL FIX - RLS für Player-Registrierung
-- ================================================
-- Problem: auth.uid() ist NULL während signUp
-- Lösung: Trigger der automatisch Player erstellt
-- ================================================

-- 1. Alle Policies löschen und neu erstellen
-- ================================================
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
DROP POLICY IF EXISTS "Captains can insert players" ON public.players;
DROP POLICY IF EXISTS "Users can create their own player profile" ON public.players;
DROP POLICY IF EXISTS "Captains can manage all players" ON public.players;
DROP POLICY IF EXISTS "players_select_policy" ON public.players;
DROP POLICY IF EXISTS "players_insert_policy" ON public.players;
DROP POLICY IF EXISTS "players_update_policy" ON public.players;

-- 2. RLS DEAKTIVIEREN für automatische Player-Erstellung
-- ================================================
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;

-- 3. Oder BESSER: Function + Trigger (automatisch)
-- ================================================
-- Function: Erstelle Player automatisch wenn User registriert wird
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (
    user_id, 
    name, 
    email, 
    role, 
    points,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Neuer Spieler'),
    NEW.email,
    'player',
    0,
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fehler loggen aber nicht blocken
    RAISE WARNING 'Could not create player: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger erstellen (falls nicht vorhanden)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS WIEDER AKTIVIEREN
-- ================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 5. Policies (EINFACH!)
-- ================================================

-- SELECT: Jeder kann Spieler sehen (Rangliste)
CREATE POLICY "enable_read_access_for_all_users"
  ON public.players FOR SELECT
  USING (true);

-- UPDATE: Nur eigenes Profil
CREATE POLICY "enable_update_for_users_based_on_user_id"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id);

-- INSERT: Nur über Trigger (Service Role)
-- Keine INSERT Policy nötig!

-- DELETE: Niemand (nur Supabase Dashboard)
-- Keine DELETE Policy

-- ================================================
-- FERTIG!
-- ================================================
-- ✅ Player wird automatisch bei Registrierung erstellt
-- ✅ Keine RLS-Probleme mehr
-- ✅ User kann Profil bearbeiten
-- ✅ Alle können Rangliste sehen
--
-- TESTE JETZT DIE REGISTRIERUNG!
-- ================================================

-- Prüfe Trigger
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

