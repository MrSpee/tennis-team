-- ==========================================
-- FIX: Korrigiere Season von "summer" zu "winter"
-- für Matches im Okt/Nov 2025
-- ==========================================

-- Alle Matchdays im Okt/Nov/Dez/Jan/Feb auf "winter" setzen
UPDATE matchdays
SET season = 'winter'
WHERE 
  EXTRACT(MONTH FROM match_date) IN (10, 11, 12, 1, 2) -- Okt, Nov, Dez, Jan, Feb
  AND season = 'summer';

-- Zeige Ergebnis
SELECT 
  season,
  COUNT(*) as count,
  MIN(match_date) as earliest,
  MAX(match_date) as latest
FROM matchdays
GROUP BY season
ORDER BY season;


