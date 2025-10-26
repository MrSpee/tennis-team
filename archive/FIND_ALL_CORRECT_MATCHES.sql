-- FINDE ALLE 4 KORREKTEN MATCHES FÜR SÜRTH
-- Basierend auf den echten Spielplan-Daten

-- 1. Alle Matches für Sürth nach Datum sortiert
SELECT 
  'ALLE SÜRTH MATCHES:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  CASE 
    WHEN m.match_date::date = '2025-10-05' AND m.opponent = 'TG Leverkusen 2' THEN '✅ KORREKT'
    WHEN m.match_date::date = '2025-12-20' AND m.opponent = 'TV Ensen Westhoven 1' THEN '✅ KORREKT'
    WHEN m.match_date::date = '2026-03-07' AND m.opponent = 'TC Colonius 3' THEN '✅ KORREKT'
    WHEN m.match_date::date = '2026-03-21' AND m.opponent = 'TC Ford Köln 2' THEN '✅ KORREKT'
    ELSE '❌ FALSCH'
  END as status
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date;

-- 2. Zähle korrekte vs. falsche Matches
SELECT 
  'STATISTIK:' as info,
  COUNT(*) as total_matches,
  COUNT(CASE 
    WHEN (m.match_date::date = '2025-10-05' AND m.opponent = 'TG Leverkusen 2') OR
         (m.match_date::date = '2025-12-20' AND m.opponent = 'TV Ensen Westhoven 1') OR
         (m.match_date::date = '2026-03-07' AND m.opponent = 'TC Colonius 3') OR
         (m.match_date::date = '2026-03-21' AND m.opponent = 'TC Ford Köln 2')
    THEN 1 END) as correct_matches,
  COUNT(CASE 
    WHEN NOT ((m.match_date::date = '2025-10-05' AND m.opponent = 'TG Leverkusen 2') OR
              (m.match_date::date = '2025-12-20' AND m.opponent = 'TV Ensen Westhoven 1') OR
              (m.match_date::date = '2026-03-07' AND m.opponent = 'TC Colonius 3') OR
              (m.match_date::date = '2026-03-21' AND m.opponent = 'TC Ford Köln 2'))
    THEN 1 END) as wrong_matches
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth';
