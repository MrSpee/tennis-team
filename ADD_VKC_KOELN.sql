-- =====================================================
-- VKC Köln - Herren 30 Mannschaft und Spiele hinzufügen
-- Winter 2025/26 Saison
-- =====================================================

-- 1. Zuerst team_size Spalte hinzufügen falls sie nicht existiert
ALTER TABLE team_info 
ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 6;

-- 2. Entferne season und season_year Spalten aus team_info falls sie existieren
ALTER TABLE team_info 
DROP COLUMN IF EXISTS season;

ALTER TABLE team_info 
DROP COLUMN IF EXISTS season_year;

-- 3. VKC Köln Verein in team_info hinzufügen
INSERT INTO team_info (
    id,
    club_name,
    category,
    league,
    group_name,
    team_size,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'VKC Köln',
    'Herren 30',
    '2. Bezirksliga',
    'Gr. 035',
    4,
    NOW(),
    NOW()
);

-- 4. VKC Köln Spiele in matches hinzufügen
-- Spiel 1: VKC Köln vs TC Viktoria 2 (Heimspiel)
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
) VALUES (
    gen_random_uuid(),
    '2025-11-22 18:00:00',
    'TC Viktoria 2',
    'Home',
    'Cologne Sportspark, Alfred Schütte Allee 51, 51105 Köln',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
);

-- Spiel 2: TC Weiden 2 vs VKC Köln (Auswärtsspiel)
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
) VALUES (
    gen_random_uuid(),
    '2025-11-29 18:00:00',
    'TC Weiden 2',
    'Away',
    'PadelBox Weiden',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
);

-- Spiel 3: TC BW Zündorf 1 vs VKC Köln (Auswärtsspiel)
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
) VALUES (
    gen_random_uuid(),
    '2026-01-11 12:00:00',
    'TC BW Zündorf 1',
    'Away',
    'RTHC Bayer Leverkusen',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
);

-- Spiel 4: VKC Köln vs KTC Weidenpescher Park 1 (Heimspiel)
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
) VALUES (
    gen_random_uuid(),
    '2026-02-07 18:00:00',
    'KTC Weidenpescher Park 1',
    'Home',
    'Cologne Sportspark, Alfred Schütte Allee 51, 51105 Köln',
    'Winter 2025/26',
    (SELECT id FROM team_info WHERE club_name = 'VKC Köln' AND category = 'Herren 30' LIMIT 1),
    NOW(),
    NOW()
);

-- Spiel 5: ESV Olympia 1 vs VKC Köln (Auswärtsspiel)
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
) VALUES (
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

-- 5. Erfolgsmeldung
DO $$
BEGIN
    RAISE NOTICE '✅ VKC Köln erfolgreich hinzugefügt!';
    RAISE NOTICE '🏆 Mannschaft: Herren 30 - 2. Bezirksliga Gr. 035';
    RAISE NOTICE '📅 Spiele: 5 Spiele für Winter 2025/26 Saison';
    RAISE NOTICE '🏠 Heimspiele: Cologne Sportspark';
    RAISE NOTICE '✈️ Auswärtsspiele: PadelBox Weiden, RTHC Bayer Leverkusen, TC Bayer Dormagen';
END $$;
