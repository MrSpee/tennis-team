-- ============================================
-- FIX VENUE LINKS IN MATCHDAYS
-- ============================================
-- Verknüpft matchdays mit venues basierend auf venue-Namen

-- 1. Update matchdays mit venue_id basierend auf exakten Matches
UPDATE matchdays m
SET venue_id = v.id
FROM venues v
WHERE m.venue IS NOT NULL
  AND m.venue_id IS NULL
  AND (
    LOWER(TRIM(m.venue)) = LOWER(TRIM(v.name))
    OR LOWER(TRIM(m.venue)) = LOWER(TRIM(REPLACE(v.name, 'Schloß', 'Schloss')))
    OR LOWER(TRIM(m.venue)) = LOWER(TRIM(REPLACE(v.name, 'Schloss', 'Schloß')))
    OR LOWER(TRIM(m.venue)) = LOWER(TRIM(REPLACE(v.name, 'TH ', 'Tennishalle ')))
    OR LOWER(TRIM(m.venue)) = LOWER(TRIM(REPLACE(v.name, 'Tennishalle ', 'TH ')))
  );

-- 2. Prüfe welche matchdays noch keine venue_id haben
SELECT 
  m.venue,
  COUNT(*) as match_count
FROM matchdays m
WHERE m.match_date >= CURRENT_DATE
  AND m.venue IS NOT NULL
  AND m.venue_id IS NULL
GROUP BY m.venue
ORDER BY match_count DESC;

