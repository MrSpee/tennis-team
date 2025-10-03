-- ALLE Tabellen - RLS KOMPLETT DEAKTIVIEREN

ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_standings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles DISABLE ROW LEVEL SECURITY;

-- Prüfe ob RLS wirklich aus ist
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Sollte bei ALLEN Tabellen "f" (false) zeigen!
