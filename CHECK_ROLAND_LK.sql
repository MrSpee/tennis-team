-- ================================================================
-- DEBUG: Roland Reifen LK
-- ================================================================

-- Zeige alle LK-Felder für Roland Reifen
SELECT 
  name,
  email,
  current_lk,
  season_start_lk,
  ranking,
  season_improvement,
  last_lk_update,
  CASE 
    WHEN season_start_lk IS NOT NULL THEN 'season_start_lk'
    WHEN current_lk IS NOT NULL THEN 'current_lk'
    WHEN ranking IS NOT NULL THEN 'ranking'
    ELSE 'KEINE LK!'
  END as lk_quelle
FROM players
WHERE name ILIKE '%Roland%' OR name ILIKE '%Reifen%';

-- Falls kein Ergebnis: Zeige alle Spieler mit ähnlichen Namen
SELECT 
  name,
  email,
  current_lk
FROM players
WHERE name ILIKE '%rol%'
ORDER BY name;

