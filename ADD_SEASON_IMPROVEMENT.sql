-- Füge season_improvement Feld zur players Tabelle hinzu (falls noch nicht vorhanden)
-- Speichert die Verbesserung/Verschlechterung der LK seit Saisonbeginn
-- Negativ = Verbesserung (z.B. -0.3 = um 0.3 LK verbessert, 16.8 - 17.1 = -0.3)
-- Positiv = Verschlechterung (z.B. +0.5 = um 0.5 LK schlechter, 17.6 - 17.1 = +0.5)

-- Spalten hinzufügen (falls noch nicht vorhanden)
DO $$ 
BEGIN
    -- season_improvement
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'season_improvement'
    ) THEN
        ALTER TABLE players ADD COLUMN season_improvement REAL DEFAULT 0.0;
    END IF;
    
    -- last_lk_update (Zeitstempel der letzten LK-Änderung)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'last_lk_update'
    ) THEN
        ALTER TABLE players ADD COLUMN last_lk_update TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Kommentare für die Spalten
COMMENT ON COLUMN players.season_improvement IS 'Differenz: current_lk - season_start_lk. Negativ = Verbesserung, Positiv = Verschlechterung';
COMMENT ON COLUMN players.last_lk_update IS 'Zeitstempel der letzten LK-Berechnung/Änderung';

-- Überprüfe das Ergebnis (sortiert nach Verbesserung, beste zuerst)
SELECT id, name, season_start_lk, current_lk, season_improvement, last_lk_update
FROM players 
WHERE is_active = true 
ORDER BY season_improvement ASC;


