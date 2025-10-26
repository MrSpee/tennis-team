-- MULTI-TEAM FILTERING SYSTEM SETUP
-- Erweitert das aktuelle System für zukünftige Liga-Übersichten

-- 1. Erstelle eine Liga-Tabelle für bessere Organisation
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50),
  level VARCHAR(20), -- z.B. 'Kreisklasse', 'Bezirksklasse', 'Landesliga'
  season VARCHAR(20) NOT NULL, -- z.B. 'winter_25_26'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Erweitere team_info um Liga-Zuordnung
ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

-- 3. Erstelle eine Liga-Mitgliedschaft-Tabelle (für zukünftige Liga-Übersichten)
CREATE TABLE IF NOT EXISTS league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  team_id UUID NOT NULL REFERENCES team_info(id),
  season VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, team_id, season)
);

-- 4. Erstelle eine Spieler-Liga-Zugriff-Tabelle (für zukünftige Features)
CREATE TABLE IF NOT EXISTS player_league_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  access_type VARCHAR(20) DEFAULT 'view', -- 'view', 'admin', 'captain'
  granted_by UUID REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, league_id)
);

-- 5. Erstelle Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_team_info_league_id ON team_info(league_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_league_team ON league_memberships(league_id, team_id);
CREATE INDEX IF NOT EXISTS idx_player_league_access_player_league ON player_league_access(player_id, league_id);

-- 6. Erstelle eine View für erweiterte Match-Filterung
CREATE OR REPLACE VIEW matches_with_league_info AS
SELECT 
  m.*,
  ti.club_name,
  ti.team_name,
  ti.category,
  ti.league_id,
  l.name as league_name,
  l.region as league_region,
  l.level as league_level
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
LEFT JOIN leagues l ON ti.league_id = l.id;

-- 7. Erstelle eine Funktion für intelligente Match-Filterung
CREATE OR REPLACE FUNCTION get_player_matches(
  p_player_id UUID,
  p_include_league_matches BOOLEAN DEFAULT false,
  p_league_id UUID DEFAULT NULL
)
RETURNS TABLE (
  match_id UUID,
  opponent VARCHAR(100),
  match_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(20),
  team_id UUID,
  club_name VARCHAR(100),
  team_name VARCHAR(100),
  league_name VARCHAR(100),
  access_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH player_teams AS (
    SELECT pt.team_id
    FROM player_teams pt
    WHERE pt.player_id = p_player_id
  ),
  player_league_access AS (
    SELECT pla.league_id, pla.access_type
    FROM player_league_access pla
    WHERE pla.player_id = p_player_id
  )
  SELECT 
    m.id as match_id,
    m.opponent,
    m.match_date,
    m.location,
    m.team_id,
    ti.club_name,
    ti.team_name,
    l.name as league_name,
    CASE 
      WHEN pt.team_id IS NOT NULL THEN 'own_team'
      WHEN pla.access_type IS NOT NULL THEN pla.access_type
      ELSE 'no_access'
    END as access_type
  FROM matches m
  JOIN team_info ti ON m.team_id = ti.id
  LEFT JOIN leagues l ON ti.league_id = l.id
  LEFT JOIN player_teams pt ON m.team_id = pt.team_id
  LEFT JOIN player_league_access pla ON ti.league_id = pla.league_id
  WHERE 
    -- Eigene Teams (aktuelles Verhalten)
    pt.team_id IS NOT NULL
    OR 
    -- Liga-Zugriff (zukünftiges Feature)
    (p_include_league_matches = true AND pla.access_type IS NOT NULL)
    OR
    -- Spezifische Liga (für Liga-Übersichten)
    (p_league_id IS NOT NULL AND ti.league_id = p_league_id);
END;
$$ LANGUAGE plpgsql;

-- 8. Erstelle Beispiel-Liga für Sürth
INSERT INTO leagues (id, name, region, level, season, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Kreisklasse Köln', 'Köln', 'Kreisklasse', 'winter_25_26', true)
ON CONFLICT DO NOTHING;

-- 9. Weise Sürth der Liga zu
UPDATE team_info 
SET league_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 40';

-- 10. Erstelle Liga-Mitgliedschaft
INSERT INTO league_memberships (league_id, team_id, season) VALUES
('550e8400-e29b-41d4-a716-446655440000', 
 (SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth' AND team_name = 'Herren 40'),
 'winter_25_26')
ON CONFLICT DO NOTHING;

-- 11. Teste das neue System
SELECT 
  'TEST: Neue Liga-Struktur' as info,
  l.name as league_name,
  l.region,
  l.level,
  ti.club_name,
  ti.team_name,
  COUNT(m.id) as match_count
FROM leagues l
JOIN team_info ti ON ti.league_id = l.id
LEFT JOIN matches m ON m.team_id = ti.id
WHERE l.name = 'Kreisklasse Köln'
GROUP BY l.name, l.region, l.level, ti.club_name, ti.team_name;
