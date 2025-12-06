-- Erstelle team_roster Tabelle für Meldelisten-Spieler
-- Diese Tabelle speichert die Spieler aus den nuLiga Meldelisten mit ihrem Rang

CREATE TABLE IF NOT EXISTS team_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES team_info(id) ON DELETE CASCADE,
  season TEXT NOT NULL, -- z.B. "Winter 2025/26"
  rank INTEGER NOT NULL, -- Rang in der Meldeliste (1, 2, 3, ...)
  player_name TEXT NOT NULL, -- Name des Spielers
  lk TEXT, -- Leistungsklasse (z.B. "LK 12.3")
  tvm_id TEXT, -- TVM-ID des Spielers (falls vorhanden)
  birth_year INTEGER, -- Geburtsjahr
  singles_record TEXT, -- Einzel-Bilanz (z.B. "2:1")
  doubles_record TEXT, -- Doppel-Bilanz (z.B. "0:2")
  total_record TEXT, -- Gesamt-Bilanz (z.B. "2:3")
  player_id UUID REFERENCES players_unified(id) ON DELETE SET NULL, -- Optional: Verknüpfung zu players_unified
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Eindeutigkeit: Ein Spieler kann nur einmal pro Team/Saison/Rang vorkommen
  UNIQUE(team_id, season, rank),
  
  -- Constraint: Rang muss positiv sein
  CONSTRAINT team_roster_rank_check CHECK (rank > 0)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_team_roster_team_season ON team_roster(team_id, season);
CREATE INDEX IF NOT EXISTS idx_team_roster_player_id ON team_roster(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_roster_tvm_id ON team_roster(tvm_id) WHERE tvm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_roster_player_name ON team_roster(player_name);

-- Kommentare
COMMENT ON TABLE team_roster IS 'Speichert die Meldelisten-Spieler für Teams pro Saison mit Rang';
COMMENT ON COLUMN team_roster.rank IS 'Rang in der Meldeliste (1 = bester Spieler)';
COMMENT ON COLUMN team_roster.player_id IS 'Optional: Verknüpfung zu players_unified wenn Spieler in unserer DB existiert';

-- Row Level Security (RLS)
ALTER TABLE team_roster ENABLE ROW LEVEL SECURITY;

-- Policies: Öffentlicher Lese-Zugriff, authentifizierte User können schreiben
CREATE POLICY "Public can read team_roster"
  ON team_roster FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert team_roster"
  ON team_roster FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update team_roster"
  ON team_roster FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete team_roster"
  ON team_roster FOR DELETE
  USING (auth.role() = 'authenticated');

