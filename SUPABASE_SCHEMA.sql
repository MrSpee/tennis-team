-- ================================================
-- Tennis Team Organizer - Supabase Database Schema
-- ================================================
-- Kopieren Sie diesen kompletten Code in den Supabase SQL Editor
-- und führen Sie ihn aus (Run ▶️)
-- ================================================

-- 1. PLAYERS TABLE (Spieler-Stammdaten)
-- ================================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  ranking TEXT, -- z.B. "LK 8", "LK 10"
  points INTEGER DEFAULT 0, -- Ranglistenpunkte
  role TEXT DEFAULT 'player', -- 'player' oder 'captain'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_points ON public.players(points DESC);


-- 2. MATCHES TABLE (Mannschaftsspiele)
-- ================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  opponent TEXT NOT NULL,
  location TEXT NOT NULL, -- 'Home' oder 'Away'
  season TEXT DEFAULT 'winter', -- 'winter' oder 'summer'
  players_needed INTEGER DEFAULT 4,
  created_by UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für Datums-Abfragen
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_season ON public.matches(season);


-- 3. MATCH AVAILABILITY (Spieler-Verfügbarkeit)
-- ================================================
CREATE TABLE IF NOT EXISTS public.match_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'maybe', 'unavailable')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id) -- Ein Spieler kann nur einmal pro Match antworten
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_availability_match ON public.match_availability(match_id);
CREATE INDEX IF NOT EXISTS idx_availability_player ON public.match_availability(player_id);


-- 4. LEAGUE STANDINGS (Tabelle)
-- ================================================
CREATE TABLE IF NOT EXISTS public.league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  season TEXT DEFAULT 'winter',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_standings_position ON public.league_standings(position);


-- 5. PLAYER PROFILES (Erweiterte Profildaten)
-- ================================================
CREATE TABLE IF NOT EXISTS public.player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  preferred_position TEXT, -- z.B. "Einzel", "Doppel"
  availability_notes TEXT, -- Generelle Verfügbarkeit
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 6. TEAM INFO (Mannschafts- und Liga-Zuordnung)
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


-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================
-- Aktiviert Sicherheit auf Zeilen-Ebene

-- Enable RLS on all tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_info ENABLE ROW LEVEL SECURITY;


-- PLAYERS Policies
-- Jeder kann alle Spieler sehen (für Rangliste)
CREATE POLICY "Anyone can view players"
  ON public.players FOR SELECT
  USING (true);

-- Spieler können nur ihr eigenes Profil bearbeiten
CREATE POLICY "Players can update own profile"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id);

-- Nur Captains können neue Spieler erstellen
CREATE POLICY "Captains can insert players"
  ON public.players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND role = 'captain'
    )
  );


-- MATCHES Policies
-- Jeder kann Matches sehen
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

-- Nur Captains können Matches erstellen/bearbeiten/löschen
CREATE POLICY "Captains can manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND role = 'captain'
    )
  );


-- MATCH AVAILABILITY Policies
-- Jeder kann Verfügbarkeit sehen
CREATE POLICY "Anyone can view availability"
  ON public.match_availability FOR SELECT
  USING (true);

-- Spieler können ihre eigene Verfügbarkeit setzen
CREATE POLICY "Players can set own availability"
  ON public.match_availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND id = player_id
    )
  );

-- Spieler können ihre eigene Verfügbarkeit aktualisieren
CREATE POLICY "Players can update own availability"
  ON public.match_availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND id = player_id
    )
  );


-- LEAGUE STANDINGS Policies
-- Jeder kann Tabelle sehen
CREATE POLICY "Anyone can view standings"
  ON public.league_standings FOR SELECT
  USING (true);

-- Nur Captains können Tabelle bearbeiten
CREATE POLICY "Captains can manage standings"
  ON public.league_standings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND role = 'captain'
    )
  );


-- PLAYER PROFILES Policies
-- Spieler können nur ihr eigenes erweiteres Profil sehen
CREATE POLICY "Players can view own profile"
  ON public.player_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND id = player_id
    )
  );

-- Spieler können ihr eigenes Profil bearbeiten
CREATE POLICY "Players can update own profile"
  ON public.player_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND id = player_id
    )
  );


-- TEAM INFO Policies
-- Alle können Team-Info sehen
CREATE POLICY "Anyone can view team info"
  ON public.team_info FOR SELECT
  USING (true);

-- Nur Captains können Team-Info bearbeiten
CREATE POLICY "Captains can manage team info"
  ON public.team_info FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE user_id = auth.uid() AND role = 'captain'
    )
  );


-- ================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ================================================
-- Erstellt Trigger für automatische updated_at Aktualisierung

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für alle Tabellen
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON public.match_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standings_updated_at BEFORE UPDATE ON public.league_standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_info_updated_at BEFORE UPDATE ON public.team_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================
-- SAMPLE DATA (Optional - für Testing)
-- ================================================
-- Kommentieren Sie die folgenden Zeilen aus, wenn Sie Testdaten wollen

-- Testdaten: Liga-Tabelle
INSERT INTO public.league_standings (position, team_name, matches_played, wins, losses, points, season)
VALUES
  (1, 'TC Blau-Weiß Augsburg', 8, 7, 1, 14, 'winter'),
  (2, 'Your Team', 8, 5, 3, 10, 'winter'),
  (3, 'TC Grün-Weiß München', 8, 5, 3, 10, 'winter'),
  (4, 'SV Rosenheim Tennis', 8, 4, 4, 8, 'winter'),
  (5, 'TSV Unterhaching', 8, 3, 5, 6, 'winter'),
  (6, 'TC Rot-Weiß Ingolstadt', 8, 0, 8, 0, 'winter')
ON CONFLICT DO NOTHING;


-- ================================================
-- SUCCESS!
-- ================================================
-- ✅ Datenbank-Schema erfolgreich erstellt!
-- ✅ Row Level Security aktiviert
-- ✅ Automatische Timestamps eingerichtet
-- ✅ Testdaten hinzugefügt
--
-- Nächster Schritt: Konfigurieren Sie die .env Datei in Ihrer App
-- ================================================

