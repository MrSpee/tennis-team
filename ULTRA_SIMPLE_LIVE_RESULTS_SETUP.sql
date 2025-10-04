-- ========================================
-- ULTRA-SIMPLE LIVE RESULTS SYSTEM SETUP
-- ========================================
-- Erstellt die Tabellen ohne CHECK Constraints und FOREIGN KEYs

-- 1. OPPONENT PLAYERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS opponent_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name VARCHAR(255) NOT NULL,
  team_id VARCHAR(100),
  position INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  lk VARCHAR(10),
  id_nr VARCHAR(50),
  info TEXT,
  mf VARCHAR(10),
  nation VARCHAR(3) DEFAULT 'GER',
  season VARCHAR(20) NOT NULL DEFAULT '2024/25',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MATCH RESULTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  match_number INTEGER NOT NULL,
  match_type VARCHAR(20) NOT NULL,
  
  -- Einzel-Spieler
  home_player_id UUID,
  guest_player_id UUID,
  
  -- Doppel-Spieler
  home_player1_id UUID,
  home_player2_id UUID,
  guest_player1_id UUID,
  guest_player2_id UUID,
  
  -- Sätze und Ergebnisse
  set1_home INTEGER,
  set1_guest INTEGER,
  set2_home INTEGER,
  set2_guest INTEGER,
  set3_home INTEGER,
  set3_guest INTEGER,
  
  -- Match-Status
  status VARCHAR(20) DEFAULT 'pending',
  winner VARCHAR(10),
  
  -- Kommentare und Notizen
  comment TEXT,
  entered_by UUID,
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDICES FÜR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_opponent_players_team ON opponent_players(team_name, season);
CREATE INDEX IF NOT EXISTS idx_opponent_players_position ON opponent_players(team_name, position, season);
CREATE INDEX IF NOT EXISTS idx_match_results_match ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_type ON match_results(match_type);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);

-- 4. ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ========================================
-- Kommentiere diese Sektion aus, falls RLS Probleme verursacht

/*
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
*/

-- 5. TRIGGER FÜR UPDATED_AT
-- ========================================
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

-- ========================================
-- SETUP ABGESCHLOSSEN
-- ========================================
-- Die Tabellen sind jetzt bereit für:
-- 1. Import der Gegner-Spieler-Daten
-- 2. Eingabe der Live-Ergebnisse
-- 3. Manuelle Validierung in der App

