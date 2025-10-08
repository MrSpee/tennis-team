-- ============================================
-- ADD_RODENKIRCHENER_TC.sql
-- Fügt Rodenkirchener TC mit Herren 30 Mannschaft hinzu
-- ============================================

-- 1️⃣ Füge den Verein "Rodenkirchener TC" zur clubs Tabelle hinzu (falls vorhanden)
-- Falls du eine clubs Tabelle hast, füge hier ein
INSERT INTO clubs (
  name,
  city,
  address,
  website,
  region
) VALUES (
  'Rodenkirchener TC',
  'Köln',
  'Berzdorfer Str. 29, 50997 Köln-Immendorf',
  'http://www.tc-rodenkirchen.de',
  'Mittelrhein'
)
ON CONFLICT DO NOTHING;

-- 2️⃣ Füge die Mannschaft zur team_info Tabelle hinzu
INSERT INTO team_info (
  id,
  club_name,
  team_name,
  category,
  region,
  tvm_link
) VALUES (
  gen_random_uuid(),
  'Rodenkirchener TC',
  'Herren 30 1',
  'Herren 30',
  'Mittelrhein',
  'http://www.tc-rodenkirchen.de'
)
RETURNING id;

-- Speichere die Team-ID für spätere Verwendung
-- WICHTIG: Kopiere die zurückgegebene UUID und ersetze sie unten bei {TEAM_ID}

-- 3️⃣ Füge die Season-Daten zur team_seasons Tabelle hinzu
-- ERSETZE {TEAM_ID} mit der UUID aus Schritt 2
INSERT INTO team_seasons (
  team_id,
  season,
  league,
  group_name,
  team_size,
  is_active
) VALUES (
  '{TEAM_ID}',  -- ⚠️ HIER DIE TEAM-ID EINFÜGEN!
  'Winter 2025/26',
  '2. Kreisliga',
  'Gr. 040',
  4,
  true
);

-- 4️⃣ Füge die Matches zur matches Tabelle hinzu
-- ERSETZE {TEAM_ID} mit der UUID aus Schritt 2

-- Match 1: 01.11.2025 - TC RW Porz 2 vs Rodenkirchener TC 1 (Auswärts)
INSERT INTO matches (
  team_id,
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed,
  match_type,
  home_away
) VALUES (
  '{TEAM_ID}',
  '2025-11-01 17:00:00+01',
  'TC RW Porz 2',
  'auswärts',
  'Tennishalle Haus Rott',
  'winter',
  4,
  'league',
  'away'
);

-- Match 2: 06.12.2025 - Rodenkirchener TC 1 vs TC RS Neubrück 1 (Heim)
INSERT INTO matches (
  team_id,
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed,
  match_type,
  home_away
) VALUES (
  '{TEAM_ID}',
  '2025-12-06 15:00:00+01',
  'TC RS Neubrück 1',
  'heim',
  'Tennis-Centrum Immendorf',
  'winter',
  4,
  'league',
  'home'
);

-- Match 3: 28.02.2026 - Kölner KHT SW 3 vs Rodenkirchener TC 1 (Auswärts)
INSERT INTO matches (
  team_id,
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed,
  match_type,
  home_away
) VALUES (
  '{TEAM_ID}',
  '2026-02-28 18:00:00+01',
  'Kölner KHT SW 3',
  'auswärts',
  'Marienburger SC',
  'winter',
  4,
  'league',
  'away'
);

-- Match 4: 21.03.2026 - Rodenkirchener TC 1 vs TC Arnoldshöhe 1986 3 (Heim)
INSERT INTO matches (
  team_id,
  match_date,
  opponent,
  location,
  venue,
  season,
  players_needed,
  match_type,
  home_away
) VALUES (
  '{TEAM_ID}',
  '2026-03-21 15:00:00+01',
  'TC Arnoldshöhe 1986 3',
  'heim',
  'Tennis-Centrum Immendorf',
  'winter',
  4,
  'league',
  'home'
);

-- 5️⃣ Überprüfe die Ergebnisse
SELECT 
  ti.club_name,
  ti.team_name,
  ti.category,
  ts.season,
  ts.league,
  ts.group_name,
  ts.team_size,
  COUNT(m.id) as match_count
FROM team_info ti
LEFT JOIN team_seasons ts ON ti.id = ts.team_id
LEFT JOIN matches m ON ti.id = m.team_id
WHERE ti.club_name = 'Rodenkirchener TC'
GROUP BY ti.id, ti.club_name, ti.team_name, ti.category, ts.season, ts.league, ts.group_name, ts.team_size;

-- 6️⃣ Zeige alle Matches
SELECT 
  m.match_date,
  m.opponent,
  m.location,
  m.venue,
  m.home_away
FROM matches m
INNER JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'Rodenkirchener TC'
ORDER BY m.match_date;

