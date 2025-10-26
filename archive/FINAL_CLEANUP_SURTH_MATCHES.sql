-- FINALES CLEANUP: Entferne alle falschen Matches für Sürth
-- Behalte nur die 4 korrekten Winter-Spiele

-- 1. Identifiziere die 4 korrekten Matches
SELECT 
  'KORREKTE MATCHES (WERDEN BEHALTEN):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  '✅ BEHALTEN' as action
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND (
    (m.match_date::date = '2025-10-05' AND m.opponent = 'TG Leverkusen 2') OR
    (m.match_date::date = '2025-12-20' AND m.opponent = 'TV Ensen Westhoven 1') OR
    (m.match_date::date = '2026-03-07' AND m.opponent = 'TC Colonius 3') OR
    (m.match_date::date = '2026-03-21' AND m.opponent = 'TC Ford Köln 2')
  )
ORDER BY m.match_date;

-- 2. Zeige alle falschen Matches (werden gelöscht)
SELECT 
  'FALSCHE MATCHES (WERDEN GELÖSCHT):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  '❌ LÖSCHEN' as action
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND NOT (
    (m.match_date::date = '2025-10-05' AND m.opponent = 'TG Leverkusen 2') OR
    (m.match_date::date = '2025-12-20' AND m.opponent = 'TV Ensen Westhoven 1') OR
    (m.match_date::date = '2026-03-07' AND m.opponent = 'TC Colonius 3') OR
    (m.match_date::date = '2026-03-21' AND m.opponent = 'TC Ford Köln 2')
  )
ORDER BY m.match_date;

-- 3. Lösche alle falschen Matches
DELETE FROM matches 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth'
)
AND NOT (
  (match_date::date = '2025-10-05' AND opponent = 'TG Leverkusen 2') OR
  (match_date::date = '2025-12-20' AND opponent = 'TV Ensen Westhoven 1') OR
  (match_date::date = '2026-03-07' AND opponent = 'TC Colonius 3') OR
  (match_date::date = '2026-03-21' AND opponent = 'TC Ford Köln 2')
);

-- 4. Bestätige das Ergebnis
SELECT 
  'NACH CLEANUP - VERBLEIBENDE MATCHES:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  m.season
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date;

-- 5. Zähle die verbleibenden Matches
SELECT 
  'FINAL COUNT:' as info,
  COUNT(*) as total_matches,
  'Sollte 4 sein!' as expected
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth';
