-- UNIFIED PLAYER SYSTEM MIGRATION
-- Phase 1: Erstelle neue Tabellen-Struktur

-- 1. Erstelle neue players_unified Tabelle
CREATE TABLE players_unified (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- App-Integration (optional)
  user_id UUID REFERENCES auth.users(id), -- NULL für externe Spieler
  
  -- Grunddaten
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100), -- NULL für externe Spieler
  phone VARCHAR(20),
  
  -- Tennis-Daten (vereinheitlicht)
  current_lk VARCHAR(10), -- z.B. "LK 12.3" - konvertiert von numeric
  season_start_lk VARCHAR(10),
  ranking VARCHAR(10),
  points INTEGER DEFAULT 0,
  
  -- Spieler-Typ
  player_type VARCHAR(20) DEFAULT 'app_user', -- 'app_user', 'external', 'opponent'
  
  -- Zusätzliche Felder aus opponent_players
  tvm_id VARCHAR(50), -- TVM-ID für externe Spieler
  info TEXT, -- Zusätzliche Informationen
  is_captain BOOLEAN DEFAULT false,
  nation VARCHAR(50),
  position INTEGER, -- Position im Team
  
  -- Team-Zugehörigkeit (optional, wird durch team_memberships ersetzt)
  primary_team_id UUID REFERENCES team_info(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Erstelle team_memberships Tabelle (vereinfacht)
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players_unified(id),
  team_id UUID REFERENCES team_info(id),
  
  -- Rolle im Team
  role VARCHAR(20) DEFAULT 'player', -- 'player', 'captain', 'coach'
  is_primary BOOLEAN DEFAULT false,
  
  -- Saison-spezifisch
  season VARCHAR(20), -- 'winter_25_26', 'summer_26'
  is_active BOOLEAN DEFAULT true,
  
  -- Zusätzliche Felder aus player_teams
  approved_by UUID REFERENCES players_unified(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(player_id, team_id, season)
);

-- 3. Erstelle match_participants Tabelle (für zukünftige Match-Details)
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  
  -- Spieler-Referenz (einheitlich)
  player_id UUID REFERENCES players_unified(id),
  
  -- Position im Match
  position VARCHAR(20), -- 'home_player1', 'home_player2', 'guest_player1', 'guest_player2'
  match_type VARCHAR(20), -- 'Einzel', 'Doppel'
  
  -- Match-spezifische Daten
  sets_won INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Erstelle Indizes für Performance
CREATE INDEX idx_players_unified_user_id ON players_unified(user_id);
CREATE INDEX idx_players_unified_player_type ON players_unified(player_type);
CREATE INDEX idx_players_unified_is_active ON players_unified(is_active);
CREATE INDEX idx_team_memberships_player_id ON team_memberships(player_id);
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_player_id ON match_participants(player_id);

-- 5. Erstelle Views für Backward Compatibility (temporär)
CREATE VIEW players_legacy AS
SELECT 
  id,
  user_id,
  name,
  email,
  phone,
  current_lk,
  season_start_lk,
  ranking,
  points,
  is_active,
  created_at,
  updated_at
FROM players_unified
WHERE player_type = 'app_user';

CREATE VIEW opponent_players_legacy AS
SELECT 
  id,
  primary_team_id as team_id, -- Verwende primary_team_id als team_id
  position,
  name,
  CASE 
    WHEN current_lk IS NOT NULL THEN 
      CAST(REPLACE(current_lk, 'LK ', '') AS numeric)
    ELSE NULL
  END as lk, -- Konvertiere zurück zu numeric für Kompatibilität
  tvm_id,
  info,
  is_captain,
  nation,
  is_active,
  created_at,
  updated_at
FROM players_unified
WHERE player_type = 'opponent';

-- 6. Kommentare für Dokumentation
COMMENT ON TABLE players_unified IS 'Unified player system - combines app users and opponents';
COMMENT ON COLUMN players_unified.player_type IS 'Type: app_user, external, opponent';
COMMENT ON COLUMN players_unified.current_lk IS 'Current Leistungsklasse as VARCHAR (e.g., LK 12.3)';
COMMENT ON TABLE team_memberships IS 'Simplified team membership system';
COMMENT ON TABLE match_participants IS 'Unified match participation system';
