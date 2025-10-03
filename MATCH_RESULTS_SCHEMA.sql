-- Tabelle für Spielergebnisse
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE UNIQUE,
  home_score INTEGER, -- Unser Ergebnis (falls Home)
  away_score INTEGER, -- Gegner Ergebnis
  result TEXT CHECK (result IN ('win', 'loss', 'draw')), -- Ergebnis
  notes TEXT, -- Notizen zum Spiel
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS deaktivieren
ALTER TABLE public.match_results DISABLE ROW LEVEL SECURITY;

-- Test
SELECT * FROM public.match_results;
