-- CLEANUP: Entferne falsche Saison-Zuordnungen
-- Das Team sollte nur 4 Winter-Spiele haben

-- 1. Schaue dir die aktuellen Winter-Matches an
SELECT 
  'AKTUELLE WINTER-MATCHES:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.season,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.season = 'winter'
ORDER BY m.match_date;

-- 2. Schaue dir die Sommer-Matches an (sollten entfernt werden)
SELECT 
  'SOMMER-MATCHES (ZU ENTFERNEN):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.season,
  m.location
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.season = 'summer'
ORDER BY m.match_date;

-- 3. Identifiziere die 4 korrekten Winter-Matches
-- Basierend auf den Daten sollten das sein:
-- - TG Leverkusen 2 (bereits gespielt)
-- - TV Dellbrück 1
-- - KölnerTHC Stadion RW 2  
-- - TG GW im DJK Bocklemünd 1

-- 4. Lösche alle Sommer-Matches
DELETE FROM matches 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth'
)
AND season = 'summer';

-- 5. Lösche alle Winter-Matches außer den 4 korrekten
DELETE FROM matches 
WHERE team_id IN (
  SELECT id FROM team_info WHERE club_name = 'SV Rot-Gelb Sürth'
)
AND season = 'winter'
AND id NOT IN (
  -- Behalte nur diese 4 Winter-Matches:
  '3bf226c8-dcfb-4429-94ee-fe239fe52250', -- TG Leverkusen 2 (bereits gespielt)
  '30e000ad-f4a5-4e3a-b738-b22a831802fc', -- TV Dellbrück 1
  'e3d0a833-9c20-4a7e-b927-991e1ae4fbc3', -- KölnerTHC Stadion RW 2
  '33258a50-784c-43a0-99ff-c70b64abbf6d'  -- TG GW im DJK Bocklemünd 1
);

-- 6. Bestätige das Ergebnis
SELECT 
  'NACH CLEANUP:' as info,
  m.season,
  COUNT(*) as match_count,
  STRING_AGG(m.opponent, ', ') as opponents
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
GROUP BY m.season
ORDER BY m.season;
