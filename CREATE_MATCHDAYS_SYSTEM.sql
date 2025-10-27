-- ==========================================
-- MATCHDAYS SYSTEM MIGRATION
-- ==========================================
-- Erstellt die neue matchdays Tabelle und migriert Daten

-- STEP 1: Erstelle matchdays Tabelle (wenn nicht vorhanden)
CREATE TABLE IF NOT EXISTS matchdays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team_id UUID NOT NULL REFERENCES team_info(id),
    away_team_id UUID NOT NULL REFERENCES team_info(id),
    match_date TIMESTAMPTZ NOT NULL,
    start_time VARCHAR(50),
    venue VARCHAR(255),
    address TEXT,
    location VARCHAR(50) CHECK (location IN ('Home', 'Away')),
    season VARCHAR(50),
    league VARCHAR(255),
    group_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    final_score VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Füge matchday_id zu match_results hinzu (falls nicht vorhanden)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_results' AND column_name = 'matchday_id'
    ) THEN
        ALTER TABLE match_results 
        ADD COLUMN matchday_id UUID REFERENCES matchdays(id);
    END IF;
END $$;

-- STEP 3: Migriere Daten NUR wenn matchdays leer ist
DO $$
DECLARE
    matchdays_count INTEGER;
BEGIN
    -- Prüfe ob matchdays bereits Daten hat
    SELECT COUNT(*) INTO matchdays_count FROM matchdays;
    
    IF matchdays_count > 0 THEN
        RAISE NOTICE 'matchdays hat bereits % Einträge - Migration übersprungen', matchdays_count;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Starte Migration von matches zu matchdays...';
    
    -- Migriere mit den TATSÄCHLICH existierenden Feldern aus matches
    -- NUR wenn away_team_id gefunden wurde!
    INSERT INTO matchdays (
        id,
        home_team_id,
        away_team_id,
        match_date,
        venue,
        location,
        season,
        status
    )
    SELECT 
        m.id,
        m.team_id as home_team_id,
        (SELECT id FROM team_info WHERE team_name ILIKE '%' || m.opponent || '%' LIMIT 1) as away_team_id,
        m.match_date,
        m.venue,
        COALESCE(m.location, 'Home') as location,
        COALESCE(m.season, 'winter') as season,
        'scheduled' as status
    FROM matches m
    WHERE m.opponent IS NOT NULL
      AND (SELECT id FROM team_info WHERE team_name ILIKE '%' || m.opponent || '%' LIMIT 1) IS NOT NULL;  -- Nur wenn Team gefunden
    
    RAISE NOTICE 'Daten erfolgreich migriert! % Einträge in matchdays', (SELECT COUNT(*) FROM matchdays);
END $$;

-- STEP 4: Update match_results um matchday_id
UPDATE match_results mr
SET matchday_id = mr.match_id
WHERE mr.matchday_id IS NULL AND mr.match_id IS NOT NULL;

-- STEP 5: Erstelle Index für Performance
CREATE INDEX IF NOT EXISTS idx_matchdays_teams ON matchdays(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_matchdays_date ON matchdays(match_date);
CREATE INDEX IF NOT EXISTS idx_match_results_matchday ON match_results(matchday_id);

-- STEP 6: Anzeige der migrierten Daten
SELECT 
    'Migration erfolgreich!' as status,
    (SELECT COUNT(*) FROM matchdays) as matchdays_count,
    (SELECT COUNT(*) FROM match_results WHERE matchday_id IS NOT NULL) as results_with_matchday;
