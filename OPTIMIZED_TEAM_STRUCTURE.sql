-- =====================================================
-- OPTIMIERTE DATENSTRUKTUR FÜR SAISON-SPEZIFISCHE TEAMS
-- =====================================================

-- 1. Erstelle team_seasons Tabelle für saison-spezifische Daten
CREATE TABLE IF NOT EXISTS team_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team_info(id) ON DELETE CASCADE,
    season VARCHAR(50) NOT NULL, -- z.B. "Winter 2025/26", "Sommer 2025"
    league VARCHAR(100), -- z.B. "2. Bezirksliga"
    group_name VARCHAR(100), -- z.B. "Gr. 035"
    team_size INTEGER DEFAULT 6, -- 4 oder 6 Spieler
    is_active BOOLEAN DEFAULT true, -- Aktuelle Saison
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Entferne alle saison-spezifischen Spalten aus team_info
ALTER TABLE team_info 
DROP COLUMN IF EXISTS season;

ALTER TABLE team_info 
DROP COLUMN IF EXISTS season_year;

ALTER TABLE team_info 
DROP COLUMN IF EXISTS league;

ALTER TABLE team_info 
DROP COLUMN IF EXISTS group_name;

ALTER TABLE team_info 
DROP COLUMN IF EXISTS team_size;

-- 3. Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_team_seasons_team_id ON team_seasons(team_id);
CREATE INDEX IF NOT EXISTS idx_team_seasons_season ON team_seasons(season);
CREATE INDEX IF NOT EXISTS idx_team_seasons_active ON team_seasons(is_active);

-- 4. Füge VKC Köln mit neuer Struktur hinzu
-- Team-Info (statische Daten)
INSERT INTO team_info (
    id,
    club_name,
    category,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'VKC Köln',
    'Herren 30',
    NOW(),
    NOW()
);

-- Team-Season (saison-spezifische Daten)
INSERT INTO team_seasons (
    id,
    team_id,
    season,
    league,
    group_name,
    team_size,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    'Winter 2025/26',
    '2. Bezirksliga',
    'Gr. 035',
    4,
    true,
    NOW(),
    NOW()
);

-- 5. Füge VKC Köln Spiele hinzu (mit team_id Verweis)
INSERT INTO matches (
    id,
    match_date,
    opponent,
    location,
    venue,
    season,
    team_id,
    created_at,
    updated_at
) VALUES 
-- Spiel 1: VKC Köln vs TC Viktoria 2 (Heimspiel)
(
    gen_random_uuid(),
    '2025-11-22 18:00:00',
    'TC Viktoria 2',
    'Home',
    'Cologne Sportspark, Alfred Schütte Allee 51, 51105 Köln',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
),
-- Spiel 2: TC Weiden 2 vs VKC Köln (Auswärtsspiel)
(
    gen_random_uuid(),
    '2025-11-29 18:00:00',
    'TC Weiden 2',
    'Away',
    'PadelBox Weiden',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
),
-- Spiel 3: TC BW Zündorf 1 vs VKC Köln (Auswärtsspiel)
(
    gen_random_uuid(),
    '2026-01-11 12:00:00',
    'TC BW Zündorf 1',
    'Away',
    'RTHC Bayer Leverkusen',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
),
-- Spiel 4: VKC Köln vs KTC Weidenpescher Park 1 (Heimspiel)
(
    gen_random_uuid(),
    '2026-02-07 18:00:00',
    'KTC Weidenpescher Park 1',
    'Home',
    'Cologne Sportspark, Alfred Schütte Allee 51, 51105 Köln',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
),
-- Spiel 5: ESV Olympia 1 vs VKC Köln (Auswärtsspiel)
(
    gen_random_uuid(),
    '2026-03-15 15:00:00',
    'ESV Olympia 1',
    'Away',
    'TC Bayer Dormagen',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
);

-- 6. Erfolgsmeldung
DO $$
BEGIN
    RAISE NOTICE '✅ Optimierte Datenstruktur erfolgreich erstellt!';
    RAISE NOTICE '🏗️ Neue Tabelle: team_seasons für saison-spezifische Daten';
    RAISE NOTICE '🏆 VKC Köln hinzugefügt mit Winter 2025/26 Saison';
    RAISE NOTICE '📅 5 Spiele für Winter 2025/26 Saison erstellt';
    RAISE NOTICE '💡 Vorteile: Teams können in verschiedenen Saisons verschiedene Ligen spielen';
END $$;
