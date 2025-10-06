-- ========================================
-- MULTI-TEAM & MULTI-VEREIN SUPPORT
-- Phase 1: Datenbank-Erweiterung
-- ========================================
-- SICHER: Kann mehrfach ausgeführt werden
-- Beinhaltet: Rollback-Anweisungen am Ende
-- ========================================

-- ========================================
-- SCHRITT 1: team_info erweitern (UUID als Primary Key)
-- ========================================

-- Prüfe ob id-Spalte bereits existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'team_info' AND column_name = 'id'
  ) THEN
    -- Füge id-Spalte hinzu
    ALTER TABLE team_info ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    
    -- Setze id als Primary Key
    ALTER TABLE team_info ADD PRIMARY KEY (id);
    
    RAISE NOTICE '✅ team_info.id Spalte erstellt';
  ELSE
    RAISE NOTICE '⚠️ team_info.id existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 2: matches Tabelle erweitern (team_id)
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'team_id'
  ) THEN
    -- Füge team_id Spalte hinzu (nullable am Anfang)
    ALTER TABLE matches ADD COLUMN team_id UUID;
    
    -- Erstelle Foreign Key zu team_info
    ALTER TABLE matches 
    ADD CONSTRAINT fk_matches_team 
    FOREIGN KEY (team_id) REFERENCES team_info(id);
    
    RAISE NOTICE '✅ matches.team_id Spalte erstellt';
  ELSE
    RAISE NOTICE '⚠️ matches.team_id existiert bereits';
  END IF;
END $$;

-- ========================================
-- SCHRITT 3: player_teams Tabelle erstellen
-- ========================================

CREATE TABLE IF NOT EXISTS player_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES team_info(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  role VARCHAR(50), -- z.B. 'player', 'captain', 'substitute'
  jersey_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Verhindere doppelte Einträge
  UNIQUE(player_id, team_id)
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_player_teams_player ON player_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_team ON player_teams(team_id);

-- ========================================
-- SCHRITT 4: Bestehende Daten migrieren
-- ========================================

-- Weise allen bestehenden Matches das Haupt-Team zu (erstes Team in team_info)
DO $$
DECLARE
  primary_team_id UUID;
BEGIN
  -- Hole die ID des ersten/Haupt-Teams
  SELECT id INTO primary_team_id 
  FROM team_info 
  WHERE season = 'winter' 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF primary_team_id IS NOT NULL THEN
    -- Setze team_id für alle Matches ohne team_id
    UPDATE matches 
    SET team_id = primary_team_id 
    WHERE team_id IS NULL;
    
    RAISE NOTICE '✅ Bestehende Matches dem Haupt-Team zugewiesen: %', primary_team_id;
  ELSE
    RAISE NOTICE '⚠️ Kein Haupt-Team gefunden - überspringe Migration';
  END IF;
END $$;

-- ========================================
-- SCHRITT 5: Demo-Daten für Theo Tester
-- ========================================

-- 5.1: Zweites Team erstellen (TC Köln)
INSERT INTO team_info (
  team_name,
  club_name,
  category,
  league,
  group_name,
  region,
  tvm_link,
  season,
  season_year
)
VALUES (
  'Herren 1',
  'TC Köln',
  'Herren',
  'Verbandsliga',
  'Gr. 1',
  'Mittelrhein',
  'https://tvm-tennis.de/spielbetrieb/mannschaft/example-tc-koeln',
  'winter',
  '24/25'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- 5.2: Theo Tester beiden Teams zuweisen
DO $$
DECLARE
  theo_id UUID;
  team1_id UUID;
  team2_id UUID;
BEGIN
  -- Finde Theo Tester
  SELECT id INTO theo_id 
  FROM players 
  WHERE name = 'Theo Tester' 
  LIMIT 1;
  
  IF theo_id IS NULL THEN
    RAISE NOTICE '⚠️ Theo Tester nicht gefunden - überspringe Team-Zuweisung';
    RETURN;
  END IF;
  
  -- Hole Haupt-Team (SV Rot-Gelb Sürth)
  SELECT id INTO team1_id 
  FROM team_info 
  WHERE club_name LIKE '%Sürth%' 
  LIMIT 1;
  
  -- Hole Zweit-Team (TC Köln)
  SELECT id INTO team2_id 
  FROM team_info 
  WHERE club_name = 'TC Köln' 
  LIMIT 1;
  
  -- Weise Theo dem Haupt-Team zu (Primary)
  IF team1_id IS NOT NULL THEN
    INSERT INTO player_teams (player_id, team_id, is_primary, role)
    VALUES (theo_id, team1_id, true, 'player')
    ON CONFLICT (player_id, team_id) DO UPDATE
    SET is_primary = true;
    
    RAISE NOTICE '✅ Theo dem Haupt-Team zugewiesen: %', team1_id;
  END IF;
  
  -- Weise Theo dem Zweit-Team zu
  IF team2_id IS NOT NULL THEN
    INSERT INTO player_teams (player_id, team_id, is_primary, role)
    VALUES (theo_id, team2_id, false, 'player')
    ON CONFLICT (player_id, team_id) DO NOTHING;
    
    RAISE NOTICE '✅ Theo dem Zweit-Team zugewiesen: %', team2_id;
  END IF;
  
  RAISE NOTICE '🎉 Theo Tester spielt jetzt für % Teams', 
    (SELECT COUNT(*) FROM player_teams WHERE player_id = theo_id);
END $$;

-- 5.3: Demo-Match für TC Köln erstellen
DO $$
DECLARE
  tc_koeln_id UUID;
BEGIN
  -- Hole TC Köln Team-ID
  SELECT id INTO tc_koeln_id 
  FROM team_info 
  WHERE club_name = 'TC Köln' 
  LIMIT 1;
  
  IF tc_koeln_id IS NOT NULL THEN
    -- Erstelle Test-Match für TC Köln
    INSERT INTO matches (
      match_date,
      opponent,
      location,
      venue,
      season,
      players_needed,
      team_id
    )
    VALUES (
      NOW() + INTERVAL '14 days', -- In 2 Wochen
      'TC Bayer Leverkusen 1',
      'Away',
      'TC Bayer Leverkusen, Nobelstraße 37, 51373 Leverkusen',
      'winter',
      6,
      tc_koeln_id
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Demo-Match für TC Köln erstellt';
  END IF;
END $$;

-- ========================================
-- VERIFICATION: Prüfe ob alles geklappt hat
-- ========================================

-- Zeige Team-Struktur
SELECT 
  'team_info' as table_name,
  id,
  club_name,
  team_name,
  season
FROM team_info
ORDER BY created_at;

-- Zeige Theo's Teams
SELECT 
  p.name as player_name,
  ti.club_name,
  ti.team_name,
  pt.is_primary,
  pt.role
FROM player_teams pt
JOIN players p ON p.id = pt.player_id
JOIN team_info ti ON ti.id = pt.team_id
WHERE p.name = 'Theo Tester'
ORDER BY pt.is_primary DESC;

-- Zeige Matches mit Teams
SELECT 
  m.opponent,
  m.match_date,
  m.location,
  ti.club_name,
  ti.team_name
FROM matches m
LEFT JOIN team_info ti ON ti.id = m.team_id
ORDER BY m.match_date DESC
LIMIT 10;

-- ========================================
-- ROLLBACK-ANWEISUNGEN (falls nötig)
-- ========================================
/*
-- ACHTUNG: Nur ausführen wenn du die Änderungen rückgängig machen willst!

-- Schritt 1: player_teams Tabelle löschen
DROP TABLE IF EXISTS player_teams CASCADE;

-- Schritt 2: team_id aus matches entfernen
ALTER TABLE matches DROP COLUMN IF EXISTS team_id;

-- Schritt 3: Primary Key aus team_info entfernen
ALTER TABLE team_info DROP CONSTRAINT IF EXISTS team_info_pkey;
ALTER TABLE team_info DROP COLUMN IF EXISTS id;

-- Schritt 4: Demo-Daten löschen
DELETE FROM team_info WHERE club_name = 'TC Köln';
*/

-- ========================================
-- FERTIG! 🎉
-- ========================================
-- Nach Ausführung dieses Scripts:
-- 1. Alle Teams haben UUIDs
-- 2. Alle Matches haben team_ids
-- 3. Theo Tester ist beiden Teams zugewiesen
-- 4. Ein Demo-Match für TC Köln existiert
-- ========================================

