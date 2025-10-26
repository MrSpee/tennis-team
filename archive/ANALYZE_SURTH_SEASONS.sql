-- PRÜFE: Welche Matches gehören wirklich zu Sürth?
-- Schaue dir alle Matches mit Datum und Saison an

-- 1. Alle Matches für Sürth mit korrekter Saison-Bestimmung
SELECT 
  'ALLE MATCHES MIT SAISON-ANALYSE:' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.season as db_season,
  CASE 
    WHEN EXTRACT(MONTH FROM m.match_date) BETWEEN 4 AND 7 THEN 'summer'
    ELSE 'winter'
  END as calculated_season,
  m.location,
  CASE 
    WHEN EXTRACT(MONTH FROM m.match_date) BETWEEN 4 AND 7 THEN '❌ SOMMER'
    ELSE '✅ WINTER'
  END as season_status
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
ORDER BY m.match_date;

-- 2. Gruppiere nach berechneter Saison
SELECT 
  'MATCHES NACH BERECHNETER SAISON:' as info,
  CASE 
    WHEN EXTRACT(MONTH FROM m.match_date) BETWEEN 4 AND 7 THEN 'summer'
    ELSE 'winter'
  END as calculated_season,
  COUNT(*) as match_count,
  STRING_AGG(m.opponent, ', ') as opponents
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
GROUP BY CASE 
  WHEN EXTRACT(MONTH FROM m.match_date) BETWEEN 4 AND 7 THEN 'summer'
  ELSE 'winter'
END
ORDER BY calculated_season;

-- 3. Identifiziere die 4 Winter-Matches (Oktober 2025 - März 2026)
SELECT 
  'WINTER-MATCHES (OKT 2025 - MÄRZ 2026):' as info,
  m.id,
  m.opponent,
  m.match_date,
  m.location,
  CASE 
    WHEN m.match_date < '2025-10-01' THEN '❌ ZU FRÜH'
    WHEN m.match_date > '2026-03-31' THEN '❌ ZU SPÄT'
    ELSE '✅ WINTER-SAISON'
  END as winter_status
FROM matches m
JOIN team_info ti ON m.team_id = ti.id
WHERE ti.club_name = 'SV Rot-Gelb Sürth'
  AND m.match_date >= '2025-10-01'
  AND m.match_date <= '2026-03-31'
ORDER BY m.match_date;
