-- ============================================
-- RE-IMPORT VKC KÖLN HERREN 55 MATCHES
-- ============================================
-- Erstellt die 3 Herren 55 Matches neu mit Court-Daten
-- ============================================

-- Team ID: 3427d451-2665-43c5-ac70-f975934b7dac (VKC Köln Herren 55)

INSERT INTO matchdays (
  match_date,
  start_time,
  home_team_id,
  away_team_id,
  venue,
  court_number,
  court_number_end,
  season,
  status,
  home_score,
  away_score
) VALUES
-- Match 1: VKC Köln 1 vs RTHC Bayer Leverkusen 1 (01.11.2025)
(
  '2025-11-01',
  '15:00',
  '3427d451-2665-43c5-ac70-f975934b7dac', -- VKC Köln  1
  (SELECT id FROM team_info WHERE club_name = 'RTHC Bayer Leverkusen' AND team_name = '1' AND category = 'Herren 55' LIMIT 1),
  'TH Schloß Morsbroich',
  3,
  4,
  'Winter 2025/26',
  'completed',
  6,
  0
),
-- Match 2: TC BW Zündorf 1 vs VKC Köln 1 (24.01.2026)
(
  '2026-01-24',
  '17:00',
  (SELECT id FROM team_info WHERE club_name LIKE '%Zündorf%' AND team_name = '1' AND category = 'Herren 55' LIMIT 1),
  '3427d451-2665-43c5-ac70-f975934b7dac', -- VKC Köln  1
  'RTHC Bayer Leverkusen',
  1,
  2,
  'Winter 2025/26',
  'scheduled',
  0,
  0
),
-- Match 3: VKC Köln 1 vs TC Rath 1 (08.03.2026)
(
  '2026-03-08',
  '16:00',
  '3427d451-2665-43c5-ac70-f975934b7dac', -- VKC Köln  1
  (SELECT id FROM team_info WHERE club_name = 'TC Rath' AND team_name = '1' AND category = 'Herren 55' LIMIT 1),
  'TH Schloß Morsbroich',
  3,
  4,
  'Winter 2025/26',
  'scheduled',
  0,
  0
)
ON CONFLICT DO NOTHING;

-- Verifiziere
SELECT 
  '✅ RE-IMPORT COMPLETE' as status,
  COUNT(*) as total_matches
FROM matchdays
WHERE home_team_id = '3427d451-2665-43c5-ac70-f975934b7dac'
   OR away_team_id = '3427d451-2665-43c5-ac70-f975934b7dac';

