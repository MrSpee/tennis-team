-- ============================================================
-- Import: Winter 2025/26 - Herren 40 1. Bezirksliga Gr. 043
-- Quelle: https://tvm.liga.nu (Gruppe 043)
-- ============================================================

-- Schritt 1: Fehlende Teams in team_info anlegen
INSERT INTO team_info (id, club_name, team_name, category, region, created_at, updated_at)
VALUES
  -- TV Dellbrück 1
  ('8abfcf42-4a5e-4559-bdbb-26542e6b0f6b', 'TV Dellbrück', '1', 'Herren 40', 'Mittelrhein', now(), now()),
  -- VKC Köln 1 (schon vorhanden: 235fade5-0974-4f5b-a758-536f771a5e80)
  -- KölnerTHC Stadion RW 2
  ('6a3d2af0-19ca-4e89-88e1-4b5ef2401563', 'KölnerTHC Stadion RW', '2', 'Herren 40', 'Mittelrhein', now(), now()),
  -- TC Ford Köln 1
  ('ca3eb684-f211-4c21-999e-693c1f090515', 'TC Ford Köln', '1', 'Herren 40', 'Mittelrhein', now(), now()),
  -- TG GW im DJK Bocklemünd 1
  ('24a50fa0-2476-4118-a107-4098ffcdd934', 'TG GW im DJK Bocklemünd', '1', 'Herren 40', 'Mittelrhein', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Schritt 2: team_seasons Einträge für alle Teams der Liga
WITH teams AS (
  SELECT unnest(ARRAY[
    '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b'::uuid, -- TV Dellbrück 1
    '235fade5-0974-4f5b-a758-536f771a5e80'::uuid, -- VKC Köln 1
    '6a3d2af0-19ca-4e89-88e1-4b5ef2401563'::uuid, -- KölnerTHC Stadion RW 2
    'ca3eb684-f211-4c21-999e-693c1f090515'::uuid, -- TC Ford Köln 1
    '24a50fa0-2476-4118-a107-4098ffcdd934'::uuid  -- TG GW im DJK Bocklemünd 1
  ]) AS team_id
)
INSERT INTO team_seasons (id, team_id, season, league, group_name, team_size, is_active, created_at, updated_at)
SELECT gen_random_uuid(), team_id, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 4, true, now(), now()
FROM teams
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons ts
  WHERE ts.team_id = teams.team_id 
    AND ts.season = 'Winter 2025/26'
    AND ts.league = '1. Bezirksliga'
    AND ts.group_name = 'Gr. 043'
);

-- Schritt 3: Spielplan für Winter 2025/26 (1. Bezirksliga Gr. 043)
INSERT INTO matchdays (
  id,
  home_team_id,
  away_team_id,
  match_date,
  start_time,
  venue,
  court_number,
  court_number_end,
  season,
  league,
  group_name,
  status,
  home_score,
  away_score,
  final_score,
  location,
  year,
  created_at,
  updated_at
) VALUES
  -- 1) 02.11.2025 TV Dellbrück 1 vs VKC Köln 1 (Ergebnis 5:1)
  ('d2f25f30-d338-4524-abac-563ccdee99e6', '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b', '235fade5-0974-4f5b-a758-536f771a5e80', TIMESTAMPTZ '2025-11-02 15:00:00+01', '15:00', 'TV Dellbrück', 5, 6, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'completed', 5, 1, '5:1', 'Home', '2025/26', now(), now()),
  
  -- 2) 15.11.2025 VKC Köln 1 vs KölnerTHC Stadion RW 2
  ('794a2f78-098c-40ad-a4a3-61fde95354a6', '235fade5-0974-4f5b-a758-536f771a5e80', '6a3d2af0-19ca-4e89-88e1-4b5ef2401563', TIMESTAMPTZ '2025-11-15 18:00:00+01', '18:00', 'Cologne Sportspark', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 3) 22.11.2025 KölnerTHC Stadion RW 2 vs TC Ford Köln 1
  ('2e30f04e-c05c-4700-9c56-142b39c1d3ea', '6a3d2af0-19ca-4e89-88e1-4b5ef2401563', 'ca3eb684-f211-4c21-999e-693c1f090515', TIMESTAMPTZ '2025-11-22 18:00:00+01', '18:00', 'KölnerTHC Stadion RW', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 4) 06.12.2025 VKC Köln 1 vs TG GW im DJK Bocklemünd 1
  ('0b1009dc-9e44-47bf-b5a2-0b4da775e3a1', '235fade5-0974-4f5b-a758-536f771a5e80', '24a50fa0-2476-4118-a107-4098ffcdd934', TIMESTAMPTZ '2025-12-06 18:00:00+01', '18:00', 'Cologne Sportspark', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 5) 20.12.2025 KölnerTHC Stadion RW 2 vs TG GW im DJK Bocklemünd 1
  ('8d3b664b-03b2-4b5f-9d52-74fb75c73c89', '6a3d2af0-19ca-4e89-88e1-4b5ef2401563', '24a50fa0-2476-4118-a107-4098ffcdd934', TIMESTAMPTZ '2025-12-20 18:00:00+01', '18:00', 'KölnerTHC Stadion RW', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 6) 21.12.2025 TC Ford Köln 1 vs TV Dellbrück 1
  ('e303570f-9549-4979-a366-cf228c04c7b8', 'ca3eb684-f211-4c21-999e-693c1f090515', '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b', TIMESTAMPTZ '2025-12-21 16:00:00+01', '16:00', 'TC Ford Köln', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 7) 18.01.2026 TV Dellbrück 1 vs KölnerTHC Stadion RW 2
  ('8cdc449e-c486-45ee-8e72-106e63848709', '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b', '6a3d2af0-19ca-4e89-88e1-4b5ef2401563', TIMESTAMPTZ '2026-01-18 09:00:00+01', '09:00', 'TV Dellbrück', 5, 6, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 8) 25.01.2026 TG GW im DJK Bocklemünd 1 vs TC Ford Köln 1
  ('78621459-4acc-4366-82e4-8fba5793fce6', '24a50fa0-2476-4118-a107-4098ffcdd934', 'ca3eb684-f211-4c21-999e-693c1f090515', TIMESTAMPTZ '2026-01-25 15:00:00+01', '15:00', 'KTC 71', 3, 4, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 9) 15.03.2026 TG GW im DJK Bocklemünd 1 vs TV Dellbrück 1
  ('6dde44d0-74cc-41e8-9220-d221864614b4', '24a50fa0-2476-4118-a107-4098ffcdd934', '8abfcf42-4a5e-4559-bdbb-26542e6b0f6b', TIMESTAMPTZ '2026-03-15 15:00:00+01', '15:00', 'KTC 71', 3, 4, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now()),
  
  -- 10) 15.03.2026 TC Ford Köln 1 vs VKC Köln 1
  ('e20a0618-bf66-469b-8ab1-4da0d5234f0e', 'ca3eb684-f211-4c21-999e-693c1f090515', '235fade5-0974-4f5b-a758-536f771a5e80', TIMESTAMPTZ '2026-03-15 16:00:00+01', '16:00', 'TC Ford Köln', 1, 2, 'Winter 2025/26', '1. Bezirksliga', 'Gr. 043', 'scheduled', null, null, null, 'Home', '2025/26', now(), now())

ON CONFLICT (id) DO UPDATE
SET
  home_team_id      = EXCLUDED.home_team_id,
  away_team_id      = EXCLUDED.away_team_id,
  match_date        = EXCLUDED.match_date,
  start_time        = EXCLUDED.start_time,
  venue             = EXCLUDED.venue,
  court_number      = EXCLUDED.court_number,
  court_number_end  = EXCLUDED.court_number_end,
  season            = EXCLUDED.season,
  league            = EXCLUDED.league,
  group_name        = EXCLUDED.group_name,
  status            = EXCLUDED.status,
  home_score        = EXCLUDED.home_score,
  away_score        = EXCLUDED.away_score,
  final_score       = EXCLUDED.final_score,
  location          = EXCLUDED.location,
  year              = EXCLUDED.year,
  updated_at        = now();
