-- ========================================
-- LIVE RESULTS SYSTEM SETUP
-- ========================================
-- Dieses Script erstellt alle notwendigen Tabellen für das Live-Ergebnis-System

-- 1. OPPONENT PLAYERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS opponent_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name VARCHAR(255) NOT NULL,
  team_id VARCHAR(100), -- z.B. TVM-ID für eindeutige Identifikation
  position INTEGER NOT NULL, -- Position in der Mannschaft (1-6)
  name VARCHAR(255) NOT NULL,
  lk VARCHAR(10), -- Leistungsklasse (z.B. "LK4", "LK5")
  id_nr VARCHAR(50), -- TVM-ID des Spielers
  info TEXT, -- Zusätzliche Infos
  mf VARCHAR(10), -- M/F für Geschlecht
  nation VARCHAR(3) DEFAULT 'GER', -- Nationalität
  season VARCHAR(20) NOT NULL DEFAULT '2024/25', -- Saison
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MATCH RESULTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL, -- Match-Nummer (1-6) - wird in der App verwaltet
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('Einzel', 'Doppel')),
  
  -- Einzel-Spieler
  home_player_id UUID REFERENCES players(id),
  guest_player_id UUID, -- Referenz auf opponent_players
  
  -- Doppel-Spieler
  home_player1_id UUID REFERENCES players(id),
  home_player2_id UUID REFERENCES players(id),
  guest_player1_id UUID, -- Referenz auf opponent_players
  guest_player2_id UUID, -- Referenz auf opponent_players
  
  -- Sätze und Ergebnisse
  set1_home INTEGER,
  set1_guest INTEGER,
  set2_home INTEGER,
  set2_guest INTEGER,
  set3_home INTEGER, -- Match-Tiebreak (bis 10)
  set3_guest INTEGER,
  
  -- Match-Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  winner VARCHAR(10) CHECK (winner IN ('home', 'guest')),
  
  -- Kommentare und Notizen
  comment TEXT,
  entered_by UUID REFERENCES players(id),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_einzel_players CHECK (
    (match_type = 'Einzel' AND home_player_id IS NOT NULL AND guest_player_id IS NOT NULL AND 
     home_player1_id IS NULL AND home_player2_id IS NULL AND guest_player1_id IS NULL AND guest_player2_id IS NULL)
    OR
    (match_type = 'Doppel' AND home_player1_id IS NOT NULL AND home_player2_id IS NOT NULL AND 
     guest_player1_id IS NOT NULL AND guest_player2_id IS NOT NULL AND
     home_player_id IS NULL AND guest_player_id IS NULL)
  )
);

-- 3. INDICES FÜR PERFORMANCE
-- ========================================
-- Opponent Players
CREATE INDEX IF NOT EXISTS idx_opponent_players_team ON opponent_players(team_name, season);
CREATE INDEX IF NOT EXISTS idx_opponent_players_position ON opponent_players(team_name, position, season);

-- Match Results
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_type ON match_results(match_type);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);

-- 4. ROW LEVEL SECURITY (RLS)
-- ========================================
-- Opponent Players
ALTER TABLE opponent_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON opponent_players
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for admins" ON opponent_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.user_id = auth.uid() 
      AND players.role = 'admin'
    )
  );

-- Match Results
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON match_results
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON match_results
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      entered_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM players 
        WHERE players.user_id = auth.uid() 
        AND players.role = 'admin'
      )
    )
  );

-- 5. TRIGGER FÜR UPDATED_AT
-- ========================================
-- Opponent Players
CREATE OR REPLACE FUNCTION update_opponent_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opponent_players_updated_at
  BEFORE UPDATE ON opponent_players
  FOR EACH ROW
  EXECUTE FUNCTION update_opponent_players_updated_at();

-- Match Results
CREATE OR REPLACE FUNCTION update_match_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_results_updated_at
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_match_results_updated_at();

-- 6. FUNKTION FÜR AUTOMATISCHE GEWINNER-BERECHNUNG
-- ========================================
CREATE OR REPLACE FUNCTION calculate_match_winner()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur berechnen wenn alle Sätze eingegeben sind
  IF NEW.set1_home IS NOT NULL AND NEW.set1_guest IS NOT NULL AND
     NEW.set2_home IS NOT NULL AND NEW.set2_guest IS NOT NULL AND
     NEW.set3_home IS NOT NULL AND NEW.set3_guest IS NOT NULL THEN
     
    -- Zähle gewonnene Sätze
    DECLARE
      home_sets INTEGER := 0;
      guest_sets INTEGER := 0;
    BEGIN
      -- Satz 1
      IF NEW.set1_home > NEW.set1_guest THEN
        home_sets := home_sets + 1;
      ELSE
        guest_sets := guest_sets + 1;
      END IF;
      
      -- Satz 2
      IF NEW.set2_home > NEW.set2_guest THEN
        home_sets := home_sets + 1;
      ELSE
        guest_sets := guest_sets + 1;
      END IF;
      
      -- Satz 3 (Match-Tiebreak)
      IF NEW.set3_home > NEW.set3_guest THEN
        home_sets := home_sets + 1;
      ELSE
        guest_sets := guest_sets + 1;
      END IF;
      
      -- Gewinner bestimmen
      IF home_sets >= 2 THEN
        NEW.winner := 'home';
        NEW.status := 'completed';
      ELSIF guest_sets >= 2 THEN
        NEW.winner := 'guest';
        NEW.status := 'completed';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_match_winner
  BEFORE INSERT OR UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_match_winner();

-- ========================================
-- SETUP ABGESCHLOSSEN
-- ========================================
-- Die Tabellen sind jetzt bereit für:
-- 1. Import der Gegner-Spieler-Daten
-- 2. Eingabe der Live-Ergebnisse
-- 3. Automatische Gewinner-Berechnung
