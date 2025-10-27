-- ==========================================
-- CLEAN DATABASE SETUP
-- Tennis Team App - Saubere DB-Struktur
-- ==========================================

-- STEP 1: Lösche alle Match-bezogenen Daten
DO $$
BEGIN
    RAISE NOTICE '🗑️ Lösche alle Match-Daten...';
    
    -- Lösche in korrekter Reihenfolge (Abhängigkeiten beachten)
    DELETE FROM match_availability;
    DELETE FROM match_results;
    DELETE FROM matchdays;
    DELETE FROM matches WHERE id IS NOT NULL;  -- Falls Tabelle noch existiert
    
    RAISE NOTICE '✅ Alle Match-Daten gelöscht';
END $$;

-- STEP 2: Entferne alte Constraints
DO $$
BEGIN
    -- Entferne alte match_id FK falls vorhanden
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_availability_match_id_fkey') THEN
        ALTER TABLE match_availability DROP CONSTRAINT match_availability_match_id_fkey;
        RAISE NOTICE '🗑️ Alten match_id FK entfernt';
    END IF;
END $$;

-- STEP 3: Stelle sicher, dass match_availability.matchday_id existiert
DO $$
BEGIN
    -- Füge matchday_id Spalte hinzu (OHNE FK zuerst)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_availability' AND column_name = 'matchday_id'
    ) THEN
        ALTER TABLE match_availability ADD COLUMN matchday_id UUID;
        RAISE NOTICE '✅ matchday_id Spalte hinzugefügt';
    ELSE
        RAISE NOTICE '✅ matchday_id Spalte existiert bereits';
    END IF;
    
    -- Entferne alte match_id Spalte falls sie noch existiert
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_availability' AND column_name = 'match_id'
    ) THEN
        ALTER TABLE match_availability DROP COLUMN match_id CASCADE;
        RAISE NOTICE '🗑️ Alte match_id Spalte entfernt';
    END IF;
END $$;

-- STEP 4: Stelle sicher, dass match_results.matchday_id existiert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_results' AND column_name = 'matchday_id'
    ) THEN
        ALTER TABLE match_results ADD COLUMN matchday_id UUID REFERENCES matchdays(id);
        RAISE NOTICE '✅ match_results.matchday_id hinzugefügt';
    ELSE
        RAISE NOTICE '✅ match_results.matchday_id existiert bereits';
    END IF;
END $$;

-- STEP 4.5: Füge FK hinzu NACH dem die Spalte existiert
DO $$
BEGIN
    -- Füge FK hinzu (NACH dem matchday_id Spalte existiert)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_availability_matchday_id_fkey'
    ) THEN
        ALTER TABLE match_availability 
        ADD CONSTRAINT match_availability_matchday_id_fkey 
        FOREIGN KEY (matchday_id) REFERENCES matchdays(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ matchday_id FK hinzugefügt';
    ELSE
        RAISE NOTICE '✅ matchday_id FK existiert bereits';
    END IF;
END $$;

-- STEP 5: Erstelle Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_match_availability_matchday ON match_availability(matchday_id);
CREATE INDEX IF NOT EXISTS idx_match_availability_player ON match_availability(player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_matchday ON match_results(matchday_id);
CREATE INDEX IF NOT EXISTS idx_matchdays_teams ON matchdays(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_matchdays_date ON matchdays(match_date);

-- STEP 6: Zusammenfassung
SELECT 
    'Setup abgeschlossen!' as status,
    (SELECT COUNT(*) FROM players_unified) as total_players,
    (SELECT COUNT(*) FROM team_info) as total_teams,
    (SELECT COUNT(*) FROM team_memberships) as total_memberships,
    (SELECT COUNT(*) FROM matchdays) as total_matchdays;

