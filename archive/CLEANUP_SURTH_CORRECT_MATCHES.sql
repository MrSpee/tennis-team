-- CLEANUP: Entferne alle falschen Matches für Sürth
-- Behalte nur die 4 korrekten Winter-Spiele

-- 1. Identifiziere die 4 korrekten Matches
SELECT 
  'KORREKTE MATCHES (BEHALTEN):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  CASE 
    WHEN m.id = '3bf226c8-dcfb-4429-94ee-fe239fe52250' THEN '✅ TG Leverkusen 2 (05.10.2025)'
    WHEN m.id = '713d82bb-6dd2-40e6-9b01-daa42cf740c2' THEN '✅ TV Ensen Westhoven 1 (20.12.2025)'
    WHEN m.id = '63bc596b-fc4c-429d-8d12-ac2741af1705' THEN '✅ TC Colonius 3 (07.03.2026)'
    WHEN m.id = '4e0e5908-2a5e-4773-8cd4-6cf8d66c07b8' THEN '✅ TC Ford Köln 2 (21.03.2026)'
    ELSE '❌ FALSCHES MATCH'
  END as match_status
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.id IN (
    '3bf226c8-dcfb-4429-94ee-fe239fe52250', -- TG Leverkusen 2 (05.10.2025)
    '713d82bb-6dd2-40e6-9b01-daa42cf740c2', -- TV Ensen Westhoven 1 (20.12.2025)
    '63bc596b-fc4c-429d-8d12-ac2741af1705', -- TC Colonius 3 (07.03.2026)
    '4e0e5908-2a5e-4773-8cd4-6cf8d66c07b8'  -- TC Ford Köln 2 (21.03.2026)
  )
ORDER BY m.match_date;

-- 2. Lösche alle anderen Matches für Sürth
DELETE FROM matches 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth'
)
AND id NOT IN (
  '3bf226c8-dcfb-4429-94ee-fe239fe52250', -- TG Leverkusen 2 (05.10.2025)
  '713d82bb-6dd2-40e6-9b01-daa42cf740c2', -- TV Ensen Westhoven 1 (20.12.2025)
  '63bc596b-fc4c-429d-8d12-ac2741af1705', -- TC Colonius 3 (07.03.2026)
  '4e0e5908-2a5e-4773-8cd4-6cf8d66c07b8'  -- TC Ford Köln 2 (21.03.2026)
);

-- 3. Bestätige das Ergebnis
SELECT 
  'NACH CLEANUP:' as info,
  COUNT(*) as total_matches,
  STRING_AGG(m.opponent, ', ') as opponents
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth';

-- 4. Zeige die verbleibenden Matches
SELECT 
  'VERBLEIBENDE MATCHES:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  m.season
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date;
