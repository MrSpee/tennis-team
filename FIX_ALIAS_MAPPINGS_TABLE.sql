-- ==========================================
-- FIX: alias_mappings Tabelle korrigieren
-- ==========================================
-- Falls die Tabelle bereits existiert, führt dies die nötigen Korrekturen durch

-- PRÜFE OB TABELLE EXISTIERT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alias_mappings') THEN
        
        RAISE NOTICE 'Tabelle alias_mappings existiert bereits. Starte Korrektur...';
        
        -- 1. Lösche alte fehlerhafte Constraint (falls vorhanden)
        ALTER TABLE alias_mappings 
        DROP CONSTRAINT IF EXISTS alias_mappings_entity_type_raw_alias_scope_key;
        
        -- Entferne alte Indizes (falls vorhanden)
        DROP INDEX IF EXISTS idx_alias_mappings_unique;
        DROP INDEX IF EXISTS idx_alias_mappings_unique_null_scope;
        
        -- 2. Ändere scope Spalte: NULL → DEFAULT ''
        ALTER TABLE alias_mappings 
        ALTER COLUMN scope SET DEFAULT '';
        
        -- Setze alle NULL-Werte auf ''
        UPDATE alias_mappings 
        SET scope = '' 
        WHERE scope IS NULL;
        
        -- Mache scope NOT NULL (nachdem alle NULL zu '' wurden)
        ALTER TABLE alias_mappings 
        ALTER COLUMN scope SET NOT NULL,
        ALTER COLUMN scope SET DEFAULT '';
        
        -- 3. Füge korrekte UNIQUE Constraint hinzu
        ALTER TABLE alias_mappings 
        ADD CONSTRAINT alias_mappings_unique 
        UNIQUE(entity_type, raw_alias, scope);
        
        RAISE NOTICE '✅ Tabelle alias_mappings korrigiert!';
        
    ELSE
        RAISE NOTICE 'Tabelle alias_mappings existiert noch nicht. Erstelle sie neu...';
        
        -- Erstelle Tabelle neu (aus CREATE_MATCHDAY_IMPORT_SYSTEM.sql)
        CREATE TABLE alias_mappings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('club', 'team', 'league', 'venue')),
            raw_alias TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            mapped_to_id UUID,
            scope VARCHAR(50) DEFAULT '', -- DEFAULT '' statt NULL
            usage_count INTEGER DEFAULT 1,
            last_used_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT alias_mappings_unique 
                UNIQUE(entity_type, raw_alias, scope)
        );
        
        RAISE NOTICE '✅ Tabelle alias_mappings erstellt!';
    END IF;
END $$;

-- 4. Aktualisiere die update_alias_usage Funktion
CREATE OR REPLACE FUNCTION update_alias_usage(
    p_entity_type VARCHAR,
    p_raw_alias TEXT,
    p_mapped_to_id UUID,
    p_scope VARCHAR DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO alias_mappings (entity_type, raw_alias, normalized_name, mapped_to_id, scope, usage_count)
    VALUES (
        p_entity_type,
        p_raw_alias,
        (SELECT name FROM club_info WHERE id = p_mapped_to_id LIMIT 1), -- TODO: Dynamisch je nach entity_type
        p_mapped_to_id,
        COALESCE(p_scope, ''), -- Stelle sicher, dass NULL zu '' wird
        1
    )
    ON CONFLICT (entity_type, raw_alias, scope)
    DO UPDATE SET
        usage_count = alias_mappings.usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW();
END;
$$;

-- 5. Prüfe das Ergebnis
SELECT 
    'alias_mappings Tabelle Status' as info,
    COUNT(*) as eintraege,
    COUNT(DISTINCT entity_type || raw_alias || scope) as unique_combinations
FROM alias_mappings;

SELECT '✅ Fix abgeschlossen!' as status;


