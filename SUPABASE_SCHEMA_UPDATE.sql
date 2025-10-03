-- ================================================
-- Tennis Team Organizer - UPDATE für Team Info
-- ================================================
-- Nur die NEUE Tabelle + Policies
-- Führen Sie NUR dieses Script aus, wenn Policies schon existieren
-- ================================================

-- 1. TEAM INFO TABLE erstellen
-- ================================================
CREATE TABLE IF NOT EXISTS public.team_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT, -- z.B. "TC Köln-Sülz Herren 40 I"
  club_name TEXT NOT NULL, -- z.B. "TC Köln-Sülz"
  category TEXT NOT NULL, -- z.B. "Herren 40", "Damen", "Junioren U18"
  league TEXT NOT NULL, -- z.B. "1. Kreisliga", "Bezirksliga"
  group_name TEXT, -- z.B. "Gruppe A", "Staffel Nord"
  region TEXT, -- z.B. "Mittelrhein", "Bayern"
  created_by UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS aktivieren
-- ================================================
ALTER TABLE public.team_info ENABLE ROW LEVEL SECURITY;

-- 3. Policies erstellen (mit IF NOT EXISTS Simulation)
-- ================================================

-- Policy 1: Alle können Team-Info sehen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_info' 
    AND policyname = 'Anyone can view team info'
  ) THEN
    CREATE POLICY "Anyone can view team info"
      ON public.team_info FOR SELECT
      USING (true);
  END IF;
END $$;

-- Policy 2: Nur Captains können bearbeiten
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_info' 
    AND policyname = 'Captains can manage team info'
  ) THEN
    CREATE POLICY "Captains can manage team info"
      ON public.team_info FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.players 
          WHERE user_id = auth.uid() AND role = 'captain'
        )
      );
  END IF;
END $$;

-- 4. Trigger für automatische Timestamps
-- ================================================

-- Prüfe ob Trigger existiert
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_team_info_updated_at'
  ) THEN
    CREATE TRIGGER update_team_info_updated_at 
    BEFORE UPDATE ON public.team_info
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================================
-- SUCCESS!
-- ================================================
-- ✅ Team Info Tabelle erstellt
-- ✅ RLS aktiviert
-- ✅ Policies eingerichtet
-- ✅ Timestamp-Trigger aktiv
--
-- Testen Sie:
-- SELECT * FROM public.team_info;
-- ================================================

