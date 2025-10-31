-- ==========================================
-- MATCHDAY IMPORT SYSTEM - Datenbankstruktur
-- ==========================================
-- Erstellt Tabellen für KI-gestützten Import von Medenspiel-Übersichten
-- Mit Fuzzy Matching, Review-Workflow und Idempotenz

-- ==========================================
-- 1. IMPORT SESSIONS (Import-Vorgänge)
-- ==========================================
CREATE TABLE IF NOT EXISTS import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quelle & User
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('html', 'pdf', 'text', 'manual')),
    raw_payload TEXT NOT NULL, -- Original-Rohdaten
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Kontext (erkannt durch Parser)
    context_normalized JSONB, -- { club: {...}, team: {...}, league: {...}, season: {...} }
    
    -- Status-Workflow
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'committed', 'rejected')),
    
    -- Metadata
    notes TEXT,
    commit_at TIMESTAMPTZ, -- Wann wurde committed?
    committed_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- 2. IMPORT ENTITIES (Erkannte Entitäten)
-- ==========================================
CREATE TABLE IF NOT EXISTS import_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    
    -- Entity-Typ
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('club', 'team', 'league', 'season', 'venue')),
    
    -- Raw & Normalized
    raw_value TEXT NOT NULL, -- Was wurde im Input gefunden?
    normalized_value TEXT, -- Normalisierte Version
    display_name TEXT, -- Anzeigename für UI
    
    -- Matching
    matched_db_id UUID, -- Referenz zu existierender DB-Entity (z.B. club_info.id)
    match_score NUMERIC(5,2) CHECK (match_score >= 0 AND match_score <= 100), -- Confidence 0-100
    match_type VARCHAR(50), -- 'exact', 'fuzzy', 'manual', 'none'
    
    -- Alternative Matches (für UI-Suggestions)
    alternative_matches JSONB, -- [{ id, name, score }, ...]
    
    -- Status
    status VARCHAR(50) DEFAULT 'needs_review' CHECK (status IN ('auto', 'needs_review', 'confirmed', 'rejected', 'new')),
    
    -- Metadata
    metadata JSONB, -- Zusätzliche Info (z.B. für Club: address, city, website)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, entity_type, raw_value)
);

-- ==========================================
-- 3. IMPORT FIXTURES (Erkannte Spieltage)
-- ==========================================
CREATE TABLE IF NOT EXISTS import_fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    
    -- Raw Data (aus Input geparst)
    raw_date_time TEXT, -- "05.10.2025, 14:00"
    raw_venue TEXT, -- "TG Leverkusen" oder "Marienburger SC"
    raw_home_club TEXT, -- "TG Leverkusen 2"
    raw_away_club TEXT, -- "SV RG Sürth 1"
    raw_result TEXT, -- "1:5", "3:10", "42:63"
    raw_status TEXT, -- "Spielbericht", "offen"
    
    -- Normalized & Matched
    match_date TIMESTAMPTZ, -- Parse aus raw_date_time
    venue_id UUID REFERENCES import_entities(id), -- Referenz zu venue entity
    home_club_id UUID, -- Referenz zu matched club (via import_entities)
    away_club_id UUID,
    home_team_id UUID, -- Referenz zu matched team (via import_entities) → später team_info.id
    away_team_id UUID,
    
    -- Result (wenn vorhanden)
    matchpoints_home INTEGER,
    matchpoints_away INTEGER,
    sets_home INTEGER,
    sets_away INTEGER,
    games_home INTEGER,
    games_away INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
    import_status VARCHAR(50) DEFAULT 'needs_review' CHECK (import_status IN ('auto', 'needs_review', 'confirmed', 'rejected')),
    
    -- Matching Scores
    home_club_score NUMERIC(5,2),
    away_club_score NUMERIC(5,2),
    home_team_score NUMERIC(5,2),
    away_team_score NUMERIC(5,2),
    venue_score NUMERIC(5,2),
    
    -- Row Order (für UI)
    row_order INTEGER,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. IMPORT LOGS (Audit Trail)
-- ==========================================
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    
    step VARCHAR(100) NOT NULL, -- 'parse', 'match_clubs', 'match_teams', 'validate', 'commit'
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
    
    -- Context
    metadata JSONB, -- { entity_type, raw_value, matched_id, score, etc. }
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. ALIAS MAPPINGS (Lernsystem)
-- ==========================================
CREATE TABLE IF NOT EXISTS alias_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Was wurde gemappt
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('club', 'team', 'league', 'venue')),
    raw_alias TEXT NOT NULL, -- z.B. "SV RG Sürth"
    normalized_name TEXT NOT NULL, -- z.B. "SV Rot-Gelb Sürth"
    
    -- Referenz
    mapped_to_id UUID, -- club_info.id, team_info.id, etc.
    
    -- Scope (optional für regionale Aliasse, DEFAULT '' statt NULL)
    scope VARCHAR(50) DEFAULT '', -- z.B. 'Mittelrhein', 'Herren 40' oder '' für global
    
    -- Stats
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique Constraint: entity_type + raw_alias + scope
    CONSTRAINT alias_mappings_unique 
        UNIQUE(entity_type, raw_alias, scope)
);

-- ==========================================
-- 6. INDIZES für Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_by ON import_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON import_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_entities_session ON import_entities(session_id);
CREATE INDEX IF NOT EXISTS idx_import_entities_type ON import_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_import_entities_matched ON import_entities(matched_db_id) WHERE matched_db_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_import_entities_status ON import_entities(status);

CREATE INDEX IF NOT EXISTS idx_import_fixtures_session ON import_fixtures(session_id);
CREATE INDEX IF NOT EXISTS idx_import_fixtures_date ON import_fixtures(match_date);
CREATE INDEX IF NOT EXISTS idx_import_fixtures_teams ON import_fixtures(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_import_fixtures_status ON import_fixtures(import_status);

CREATE INDEX IF NOT EXISTS idx_import_logs_session ON import_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_step ON import_logs(step);

CREATE INDEX IF NOT EXISTS idx_alias_mappings_type_alias ON alias_mappings(entity_type, raw_alias);
CREATE INDEX IF NOT EXISTS idx_alias_mappings_mapped_to ON alias_mappings(mapped_to_id);

-- ==========================================
-- 7. FUNKTION: Logging Helper
-- ==========================================
CREATE OR REPLACE FUNCTION log_import_event(
    p_session_id UUID,
    p_step VARCHAR,
    p_message TEXT,
    p_severity VARCHAR DEFAULT 'info',
    p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO import_logs (session_id, step, message, severity, metadata)
    VALUES (p_session_id, p_step, p_message, p_severity, p_metadata);
END;
$$;

-- ==========================================
-- 8. FUNKTION: Aktualisiere Alias Usage
-- ==========================================
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

-- ==========================================
-- 9. VIEW: Import Session Overview
-- ==========================================
CREATE OR REPLACE VIEW import_session_overview AS
SELECT
    s.id,
    s.source_type,
    s.status,
    s.created_at,
    s.created_by,
    u.email as created_by_email,
    
    -- Entity Counts
    (SELECT COUNT(*) FROM import_entities e WHERE e.session_id = s.id) as entity_count,
    (SELECT COUNT(*) FROM import_entities e WHERE e.session_id = s.id AND e.status = 'auto') as auto_matched_entities,
    (SELECT COUNT(*) FROM import_entities e WHERE e.session_id = s.id AND e.status = 'needs_review') as needs_review_entities,
    
    -- Fixture Counts
    (SELECT COUNT(*) FROM import_fixtures f WHERE f.session_id = s.id) as fixture_count,
    (SELECT COUNT(*) FROM import_fixtures f WHERE f.session_id = s.id AND f.import_status = 'auto') as auto_matched_fixtures,
    (SELECT COUNT(*) FROM import_fixtures f WHERE f.session_id = s.id AND f.import_status = 'needs_review') as needs_review_fixtures,
    
    -- Context
    s.context_normalized,
    s.notes,
    s.commit_at
    
FROM import_sessions s
LEFT JOIN auth.users u ON s.created_by = u.id;

-- ==========================================
-- 10. TRIGGER: Auto-Update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_import_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_import_sessions_updated_at
    BEFORE UPDATE ON import_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_import_updated_at();

CREATE TRIGGER trigger_import_entities_updated_at
    BEFORE UPDATE ON import_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_import_updated_at();

CREATE TRIGGER trigger_import_fixtures_updated_at
    BEFORE UPDATE ON import_fixtures
    FOR EACH ROW
    EXECUTE FUNCTION update_import_updated_at();

-- ==========================================
-- 11. GRANTS (für RLS)
-- ==========================================
-- RLS Policies werden separat gesetzt (falls nötig)

-- ==========================================
-- Fertig!
-- ==========================================
SELECT '✅ Import-System Tabellen erfolgreich erstellt!' as status;

