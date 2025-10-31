-- Füge tvm_id_number Spalte zu players_unified hinzu
-- Diese Spalte speichert die TVM-ID für eindeutige Zuordnung trotz Namensfehlern

-- Prüfe ob Spalte existiert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players_unified' 
        AND column_name = 'tvm_id_number'
    ) THEN
        ALTER TABLE players_unified 
        ADD COLUMN tvm_id_number TEXT;
        
        COMMENT ON COLUMN players_unified.tvm_id_number IS 'TVM-ID für eindeutige Zuordnung trotz Namensfehlern';
        
        RAISE NOTICE 'Spalte tvm_id_number hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte tvm_id_number existiert bereits';
    END IF;
END $$;


