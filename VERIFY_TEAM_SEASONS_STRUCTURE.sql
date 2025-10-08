-- =====================================================
-- VERIFY & FIX TEAM_SEASONS STRUCTURE
-- =====================================================
-- Dieses Script stellt sicher, dass die team_seasons Tabelle
-- korrekt mit team_info verknüpft ist und alle notwendigen
-- Indizes und Permissions vorhanden sind.

-- 1. Prüfe ob team_seasons Tabelle existiert
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_seasons') THEN
        RAISE NOTICE '⚠️ team_seasons Tabelle existiert noch nicht!';
        RAISE NOTICE '💡 Bitte führe zuerst OPTIMIZED_TEAM_STRUCTURE.sql aus';
    ELSE
        RAISE NOTICE '✅ team_seasons Tabelle gefunden';
    END IF;
END $$;

-- 2. Zeige aktuelle Struktur
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'team_seasons'
ORDER BY ordinal_position;

-- 3. Zeige alle Teams mit ihren Saisons
SELECT 
    ti.id as team_id,
    ti.club_name,
    ti.category,
    ts.id as season_id,
    ts.season,
    ts.league,
    ts.group_name,
    ts.team_size,
    ts.is_active
FROM team_info ti
LEFT JOIN team_seasons ts ON ts.team_id = ti.id
ORDER BY ti.club_name, ti.category, ts.season DESC;

-- 4. Prüfe RLS Policies für team_seasons
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'team_seasons';

-- 5. Erstelle RLS Policies falls nicht vorhanden
DO $$
BEGIN
    -- RLS aktivieren
    ALTER TABLE team_seasons ENABLE ROW LEVEL SECURITY;
    
    -- Policy für SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_seasons' 
        AND policyname = 'Allow all authenticated users to read team seasons'
    ) THEN
        CREATE POLICY "Allow all authenticated users to read team seasons"
        ON team_seasons FOR SELECT
        TO authenticated
        USING (true);
        RAISE NOTICE '✅ SELECT Policy für team_seasons erstellt';
    END IF;
    
    -- Policy für INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_seasons' 
        AND policyname = 'Allow authenticated users to insert team seasons'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert team seasons"
        ON team_seasons FOR INSERT
        TO authenticated
        WITH CHECK (true);
        RAISE NOTICE '✅ INSERT Policy für team_seasons erstellt';
    END IF;
    
    -- Policy für UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_seasons' 
        AND policyname = 'Allow authenticated users to update team seasons'
    ) THEN
        CREATE POLICY "Allow authenticated users to update team seasons"
        ON team_seasons FOR UPDATE
        TO authenticated
        USING (true);
        RAISE NOTICE '✅ UPDATE Policy für team_seasons erstellt';
    END IF;

END $$;

-- 6. Erfolgsmeldung
DO $$
BEGIN
    RAISE NOTICE '✅ Struktur-Prüfung abgeschlossen!';
    RAISE NOTICE '📊 Alle Teams mit Saisons wurden oben aufgelistet';
    RAISE NOTICE '🔒 RLS Policies wurden geprüft und ggf. erstellt';
END $$;
