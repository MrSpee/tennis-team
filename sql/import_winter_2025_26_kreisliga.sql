-- Schritt 1: fehlende Mannschaft anlegen (TC Ford Köln 2)
INSERT INTO team_info (id, club_name, team_name, category, region, created_at, updated_at)
SELECT '5f301d5a-2e19-42b4-b6be-b65b0def59cc', 'TC Ford Köln', '2', 'Herren 40', 'Mittelrhein', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM team_info WHERE id = '5f301d5a-2e19-42b4-b6be-b65b0def59cc'
);

-- Schritt 2: team_seasons Einträge für alle Mannschaften der Liga (Winter 2025/26)
WITH teams AS (
  SELECT unnest(ARRAY[
    '06ee529a-18cf-4a30-bbe0-f7096314721e', -- TG Leverkusen 2
    'ff090c47-ff26-4df1-82fd-3e4358320d7f', -- SV Rot-Gelb Sürth 1
    '5f301d5a-2e19-42b4-b6be-b65b0def59cc', -- TC Ford Köln 2
    'd9660a5e-c08a-4586-97c5-14f9f0780457', -- TC Colonius 3
    '19095c7a-4af4-45ab-b75c-6b82be78975a'  -- TV Ensen Westhoven 1
  ]::uuid[]) AS team_id
)
INSERT INTO team_seasons (id, team_id, season, league, group_name, team_size, is_active, created_at, updated_at)
SELECT gen_random_uuid(), team_id, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 4, true, now(), now()
FROM teams
WHERE NOT EXISTS (
  SELECT 1 FROM team_seasons ts
  WHERE ts.team_id = teams.team_id AND ts.season = 'Winter 2025/26'
);

-- Schritt 3: Spielplan für Winter 2025/26 (1. Kreisliga, Gr. 046)
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
  created_at,
  updated_at
) VALUES
  -- 1) 05.10.2025 TG Leverkusen 2 vs SV RG Sürth 1 (Ergebnis 1:5)
  ('897c24df-51d7-4ba3-a652-c0016a5f2d65', '06ee529a-18cf-4a30-bbe0-f7096314721e', 'ff090c47-ff26-4df1-82fd-3e4358320d7f', TIMESTAMPTZ '2025-10-05 09:00:00+02', '09:00', 'TG Leverkusen', 1, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'completed', 1, 5, '1:5', 'Home', now(), now()),
  -- 2) 09.11.2025 TG Leverkusen 2 vs TC Ford Köln 2
  ('d8c09228-9981-4dbf-b69d-85558358a3b8', '06ee529a-18cf-4a30-bbe0-f7096314721e', '5f301d5a-2e19-42b4-b6be-b65b0def59cc', TIMESTAMPTZ '2025-11-09 09:00:00+01', '09:00', 'TG Leverkusen', 1, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 3) 16.11.2025 TC Colonius 3 vs TV Ensen Westhoven 1
  ('0f3ee0e1-6a2f-4136-9b66-8e77d48c1a46', 'd9660a5e-c08a-4586-97c5-14f9f0780457', '19095c7a-4af4-45ab-b75c-6b82be78975a', TIMESTAMPTZ '2025-11-16 15:00:00+01', '15:00', 'KTC 71', 3, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 4) 23.11.2025 TC Ford Köln 2 vs TC Colonius 3
  ('4bd63b62-5930-4bb0-9286-24d4df75f1a2', '5f301d5a-2e19-42b4-b6be-b65b0def59cc', 'd9660a5e-c08a-4586-97c5-14f9f0780457', TIMESTAMPTZ '2025-11-23 16:00:00+01', '16:00', 'TC Ford Köln', 1, 2, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 5) 20.12.2025 TV Ensen Westhoven 1 vs SV RG Sürth 1
  ('01742492-d761-46ba-bcd9-189dd9fa4ddc', '19095c7a-4af4-45ab-b75c-6b82be78975a', 'ff090c47-ff26-4df1-82fd-3e4358320d7f', TIMESTAMPTZ '2025-12-20 17:00:00+01', '17:00', 'Tennishalle Köln-Rath', 3, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 6) 01.02.2026 TC Ford Köln 2 vs TV Ensen Westhoven 1
  ('4fef2ea2-54d1-4d9b-bf78-3c9d3e9a7c2f', '5f301d5a-2e19-42b4-b6be-b65b0def59cc', '19095c7a-4af4-45ab-b75c-6b82be78975a', TIMESTAMPTZ '2026-02-01 16:00:00+01', '16:00', 'TC Ford Köln', 1, 2, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 7) 28.02.2026 TV Ensen Westhoven 1 vs TG Leverkusen 2
  ('e7b1c4c6-78cf-4d0a-a5f8-c1aa07564d61', '19095c7a-4af4-45ab-b75c-6b82be78975a', '06ee529a-18cf-4a30-bbe0-f7096314721e', TIMESTAMPTZ '2026-02-28 17:00:00+01', '17:00', 'Tennishalle Köln-Rath', 3, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 8) 07.03.2026 SV RG Sürth 1 vs TC Colonius 3
  ('96ad296e-94df-427c-828d-d214728e35d0', 'ff090c47-ff26-4df1-82fd-3e4358320d7f', 'd9660a5e-c08a-4586-97c5-14f9f0780457', TIMESTAMPTZ '2026-03-07 18:00:00+01', '18:00', 'Marienburger SC', 14, 15, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 9) 21.03.2026 SV RG Sürth 1 vs TC Ford Köln 2
  ('a7cf900f-a46a-4ef1-b65f-041efb0beb58', 'ff090c47-ff26-4df1-82fd-3e4358320d7f', '5f301d5a-2e19-42b4-b6be-b65b0def59cc', TIMESTAMPTZ '2026-03-21 18:00:00+01', '18:00', 'Marienburger SC', 14, 15, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now()),
  -- 10) 22.03.2026 TC Colonius 3 vs TG Leverkusen 2
  ('6f015db0-2ad0-45c6-9ed9-c8c5dc5a4d52', 'd9660a5e-c08a-4586-97c5-14f9f0780457', '06ee529a-18cf-4a30-bbe0-f7096314721e', TIMESTAMPTZ '2026-03-22 15:00:00+01', '15:00', 'KTC 71', 3, 4, 'Winter 2025/26', '1. Kreisliga', 'Gr. 046', 'scheduled', null, null, null, 'Home', now(), now())
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
  updated_at        = now();
